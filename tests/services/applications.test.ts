import { beforeAll, describe, expect, it } from "vitest";
import { CONSENTS } from "../../src/lib/consent-texts";
import { createGuardianRequest, guardianDecide, guardianLinkInfo, guardianState, myApplication, replyToMoreInfo, saveApplicantDetails, submitApplication } from "../../src/lib/services/applications";
import { applicationSchema, ageOn } from "../../src/lib/validation/application";
import { freshServices, rejects } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let dept: string, dept2: string;
beforeAll(async () => { t = await freshServices(); dept = await t.h.department("Comms"); dept2 = await t.h.department("ICT"); }, 60000);

const adultInput = (over: Record<string, unknown> = {}) => applicationSchema.parse({
  first: "Amaka", last: "Obi", phone: "0803 123 4567", state: "Lagos", lga: "Yaba", dob: "2001-04-18", occupation: "Designer",
  skills: ["Design"], departmentIds: [dept], availability: "Weekends", languages: ["English"], heard: "Instagram",
  consents: ["conduct", "safeguarding", "privacy"], ...over,
});
const caller = (sub: string) => ({ sub, aal: "aal1" as const });

describe("validation (shared by the form and the server)", () => {
  it("accepts a good application and fills the optional fields", () => {
    const a = adultInput({ nysc: undefined, occupation: undefined });
    expect(a.nysc).toBe(""); expect(a.occupation).toBe("");
  });
  it.each([
    ["no first name", { first: "  " }], ["bad phone", { phone: "abc" }], ["unknown state", { state: "Atlantis" }],
    ["future date of birth", { dob: "2999-01-01" }], ["nonsense date", { dob: "2001-13-45" }], ["no skills", { skills: [] }],
    ["no department", { departmentIds: [] }], ["department id not an id", { departmentIds: ["comms"] }], ["unknown consent", { consents: ["conduct", "other"] }],
  ])("rejects %s", (_n, over) => expect(() => adultInput(over)).toThrow());
  it("works out age on a given day", () => { expect(ageOn("2008-06-21", new Date("2026-06-20"))).toBe(17); expect(ageOn("2008-06-21", new Date("2026-06-21"))).toBe(18); });
});

describe("submitting an application", () => {
  it("an adult applies: profile, contact, private details, consents with exact wording, application and departments are all saved", async () => {
    const id = await t.newPerson("adult1");
    const r = await t.as(caller(id), (tx) => submitApplication(tx, id, "adult1@example.com", adultInput({ departmentIds: [dept, dept2] })));
    expect(r.applicationId).toBeTruthy();
    const { application, profile } = await t.as(caller(id), (tx) => myApplication(tx, id));
    expect(application?.stage).toBe("submitted");
    expect(profile).toMatchObject({ firstName: "Amaka", state: "Lagos", status: "applicant" });
    expect((await t.h.svc("select email, phone from volunteer_contacts where user_id=$1", [id]))[0]).toEqual({ email: "adult1@example.com", phone: "0803 123 4567" });
    expect((await t.h.svc<{ n: number }>("select count(*)::int n from application_departments where application_id=$1", [r.applicationId]))[0].n).toBe(2);
  });

  it("RULE 8: every consent row stores the server's exact wording and version, whatever the browser sent", async () => {
    const id = await t.newPerson("adult2");
    await t.as(caller(id), (tx) => submitApplication(tx, id, "adult2@example.com", adultInput({ consents: ["conduct", "safeguarding", "privacy", "media"] })));
    const rows = await t.h.svc<{ kind: string; text_version: string; text_snapshot: string }>("select kind, text_version, text_snapshot from consents where user_id=$1 order by kind", [id]);
    expect(rows.map((r) => r.kind).sort()).toEqual(["code_of_conduct", "photo_media", "privacy", "safeguarding"]);
    for (const c of CONSENTS) expect(rows.some((r) => r.text_version === c.version && r.text_snapshot === c.text)).toBe(true);
  });

  it("the optional photo consent can be left out, but the three required ones cannot", async () => {
    const id = await t.newPerson("adult3");
    const e = await rejects(t.as(caller(id), (tx) => submitApplication(tx, id, "adult3@example.com", adultInput({ consents: ["conduct", "privacy"] }))));
    expect(e.code).toBe("required_consents_missing");
    expect(await t.h.svc("select 1 from volunteer_profiles where user_id=$1", [id])).toHaveLength(0); // nothing half-saved
    await t.as(caller(id), (tx) => submitApplication(tx, id, "adult3@example.com", adultInput()));
    expect(await t.h.svc("select 1 from consents where user_id=$1 and kind='photo_media'", [id])).toHaveLength(0);
  });

  it("applying twice is refused with a plain message", async () => {
    const id = await t.newPerson("adult4");
    await t.as(caller(id), (tx) => submitApplication(tx, id, "adult4@example.com", adultInput()));
    const e = await rejects(t.as(caller(id), (tx) => submitApplication(tx, id, "adult4@example.com", adultInput())));
    expect(e.code).toBe("already_applied");
  });

  it("below the minimum age is refused by the database rule", async () => {
    const id = await t.newPerson("tooyoung");
    const e = await rejects(t.as(caller(id), (tx) => submitApplication(tx, id, "tooyoung@example.com", adultInput({ dob: "2016-01-01" }))));
    expect(e.code).toBe("below_minimum_age");
  });

  it("a date of birth already on record cannot be changed by re-applying", async () => {
    const id = await t.newPerson("liar");
    const v = await t.h.svc("select 1");
    void v;
    await t.h.svc("insert into volunteer_profiles (user_id, first_name, last_name, state, lga) values ($1,'L','L','Lagos','Ikeja')", [id]);
    await t.h.svc("insert into volunteer_private (user_id, date_of_birth) values ($1,'2009-06-21')", [id]);
    const e = await rejects(t.as(caller(id), (tx) => submitApplication(tx, id, "liar@example.com", adultInput({ dob: "1990-01-01" }))));
    expect(e.code).toBe("dob_locked");
  });

  it("a person cannot submit as someone else (row-level security)", async () => {
    const a = await t.newPerson("victim"), b = await t.newPerson("attacker");
    await rejects(t.as(caller(b), (tx) => submitApplication(tx, a, "victim@example.com", adultInput())));
    expect(await t.h.svc("select 1 from applications where user_id=$1", [a])).toHaveLength(0);
  });
});

describe("under-18s: the guardian's emailed link", () => {
  const minorInput = () => adultInput({ dob: "2009-06-21" });
  it("cannot submit until the guardian has said yes; then can", async () => {
    const id = await t.newPerson("minor1");
    const e = await rejects(t.as(caller(id), (tx) => submitApplication(tx, id, "minor1@example.com", minorInput())));
    expect(e.code).toBe("under_18_needs_guardian_consent");

    // the guardian's page shows the applicant's first name, so their details are saved before the request is made
    await t.as(caller(id), (tx) => saveApplicantDetails(tx, id, "minor1@example.com", minorInput()));
    const { token } = await t.as(caller(id), (tx) => createGuardianRequest(tx, id, { name: "Mrs Obi", email: "mum@example.com" }));
    expect((await t.as(caller(id), (tx) => guardianState(tx, id))).decision).toBe("pending");
    const info = await t.as("anon", (tx) => guardianLinkInfo(tx, token));
    expect(info).toMatchObject({ guardianName: "Mrs Obi", decision: "pending", expired: false });

    await t.as("anon", (tx) => guardianDecide(tx, token, "given"));
    expect(await t.as(caller(id), (tx) => guardianState(tx, id))).toMatchObject({ decision: "given", verified: true });
    await t.as(caller(id), (tx) => submitApplication(tx, id, "minor1@example.com", minorInput()));
    expect((await t.as(caller(id), (tx) => myApplication(tx, id))).application?.stage).toBe("submitted");
  });

  it("the stored token is a hash, never the link's secret", async () => {
    const id = await t.newPerson("minor2");
    await t.as(caller(id), (tx) => saveApplicantDetails(tx, id, "minor2@example.com", minorInput()));
    const { token } = await t.as(caller(id), (tx) => createGuardianRequest(tx, id, { name: "Mr B", email: "dad@example.com" }));
    const row = (await t.h.svc<{ token_hash: string }>("select token_hash from guardian_requests where user_id=$1", [id]))[0];
    expect(row.token_hash).not.toContain(token);
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it("a refusal is recorded and does not unlock submission", async () => {
    const id = await t.newPerson("minor3");
    await t.as(caller(id), (tx) => saveApplicantDetails(tx, id, "minor3@example.com", minorInput()));
    const { token } = await t.as(caller(id), (tx) => createGuardianRequest(tx, id, { name: "Mrs C", email: "c@example.com" }));
    await t.as("anon", (tx) => guardianDecide(tx, token, "refused"));
    expect(await t.as(caller(id), (tx) => guardianState(tx, id))).toMatchObject({ decision: "refused", verified: false });
    expect((await rejects(t.as(caller(id), (tx) => submitApplication(tx, id, "minor3@example.com", minorInput())))).code).toBe("under_18_needs_guardian_consent");
  });

  it("wrong, reused and expired links give plain errors", async () => {
    const id = await t.newPerson("minor4");
    await t.as(caller(id), (tx) => saveApplicantDetails(tx, id, "minor4@example.com", minorInput()));
    const { token } = await t.as(caller(id), (tx) => createGuardianRequest(tx, id, { name: "G", email: "g@example.com" }));
    expect(await t.as("anon", (tx) => guardianLinkInfo(tx, "nonsense"))).toBeNull();
    expect((await rejects(t.as("anon", (tx) => guardianDecide(tx, "nonsense", "given")))).code).toBe("unknown_link");
    await t.as("anon", (tx) => guardianDecide(tx, token, "given"));
    expect((await rejects(t.as("anon", (tx) => guardianDecide(tx, token, "given")))).code).toBe("already_decided");
    const { token: old } = await t.as(caller(id), (tx) => createGuardianRequest(tx, id, { name: "G", email: "g@example.com" }));
    await t.h.svc("update guardian_requests set expires_at = now() - interval '1 day' where decision='pending' and user_id=$1", [id]);
    expect((await rejects(t.as("anon", (tx) => guardianDecide(tx, old, "given")))).code).toBe("link_expired");
  });

  it("is limited to 5 requests a day, so the form cannot be used to spam an inbox", async () => {
    const id = await t.newPerson("minor5");
    await t.as(caller(id), (tx) => saveApplicantDetails(tx, id, "minor5@example.com", minorInput()));
    for (let i = 0; i < 5; i++) await t.as(caller(id), (tx) => createGuardianRequest(tx, id, { name: "G", email: "g@example.com" }));
    expect((await rejects(t.as(caller(id), (tx) => createGuardianRequest(tx, id, { name: "G", email: "g@example.com" })))).code).toBe("too_many_requests");
  });
});

describe("answering 'needs more information'", () => {
  it("sends the application back to the queue with the applicant's reply; nothing else changes", async () => {
    const id = await t.newPerson("replier");
    const { applicationId } = await t.as(caller(id), (tx) => submitApplication(tx, id, "replier@example.com", adultInput()));
    expect((await rejects(t.as(caller(id), (tx) => replyToMoreInfo(tx, id, "too early")))).code).toBe("not_found"); // nothing was asked yet
    await t.h.svc("update applications set stage='needs_info', needs_info_note='Send your call-up letter' where id=$1", [applicationId]);
    await t.as(caller(id), (tx) => replyToMoreInfo(tx, id, "  Here is my call-up letter number 123.  "));
    const row = (await t.h.svc<{ stage: string; reply: string; needs_info_note: string }>("select stage, answers->>'reply' as reply, needs_info_note from applications where id=$1", [applicationId]))[0];
    expect(row).toMatchObject({ stage: "submitted", reply: "Here is my call-up letter number 123.", needs_info_note: "Send your call-up letter" });
    expect((await rejects(t.as(caller(id), (tx) => replyToMoreInfo(tx, id, "twice")))).code).toBe("not_found");
    expect((await rejects(t.as(caller(id), (tx) => replyToMoreInfo(tx, id, " ")))).code).toBe("invalid");
  });
});
