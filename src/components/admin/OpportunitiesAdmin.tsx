"use client";
import Link from "next/link";
import { useState } from "react";
import { createOpportunityAction, setPublishedAction, updateOpportunityAction } from "@/app/actions/admin";
import { SKILLS, STATE_NAMES, fmtDate } from "@/lib/data";
import type { OpportunityView } from "@/lib/services/opportunities";
import { useAdmin } from "@/lib/useAdmin";
import { useAct } from "./useAct";

type Form = { title: string; programmeId: string; departmentId: string; mode: "physical" | "remote"; state: string; place: string; commitment: string; startsAt: string; endsAt: string; signupDeadline: string; slots: string; skills: string[]; description: string; published: boolean };
const blank = (programmeId: string, state = ""): Form => ({ title: "", programmeId, departmentId: "", mode: "physical", state, place: "", commitment: "", startsAt: "", endsAt: "", signupDeadline: "", slots: "10", skills: [], description: "", published: true });
const local = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const iso = (v: string) => (v ? new Date(v).toISOString() : null);

export function OpportunitiesAdmin({ opps, programmes, departments }: { opps: OpportunityView[]; programmes: { id: string; name: string }[]; departments: { id: string; name: string }[] }) {
  const { admin, can } = useAdmin();
  const { act, busy, note } = useAct();
  const stateLocked = admin.role === "state" ? admin.scope ?? "" : "";
  const [f, setF] = useState<Form>(blank(programmes[0]?.id ?? "", stateLocked));
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const edit = can("opportunities.edit");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const E = (k: string) => (err[k] ? <p className="err" role="alert">{err[k]}</p> : null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { title: f.title, description: f.description, programmeId: f.programmeId, departmentId: f.departmentId || null, mode: f.mode, state: f.mode === "remote" ? null : f.state || null, place: f.place, startsAt: iso(f.startsAt), endsAt: iso(f.endsAt), signupDeadline: iso(f.signupDeadline), slots: Number(f.slots), skills: f.skills, commitment: f.commitment, published: f.published };
    const r = await act(editing ? updateOpportunityAction(editing, payload) : createOpportunityAction(payload), editing ? "Saved." : "Published. It is on the public board now.");
    if (r.ok) { setEditing(null); setF(blank(programmes[0]?.id ?? "", stateLocked)); setErr({}); } else setErr(r.ok ? {} : r.fields ?? {});
  }
  const startEdit = (o: OpportunityView) => { setEditing(o.id); setErr({}); setF({ title: o.title, programmeId: o.programmeId, departmentId: o.departmentId ?? "", mode: o.mode === "Remote" ? "remote" : "physical", state: o.mode === "Remote" ? "" : o.state, place: o.place, commitment: o.commitment, startsAt: local(o.startsAt), endsAt: local(o.endsAt), signupDeadline: local(o.signupDeadline), slots: String(o.slots), skills: o.skills, description: o.blurb, published: o.published }); window.scrollTo({ top: 0 }); };

  return (
    <div className="grid gap-8">
      <div><h1 className="text-5xl md:text-7xl">Opportunities</h1><p className="mt-1 text-sm">Create calls to action. Published ones appear on the public board straight away. <Link className="underline" href="/admin/attendance">Take attendance &rarr;</Link></p></div>
      {note}
      {edit ? (
        <form onSubmit={save} noValidate className="grid gap-4 border-2 border-ink p-4 md:p-6">
          <h2 className="text-3xl">{editing ? "Edit opportunity" : "New opportunity"}</h2>
          <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" value={f.title} onChange={(e) => set("title", e.target.value)} aria-invalid={!!err.title} />{E("title")}</div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="label" htmlFor="pr">Programme</label><select id="pr" className="input" value={f.programmeId} onChange={(e) => set("programmeId", e.target.value)}>{programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{E("programmeId")}</div>
            <div><label className="label" htmlFor="dp">Department <span className="font-normal">(optional)</span></label><select id="dp" className="input" value={f.departmentId} onChange={(e) => set("departmentId", e.target.value)}><option value="">None</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><span className="label">Where</span><div className="flex gap-2">{(["physical", "remote"] as const).map((m) => <button type="button" key={m} className="chip" aria-pressed={f.mode === m} onClick={() => set("mode", m)}>{m === "physical" ? "Physical" : "Remote"}</button>)}</div></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="label" htmlFor="st">State</label><select id="st" className="input" disabled={f.mode === "remote" || !!stateLocked} value={f.mode === "remote" ? "" : f.state} onChange={(e) => set("state", e.target.value)}><option value="">{f.mode === "remote" ? "Any (remote)" : "Choose…"}</option>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select>{E("state")}</div>
            <div><label className="label" htmlFor="pl">Place</label><input id="pl" className="input" placeholder="Wuse Market" value={f.place} onChange={(e) => set("place", e.target.value)} /></div>
            <div><label className="label" htmlFor="cm">Time commitment</label><input id="cm" className="input" placeholder="4 hrs / Saturday" value={f.commitment} onChange={(e) => set("commitment", e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            <div><label className="label" htmlFor="sa">Starts</label><input id="sa" type="datetime-local" className="input" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />{E("startsAt")}</div>
            <div><label className="label" htmlFor="ea">Ends <span className="font-normal">(optional)</span></label><input id="ea" type="datetime-local" className="input" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} />{E("endsAt")}</div>
            <div><label className="label" htmlFor="dl">Sign-ups close</label><input id="dl" type="datetime-local" className="input" value={f.signupDeadline} onChange={(e) => set("signupDeadline", e.target.value)} />{E("signupDeadline")}</div>
            <div><label className="label" htmlFor="sl">Slots</label><input id="sl" inputMode="numeric" className="input" value={f.slots} onChange={(e) => set("slots", e.target.value)} />{E("slots")}</div>
          </div>
          <fieldset><legend className="label">Skills needed</legend><div className="flex flex-wrap gap-2">{SKILLS.map((s) => <button type="button" key={s} className="chip" aria-pressed={f.skills.includes(s)} onClick={() => set("skills", f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s])}>{s}</button>)}</div></fieldset>
          <div><label className="label" htmlFor="bl">What will volunteers do?</label><textarea id="bl" rows={3} className="input" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
          <label className="flex items-center gap-3 font-bold"><input type="checkbox" className="size-6" checked={f.published} onChange={(e) => set("published", e.target.checked)} /> Show on the public board</label>
          {err.form && <p className="err">{err.form}</p>}
          <div className="flex gap-2"><button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Publish opportunity"}</button>{editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setF(blank(programmes[0]?.id ?? "", stateLocked)); setErr({}); }}>Cancel</button>}</div>
        </form>
      ) : <p className="border-2 border-ink p-4">Your role can view opportunities but not create or edit them.</p>}

      <div className="overflow-x-auto border-t-2 border-ink">
        <table className="w-full text-left min-w-[700px]"><thead><tr className="text-sm"><th className="py-2">Opportunity</th><th>When / where</th><th>Sign-ups</th><th className="text-right">Actions</th></tr></thead>
          <tbody>{opps.map((o) => {
            const closed = Date.now() > Date.parse(o.signupDeadline);
            return (
              <tr key={o.id} className="border-t border-rule align-top">
                <td className="py-3 pr-3"><b>{o.title}</b>{!o.published && <span className="stamp stamp-wait ml-2">Hidden</span>}<br /><span className="text-sm">{o.programme}</span></td>
                <td className="py-3 pr-3 text-sm">{fmtDate(o.date)}<br />{o.place}{o.place ? ", " : ""}{o.state}</td>
                <td className="py-3 pr-3">{o.taken}/{o.slots} {closed ? <span className="stamp stamp-wait ml-1">Closed</span> : o.taken >= o.slots ? <span className="stamp stamp-info ml-1">Full</span> : <span className="stamp stamp-ok ml-1">Open</span>}</td>
                <td className="py-3 text-right whitespace-nowrap"><Link className="btn btn-sm btn-ghost mr-1" href={`/admin/attendance?o=${o.id}`}>Attendance</Link>
                  {edit && <><button className="btn btn-sm btn-ghost mr-1" disabled={busy} onClick={() => startEdit(o)}>Edit</button><button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act(setPublishedAction(o.id, !o.published), o.published ? "Hidden from the public board." : "Now on the public board.")}>{o.published ? "Hide" : "Publish"}</button></>}</td>
              </tr>);
          })}</tbody></table>
        {opps.length === 0 && <p className="py-8">Nothing in your area yet.</p>}
      </div>
    </div>
  );
}
