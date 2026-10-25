"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ChatUI } from "@/components/ChatUI";
import { shortName, volunteerRooms } from "@/lib/chat";
import { DEPARTMENTS, type Department } from "@/lib/data";
import { KEYS, useLocal } from "@/lib/store";
import { useMe } from "@/lib/useMe";

export function ChatProto() {
  const { me } = useMe();
  const [depts] = useLocal<Department[]>(KEYS.depts, DEPARTMENTS);
  const rooms = useMemo(() => (me ? volunteerRooms(me, depts) : []), [me, depts]);
  if (!me) return <div><h1 className="text-[length:var(--text-display)]">The <em className="accent">rooms</em></h1><p className="mt-4">Chat opens once you are a volunteer. <Link className="underline font-bold" href="/apply">Apply here.</Link></p></div>;
  if (me.stage !== "Approved") return <div><h1 className="text-[length:var(--text-display)]">Almost <em className="accent">there.</em></h1><p className="mt-4 max-w-xl">The rooms open when your application is approved. Meanwhile, check your status on the dashboard. Stuck? Ask our team on <Link className="underline font-bold" href="/contact">the contact page</Link>.</p></div>;
  return (
    <div className="grid gap-5">
      <div><h1 className="text-[length:var(--text-display)]">The <em className="accent">rooms</em></h1><p className="mt-2 max-w-2xl">Talk to your department and the whole movement. Something wrong? Open Support: it is private.</p></div>
      <ChatUI rooms={rooms} self={{ name: shortName(me.first, me.last), label: "Volunteer", staff: false }} />
    </div>
  );
}
