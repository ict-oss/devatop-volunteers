import { sql } from "drizzle-orm";
import { sendTemplateEmail } from "../email/notify";
import type { Sender } from "../email/send";
import { rowsOf, type Db } from "./db";

/**
 * The day-before reminder (email 6 of 7). Runs from a daily cron with the trusted server connection, because no person
 * is signed in. It reminds confirmed volunteers whose call starts tomorrow (Lagos time), only once per call, and never
 * emails someone whose consent to the privacy notice has been withdrawn.
 */
export type DueReminder = { userId: string; email: string; first: string; oppId: string; title: string; startsAt: string; place: string };

export async function remindersDue(owner: Db): Promise<DueReminder[]> {
  return rowsOf<Record<string, unknown>>(await owner.execute(sql`
    select s.user_id, vc.email, vp.first_name, o.id as opp_id, o.title, o.starts_at, concat_ws(', ', o.place, o.state) as place
    from signups s
    join opportunities o on o.id = s.opportunity_id
    join volunteer_profiles vp on vp.user_id = s.user_id and vp.status = 'active'
    join volunteer_contacts vc on vc.user_id = s.user_id and vc.email is not null
    where s.status = 'confirmed' and o.published
      and (o.starts_at at time zone 'Africa/Lagos')::date = ((now() at time zone 'Africa/Lagos')::date + 1)
      and public.has_consent(s.user_id, 'privacy')
      and not exists (select 1 from email_log l where l.user_id = s.user_id and l.template = 'reminder:' || o.id::text and l.status = 'sent')
    order by o.starts_at, s.created_at`))
    .map((r) => ({ userId: String(r.user_id), email: String(r.email), first: String(r.first_name), oppId: String(r.opp_id), title: String(r.title), startsAt: new Date(r.starts_at as string).toISOString(), place: String(r.place ?? "") }));
}

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

export async function sendReminders(owner: Db, siteUrl: string, send?: Sender): Promise<{ sent: number; failed: number; skipped: number }> {
  const out = { sent: 0, failed: 0, skipped: 0 };
  for (const r of await remindersDue(owner)) {
    const status = await sendTemplateEmail(owner, {
      template: "reminder", to: r.email, toName: r.first, userId: r.userId, siteUrl, send, logAs: `reminder:${r.oppId}`,
      vars: { first_name: r.first, opportunity_title: r.title, date: longDate(r.startsAt), time: time(r.startsAt), location: r.place, cancel_link: `${siteUrl}/my-opportunities` },
    });
    out[status]++;
  }
  return out;
}
