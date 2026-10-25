import { sql } from "drizzle-orm";
import { rowsOf, type Db } from "./db";

/**
 * Reports for grants and donors. Only APPROVED hours are counted (rule 7); pending ones are listed so the screen can say how many are waiting.
 * Everything runs as the admin, so it stays inside their programme or state (rule 2).
 */
export type ReportRow = { id: string; userId: string; who: string; activity: string; date: string; hours: number; status: "approved" | "pending"; programme: string; state: string };
export async function reportRows(db: Db, limit = 10000): Promise<ReportRow[]> {
  return rowsOf<Record<string, unknown>>(await db.execute(sql`
    select h.id, h.user_id, vp.first_name || ' ' || vp.last_name as who, h.activity, h.worked_on::text as worked_on, h.hours, h.status,
           coalesce(p.name, 'Unassigned') as programme,
           case when o.mode = 'remote' then 'Remote (any state)' else coalesce(o.state, vp.state, 'Unassigned') end as state
    from hour_logs h
    left join opportunities o on o.id = h.opportunity_id
    left join programmes p on p.id = coalesce(h.programme_id, o.programme_id)
    left join volunteer_profiles vp on vp.user_id = h.user_id
    where h.status in ('approved', 'pending') and h.user_id is not null and public.has_perm('reports.see') and public.in_scope(h.user_id)
    order by h.worked_on desc, h.id limit ${limit}`))
    .map((r) => ({ id: String(r.id), userId: String(r.user_id), who: String(r.who), activity: String(r.activity), date: String(r.worked_on).slice(0, 10), hours: Number(r.hours), status: r.status as ReportRow["status"], programme: String(r.programme), state: String(r.state) }));
}

/** Names, contact details and approved hours. Super Admin only (export.personal): the database function says no to anyone else. */
export type PersonalRow = { name: string; email: string; phone: string; state: string; departments: string; approvedHours: number };
export async function personalExport(db: Db): Promise<PersonalRow[]> {
  return rowsOf<Record<string, unknown>>(await db.execute(sql`
    select vp.first_name || ' ' || vp.last_name as name, coalesce(vc.email, '') as email, coalesce(vc.phone, '') as phone, vp.state,
           coalesce((select string_agg(d.name, '; ' order by d.name) from department_memberships m join departments d on d.id = m.department_id where m.user_id = vp.user_id and m.status = 'active'), '') as departments,
           coalesce((select sum(h.hours) from hour_logs h where h.user_id = vp.user_id and h.status = 'approved'), 0) as hours
    from volunteer_profiles vp left join volunteer_contacts vc on vc.user_id = vp.user_id
    where public.has_perm('export.personal') and vp.status in ('active', 'alumni', 'inactive') order by vp.first_name, vp.last_name`))
    .map((r) => ({ name: String(r.name), email: String(r.email), phone: String(r.phone), state: String(r.state), departments: String(r.departments), approvedHours: Number(r.hours) }));
}

/** Writes an export to the audit log (trusted connection: the audit log is read-only through the API). Counts only, never the data. */
export async function logExport(owner: Db, actorId: string, action: "export.report" | "export.personal", detail: Record<string, string | number>) {
  await owner.execute(sql`insert into audit_logs (actor_id, action, table_name, record_id, detail) values (${actorId}::uuid, ${action}, 'export', null, ${JSON.stringify(detail)}::jsonb)`);
}
