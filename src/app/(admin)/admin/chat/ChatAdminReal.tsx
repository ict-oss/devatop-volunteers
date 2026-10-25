"use client";
import { ChatUI } from "@/components/ChatUI";
import { dbChat } from "@/components/chatAdapter";
import type { Room } from "@/lib/chat";
import { ROLE_LABEL } from "@/lib/permissions";
import { useAdmin } from "@/lib/useAdmin";

export function ChatAdminReal({ rooms }: { rooms: Room[] }) {
  const { admin } = useAdmin();
  const moderator = rooms.some((r) => r.canModerate);
  return (
    <div className="grid gap-5">
      <div><h1 className="text-5xl md:text-7xl">Chat</h1><p className="mt-1 text-sm">{moderator ? "You can see every room your role allows, and remove or review reported messages." : "You see the rooms your role allows."} Staff post as &ldquo;Devatop Team&rdquo;.</p></div>
      <ChatUI rooms={rooms} self={{ name: "Devatop Team", label: ROLE_LABEL[admin.role], staff: true }} showReports={moderator} adapter={dbChat} />
    </div>
  );
}
