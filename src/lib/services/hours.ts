import { sql } from "drizzle-orm";
import { z } from "zod";
import { AppError, guard, rowsOf, type Db } from "./db";

/** Same shape as the prototype's HourLog so the screens built on it work unchanged. Rule 7: only approved hours count. */
export type HourView = {
  id: string; userId: string | null; who: string; activity: string; date: string; hours: number;
  status: "pending" | "approved" | "rejected"; method: "QR" | "Coordinator" | "Remote log"; submittedAt: string;
};
const METHOD = { qr: "QR", coordinator: "Coordinator", remote_log: "Remote log" } as const;
type Row = Record<string, unknown>;
const view = (r: Row): HourView => ({
  id: String(r.id), userId: (r.user_id as string | null) ?? null, who: r.who ? String(r.who) : "Volunteer", activity: String(r.activity),
  date: String(r.worked_on).slice(0, 10), hours: Number(r.hours), status: r.status as HourView["status"], method: METHOD[r.method as keyof typeof METHOD], submittedAt: new Date(r.submitted_at as string).toISOString(),
});
const BASE = sql`select h.id, h.user_id, vp.first_name || ' ' || vp.last_name as who, h.activity, h.worked_on::text, h.hours, h.status, h.method, h.submitted_at
  from hour_logs h left join volunteer_profiles vp on vp.user_id = h.user_id`;

export async function myHours(db: Db, userId: string): Promise<HourView[]> {
  return rowsOf<Row>(await db.execute(sql`${BASE} where h.user_id = ${userId}::uuid order by h.worked_on desc, h.submitted_at desc`)).map(view);
}

export const remoteHoursSchema = z.object({
  activity: z.string().trim().min(3, "Say what you did.").max(160),
  workedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => { const t = Date.parse(d), now = Date.now(); return !isNaN(t) && t <= now + 864e5 && t >= now - 120 * 864e5; }, "Use a date from the last 4 months."),
  hours: z.number().min(0.5).max(24).refine((h) => Math.round(h * 2) === h * 2, "Use whole or half hours."),
});
export type RemoteHoursInput = z.infer<typeof remoteHoursSchema>;

/** A volunteer's own remote work. It always starts pending: only an admin can approve. */
export async function logRemoteHours(db: Db, userId: string, i: RemoteHoursInput): Promise<{ id: string }> {
  return guard(async () => {
    const r = rowsOf<{ id: string }>(await db.execute(sql`
      insert into hour_logs (user_id, activity, worked_on, hours, method) values (${userId}::uuid, ${i.activity}, ${i.workedOn}::date, ${i.hours}, 'remote_log') returning id`));
    return { id: r[0].id };
  });
}

/* ---------------------------------------------------------------- admin */
export async function pendingHours(db: Db): Promise<HourView[]> {
  return rowsOf<Row>(await db.execute(sql`${BASE} where h.status = 'pending' and public.has_perm('hours.approve') and h.user_id is not null and public.in_scope(h.user_id) order by h.submitted_at, h.id`)).map(view);
}
export async function recentlyDecidedHours(db: Db, limit = 6): Promise<HourView[]> {
  return rowsOf<Row>(await db.execute(sql`${BASE} where h.status <> 'pending' and public.has_perm('hours.approve') and h.user_id is not null and public.in_scope(h.user_id) order by h.decided_at desc nulls last limit ${limit}`)).map(view);
}

export type HoursDecision = { done: string[]; refused: { id: string; message: string }[] };
/** Approve or reject hours. Admins cannot decide their own (database rule). Returns who was refused instead of failing the whole batch. */
export async function decideHours(db: Db, ids: string[], decision: "approved" | "rejected", note?: string): Promise<HoursDecision> {
  const out: HoursDecision = { done: [], refused: [] };
  for (const id of ids) {
    try {
      const r = await guard(async () => rowsOf(await db.execute(sql`update hour_logs set status = ${decision}::hour_status, decision_note = ${note?.trim().slice(0, 300) || null} where id = ${id}::uuid and status = 'pending' returning id`)));
      if (r.length === 0) out.refused.push({ id, message: "Those hours are no longer waiting, or are outside your area." }); else out.done.push(id);
    } catch (e) { if (e instanceof AppError) out.refused.push({ id, message: e.message }); else throw e; }
  }
  return out;
}

/** Correct the number of hours on a pending entry (an admin only; the database refuses anyone else). */
export async function editPendingHours(db: Db, id: string, hours: number): Promise<void> {
  if (!(hours >= 0.5 && hours <= 24 && Math.round(hours * 2) === hours * 2)) throw new AppError("invalid", "Use whole or half hours between 0.5 and 24.");
  const r = await guard(async () => rowsOf(await db.execute(sql`update hour_logs set hours = ${hours} where id = ${id}::uuid and status = 'pending' returning id`)));
  if (r.length === 0) throw new AppError("not_found", "Those hours are no longer waiting, or are outside your area.");
}

/** For the thank-you email: this volunteer's approved total (trusted connection; rule 7: approved only). */
export async function approvedTotal(owner: Db, userId: string): Promise<number> {
  return Number(rowsOf<{ t: string }>(await owner.execute(sql`select coalesce(sum(hours), 0) as t from hour_logs where user_id = ${userId}::uuid and status = 'approved'`))[0].t);
}
export async function hourEmailTarget(owner: Db, hourId: string) {
  const r = rowsOf<{ user_id: string; email: string | null; first_name: string; activity: string; hours: string }>(await owner.execute(sql`
    select h.user_id, vc.email, vp.first_name, h.activity, h.hours from hour_logs h
    join volunteer_profiles vp on vp.user_id = h.user_id left join volunteer_contacts vc on vc.user_id = h.user_id where h.id = ${hourId}::uuid`))[0];
  return r?.email ? { userId: r.user_id, email: r.email, first: r.first_name, activity: r.activity, hours: Number(r.hours) } : null;
}
