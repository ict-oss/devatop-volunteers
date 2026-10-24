import "server-only";
import { redirect } from "next/navigation";
import { can, ROLE_FROM_DB, type Action, type Admin } from "../permissions";
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

export async function currentAdmin(): Promise<AdminSession | null> {
  const user = await currentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: row } = await supabase.from("admin_roles").select("role, state, programme_id, department_id").eq("user_id", user.id).maybeSingle();
  if (!row) return null;
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const role = ROLE_FROM_DB[row.role as string];
  if (!role) return null;
  return {
    userId: user.id, aal2: aal?.currentLevel === "aal2",
    admin: { name: user.email ?? "Admin", role, scope: row.state ?? row.department_id ?? row.programme_id ?? undefined },
  };
}

export async function requireVolunteer() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Signed in, admin, two-factor completed, and allowed to do `action`. Otherwise redirect: login, set up 2FA, or "not allowed". */
export async function requireAdmin(action: Action): Promise<AdminSession> {
  const s = await currentAdmin();
  if (!s) redirect("/login?next=/admin");
  if (!s.aal2) redirect("/admin/two-factor");
  if (!can(s.admin, action)) redirect("/admin/not-allowed");
  return s;
}
