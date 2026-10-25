import { sql } from "drizzle-orm";
import { AppError, guard, rowsOf, type Db } from "./db";

/**
 * Step 4a: admin review of applications. All reads and writes run inside `asUser()` as the signed-in admin, so row-level
 * security decides which applicants they may see (their state, department or programme) and which details (contact,
 * date of birth). The database also refuses an under-18 approval without a verified guardian (rule 6).
 */
export type QueueRow = {
  id: string; userId: string; stage: "submitted" | "under_review" | "interview" | "needs_info";
  submittedAt: string; first: string; last: string; state: string; lga: string;
  skills: string[]; languages: string[]; availability: string | null;
  /** null when this admin's role may not see it (the permissions matrix) */
  email: string | null; phone: string | null; dob: string | null;
  ageYears: number | null; guardianVerified: boolean; guardianName: string | null;
  departmentIds: string[]; consents: { kind: string; version: string }[];
  /** what the applicant wrote back after "needs more information" */
  reply: string | null;
};

export async function applicationQueue(db: Db): Promise<QueueRow[]> {
  const r = rowsOf<Record<string, unknown>>(await db.execute(sql`
    select a.id, a.user_id, a.stage, a.submitted_at, a.answers->>'reply' as reply,
           vp.first_name, vp.last_name, vp.state, vp.lga, vp.skills, vp.languages, vp.availability,
           vc.email, vc.phone, vpr.date_of_birth::text as dob,
           public.volunteer_age(a.user_id) as age, public.has_verified_guardian(a.user_id) as guardian_verified,
           (select gc.guardian_name from guardian_consents gc where gc.user_id = a.user_id order by gc.created_at desc limit 1) as guardian_name,
           coalesce((select array_agg(ad.department_id::text) from application_departments ad where ad.application_id = a.id), '{}') as department_ids,
           coalesce((select jsonb_agg(jsonb_build_object('kind', c.kind, 'version', c.text_version) order by c.created_at)
                     from consents c where c.user_id = a.user_id and c.action = 'given'), '[]'::jsonb) as consents
    from applications a
    join volunteer_profiles vp on vp.user_id = a.user_id
    left join volunteer_contacts vc on vc.user_id = a.user_id
    left join volunteer_private vpr on vpr.user_id = a.user_id
    where a.stage in ('submitted', 'under_review', 'interview', 'needs_info')
    order by a.submitted_at asc, a.id`));
  return r.map((x) => ({
    id: String(x.id), userId: String(x.user_id), stage: x.stage as QueueRow["stage"],
    submittedAt: new Date(x.submitted_at as string).toISOString(),
    first: String(x.first_name), last: String(x.last_name), state: String(x.state), lga: String(x.lga),
    skills: (x.skills as string[]) ?? [], languages: (x.languages as string[]) ?? [], availability: (x.availability as string | null) ?? null,
    email: (x.email as string | null) ?? null, phone: (x.phone as string | null) ?? null, dob: (x.dob as string | null) ?? null,
    ageYears: x.age === null ? null : Number(x.age), guardianVerified: !!x.guardian_verified, guardianName: (x.guardian_name as string | null) ?? null,
    departmentIds: (x.department_ids as string[]) ?? [],
    consents: ((x.consents as { kind: string; version: string }[]) ?? []), reply: (x.reply as string | null) ?? null,
  }));
}

export type Decision = "approved" | "rejected" | "needs_info";
export type DecisionResult = { id: string; ok: true } | { id: string; ok: false; code: string; message: string };

/** Decide one application. Returns a result instead of throwing, so a batch can report which ones were refused. */
export async function decideApplication(db: Db, id: string, decision: Decision, note?: string): Promise<DecisionResult> {
  try {
    await guard(async () => {
      const cleanNote = note?.trim().slice(0, 500) || null;
      if (decision === "needs_info" && !cleanNote) throw new AppError("note_required", "Say what you need from the applicant.");
      const rows = rowsOf(await db.execute(sql`
        update applications set stage = ${decision}::application_stage,
          needs_info_note = case when ${decision} = 'needs_info' then ${cleanNote} else needs_info_note end,
          reviewer_note = case when ${decision} = 'rejected' then ${cleanNote} else reviewer_note end
        where id = ${id}::uuid and stage in ('submitted', 'under_review', 'interview', 'needs_info')
        returning id`));
      if (rows.length === 0) throw new AppError("not_found", "That application is no longer waiting, or you may not decide it.");
    });
    return { id, ok: true };
  } catch (e) {
    if (e instanceof AppError) return { id, ok: false, code: e.code, message: e.message };
    throw e;
  }
}

/** For the emails only: the applicant's address and first name, read with the trusted connection (an admin may not be allowed to see contact details). */
export async function applicantEmailTarget(owner: Db, applicationId: string) {
  const r = rowsOf<{ user_id: string; email: string | null; first_name: string }>(await owner.execute(sql`
    select a.user_id, vc.email, vp.first_name from applications a
    join volunteer_profiles vp on vp.user_id = a.user_id
    left join volunteer_contacts vc on vc.user_id = a.user_id where a.id = ${applicationId}::uuid`))[0];
  return r?.email ? { userId: r.user_id, email: r.email, first: r.first_name } : null;
}

/**
 * Approval puts the new volunteer into the departments they chose, so their department room and calls work straight away.
 * Runs with the trusted connection AFTER the decision was accepted (an admin who may approve may not be allowed to assign departments).
 */
export async function joinDepartmentsOnApproval(owner: Db, applicationId: string): Promise<number> {
  const r = rowsOf(await owner.execute(sql`
    insert into department_memberships (user_id, department_id, role, status, joined_at)
    select a.user_id, ad.department_id, 'member', 'active', now()
    from applications a join application_departments ad on ad.application_id = a.id join departments d on d.id = ad.department_id and d.status = 'active'
    where a.id = ${applicationId}::uuid and a.stage = 'approved'
    on conflict (user_id, department_id) do update set status = 'active', left_at = null
    returning id`));
  await owner.execute(sql`update application_departments set confirmed = true where application_id = ${applicationId}::uuid`);
  return r.length;
}
