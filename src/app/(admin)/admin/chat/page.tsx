"use client";
import { useMemo } from "react";
import { ChatUI } from "@/components/ChatUI";
import { SEED_CHAT, adminRooms, type Msg } from "@/lib/chat";
import { DEPARTMENTS, type Department } from "@/lib/data";
import { KEYS, useLocal } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/permissions";
import { useAdmin } from "@/lib/useAdmin";

export default function AdminChat() {
  const { admin, can, log } = useAdmin();
  const [depts] = useLocal<Department[]>(KEYS.depts, DEPARTMENTS);
  const [msgs] = useLocal<Msg[]>(KEYS.chat, SEED_CHAT);
  // support threads = one private room per volunteer who has written to Support
  const threads = useMemo(() => {
    const m = new Map<string, string>();
    msgs.filter((x) => x.room.startsWith("support:") && !x.staff).forEach((x) => m.set(x.room, x.who));
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [msgs]);
  const rooms = useMemo(() => adminRooms(admin, depts, threads), [admin, depts, threads]);
  const moderator = admin.role === "super" || admin.role === "programme" || admin.role === "coordinator";
  return (
    <div className="grid gap-5">
      <div><h1 className="text-5xl md:text-7xl">Chat</h1><p className="mt-1 text-sm">{can("overview") && (moderator ? "You can see every room and every support thread." : "You see the rooms your role covers.")}</p></div>
      <ChatUI rooms={rooms} self={{ name: admin.name, label: ROLE_LABEL[admin.role], staff: true }} showReports={moderator} onModerate={(a, m) => log(a, `${m.who} in ${m.room}`)} />
    </div>
  );
}
