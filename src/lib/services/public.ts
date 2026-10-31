import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { appSettings, departments, programmes } from "../db/schema";
import { rowsOf, type Db } from "./db";

/** What anyone may read: the active departments (never hard-coded, rule 10) and the two public settings. */
export async function activeDepartments(db: Db) {
  return db.select({ id: departments.id, name: departments.name, description: departments.description })
    .from(departments).where(eq(departments.status, "active")).orderBy(asc(departments.sortOrder), asc(departments.name));
}

export async function publicSettings(db: Db): Promise<{ minAge: number; reviewDays: number }> {
  const rows = await db.select().from(appSettings).where(and(inArray(appSettings.key, ["min_age", "review_days"])));
  const v = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { minAge: typeof v.min_age === "number" ? v.min_age : 16, reviewDays: typeof v.review_days === "number" ? v.review_days : 7 };
}

export async function allProgrammes(db: Db) {
  return db.select({ id: programmes.id, name: programmes.name }).from(programmes).where(eq(programmes.active, true)).orderBy(asc(programmes.name));
}

export type PublicNumbers = { volunteers: number; hours: number; states: number; roll: string[] };
const toId = (name: string) => (/^fct/i.test(name) ? "federalcapitalterritory" : name.toLowerCase().replace(/[^a-z]/g, ""));

/** The totals on the home page and the names of volunteers who chose to be on the Roll ("Amaka O."). Reads the public views, as a visitor. */
export async function publicNumbers(db: Db): Promise<PublicNumbers> {
  const stats = rowsOf<{ volunteers: number; hours: string; states: number }>(await db.execute(sql`select volunteers, hours, states from public.public_stats`))[0];
  const roll = rowsOf<{ display_name: string }>(await db.execute(sql`select display_name from public.public_roll limit 60`));
  return { volunteers: Number(stats?.volunteers ?? 0), hours: Math.round(Number(stats?.hours ?? 0)), states: Number(stats?.states ?? 0), roll: roll.map((r) => r.display_name) };
}

/**
 * Approved hours per state, as map ids ("lagos", "federalcapitalterritory"), for the home page map.
 * Totals only: no names, no individual records. It is read on the trusted server connection, so it needs no extra database view.
 */
export async function stateHoursForMap(owner: Db): Promise<Record<string, number>> {
  const rows = rowsOf<{ state: string; hours: string }>(await owner.execute(sql`
    select vp.state, coalesce(sum(h.hours), 0) as hours
    from hour_logs h join volunteer_profiles vp on vp.user_id = h.user_id
    where h.status = 'approved' and vp.state is not null group by vp.state`));
  return Object.fromEntries(rows.filter((r) => Number(r.hours) > 0).map((r) => [toId(r.state), Math.round(Number(r.hours))]));
}
