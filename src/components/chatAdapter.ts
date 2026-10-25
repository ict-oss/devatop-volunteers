"use client";
import { chatLoadAction, chatModerateAction, chatReportedAction, chatSendAction } from "@/app/actions/volunteer";
import type { Msg } from "@/lib/chat";
import type { ChatAdapter } from "@/components/ChatUI";

/** Connects the chat screen to the database through server actions. The database decides who can read, post and moderate. */
export const dbChat: ChatAdapter = {
  load: async (room) => { const r = await chatLoadAction(room); return r.ok ? (r.data as Msg[]) : null; },
  reported: async () => { const r = await chatReportedAction(); return r.ok ? (r.data as Msg[]) : null; },
  send: async (room, text) => { const r = await chatSendAction(room, text); return r.ok ? null : r.message; },
  moderate: async (kind, id) => { const r = await chatModerateAction(kind, id); return r.ok ? null : r.message; },
};
