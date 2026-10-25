"use client";
import { useState } from "react";
import { addDepartmentAction, archiveDepartmentAction, deleteDepartmentAction, editDepartmentAction, mergeDepartmentsAction, restoreDepartmentAction } from "@/app/actions/admin";
import type { DepartmentRow } from "@/lib/services/departments";
import { useAdmin } from "@/lib/useAdmin";
import { useAct } from "./useAct";

/** Departments are data. Add, rename, merge, archive or restore them here: no developer needed. History is always kept. */
export function DepartmentsAdmin({ departments }: { departments: DepartmentRow[] }) {
  const { can } = useAdmin();
  const { act, busy, note } = useAct();
  const manage = can("departments.manage");
  const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const active = departments.filter((d) => d.status === "active");

  const add = async (e: React.FormEvent) => { e.preventDefault(); const r = await act(addDepartmentAction({ name, description }), `“${name.trim()}” added. It is on the application form now.`); if (r.ok) { setName(""); setDescription(""); } };
  const rename = async (d: DepartmentRow) => {
    const n = prompt("New name:", d.name); if (n === null) return;
    const b = prompt("What volunteers there do:", d.description); if (b === null) return;
    await act(editDepartmentAction(d.id, { name: n, description: b }), "Renamed everywhere.");
  };
  const archive = (d: DepartmentRow) => {
    if (d.members > 0) { alert(`${d.name} still has ${d.members} active member${d.members === 1 ? "" : "s"}. Merge it into another department so they move across, or release them first.`); return; }
    if (confirm(`Archive “${d.name}”?\n\n0 volunteers are affected. It disappears from the application form and new calls. History, hours and certificates stay.`)) return act(archiveDepartmentAction(d.id), "Archived.");
  };
  const merge = (d: DepartmentRow) => {
    const targets = active.filter((x) => x.id !== d.id);
    const t = prompt(`Merge “${d.name}” into which department?\n${targets.map((x, i) => `${i + 1}. ${x.name}`).join("\n")}\n\nType the number. ${d.members} volunteer${d.members === 1 ? "" : "s"} will move; history moves with them.`);
    const target = targets[Number(t) - 1]; if (!target) return;
    return act(mergeDepartmentsAction(d.id, target.id), (r) => `${r.moved} volunteer${r.moved === 1 ? "" : "s"} moved to ${target.name}. “${d.name}” is archived.`);
  };
  const remove = (d: DepartmentRow) => confirm(`Delete “${d.name}” for good? Only possible if it never had members, calls, guides or certificates.`) ? act(deleteDepartmentAction(d.id), "Deleted.") : undefined;

  return (
    <div className="grid gap-6">
      <div><h1 className="text-5xl md:text-7xl">Departments</h1><p className="mt-1 text-sm">Changes appear in the application form and filters at once. Every change asks to confirm, shows who it affects, and is logged.</p></div>
      {note}
      {manage && <form onSubmit={add} className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-end border-2 border-ink p-4">
        <label><span className="label">New department</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label><span className="label">What volunteers there do</span><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <button className="btn" type="submit" disabled={busy}>Add</button></form>}
      <ul className="border-t-2 border-ink">{departments.map((d) => (
        <li key={d.id} className="py-3 border-b border-rule grid md:grid-cols-[1fr_auto] gap-3 items-center">
          <div><b className="text-lg">{d.name}</b> <span className={`stamp ml-2 ${d.status === "active" ? "stamp-ok" : "stamp-wait"}`}>{d.status}</span><div className="text-sm">{d.description} · <b>{d.members}</b> volunteer{d.members === 1 ? "" : "s"}</div></div>
          {manage && <div className="flex gap-1 flex-wrap">
            {d.status === "active" ? <><button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => rename(d)}>Rename</button><button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => merge(d)}>Merge</button><button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => archive(d)}>Archive</button></>
              : <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act(restoreDepartmentAction(d.id), "Restored with its history.")}>Restore</button>}
            <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => remove(d)}>Delete</button></div>}
        </li>))}</ul>
      {!manage && <p className="text-sm">Your role can view departments but not change them.</p>}
    </div>
  );
}
