import { sql } from "drizzle-orm";
import { z } from "zod";
import { STATE_NAMES } from "../data";
import { AppError, guard, rowsOf, type Db } from "./db";

/** The volunteer's own profile, their data download, and guides. Everything runs as the volunteer (rule 3: only their own records). */
export const profileSchema = z.object({
  phone: z.string().trim().regex(/^[0+][\d\s-]{9,14}$/, "Enter a Nigerian phone number, e.g. 0803 123 4567."),
  state: z.enum(STATE_NAMES as [string, ...string[]]), availability: z.string().trim().min(1).max(40),
  skills: z.array(z.string().trim().min(1).max(40)).min(1, "Pick at least one skill.").max(20), languages: z.array(z.string().trim().min(1).max(30)).max(12),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export async function updateMyProfile(db: Db, userId: string, i: ProfileInput): Promise<void> {
  await guard(async () => {
    const a = rowsOf(await db.execute(sql`update volunteer_profiles set state = ${i.state}, availability = ${i.availability},
      skills = array(select jsonb_array_elements_text(${JSON.stringify(i.skills)}::jsonb)), languages = array(select jsonb_array_elements_text(${JSON.stringify(i.languages)}::jsonb))
      where user_id = ${userId}::uuid returning user_id`));
    if (a.length === 0) throw new AppError("not_found", "We could not find your profile.");
    await db.execute(sql`update volunteer_contacts set phone = ${i.phone} where user_id = ${userId}::uuid`);
  });
}

/** "Download my data": everything held about this person, as one JSON document. */
export async function exportMyData(db: Db, userId: string): Promise<Record<string, unknown>> {
  const one = async (q: ReturnType<typeof sql>) => rowsOf<Record<string, unknown>>(await db.execute(q));
  return {
    exportedAt: new Date().toISOString(),
    profile: (await one(sql`select first_name, last_name, state, lga, skills, languages, availability, heard_from, status, roll_opt_in, created_at from volunteer_profiles where user_id = ${userId}::uuid`))[0] ?? null,
    contact: (await one(sql`select email, phone, address from volunteer_contacts where user_id = ${userId}::uuid`))[0] ?? null,
    private: (await one(sql`select date_of_birth::text as date_of_birth, occupation, nysc_state_code from volunteer_private where user_id = ${userId}::uuid`))[0] ?? null,
    applications: await one(sql`select id, stage, submitted_at, reviewed_at, needs_info_note from applications where user_id = ${userId}::uuid order by submitted_at`),
    consents: await one(sql`select kind, action, text_version, text_snapshot, created_at from consents where user_id = ${userId}::uuid order by created_at`),
    guardianConsents: await one(sql`select guardian_name, verified, verified_at from guardian_consents where user_id = ${userId}::uuid`),
    signups: await one(sql`select s.status, s.created_at, o.title from signups s join opportunities o on o.id = s.opportunity_id where s.user_id = ${userId}::uuid order by s.created_at`),
    hours: await one(sql`select activity, worked_on::text as worked_on, hours, status, method from hour_logs where user_id = ${userId}::uuid order by worked_on`),
    certificates: await one(sql`select code, hours, period_start::text as period_start, period_end::text as period_end, issued_at, revoked_at from certificates where user_id = ${userId}::uuid`),
  };
}

/** Withdraw consent and delete the account. The database records the withdrawals first, anonymises hours, and revokes certificates. The sign-in itself is removed by the server afterwards. */
export async function deleteMyAccountData(db: Db): Promise<void> {
  await guard(async () => { await db.execute(sql`select public.delete_my_account()`); });
}

/* ---------------------------------------------------------------- guides */
export type GuideView = { id: string; title: string; body: string[]; mustRead: boolean; read: boolean; updatedAt: string };
/** Only the guides this person may see (row-level security): published, and for their audience. Search then runs over this list. */
export async function myGuides(db: Db, userId: string): Promise<GuideView[]> {
  return rowsOf<Record<string, unknown>>(await db.execute(sql`
    select g.id, g.title, g.body, g.must_read, g.updated_at, exists (select 1 from guide_reads r where r.guide_id = g.id and r.user_id = ${userId}::uuid) as read
    from guides g where g.published and g.audience in ('volunteers', 'department', 'public') order by g.sort_order, g.title`))
    .map((r) => ({ id: String(r.id), title: String(r.title), body: String(r.body).split(/\n{2,}/).filter(Boolean), mustRead: !!r.must_read, read: !!r.read, updatedAt: new Date(r.updated_at as string).toISOString() }));
}
export async function markGuideRead(db: Db, userId: string, guideId: string): Promise<void> {
  await guard(async () => { await db.execute(sql`insert into guide_reads (user_id, guide_id) values (${userId}::uuid, ${guideId}::uuid) on conflict do nothing`); });
}
