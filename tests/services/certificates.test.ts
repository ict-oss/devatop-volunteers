import { beforeAll, describe, expect, it } from "vitest";
import { certificateByCode, certificateCandidates, issueCertificate, myCertificates, verifyCertificate } from "../../src/lib/services/certificates";
import { rejects, freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let coord: string, lagosLead: string, kanoLead: string, viewer: string, vol: string, other: string, none: string;
const a2 = (sub: string) => ({ sub, aal: "aal2" as const });
const me = (sub: string) => ({ sub, aal: "aal1" as const });

async function hours(user: string, h: number, day: string, status: "approved" | "pending" = "approved") {
  await t.h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,'Activity',$2,$3,'coordinator',$4,$5,now())", [user, day, h, status, status === "approved" ? coord : null]);
}
beforeAll(async () => {
  t = await freshServices();
  coord = await t.h.admin("coord", "volunteer_coordinator"); lagosLead = await t.h.admin("lead-l", "state_lead", { state: "Lagos" });
  kanoLead = await t.h.admin("lead-k", "state_lead", { state: "Kano" }); viewer = await t.h.admin("viewer", "viewer");
  vol = await t.h.activeVolunteer("cert1", { state: "Lagos", first: "Amaka", last: "Obi" }); other = await t.h.activeVolunteer("cert2", { state: "Kano" }); none = await t.h.activeVolunteer("cert3", { state: "Lagos" });
  await hours(vol, 4, "2026-09-12"); await hours(vol, 6, "2026-09-26"); await hours(vol, 8, "2026-10-17", "pending"); await hours(other, 5, "2026-10-01");
}, 60000);

describe("issuing certificates (rule 7: approved hours only)", () => {
  it("candidates are volunteers with approved hours in the admin's scope; pending hours are not counted", async () => {
    const all = await t.as(a2(coord), (tx) => certificateCandidates(tx));
    expect(all.map((c) => [c.name, c.approvedHours])).toEqual([["Amaka Obi", 10], ["cert2 Tester", 5]]);
    expect(all[0]).toMatchObject({ periodStart: "2026-09-12", periodEnd: "2026-09-26", certified: false });
    // the permissions matrix: State Leads and Viewers cannot issue certificates
    expect(await t.as(a2(lagosLead), (tx) => certificateCandidates(tx))).toEqual([]);
    expect(await t.as(a2(viewer), (tx) => certificateCandidates(tx))).toEqual([]);
  });

  it("issues a certificate with a unique code for the approved hours, and is idempotent", async () => {
    const r = await t.as(a2(coord), (tx) => issueCertificate(tx, vol, "AI4Rights facilitator"));
    expect(r.created).toBe(true);
    expect(r.code).toMatch(/^DVT-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const again = await t.as(a2(coord), (tx) => issueCertificate(tx, vol));
    expect(again).toEqual({ code: r.code, created: false });
    const mine = await t.as(me(vol), (tx) => myCertificates(tx, vol));
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ holderName: "Amaka Obi", hours: 10, roleTitle: "AI4Rights facilitator", periodStart: "2026-09-12", periodEnd: "2026-09-26" });
    expect((await t.as(a2(coord), (tx) => certificateCandidates(tx)))[0].certified).toBe(true);
  });

  it("a certificate cannot be issued without approved hours, outside scope, by a Viewer, or without two-factor", async () => {
    expect((await rejects(t.as(a2(coord), (tx) => issueCertificate(tx, none)))).code).toBe("no_approved_hours");
    expect((await rejects(t.as(a2(lagosLead), (tx) => issueCertificate(tx, vol)))).code).toBe("forbidden"); // State Leads cannot issue
    expect((await rejects(t.as(a2(viewer), (tx) => issueCertificate(tx, other)))).code).toBe("forbidden");
    expect((await rejects(t.as({ sub: coord, aal: "aal1" }, (tx) => issueCertificate(tx, other)))).code).toBe("forbidden");
    expect(await t.h.svc("select 1 from certificates where user_id=$1", [other])).toHaveLength(0);
  });

  it("more approved hours later means a new certificate for the new total, the old one stays valid", async () => {
    await hours(vol, 2, "2026-10-20");
    const r = await t.as(a2(coord), (tx) => issueCertificate(tx, vol));
    expect(r.created).toBe(true);
    expect((await t.as(me(vol), (tx) => myCertificates(tx, vol))).map((c) => c.hours).sort()).toEqual([10, 12]);
  });

  it("the database refuses a hand-made certificate for hours that are not approved", async () => {
    await rejects(t.h.svc("insert into certificates (user_id, holder_name, hours, period_start, period_end) values ($1,'X',99,'2026-01-01','2026-02-01')", [vol]));
  });
});

describe("who can see a certificate", () => {
  let code: string;
  beforeAll(async () => { code = (await t.as(me(vol), (tx) => myCertificates(tx, vol)))[0].code; });
  it("the owner and an admin who may issue can open it by code; another volunteer cannot", async () => {
    expect((await t.as(me(vol), (tx) => certificateByCode(tx, code)))?.holderName).toBe("Amaka Obi");
    expect(await t.as(a2(coord), (tx) => certificateByCode(tx, code.toLowerCase()))).not.toBeNull();
    expect(await t.as(me(other), (tx) => certificateByCode(tx, code))).toBeNull();
    expect(await t.as(a2(kanoLead), (tx) => certificateByCode(tx, code))).toBeNull();
  });
  it("the PUBLIC check shows only name, hours and dates, and nothing for a wrong, malformed or revoked code", async () => {
    const pub = await t.as("anon", (tx) => verifyCertificate(tx, code));
    expect(pub).toEqual({ holderName: "Amaka Obi", hours: expect.any(Number), periodStart: "2026-09-12", periodEnd: expect.any(String) });
    expect(Object.keys(pub!).sort()).toEqual(["holderName", "hours", "periodEnd", "periodStart"]);
    expect(await t.as("anon", (tx) => verifyCertificate(tx, "DVT-ZZZZ-ZZZZ"))).toBeNull();
    expect(await t.as("anon", (tx) => verifyCertificate(tx, "'; drop table certificates;--"))).toBeNull();
    await t.h.svc("update certificates set revoked_at = now() where code=$1", [code]);
    expect(await t.as("anon", (tx) => verifyCertificate(tx, code))).toBeNull();
  });
});
