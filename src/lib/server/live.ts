import "server-only";
import { authEnabled } from "../env";
import type { LiveData } from "../live";
import { myCertificates } from "../services/certificates";
import { myHours } from "../services/hours";
import { checkInWindowOpportunities, mySignups, upcomingOpportunities } from "../services/opportunities";
import { myApplicationRow, recentAnnouncements, startHere, whatsappGroup } from "../services/portal";
import { publicSettings } from "../services/public";
import { myGuides } from "../services/profile";
import { listSiteImages } from "../services/siteImages";
import { publicEnv } from "../env";
import { publicImageUrl } from "../siteImages";
import { toHourLog, toMe } from "../view/live";
import { asCaller, asVisitor, getCaller } from "./caller";

const EMPTY: Omit<LiveData, "opps" | "reviewDays" | "images"> = { signedIn: false, checkin: [], signups: {}, me: null, hours: [], certs: [], startHere: [], guides: [], announcements: [], whatsappGroup: "" };

/** Null in prototype mode. Otherwise what this visitor may see: the public board for everyone, plus their own record when signed in. */
async function replacedImages(tx: Parameters<typeof listSiteImages>[0]): Promise<LiveData["images"]> {
  const base = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
  return Object.fromEntries((await listSiteImages(tx)).map((r) => [r.slotId, { kind: r.kind as "photo" | "video", url: publicImageUrl(base, r.path), poster: r.posterPath ? publicImageUrl(base, r.posterPath) : undefined }]));
}

export async function loadLive(): Promise<LiveData | null> {
  if (!authEnabled()) return null;
  const me = await getCaller();
  if (!me) return asVisitor(async (tx) => ({ ...EMPTY, opps: await upcomingOpportunities(tx), reviewDays: (await publicSettings(tx)).reviewDays, images: await replacedImages(tx) }));
  return asCaller(me, async (tx) => {
    // one after another on purpose: if one query fails, the error names that query instead of "transaction aborted"
    const opps = await upcomingOpportunities(tx), checkin = await checkInWindowOpportunities(tx), signups = await mySignups(tx, me.sub);
    const app = await myApplicationRow(tx, me.sub), hours = await myHours(tx, me.sub), certs = await myCertificates(tx, me.sub);
    const start = await startHere(tx, me.sub), guides = await myGuides(tx, me.sub), ann = await recentAnnouncements(tx), wa = await whatsappGroup(tx), settings = await publicSettings(tx), images = await replacedImages(tx);
    return {
      signedIn: true, opps, checkin, reviewDays: settings.reviewDays, images,
      signups: Object.fromEntries(signups.filter((s) => s.status !== "cancelled").map((s) => [s.opportunityId, s.status as "confirmed" | "waitlisted"])),
      me: app ? toMe(app) : null, hours: hours.map(toHourLog), certs, startHere: start, guides, announcements: ann, whatsappGroup: wa,
    };
  });
}
