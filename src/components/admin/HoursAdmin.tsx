"use client";
import { useState } from "react";
import { decideHoursAction, editHoursAction } from "@/app/actions/admin";
import { fmtDate } from "@/lib/data";
import type { HourView } from "@/lib/services/hours";
import { useAdmin } from "@/lib/useAdmin";
import { useAct } from "./useAct";

/** Hours waiting for approval. Only approved hours count (rule 7); the database refuses anyone who may not decide them. */
export function HoursAdmin({ pending, recent }: { pending: HourView[]; recent: HourView[] }) {
  const { can } = useAdmin();
  const { act, busy, note } = useAct();
  const [sel, setSel] = useState<string[]>([]);
  const ok = can("hours.approve");
  const decide = async (ids: string[], decision: "approved" | "rejected") => {
    await act(decideHoursAction({ ids, decision }), (d) => `${d.done.length} ${decision}.${d.refused.length ? ` Not done: ${d.refused[0].message}` : ""}${decision === "approved" ? " Thank-you emails sent." : ""}`);
    setSel([]);
  };
  const edit = async (h: HourView) => { const v = prompt(`Edit hours for ${h.who} (was ${h.hours}):`, String(h.hours)); const n = Number(v); if (v !== null) await act(editHoursAction(h.id, n), "Hours corrected."); };
  return (
    <div className="grid gap-6">
      <div><h1 className="text-5xl md:text-7xl">Hours</h1><p className="mt-1 text-sm">Only approved hours count toward totals, certificates and reports.</p></div>
      <div className="flex gap-2 items-center flex-wrap">
        <button className="btn btn-sm btn-ink" disabled={busy || !sel.length || !ok} onClick={() => decide(sel, "approved")}>Approve {sel.length || ""} selected</button>
        <button className="btn btn-sm btn-ghost" disabled={busy || !pending.length || !ok} onClick={() => confirm(`Approve all ${pending.length} pending?`) && decide(pending.map((h) => h.id), "approved")}>Approve all {pending.length}</button>
        <button className="btn btn-sm btn-ghost" onClick={() => setSel(pending.map((h) => h.id))}>Select all</button>
      </div>
      {note}
      <div className="overflow-x-auto border-t-2 border-ink">
        <table className="w-full text-left min-w-[640px]">
          <thead><tr className="text-sm"><th className="py-2 w-8"><span className="sr-only">Select</span></th><th>Volunteer</th><th>Activity</th><th>Date</th><th>Hours</th><th>How</th><th className="text-right">Decide</th></tr></thead>
          <tbody>{pending.map((h) => (
            <tr key={h.id} className="border-t border-rule align-top">
              <td className="py-3"><input type="checkbox" className="size-5" aria-label={`Select ${h.who}`} checked={sel.includes(h.id)} onChange={(e) => setSel((p) => e.target.checked ? [...p, h.id] : p.filter((x) => x !== h.id))} /></td>
              <td className="py-3 pr-3 font-bold">{h.who}</td><td className="py-3 pr-3">{h.activity}</td><td className="py-3 pr-3 text-sm whitespace-nowrap">{fmtDate(h.date)}</td>
              <td className="py-3 pr-3 font-bold">{h.hours}</td><td className="py-3 pr-3 text-sm">{h.method}</td>
              <td className="py-3 text-right whitespace-nowrap"><button className="btn btn-sm btn-ink mr-1" disabled={busy || !ok} onClick={() => decide([h.id], "approved")}>Approve</button>
                <button className="btn btn-sm btn-ghost mr-1" disabled={busy || !ok} onClick={() => edit(h)}>Edit</button>
                <button className="btn btn-sm btn-ghost" disabled={busy || !ok} onClick={() => confirm("Reject these hours?") && decide([h.id], "rejected")}>Reject</button></td>
            </tr>))}</tbody>
        </table>
        {pending.length === 0 && <p className="py-8 text-lg">No hours waiting for approval.</p>}
      </div>
      {recent.length > 0 && <details><summary className="font-bold cursor-pointer min-h-11 grid items-center">Recently decided ({recent.length})</summary><ul className="mt-2 text-sm">{recent.map((h) => <li key={h.id} className="py-1.5 border-t border-rule">{h.who}: {h.activity}, {h.hours}h, <b>{h.status}</b></li>)}</ul></details>}
    </div>
  );
}
