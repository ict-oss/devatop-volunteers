import { beforeAll, describe, expect, it } from "vitest";
import type { Mail } from "../../src/lib/email/send";
import { seedOnce } from "../../src/lib/db/seed";
import { audienceFor, bulkSchema, deliverBulk, emailLogRows, getMessagingSettings, listTemplates, recordMessage, resetTemplate, saveMessagingSettings, saveTemplate, settingsSchema, unknownPlaceholders } from "../../src/lib/services/messaging";
import { rejects, freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let sup: string, coord: string, lagosLead: string, viewer: string, lagos1: string, lagos2: string, kano1: string, applicant: string, withdrew: string, dept: string;
const a2 = (sub: string) => ({ sub, aal: "aal2" as const });
const capture = () => { const sent: Mail[] = []; return { sent, send: async (m: Mail) => { sent.push(m); return { ok: true }; } }; };

beforeAll(async () => {
  t = await freshServices(); await seedOnce(async (text, params) => t.h.svc(text, params as unknown[]));
  dept = (await t.h.svc<{ id: string }>("select id from departments where name='Communications and Media'"))[0].id;
  sup = await t.h.admin("super", "super_admin"); await t.h.admin("super2", "super_admin"); coord = await t.h.admin("coord", "volunteer_coordinator");
  lagosLead = await t.h.admin("lead", "state_lead", { state: "Lagos" }); viewer = await t.h.admin("viewer", "viewer");
  lagos1 = await t.h.activeVolunteer("ml1", { state: "Lagos", first: "Amaka" }); lagos2 = await t.h.activeVolunteer("ml2", { state: "Lagos" }); kano1 = await t.h.activeVolunteer("mk1", { state: "Kano" });
  applicant = await t.h.user("ma1", { state: "Lagos" }); await t.h.consentAll(applicant); withdrew = await t.h.activeVolunteer("mw1", { state: "Lagos" });
  await t.h.svc("insert into consents (user_id, kind, action, text_version, text_snapshot) values ($1,'privacy','withdrawn','w1','withdrawn')", [withdrew]);
  await t.h.svc("insert into department_memberships (user_id, department_id, status) values ($1,$2,'active')", [lagos1, dept]);
}, 60000);

describe("messaging settings (Super Admin)", () => {
  it("validates the WhatsApp link and sender", () => {
    const ok = { senderName: "Devatop Volunteers", senderEmail: "Volunteers@Devatop.org", whatsappGroup: "https://chat.whatsapp.com/AbC123", reviewDays: 7, talkamLink: "https://devatop.org" };
    expect(settingsSchema.parse(ok).senderEmail).toBe("volunteers@devatop.org");
    expect(settingsSchema.safeParse({ ...ok, whatsappGroup: "https://evil.example/x" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, whatsappGroup: "" }).success).toBe(true);
    expect(settingsSchema.safeParse({ ...ok, senderEmail: "nope" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, reviewDays: 0 }).success).toBe(false);
  });
  it("a Super Admin saves them and volunteers then see the WhatsApp link; others cannot change them", async () => {
    const s = { senderName: "Devatop Team", senderEmail: "volunteers@devatop.org", whatsappGroup: "https://chat.whatsapp.com/Real123", reviewDays: 5, talkamLink: "https://devatop.org" };
    await t.as(a2(sup), (tx) => saveMessagingSettings(tx, s));
    expect(await t.as(a2(sup), (tx) => getMessagingSettings(tx))).toEqual(s);
    expect((await t.h.svc<{ v: string }>("select value #>> '{}' v from app_settings where key='whatsapp_group'"))[0].v).toBe("https://chat.whatsapp.com/Real123");
    expect((await rejects(t.as(a2(coord), (tx) => saveMessagingSettings(tx, { ...s, senderName: "Hijack" })))).code).toBe("forbidden");
    expect((await t.as(a2(sup), (tx) => getMessagingSettings(tx))).senderName).toBe("Devatop Team");
  });
});

describe("the seven emails are editable", () => {
  it("lists all seven, with edits marked", async () => {
    const list = await t.as(a2(sup), (tx) => listTemplates(tx));
    expect(list).toHaveLength(7); expect(list.every((x) => !x.edited)).toBe(true);
  });
  it("saves new wording, refuses misspelt placeholders, and can reset", async () => {
    expect(unknownPlaceholders("received", "Hi {first_name}, {review_days} {first_nam}")).toEqual(["first_nam"]);
    await t.as(a2(sup), (tx) => saveTemplate(tx, "received", { subject: "Thanks {first_name}", body: "We will reply within {review_days} days. See {dashboard_link}" }));
    expect((await t.as(a2(sup), (tx) => listTemplates(tx))).find((x) => x.id === "received")).toMatchObject({ subject: "Thanks {first_name}", edited: true });
    expect((await rejects(t.as(a2(sup), (tx) => saveTemplate(tx, "received", { subject: "Hi {firstname}", body: "A long enough body here" })))).code).toBe("invalid");
    expect((await rejects(t.as(a2(coord), (tx) => saveTemplate(tx, "received", { subject: "Changed by coordinator", body: "A long enough body here" })))).code).toBe("forbidden");
    await t.as(a2(sup), (tx) => resetTemplate(tx, "received"));
    expect((await t.as(a2(sup), (tx) => listTemplates(tx))).find((x) => x.id === "received")!.edited).toBe(false);
  });
});

describe("send to a group", () => {
  it("the audience is inside the admin's scope, has email, and never includes someone who withdrew consent", async () => {
    const all = await t.as(a2(coord), (tx) => audienceFor(tx, { who: "approved", state: null, departmentId: null }));
    expect(all.map((r) => r.userId).sort()).toEqual([lagos1, lagos2, kano1].sort());
    expect(all.map((r) => r.userId)).not.toContain(withdrew);
    expect((await t.as(a2(coord), (tx) => audienceFor(tx, { who: "applicants", state: null, departmentId: null }))).map((r) => r.userId)).toEqual([applicant]);
    expect((await t.as(a2(coord), (tx) => audienceFor(tx, { who: "approved", state: "Lagos", departmentId: null }))).map((r) => r.userId).sort()).toEqual([lagos1, lagos2].sort());
    expect((await t.as(a2(coord), (tx) => audienceFor(tx, { who: "approved", state: null, departmentId: dept }))).map((r) => r.userId)).toEqual([lagos1]);
  });
  it("a State Lead can only reach their own state; a Viewer or an admin without two-factor reaches nobody", async () => {
    expect((await t.as(a2(lagosLead), (tx) => audienceFor(tx, { who: "approved", state: null, departmentId: null }))).every((r) => r.userId !== kano1)).toBe(true);
    expect(await t.as(a2(viewer), (tx) => audienceFor(tx, { who: "everyone", state: null, departmentId: null }))).toEqual([]);
    expect(await t.as({ sub: coord, aal: "aal1" }, (tx) => audienceFor(tx, { who: "everyone", state: null, departmentId: null }))).toEqual([]);
  });
  it("delivers a personal email to each recipient and records the send without recipients", async () => {
    const c = capture();
    const recipients = await t.as(a2(coord), (tx) => audienceFor(tx, { who: "approved", state: "Lagos", departmentId: null }));
    const input = bulkSchema.parse({ audience: { who: "approved", state: "Lagos" }, subject: "Briefing", body: "Hi {first_name}, the briefing is on Saturday.", announce: true });
    expect(await deliverBulk(t.owner, recipients, input.subject, input.body, c.send)).toEqual({ sent: 2, failed: 0, skipped: 0 });
    expect(c.sent.find((m) => m.to.name?.startsWith("Amaka"))!.text).toContain("Hi Amaka,");
    await t.as(a2(coord), (tx) => recordMessage(tx, coord, input, 2));
    const rows = await t.h.svc<{ kind: string; recipient_count: number; audience: Record<string, unknown> }>("select kind, recipient_count, audience from messages order by kind");
    expect(rows.map((r) => r.kind)).toEqual(["announcement", "bulk_email"]);
    expect(JSON.stringify(rows)).not.toContain("@");
    const log = await t.as(a2(coord), (tx) => emailLogRows(tx));
    expect(log.filter((l) => l.template === "bulk")).toHaveLength(2);
    expect(JSON.stringify(log)).not.toContain("@");
  });
  it("rejects an empty subject or tiny message", () => {
    expect(bulkSchema.safeParse({ audience: { who: "approved" }, subject: "", body: "short" }).success).toBe(false);
  });
});
