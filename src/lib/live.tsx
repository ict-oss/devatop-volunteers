"use client";
import { createContext, useContext } from "react";
import type { Opportunity } from "./data";
import type { Announcement } from "./useComms";
import type { Application, HourLog } from "./store";
import type { CertificateView } from "./services/certificates";
import type { StartItem } from "./services/portal";

/**
 * Real data for the public and volunteer screens, read on the server and handed down once AUTH_ENABLED=true.
 * The hooks (useMe, useOpps, useSignups, useComms) return this instead of the browser-storage prototype data,
 * so the screens built on the prototype keep working unchanged. `null` means prototype mode.
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
  announcements: Announcement[];
  whatsappGroup: string;
  reviewDays: number;
};
const LiveContext = createContext<LiveData | null>(null);
export const LiveProvider = ({ value, children }: { value: LiveData | null; children: React.ReactNode }) => <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
export const useLive = () => useContext(LiveContext);
