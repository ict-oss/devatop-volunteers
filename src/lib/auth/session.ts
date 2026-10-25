import "server-only";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { asUser } from "../db/rls";
import { rowsOf } from "../services/db";
import { ROLE_FROM_DB, type Action, type Admin } from "../permissions";
import { adminGate, type AuthState } from "./routing";
import { createClient } from "./supabase-server";

/**
 * Server-side guards. Hiding a button is not a permission check (rule 1): every admin page and server action calls
 * requireAdmin(action) first, and the database enforces the same rules again through row-level security.
 * `getUser()` asks Supabase to validate the token; never trust a cookie's contents by themselves.
 */
export async function currentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export type AdminSession = { userId: string; admin: Admin; aal2: boolean };

/** Who is this? Signed in or not, an admin or not, and whether they have completed two-factor. */
export async function authState(): Promise<AuthState & { userId: string | null }> {
  const user = await currentUser();
  if (!user) return { signedIn: false, admin: null, aal2: false, userId: null };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const aal2 = claims?.claims?.aal === "aal2";
  // Read as this person (not the owner): a person can always read their OWN admin_roles row, even before two-factor (policy ar_select)
  const row = rowsOf<{ role: string; state: string | null; programme_id: string | null; department_id: string | null }>(
    await asUser(db(), { sub: user.id, aal: aal2 ? "aal2" : "aal1" }, (tx) => tx.execute(sql`select role, state, programme_id, department_id from admin_roles where user_id = ${user.id}::uuid`)))[0];
  const role = row ? ROLE_FROM_DB[row.role] : undefined;
  if (!row || !role) return { signedIn: true, admin: null, aal2: false, userId: user.id };
  return {
    signedIn: true, userId: user.id, aal2,
    admin: { name: "Admin", role, scope: row.state ?? row.department_id ?? row.programme_id ?? undefined }, // no email or name: rule 5
  };
}

export async function requireVolunteer() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Signed in, admin, two-factor completed, and allowed to do `action`. Otherwise redirect:
 * login, set up two-factor, or the "not allowed" page (a volunteer who opens /admin lands there).
 */
export async function requireAdmin(action: Action): Promise<AdminSession> {
  const s = await authState();
  const to = adminGate(s, action);
  if (to) redirect(to);
  return { userId: s.userId!, admin: s.admin!, aal2: true };
}
