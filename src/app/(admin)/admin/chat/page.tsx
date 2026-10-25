import { redirect } from "next/navigation";
import { ChatAdminProto } from "./ChatAdminProto";
import { ChatAdminReal } from "./ChatAdminReal";
import { authEnabled } from "@/lib/env";
import { myRooms } from "@/lib/services/chat";
import { adminCaller, asCaller } from "@/lib/server/caller";

export const metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!authEnabled()) return <ChatAdminProto />;
  const me = await adminCaller("overview");
  if (!me) redirect("/admin/not-allowed");
  return <ChatAdminReal rooms={await asCaller(me.caller, (tx) => myRooms(tx, me.caller.sub))} />;
}
