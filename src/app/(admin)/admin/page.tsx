"use client";
import Link from "next/link";
import { OPPORTUNITIES, TOTALS, fmtDate, money } from "@/lib/data";
import { KEYS, SEED_APPS, SEED_HOURS, useLocal, type Application, type HourLog } from "@/lib/store";
import { useAdmin } from "@/lib/useAdmin";

export default function AdminToday() {
  const { admin, can, inScope } = useAdmin();
  const [apps] = useLocal<Application[]>(KEYS.apps, SEED_APPS);
  const [hours] = useLocal<HourLog[]>(KEYS.hours, SEED_HOURS);
  const scoped = apps.filter(inScope);
  const pendingApps = scoped.filter((a) => a.stage === "Submitted" || a.stage === "Under review" || a.stage === "Interview");
  const pendingHours = hours.filter((h) => h.status === "pending");
  const week = OPPORTUNITIES.slice(0, 3);
  const volunteersThisMonth = scoped.filter((a) => Date.now() - +new Date(a.submittedAt) < 30 * 864e5).length;

  return (
    <div className="grid gap-10">
      <div><h1 className="text-5xl md:text-7xl">What needs you <em className="accent">today</em></h1>
        <p className="mt-2 text-sm opacity-75">{admin.role === "state" ? `Showing ${admin.scope} only.` : admin.role === "department" ? "Showing your department only." : "Showing everything your role can see."}</p></div>

      <section className="grid md:grid-cols-3 gap-0 border-2 border-ink" aria-label="Needs attention">
        {[
          [pendingApps.length, "applications waiting", "/admin/applications", can("applications.decide")],
          [pendingHours.length, "hours waiting for approval", "/admin/hours", can("hours.approve")],
          [week.length, "events this week", "/admin", true],
        ].map(([n, l, href, ok], i) => (
          <div key={l as string} className={`p-5 ${i > 0 ? "md:border-l-2 border-t-2 md:border-t-0 border-ink" : ""}`}>
            <div className="display text-8xl leading-[0.85]">{n as number}</div>
            <div className="font-bold mt-1">{l as string}</div>
            {ok ? <Link href={href as string} className="btn btn-sm mt-3">Open</Link> : <span className="text-sm opacity-60 block mt-3">Not in your role</span>}
          </div>
        ))}
      </section>

      <section aria-label="Numbers">
        <h2 className="text-3xl">Overview</h2>
        <dl className="mt-3 grid grid-cols-2 md:grid-cols-5 border-t border-ink">
          {[
            ["Total volunteers", money(TOTALS.volunteers)], ["Active volunteers", money(Math.round(TOTALS.volunteers * 0.62))], ["New sign-ups this month", String(volunteersThisMonth + 41)],
            ["Total hours", money(TOTALS.hours)], ["Upcoming events", String(OPPORTUNITIES.length)],
          ].map(([k, v]) => <div key={k} className="py-4 pr-4 border-b border-rule"><dt className="text-sm font-bold">{k}</dt><dd className="display text-5xl mt-1">{v}</dd></div>)}
        </dl>
        <p className="text-xs opacity-60 mt-2">Prototype numbers: sample totals plus what is in this browser. Production reads the database.</p>
      </section>

      <section>
        <h2 className="text-3xl">This week</h2>
        <ul className="mt-3 border-t border-ink">{week.map((o) => (
          <li key={o.id} className="py-3 border-b border-rule flex justify-between gap-4 flex-wrap"><span><b>{o.title}</b><br /><span className="text-sm">{fmtDate(o.date)} · {o.place}, {o.state}</span></span><span className="font-bold">{o.taken}/{o.slots} signed up</span></li>))}</ul>
      </section>
    </div>
  );
}
