"use client";
import { useMemo, useState } from "react";
import { DEPARTMENTS, STATE_NAMES } from "@/lib/data";
import { KEYS, SEED_APPS, useLocal, type Application } from "@/lib/store";
import { useAdmin } from "@/lib/useAdmin";
import { waLink } from "@/lib/emails";

export function VolunteersProto() {
  const { can, inScope } = useAdmin();
  const [apps] = useLocal<Application[]>(KEYS.apps, SEED_APPS);
  const [q, setQ] = useState(""); const [state, setState] = useState("");
  const list = useMemo(() => apps.filter((a) => inScope(a) && (!state || a.state === state) && (!q || `${a.first} ${a.last}`.toLowerCase().includes(q.toLowerCase()))), [apps, q, state, inScope]);
  const contact = can("volunteers.contact");
  const status = (a: Application) => (a.stage === "Approved" ? "Active" : a.stage === "Rejected" ? "Inactive" : "Applicant");
  return (
    <div className="grid gap-6">
      <div><h1 className="text-5xl md:text-7xl">Volunteers</h1><p className="mt-1 text-sm">{contact ? "Phone and email visible for your role." : "Names only for your role."}</p></div>
      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <label><span className="label">Search</span><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" /></label>
        <label><span className="label">State</span><select className="input" value={state} onChange={(e) => setState(e.target.value)}><option value="">All</option>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <button className="btn btn-ghost" disabled={!can("export.personal")} title={can("export.personal") ? "" : "Personal-data export is Super Admin only"}>Export contacts (Super Admin)</button>
      </div>
      <div className="overflow-x-auto border-t-2 border-ink">
        <table className="w-full text-left min-w-[640px]"><thead><tr className="text-sm"><th className="py-2">Name</th><th>State</th><th>Departments</th><th>Contact</th><th>WhatsApp</th><th>Status</th></tr></thead>
          <tbody>{list.map((a) => (
            <tr key={a.id} className="border-t border-rule"><td className="py-3 font-bold">{a.first} {a.last}</td><td>{a.state}</td><td className="text-sm">{a.departments.map((d) => DEPARTMENTS.find((x) => x.id === d)?.name).join(", ")}</td>
              <td className="text-sm">{contact ? <>{a.phone}<br />{a.email}</> : <span className="opacity-50">Hidden</span>}</td><td>{contact ? <a className="underline font-bold text-sm" target="_blank" rel="noreferrer" href={waLink(a.phone, `Hi ${a.first}, this is Devatop Volunteers.`)}>Chat</a> : <span className="opacity-50 text-sm">Hidden</span>}</td><td><span className="stamp stamp-wait">{status(a)}</span></td></tr>))}</tbody></table>
        {list.length === 0 && <p className="py-8">No volunteers match.</p>}
      </div>
    </div>
  );
}
