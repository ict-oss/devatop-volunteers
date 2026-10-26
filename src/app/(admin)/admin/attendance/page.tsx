import { redirect } from "next/navigation";
import { adminCaller, asCaller } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
import { AttendanceAdmin } from "@/components/admin/AttendanceAdmin";
import { rosterForOpportunity } from "@/lib/services/attendance";
import { adminOpportunities } from "@/lib/services/opportunities";

export const metadata = { title: "Attendance" };

export default async function Page({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  const me = await adminCaller("attendance.take");
  if (!me) redirect("/admin/not-allowed");
  const q = await searchParams;
  const d = await asCaller(me.caller, async (tx) => {
    // calls from the last 60 days onwards (the door list is for events that are happening or just happened)
    const opps = (await adminOpportunities(tx)).filter((o) => Date.parse(o.startsAt) > Date.now() - 60 * 864e5).sort((a, b) => Math.abs(Date.parse(a.startsAt) - Date.now()) - Math.abs(Date.parse(b.startsAt) - Date.now()));
    const selected = opps.find((o) => o.id === q.o) ?? opps[0] ?? null;
    return { opps, selected, roster: selected ? await rosterForOpportunity(tx, selected.id) : [] };
  });
  return <AttendanceAdmin opps={d.opps} selected={d.selected} roster={d.roster} />;
}
