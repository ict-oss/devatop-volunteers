import { ApplyForm } from "./ApplyForm";
import { activeDepartments, publicSettings } from "@/lib/services/public";
import { asCaller, asVisitor, getCaller } from "@/lib/server/caller";
import { myApplicationRow } from "@/lib/services/portal";

export const metadata = { title: "Become a volunteer" };
export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  // someone who already applied sees where it stands instead of a blank form (a rejected application may be redone)
  const me = await getCaller();
  const existing = me ? await asCaller(me, (tx) => myApplicationRow(tx, me.sub)) : null;
  const already = !!existing && existing.stage !== "rejected";
  const { departments, settings } = await asVisitor(async (tx) => ({ departments: await activeDepartments(tx), settings: await publicSettings(tx) }));
  return <ApplyForm already={already} departments={departments.map((d) => ({ id: d.id, name: d.name }))} minAge={settings.minAge} reviewDays={settings.reviewDays} />;
}
