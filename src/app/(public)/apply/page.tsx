import { ApplyForm } from "./ApplyForm";
import { DEPARTMENTS, MIN_AGE, REVIEW_DAYS } from "@/lib/data";
import { authEnabled } from "@/lib/env";
import { activeDepartments, publicSettings } from "@/lib/services/public";
import { asCaller, asVisitor, getCaller } from "@/lib/server/caller";
import { myApplicationRow } from "@/lib/services/portal";

export const metadata = { title: "Become a volunteer" };
export const dynamic = "force-dynamic"; // reads AUTH_ENABLED when the page is opened, not when the site is built

/** Real database once AUTH_ENABLED=true; until then the clickable prototype (departments and settings read from the code). */
export default async function ApplyPage() {
  if (!authEnabled()) {
    return <ApplyForm real={false} departments={DEPARTMENTS.filter((d) => d.status === "active").map((d) => ({ id: d.id, name: d.name }))} minAge={MIN_AGE} reviewDays={REVIEW_DAYS} />;
  }
  // someone who already applied sees where it stands instead of a blank form (a rejected application may be redone)
  const me = await getCaller();
  const existing = me ? await asCaller(me, (tx) => myApplicationRow(tx, me.sub)) : null;
  const already = !!existing && existing.stage !== "rejected";
  const { departments, settings } = await asVisitor(async (tx) => ({ departments: await activeDepartments(tx), settings: await publicSettings(tx) }));
  return <ApplyForm real already={already} departments={departments.map((d) => ({ id: d.id, name: d.name }))} minAge={settings.minAge} reviewDays={settings.reviewDays} />;
}
