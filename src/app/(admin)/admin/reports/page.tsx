import { redirect } from "next/navigation";
import { ReportsAdmin } from "@/components/admin/ReportsAdmin";
import { ReportsProto } from "./ReportsProto";
import { authEnabled } from "@/lib/env";
import { reportRows } from "@/lib/services/reports";
import { allProgrammes } from "@/lib/services/public";
import { adminCaller, asCaller } from "@/lib/server/caller";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!authEnabled()) return <ReportsProto />;
  const me = await adminCaller("reports.see");
  if (!me) redirect("/admin/not-allowed");
  const d = await asCaller(me.caller, async (tx) => ({ rows: await reportRows(tx), programmes: await allProgrammes(tx) }));
  return <ReportsAdmin rows={d.rows} programmes={d.programmes.map((p) => p.name)} />;
}
