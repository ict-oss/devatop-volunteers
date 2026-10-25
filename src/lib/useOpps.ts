"use client";
import { OPPORTUNITIES, ROLL, type Opportunity } from "./data";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { cancelSignupAction, signUpAction } from "@/app/actions/volunteer";
import { useLive } from "./live";
import { KEYS, useLocal } from "./store";

export const isClosed = (o: Opportunity, now = Date.now()) => now > +new Date(o.deadline + "T23:59:59");

/** Opportunities live in the store so admin-created ones show on the public board straight away. */
export function useOpps() {
  const live = useLive();
  const [opps, setOpps] = useLocal<Opportunity[]>(KEYS.opps, OPPORTUNITIES);
  // real mode: the board comes from the database (read on the server)
  return live ? { opps: live.opps, setOpps: (() => {}) as typeof setOpps } : { opps, setOpps };
}

const EMPTY_IDS: string[] = [];
export type SignupOutcome = { ok: boolean; message: string };

/** My sign-ups. Prototype: ids in browser storage. Real: the database decides confirmed or waitlisted and refuses when closed. */
export function useSignups() {
  const live = useLive();
  const router = useRouter();
  const [local, setLocal] = useLocal<string[]>(KEYS.signups, EMPTY_IDS);
  const ids = live ? Object.keys(live.signups) : local;
  const statusOf = useCallback((id: string) => (live ? live.signups[id] : local.includes(id) ? ("confirmed" as const) : undefined), [live, local]);

  const signUp = useCallback(async (o: Opportunity): Promise<SignupOutcome> => {
    if (!live) {
      setLocal((p) => (p.includes(o.id) ? p : [...p, o.id]));
      return { ok: true, message: o.slots - o.taken <= 0 ? `You're on the waitlist for “${o.title}”.` : `Signed up for “${o.title}”. Check your dashboard.` };
    }
    const r = await signUpAction(o.id);
    if (!r.ok) return { ok: false, message: r.code === "signed_out" ? "Sign in first, then tap sign up again." : r.message };
    router.refresh();
    return { ok: true, message: r.data.status === "waitlisted" ? `You're on the waitlist for “${o.title}”.` : `Signed up for “${o.title}”. Check your dashboard.` };
  }, [live, router, setLocal]);

  const cancel = useCallback(async (id: string): Promise<SignupOutcome> => {
    if (!live) { setLocal((p) => p.filter((x) => x !== id)); return { ok: true, message: "Cancelled. Your slot goes to someone else." }; }
    const r = await cancelSignupAction(id);
    if (!r.ok) return { ok: false, message: r.message };
    router.refresh();
    return { ok: true, message: "Cancelled. Your slot goes to someone else." };
  }, [live, router, setLocal]);

  return { ids, statusOf, signUp, cancel, real: !!live, signedIn: live ? live.signedIn : true };
}

/** Prototype roster: anonymous seed names for the already-taken slots, plus the signed-in volunteer if signed up. */
export const rosterFor = (o: Opportunity, meName: string | null, meSigned: boolean) => {
  const seed = ROLL.slice(0, Math.min(o.taken, 12)).map((n, i) => ({ key: `${o.id}-${i}`, who: n.replace(".", ""), mine: false }));
  return meSigned && meName ? [...seed, { key: `${o.id}-me`, who: meName, mine: true }] : seed;
};
