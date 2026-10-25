import { describe, expect, it } from "vitest";
import { ADMIN_IDLE_MS, adminGate, decideProxy, landingFor, safeNext, type AuthState } from "../../src/lib/auth/routing";
import { ALL_ACTIONS, MATRIX, ROLE_LABEL, type Admin, type Role } from "../../src/lib/permissions";

const NOW = 1_800_000_000_000;
const at = (path: string, o: Partial<{ signedIn: boolean; aal2: boolean; lastActive: number }> = {}) =>
  decideProxy({ path, signedIn: true, aal2: false, lastActive: 0, now: NOW, ...o });

describe("safeNext: a login link can only lead somewhere on this site", () => {
  it("accepts ordinary paths", () => {
    expect(safeNext("/admin/hours")).toBe("/admin/hours");
    expect(safeNext("/checkin/abc?x=1")).toBe("/checkin/abc?x=1");
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "admin", "", null, undefined, "/ok\nSet-Cookie:x", "/login?next=/login", "/auth/continue"])(
    "rejects %j", (bad) => expect(safeNext(bad as string | null)).toBeNull());
});

describe("proxy: signed-out visitors", () => {
  it("are sent to login from /admin and from every volunteer page, remembering where they were going", () => {
    expect(at("/admin", { signedIn: false })).toEqual({ kind: "redirect", to: "/login", next: "/admin" });
    expect(at("/admin/hours", { signedIn: false })).toEqual({ kind: "redirect", to: "/login", next: "/admin/hours" });
    for (const p of ["/dashboard", "/my-opportunities", "/hours", "/certificates", "/chat", "/guides", "/profile", "/checkin/x1"]) {
      expect(at(p, { signedIn: false })).toEqual({ kind: "redirect", to: "/login", next: p });
    }
  });
  it("can still open the public site, login, apply and verify pages", () => {
    for (const p of ["/", "/about", "/opportunities", "/apply", "/login", "/verify/DVT-AAAA-BBBB", "/guardian-consent/tok", "/privacy", "/faqs", "/contact"]) {
      expect(at(p, { signedIn: false })).toEqual({ kind: "next", touch: false });
    }
  });
  it("do not get a look-alike path through: /administrator is not /admin and /hours-extra is not /hours", () => {
    expect(at("/administrator", { signedIn: false }).kind).toBe("next");
    expect(at("/hoursx", { signedIn: false }).kind).toBe("next");
  });
});

describe("proxy: admins and two-factor", () => {
  it("an admin without two-factor is held at the two-factor page", () => {
    expect(at("/admin")).toEqual({ kind: "redirect", to: "/admin/two-factor" });
    expect(at("/admin/volunteers")).toEqual({ kind: "redirect", to: "/admin/two-factor" });
  });
  it("but can always reach the two-factor and not-allowed pages (no redirect loop)", () => {
    expect(at("/admin/two-factor")).toEqual({ kind: "next", touch: true });
    expect(at("/admin/not-allowed")).toEqual({ kind: "next", touch: true });
  });
  it("an admin who completed two-factor passes", () => {
    expect(at("/admin/volunteers", { aal2: true })).toEqual({ kind: "next", touch: true });
  });
});

describe("proxy: the 30-minute idle limit", () => {
  it("is exactly 30 minutes", () => expect(ADMIN_IDLE_MS).toBe(30 * 60 * 1000));
  it("signs the admin out and says why once idle for more than 30 minutes", () => {
    expect(at("/admin", { aal2: true, lastActive: NOW - ADMIN_IDLE_MS - 1 })).toEqual({ kind: "redirect", to: "/login", next: "/admin", reason: "idle", signOut: true });
  });
  it("keeps the session at 30 minutes or less", () => {
    expect(at("/admin", { aal2: true, lastActive: NOW - ADMIN_IDLE_MS }).kind).toBe("next");
    expect(at("/admin", { aal2: true, lastActive: NOW - 60_000 }).kind).toBe("next");
  });
  it("idle is checked before two-factor, so a stale admin session cannot continue", () => {
    expect(at("/admin/two-factor", { lastActive: NOW - ADMIN_IDLE_MS - 1 })).toMatchObject({ reason: "idle", signOut: true });
  });
  it("a stale clock from an old visit does not end a new sign-in: activity elsewhere on the site refreshes it", () => {
    expect(at("/auth/continue", { lastActive: NOW - 10 * ADMIN_IDLE_MS })).toEqual({ kind: "next", touch: true });
    expect(at("/dashboard", { lastActive: NOW - 10 * ADMIN_IDLE_MS })).toEqual({ kind: "next", touch: true });
  });
});

describe("landingFor: where each person goes after entering their code", () => {
  it("volunteers go to their dashboard, or back to the volunteer page they wanted", () => {
    expect(landingFor({ isAdmin: false, aal2: false })).toBe("/dashboard");
    expect(landingFor({ isAdmin: false, aal2: false, next: "/hours" })).toBe("/hours");
  });
  it("a volunteer is never sent to /admin by a 'next' link", () => expect(landingFor({ isAdmin: false, aal2: false, next: "/admin/hours" })).toBe("/dashboard"));
  it("admins finish two-factor first, whatever they asked for", () => {
    expect(landingFor({ isAdmin: true, aal2: false })).toBe("/admin/two-factor");
    expect(landingFor({ isAdmin: true, aal2: false, next: "/admin/hours" })).toBe("/admin/two-factor");
  });
  it("an admin with two-factor goes to /admin or the admin page they wanted", () => {
    expect(landingFor({ isAdmin: true, aal2: true })).toBe("/admin");
    expect(landingFor({ isAdmin: true, aal2: true, next: "/admin/hours" })).toBe("/admin/hours");
    expect(landingFor({ isAdmin: true, aal2: true, next: "/dashboard" })).toBe("/admin");
  });
  it("ignores an unsafe 'next'", () => {
    expect(landingFor({ isAdmin: false, aal2: false, next: "https://evil.example" })).toBe("/dashboard");
    expect(landingFor({ isAdmin: true, aal2: true, next: "//evil.example" })).toBe("/admin");
  });
});

const admin = (role: Role): Admin => ({ name: "Admin", role });
describe("adminGate: the server-side door", () => {
  const ok = (role: Role): AuthState => ({ signedIn: true, admin: admin(role), aal2: true });
  it("signed out -> login", () => expect(adminGate({ signedIn: false, admin: null, aal2: false }, "overview")).toBe("/login?next=/admin"));
  it("a signed-in volunteer who opens /admin gets the not-allowed page, not the login page", () =>
    expect(adminGate({ signedIn: true, admin: null, aal2: false }, "overview")).toBe("/admin/not-allowed"));
  it("a volunteer at aal2 is still not an admin", () => expect(adminGate({ signedIn: true, admin: null, aal2: true }, "volunteers.list")).toBe("/admin/not-allowed"));
  it("an admin without two-factor -> two-factor page, for every action", () => {
    for (const a of ALL_ACTIONS) expect(adminGate({ signedIn: true, admin: admin("super"), aal2: false }, a)).toBe("/admin/two-factor");
  });
  it("two-factor is checked before the role, so a lower role can't probe which actions exist", () =>
    expect(adminGate({ signedIn: true, admin: admin("viewer"), aal2: false }, "admins.manage")).toBe("/admin/two-factor"));
  it.each(Object.keys(ROLE_LABEL) as Role[])("%s: allowed exactly the actions in the permissions matrix, denied the rest", (role) => {
    for (const a of ALL_ACTIONS) expect(adminGate(ok(role), a), `${role} / ${a}`).toBe(MATRIX[role].includes(a) ? null : "/admin/not-allowed");
  });
  it("matrix sanity: Viewer is read-only, Super Admin can do everything", () => {
    expect(MATRIX.viewer).toEqual(["overview", "volunteers.list", "reports.see"]);
    expect(MATRIX.super).toHaveLength(ALL_ACTIONS.length);
  });
});
