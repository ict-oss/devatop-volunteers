import { ChatReal } from "./ChatReal";
import { myRooms } from "@/lib/services/chat";
import { asCaller, getCaller } from "@/lib/server/caller";

export const metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await getCaller();
  const rooms = me ? await asCaller(me, (tx) => myRooms(tx, me.sub)) : [];
  return <ChatReal rooms={rooms} />;
}
