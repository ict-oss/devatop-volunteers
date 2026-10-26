"use client";
import { useMemo, useState } from "react";
import { setVolunteerStatusAction } from "@/app/actions/admin";
import { STATE_NAMES } from "@/lib/data";
import { waLink } from "@/lib/emails";
import type { VolunteerRow } from "@/lib/services/overview";
import { useAdmin } from "@/lib/useAdmin";
import { useAct } from "./useAct";

const LABEL: Record<string, string> = { applicant: "Applicant", active: "Active", inactive: "Inactive", suspended: "Suspended", alumni: "Alumni" };

export function VolunteersAdmin({ rows }: { rows: VolunteerRow[] }) {
  const { can } = useAdmin();
  const { act, busy, note } = useAct();
  const canStatus = can("volunteers.suspend");
  const change = (a: VolunteerRow, status: "active" | "suspended" | "alumni", ask: string, done: string) => { if (confirm(`${ask}\n\n${a.first} ${a.last}. This is logged.`)) return act(setVolunteerStatusAction({ userId: a.userId, status }), done); };
  const [q, setQ] = useState(""); const [state, setState] = useState(""); const [status, setStatus] = useState("");
  const list = useMemo(() => rows.filter((a) => (!state || a.state === state) && (!status || a.status === status) && (!q || `${a.first} ${a.last}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, state, status]);
  const contact = can("volunteers.contact");
  return (
    <div className="grid gap-6">
      <div><h1 className="text-5xl md:text-7xl">Volunteers</h1><p className="mt-1 text-sm">{contact ? "Phone and email visible for your role." : "Names only for your role."} {rows.length} in your area.</p></div>
      {note}
      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <label><span className="label">Search</span><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" /></label>
        <label><span className="label">State</span><select className="input" value={state} onChange={(e) => setState(e.target.value)}><option value="">All</option>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label><span className="label">Status</span><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{Object.entries(LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      <div className="overflow-x-auto border-t-2 border-ink">
        <table className="w-full text-left min-w-[760px]"><thead><tr className="text-sm"><th className="py-2">Name</th><th>State</th><th>Departments</th><th>Hours</th><th>Contact</th><th>WhatsApp</th><th>Status</th>{canStatus && <th><span className="sr-only">Actions</span></th>}</tr></thead>
          <tbody>{list.map((a) => (
            <tr key={a.userId} className="border-t border-rule"><td className="py-3 font-bold">{a.first} {a.last}</td><td>{a.state}</td><td className="text-sm">{a.departments.join(", ") || <span className="opacity-50">&mdash;</span>}</td><td className="font-bold">{a.approvedHours}</td>
              <td className="text-sm">{contact && a.phone ? <>{a.phone}<br />{a.email}</> : <span className="opacity-50">Hidden</span>}</td>
              <td>{contact && a.phone ? <a className="underline font-bold text-sm" target="_blank" rel="noreferrer" href={waLink(a.phone, `Hi ${a.first}, this is Devatop Volunteers.`)}>Chat</a> : <span className="opacity-50 text-sm">&mdash;</span>}</td>
              <td><span className={`stamp ${a.status === "active" ? "stamp-ok" : a.status === "suspended" ? "stamp-bad" : "stamp-wait"}`}>{LABEL[a.status] ?? a.status}</span></td>
              {canStatus && <td className="text-right whitespace-nowrap">
                {a.status === "active" && <><button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => change(a, "suspended", "Suspend this volunteer? They lose access to calls and their upcoming sign-ups are cancelled.", "Suspended.")}>Suspend</button> <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => change(a, "alumni", "Mark as alumni? They are no longer an active volunteer, and their record and certificates stay.", "Marked as alumni.")}>Alumni</button></>}
                {(a.status === "suspended" || a.status === "inactive" || a.status === "alumni") && <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => change(a, "active", "Make this volunteer active again?", "Active again.")}>Reactivate</button>}
              </td>}</tr>))}</tbody></table>
        {list.length === 0 && <p className="py-8">No volunteers match.</p>}
      </div>
    </div>
  );
}
