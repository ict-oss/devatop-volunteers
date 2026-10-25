import "server-only";
import { db } from "../db";
import { asUser } from "../db/rls";
import type { Db } from "../services/db";
import { createClient } from "../auth/supabase-server";
import { authState } from "../auth/session";
import { adminGate } from "../auth/routing";
import type { Action, Admin } from "../permissions";

export type Caller = { sub: string; aal: "aal1" | "aal2"; email: string | null };

/** Who is making this request? Reads the signed session (the signature is verified), never a client-supplied id. */
export async function getCaller(): Promise<Caller | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  return { sub: c.sub, aal: c.aal === "aal2" ? "aal2" : "aal1", email: typeof c.email === "string" ? c.email : null };
}

/** Run database work AS this person: row-level security and the database rules apply (rules 2 and 3). */
export const asCaller = <T>(c: Caller, fn: (tx: Db) => Promise<T>) => asUser(db(), { sub: c.sub, aal: c.aal }, (tx) => fn(tx as unknown as Db));
/** Run as an anonymous visitor (public pages, the guardian's link). */
export const asVisitor = <T>(fn: (tx: Db) => Promise<T>) => asUser(db(), "anon", (tx) => fn(tx as unknown as Db));
/** The trusted server connection. Bypasses row-level security: only for emails, cron jobs and logs, never for a person's own data. */
export const trusted = () => db() as unknown as Db;

/** For admin server actions: signed in, an admin, two-factor done, and allowed to do `action` (rule 1). Null otherwise. */
export async function adminCaller(action: Action): Promise<{ caller: Caller; admin: Admin } | null> {
  const s = await authState();
  if (adminGate(s, action) || !s.userId || !s.admin) return null;
  return { caller: { sub: s.userId, aal: "aal2", email: null }, admin: s.admin };
}
