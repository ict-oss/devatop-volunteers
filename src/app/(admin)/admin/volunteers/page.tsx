import { redirect } from "next/navigation";
import { authEnabled } from "@/lib/env";
import { adminCaller, asCaller, trusted } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
import { VolunteersAdmin } from "@/components/admin/VolunteersAdmin";
import { VolunteersProto } from "./VolunteersProto";
import { volunteerDirectory } from "@/lib/services/overview";

export const metadata = { title: "Volunteers" };

export default async function Page() {
  if (!authEnabled()) return <VolunteersProto />;
  const me = await adminCaller("volunteers.list");
  if (!me) redirect("/admin/not-allowed");
  return <VolunteersAdmin rows={await asCaller(me.caller, (tx) => volunteerDirectory(tx))} />;
}
