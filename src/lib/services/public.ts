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

export type PublicNumbers = { volunteers: number; hours: number; states: number; stateHours: Record<string, number>; roll: string[] };
const toId = (name: string) => (/^fct/i.test(name) ? "federalcapitalterritory" : name.toLowerCase().replace(/[^a-z]/g, ""));

/** The real numbers on the home page: totals, hours per state (map ids) and the names of volunteers who chose to be on the Roll ("Amaka O."). */
export async function publicNumbers(db: Db): Promise<PublicNumbers> {
  const stats = rowsOf<{ volunteers: number; hours: string; states: number }>(await db.execute(sql`select volunteers, hours, states from public.public_stats`))[0];
  const perState = rowsOf<{ state: string; hours: string }>(await db.execute(sql`select state, hours from public.public_state_hours`));
  const roll = rowsOf<{ display_name: string }>(await db.execute(sql`select display_name from public.public_roll limit 60`));
  return {
    volunteers: Number(stats?.volunteers ?? 0), hours: Math.round(Number(stats?.hours ?? 0)), states: Number(stats?.states ?? 0),
    stateHours: Object.fromEntries(perState.filter((r) => Number(r.hours) > 0).map((r) => [toId(r.state), Math.round(Number(r.hours))])),
    roll: roll.map((r) => r.display_name),
  };
}
