"use client";
import Link from "next/link";
import { fmtDate } from "@/lib/data";
import { useState } from "react";
import { useOpps, useSignups } from "@/lib/useOpps";

export default function MyOpportunities() {
  const { ids, statusOf, cancel } = useSignups();
  const { opps } = useOpps();
  const [msg, setMsg] = useState("");
  const mine = opps.filter((o) => ids.includes(o.id));
  return (
    <div>
      <h1 className="text-[length:var(--text-display)]">My <em className="accent">calls</em></h1>
      {msg && <p role="status" className="mt-4 font-bold border-l-4 border-orange pl-3">{msg}</p>}
      <p className="mt-4 max-w-xl">Cancelling frees your slot straight away, so someone else can take your place. Please give as much notice as you can.</p>
      <div className="mt-8 border-t border-ink">
        {mine.map((o) => (
          <article key={o.id} className="grid sm:grid-cols-[1fr_auto] gap-4 py-5 border-b border-rule items-center">
            <div><div className="display text-4xl">{o.title}</div><div className="text-sm mt-1">{fmtDate(o.date)} · {o.place}, {o.state} · {o.commitment}</div>
              {statusOf(o.id) === "waitlisted" && <div className="text-sm font-bold mt-1"><span className="stamp stamp-info">Waitlisted</span> You move up automatically when someone cancels.</div>}
              <div className="text-sm">Your contact on the day: Coordinator, {o.state} chapter</div></div>
            <div className="flex gap-2"><Link className="btn btn-sm" href={`/checkin/${o.id}`}>Check in (QR)</Link><button className="btn btn-sm btn-ghost" onClick={async () => { if (confirm(`Cancel “${o.title}”? Your slot goes to someone else.`)) setMsg((await cancel(o.id)).message); }}>Cancel</button></div>
          </article>
        ))}
        {mine.length === 0 && <div className="py-10"><p className="display text-5xl">No open calls right now.</p><p className="mt-2">You haven&apos;t signed up for anything. New calls drop often.</p><Link href="/opportunities" className="btn mt-4">Find a call to action</Link></div>}
      </div>
    </div>
  );
}
