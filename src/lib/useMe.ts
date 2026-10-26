"use client";
import { useRouter } from "next/navigation";
import { logHoursAction } from "@/app/actions/volunteer";
import { useLive } from "./live";
import type { HourLog } from "./types";

/** The signed-in volunteer's own application and hours, from the database. */
export function useMe() {
  const live = useLive();
  const router = useRouter();
  const me = live?.me ?? null;
  const myHours = live?.hours ?? [];
  // rule 7: only approved hours count
  const approved = myHours.filter((h) => h.status === "approved").reduce((s, h) => s + h.hours, 0);
  const pending = myHours.filter((h) => h.status === "pending").reduce((s, h) => s + h.hours, 0);
  return {
    me, myHours, approved, pending,
    /** Returns an error message to show, or null when it was saved. */
    logHours: async (h: Omit<HourLog, "id" | "status" | "method" | "who" | "mine">): Promise<string | null> => {
      const r = await logHoursAction({ activity: h.activity, workedOn: h.date, hours: h.hours });
      if (!r.ok) return r.message;
      router.refresh();
      return null;
    },
  };
}
