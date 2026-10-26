import { redirect } from "next/navigation";
import { adminCaller, asCaller } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
import { HoursAdmin } from "@/components/admin/HoursAdmin";
import { pendingHours, recentlyDecidedHours } from "@/lib/services/hours";

export const metadata = { title: "Hours" };

export default async function Page() {
  const me = await adminCaller("hours.approve");
  if (!me) redirect("/admin/not-allowed");
  const d = await asCaller(me.caller, async (tx) => ({ pending: await pendingHours(tx), recent: await recentlyDecidedHours(tx) }));
  return <HoursAdmin pending={d.pending} recent={d.recent} />;
}
