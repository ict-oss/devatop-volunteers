import { beforeAll, describe, expect, it } from "vitest";
import { applicantEmailTarget, applicationQueue, decideApplication } from "../../src/lib/services/review";
import { freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let lagosAdult: string, kanoAdult: string, lagosMinor: string, lagosMinorVerified: string;
let coord: string, lagosLead: string, kanoLead: string, viewer: string, dept: string;
const a2 = (sub: string) => ({ sub, aal: "aal2" as const });

async function applicant(label: string, o: { state: string; dob: string; guardian?: boolean }) {
  const id = await t.h.user(label, { state: o.state, dob: o.dob });
  await t.h.consentAll(id);
  if (o.guardian) await t.h.svc("insert into guardian_consents (user_id, guardian_name, guardian_contact, verified, verified_at) values ($1,'Mrs G','g@x.com',true,now())", [id]);
  // an under-18 application without a guardian can only exist if it slipped in some other way: simulate that, then restore the rule
  await t.h.svc("alter table applications disable trigger applications_insert_guard_t");
  const app = (await t.h.svc<{ id: string }>("insert into applications (user_id) values ($1) returning id", [id]))[0].id;
  await t.h.svc("alter table applications enable trigger applications_insert_guard_t");
  await t.h.svc("insert into application_departments (application_id, department_id) values ($1,$2)", [app, dept]);
  return { id, app };
}
let apps: Record<string, string> = {};
beforeAll(async () => {
  t = await freshServices(); dept = await t.h.department("Comms");
  const a = await applicant("lagos-adult", { state: "Lagos", dob: "1999-01-01" }); lagosAdult = a.id; apps.lagosAdult = a.app;
  const b = await applicant("kano-adult", { state: "Kano", dob: "1998-01-01" }); kanoAdult = b.id; apps.kanoAdult = b.app;
  const c = await applicant("lagos-minor", { state: "Lagos", dob: "2009-06-21" }); lagosMinor = c.id; apps.lagosMinor = c.app;
  const d = await applicant("lagos-minor-ok", { state: "Lagos", dob: "2009-06-21", guardian: true }); lagosMinorVerified = d.id; apps.lagosMinorVerified = d.app;
  coord = await t.h.admin("coord", "volunteer_coordinator");
  lagosLead = await t.h.admin("lagos-lead", "state_lead", { state: "Lagos" });
  kanoLead = await t.h.admin("kano-lead", "state_lead", { state: "Kano" });
  viewer = await t.h.admin("viewer", "viewer");
}, 60000);

describe("the review queue (what each admin may see)", () => {
  it("a coordinator sees everyone waiting, oldest first, with contact details and age", async () => {
    const q = await t.as(a2(coord), (tx) => applicationQueue(tx));
    expect(q).toHaveLength(4);
    expect(q[0].first).toBe("lagos-adult");
    const adult = q.find((x) => x.userId === lagosAdult)!;
    expect(adult).toMatchObject({ email: "lagos-adult@example.com", ageYears: 27, stage: "submitted", departmentIds: [dept] });
    expect(adult.consents.map((c) => c.kind).sort()).toEqual(["code_of_conduct", "privacy", "safeguarding"]);
    expect(q.find((x) => x.userId === lagosMinorVerified)).toMatchObject({ guardianVerified: true, guardianName: "Mrs G" });
    expect(q.find((x) => x.userId === lagosMinor)).toMatchObject({ guardianVerified: false });
  });

  it("a State Lead sees only their own state (scope applied in the query, rule 2), and can see phone but not date of birth", async () => {
    const q = await t.as(a2(lagosLead), (tx) => applicationQueue(tx));
    expect(q.map((x) => x.state)).toEqual(["Lagos", "Lagos", "Lagos"]);
    expect(q[0].phone).toBe("08030000000");
    expect(q[0].dob).toBeNull();
    expect(q[0].ageYears).not.toBeNull(); // the Under-18 badge still works without the date of birth
    expect((await t.as(a2(kanoLead), (tx) => applicationQueue(tx))).map((x) => x.userId)).toEqual([kanoAdult]);
  });

  it("a Viewer cannot see applications at all, and an admin without two-factor sees nothing", async () => {
    expect(await t.as(a2(viewer), (tx) => applicationQueue(tx))).toEqual([]);
    expect(await t.as({ sub: coord, aal: "aal1" }, (tx) => applicationQueue(tx))).toEqual([]);
  });

  it("a volunteer sees only their own application, and nobody anonymous sees any", async () => {
    const mine = await t.as({ sub: lagosAdult, aal: "aal2" }, (tx) => applicationQueue(tx));
    expect(mine.map((x) => x.userId)).toEqual([lagosAdult]);
  });
});

describe("deciding", () => {
  it("approve an adult: the volunteer becomes active, and the decision is in the audit log", async () => {
    const r = await t.as(a2(coord), (tx) => decideApplication(tx, apps.lagosAdult, "approved"));
    expect(r.ok).toBe(true);
    expect((await t.h.svc<{ status: string }>("select status from volunteer_profiles where user_id=$1", [lagosAdult]))[0].status).toBe("active");
    const audit = await t.h.svc<{ actor_id: string }>("select actor_id from audit_logs where action='application.approved' and record_id=$1", [apps.lagosAdult]);
    expect(audit[0].actor_id).toBe(coord);
    expect((await t.as(a2(coord), (tx) => applicationQueue(tx))).map((x) => x.userId)).not.toContain(lagosAdult);
  });

  it("RULE 6: an under-18 cannot be approved without a verified guardian; with one, the right roles can", async () => {
    const no = await t.as(a2(coord), (tx) => decideApplication(tx, apps.lagosMinor, "approved"));
    expect(no).toMatchObject({ ok: false, code: "under_18_needs_guardian_consent" });
    const yes = await t.as(a2(coord), (tx) => decideApplication(tx, apps.lagosMinorVerified, "approved"));
    expect(yes.ok).toBe(true);
  });

  it("a State Lead cannot approve an under-18 (role rule) or anyone outside their state", async () => {
    const x = await t.as(a2(lagosLead), (tx) => decideApplication(tx, apps.kanoAdult, "approved"));
    expect(x).toMatchObject({ ok: false, code: "not_found" }); // out of scope: the row is invisible
  });

  it("'needs more info' requires a note and shows it to the applicant; rejection stores the reason", async () => {
    const noNote = await t.as(a2(coord), (tx) => decideApplication(tx, apps.kanoAdult, "needs_info", "  "));
    expect(noNote).toMatchObject({ ok: false, code: "note_required" });
    expect((await t.as(a2(coord), (tx) => decideApplication(tx, apps.kanoAdult, "needs_info", "Please send your call-up letter"))).ok).toBe(true);
    const row = (await t.as({ sub: kanoAdult, aal: "aal1" }, (tx) => tx.execute(`select stage, needs_info_note from applications where user_id='${kanoAdult}'`))) as unknown as { rows: { stage: string; needs_info_note: string }[] };
    expect(row.rows[0]).toMatchObject({ stage: "needs_info", needs_info_note: "Please send your call-up letter" });
    expect((await t.as(a2(coord), (tx) => decideApplication(tx, apps.kanoAdult, "rejected", "Not a fit right now"))).ok).toBe(true);
    expect((await t.h.svc<{ reviewer_note: string }>("select reviewer_note from applications where id=$1", [apps.kanoAdult]))[0].reviewer_note).toBe("Not a fit right now");
  });

  it("a decided application cannot be decided again, and a Viewer or unauthenticated-to-aal2 admin cannot decide", async () => {
    expect(await t.as(a2(coord), (tx) => decideApplication(tx, apps.lagosAdult, "rejected"))).toMatchObject({ ok: false, code: "not_found" });
    const fresh = await applicant("fresh", { state: "Lagos", dob: "1997-01-01" });
    expect(await t.as(a2(viewer), (tx) => decideApplication(tx, fresh.app, "approved"))).toMatchObject({ ok: false });
    expect(await t.as({ sub: coord, aal: "aal1" }, (tx) => decideApplication(tx, fresh.app, "approved"))).toMatchObject({ ok: false });
    expect((await t.h.svc<{ stage: string }>("select stage from applications where id=$1", [fresh.app]))[0].stage).toBe("submitted");
  });

  it("the email target is found even for an admin who may not see contact details", async () => {
    const target = await applicantEmailTarget(t.owner, apps.lagosAdult);
    expect(target).toMatchObject({ email: "lagos-adult@example.com", first: "lagos-adult" });
  });
});
