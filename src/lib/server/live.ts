import "server-only";
import { authEnabled } from "../env";
import type { LiveData } from "../live";
import { myCertificates } from "../services/certificates";
import { myHours } from "../services/hours";
import { checkInWindowOpportunities, mySignups, upcomingOpportunities } from "../services/opportunities";
import { myApplicationRow, recentAnnouncements, startHere, whatsappGroup } from "../services/portal";
import { publicSettings } from "../services/public";
import { toHourLog, toMe } from "../view/live";
import { asCaller, asVisitor, getCaller } from "./caller";

const EMPTY: Omit<LiveData, "opps" | "reviewDays"> = { signedIn: false, checkin: [], signups: {}, me: null, hours: [], certs: [], startHere: [], announcements: [], whatsappGroup: "" };

/** Null in prototype mode. Otherwise what this visitor may see: the public board for everyone, plus their own record when signed in. */
export async function loadLive(): Promise<LiveData | null> {
  if (!authEnabled()) return null;
  const me = await getCaller();
  if (!me) return asVisitor(async (tx) => ({ ...EMPTY, opps: await upcomingOpportunities(tx), reviewDays: (await publicSettings(tx)).reviewDays }));
  return asCaller(me, async (tx) => {
    const [opps, checkin, signups, app, hours, certs, start, ann, wa, settings] = await Promise.all([
      upcomingOpportunities(tx), checkInWindowOpportunities(tx), mySignups(tx, me.sub), myApplicationRow(tx, me.sub), myHours(tx, me.sub), myCertificates(tx, me.sub),
      startHere(tx, me.sub), recentAnnouncements(tx), whatsappGroup(tx), publicSettings(tx),
    ]);
    return {
      signedIn: true, opps, checkin, reviewDays: settings.reviewDays,
      signups: Object.fromEntries(signups.filter((s) => s.status !== "cancelled").map((s) => [s.opportunityId, s.status as "confirmed" | "waitlisted"])),
      me: app ? toMe(app) : null, hours: hours.map(toHourLog), certs, startHere: start, announcements: ann, whatsappGroup: wa,
    };
  });
}
