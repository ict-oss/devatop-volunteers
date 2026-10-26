"use client";
import { useMemo } from "react";
import { DEFAULT_SETTINGS, type Settings } from "./emails";
import { useLive } from "./live";

export type Announcement = { id: string; at: string; by: string; title: string; body: string };

/** What a volunteer sees from Devatop: the announcements board and the WhatsApp group link (both from the database). */
export function useComms() {
  const live = useLive();
  const settings: Settings = useMemo(() => ({ ...DEFAULT_SETTINGS, whatsappGroup: live?.whatsappGroup ?? "", reviewDays: live?.reviewDays ?? DEFAULT_SETTINGS.reviewDays }), [live]);
  return { settings, announcements: live?.announcements ?? [] };
}
