"use client";
import { createContext, useContext } from "react";
import type { Opportunity } from "./data";
import type { Announcement } from "./useComms";
import type { Application, HourLog } from "./types";
import type { CertificateView } from "./services/certificates";
import type { StartItem } from "./services/portal";
import type { GuideView } from "./services/profile";
import { setReplacedImages, type ReplacedImage } from "./images";

/**
 * Real data for the public and volunteer screens, read on the server and handed down to the screens.
 * The hooks (useMe, useOpps, useSignups, useComms) return this to the screens.
 */
export type LiveData = {
  signedIn: boolean;
  opps: Opportunity[];
  /** calls open for QR check-in right now */
  checkin: Opportunity[];
  signups: Record<string, "confirmed" | "waitlisted">;
  me: Application | null;
  hours: HourLog[];
  certs: CertificateView[];
  startHere: StartItem[];
  guides: GuideView[];
  announcements: Announcement[];
  whatsappGroup: string;
  reviewDays: number;
  /** pictures and clips an admin replaced (Admin > Site images), by slot id */
  images: Record<string, ReplacedImage>;
};
const LiveContext = createContext<LiveData | null>(null);
export const LiveProvider = ({ value, children }: { value: LiveData | null; children: React.ReactNode }) => {
  setReplacedImages(value?.images ?? {}); // before the pictures draw, on the server and in the browser
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
};
export const useLive = () => useContext(LiveContext);
