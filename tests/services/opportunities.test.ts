import { beforeAll, describe, expect, it } from "vitest";
import { adminOpportunities, cancelSignup, createOpportunity, mySignups, opportunitySchema, setOpportunityPublished, signUp, upcomingOpportunities } from "../../src/lib/services/opportunities";
import { freshServices, rejects } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let prog: string, dept: string, coord: string, lagosLead: string, kanoLead: string, viewer: string;
const a2 = (sub: string) => ({ sub, aal: "aal2" as const });
const plus = (h: number) => new Date(Date.now() + h * 36e5).toISOString();
const input = (o: Record<string, unknown> = {}) => opportunitySchema.parse({
  title: "AI4Rights school sessions", description: "Run a session", programmeId: prog, departmentId: null, mode: "physical", state: "Lagos", place: "Yaba",
  startsAt: plus(72), endsAt: plus(76), signupDeadline: plus(48), slots: 2, skills: ["Teaching", "Public speaking"], commitment: "4 hrs", published: true, ...o,
});
beforeAll(async () => {
  t = await freshServices(); prog = await t.h.programme("AI4Rights"); dept = await t.h.department("Comms");
  coord = await t.h.admin("coord", "volunteer_coordinator"); lagosLead = await t.h.admin("lead-l", "state_lead", { state: "Lagos" });
  kanoLead = await t.h.admin("lead-k", "state_lead", { state: "Kano" }); viewer = await t.h.admin("viewer", "viewer");
}, 60000);

describe("opportunity form rules", () => {
  it("accepts a good call", () => expect(input().slots).toBe(2));
  it.each([
    ["a physical call with no state", { state: null }], ["sign-ups closing after the start", { signupDeadline: plus(100) }],
    ["zero slots", { slots: 0 }], ["end before start", { endsAt: plus(10) }], ["short title", { title: "Hi" }],
  ])("rejects %s", (_n, over) => expect(() => input(over)).toThrow());
  it("a remote call needs no state", () => expect(input({ mode: "remote", state: null }).mode).toBe("remote"));
});

describe("admin: create, scope and publish", () => {
  it("a coordinator creates a call; it appears on the public board with its skills, and the QR secret is created", async () => {
    const { id } = await t.as(a2(coord), (tx) => createOpportunity(tx, input({ departmentId: dept })));
    const board = await t.as("anon", (tx) => upcomingOpportunities(tx));
    const o = board.find((x) => x.id === id)!;
    expect(o).toMatchObject({ title: "AI4Rights school sessions", programme: "AI4Rights", state: "Lagos", mode: "Physical", slots: 2, taken: 0, skills: ["Teaching", "Public speaking"] });
    expect((await t.h.svc("select 1 from opportunity_secrets where opportunity_id=$1", [id]))).toHaveLength(1);
    expect((await t.h.svc<{ n: number }>("select count(*)::int n from audit_logs where action='opportunity.insert' and record_id=$1", [id]))[0].n).toBe(1);
  });

  it("a State Lead can create calls only in their own state; a Viewer cannot create at all", async () => {
    await t.as(a2(lagosLead), (tx) => createOpportunity(tx, input({ title: "Lagos outreach" })));
    expect((await rejects(t.as(a2(lagosLead), (tx) => createOpportunity(tx, input({ title: "Kano outreach", state: "Kano" }))))).code).toBe("forbidden");
    expect((await rejects(t.as(a2(viewer), (tx) => createOpportunity(tx, input({ title: "Nope call" }))))).code).toBe("forbidden");
  });

  it("an admin's list is limited to their scope", async () => {
    const lagos = await t.as(a2(lagosLead), (tx) => adminOpportunities(tx));
    expect(lagos.every((o) => o.state === "Lagos")).toBe(true);
    await t.as(a2(kanoLead), (tx) => createOpportunity(tx, input({ title: "Kano drive", state: "Kano" })));
    expect((await t.as(a2(kanoLead), (tx) => adminOpportunities(tx))).map((o) => o.title)).toEqual(["Kano drive"]);
    expect((await t.as(a2(coord), (tx) => adminOpportunities(tx))).length).toBeGreaterThanOrEqual(3);
  });

  it("an unpublished call is hidden from the public but not from the admin, and publishing is scoped", async () => {
    const { id } = await t.as(a2(coord), (tx) => createOpportunity(tx, input({ title: "Draft call", published: false })));
    expect((await t.as("anon", (tx) => upcomingOpportunities(tx))).some((o) => o.id === id)).toBe(false);
    await t.as(a2(coord), (tx) => setOpportunityPublished(tx, id, true));
    expect((await t.as("anon", (tx) => upcomingOpportunities(tx))).some((o) => o.id === id)).toBe(true);
    expect((await rejects(t.as(a2(kanoLead), (tx) => setOpportunityPublished(tx, id, false)))).code).toBe("not_found");
  });
});

describe("volunteer sign-ups", () => {
  let opp: string, v1: string, v2: string, v3: string, applicant: string;
  beforeAll(async () => {
    opp = (await t.as(a2(coord), (tx) => createOpportunity(tx, input({ title: "Capacity test", slots: 2 })))).id;
    v1 = await t.h.activeVolunteer("sv1"); v2 = await t.h.activeVolunteer("sv2"); v3 = await t.h.activeVolunteer("sv3"); applicant = await t.h.user("not-yet");
  });
  const me = (sub: string) => ({ sub, aal: "aal1" as const });

  it("fills slots, waitlists the overflow, and a cancellation promotes the waitlist", async () => {
    expect(await t.as(me(v1), (tx) => signUp(tx, v1, opp))).toBe("confirmed");
    expect(await t.as(me(v2), (tx) => signUp(tx, v2, opp))).toBe("confirmed");
    expect(await t.as(me(v3), (tx) => signUp(tx, v3, opp))).toBe("waitlisted");
    expect((await t.as("anon", (tx) => upcomingOpportunities(tx))).find((o) => o.id === opp)!.taken).toBe(2);
    await t.as(me(v1), (tx) => cancelSignup(tx, v1, opp));
    expect((await t.as(me(v3), (tx) => mySignups(tx, v3)))[0].status).toBe("confirmed");
    expect((await t.as(me(v1), (tx) => mySignups(tx, v1)))[0].status).toBe("cancelled");
  });

  it("signing up twice does nothing new, and after cancelling the person is told to ask a coordinator", async () => {
    expect(await t.as(me(v2), (tx) => signUp(tx, v2, opp))).toBe("confirmed");
    expect((await rejects(t.as(me(v1), (tx) => signUp(tx, v1, opp)))).code).toBe("cancelled_before");
  });

  it("only approved (active) volunteers can sign up", async () => {
    expect((await rejects(t.as(me(applicant), (tx) => signUp(tx, applicant, opp)))).code).toBe("only_active_volunteers");
  });

  it("sign-up closes at the deadline", async () => {
    const closed = (await t.as(a2(coord), (tx) => createOpportunity(tx, input({ title: "Closing soon", signupDeadline: plus(1), startsAt: plus(3) })))).id;
    await t.h.svc("update opportunities set signup_deadline = now() - interval '1 minute', starts_at = now() + interval '1 hour' where id=$1", [closed]);
    expect((await rejects(t.as(me(v2), (tx) => signUp(tx, v2, closed)))).code).toBe("signup_closed");
  });

  it("a volunteer cannot sign someone else up, and cannot see other people's sign-ups", async () => {
    await rejects(t.as(me(v2), (tx) => signUp(tx, v3, opp)));
    expect((await t.as(me(v2), (tx) => mySignups(tx, v2))).every((s) => s.opportunityId === opp)).toBe(true);
    expect(await t.as(me(v2), (tx) => mySignups(tx, v3))).toEqual([]);
  });
});
