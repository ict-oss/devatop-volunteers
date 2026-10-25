import { beforeAll, describe, expect, it } from "vitest";
import { logExport, personalExport, reportRows } from "../../src/lib/services/reports";
import { freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let sup: string, coord: string, lagosLead: string, viewer: string, v1: string, v2: string, prog: string, opp: string;
const a2 = (sub: string) => ({ sub, aal: "aal2" as const });
beforeAll(async () => {
  t = await freshServices(); prog = await t.h.programme("AI4Rights");
  sup = await t.h.admin("super", "super_admin"); await t.h.admin("super2", "super_admin"); coord = await t.h.admin("coord", "volunteer_coordinator");
  lagosLead = await t.h.admin("lead", "state_lead", { state: "Lagos" }); viewer = await t.h.admin("viewer", "viewer");
  v1 = await t.h.activeVolunteer("rp1", { state: "Lagos" }); v2 = await t.h.activeVolunteer("rp2", { state: "Kano" });
  opp = await t.h.opportunity(prog, { title: "School sessions", state: "Lagos" });
  const ins = (u: string, a: string, h: number, st: "approved" | "pending", o: string | null) => st === "approved"
    ? t.h.svc("insert into hour_logs (user_id, opportunity_id, programme_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,$2,$3,$4,'2026-10-01',$5,'coordinator','approved',$6,now())", [u, o, prog, a, h, coord])
    : t.h.svc("insert into hour_logs (user_id, opportunity_id, programme_id, activity, worked_on, hours, method) values ($1,$2,$3,$4,'2026-10-01',$5,'remote_log')", [u, o, prog, a, h]);
  await ins(v1, "School sessions", 4, "approved", opp); await ins(v1, "Remote research", 3, "pending", null); await ins(v2, "Kano walk", 6, "approved", null);
  await t.h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,'Rejected thing','2026-10-01',9,'remote_log','rejected',$2,now())", [v1, coord]);
}, 60000);

describe("report rows", () => {
  it("lists approved and pending hours (never rejected), tagged by programme and state", async () => {
    const rows = await t.as(a2(coord), (tx) => reportRows(tx));
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.activity === "School sessions")).toMatchObject({ programme: "AI4Rights", state: "Lagos", status: "approved", hours: 4 });
    expect(rows.find((r) => r.activity === "Remote research")!.status).toBe("pending");
    expect(rows.some((r) => r.activity === "Rejected thing")).toBe(false);
  });
  it("is limited to the admin's own state, and works for a Viewer (reports.see) but not without two-factor", async () => {
    const lead = await t.as(a2(lagosLead), (tx) => reportRows(tx));
    expect(lead.map((r) => r.activity).sort()).toEqual(["Remote research", "School sessions"]);
    expect((await t.as(a2(viewer), (tx) => reportRows(tx))).length).toBe(3);
    expect(await t.as({ sub: coord, aal: "aal1" }, (tx) => reportRows(tx))).toEqual([]);
  });
});

describe("personal-data export", () => {
  it("only a Super Admin gets contact details; everyone else gets nothing", async () => {
    const rows = await t.as(a2(sup), (tx) => personalExport(tx));
    expect(rows.find((r) => r.name === "rp1 Tester")).toMatchObject({ email: "rp1@example.com", phone: "08030000000", approvedHours: 4 });
    for (const who of [coord, lagosLead, viewer]) expect(await t.as(a2(who), (tx) => personalExport(tx))).toEqual([]);
  });
  it("every export is written to the audit log with counts only", async () => {
    await logExport(t.owner, sup, "export.personal", { volunteers: 2, format: "xlsx" });
    const row = (await t.h.svc<{ actor_id: string; detail: Record<string, unknown> }>("select actor_id, detail from audit_logs where action='export.personal'"))[0];
    expect(row.actor_id).toBe(sup);
    expect(JSON.stringify(row.detail)).not.toContain("@");
  });
});
