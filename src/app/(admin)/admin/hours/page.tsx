import { redirect } from "next/navigation";
import { authEnabled } from "@/lib/env";
import { adminCaller, asCaller } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
import { HoursAdmin } from "@/components/admin/HoursAdmin";
import { HoursProto } from "./HoursProto";
import { pendingHours, recentlyDecidedHours } from "@/lib/services/hours";

export const metadata = { title: "Hours" };

export default async function Page() {
  if (!authEnabled()) return <HoursProto />;
  const me = await adminCaller("hours.approve");
  if (!me) redirect("/admin/not-allowed");
  const d = await asCaller(me.caller, async (tx) => ({ pending: await pendingHours(tx), recent: await recentlyDecidedHours(tx) }));
  return <HoursAdmin pending={d.pending} recent={d.recent} />;
}
