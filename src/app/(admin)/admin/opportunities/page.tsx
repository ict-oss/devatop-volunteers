"use client";
import Link from "next/link";
import { useState } from "react";
import { PROGRAMMES, SKILLS, STATE_NAMES, fmtDate, type Opportunity } from "@/lib/data";
import { newId } from "@/lib/store";
import { isClosed, useOpps } from "@/lib/useOpps";
import { useAdmin } from "@/lib/useAdmin";

type Form = { title: string; programme: string; state: string; place: string; mode: "Physical" | "Remote"; date: string; deadline: string; commitment: string; slots: string; skills: string[]; blurb: string };
const blank = (state = ""): Form => ({ title: "", programme: PROGRAMMES[0], state, place: "", mode: "Physical", date: "", deadline: "", commitment: "", slots: "10", skills: [], blurb: "" });

export default function AdminOpportunities() {
  const { admin, can, inScope, log } = useAdmin();
  const { opps, setOpps } = useOpps();
  const stateLocked = admin.role === "state" ? admin.scope ?? "" : "";
  const [f, setF] = useState<Form>(blank(stateLocked));
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const edit = can("opportunities.edit");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const E = (k: string) => (err[k] ? <p className="err" role="alert">{err[k]}</p> : null);
  const visible = opps.filter((o) => inScope({ state: o.state }) || o.mode === "Remote");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (!f.title.trim()) x.title = "Give it a title.";
    if (f.mode === "Physical" && !f.state) x.state = "Pick a state.";
    if (!f.place.trim()) x.place = "Where exactly?";
    if (!f.date) x.date = "Pick the date.";
    if (!f.deadline) x.deadline = "Pick a sign-up deadline.";
    else if (f.date && f.deadline > f.date) x.deadline = "Deadline must be on or before the event date.";
    if (!(Number(f.slots) >= 1)) x.slots = "At least 1 slot.";
    if (!f.commitment.trim()) x.commitment = "e.g. 4 hrs / Saturday";
    if (!f.skills.length) x.skills = "Pick at least one skill.";
    setErr(x);
    if (Object.keys(x).length) return;
    const base = { title: f.title.trim(), programme: f.programme, state: f.mode === "Remote" ? "Remote (any state)" : f.state, place: f.place.trim(), mode: f.mode, date: f.date, deadline: f.deadline, commitment: f.commitment.trim(), slots: Number(f.slots), skills: f.skills, blurb: f.blurb.trim() };
    if (editing) {
      setOpps((p) => p.map((o) => (o.id === editing ? { ...o, ...base } : o)));
      log("Opportunity edited", base.title); setMsg(`Saved “${base.title}”.`);
    } else {
      const o: Opportunity = { id: "opp-" + newId(), taken: 0, ...base };
      setOpps((p) => [o, ...p]);
      log("Opportunity created", base.title); setMsg(`“${base.title}” is live on the public board.`);
    }
    setEditing(null); setF(blank(stateLocked)); setTimeout(() => setMsg(""), 4000);
  };
  const startEdit = (o: Opportunity) => { setEditing(o.id); setF({ title: o.title, programme: o.programme, state: o.mode === "Remote" ? "" : o.state, place: o.place, mode: o.mode, date: o.date, deadline: o.deadline, commitment: o.commitment, slots: String(o.slots), skills: o.skills, blurb: o.blurb }); window.scrollTo({ top: 0 }); };

  return (
    <div className="grid gap-8">
      <div><h1 className="text-5xl md:text-7xl">Opportunities</h1><p className="mt-1 text-sm">Create calls to action. They appear on the public board straight away. <Link className="underline" href="/admin/attendance">Take attendance →</Link></p></div>
      {msg && <p role="status" className="font-bold border-l-4 border-orange pl-3">{msg}</p>}

      {edit ? (
        <form onSubmit={save} noValidate className="grid gap-4 border-2 border-ink p-4 md:p-6">
          <h2 className="text-3xl">{editing ? "Edit opportunity" : "New opportunity"}</h2>
          <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" value={f.title} onChange={(e) => set("title", e.target.value)} aria-invalid={!!err.title} />{E("title")}</div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="label" htmlFor="pr">Programme</label><select id="pr" className="input" value={f.programme} onChange={(e) => set("programme", e.target.value)}>{PROGRAMMES.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div><span className="label">Where</span><div className="flex gap-2">{(["Physical", "Remote"] as const).map((m) => <button type="button" key={m} className="chip" aria-pressed={f.mode === m} onClick={() => set("mode", m)}>{m}</button>)}</div></div>
            <div><label className="label" htmlFor="st">State</label><select id="st" className="input" disabled={f.mode === "Remote" || !!stateLocked} value={f.mode === "Remote" ? "" : f.state} onChange={(e) => set("state", e.target.value)}><option value="">{f.mode === "Remote" ? "Any (remote)" : "Choose…"}</option>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select>{stateLocked && <span className="why">Your role covers {stateLocked} only.</span>}{E("state")}</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label" htmlFor="pl">Place</label><input id="pl" className="input" placeholder="Wuse Market" value={f.place} onChange={(e) => set("place", e.target.value)} />{E("place")}</div>
            <div><label className="label" htmlFor="cm">Time commitment</label><input id="cm" className="input" placeholder="4 hrs / Saturday" value={f.commitment} onChange={(e) => set("commitment", e.target.value)} />{E("commitment")}</div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="label" htmlFor="dt">Event date</label><input id="dt" type="date" className="input" value={f.date} onChange={(e) => set("date", e.target.value)} />{E("date")}</div>
            <div><label className="label" htmlFor="dl">Sign-up deadline</label><input id="dl" type="date" className="input" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} />{E("deadline")}</div>
            <div><label className="label" htmlFor="sl">Slots</label><input id="sl" inputMode="numeric" className="input" value={f.slots} onChange={(e) => set("slots", e.target.value)} />{E("slots")}</div>
          </div>
          <fieldset><legend className="label">Skills needed</legend><div className="flex flex-wrap gap-2">{SKILLS.map((s) => <button type="button" key={s} className="chip" aria-pressed={f.skills.includes(s)} onClick={() => set("skills", f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s])}>{s}</button>)}</div>{E("skills")}</fieldset>
          <div><label className="label" htmlFor="bl">What will volunteers do?</label><textarea id="bl" rows={3} className="input" value={f.blurb} onChange={(e) => set("blurb", e.target.value)} /></div>
          <div className="flex gap-2"><button className="btn" type="submit">{editing ? "Save changes" : "Publish opportunity"}</button>{editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setF(blank(stateLocked)); }}>Cancel</button>}</div>
        </form>
      ) : <p className="border-2 border-ink p-4">Your role can view opportunities but not create or edit them.</p>}

      <div className="overflow-x-auto border-t-2 border-ink">
        <table className="w-full text-left min-w-[680px]"><thead><tr className="text-sm"><th className="py-2">Opportunity</th><th>When / where</th><th>Slots</th><th>Sign-ups</th><th className="text-right">Actions</th></tr></thead>
          <tbody>{visible.map((o) => (
            <tr key={o.id} className="border-t border-rule align-top">
              <td className="py-3 pr-3"><b>{o.title}</b><br /><span className="text-sm">{o.programme}</span></td>
              <td className="py-3 pr-3 text-sm">{fmtDate(o.date)}<br />{o.place}, {o.state}</td>
              <td className="py-3 pr-3 font-bold">{o.slots}</td>
              <td className="py-3 pr-3">{o.taken}/{o.slots} {isClosed(o) ? <span className="stamp stamp-wait ml-1">Closed</span> : o.taken >= o.slots ? <span className="stamp stamp-info ml-1">Full</span> : <span className="stamp stamp-ok ml-1">Open</span>}</td>
              <td className="py-3 text-right whitespace-nowrap"><Link className="btn btn-sm btn-ghost mr-1" href={`/admin/attendance?o=${o.id}`}>Attendance</Link>{edit && <button className="btn btn-sm btn-ghost" onClick={() => startEdit(o)}>Edit</button>}</td>
            </tr>))}</tbody></table>
        {visible.length === 0 && <p className="py-8">Nothing in your scope yet.</p>}
      </div>
    </div>
  );
}
