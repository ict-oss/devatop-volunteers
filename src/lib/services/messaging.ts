import { sql } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_TEMPLATES, isGroupLink, renderEmail, type TemplateId } from "../emails";
import { sendViaBrevo, type Sender } from "../email/send";
import { loadSettings } from "../email/notify";
import { emailEnabled } from "../env";
import { emailLog } from "../db/schema";
import { AppError, guard, rowsOf, type Db } from "./db";

/* ================================================================ settings (Super Admin: settings.edit) */
export const settingsSchema = z.object({
  senderName: z.string().trim().min(2).max(60),
  senderEmail: z.string().trim().toLowerCase().email().max(120),
  whatsappGroup: z.string().trim().max(200).refine((v) => v === "" || isGroupLink(v), "That is not a WhatsApp group link. It looks like https://chat.whatsapp.com/…"),
  reviewDays: z.number().int().min(1).max(60),
  talkamLink: z.string().trim().max(200).refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Use a full link starting with https://"),
});
export type MessagingSettings = z.infer<typeof settingsSchema>;

export async function getMessagingSettings(db: Db): Promise<MessagingSettings> {
  const s = await loadSettings(db);
  return { senderName: s.senderName, senderEmail: s.senderEmail, whatsappGroup: s.whatsappGroup, reviewDays: s.reviewDays, talkamLink: s.talkamLink };
}
export async function saveMessagingSettings(db: Db, i: MessagingSettings): Promise<void> {
  await guard(async () => {
    const pairs: [string, unknown][] = [["sender_name", i.senderName], ["sender_email", i.senderEmail], ["whatsapp_group", i.whatsappGroup], ["review_days", i.reviewDays], ["talkam_link", i.talkamLink]];
    for (const [k, v] of pairs) {
      const r = rowsOf(await db.execute(sql`insert into app_settings (key, value) values (${k}, ${JSON.stringify(v)}::jsonb) on conflict (key) do update set value = excluded.value returning key`));
      if (r.length === 0) throw new AppError("forbidden", "Only a Super Admin can change messaging settings.");
    }
  });
}

/* ================================================================ the seven email templates */
const GLOBAL_VARS = ["review_days", "whatsapp_link", "talkam_link", "dashboard_link", "opportunities_link", "record_link"];
export type TemplateView = { id: TemplateId; name: string; when: string; subject: string; body: string; vars: string[]; edited: boolean };
export async function listTemplates(db: Db): Promise<TemplateView[]> {
  const rows = rowsOf<{ id: string; subject: string; body: string }>(await db.execute(sql`select id, subject, body from email_templates`));
  return DEFAULT_TEMPLATES.map((t) => {
    const r = rows.find((x) => x.id === t.id);
    return { id: t.id, name: t.name, when: t.when, subject: r?.subject ?? t.subject, body: r?.body ?? t.body, vars: t.vars, edited: !!r && (r.subject !== t.subject || r.body !== t.body) };
  });
}
export const templateSchema = z.object({ subject: z.string().trim().min(3).max(150), body: z.string().trim().min(10).max(4000) });
/** Rejects a typo such as {first_nam}, which would otherwise go out to volunteers as a blank. */
export function unknownPlaceholders(id: TemplateId, ...texts: string[]): string[] {
  const allowed = new Set([...(DEFAULT_TEMPLATES.find((t) => t.id === id)?.vars ?? []), ...GLOBAL_VARS]);
  return [...new Set(texts.flatMap((t) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1])).filter((v) => !allowed.has(v)))];
}
export async function saveTemplate(db: Db, id: TemplateId, input: z.infer<typeof templateSchema>): Promise<void> {
  if (!DEFAULT_TEMPLATES.some((t) => t.id === id)) throw new AppError("not_found", "Unknown email.");
  const bad = unknownPlaceholders(id, input.subject, input.body);
  if (bad.length) throw new AppError("invalid", `These placeholders do not exist for this email: ${bad.map((b) => `{${b}}`).join(" ")}. Check the spelling.`);
  await guard(async () => {
    const r = rowsOf(await db.execute(sql`insert into email_templates (id, subject, body) values (${id}, ${input.subject}, ${input.body}) on conflict (id) do update set subject = excluded.subject, body = excluded.body, updated_at = now() returning id`));
    if (r.length === 0) throw new AppError("forbidden", "Only a Super Admin can edit email templates.");
  });
}
export async function resetTemplate(db: Db, id: TemplateId): Promise<void> {
  await guard(async () => { await db.execute(sql`delete from email_templates where id = ${id}`); });
}

/* ================================================================ send to a group (email.bulk) */
export const MAX_BULK = 150;
export const audienceSchema = z.object({
  who: z.enum(["approved", "applicants", "everyone"]), state: z.string().max(40).nullable().default(null), departmentId: z.uuid().nullable().default(null),
});
export type Audience = z.infer<typeof audienceSchema>;
export type Recipient = { userId: string; first: string; last: string; email: string };

/** Who would get it: inside the admin's scope, with an email on file, and never someone who withdrew their privacy consent. */
export async function audienceFor(db: Db, a: Audience): Promise<Recipient[]> {
  return rowsOf<Record<string, unknown>>(await db.execute(sql`
    select vp.user_id, vp.first_name, vp.last_name, vc.email
    from volunteer_profiles vp join volunteer_contacts vc on vc.user_id = vp.user_id and vc.email is not null
    where public.has_perm('email.bulk') and public.in_scope(vp.user_id) and public.has_consent(vp.user_id, 'privacy')
      and (case ${a.who} when 'approved' then vp.status = 'active' when 'applicants' then vp.status = 'applicant' else vp.status in ('active', 'applicant') end)
      and (${a.state}::text is null or vp.state = ${a.state})
      and (${a.departmentId}::uuid is null or exists (select 1 from department_memberships m where m.user_id = vp.user_id and m.department_id = ${a.departmentId}::uuid and m.status <> 'left')
           or exists (select 1 from applications ap join application_departments ad on ad.application_id = ap.id where ap.user_id = vp.user_id and ad.department_id = ${a.departmentId}::uuid))
    order by vp.first_name, vp.last_name`))
    .map((r) => ({ userId: String(r.user_id), first: String(r.first_name), last: String(r.last_name), email: String(r.email) }));
}

export const bulkSchema = z.object({ audience: audienceSchema, subject: z.string().trim().min(3, "Add a subject.").max(150), body: z.string().trim().min(15, "Write a message.").max(4000), announce: z.boolean().default(false) });
export type BulkInput = z.infer<typeof bulkSchema>;

/** Record the send (who sent it, the filter used, how many; never the recipients), and post it to the announcements board if asked. */
export async function recordMessage(db: Db, senderId: string, input: BulkInput, count: number, emailed = true): Promise<void> {
  await guard(async () => {
    if (emailed) await db.execute(sql`insert into messages (kind, subject, body, audience, recipient_count, sent_by) values ('bulk_email', ${input.subject}, ${input.body}, ${JSON.stringify(input.audience)}::jsonb, ${count}, ${senderId}::uuid)`);
    if (input.announce) await db.execute(sql`insert into messages (kind, subject, body, audience, recipient_count, sent_by) values ('announcement', ${input.subject}, ${input.body.replace(/\{first_name\}/g, "there")}, '{}'::jsonb, 0, ${senderId}::uuid)`);
  });
}

/** Sends one custom email per recipient through the trusted connection. Never throws; returns counts only. */
export async function deliverBulk(owner: Db, recipients: Recipient[], subject: string, body: string, send: Sender = sendViaBrevo): Promise<{ sent: number; failed: number; skipped: number }> {
  if (!emailEnabled() && send === sendViaBrevo) return { sent: 0, failed: 0, skipped: recipients.length };
  const settings = await loadSettings(owner);
  const out = { sent: 0, failed: 0, skipped: 0 };
  for (let i = 0; i < recipients.length; i += 10) {
    await Promise.all(recipients.slice(i, i + 10).map(async (r) => {
      let status: "sent" | "failed" | "skipped" = "failed";
      try {
        const mail = renderEmail({ subject, body }, { first_name: r.first, ...{ review_days: settings.reviewDays } }, settings);
        const res = await send({ from: { name: settings.senderName, email: settings.senderEmail }, to: { email: r.email, name: `${r.first} ${r.last}` }, subject: mail.subject, html: mail.html, text: mail.body });
        status = res.skipped ? "skipped" : res.ok ? "sent" : "failed";
      } catch { status = "failed"; }
      out[status]++;
      try { await owner.insert(emailLog).values({ userId: r.userId, template: "bulk", status }); } catch { /* never break a send for the log */ }
    }));
  }
  return out;
}

/** The sent log: template and outcome only, never an address or a message body (rule 5). */
export type LogRow = { id: string; template: string; status: string; at: string };
export async function emailLogRows(db: Db, limit = 60): Promise<LogRow[]> {
  return rowsOf<Record<string, unknown>>(await db.execute(sql`select id, template, status, sent_at from email_log order by sent_at desc limit ${limit}`))
    .map((r) => ({ id: String(r.id), template: String(r.template).startsWith("reminder:") ? "reminder" : String(r.template), status: String(r.status), at: new Date(r.sent_at as string).toISOString() }));
}
