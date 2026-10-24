"use client";
import { useMemo, useState } from "react";
import { DEPARTMENTS, STATE_NAMES, fmtDate } from "@/lib/data";
import { KEYS, SEED_APPS, ageOf, useLocal, type Application, type Stage } from "@/lib/store";
import { useAdmin } from "@/lib/useAdmin";
import { useComms } from "@/lib/useComms";

/** Rule 6, mirrored from the database constraint: an under-18 cannot be approved without a verified guardian consent. */
function approvalBlocker(a: Application): string | null {
  const age = ageOf(a.dob);
  if (age !== null && age < 18 && !a.guardian?.verified) return "Under 18: guardian consent not verified yet.";
  return null;
}
const PENDING: Stage[] = ["Submitted", "Under review", "Interview", "Needs info"];
const deptName = (id: string) => DEPARTMENTS.find((d) => d.id === id)?.name ?? id;

export default function Applications() {
  const { admin, can, inScope, log } = useAdmin();
  const { send } = useComms();
  const [apps, setApps] = useLocal<Application[]>(KEYS.apps, SEED_APPS);
  const [state, setState] = useState(""); const [dept, setDept] = useState(""); const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]); const [open, setOpen] = useState<string | null>(null); const [msg, setMsg] = useState("");

  const list = useMemo(() => apps
    .filter((a) => PENDING.includes(a.stage) && inScope(a) && (!state || a.state === state) && (!dept || a.departments.includes(dept)) &&
      (!q || `${a.first} ${a.last}`.toLowerCase().includes(q.toLowerCase())))
    .sort((x, y) => +new Date(x.submittedAt) - +new Date(y.submittedAt)), [apps, state, dept, q, inScope]);

  const decide = (ids: string[], stage: Stage, note?: string) => {
    if (!can("applications.decide")) return;
    const blocked: string[] = [];
    setApps((p) => p.map((a) => {
      if (!ids.includes(a.id)) return a;
      if (stage === "Approved") {
        const b = approvalBlocker(a);
        if (b || (ageOf(a.dob)! < 18 && !can("applications.approveMinor"))) { blocked.push(a.first); return a; }
      }
      return { ...a, stage, note: note ?? a.note };
    }));
    ids.forEach((id) => {
      const a = apps.find((x) => x.id === id);
      if (!a || (stage === "Approved" && (approvalBlocker(a) || (ageOf(a.dob)! < 18 && !can("applications.approveMinor"))))) return;
      log(`${stage}`, `${a.first} ${a.last}`);
      const reapply = new Date(Date.now() + 90 * 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      if (stage === "Approved") send("approved", a.email, a.first, { first_name: a.first }, admin.name);
      else if (stage === "Needs info") send("needs_info", a.email, a.first, { first_name: a.first, admin_note: note ?? "" }, admin.name);
      else if (stage === "Rejected") send("not_approved", a.email, a.first, { first_name: a.first, reason: note ? `: ${note}` : "", reapply_date: reapply }, admin.name);
    });
    setSel([]);
    setMsg(blocked.length ? `Not approved: ${blocked.join(", ")}. Under-18 applicants need verified guardian consent first.` : `${ids.length} application${ids.length > 1 ? "s" : ""} marked ${stage}. Email sent.`);
    setTimeout(() => setMsg(""), 4500);
  };
  const reject = (a: Application) => { const reason = prompt(`Reject ${a.first} ${a.last}? Optional short reason (included in the email):`, ""); if (reason !== null) decide([a.id], "Rejected", reason || undefined); };
  const more = (a: Application) => { const note = prompt(`What do you need from ${a.first}? This goes in the email:`, ""); if (note) decide([a.id], "Needs info", note); };
  const approve = (a: Application) => decide([a.id], "Approved");

  const showContact = can("volunteers.contact");
  const showDob = can("volunteers.dob");

  return (
    <div className="grid gap-6">
      <div><h1 className="text-5xl md:text-7xl">Applications</h1><p className="mt-1 text-sm">Pending, oldest first. <a href="/guides" className="underline">How does this work?</a></p></div>

      <div className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        <label><span className="label">Search</span><input className="input" placeholder="Name" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label><span className="label">State</span><select className="input" value={state} onChange={(e) => setState(e.target.value)}><option value="">All</option>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label><span className="label">Programme / department</span><select className="input" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All</option>{DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <button className="btn btn-ghost" disabled={!can("reports.export")} onClick={() => { log("Exported", "applications (totals only)"); setMsg("Export started. Totals only; personal data export is Super Admin only."); }}>Export</button>
      </div>

      {sel.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap border-2 border-ink p-3 bg-orange/20" role="region" aria-label="Bulk actions">
          <b>{sel.length} selected</b>
          <button className="btn btn-sm btn-ink" disabled={!can("applications.decide")} onClick={() => confirm(`Approve ${sel.length} application(s)?`) && decide(sel, "Approved")}>Approve</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setSel([])}>Clear</button>
        </div>
      )}
      {msg && <p role="status" className="font-bold border-l-4 border-orange pl-3">{msg}</p>}

      <div className="overflow-x-auto border-t-2 border-ink">
        <table className="w-full text-left min-w-[760px]">
          <thead><tr className="text-sm"><th className="py-2 w-8"><span className="sr-only">Select</span></th><th>Applicant</th><th>State</th><th>Interests</th><th>Waiting</th><th>Status</th><th className="text-right pr-1">Decide</th></tr></thead>
          <tbody>
            {list.map((a) => {
              const age = ageOf(a.dob); const block = approvalBlocker(a);
              const days = Math.max(0, Math.round((Date.now() - +new Date(a.submittedAt)) / 864e5));
              return (
                <>
                  <tr key={a.id} className="border-t border-rule align-top">
                    <td className="py-3"><input type="checkbox" className="size-5" aria-label={`Select ${a.first} ${a.last}`} checked={sel.includes(a.id)} onChange={(e) => setSel((p) => e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id))} /></td>
                    <td className="py-3 pr-3"><button className="font-bold underline text-left" onClick={() => setOpen(open === a.id ? null : a.id)} aria-expanded={open === a.id}>{a.first} {a.last}{a.mine && " (you)"}</button>
                      {age !== null && age < 18 && <span className="stamp stamp-info ml-2">Under 18</span>}</td>
                    <td className="py-3 pr-3">{a.state}</td>
                    <td className="py-3 pr-3 text-sm">{a.departments.map(deptName).join(", ")}</td>
                    <td className="py-3 pr-3 text-sm">{days}d</td>
                    <td className="py-3 pr-3"><span className={`stamp ${a.stage === "Needs info" ? "stamp-info" : "stamp-wait"}`}>{a.stage}</span></td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button className="btn btn-sm btn-ink mr-1" disabled={!can("applications.decide") || !!block} title={block ?? "Approve"} onClick={() => approve(a)}>Approve</button>
                      <button className="btn btn-sm btn-ghost mr-1" disabled={!can("applications.decide")} onClick={() => more(a)}>More info</button>
                      <button className="btn btn-sm btn-ghost" disabled={!can("applications.decide")} onClick={() => reject(a)}>Reject</button>
                    </td>
                  </tr>
                  {open === a.id && (
                    <tr key={a.id + "x"} className="bg-white/50"><td /><td colSpan={6} className="py-4 pr-4">
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div><b>Skills</b><br />{a.skills.join(", ")}<br /><b className="block mt-2">Availability</b>{a.availability}<br /><b className="block mt-2">Languages</b>{a.languages.join(", ")}</div>
                        <div><b>Contact</b><br />{showContact ? <>{a.email}<br />{a.phone}</> : <span className="opacity-60">Hidden for your role</span>}<br /><b className="block mt-2">Date of birth</b>{showDob ? `${fmtDate(a.dob)} (${age})` : <span className="opacity-60">Hidden for your role</span>}
                          <br /><b className="block mt-2">Applied</b>{fmtDate(a.submittedAt.slice(0, 10))}</div>
                        <div><b>Consents on record</b>{a.consents.length ? <ul className="list-disc pl-4">{a.consents.map((c) => <li key={c.key}>{c.key} · {c.version}</li>)}</ul> : <p className="opacity-60">None recorded (seed data)</p>}
                          {age !== null && age < 18 && <p className={`mt-2 font-bold ${a.guardian?.verified ? "text-stamp" : "text-alert"}`}>Guardian: {a.guardian ? `${a.guardian.name} — ${a.guardian.verified ? "verified" : "not verified"}` : "none"}</p>}
                          {block && <p className="text-alert font-bold mt-1">{block} The database refuses this approval.</p>}</div>
                      </div>
                    </td></tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <p className="py-8 text-lg">Nothing waiting{state || dept || q ? " with these filters" : ""}. Nice work.</p>}
      </div>
      <p className="text-xs opacity-60">Every decision is written to the audit log with {admin.name}&apos;s name and the time.</p>
    </div>
  );
}
