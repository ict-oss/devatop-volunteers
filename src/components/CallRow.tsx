"use client";
import Link from "next/link";
import { type Opportunity, fmtDate } from "@/lib/data";
import { InkCircle } from "./Marks";
import { isClosed } from "@/lib/useOpps";

/** An opportunity set like an urgent dispatch notice: place, date, hands needed, slots left. */
export function CallRow({ o, dark = false, onSignup, signedUp }: { o: Opportunity; dark?: boolean; onSignup?: (o: Opportunity) => void; signedUp?: boolean }) {
  const left = o.slots - o.taken;
  const full = left <= 0;
  const closed = isClosed(o);
  const line = dark ? "border-paper/30" : "border-ink";
  const act = (
    <span className={`btn btn-sm ${dark ? "" : ""}`}>{full ? "Join waitlist" : signedUp ? "Signed up ✓" : "Sign up"}</span>
  );
  return (
    <article className={`group grid md:grid-cols-12 gap-x-6 gap-y-3 py-6 border-t ${line} items-start`} data-cursor={full ? "Waitlist" : "Sign up"}>
      <div className="md:col-span-2">
        <div className="display text-5xl md:text-6xl leading-none">{fmtDate(o.date).split(" ").slice(0, 2).join(" ")}</div>
        <div className="text-sm mt-1 opacity-80">{o.mode} · {o.commitment}</div>
      </div>
      <div className="md:col-span-6">
        {o.urgent && <span className="stamp stamp-info mb-2 mr-2" style={dark ? { color: "#F05023" } : undefined}>Urgent</span>}
        <span className="text-sm font-bold uppercase tracking-wider opacity-80">{o.programme}</span>
        <h3 className="display text-3xl md:text-4xl leading-[0.95] mt-1" style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}>{o.title}</h3>
        <p className="mt-2 max-w-xl opacity-90">{o.blurb}</p>
        <p className="mt-2 text-sm"><b>{o.state}</b> — {o.place} · Skills: {o.skills.join(", ")} · Apply by {fmtDate(o.deadline)}</p>
      </div>
      <div className="md:col-span-2 relative">
        <div className="relative inline-block px-4 py-1">
          <span className="display text-6xl leading-none">{full ? 0 : left}</span>
          {!full && left <= 6 && <InkCircle className="absolute -inset-2 w-[calc(100%+1rem)] h-[calc(100%+1rem)] text-orange" />}
        </div>
        <div className="text-sm">{full ? "slots left — full" : `slot${left === 1 ? "" : "s"} left`}</div>
      </div>
      <div className="md:col-span-2 md:text-right">
        {onSignup ? (
          <button className={`btn btn-sm`} onClick={() => onSignup(o)} disabled={signedUp || closed} data-magnetic>{closed ? "Closed" : full ? "Join waitlist" : signedUp ? "Signed up ✓" : "Sign up"}</button>
        ) : (
          <Link href={`/opportunities#${o.id}`} className="inline-block" data-magnetic>{act}</Link>
        )}
      </div>
    </article>
  );
}
