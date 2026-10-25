import { sql } from "drizzle-orm";
import { rowsOf, type Db } from "./db";

/** Everything the signed-in volunteer's screens need, read as that person (row-level security: only their own rows). */
export type MyApplicationRow = {
  id: string; stage: "submitted" | "under_review" | "interview" | "needs_info" | "approved" | "rejected"; submittedAt: string; needsInfoNote: string | null;
  first: string; last: string; state: string; lga: string; skills: string[]; languages: string[]; availability: string | null; status: string;
  email: string | null; phone: string | null; dob: string | null; departmentIds: string[]; consents: { kind: string; version: string; at: string }[];
};

export async function myApplicationRow(db: Db, userId: string): Promise<MyApplicationRow | null> {
  const r = rowsOf<Record<string, unknown>>(await db.execute(sql`
    select a.id, a.stage, a.submitted_at, a.needs_info_note, vp.first_name, vp.last_name, vp.state, vp.lga, vp.skills, vp.languages, vp.availability, vp.status,
           vc.email, vc.phone, vpr.date_of_birth::text as dob,
           coalesce((select array_agg(ad.department_id::text) from application_departments ad where ad.application_id = a.id), '{}') as department_ids,
           coalesce((select jsonb_agg(jsonb_build_object('kind', c.kind, 'version', c.text_version, 'at', c.created_at) order by c.created_at) from consents c where c.user_id = a.user_id and c.action = 'given'), '[]'::jsonb) as consents
    from applications a join volunteer_profiles vp on vp.user_id = a.user_id
    left join volunteer_contacts vc on vc.user_id = a.user_id left join volunteer_private vpr on vpr.user_id = a.user_id
    where a.user_id = ${userId}::uuid order by a.submitted_at desc limit 1`))[0];
  if (!r) return null;
  return {
    id: String(r.id), stage: r.stage as MyApplicationRow["stage"], submittedAt: new Date(r.submitted_at as string).toISOString(), needsInfoNote: (r.needs_info_note as string | null) ?? null,
    first: String(r.first_name), last: String(r.last_name), state: String(r.state), lga: String(r.lga), skills: (r.skills as string[]) ?? [], languages: (r.languages as string[]) ?? [],
    availability: (r.availability as string | null) ?? null, status: String(r.status), email: (r.email as string | null) ?? null, phone: (r.phone as string | null) ?? null, dob: (r.dob as string | null) ?? null,
    departmentIds: (r.department_ids as string[]) ?? [], consents: (r.consents as MyApplicationRow["consents"]) ?? [],
  };
}

export type StartItem = { key: string; label: string; done: boolean };
/** "Start here": required trainings, must-read guides, the WhatsApp group and a first sign-up. All ticked by the database, not by a click. */
export async function startHere(db: Db, userId: string): Promise<StartItem[]> {
  const trainings = rowsOf<{ id: string; name: string; done: boolean }>(await db.execute(sql`
    select t.id, t.name, exists (select 1 from training_completions c where c.training_id = t.id and c.user_id = ${userId}::uuid and (c.expires_at is null or c.expires_at > now())) as done
    from trainings t where t.required order by t.name`));
  const guides = rowsOf<{ id: string; title: string; done: boolean }>(await db.execute(sql`
    select g.id, g.title, exists (select 1 from guide_reads r where r.guide_id = g.id and r.user_id = ${userId}::uuid) as done
    from guides g where g.must_read and g.published order by g.sort_order, g.title`));
  const wa = rowsOf<{ n: number }>(await db.execute(sql`select count(*)::int as n from checklist_progress where user_id = ${userId}::uuid and item_key = 'whatsapp'`))[0].n > 0;
  const signed = rowsOf<{ n: number }>(await db.execute(sql`select count(*)::int as n from signups where user_id = ${userId}::uuid and status <> 'cancelled'`))[0].n > 0;
  return [
    ...trainings.map((t) => ({ key: `training:${t.id}`, label: `Complete ${t.name.toLowerCase()} training`, done: t.done })),
    { key: "whatsapp", label: "Join the volunteers WhatsApp group", done: wa },
    ...guides.map((g) => ({ key: `guide:${g.id}`, label: `Read: ${g.title}`, done: g.done })),
    { key: "first-signup", label: "Sign up for your first call", done: signed },
  ];
}

export type AnnouncementView = { id: string; at: string; by: string; title: string; body: string };
export async function recentAnnouncements(db: Db, limit = 3): Promise<AnnouncementView[]> {
  return rowsOf<Record<string, unknown>>(await db.execute(sql`select id, subject, body, sent_at from messages where kind = 'announcement' order by sent_at desc limit ${limit}`))
    .map((r) => ({ id: String(r.id), at: new Date(r.sent_at as string).toISOString(), by: "Devatop team", title: String(r.subject), body: String(r.body) }));
}

/** Active volunteers may read the WhatsApp group link (policy set_select_active); everyone else gets an empty string. */
export async function whatsappGroup(db: Db): Promise<string> {
  const v = rowsOf<{ value: unknown }>(await db.execute(sql`select value from app_settings where key = 'whatsapp_group'`))[0]?.value;
  return typeof v === "string" ? v : "";
}
