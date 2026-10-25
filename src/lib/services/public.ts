import { and, asc, eq, inArray } from "drizzle-orm";
import { appSettings, departments, programmes } from "../db/schema";
import type { Db } from "./db";

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
