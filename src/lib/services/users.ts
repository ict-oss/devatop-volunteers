import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminRoles, volunteerProfiles } from "../db/schema";
import { ROLE_DB, ROLE_FROM_DB, ROLE_LABEL, type Role } from "../permissions";
import { AppError, guard, rowsOf, type Db } from "./db";

/* ---------------------------------------------------------------- volunteers: status */
/** Statuses an admin may set. "Applicant" is decided in the review queue, never here. */
export const VOLUNTEER_STATUSES = ["active", "inactive", "suspended", "alumni"] as const;
export type VolunteerStatus = (typeof VOLUNTEER_STATUSES)[number];

/** Suspend, reactivate, or mark as alumni. Runs as the admin: the database allows it only with volunteers.suspend and inside their scope, and audits it. */
export async function setVolunteerStatus(db: Db, userId: string, status: VolunteerStatus): Promise<void> {
  if (!VOLUNTEER_STATUSES.includes(status)) throw new AppError("bad_status", "That status cannot be set here.");
  await guard(async () => {
    const done = await db.update(volunteerProfiles).set({ status }).where(eq(volunteerProfiles.userId, userId)).returning({ id: volunteerProfiles.userId });
    if (done.length === 0) throw new AppError("not_found", "We could not find that volunteer.");
    if (status === "suspended") // a suspended volunteer keeps no confirmed place on upcoming calls
      await db.execute(sql`update signups set status = 'cancelled' where user_id = ${userId} and status in ('confirmed', 'waitlisted') and opportunity_id in (select id from opportunities where starts_at > now())`);
  });
}

/* ---------------------------------------------------------------- admins */
export type AdminRaw = { userId: string; role: Role; state: string | null; programme: string | null; department: string | null; since: string };
export type AdminRowView = AdminRaw & { email: string; roleLabel: string; scope: string };

/** Step 1: read the list as the admin (needs admins.manage). */
export async function adminsRaw(db: Db): Promise<AdminRaw[]> {
  return rowsOf<Record<string, unknown>>(await db.execute(sql`
    select ar.user_id, ar.role, ar.state, p.name as programme, d.name as department, ar.created_at
    from admin_roles ar left join programmes p on p.id = ar.programme_id left join departments d on d.id = ar.department_id
    order by ar.created_at, ar.user_id`))
    .map((r) => ({ userId: String(r.user_id), role: ROLE_FROM_DB[String(r.role)], state: (r.state as string | null) ?? null, programme: (r.programme as string | null) ?? null, department: (r.department as string | null) ?? null, since: new Date(r.created_at as string).toISOString() }));
}
/** Step 2: put the sign-in email on each one, on the trusted connection, AFTER the admin's own query has finished. */
export async function nameAdmins(owner: Db, rows: AdminRaw[]): Promise<AdminRowView[]> {
  const emails = new Map<string, string>();
  if (rows.length) for (const r of rowsOf<{ id: string; email: string | null }>(await owner.execute(sql`select id, email from auth.users where id::text in (${sql.join(rows.map((x) => sql`${x.userId}`), sql`, `)})`))) emails.set(r.id, r.email ?? "");
  return rows.map((r) => ({ ...r, email: emails.get(r.userId) ?? "", roleLabel: ROLE_LABEL[r.role], scope: r.state ?? r.programme ?? r.department ?? "" }));
}
/** Someone can become an admin only after they have created an account (at /signup). Trusted connection. */
export async function userIdByEmail(owner: Db, email: string): Promise<string | null> {
  const r = rowsOf<{ id: string }>(await owner.execute(sql`select u.id from auth.users u join public.users pu on pu.id = u.id where lower(u.email) = lower(${email.trim()}) limit 1`))[0];
  return r?.id ?? null;
}

export const adminInput = z.object({
  role: z.enum(["super", "programme", "coordinator", "state", "department", "viewer"]),
  state: z.string().max(60).nullish(), programmeId: z.uuid().nullish(), departmentId: z.uuid().nullish(),
}).superRefine((v, ctx) => {
  if (v.role === "state" && !v.state) ctx.addIssue({ code: "custom", message: "Pick the state this lead looks after.", path: ["state"] });
  if (v.role === "programme" && !v.programmeId) ctx.addIssue({ code: "custom", message: "Pick the programme.", path: ["programmeId"] });
  if (v.role === "department" && !v.departmentId) ctx.addIssue({ code: "custom", message: "Pick the department.", path: ["departmentId"] });
});
export type AdminInput = z.infer<typeof adminInput>;
const cols = (i: AdminInput) => ({ role: ROLE_DB[i.role] as never, state: i.role === "state" ? i.state! : null, programmeId: i.role === "programme" ? i.programmeId! : null, departmentId: i.role === "department" ? i.departmentId! : null });

/** Give someone an admin role. Only a Super Admin (admins.manage, two-factor) can; the database keeps at least two Super Admins and audits it. */
export async function addAdmin(db: Db, byUserId: string, userId: string, input: AdminInput): Promise<void> {
  if (userId === byUserId) throw new AppError("own_admin_role", "You cannot change or remove your own admin role. Ask another Super Admin.");
  await guard(async () => { await db.insert(adminRoles).values({ userId, createdBy: byUserId, ...cols(input) }); });
}
export async function changeAdmin(db: Db, byUserId: string, userId: string, input: AdminInput): Promise<void> {
  if (userId === byUserId) throw new AppError("own_admin_role", "You cannot change or remove your own admin role. Ask another Super Admin.");
  await guard(async () => {
    const done = await db.update(adminRoles).set(cols(input)).where(eq(adminRoles.userId, userId)).returning({ id: adminRoles.userId });
    if (done.length === 0) throw new AppError("not_found", "We could not find that admin.");
  });
}
export async function removeAdmin(db: Db, byUserId: string, userId: string): Promise<void> {
  if (userId === byUserId) throw new AppError("own_admin_role", "You cannot change or remove your own admin role. Ask another Super Admin.");
  await guard(async () => { await db.delete(adminRoles).where(eq(adminRoles.userId, userId)); });
}
