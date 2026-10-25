import { beforeAll, describe, expect, it } from "vitest";
import { sendTemplateEmail } from "../../src/lib/email/notify";
import type { Mail } from "../../src/lib/email/send";
import { seedOnce } from "../../src/lib/db/seed";
import { freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
beforeAll(async () => { t = await freshServices(); await seedOnce(async (text, params) => t.h.svc(text, params as unknown[])); }, 60000);

const capture = () => { const sent: Mail[] = []; return { sent, send: async (m: Mail) => { sent.push(m); return { ok: true }; } }; };

describe("automated emails", () => {
  it("fills the template with the person's details and the saved settings, and logs only the template and outcome", async () => {
    const c = capture(); const u = await t.newPerson("mail1");
    const r = await sendTemplateEmail(t.owner, { template: "received", to: "amaka@example.com", toName: "Amaka", userId: u, vars: { first_name: "Amaka" }, siteUrl: "https://v.example", send: c.send });
    expect(r).toBe("sent");
    expect(c.sent[0].subject).toBe("We got your application, Amaka");
    expect(c.sent[0].text).toContain("within 7 days");
    expect(c.sent[0].text).toContain("https://v.example/dashboard");
    expect(c.sent[0].to.email).toBe("amaka@example.com");
    expect(c.sent[0].from.email).toBe("volunteers@devatop.org");
    const log = await t.h.svc<Record<string, unknown>>("select * from email_log where user_id=$1", [u]);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ template: "received", status: "sent" });
    expect(JSON.stringify(log[0])).not.toContain("amaka@example.com"); // rule 5: no address in the log
  });

  it("uses an admin's edited wording and sender", async () => {
    await t.h.svc("update email_templates set subject='Hello {first_name}!' where id='received'");
    await t.h.svc("update app_settings set value='\"Devatop Team\"'::jsonb where key='sender_name'");
    const c = capture();
    await sendTemplateEmail(t.owner, { template: "received", to: "x@example.com", vars: { first_name: "Ada" }, siteUrl: "https://v.example", send: c.send });
    expect(c.sent[0].subject).toBe("Hello Ada!");
    expect(c.sent[0].from.name).toBe("Devatop Team");
  });

  it("the guardian email carries the consent link", async () => {
    const c = capture();
    await sendTemplateEmail(t.owner, { template: "guardian", to: "mum@example.com", toName: "Mrs Obi", vars: { applicant_first_name: "Tobi", consent_link: "https://v.example/guardian-consent/abc" }, siteUrl: "https://v.example", send: c.send });
    expect(c.sent[0].text).toContain("https://v.example/guardian-consent/abc");
    expect(c.sent[0].subject).toContain("Tobi");
  });

  it("a provider failure or a crash never throws, and is recorded as failed", async () => {
    const bad = await sendTemplateEmail(t.owner, { template: "thanks", to: "x@example.com", vars: {}, siteUrl: "https://v.example", send: async () => ({ ok: false }) });
    const boom = await sendTemplateEmail(t.owner, { template: "thanks", to: "x@example.com", vars: {}, siteUrl: "https://v.example", send: async () => { throw new Error("network"); } });
    expect([bad, boom]).toEqual(["failed", "failed"]);
    expect((await t.h.svc<{ n: number }>("select count(*)::int n from email_log where status='failed'"))[0].n).toBe(2);
  });

  it("with no provider key configured it says 'skipped' instead of pretending", async () => {
    const r = await sendTemplateEmail(t.owner, { template: "thanks", to: "x@example.com", vars: {}, siteUrl: "https://v.example", send: async () => ({ ok: false, skipped: true }) });
    expect(r).toBe("skipped");
  });
});
