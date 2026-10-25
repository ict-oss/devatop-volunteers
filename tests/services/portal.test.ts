import { beforeAll, describe, expect, it } from "vitest";
import { seedOnce } from "../../src/lib/db/seed";
import { applicationSchema } from "../../src/lib/validation/application";
import { submitApplication } from "../../src/lib/services/applications";
import { myApplicationRow, recentAnnouncements, startHere, whatsappGroup } from "../../src/lib/services/portal";
import { toMe } from "../../src/lib/view/live";
import { freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let vol: string, applicant: string, dept: string;
const me = (sub: string) => ({ sub, aal: "aal1" as const });
beforeAll(async () => {
  t = await freshServices(); await seedOnce(async (text, params) => t.h.svc(text, params as unknown[]));
  dept = (await t.h.svc<{ id: string }>("select id from departments limit 1"))[0].id;
  applicant = await t.newPerson("portal-applicant");
  await t.as(me(applicant), (tx) => submitApplication(tx, applicant, "portal-applicant@example.com", applicationSchema.parse({
    first: "Amaka", last: "Obi", phone: "0803 123 4567", state: "Lagos", lga: "Yaba", dob: "2001-04-18", skills: ["Design"], departmentIds: [dept], availability: "Weekends", languages: ["English"], consents: ["conduct", "safeguarding", "privacy"] })));
  vol = await t.h.activeVolunteer("portal-vol");
}, 60000);

describe("the volunteer's own portal data", () => {
  it("an applicant sees their own application, stage and the department they chose", async () => {
    const a = await t.as(me(applicant), (tx) => myApplicationRow(tx, applicant));
    expect(a).toMatchObject({ stage: "submitted", first: "Amaka", state: "Lagos", email: "portal-applicant@example.com", dob: "2001-04-18", departmentIds: [dept] });
    const view = toMe(a!);
    expect(view).toMatchObject({ stage: "Submitted", mine: true, first: "Amaka" });
    expect(view.consents.map((c) => c.key).sort()).toEqual(["conduct", "privacy", "safeguarding"]);
  });
  it("shows the note when an admin asks for more information", async () => {
    await t.h.svc("update applications set stage='needs_info', needs_info_note='Send your call-up letter' where user_id=$1", [applicant]);
    expect(toMe((await t.as(me(applicant), (tx) => myApplicationRow(tx, applicant)))!)).toMatchObject({ stage: "Needs info", note: "Send your call-up letter" });
  });
  it("nobody has another person's application", async () => {
    expect(await t.as(me(vol), (tx) => myApplicationRow(tx, applicant))).toBeNull();
  });

  it("Start here ticks itself from real records: trainings, must-read guides, WhatsApp, first sign-up", async () => {
    let items = await t.as(me(vol), (tx) => startHere(tx, vol));
    expect(items.map((i) => i.label)).toEqual(["Complete orientation training", "Complete safeguarding training", "Join the volunteers WhatsApp group", "Read: Code of conduct", "Read: Safeguarding in plain words", "Sign up for your first call"]);
    expect(items.every((i) => !i.done)).toBe(true);
    const conduct = (await t.h.svc<{ id: string }>("select id from guides where title='Code of conduct'"))[0].id;
    await t.as(me(vol), (tx) => tx.execute(`insert into guide_reads (user_id, guide_id) values ('${vol}', '${conduct}')`));
    const orientation = (await t.h.svc<{ id: string }>("select id from trainings where name='Orientation'"))[0].id;
    await t.h.svc("insert into training_completions (user_id, training_id) values ($1,$2)", [vol, orientation]);
    items = await t.as(me(vol), (tx) => startHere(tx, vol));
    expect(items.filter((i) => i.done).map((i) => i.label)).toEqual(["Complete orientation training", "Read: Code of conduct"]);
  });

  it("announcements and the WhatsApp link (active volunteers only)", async () => {
    await t.h.svc("update app_settings set value='\"https://chat.whatsapp.com/abc123\"'::jsonb where key='whatsapp_group'");
    expect(await t.as(me(vol), (tx) => whatsappGroup(tx))).toBe("https://chat.whatsapp.com/abc123");
    expect(await t.as(me(applicant), (tx) => whatsappGroup(tx))).toBe(""); // not approved yet: the link is not theirs to see
    const admin = await t.h.admin("poster", "volunteer_coordinator");
    await t.h.svc("insert into messages (kind, subject, body, sent_by) values ('announcement','Saturday briefing','Meet at 8am.',$1)", [admin]);
    expect((await t.as(me(vol), (tx) => recentAnnouncements(tx)))[0]).toMatchObject({ title: "Saturday briefing", body: "Meet at 8am." });
  });
});
