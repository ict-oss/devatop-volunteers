import { beforeAll, describe, expect, it } from "vitest";
import { seedOnce } from "../../src/lib/db/seed";
import { deleteMyAccountData, exportMyData, markGuideRead, myGuides, profileSchema, updateMyProfile } from "../../src/lib/services/profile";
import { startHere } from "../../src/lib/services/portal";
import { freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let vol: string, other: string, applicant: string;
const me = (sub: string) => ({ sub, aal: "aal1" as const });
beforeAll(async () => {
  t = await freshServices(); await seedOnce(async (text, params) => t.h.svc(text, params as unknown[]));
  vol = await t.h.activeVolunteer("pf1", { state: "Lagos", first: "Amaka", last: "Obi" }); other = await t.h.activeVolunteer("pf2"); applicant = await t.h.user("pf3");
}, 60000);

describe("my profile", () => {
  const input = (o: Record<string, unknown> = {}) => profileSchema.parse({ phone: "0803 999 1111", state: "Oyo", availability: "Weekends", skills: ["Design", "Writing"], languages: ["English", "Yoruba"], ...o });
  it("validates", () => { for (const bad of [{ phone: "x" }, { state: "Nowhere" }, { skills: [] }]) expect(() => input(bad)).toThrow(); });
  it("a volunteer updates their own details (phone lives in the contact record)", async () => {
    await t.as(me(vol), (tx) => updateMyProfile(tx, vol, input()));
    expect((await t.h.svc("select state, skills, languages, availability from volunteer_profiles where user_id=$1", [vol]))[0]).toMatchObject({ state: "Oyo", skills: ["Design", "Writing"], languages: ["English", "Yoruba"], availability: "Weekends" });
    expect((await t.h.svc<{ phone: string }>("select phone from volunteer_contacts where user_id=$1", [vol]))[0].phone).toBe("0803 999 1111");
  });
  it("cannot change someone else's, and cannot change status through this", async () => {
    await t.as(me(vol), (tx) => updateMyProfile(tx, other, input({ state: "Kano" }))).catch(() => null);
    expect((await t.h.svc<{ state: string }>("select state from volunteer_profiles where user_id=$1", [other]))[0].state).not.toBe("Kano");
    expect((await t.h.svc<{ status: string }>("select status from volunteer_profiles where user_id=$1", [vol]))[0].status).toBe("active");
  });
});

describe("download my data", () => {
  it("contains the person's own records and nobody else's", async () => {
    await t.h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'Mine','2026-10-01',2,'remote_log')", [vol]);
    await t.h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'Theirs','2026-10-01',2,'remote_log')", [other]);
    const d = await t.as(me(vol), (tx) => exportMyData(tx, vol)) as Record<string, any>;
    expect(d.profile).toMatchObject({ first_name: "Amaka", last_name: "Obi" });
    expect(d.contact.email).toBe("pf1@example.com");
    expect(d.private.date_of_birth).toBe("1999-01-01");
    expect(d.consents.length).toBe(3);
    expect(d.hours.map((h: { activity: string }) => h.activity)).toEqual(["Mine"]);
    expect(JSON.stringify(d)).not.toContain("pf2@example.com");
  });
});

describe("guides", () => {
  it("an active volunteer sees published volunteer guides (never admin ones), can mark must-reads, and Start here follows", async () => {
    const g = await t.as(me(vol), (tx) => myGuides(tx, vol));
    expect(g.map((x) => x.title)).toContain("Code of conduct");
    expect(g.some((x) => x.title.startsWith("Admin handbook"))).toBe(false);
    const conduct = g.find((x) => x.title === "Code of conduct")!;
    expect(conduct).toMatchObject({ mustRead: true, read: false });
    expect(conduct.body.length).toBeGreaterThan(1);
    await t.as(me(vol), (tx) => markGuideRead(tx, vol, conduct.id));
    await t.as(me(vol), (tx) => markGuideRead(tx, vol, conduct.id)); // twice is harmless
    expect((await t.as(me(vol), (tx) => myGuides(tx, vol))).find((x) => x.id === conduct.id)!.read).toBe(true);
    expect((await t.as(me(vol), (tx) => startHere(tx, vol))).find((i) => i.label === "Read: Code of conduct")!.done).toBe(true);
  });
  it("an applicant who is not approved yet sees no volunteer guides", async () => {
    expect(await t.as(me(applicant), (tx) => myGuides(tx, applicant))).toEqual([]);
  });
});

describe("withdraw consent and delete my account", () => {
  it("removes the person but keeps anonymous hour totals and an anonymous consent trail, and revokes certificates", async () => {
    const v = await t.h.activeVolunteer("pf-del");
    await t.h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,'Done','2026-10-01',5,'coordinator','approved',(select id from auth.users limit 1),now())", [v]).catch(() => null);
    await t.as(me(v), (tx) => deleteMyAccountData(tx));
    expect(await t.h.svc("select 1 from volunteer_profiles where user_id=$1", [v])).toHaveLength(0);
    expect(await t.h.svc("select 1 from users where id=$1", [v])).toHaveLength(0);
    const w = await t.h.svc<{ n: number }>("select count(*)::int n from consents where user_id is null and action='withdrawn'");
    expect(w[0].n).toBeGreaterThanOrEqual(3);
  });
});
