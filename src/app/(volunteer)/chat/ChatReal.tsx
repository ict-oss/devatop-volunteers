"use client";
import Link from "next/link";
import { ChatUI } from "@/components/ChatUI";
import { dbChat } from "@/components/chatAdapter";
import type { Room } from "@/lib/chat";
import { useLive } from "@/lib/live";

export function ChatReal({ rooms }: { rooms: Room[] }) {
  const me = useLive()?.me;
  if (!me) return <div><h1 className="text-[length:var(--text-display)]">The <em className="accent">rooms</em></h1><p className="mt-4">Chat opens once you are a volunteer. <Link className="underline font-bold" href="/apply">Apply to volunteer.</Link></p></div>;
  if (me.stage !== "Approved") return <div><h1 className="text-[length:var(--text-display)]">Almost <em className="accent">there.</em></h1><p className="mt-4 max-w-xl">The rooms open when your application is approved. If something is wrong, you can write to Support below.</p>{rooms.length > 0 && <div className="mt-6"><ChatUI rooms={rooms} self={{ name: me.first, label: "Volunteer", staff: false }} adapter={dbChat} /></div>}</div>;
  return (
    <div className="grid gap-5">
      <div><h1 className="text-[length:var(--text-display)]">The <em className="accent">rooms</em></h1><p className="mt-2 max-w-2xl">Talk to your department and the whole movement. Something wrong? Open Support: only you and the Devatop team can see it.</p></div>
      <ChatUI rooms={rooms} self={{ name: me.first, label: "Volunteer", staff: false }} adapter={dbChat} />
    </div>
  );
}
