// The seven automated emails from requirements section 17, plus the bulk wrapper and WhatsApp helpers.
// Voice: direct, warm, a little bold. Each starts with the volunteer's first name and is short enough for a phone.
// PROTOTYPE: "sending" writes to an outbox in the browser. Production: Brevo or Resend from a Devatop address
// (src/lib/email/), triggered by server actions and the daily reminder cron.

export type TemplateId = "received" | "guardian" | "needs_info" | "approved" | "not_approved" | "reminder" | "thanks";
export type Template = { id: TemplateId; name: string; when: string; subject: string; body: string; vars: string[] };

export type Settings = { senderName: string; senderEmail: string; whatsappGroup: string; reviewDays: number; talkamLink: string };
export const DEFAULT_SETTINGS: Settings = {
  senderName: "Devatop Volunteers", senderEmail: "volunteers@devatop.org", // (confirm) official Devatop address
  whatsappGroup: "https://chat.whatsapp.com/REPLACE-WITH-REAL-GROUP-LINK", reviewDays: 7, talkamLink: "https://devatop.org",
};

export const DEFAULT_TEMPLATES: Template[] = [
  { id: "received", name: "Application received", when: "Right after someone submits an application",
    subject: "We got your application, {first_name}",
    body: "Thank you for stepping up. Our team will review your application and reply within {review_days} days. You can check your status any time: {dashboard_link}\n\nVolunteers are known by action. Yours starts soon.",
    vars: ["first_name", "review_days", "dashboard_link"] },
  { id: "guardian", name: "Guardian consent request", when: "When an applicant under 18 sends their parent or guardian a code",
    subject: "{applicant_first_name} wants to volunteer with Devatop",
    body: "{applicant_first_name} has applied to volunteer with Devatop Centre for Africa Development, a youth-led organisation working against human trafficking and abuse. Because they are under 18, we need your permission first. See what they'll do and how we keep young volunteers safe, then give or refuse consent: {consent_link}\n\nThis link works for 7 days. If you did not expect this email, you can ignore it.",
    vars: ["applicant_first_name", "consent_link"] },
  { id: "needs_info", name: "Needs more information", when: "When an admin chooses “More info” on an application",
    subject: "One more thing before we decide, {first_name}",
    body: "We need a little more from you: {admin_note}\n\nUpdate your application here: {dashboard_link}. Once you do, it goes straight back to the review queue.",
    vars: ["first_name", "admin_note", "dashboard_link"] },
  { id: "approved", name: "Approved", when: "When an admin approves an application",
    subject: "You're in, {first_name}",
    body: "Welcome to the movement. Your next steps: finish orientation and safeguarding training, then join the volunteers WhatsApp group: {whatsapp_link}\n\nAfter that, pick your first call to action: {opportunities_link}. We're glad you're here.",
    vars: ["first_name", "whatsapp_link", "opportunities_link"] },
  { id: "not_approved", name: "Not approved", when: "When an admin rejects an application",
    subject: "About your Devatop application",
    body: "Thank you for applying, {first_name}. We can't take your application forward this time{reason}.\n\nThis is not a no forever. You can apply again from {reapply_date}, and you can still support the work by following Talkam: {talkam_link}",
    vars: ["first_name", "reason", "reapply_date", "talkam_link"] },
  { id: "reminder", name: "Activity reminder", when: "The day before an activity (daily job)",
    subject: "Tomorrow: {opportunity_title}",
    body: "{first_name}, you're down for {opportunity_title} on {date} at {time}, {location}. Your contact on the day: {coordinator_first_name}, {coordinator_phone}.\n\nCan't make it? Cancel here so someone else can take your place: {cancel_link}",
    vars: ["first_name", "opportunity_title", "date", "time", "location", "coordinator_first_name", "coordinator_phone", "cancel_link"] },
  { id: "thanks", name: "Thank you and hours approved", when: "When an admin approves a volunteer's hours",
    subject: "{hours} hours added to your record",
    body: "Thank you for showing up for {opportunity_title}, {first_name}. {hours} hours have been approved and added to your record. Total so far: {total_hours}.\n\nSee your record: {record_link}",
    vars: ["first_name", "hours", "opportunity_title", "total_hours", "record_link"] },
];

export type Vars = Record<string, string | number | undefined>;
const fill = (s: string, v: Vars) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] === undefined || v[k] === "" ? "" : String(v[k])));

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const linkify = (s: string) => s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:)])/g, '<a href="$1" style="color:#16130F;font-weight:700">$1</a>');

/** Phone-friendly HTML: single column, 17px text, big orange header bar, no images to download. */
export function renderEmail(t: { subject: string; body: string }, v: Vars, s: Settings) {
  const subject = fill(t.subject, v).trim();
  const body = fill(t.body, v).replace(/\s+([.,])/g, "$1");
  const html = `<!doctype html><html><body style="margin:0;background:#F2EDE3"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0"><table role="presentation" width="100%" style="max-width:560px" cellpadding="0" cellspacing="0">
<tr><td style="background:#F05023;padding:16px 20px;font:900 28px Impact,'Arial Narrow',sans-serif;text-transform:uppercase;color:#16130F">Devatop <span style="font:700 12px Arial,sans-serif;background:#16130F;color:#F2EDE3;padding:2px 6px;vertical-align:middle">Volunteers</span></td></tr>
<tr><td style="padding:24px 20px;font:17px/1.55 Arial,sans-serif;color:#16130F"><h1 style="margin:0 0 14px;font:900 30px/1 Impact,'Arial Narrow',sans-serif;text-transform:uppercase">${esc(subject)}</h1>${esc(body).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${linkify(p).replace(/\n/g, "<br>")}</p>`).join("")}</td></tr>
<tr><td style="padding:14px 20px;border-top:1px solid #16130F;font:13px/1.5 Arial,sans-serif;color:#16130F">You are getting this because you applied or volunteer with Devatop Centre for Africa Development. You can withdraw consent any time from your profile. If you see am, Talkam.<br>Sent from ${esc(s.senderName)} &lt;${esc(s.senderEmail)}&gt;</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, body, html };
}

/* ---------- WhatsApp: click-to-chat links (no API needed; WhatsApp Business API is Phase 2/3) ---------- */
/** 0803 123 4567 -> 2348031234567 (wa.me wants the international number, digits only) */
export const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("234") ? d : d.startsWith("0") ? "234" + d.slice(1) : d;
};
export const waLink = (phone: string, text: string) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
export const waShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const isGroupLink = (u: string) => /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(u) && !/REPLACE/.test(u);
