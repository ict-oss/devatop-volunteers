import { beforeAll, describe, expect, it } from "vitest";
import type { Mail } from "../../src/lib/email/send";
import { seedOnce } from "../../src/lib/db/seed";
import { remindersDue, sendReminders } from "../../src/lib/services/reminders";
import { freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let prog: string, tomorrowOpp: string, laterOpp: string, v1: string, v2: string, v3: string, v4: string;
const capture = () => { const sent: Mail[] = []; return { sent, send: async (m: Mail) => { sent.push(m); return { ok: true }; } }; };

// "tomorrow" in Lagos time: noon tomorrow, whatever hour the test runs at
const tomorrowNoon = () => { const lagosNow = new Date(Date.now() + 36e5); const d = new Date(Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate() + 1, 11, 0)); return d.toISOString(); };

beforeAll(async () => {
  t = await freshServices(); await seedOnce(async (text, params) => t.h.svc(text, params as unknown[])); prog = (await t.h.svc<{ id: string }>("select id from programmes where name='AI4Rights'"))[0].id;
  const mk = async (title: string, starts: string) => (await t.h.svc<{ id: string }>(
    "insert into opportunities (title, programme_id, mode, state, place, starts_at, signup_deadline, slots) values ($1,$2,'physical','Lagos','Yaba',$3::timestamptz, $3::timestamptz - interval '2 days', 10) returning id", [title, prog, starts]))[0].id;
  tomorrowOpp = await mk("Youth summit", tomorrowNoon()); laterOpp = await mk("Next month", new Date(Date.now() + 30 * 864e5).toISOString());
  v1 = await t.h.activeVolunteer("rem1", { first: "Amaka" }); v2 = await t.h.activeVolunteer("rem2"); v3 = await t.h.activeVolunteer("rem3"); v4 = await t.h.activeVolunteer("rem4");
  for (const [u, o] of [[v1, tomorrowOpp], [v2, tomorrowOpp], [v3, tomorrowOpp], [v1, laterOpp], [v4, tomorrowOpp]]) await t.h.svc("insert into signups (user_id, opportunity_id) values ($1,$2)", [u, o]);
  // the sign-up rules decide the status themselves, so set the two special cases directly
  await t.h.svc("alter table signups disable trigger signups_before_update_t");
  await t.h.svc("alter table signups disable trigger signups_after_update_t");
  await t.h.svc("update signups set status='waitlisted' where user_id=$1 and opportunity_id=$2", [v2, tomorrowOpp]);
  await t.h.svc("update signups set status='cancelled' where user_id=$1 and opportunity_id=$2", [v4, tomorrowOpp]);
  await t.h.svc("alter table signups enable trigger signups_before_update_t");
  await t.h.svc("alter table signups enable trigger signups_after_update_t");
  await t.h.svc("insert into consents (user_id, kind, action, text_version, text_snapshot) values ($1,'privacy','withdrawn','w1','withdrawn')", [v3]);
}, 60000);

describe("day-before reminders", () => {
  it("finds only confirmed volunteers for calls starting tomorrow, who still consent", async () => {
    const due = await remindersDue(t.owner);
    expect(due.map((d) => d.first)).toEqual(["Amaka"]);
    expect(due[0]).toMatchObject({ title: "Youth summit", place: "Yaba, Lagos" });
  });

  it("sends the reminder once, with the date, time and place, and a second run sends nothing", async () => {
    const c = capture();
    expect(await sendReminders(t.owner, "https://v.example", c.send)).toEqual({ sent: 1, failed: 0, skipped: 0 });
    expect(c.sent[0].subject).toBe("Tomorrow: Youth summit");
    expect(c.sent[0].text).toContain("12:00");
    expect(c.sent[0].text).toContain("Yaba, Lagos");
    expect(c.sent[0].text).toContain("https://v.example/my-opportunities");
    expect(await sendReminders(t.owner, "https://v.example", c.send)).toEqual({ sent: 0, failed: 0, skipped: 0 });
    expect(c.sent).toHaveLength(1);
  });

  it("a failed send is retried the next day-run (only 'sent' counts as done)", async () => {
    await t.h.svc("delete from email_log");
    const bad = await sendReminders(t.owner, "https://v.example", async () => ({ ok: false }));
    expect(bad).toEqual({ sent: 0, failed: 1, skipped: 0 });
    const c = capture();
    expect((await sendReminders(t.owner, "https://v.example", c.send)).sent).toBe(1);
  });
});
