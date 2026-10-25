import { ApplicationsView } from "./ApplicationsView";
import { DEPARTMENTS } from "@/lib/data";
import { authEnabled } from "@/lib/env";
import { applicationQueue } from "@/lib/services/review";
import { activeDepartments } from "@/lib/services/public";
import { adminCaller, asCaller } from "@/lib/server/caller";
import { toApplication } from "@/lib/view/applications";
import { redirect } from "next/navigation";

export const metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  if (!authEnabled()) return <ApplicationsView real={false} initial={[]} departments={DEPARTMENTS.map((d) => ({ id: d.id, name: d.name }))} />;
  const me = await adminCaller("applications.decide"); // rule 1: checked on the server for this exact action
  if (!me) redirect("/admin/not-allowed");
  const { queue, departments } = await asCaller(me.caller, async (tx) => ({ queue: await applicationQueue(tx), departments: await activeDepartments(tx) }));
  return <ApplicationsView real initial={queue.map(toApplication)} departments={departments.map((d) => ({ id: d.id, name: d.name }))} />;
}
