import { eq, inArray } from "drizzle-orm";
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES, isGroupLink, renderEmail, type Settings, type TemplateId, type Vars } from "../emails";
import { appSettings, emailLog, emailTemplates } from "../db/schema";
import type { Db } from "../services/db";
import { sendViaBrevo, type Sender } from "./send";

/** Reads the editable settings (Admin > Messages) with safe defaults. */
export async function loadSettings(db: Db): Promise<Settings> {
  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, ["sender_name", "sender_email", "whatsapp_group", "review_days", "talkam_link"]));
  const v = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    senderName: typeof v.sender_name === "string" && v.sender_name ? v.sender_name : DEFAULT_SETTINGS.senderName,
    senderEmail: typeof v.sender_email === "string" && v.sender_email ? v.sender_email : DEFAULT_SETTINGS.senderEmail,
    whatsappGroup: typeof v.whatsapp_group === "string" ? v.whatsapp_group : "",
    reviewDays: typeof v.review_days === "number" ? v.review_days : DEFAULT_SETTINGS.reviewDays,
    talkamLink: typeof v.talkam_link === "string" && v.talkam_link ? v.talkam_link : DEFAULT_SETTINGS.talkamLink,
  };
}

export type NotifyOptions = { template: TemplateId; to: string; toName?: string; vars?: Vars; userId?: string | null; siteUrl: string; send?: Sender;
  /** What to write in email_log.template instead of the template id, e.g. "reminder:<call id>", so a daily job never sends the same reminder twice. */ logAs?: string };

/**
 * Sends one of the seven automated emails, using the wording an admin may have edited (table email_templates).
 * Never throws: a failed email must not undo an application or a decision. The outcome (template + status only,
 * never an address or body) goes to email_log. `db` is the trusted server connection.
 */
export async function sendTemplateEmail(db: Db, o: NotifyOptions): Promise<"sent" | "failed" | "skipped"> {
  let status: "sent" | "failed" | "skipped" = "failed";
  try {
    const settings = await loadSettings(db);
    const [row] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, o.template));
    const base = DEFAULT_TEMPLATES.find((t) => t.id === o.template)!;
    const tpl = { subject: row?.subject ?? base.subject, body: row?.body ?? base.body };
    const vars: Vars = {
      review_days: settings.reviewDays,
      whatsapp_link: isGroupLink(settings.whatsappGroup) ? settings.whatsappGroup : "",
      talkam_link: settings.talkamLink,
      dashboard_link: `${o.siteUrl}/dashboard`,
      opportunities_link: `${o.siteUrl}/opportunities`,
      ...o.vars,
    };
    const mail = renderEmail(tpl, vars, settings);
    const r = await (o.send ?? sendViaBrevo)({ from: { name: settings.senderName, email: settings.senderEmail }, to: { email: o.to, name: o.toName }, subject: mail.subject, html: mail.html, text: mail.body });
    status = r.skipped ? "skipped" : r.ok ? "sent" : "failed";
  } catch { status = "failed"; }
  try { await db.insert(emailLog).values({ userId: o.userId ?? null, template: o.logAs ?? o.template, status }); } catch { /* logging must never break the request */ }
  return status;
}
