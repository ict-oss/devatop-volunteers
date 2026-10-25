import { beforeAll, describe, expect, it } from "vitest";
import { A2, freshDb, U, type Harness } from "./harness";

// What src/lib/auth/session.ts relies on when it works out who is signed in.
let h: Harness;
beforeAll(async () => { h = await freshDb(); }, 60000);

describe("sign-in and roles", () => {
  it("the first sign-in creates the person's account as a plain volunteer (admins are made on purpose, never by signing in)", async () => {
    const id = (await h.svc<{ id: string }>("insert into auth.users (email) values ('first-login@example.com') returning id"))[0].id;
    const rows = await h.svc<{ role: string }>("select role from users where id=$1", [id]);
    expect(rows).toEqual([{ role: "volunteer" }]);
    expect(await h.svc("select 1 from admin_roles where user_id=$1", [id])).toHaveLength(0);
  });

  it("an admin can read their OWN role before two-factor, so the app can send them to the two-factor page instead of the login page", async () => {
    const a = await h.admin("mfa-pending", "state_lead", { state: "Lagos" });
    const rows = await h.q<{ role: string; state: string }>(U(a), "select role, state from admin_roles where user_id=$1", [a]);
    expect(rows).toEqual([{ role: "state_lead", state: "Lagos" }]);
  });

  it("a volunteer has no admin role to read, so the app shows 'not allowed'", async () => {
    const v = await h.user("plain-volunteer");
    expect(await h.q(U(v), "select * from admin_roles where user_id=$1", [v])).toHaveLength(0);
    expect(await h.q(A2(v), "select * from admin_roles where user_id=$1", [v])).toHaveLength(0);
    expect((await h.q<{ ok: boolean }>(A2(v), "select is_admin() as ok"))[0].ok).toBe(false);
  });

  it("nobody can read another person's admin role unless they are a Super Admin with two-factor", async () => {
    const lead = await h.admin("lead-x", "state_lead", { state: "Kano" });
    const coord = await h.admin("coord-x", "volunteer_coordinator");
    const v = await h.user("curious");
    expect(await h.q(U(v), "select * from admin_roles")).toHaveLength(0);
    expect(await h.q(A2(coord), "select user_id from admin_roles where user_id=$1", [lead])).toHaveLength(0);
    expect((await h.q(U(lead), "select user_id from admin_roles")).map((r) => (r as { user_id: string }).user_id)).toEqual([lead]);
  });

  it("a volunteer cannot make themselves an admin", async () => {
    const v = await h.user("wannabe");
    await expect(h.q(U(v), "insert into admin_roles (user_id, role) values ($1,'super_admin')", [v])).rejects.toThrow();
    await expect(h.q(A2(v), "insert into admin_roles (user_id, role) values ($1,'super_admin')", [v])).rejects.toThrow();
    expect(await h.svc("select 1 from admin_roles where user_id=$1", [v])).toHaveLength(0);
  });
});
