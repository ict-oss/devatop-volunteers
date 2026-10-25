import "server-only";
import { authEnabled } from "../env";
import type { LiveData } from "../live";
import { myCertificates } from "../services/certificates";
import { myHours } from "../services/hours";
import { checkInWindowOpportunities, mySignups, upcomingOpportunities } from "../services/opportunities";
import { myApplicationRow, recentAnnouncements, startHere, whatsappGroup } from "../services/portal";
import { publicSettings } from "../services/public";
import { myGuides } from "../services/profile";
import { toHourLog, toMe } from "../view/live";
import { asCaller, asVisitor, getCaller } from "./caller";

const EMPTY: Omit<LiveData, "opps" | "reviewDays"> = { signedIn: false, checkin: [], signups: {}, me: null, hours: [], certs: [], startHere: [], guides: [], announcements: [], whatsappGroup: "" };

/** Null in prototype mode. Otherwise what this visitor may see: the public board for everyone, plus their own record when signed in. */
export async function loadLive(): Promise<LiveData | null> {
  if (!authEnabled()) return null;
  const me = await getCaller();
  if (!me) return asVisitor(async (tx) => ({ ...EMPTY, opps: await upcomingOpportunities(tx), reviewDays: (await publicSettings(tx)).reviewDays }));
  return asCaller(me, async (tx) => {
    // one after another on purpose: if one query fails, the error names that query instead of "transaction aborted"
    const opps = await upcomingOpportunities(tx), checkin = await checkInWindowOpportunities(tx), signups = await mySignups(tx, me.sub);
    const app = await myApplicationRow(tx, me.sub), hours = await myHours(tx, me.sub), certs = await myCertificates(tx, me.sub);
    const start = await startHere(tx, me.sub), guides = await myGuides(tx, me.sub), ann = await recentAnnouncements(tx), wa = await whatsappGroup(tx), settings = await publicSettings(tx);
    return {
      signedIn: true, opps, checkin, reviewDays: settings.reviewDays,
      signups: Object.fromEntries(signups.filter((s) => s.status !== "cancelled").map((s) => [s.opportunityId, s.status as "confirmed" | "waitlisted"])),
      me: app ? toMe(app) : null, hours: hours.map(toHourLog), certs, startHere: start, guides, announcements: ann, whatsappGroup: wa,
    };
  });
}
