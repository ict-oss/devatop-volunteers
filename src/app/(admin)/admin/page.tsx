import { redirect } from "next/navigation";
import { adminCaller, asCaller, trusted } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
import { OverviewAdmin } from "@/components/admin/OverviewAdmin";
import { overview } from "@/lib/services/overview";

export default async function Page() {
  const me = await adminCaller("overview");
  if (!me) redirect("/admin/not-allowed");
  return <OverviewAdmin o={await asCaller(me.caller, (tx) => overview(tx))} />;
}
