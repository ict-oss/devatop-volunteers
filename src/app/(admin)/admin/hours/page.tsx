"use client";
import { useState } from "react";
import { fmtDate } from "@/lib/data";
import { KEYS, SEED_APPS, SEED_HOURS, useLocal, type Application, type HourLog } from "@/lib/store";
import { useComms } from "@/lib/useComms";
import { useAdmin } from "@/lib/useAdmin";

export default function AdminHours() {
  const { admin, can, log } = useAdmin();
  const { send } = useComms();
  const [apps] = useLocal<Application[]>(KEYS.apps, SEED_APPS);
  const [hours, setHours] = useLocal<HourLog[]>(KEYS.hours, SEED_HOURS);
  const [sel, setSel] = useState<string[]>([]);
  const pending = hours.filter((h) => h.status === "pending");
  const done = hours.filter((h) => h.status !== "pending").slice(0, 6);
  const act = (ids: string[], status: "approved" | "rejected") => {
    if (!can("hours.approve")) return;
    setHours((p) => p.map((h) => (ids.includes(h.id) ? { ...h, status } : h)));
    ids.forEach((id) => {
      const h = hours.find((x) => x.id === id); if (!h) return;
      log(`Hours ${status}`, `${h.who} · ${h.hours}h`);
      if (status !== "approved") return;
      const a = apps.find((x) => `${x.first} ${x.last}` === h.who);
      if (!a) return; // no email on file for sample-data volunteers
      const total = hours.filter((x) => x.who === h.who && (x.status === "approved" || ids.includes(x.id))).reduce((s, x) => s + x.hours, 0);
      send("thanks", a.email, a.first, { first_name: a.first, hours: h.hours, opportunity_title: h.activity, total_hours: total }, admin.name);
    });
    setSel([]);
  };
  const edit = (h: HourLog) => { const v = prompt(`Edit hours for ${h.who} (was ${h.hours}):`, String(h.hours)); const n = Number(v); if (v !== null && n > 0 && n <= 24) { setHours((p) => p.map((x) => (x.id === h.id ? { ...x, hours: n } : x))); log("Hours edited", `${h.who} ${h.hours}→${n}`); } };
  return (
    <div className="grid gap-6">
      <div><h1 className="text-5xl md:text-7xl">Hours</h1><p className="mt-1 text-sm">Only approved hours count toward totals, certificates and reports.</p></div>
      <div className="flex gap-2 items-center flex-wrap">
        <button className="btn btn-sm btn-ink" disabled={!sel.length || !can("hours.approve")} onClick={() => act(sel, "approved")}>Approve {sel.length || ""} selected</button>
        <button className="btn btn-sm btn-ghost" disabled={!pending.length || !can("hours.approve")} onClick={() => confirm(`Approve all ${pending.length} pending?`) && act(pending.map((h) => h.id), "approved")}>Approve all {pending.length}</button>
        <button className="btn btn-sm btn-ghost" onClick={() => setSel(pending.map((h) => h.id))}>Select all</button>
      </div>
      <div className="overflow-x-auto border-t-2 border-ink">
        <table className="w-full text-left min-w-[640px]">
          <thead><tr className="text-sm"><th className="py-2 w-8"><span className="sr-only">Select</span></th><th>Volunteer</th><th>Activity</th><th>Date</th><th>Hours</th><th>How</th><th className="text-right">Decide</th></tr></thead>
          <tbody>{pending.map((h) => (
            <tr key={h.id} className="border-t border-rule align-top">
              <td className="py-3"><input type="checkbox" className="size-5" aria-label={`Select ${h.who}`} checked={sel.includes(h.id)} onChange={(e) => setSel((p) => e.target.checked ? [...p, h.id] : p.filter((x) => x !== h.id))} /></td>
              <td className="py-3 pr-3 font-bold">{h.who}</td><td className="py-3 pr-3">{h.activity}</td><td className="py-3 pr-3 text-sm whitespace-nowrap">{fmtDate(h.date)}</td>
              <td className="py-3 pr-3 font-bold">{h.hours}</td><td className="py-3 pr-3 text-sm">{h.method}</td>
              <td className="py-3 text-right whitespace-nowrap"><button className="btn btn-sm btn-ink mr-1" disabled={!can("hours.approve")} onClick={() => act([h.id], "approved")}>Approve</button>
                <button className="btn btn-sm btn-ghost mr-1" disabled={!can("hours.approve")} onClick={() => edit(h)}>Edit</button>
                <button className="btn btn-sm btn-ghost" disabled={!can("hours.approve")} onClick={() => confirm("Reject these hours?") && act([h.id], "rejected")}>Reject</button></td>
            </tr>))}</tbody>
        </table>
        {pending.length === 0 && <p className="py-8 text-lg">No hours waiting for approval.</p>}
      </div>
      {done.length > 0 && <details><summary className="font-bold cursor-pointer min-h-11 grid items-center">Recently decided ({done.length})</summary><ul className="mt-2 text-sm">{done.map((h) => <li key={h.id} className="py-1.5 border-t border-rule">{h.who} — {h.activity} — {h.hours}h — <b>{h.status}</b></li>)}</ul></details>}
    </div>
  );
}
