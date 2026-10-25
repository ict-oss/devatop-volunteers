import { sql } from "drizzle-orm";
import { AppError, guard, rowsOf, type Db } from "./db";

/** The same shape the prototype screens already use, so the public board and dashboard need no redesign. */
export type OpportunityView = {
  id: string; title: string; programme: string; programmeId: string; departmentId: string | null; state: string; place: string; mode: "Physical" | "Remote";
  date: string; commitment: string; skills: string[]; deadline: string; slots: number; taken: number; blurb: string; urgent?: boolean; published: boolean;
  startsAt: string; endsAt: string | null; signupDeadline: string;
};

const REMOTE_STATE = "Remote (any state)";
type Row = Record<string, unknown>;
const toView = (r: Row): OpportunityView => {
  const starts = new Date(r.starts_at as string), deadline = new Date(r.signup_deadline as string);
  const slots = Number(r.slots), taken = Number(r.taken ?? 0);
  const hoursLeft = (deadline.getTime() - Date.now()) / 36e5;
  return {
    id: String(r.id), title: String(r.title), programme: String(r.programme_name), programmeId: String(r.programme_id), departmentId: (r.department_id as string | null) ?? null,
    state: r.mode === "remote" ? REMOTE_STATE : String(r.state ?? ""), place: String(r.place ?? ""), mode: r.mode === "remote" ? "Remote" : "Physical",
    date: starts.toISOString().slice(0, 10), commitment: String(r.commitment ?? ""), skills: (r.skills as string[]) ?? [],
    deadline: deadline.toISOString().slice(0, 10), slots, taken, blurb: String(r.description ?? ""),
    // "urgent" = closing within 3 days, or nearly full
    urgent: (hoursLeft > 0 && hoursLeft < 72) || (slots - taken > 0 && slots - taken <= 3) || undefined,
    published: !!r.published, startsAt: starts.toISOString(), endsAt: r.ends_at ? new Date(r.ends_at as string).toISOString() : null, signupDeadline: deadline.toISOString(),
  };
};
const SELECT = sql`
  select o.id, o.title, o.description, o.programme_id, p.name as programme_name, o.department_id, o.mode, o.state, o.place, o.starts_at, o.ends_at,
         o.signup_deadline, o.slots, o.skills, o.commitment, o.published, public.confirmed_count(o.id) as taken
  from opportunities o join programmes p on p.id = o.programme_id`;

/** The public board: published calls that have not started yet, soonest first. Row-level security decides what the caller may see. */
export async function upcomingOpportunities(db: Db): Promise<OpportunityView[]> {
  return rowsOf<Row>(await db.execute(sql`${SELECT} where o.published and o.starts_at > now() order by o.starts_at, o.id`)).map(toView);
}
/** Calls whose check-in window is open now (3 hours before the start until 6 hours after the end), for the QR check-in screen. */
export async function checkInWindowOpportunities(db: Db): Promise<OpportunityView[]> {
  return rowsOf<Row>(await db.execute(sql`${SELECT} where o.published
    and now() between o.starts_at - interval '3 hours' and coalesce(o.ends_at, o.starts_at + interval '12 hours') + interval '6 hours' order by o.starts_at`)).map(toView);
}
/** The admin's list: everything in their scope, past and unpublished included. */
export async function adminOpportunities(db: Db): Promise<OpportunityView[]> {
  // published calls are public to read, so the admin's own scope is applied here as well (opp_in_scope is false for a non-admin)
  return rowsOf<Row>(await db.execute(sql`${SELECT} where public.opp_in_scope(o.state, o.programme_id, o.department_id) order by o.starts_at desc, o.id`)).map(toView);
}

/* ---------------------------------------------------------------- admin: create and edit */
export { opportunitySchema, type OpportunityInput } from "../validation/opportunity";
import type { OpportunityInput } from "../validation/opportunity";

export async function createOpportunity(db: Db, input: OpportunityInput): Promise<{ id: string }> {
  return guard(async () => {
    const r = rowsOf<{ id: string }>(await db.execute(sql`
      insert into opportunities (title, description, programme_id, department_id, mode, state, place, starts_at, ends_at, signup_deadline, slots, skills, commitment, published)
      values (${input.title}, ${input.description || null}, ${input.programmeId}::uuid, ${input.departmentId}::uuid, ${input.mode}::opportunity_mode,
              ${input.mode === "remote" ? null : input.state}, ${input.place || null}, ${input.startsAt}::timestamptz, ${input.endsAt}::timestamptz, ${input.signupDeadline}::timestamptz,
              ${input.slots}, array(select jsonb_array_elements_text(${JSON.stringify(input.skills)}::jsonb)), ${input.commitment || null}, ${input.published})
      returning id`));
    return { id: r[0].id };
  });
}

export async function updateOpportunity(db: Db, id: string, input: OpportunityInput): Promise<void> {
  const r = await guard(async () => rowsOf(await db.execute(sql`
    update opportunities set title = ${input.title}, description = ${input.description || null}, programme_id = ${input.programmeId}::uuid, department_id = ${input.departmentId}::uuid,
      mode = ${input.mode}::opportunity_mode, state = ${input.mode === "remote" ? null : input.state}, place = ${input.place || null}, starts_at = ${input.startsAt}::timestamptz,
      ends_at = ${input.endsAt}::timestamptz, signup_deadline = ${input.signupDeadline}::timestamptz, slots = ${input.slots},
      skills = array(select jsonb_array_elements_text(${JSON.stringify(input.skills)}::jsonb)), commitment = ${input.commitment || null}, published = ${input.published}
    where id = ${id}::uuid returning id`)));
  if (r.length === 0) throw new AppError("not_found", "We could not find that call, or it is outside your area.");
}

export async function setOpportunityPublished(db: Db, id: string, published: boolean) {
  return guard(async () => {
    const r = rowsOf(await db.execute(sql`update opportunities set published = ${published} where id = ${id}::uuid returning id`));
    if (r.length === 0) throw new AppError("not_found", "We could not find that call, or it is outside your area.");
  });
}

/* ---------------------------------------------------------------- volunteer: sign up and cancel */
export type MySignup = { opportunityId: string; status: "confirmed" | "waitlisted" | "cancelled" };
export async function mySignups(db: Db, userId: string): Promise<MySignup[]> {
  return rowsOf<{ opportunity_id: string; status: MySignup["status"] }>(await db.execute(sql`select opportunity_id, status from signups where user_id = ${userId}::uuid`))
    .map((r) => ({ opportunityId: r.opportunity_id, status: r.status }));
}

/** The database decides confirmed or waitlisted, and refuses when closed, full-of-rules or the person is not an active volunteer. */
export async function signUp(db: Db, userId: string, opportunityId: string): Promise<"confirmed" | "waitlisted"> {
  const existing = rowsOf<{ status: string }>(await db.execute(sql`select status from signups where user_id = ${userId}::uuid and opportunity_id = ${opportunityId}::uuid`))[0];
  if (existing && existing.status !== "cancelled") return existing.status as "confirmed" | "waitlisted";
  if (existing) throw new AppError("cancelled_before", "You cancelled this call earlier. Message your coordinator if you want back in.");
  return guard(async () => {
    const r = rowsOf<{ status: "confirmed" | "waitlisted" }>(await db.execute(sql`insert into signups (user_id, opportunity_id) values (${userId}::uuid, ${opportunityId}::uuid) returning status`));
    return r[0].status;
  });
}
export async function cancelSignup(db: Db, userId: string, opportunityId: string): Promise<void> {
  const r = rowsOf(await db.execute(sql`update signups set status = 'cancelled' where user_id = ${userId}::uuid and opportunity_id = ${opportunityId}::uuid and status <> 'cancelled' returning id`));
  if (r.length === 0) throw new AppError("not_found", "You are not signed up for that call.");
}
