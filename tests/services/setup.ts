import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import fs from "node:fs";
import path from "node:path";
import { asUser, type Caller } from "../../src/lib/db/rls";
import * as schema from "../../src/lib/db/schema";
import { Harness } from "../db/harness";
import type { Db } from "../../src/lib/services/db";

/** A fresh in-memory database with the real migrations, wrapped in Drizzle, for testing the services as real callers. */
export async function freshServices() {
  const pg = new PGlite();
  await pg.exec(fs.readFileSync("tests/db/supabase-stub.sql", "utf8"));
  for (const f of fs.readdirSync("src/lib/db/migrations").filter((x) => x.endsWith(".sql")).sort()) await pg.exec(fs.readFileSync(path.join("src/lib/db/migrations", f), "utf8"));
  const orm = drizzle(pg, { schema });
  const h = new Harness(pg);
  const as = <T>(caller: Caller, fn: (tx: Db) => Promise<T>) => asUser(orm, caller, (tx) => fn(tx as unknown as Db));
  /** A bare signed-in person (what exists right after the email code): an auth user and nothing else. */
  const newPerson = async (label: string) => (await h.svc<{ id: string }>("insert into auth.users (email) values ($1) returning id", [`${label}@example.com`]))[0].id;
  return { pg, orm, h, as, newPerson, owner: orm as unknown as Db };
}
export const rejects = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as { code?: string; message: string }; } throw new Error("expected a rejection"); };
