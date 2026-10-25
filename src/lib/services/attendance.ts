import { sql } from "drizzle-orm";
import { AppError, guard, rowsOf, type Db } from "./db";

/** The coordinator's door list and the volunteer's QR check-in. QR hours stay pending until an admin approves them (rule 7). */
export type RosterRow = { userId: string; name: string; signupStatus: "confirmed" | "waitlisted" | null; checkedInAt: string | null; checkedOutAt: string | null; method: "qr" | "coordinator" | null; present: boolean; walkIn: boolean };

export async function rosterForOpportunity(db: Db, opportunityId: string): Promise<RosterRow[]> {
  const r = rowsOf<Record<string, unknown>>(await db.execute(sql`
    select u.user_id, vp.first_name || ' ' || vp.last_name as name, s.status as signup_status, a.checked_in_at, a.checked_out_at, a.method
    from (select user_id from signups where opportunity_id = ${opportunityId}::uuid and status <> 'cancelled'
          union select user_id from attendance where opportunity_id = ${opportunityId}::uuid) u
    join volunteer_profiles vp on vp.user_id = u.user_id
    left join signups s on s.user_id = u.user_id and s.opportunity_id = ${opportunityId}::uuid
    left join attendance a on a.user_id = u.user_id and a.opportunity_id = ${opportunityId}::uuid
    where public.has_perm('attendance.take') and public.opp_scope(${opportunityId}::uuid)
    order by vp.first_name, vp.last_name`));
  return r.map((x) => ({
    userId: String(x.user_id), name: String(x.name), signupStatus: (x.signup_status as RosterRow["signupStatus"]) ?? null,
    checkedInAt: x.checked_in_at ? new Date(x.checked_in_at as string).toISOString() : null, checkedOutAt: x.checked_out_at ? new Date(x.checked_out_at as string).toISOString() : null,
    method: (x.method as RosterRow["method"]) ?? null, present: !!x.checked_in_at, walkIn: !x.signup_status,
  }));
}

/** The secret printed in the QR code. Only people who may take attendance in this call's scope can read it. */
export async function qrSecret(db: Db, opportunityId: string): Promise<string | null> {
  return rowsOf<{ qr_secret: string }>(await db.execute(sql`select qr_secret from opportunity_secrets where opportunity_id = ${opportunityId}::uuid`))[0]?.qr_secret ?? null;
}

export async function setPresent(db: Db, opportunityId: string, userId: string, present: boolean, markerId: string): Promise<void> {
  await guard(async () => {
    if (present) {
      await db.execute(sql`insert into attendance (opportunity_id, user_id, checked_in_at, method, marked_by) values (${opportunityId}::uuid, ${userId}::uuid, now(), 'coordinator', ${markerId}::uuid)
        on conflict (opportunity_id, user_id) do update set checked_in_at = coalesce(attendance.checked_in_at, now()), marked_by = ${markerId}::uuid`);
    } else {
      const r = rowsOf(await db.execute(sql`update attendance set checked_in_at = null, checked_out_at = null, marked_by = ${markerId}::uuid where opportunity_id = ${opportunityId}::uuid and user_id = ${userId}::uuid returning id`));
      if (r.length === 0) throw new AppError("not_found", "That person is not on the list.");
    }
  });
}

/** "Save attendance": one pending hours entry per person who is present and has none yet for this call (QR check-outs are never duplicated). */
export async function recordAttendanceHours(db: Db, opportunityId: string, hoursEach: number): Promise<number> {
  if (!(hoursEach >= 0.5 && hoursEach <= 24 && Math.round(hoursEach * 2) === hoursEach * 2)) throw new AppError("invalid", "Enter hours between 0.5 and 24.");
  return guard(async () => rowsOf(await db.execute(sql`
    insert into hour_logs (user_id, opportunity_id, programme_id, activity, worked_on, hours, method)
    select a.user_id, o.id, o.programme_id, o.title, (o.starts_at at time zone 'Africa/Lagos')::date, ${hoursEach}, 'coordinator'
    from attendance a join opportunities o on o.id = a.opportunity_id
    where a.opportunity_id = ${opportunityId}::uuid and a.checked_in_at is not null
      and not exists (select 1 from hour_logs h where h.user_id = a.user_id and h.opportunity_id = a.opportunity_id)
    returning id`)).length);
}

/* ---------------------------------------------------------------- volunteer */
export type MyAttendance = { checkedInAt: string | null; checkedOutAt: string | null };
export async function myAttendance(db: Db, userId: string, opportunityId: string): Promise<MyAttendance> {
  const r = rowsOf<{ checked_in_at: string | null; checked_out_at: string | null }>(await db.execute(sql`select checked_in_at, checked_out_at from attendance where user_id = ${userId}::uuid and opportunity_id = ${opportunityId}::uuid`))[0];
  return { checkedInAt: r?.checked_in_at ? new Date(r.checked_in_at).toISOString() : null, checkedOutAt: r?.checked_out_at ? new Date(r.checked_out_at).toISOString() : null };
}
export async function checkIn(db: Db, opportunityId: string, secret: string): Promise<void> {
  await guard(async () => { await db.execute(sql`select public.check_in(${opportunityId}::uuid, ${secret})`); });
}
/** Returns the hours recorded (pending approval). */
export async function checkOut(db: Db, opportunityId: string, secret: string): Promise<number> {
  return guard(async () => Number(rowsOf<{ h: string }>(await db.execute(sql`select public.check_out(${opportunityId}::uuid, ${secret}) as h`))[0].h));
}
