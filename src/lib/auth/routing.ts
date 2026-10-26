/**
 * The routing rules for sign-in, kept as plain functions (no Next.js, no Supabase) so every rule can be tested.
 * proxy.ts, session.ts and the pages call these; none of them re-invent a rule.
 */
import { can, type Action, type Admin } from "../permissions";

export const ADMIN_IDLE_MS = 30 * 60 * 1000; // requirements section 17: admin sessions end after 30 minutes idle
export const VOLUNTEER_PREFIXES = ["/dashboard", "/my-opportunities", "/hours", "/certificates", "/chat", "/guides", "/profile", "/checkin"];
/** Admin pages a signed-in person must be able to reach without two-factor (otherwise they could never finish it). */
export const ADMIN_OPEN_PATHS = ["/admin/two-factor", "/admin/not-allowed"];

const under = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

/** Only same-site paths are accepted as a "go back to" target, so a login link can't send someone to another website. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return null;
  if (next.startsWith("/login") || next.startsWith("/signup") || next.startsWith("/auth/")) return null;
  return next;
}

/** Where a person lands right after entering their code. Admins finish two-factor first; volunteers go to their dashboard. */
export function landingFor(p: { isAdmin: boolean; aal2: boolean; next?: string | null }): string {
  const next = safeNext(p.next);
  if (p.isAdmin) return p.aal2 ? (next && under(next, "/admin") ? next : "/admin") : "/admin/two-factor";
  return next && !under(next, "/admin") ? next : "/dashboard";
}

export type ProxyInput = { path: string; signedIn: boolean; aal2: boolean; lastActive: number; now: number };
export type ProxyDecision =
  | { kind: "next"; touch: boolean }
  | { kind: "redirect"; to: string; next?: string; reason?: "idle"; signOut?: boolean };

/**
 * First line of defence only (rule 1): real checks run again on the server and in the database.
 * `touch` means "record this moment as the person's last activity".
 */
export function decideProxy({ path, signedIn, aal2, lastActive, now }: ProxyInput): ProxyDecision {
  if (under(path, "/admin")) {
    if (!signedIn) return { kind: "redirect", to: "/login", next: path };
    if (lastActive && now - lastActive > ADMIN_IDLE_MS) return { kind: "redirect", to: "/login", next: path, reason: "idle", signOut: true };
    if (!aal2 && !ADMIN_OPEN_PATHS.some((p) => under(path, p))) return { kind: "redirect", to: "/admin/two-factor" };
    return { kind: "next", touch: true };
  }
  if (VOLUNTEER_PREFIXES.some((p) => under(path, p)) && !signedIn) return { kind: "redirect", to: "/login", next: path };
  // activity anywhere on the site keeps the clock fresh, so a stale clock from an earlier visit never ends a brand-new sign-in
  return { kind: "next", touch: signedIn };
}

export type AuthState = { signedIn: boolean; admin: Admin | null; aal2: boolean };

/** The server-side gate for an admin page or action. Returns the path to send the person to, or null if they may proceed. */
export function adminGate(s: AuthState, action: Action): string | null {
  if (!s.signedIn) return "/login?next=/admin";
  if (!s.admin) return "/admin/not-allowed"; // signed in, but not an admin (e.g. a volunteer)
  if (!s.aal2) return "/admin/two-factor";
  if (!can(s.admin, action)) return "/admin/not-allowed";
  return null;
}
