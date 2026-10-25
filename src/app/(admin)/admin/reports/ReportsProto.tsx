"use client";
import { useMemo, useState } from "react";
import { DEPARTMENTS, PROGRAMMES, STATE_NAMES, money } from "@/lib/data";
import { KEYS, SEED_APPS, SEED_HOURS, useLocal, type Application, type HourLog } from "@/lib/store";
import { download, toCsv, toXlsx, type Cell } from "@/lib/export";
import { useOpps } from "@/lib/useOpps";
import { useAdmin } from "@/lib/useAdmin";

type Group = "Programme" | "State" | "Event" | "Month";
// Seed logs predate programme/state tagging, so infer from the activity name. New logs carry both fields.
const SEED_META: [RegExp, string, string][] = [
  [/AI4Rights/i, "AI4Rights", "Lagos"], [/awareness walk/i, "Programmes and Field Outreach", "Lagos"], [/Social media/i, "Communications and Media", "Remote (any state)"],
  [/Youth summit/i, "Events and Logistics", "Lagos"], [/Policy brief/i, "Policy and Research", "Remote (any state)"], [/Talkam/i, "Talkam", "Kano"],
];
const meta = (h: HourLog, opps: { title: string; programme: string; state: string }[]) => {
  if (h.programme && h.state) return { programme: h.programme, state: h.state };
  const o = opps.find((x) => x.title === h.activity);
  if (o) return { programme: o.programme, state: o.state };
  const s = SEED_META.find(([re]) => re.test(h.activity));
  return { programme: s?.[1] ?? "Unassigned", state: s?.[2] ?? "Unassigned" };
};
const month = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "numeric" });

export function ReportsProto() {
  const { admin, can, inScope, log } = useAdmin();
  const { opps } = useOpps();
  const [hours] = useLocal<HourLog[]>(KEYS.hours, SEED_HOURS);
  const [apps] = useLocal<Application[]>(KEYS.apps, SEED_APPS);
  const [prog, setProg] = useState(""); const [state, setState] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [by, setBy] = useState<Group>("Programme");
  const [msg, setMsg] = useState("");

  const rows = useMemo(() => hours.map((h) => ({ h, ...meta(h, opps) }))
    .filter((r) => inScope({ state: r.state === "Remote (any state)" ? undefined : r.state }) || r.state === "Remote (any state)")
    .filter((r) => (!prog || r.programme === prog) && (!state || r.state === state) && (!from || r.h.date >= from) && (!to || r.h.date <= to)), [hours, opps, prog, state, from, to, inScope]);

  const approved = rows.filter((r) => r.h.status === "approved");   // only approved hours count (rule 7)
  const pending = rows.filter((r) => r.h.status === "pending").reduce((s, r) => s + r.h.hours, 0);

  const groups = useMemo(() => {
    const m = new Map<string, { who: Set<string>; events: Set<string>; hours: number }>();
    approved.forEach((r) => {
      const k = by === "Programme" ? r.programme : by === "State" ? r.state : by === "Event" ? r.h.activity : month(r.h.date);
      const g = m.get(k) ?? { who: new Set(), events: new Set(), hours: 0 };
      g.who.add(r.h.who); g.events.add(r.h.activity + r.h.date); g.hours += r.h.hours; m.set(k, g);
    });
    return [...m.entries()].map(([k, g]) => ({ k, volunteers: g.who.size, events: g.events.size, hours: g.hours })).sort((a, b) => b.hours - a.hours);
  }, [approved, by]);
  const totals = { volunteers: new Set(approved.map((r) => r.h.who)).size, events: new Set(approved.map((r) => r.h.activity + r.h.date)).size, hours: approved.reduce((s, r) => s + r.h.hours, 0) };

  const scopeText = [prog && `programme: ${prog}`, state && `state: ${state}`, (from || to) && `${from || "start"} to ${to || "today"}`].filter(Boolean).join(" · ") || "all programmes, states and dates";
  const summary = (): Cell[][] => [[by, "Volunteers", "Activities", "Approved hours"], ...groups.map((g) => [g.k, g.volunteers, g.events, g.hours]), ["Total", totals.volunteers, totals.events, totals.hours]];
  const stamp = new Date().toISOString().slice(0, 10);
  const can_export = can("reports.export");

  const exportSummary = async (kind: "csv" | "xlsx") => {
    if (!can_export) return;
    if (kind === "csv") download(`devatop-report-by-${by.toLowerCase()}-${stamp}.csv`, toCsv(summary()));
    else download(`devatop-report-by-${by.toLowerCase()}-${stamp}.xlsx`, await toXlsx({ name: `By ${by}`, rows: summary() }));
    log("Exported", `report by ${by} (${kind.toUpperCase()}, totals only)`);
    setMsg(`Exported ${kind.toUpperCase()}: totals only, no personal data.`); setTimeout(() => setMsg(""), 4000);
  };
  const exportPersonal = async (kind: "csv" | "xlsx") => {
    if (!can("export.personal")) return;
    if (!confirm("This export contains names, phone numbers and emails. Only export what you need, store it safely and delete it when done. This action is logged. Continue?")) return;
    const byWho = new Map<string, number>();
    approved.forEach((r) => byWho.set(r.h.who, (byWho.get(r.h.who) ?? 0) + r.h.hours));
    const data: Cell[][] = [["Name", "Email", "Phone", "State", "Departments", "Approved hours"],
      ...[...byWho.entries()].map(([who, hrs]) => {
        const a = apps.find((x) => `${x.first} ${x.last}` === who);
        return [who, a?.email ?? "—", a?.phone ?? "—", a?.state ?? "—", a?.departments.map((d) => DEPARTMENTS.find((x) => x.id === d)?.name).join("; ") ?? "—", hrs];
      })];
    if (kind === "csv") download(`devatop-volunteers-personal-${stamp}.csv`, toCsv(data));
    else download(`devatop-volunteers-personal-${stamp}.xlsx`, await toXlsx({ name: "Volunteers", rows: data }));
    log("PERSONAL DATA EXPORT", `${byWho.size} volunteers (${kind.toUpperCase()}) — ${scopeText}`);
    setMsg(`Personal-data export of ${byWho.size} volunteers downloaded and logged.`); setTimeout(() => setMsg(""), 5000);
  };

  return (
    <div className="grid gap-6">
      <div className="print:hidden"><h1 className="text-5xl md:text-7xl">Reports</h1><p className="mt-1 text-sm">Numbers for grants and donor reports. Only approved hours count. {admin.role === "state" && `Showing ${admin.scope} only.`}</p></div>
      <div className="hidden print:block"><h1 className="text-4xl">Devatop volunteers: report by {by.toLowerCase()}</h1><p>{scopeText} · generated {stamp}</p></div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end print:hidden">
        <label><span className="label">Programme</span><select className="input" value={prog} onChange={(e) => setProg(e.target.value)}><option value="">All</option>{PROGRAMMES.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label><span className="label">State</span><select className="input" value={state} onChange={(e) => setState(e.target.value)}><option value="">All</option><option>Remote (any state)</option>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label><span className="label">From</span><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label><span className="label">To</span><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <div><span className="label">Group by</span><div className="flex gap-1 flex-wrap">{(["Programme", "State", "Event", "Month"] as Group[]).map((g) => <button key={g} className="chip" aria-pressed={by === g} onClick={() => setBy(g)}>{g}</button>)}</div></div>
      </div>

      <section className="grid grid-cols-3 border-2 border-ink" aria-label="Totals">
        {[[totals.hours, "approved hours"], [totals.volunteers, "volunteers"], [totals.events, "activities"]].map(([n, l], i) => (
          <div key={l as string} className={`p-4 ${i ? "border-l-2 border-ink" : ""}`}><div className="display text-6xl md:text-8xl leading-[0.85]">{money(n as number)}</div><div className="font-bold text-sm md:text-base">{l as string}</div></div>))}
      </section>
      {pending > 0 && <p className="text-sm">{pending} pending hour{pending === 1 ? "" : "s"} are not counted until an admin approves them.</p>}

      <div className="overflow-x-auto border-t-2 border-ink">
        <table className="w-full text-left min-w-[520px]"><thead><tr className="text-sm"><th className="py-2">{by}</th><th className="text-right">Volunteers</th><th className="text-right">Activities</th><th className="text-right">Approved hours</th></tr></thead>
          <tbody>{groups.map((g) => (<tr key={g.k} className="border-t border-rule"><td className="py-2.5 font-bold">{g.k}</td><td className="text-right">{g.volunteers}</td><td className="text-right">{g.events}</td>
            <td className="text-right"><span className="inline-flex items-center gap-3 justify-end"><span className="hidden sm:block h-3 bg-orange border border-ink" style={{ width: `${Math.max(4, (g.hours / (groups[0]?.hours || 1)) * 120)}px` }} aria-hidden="true" /><b>{g.hours}</b></span></td></tr>))}
            {groups.length > 0 && <tr className="border-t-2 border-ink font-bold"><td className="py-2.5">Total</td><td className="text-right">{totals.volunteers}</td><td className="text-right">{totals.events}</td><td className="text-right">{totals.hours}</td></tr>}</tbody></table>
        {groups.length === 0 && <p className="py-8 text-lg">No approved hours match these filters.</p>}
      </div>

      <section className="grid gap-4 print:hidden" aria-label="Exports">
        <h2 className="text-3xl">Export</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-sm" disabled={!can_export || !groups.length} onClick={() => exportSummary("xlsx")}>Excel (.xlsx)</button>
          <button className="btn btn-sm btn-ghost" disabled={!can_export || !groups.length} onClick={() => exportSummary("csv")}>CSV</button>
          <button className="btn btn-sm btn-ghost" disabled={!can_export || !groups.length} onClick={() => { log("Exported", `report by ${by} (PDF/print, totals only)`); window.print(); }}>PDF (print)</button>
        </div>
        <p className="text-sm">Totals only: no names, phone numbers or emails.{!can_export && " Your role cannot export."}</p>
        <div className={`border-2 p-4 grid gap-2 ${can("export.personal") ? "border-alert" : "border-rule opacity-70"}`}>
          <b>Personal-data export (contact details)</b>
          <p className="text-sm">{can("export.personal") ? "Super Admin only. Every export is confirmed and written to the audit log." : "Super Admin only. Your role cannot export contact details."}</p>
          <div className="flex gap-2"><button className="btn btn-sm btn-ghost" disabled={!can("export.personal") || !groups.length} onClick={() => exportPersonal("xlsx")}>Excel</button><button className="btn btn-sm btn-ghost" disabled={!can("export.personal") || !groups.length} onClick={() => exportPersonal("csv")}>CSV</button></div>
        </div>
        {msg && <p role="status" className="font-bold border-l-4 border-orange pl-3">{msg}</p>}
      </section>
    </div>
  );
}
