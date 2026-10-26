import { redirect } from "next/navigation";
import { adminCaller, asCaller } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
import { OpportunitiesAdmin } from "@/components/admin/OpportunitiesAdmin";
import { adminOpportunities } from "@/lib/services/opportunities";
import { activeDepartments, allProgrammes } from "@/lib/services/public";

export const metadata = { title: "Opportunities" };

export default async function Page() {
  const me = await adminCaller("opportunities.edit"); // rule 1
  if (!me) redirect("/admin/not-allowed");
  const d = await asCaller(me.caller, async (tx) => ({ opps: await adminOpportunities(tx), programmes: await allProgrammes(tx), departments: await activeDepartments(tx) }));
  return <OpportunitiesAdmin opps={d.opps} programmes={d.programmes} departments={d.departments.map((x) => ({ id: x.id, name: x.name }))} />;
}
