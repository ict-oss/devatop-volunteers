import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS = "src/lib/db/migrations";

/** A fresh in-memory Postgres with the REAL migrations applied (the same SQL that runs on Supabase). */
export async function freshDb() {
  const db = new PGlite();
  await db.exec(fs.readFileSync("tests/db/supabase-stub.sql", "utf8"));
  for (const f of fs.readdirSync(MIGRATIONS).filter((x) => x.endsWith(".sql")).sort()) {
    try { await db.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8")); }
    catch (e) { throw new Error(`migration ${f} failed: ${(e as Error).message}`); }
  }
  return new Harness(db);
}

export type Who = { sub?: string; aal2?: boolean } | "service" | "anon";

export class Harness {
  constructor(readonly db: PGlite) {}

  /** Run SQL as a given caller. "service" = service role / migrations (bypasses RLS). */
  async q<T = Record<string, unknown>>(who: Who, sql: string, params: unknown[] = []): Promise<T[]> {
    const db = this.db;
    try {
      if (who === "service") await db.exec("reset role");
      else if (who === "anon") await db.exec("reset role; set role anon; select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claims','',false)");
      else {
        const claims = JSON.stringify({ sub: who.sub, role: "authenticated", aal: who.aal2 ? "aal2" : "aal1" });
        await db.exec("reset role; set role authenticated");
        await db.query("select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claims',$2,false)", [who.sub, claims]);
      }
      return (await db.query<T>(sql, params)).rows;
    } finally {
      await db.exec("reset role");
    }
  }
  svc<T = Record<string, unknown>>(sql: string, params: unknown[] = []) { return this.q<T>("service", sql, params); }

  /* ---------- fixtures (all as service role) ---------- */
  async user(label: string, opts: { first?: string; last?: string; state?: string; dob?: string; status?: string } = {}) {
    const id = (await this.svc<{ id: string }>("insert into auth.users (email) values ($1) returning id", [`${label}@example.com`]))[0].id;
    await this.svc("insert into volunteer_profiles (user_id, first_name, last_name, state, lga, status) values ($1,$2,$3,$4,'Ikeja',$5)", [id, opts.first ?? label, opts.last ?? "Tester", opts.state ?? "Lagos", opts.status ?? "applicant"]);
    await this.svc("insert into volunteer_contacts (user_id, email, phone) values ($1,$2,'08030000000')", [id, `${label}@example.com`]);
    await this.svc("insert into volunteer_private (user_id, date_of_birth) values ($1,$2)", [id, opts.dob ?? "1999-01-01"]);
    return id;
  }
  async consentAll(uid: string) {
    for (const k of ["code_of_conduct", "safeguarding", "privacy"]) await this.svc("insert into consents (user_id, kind, action, text_version, text_snapshot) values ($1,$2,'given','v1','I agree')", [uid, k]);
  }
  async admin(label: string, role: string, scope: { state?: string; programme?: string; department?: string } = {}) {
    const id = (await this.svc<{ id: string }>("insert into auth.users (email) values ($1) returning id", [`${label}@devatop.org`]))[0].id;
    await this.svc("insert into admin_roles (user_id, role, state, programme_id, department_id) values ($1,$2,$3,$4,$5)", [id, role, scope.state ?? null, scope.programme ?? null, scope.department ?? null]);
    return id;
  }
  async programme(name: string) { return (await this.svc<{ id: string }>("insert into programmes (name) values ($1) returning id", [name]))[0].id; }
  async department(name: string) { return (await this.svc<{ id: string }>("insert into departments (name) values ($1) returning id", [name]))[0].id; }
  async opportunity(programmeId: string, o: { title?: string; state?: string | null; mode?: string; slots?: number; startsInHours?: number; deadlineInHours?: number; department?: string | null } = {}) {
    const start = o.startsInHours ?? 48, dl = o.deadlineInHours ?? Math.min(24, start / 2);
    return (await this.svc<{ id: string }>(
      `insert into opportunities (title, programme_id, department_id, mode, state, place, starts_at, signup_deadline, slots)
       values ($1,$2,$3,$4,$5,'Somewhere', now() + ($6 || ' hours')::interval, now() + ($7 || ' hours')::interval, $8) returning id`,
      [o.title ?? "Event", programmeId, o.department ?? null, o.mode ?? "physical", o.state === undefined ? "Lagos" : o.state, String(start), String(dl), o.slots ?? 5]))[0].id;
  }
  /** An active, consented, approved volunteer. */
  async activeVolunteer(label: string, opts: { state?: string; dob?: string; first?: string; last?: string } = {}) {
    const id = await this.user(label, { ...opts, status: "applicant" });
    await this.consentAll(id);
    await this.svc("update volunteer_profiles set status='active' where user_id=$1", [id]);
    return id;
  }
}

export const A2 = (sub: string) => ({ sub, aal2: true });  // admin who completed two-factor
export const U = (sub: string) => ({ sub });               // volunteer / aal1
