"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { cancelSignupAction, signUpAction } from "@/app/actions/volunteer";
import type { Opportunity } from "./data";
import { useLive } from "./live";

export const isClosed = (o: Opportunity, now = Date.now()) => now > +new Date(o.deadline + "T23:59:59");

/** The public board: calls read from the database on the server. */
export function useOpps() {
  return { opps: useLive()?.opps ?? [] };
}

export type SignupOutcome = { ok: boolean; message: string };

/** My sign-ups. The database decides confirmed or waitlisted and refuses when closed. */
export function useSignups() {
  const live = useLive();
  const router = useRouter();
  const ids = live ? Object.keys(live.signups) : [];
  const statusOf = useCallback((id: string) => live?.signups[id], [live]);

  const signUp = useCallback(async (o: Opportunity): Promise<SignupOutcome> => {
    const r = await signUpAction(o.id);
    if (!r.ok) return { ok: false, message: r.code === "signed_out" ? "Sign in first, then tap sign up again." : r.message };
    router.refresh();
    return { ok: true, message: r.data.status === "waitlisted" ? `You're on the waitlist for “${o.title}”.` : `Signed up for “${o.title}”. Check your dashboard.` };
  }, [router]);

  const cancel = useCallback(async (id: string): Promise<SignupOutcome> => {
    const r = await cancelSignupAction(id);
    if (!r.ok) return { ok: false, message: r.message };
    router.refresh();
    return { ok: true, message: "Cancelled. Your slot goes to someone else." };
  }, [router]);

  return { ids, statusOf, signUp, cancel, signedIn: live?.signedIn ?? false };
}
