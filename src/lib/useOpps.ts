"use client";
import { OPPORTUNITIES, ROLL, type Opportunity } from "./data";
import { KEYS, useLocal } from "./store";

export const isClosed = (o: Opportunity, now = Date.now()) => now > +new Date(o.deadline + "T23:59:59");

/** Opportunities live in the store so admin-created ones show on the public board straight away. */
export function useOpps() {
  const [opps, setOpps] = useLocal<Opportunity[]>(KEYS.opps, OPPORTUNITIES);
  return { opps, setOpps };
}

/** Prototype roster: anonymous seed names for the already-taken slots, plus the signed-in volunteer if signed up. */
export const rosterFor = (o: Opportunity, meName: string | null, meSigned: boolean) => {
  const seed = ROLL.slice(0, Math.min(o.taken, 12)).map((n, i) => ({ key: `${o.id}-${i}`, who: n.replace(".", ""), mine: false }));
  return meSigned && meName ? [...seed, { key: `${o.id}-me`, who: meName, mine: true }] : seed;
};
