import { beforeAll, describe, expect, it } from "vitest";
import { checkIn, checkOut, myAttendance, qrSecret, recordAttendanceHours, rosterForOpportunity, setPresent } from "../../src/lib/services/attendance";
import { approvedTotal, decideHours, editPendingHours, logRemoteHours, myHours, pendingHours, recentlyDecidedHours, remoteHoursSchema } from "../../src/lib/services/hours";
import { createOpportunity, opportunitySchema, signUp } from "../../src/lib/services/opportunities";
import { freshServices, rejects } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let prog: string, coord: string, lagosLead: string, kanoLead: string, viewer: string, vol: string, vol2: string, kanoVol: string, opp: string;
const a2 = (sub: string) => ({ sub, aal: "aal2" as const });
const me = (sub: string) => ({ sub, aal: "aal1" as const });
const day = (d: number) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
const plus = (h: number) => new Date(Date.now() + h * 36e5).toISOString();

beforeAll(async () => {
  t = await freshServices(); prog = await t.h.programme("AI4Rights");
  coord = await t.h.admin("coord", "volunteer_coordinator"); lagosLead = await t.h.admin("lead-l", "state_lead", { state: "Lagos" });
  kanoLead = await t.h.admin("lead-k", "state_lead", { state: "Kano" }); viewer = await t.h.admin("viewer", "viewer");
  vol = await t.h.activeVolunteer("hv1", { state: "Lagos" }); vol2 = await t.h.activeVolunteer("hv2", { state: "Lagos" }); kanoVol = await t.h.activeVolunteer("hv3", { state: "Kano" });
  opp = (await t.as(a2(coord), (tx) => createOpportunity(tx, opportunitySchema.parse({
    title: "Youth summit crew", programmeId: prog, mode: "physical", state: "Lagos", place: "Yaba", startsAt: plus(48), signupDeadline: plus(24), slots: 10, skills: [], commitment: "1 day" })))).id;
}, 60000);

describe("logging remote hours", () => {
  it("validates: half hours only, sensible dates", () => {
    expect(remoteHoursSchema.safeParse({ activity: "Wrote posts", workedOn: day(1), hours: 3 }).success).toBe(true);
    for (const bad of [{ hours: 0 }, { hours: 25 }, { hours: 2.3 }, { workedOn: "2999-01-01" }, { workedOn: day(400) }, { activity: "x" }])
      expect(remoteHoursSchema.safeParse({ activity: "Wrote posts", workedOn: day(1), hours: 3, ...bad }).success, JSON.stringify(bad)).toBe(false);
  });
  it("a volunteer's entry starts pending and counts for nothing until approved (rule 7)", async () => {
    const { id } = await t.as(me(vol), (tx) => logRemoteHours(tx, vol, { activity: "Wrote 4 posts for Talkam", workedOn: day(2), hours: 3 }));
    const mine = await t.as(me(vol), (tx) => myHours(tx, vol));
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ id, status: "pending", method: "Remote log", hours: 3, who: "hv1 Tester" });
    expect(await approvedTotal(t.owner, vol)).toBe(0);
  });
  it("nobody can log hours for someone else, or see someone else's", async () => {
    await rejects(t.as(me(vol), (tx) => logRemoteHours(tx, vol2, { activity: "Fake hours", workedOn: day(1), hours: 5 })));
    expect(await t.as(me(vol2), (tx) => myHours(tx, vol2))).toEqual([]);
  });
});

describe("approving hours", () => {
  it("a coordinator approves in a batch; the audit log records who, and totals now count", async () => {
    const { id: second } = await t.as(me(vol), (tx) => logRemoteHours(tx, vol, { activity: "Policy research", workedOn: day(3), hours: 2.5 }));
    const pending = await t.as(a2(coord), (tx) => pendingHours(tx));
    expect(pending.map((p) => p.who)).toEqual(["hv1 Tester", "hv1 Tester"]);
    const r = await t.as(a2(coord), (tx) => decideHours(tx, pending.map((p) => p.id), "approved"));
    expect(r.done).toHaveLength(2); expect(r.refused).toEqual([]);
    expect(await approvedTotal(t.owner, vol)).toBe(5.5);
    expect((await t.as(a2(coord), (tx) => recentlyDecidedHours(tx))).map((h) => h.id)).toContain(second);
    const audit = await t.h.svc<{ actor_id: string }>("select actor_id from audit_logs where action='hours.approved'");
    expect(audit.every((a) => a.actor_id === coord)).toBe(true);
  });
  it("only the right admins: out-of-scope, Viewer and no-two-factor are all refused", async () => {
    const { id } = await t.as(me(vol), (tx) => logRemoteHours(tx, vol, { activity: "Design work", workedOn: day(1), hours: 2 }));
    expect((await t.as(a2(kanoLead), (tx) => decideHours(tx, [id], "approved"))).refused).toHaveLength(1);
    expect((await t.as(a2(viewer), (tx) => decideHours(tx, [id], "approved"))).refused).toHaveLength(1);
    expect((await t.as({ sub: coord, aal: "aal1" }, (tx) => decideHours(tx, [id], "approved"))).refused).toHaveLength(1);
    expect(await t.as(a2(kanoLead), (tx) => pendingHours(tx))).toEqual([]);
    expect((await t.as(a2(lagosLead), (tx) => pendingHours(tx))).map((h) => h.id)).toEqual([id]);
  });
  it("a volunteer cannot approve their own hours; an admin cannot approve their own either", async () => {
    const { id } = await t.as(me(vol2), (tx) => logRemoteHours(tx, vol2, { activity: "Own hours", workedOn: day(1), hours: 4 }));
    expect((await t.as(me(vol2), (tx) => decideHours(tx, [id], "approved"))).refused).toHaveLength(1);
    expect((await t.h.svc<{ status: string }>("select status from hour_logs where id=$1", [id]))[0].status).toBe("pending");
  });
  it("edit corrects pending hours; reject keeps them out of the total", async () => {
    const { id } = await t.as(me(vol2), (tx) => logRemoteHours(tx, vol2, { activity: "Mis-typed hours", workedOn: day(1), hours: 8 }));
    await t.as(a2(coord), (tx) => editPendingHours(tx, id, 4));
    expect((await t.as(me(vol2), (tx) => myHours(tx, vol2))).find((h) => h.id === id)!.hours).toBe(4);
    expect((await rejects(t.as(a2(coord), (tx) => editPendingHours(tx, id, 99)))).code).toBe("invalid");
    await t.as(a2(coord), (tx) => decideHours(tx, [id], "rejected", "Not enough detail"));
    expect(await approvedTotal(t.owner, vol2)).toBe(0);
  });
});

describe("attendance and the QR code", () => {
  beforeAll(async () => { await t.as(me(vol), (tx) => signUp(tx, vol, opp)); await t.as(me(vol2), (tx) => signUp(tx, vol2, opp)); });

  it("the QR secret is readable only by an admin who may take attendance there", async () => {
    const secret = await t.as(a2(coord), (tx) => qrSecret(tx, opp));
    expect(secret).toMatch(/^[0-9a-f]{32}$/);
    expect(await t.as(a2(lagosLead), (tx) => qrSecret(tx, opp))).toBe(secret);
    expect(await t.as(a2(kanoLead), (tx) => qrSecret(tx, opp))).toBeNull();
    expect(await t.as(me(vol), (tx) => qrSecret(tx, opp))).toBeNull();
    expect(await t.as("anon", (tx) => qrSecret(tx, opp)).catch(() => null)).toBeNull();
  });

  it("the door list shows sign-ups, and the coordinator ticks people present; walk-ins appear too", async () => {
    let roster = await t.as(a2(coord), (tx) => rosterForOpportunity(tx, opp));
    expect(roster.map((r) => r.name).sort()).toEqual(["hv1 Tester", "hv2 Tester"]);
    await t.as(a2(coord), (tx) => setPresent(tx, opp, vol, true, coord));
    roster = await t.as(a2(coord), (tx) => rosterForOpportunity(tx, opp));
    expect(roster.find((r) => r.userId === vol)).toMatchObject({ present: true, method: "coordinator", signupStatus: "confirmed", walkIn: false });
    await t.as(a2(coord), (tx) => setPresent(tx, opp, vol, false, coord));
    expect((await t.as(a2(coord), (tx) => rosterForOpportunity(tx, opp))).find((r) => r.userId === vol)!.present).toBe(false);
    expect(await t.as(a2(kanoLead), (tx) => rosterForOpportunity(tx, opp))).toEqual([]); // out of scope
    expect(await t.as(me(vol), (tx) => rosterForOpportunity(tx, opp))).toEqual([]);
  });

  it("saving attendance adds one PENDING hours entry per person present, and never duplicates", async () => {
    await t.as(a2(coord), (tx) => setPresent(tx, opp, vol, true, coord));
    await t.as(a2(coord), (tx) => setPresent(tx, opp, vol2, true, coord));
    expect(await t.as(a2(coord), (tx) => recordAttendanceHours(tx, opp, 4))).toBe(2);
    expect(await t.as(a2(coord), (tx) => recordAttendanceHours(tx, opp, 4))).toBe(0);
    const h = (await t.as(me(vol), (tx) => myHours(tx, vol))).find((x) => x.activity === "Youth summit crew")!;
    expect(h).toMatchObject({ hours: 4, status: "pending", method: "Coordinator" });
    expect((await rejects(t.as(a2(coord), (tx) => recordAttendanceHours(tx, opp, 30)))).code).toBe("invalid");
  });
});

describe("QR check-in and check-out by the volunteer", () => {
  let live: string, secret: string;
  beforeAll(async () => {
    live = (await t.as(a2(coord), (tx) => createOpportunity(tx, opportunitySchema.parse({
      title: "Walk today", programmeId: prog, mode: "physical", state: "Lagos", place: "Ikeja", startsAt: plus(2), signupDeadline: plus(1), slots: 5, skills: [], commitment: "3 hrs" })))).id;
    secret = (await t.as(a2(coord), (tx) => qrSecret(tx, live)))!;
  });
  it("a wrong code is refused; the right code checks in (walk-ins allowed) and out, recording pending hours", async () => {
    expect((await rejects(t.as(me(vol2), (tx) => checkIn(tx, live, "wrong")))).code).toBe("invalid_qr");
    await t.as(me(vol2), (tx) => checkIn(tx, live, secret));
    expect((await t.as(me(vol2), (tx) => myAttendance(tx, vol2, live))).checkedInAt).not.toBeNull();
    await t.as(me(vol2), (tx) => checkIn(tx, live, secret)); // scanning twice is harmless
    await t.h.svc("update attendance set checked_in_at = now() - interval '3 hours' where user_id=$1 and opportunity_id=$2", [vol2, live]);
    const h = await t.as(me(vol2), (tx) => checkOut(tx, live, secret));
    expect(h).toBe(3);
    expect((await t.as(me(vol2), (tx) => myHours(tx, vol2))).find((x) => x.activity === "Walk today")).toMatchObject({ hours: 3, status: "pending", method: "QR" });
    expect((await rejects(t.as(me(vol2), (tx) => checkOut(tx, live, secret)))).code).toBe("already_checked_out");
  });
  it("outside the event window and not-yet-approved volunteers cannot check in", async () => {
    const far = (await t.as(a2(coord), (tx) => createOpportunity(tx, opportunitySchema.parse({
      title: "Far future", programmeId: prog, mode: "physical", state: "Lagos", place: "X", startsAt: plus(500), signupDeadline: plus(400), slots: 5, skills: [], commitment: "1 hr" })))).id;
    const farSecret = (await t.as(a2(coord), (tx) => qrSecret(tx, far)))!;
    expect((await rejects(t.as(me(vol), (tx) => checkIn(tx, far, farSecret)))).code).toBe("outside_event_window");
    const applicant = await t.h.user("not-active");
    expect((await rejects(t.as(me(applicant), (tx) => checkIn(tx, live, secret)))).code).toBe("only_active_volunteers");
    expect((await rejects(t.as(me(vol), (tx) => checkOut(tx, live, secret)))).code).toBe("not_checked_in");
  });
});
