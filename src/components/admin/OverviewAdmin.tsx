"use client";
import Link from "next/link";
import { fmtDate, money } from "@/lib/data";
import type { Overview } from "@/lib/services/overview";
import { useAdmin } from "@/lib/useAdmin";

export function OverviewAdmin({ o }: { o: Overview }) {
  const { admin, can } = useAdmin();
  return (
    <div className="grid gap-10">
      <div><h1 className="text-5xl md:text-7xl">What needs you <em className="accent">today</em></h1>
        <p className="mt-2 text-sm opacity-75">{admin.role === "state" ? `Showing ${admin.scope} only.` : admin.role === "department" ? "Showing your department only." : "Showing everything your role can see."}</p></div>
      <section className="grid md:grid-cols-3 gap-0 border-2 border-ink" aria-label="Needs attention">
        {([[o.pendingApplications, "applications waiting", "/admin/applications", can("applications.decide")], [o.pendingHours, "hours waiting for approval", "/admin/hours", can("hours.approve")], [o.eventsThisWeek, "events this week", "/admin/opportunities", can("opportunities.edit")]] as const).map(([n, l, href, ok], i) => (
          <div key={l} className={`p-5 ${i > 0 ? "md:border-l-2 border-t-2 md:border-t-0 border-ink" : ""}`}>
            <div className="display text-8xl leading-[0.85]">{n}</div><div className="font-bold mt-1">{l}</div>
            {ok ? <Link href={href} className="btn btn-sm mt-3">Open</Link> : <span className="text-sm opacity-60 block mt-3">Not in your role</span>}
          </div>))}
      </section>
      <section aria-label="Numbers">
        <h2 className="text-3xl">Overview</h2>
        <dl className="mt-3 grid grid-cols-2 md:grid-cols-5 border-t border-ink">
          {([["Total volunteers", o.totalVolunteers], ["Active volunteers", o.activeVolunteers], ["New sign-ups, 30 days", o.newThisMonth], ["Approved hours", o.totalHours], ["Upcoming events", o.upcomingEvents]] as const).map(([k, v]) => <div key={k} className="py-4 pr-4 border-b border-rule"><dt className="text-sm font-bold">{k}</dt><dd className="display text-5xl mt-1">{money(v)}</dd></div>)}
        </dl>
        <p className="text-xs opacity-60 mt-2">Live from the database, inside your area. Only approved hours are counted.</p>
      </section>
      <section><h2 className="text-3xl">This week</h2>
        <ul className="mt-3 border-t border-ink">{o.thisWeek.map((e) => (
          <li key={e.id} className="py-3 border-b border-rule flex justify-between gap-4 flex-wrap"><span><b>{e.title}</b><br /><span className="text-sm">{fmtDate(e.startsAt.slice(0, 10))} · {e.place}</span></span><span className="font-bold">{e.taken}/{e.slots} signed up</span></li>))}</ul>
        {o.thisWeek.length === 0 && <p className="py-4">Nothing scheduled this week.</p>}
      </section>
    </div>
  );
}
