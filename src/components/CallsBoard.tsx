"use client";
import { CallRow } from "./CallRow";
import { isClosed, useOpps } from "@/lib/useOpps";

/** Home page board: newest open calls, read from the same store the admin publishes to. */
export function CallsBoard() {
  const { opps } = useOpps();
  const calls = opps.filter((o) => o.slots - o.taken > 0 && !isClosed(o)).slice(0, 4);
  return (
    <>
      {calls.map((o) => <CallRow key={o.id} o={o} dark />)}
      {calls.length === 0 && <p className="py-8 text-xl">No open calls right now. New ones drop often, so check back.</p>}
      <div className="border-t border-paper/30" />
    </>
  );
}
