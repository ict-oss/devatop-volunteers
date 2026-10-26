import { beforeAll, describe, expect, it } from "vitest";
import { addAdmin, adminInput, adminsRaw, changeAdmin, nameAdmins, removeAdmin, setVolunteerStatus, userIdByEmail } from "../../src/lib/services/users";
import { freshServices, rejects } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let s1: string, s2: string, coord: string, lagosLead: string, vLagos: string, vKano: string;
const a2 = (sub: string) => ({ sub, aal: "aal2" as const });
beforeAll(async () => {
  t = await freshServices();
  s1 = await t.h.admin("us-super1", "super_admin"); s2 = await t.h.admin("us-super2", "super_admin");
  coord = await t.h.admin("us-coord", "volunteer_coordinator"); lagosLead = await t.h.admin("us-lead", "state_lead", { state: "Lagos" });
  vLagos = await t.h.activeVolunteer("us-lagos", { state: "Lagos" }); vKano = await t.h.activeVolunteer("us-kano", { state: "Kano" });
}, 60000);

describe("suspending and reactivating volunteers", () => {
  it("a Super Admin changes status; the audit log records it; a suspended volunteer loses upcoming places", async () => {
    const prog = await t.h.programme("US-Prog");
    const opp = (await t.h.svc<{ id: string }>("insert into opportunities (title, programme_id, mode, state, place, starts_at, signup_deadline, slots) values ('Soon', $1, 'physical', 'Lagos', 'Yaba', now() + interval '5 days', now() + interval '4 days', 5) returning id", [prog]))[0].id;
    await t.h.svc("insert into signups (opportunity_id, user_id, status) values ($1, $2, 'confirmed')", [opp, vLagos]);
    await t.as(a2(s1), (tx) => setVolunteerStatus(tx, vLagos, "suspended"));
    expect((await t.h.svc<{ status: string }>("select status from volunteer_profiles where user_id=$1", [vLagos]))[0].status).toBe("suspended");
    expect((await t.h.svc<{ status: string }>("select status from signups where user_id=$1", [vLagos]))[0].status).toBe("cancelled");
    await t.as(a2(s2), (tx) => setVolunteerStatus(tx, vLagos, "active"));
    expect((await t.h.svc("select 1 from audit_logs where action = 'volunteer.status' and record_id = $1 and detail->>'to' in ('suspended')", [vLagos])).length).toBe(1);
  });
  it("roles without volunteers.suspend (coordinator, State Lead) are refused, and nobody can set 'applicant' here", async () => {
    await rejects(t.as(a2(lagosLead), (tx) => setVolunteerStatus(tx, vKano, "suspended")));
    await rejects(t.as(a2(coord), (tx) => setVolunteerStatus(tx, vKano, "suspended")));
    expect((await t.h.svc<{ status: string }>("select status from volunteer_profiles where user_id=$1", [vKano]))[0].status).toBe("active");
    await rejects(t.as(a2(s1), (tx) => setVolunteerStatus(tx, vKano, "applicant" as never)));
  });
});

describe("managing admins", () => {
  it("validates that a role has the scope it needs", () => {
    expect(adminInput.safeParse({ role: "state" }).success).toBe(false);
    expect(adminInput.safeParse({ role: "state", state: "Lagos" }).success).toBe(true);
    expect(adminInput.safeParse({ role: "department" }).success).toBe(false);
    expect(adminInput.safeParse({ role: "viewer" }).success).toBe(true);
  });

  it("a Super Admin adds, changes and removes admins; the list shows sign-in emails; the email lookup needs a signed-in account", async () => {
    const newbie = await t.h.user("us-newbie");
    expect(await userIdByEmail(t.owner, "US-NEWBIE@example.com")).toBe(newbie);
    expect(await userIdByEmail(t.owner, "nobody-here@example.com")).toBeNull();
    await t.as(a2(s1), (tx) => addAdmin(tx, s1, newbie, { role: "state", state: "Kano" }));
    let list = await nameAdmins(t.owner, await t.as(a2(s1), (tx) => adminsRaw(tx)));
    expect(list.find((x) => x.userId === newbie)).toMatchObject({ role: "state", scope: "Kano", roleLabel: "State or Chapter Lead", email: "us-newbie@example.com" });
    await t.as(a2(s1), (tx) => changeAdmin(tx, s1, newbie, { role: "viewer" }));
    list = await nameAdmins(t.owner, await t.as(a2(s1), (tx) => adminsRaw(tx)));
    expect(list.find((x) => x.userId === newbie)).toMatchObject({ role: "viewer", scope: "" });
    await t.as(a2(s1), (tx) => removeAdmin(tx, s1, newbie));
    expect((await t.h.svc("select 1 from admin_roles where user_id=$1", [newbie])).length).toBe(0);
  });

  it("only a Super Admin with two-factor can manage admins", async () => {
    const x = await t.h.user("us-x");
    await rejects(t.as(a2(coord), (tx) => addAdmin(tx, coord, x, { role: "viewer" })));
    await rejects(t.as({ sub: s1, aal: "aal1" }, (tx) => addAdmin(tx, s1, x, { role: "viewer" })));
    expect((await t.as(a2(coord), (tx) => adminsRaw(tx))).length).toBe(1); // a coordinator sees only their own row
  });

  it("protects against lock-out: nobody edits their own role, and there are always two Super Admins", async () => {
    expect((await rejects(t.as(a2(s1), (tx) => removeAdmin(tx, s1, s1)))).message).toMatch(/own admin role/);
    expect((await rejects(t.as(a2(s1), (tx) => changeAdmin(tx, s1, s2, { role: "viewer" })))).message).toMatch(/at least two Super Admins/);
    expect((await rejects(t.as(a2(s1), (tx) => removeAdmin(tx, s1, s2)))).message).toMatch(/at least two Super Admins/);
  });
});
