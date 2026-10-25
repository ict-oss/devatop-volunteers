"use client";
import { useState } from "react";
import { DEPARTMENTS, type Department } from "@/lib/data";
import { KEYS, newId, useLocal } from "@/lib/store";
import { useAdmin } from "@/lib/useAdmin";

// Departments are rows, never hard-coded names. Archive/merge instead of delete so hours and certificates are never lost.
export function DepartmentsProto() {
  const { can, log } = useAdmin();
  const [depts, setDepts] = useLocal<Department[]>(KEYS.depts, DEPARTMENTS);
  const [name, setName] = useState(""); const [blurb, setBlurb] = useState("");
  const manage = can("departments.manage");
  const add = (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) return; setDepts((p) => [...p, { id: newId(), name: name.trim(), blurb: blurb.trim(), status: "active", members: 0 }]); log("Department added", name.trim()); setName(""); setBlurb(""); };
  const archive = (d: Department) => { if (!confirm(`Archive “${d.name}”?\n\n${d.members} volunteers are affected and will be emailed. Their hours and certificates stay intact. The department disappears from the application form.`)) return; setDepts((p) => p.map((x) => (x.id === d.id ? { ...x, status: "archived" } : x))); log("Department archived", `${d.name} (${d.members} volunteers)`); };
  const restore = (d: Department) => { setDepts((p) => p.map((x) => (x.id === d.id ? { ...x, status: "active" } : x))); log("Department restored", d.name); };
  const merge = (d: Department) => {
    const targets = depts.filter((x) => x.id !== d.id && x.status === "active");
    const t = prompt(`Merge “${d.name}” into which department?\n${targets.map((x, i) => `${i + 1}. ${x.name}`).join("\n")}\n\nType the number. ${d.members} volunteers will move; history moves with them.`);
    const target = targets[Number(t) - 1]; if (!target) return;
    setDepts((p) => p.map((x) => (x.id === target.id ? { ...x, members: x.members + d.members } : x.id === d.id ? { ...x, status: "archived", members: 0 } : x)));
    log("Department merged", `${d.name} → ${target.name} (${d.members} volunteers)`);
  };
  const remove = (d: Department) => { if (d.members > 0) { alert("This department has history, so it can never be hard-deleted. Archive it instead."); return; } if (confirm(`Delete “${d.name}” for good? It has never had members or opportunities.`)) { setDepts((p) => p.filter((x) => x.id !== d.id)); log("Department deleted", d.name); } };
  return (
    <div className="grid gap-6">
      <div><h1 className="text-5xl md:text-7xl">Departments</h1><p className="mt-1 text-sm">Changes appear in the application form and filters at once. Every change asks to confirm, shows who it affects, and is logged.</p></div>
      {manage && <form onSubmit={add} className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-end border-2 border-ink p-4">
        <label><span className="label">New department</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label><span className="label">What volunteers there do</span><input className="input" value={blurb} onChange={(e) => setBlurb(e.target.value)} /></label>
        <button className="btn" type="submit">Add</button></form>}
      <ul className="border-t-2 border-ink">{depts.map((d) => (
        <li key={d.id} className="py-3 border-b border-rule grid md:grid-cols-[1fr_auto] gap-3 items-center">
          <div><b className="text-lg">{d.name}</b> <span className={`stamp ml-2 ${d.status === "active" ? "stamp-ok" : "stamp-wait"}`}>{d.status}</span><div className="text-sm">{d.blurb} · <b>{d.members}</b> volunteers</div></div>
          {manage && <div className="flex gap-1 flex-wrap">
            {d.status === "active" ? <><button className="btn btn-sm btn-ghost" onClick={() => merge(d)}>Merge</button><button className="btn btn-sm btn-ghost" onClick={() => archive(d)}>Archive</button></> : <button className="btn btn-sm btn-ghost" onClick={() => restore(d)}>Restore</button>}
            <button className="btn btn-sm btn-ghost" onClick={() => remove(d)}>Delete</button></div>}
        </li>))}</ul>
      {!manage && <p className="text-sm">Your role can view departments but not change them.</p>}
    </div>
  );
}
