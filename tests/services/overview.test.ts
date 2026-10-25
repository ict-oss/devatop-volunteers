import { beforeAll, describe, expect, it } from "vitest";
import { auditRaw, nameAuditRows, overview, volunteerDirectory } from "../../src/lib/services/overview";
import { freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let coord: string, sup: string, lagosLead: string, viewer: string, v1: string, v2: string, v3: string, prog: string;
const a2 = (sub: string) => ({ sub, aal: "aal2" as const });
beforeAll(async () => {
  t = await freshServices(); prog = await t.h.programme("AI4Rights");
  coord = await t.h.admin("coord", "volunteer_coordinator"); sup = await t.h.admin("super", "super_admin"); await t.h.admin("super2", "super_admin");
  lagosLead = await t.h.admin("lead", "state_lead", { state: "Lagos" }); viewer = await t.h.admin("viewer", "viewer");
  v1 = await t.h.activeVolunteer("ov1", { state: "Lagos" }); v2 = await t.h.activeVolunteer("ov2", { state: "Kano" }); v3 = await t.h.user("ov3", { state: "Lagos" });
  await t.h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,'A','2026-10-01',5,'coordinator','approved',$2,now())", [v1, coord]);
  await t.h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'B','2026-10-02',2,'remote_log')", [v1]);
  await t.h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'C','2026-10-02',3,'remote_log')", [v2]);
  await t.h.svc("insert into applications (user_id) values ($1)", [v1]).catch(() => null);
  await t.h.svc("insert into opportunities (title, programme_id, mode, state, place, starts_at, signup_deadline, slots) values ('This week', $1, 'physical', 'Lagos', 'Yaba', now() + interval '3 days', now() + interval '1 day', 10)", [prog]);
  await t.h.svc("insert into opportunities (title, programme_id, mode, state, place, starts_at, signup_deadline, slots) values ('Kano later', $1, 'physical', 'Kano', 'Fagge', now() + interval '20 days', now() + interval '10 days', 10)", [prog]);
}, 60000);

describe("overview numbers match the database, inside each admin's scope", () => {
  it("a coordinator sees everything", async () => {
    const o = await t.as(a2(coord), (tx) => overview(tx));
    expect(o).toMatchObject({ pendingHours: 2, totalHours: 5, totalVolunteers: 2, activeVolunteers: 2, upcomingEvents: 2, eventsThisWeek: 1 });
    expect(o.thisWeek.map((e) => e.title)).toEqual(["This week"]);
  });
  it("a State Lead sees only their state's numbers", async () => {
    const o = await t.as(a2(lagosLead), (tx) => overview(tx));
    expect(o).toMatchObject({ pendingHours: 1, totalVolunteers: 1, upcomingEvents: 1 });
  });
  it("a Viewer sees volunteer and hours totals but no work queues", async () => {
    const o = await t.as(a2(viewer), (tx) => overview(tx));
    expect(o).toMatchObject({ pendingHours: 0, pendingApplications: 0, totalVolunteers: 2, totalHours: 5 });
  });
});

describe("volunteer directory", () => {
  it("coordinator: contacts visible; state lead: own state only; viewer: names only", async () => {
    const all = await t.as(a2(coord), (tx) => volunteerDirectory(tx));
    expect(all.find((v) => v.userId === v1)).toMatchObject({ email: "ov1@example.com", approvedHours: 5, state: "Lagos" });
    const lead = await t.as(a2(lagosLead), (tx) => volunteerDirectory(tx));
    expect(lead.every((v) => v.state === "Lagos")).toBe(true);
    const view = await t.as(a2(viewer), (tx) => volunteerDirectory(tx));
    expect(view.length).toBeGreaterThanOrEqual(2);
    expect(view.every((v) => v.email === null && v.phone === null)).toBe(true);
  });
});

describe("audit log", () => {
  it("shows who did what, by sign-in email and record id only", async () => {
    await t.h.svc("insert into audit_logs (actor_id, action, table_name, record_id, detail) values ($1,'hours.approved','hour_logs','abcdef12-0000-0000-0000-000000000000','{}')", [coord]);
    const rows = await nameAuditRows(t.owner, await t.as(a2(sup), (tx) => auditRaw(tx)));
    const r = rows.find((x) => x.action === "hours.approved")!;
    expect(r).toMatchObject({ who: "coord@devatop.org", record: "hour_logs · abcdef12" });
  });
  it("is hidden from roles without audit.see", async () => {
    expect(await t.as(a2(coord), (tx) => auditRaw(tx))).toEqual([]);
  });
});
