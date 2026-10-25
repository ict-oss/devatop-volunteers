import { redirect } from "next/navigation";
import { authEnabled } from "@/lib/env";
import { adminCaller, asCaller, trusted } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
import { OverviewAdmin } from "@/components/admin/OverviewAdmin";
import { OverviewProto } from "./OverviewProto";
import { overview } from "@/lib/services/overview";

export default async function Page() {
  if (!authEnabled()) return <OverviewProto />;
  const me = await adminCaller("overview");
  if (!me) redirect("/admin/not-allowed");
  return <OverviewAdmin o={await asCaller(me.caller, (tx) => overview(tx))} />;
}
