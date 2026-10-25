import { sql } from "drizzle-orm";
import { rowsOf, type Db } from "./db";

/** The admin's "what needs me today" numbers. Every count runs as the admin, so it is automatically inside their scope (rule 2). */
export type Overview = {
  pendingApplications: number; pendingHours: number; eventsThisWeek: number;
  totalVolunteers: number; activeVolunteers: number; newThisMonth: number; totalHours: number; upcomingEvents: number;
  thisWeek: { id: string; title: string; startsAt: string; place: string; taken: number; slots: number }[];
};
export async function overview(db: Db): Promise<Overview> {
  const n = rowsOf<Record<string, unknown>>(await db.execute(sql`
    select
      (select count(*) from applications where stage in ('submitted', 'under_review', 'interview'))::int as pending_applications,
      (select count(*) from hour_logs where status = 'pending' and public.has_perm('hours.approve') and user_id is not null and public.in_scope(user_id))::int as pending_hours,
      (select count(*) from volunteer_profiles where status <> 'applicant' and public.has_perm('volunteers.list'))::int as total_volunteers,
      (select count(*) from volunteer_profiles where status = 'active' and public.has_perm('volunteers.list'))::int as active_volunteers,
      (select count(*) from volunteer_profiles where created_at > now() - interval '30 days' and public.has_perm('volunteers.list'))::int as new_month,
      (select coalesce(sum(hours), 0) from hour_logs where status = 'approved' and public.has_perm('reports.see') and user_id is not null and public.in_scope(user_id)) as total_hours`))[0];
  const week = rowsOf<Record<string, unknown>>(await db.execute(sql`
    select o.id, o.title, o.starts_at, concat_ws(', ', o.place, o.state) as place, o.slots, public.confirmed_count(o.id) as taken
    from opportunities o where public.opp_in_scope(o.state, o.programme_id, o.department_id) and o.starts_at > now() order by o.starts_at limit 30`));
  const inWeek = week.filter((o) => Date.parse(o.starts_at as string) < Date.now() + 7 * 864e5);
  return {
    pendingApplications: Number(n.pending_applications), pendingHours: Number(n.pending_hours), eventsThisWeek: inWeek.length,
    totalVolunteers: Number(n.total_volunteers), activeVolunteers: Number(n.active_volunteers), newThisMonth: Number(n.new_month), totalHours: Number(n.total_hours), upcomingEvents: week.length,
    thisWeek: inWeek.slice(0, 5).map((o) => ({ id: String(o.id), title: String(o.title), startsAt: new Date(o.starts_at as string).toISOString(), place: String(o.place ?? ""), taken: Number(o.taken), slots: Number(o.slots) })),
  };
}

export type VolunteerRow = { userId: string; first: string; last: string; state: string; status: string; email: string | null; phone: string | null; departments: string[]; approvedHours: number };
/** Volunteers in the admin's scope. Phone and email come back empty for roles that may not see them (the permissions matrix). */
export async function volunteerDirectory(db: Db, limit = 500): Promise<VolunteerRow[]> {
  return rowsOf<Record<string, unknown>>(await db.execute(sql`
    select vp.user_id, vp.first_name, vp.last_name, vp.state, vp.status, vc.email, vc.phone,
      coalesce((select array_agg(d.name order by d.name) from department_memberships m join departments d on d.id = m.department_id where m.user_id = vp.user_id and m.status = 'active'), '{}') as departments,
      coalesce((select sum(h.hours) from hour_logs h where h.user_id = vp.user_id and h.status = 'approved'), 0) as hours
    from volunteer_profiles vp left join volunteer_contacts vc on vc.user_id = vp.user_id
    where public.has_perm('volunteers.list') and public.in_scope(vp.user_id)
    order by vp.status, vp.first_name, vp.last_name limit ${limit}`))
    .map((r) => ({ userId: String(r.user_id), first: String(r.first_name), last: String(r.last_name), state: String(r.state), status: String(r.status), email: (r.email as string | null) ?? null, phone: (r.phone as string | null) ?? null, departments: (r.departments as string[]) ?? [], approvedHours: Number(r.hours) }));
}

export type AuditRaw = { id: number; at: string; actorId: string | null; action: string; record: string };
export type AuditRow = AuditRaw & { who: string };
/** Step 1: read the log as the admin (needs audit.see). Ids only (rule 5). */
export async function auditRaw(db: Db, limit = 150): Promise<AuditRaw[]> {
  return rowsOf<Record<string, unknown>>(await db.execute(sql`select id, at, actor_id, action, table_name, record_id from audit_logs order by at desc, id desc limit ${limit}`))
    .map((r) => ({ id: Number(r.id), at: new Date(r.at as string).toISOString(), actorId: (r.actor_id as string | null) ?? null, action: String(r.action), record: `${r.table_name}${r.record_id ? " · " + String(r.record_id).slice(0, 8) : ""}` }));
}
/** Step 2: put names on it, using the trusted connection AFTER the admin's own query has finished. An admin is named by their Devatop sign-in email. */
export async function nameAuditRows(owner: Db, rows: AuditRaw[]): Promise<AuditRow[]> {
  const ids = [...new Set(rows.map((r) => r.actorId).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (ids.length) for (const r of rowsOf<{ id: string; email: string | null }>(await owner.execute(sql`select id, email from auth.users where id::text in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`))) names.set(r.id, r.email ?? "Admin");
  return rows.map((r) => ({ ...r, who: r.actorId ? names.get(r.actorId) ?? "Admin" : "System" }));
}
