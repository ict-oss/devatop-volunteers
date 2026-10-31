"use client";
import { useState } from "react";
import { addAdminAction, changeAdminAction, removeAdminAction } from "@/app/actions/admin";
import { STATE_NAMES } from "@/lib/data";
import { ROLE_LABEL, type Role } from "@/lib/permissions";
import type { AdminRowView } from "@/lib/services/users";
import { useAct } from "./useAct";

const ROLES = Object.keys(ROLE_LABEL) as Role[];
type Scope = { state: string; programmeId: string; departmentId: string };
const NONE: Scope = { state: "", programmeId: "", departmentId: "" };

/** Who can sign in to the admin area, and as what. Super Admin only. The database refuses to leave Devatop with fewer than two Super Admins. */
export function AdminsAdmin({ admins, meId, programmes, departments }: { admins: AdminRowView[]; meId: string; programmes: { id: string; name: string }[]; departments: { id: string; name: string }[] }) {
  const { act, busy, note } = useAct();
  const [email, setEmail] = useState(""); const [role, setRole] = useState<Role>("viewer"); const [scope, setScope] = useState<Scope>(NONE);
  const [editing, setEditing] = useState<string | null>(null); const [eRole, setERole] = useState<Role>("viewer"); const [eScope, setEScope] = useState<Scope>(NONE);

  const picker = (r: Role, s: Scope, set: (s: Scope) => void) => (
    <>
      {r === "state" && <select className="input" aria-label="State" value={s.state} onChange={(e) => set({ ...s, state: e.target.value })}><option value="">Pick a state</option>{STATE_NAMES.map((x) => <option key={x}>{x}</option>)}</select>}
      {r === "programme" && <select className="input" aria-label="Programme" value={s.programmeId} onChange={(e) => set({ ...s, programmeId: e.target.value })}><option value="">Pick a programme</option>{programmes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
      {r === "department" && <select className="input" aria-label="Department" value={s.departmentId} onChange={(e) => set({ ...s, departmentId: e.target.value })}><option value="">Pick a department</option>{departments.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
    </>
  );
  const body = (r: Role, s: Scope) => ({ role: r, state: s.state || null, programmeId: s.programmeId || null, departmentId: s.departmentId || null });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await act(addAdminAction({ email, ...body(role, scope) }), `${email.trim()} is now an admin. They sign in the usual way and set up two-factor the first time.`);
    if (r.ok) { setEmail(""); setScope(NONE); setRole("viewer"); }
  };
  const save = async (a: AdminRowView) => { const r = await act(changeAdminAction(a.userId, body(eRole, eScope)), "Role changed."); if (r.ok) setEditing(null); };
  const remove = (a: AdminRowView) => { if (confirm(`Remove admin access for ${a.email}? They stay on as a volunteer if they are one. This is logged.`)) return act(removeAdminAction(a.userId), "Admin access removed."); };

  return (
    <div className="grid gap-8 max-w-5xl">
      <div>
        <h1 className="text-5xl md:text-7xl">Admins</h1>
        <p className="mt-2 max-w-2xl text-sm">Everyone who can sign in to this area, and what each person may do. Every change here is written to the audit log. Devatop always keeps at least two Super Admins.</p>
      </div>
      {note}

      <form onSubmit={add} className="border-2 border-ink p-4 grid gap-3" aria-label="Add an admin">
        <b>Add an admin</b>
        <p className="text-sm">The person must first create an account on the site with this email address (the Create an account page). Then add them here.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <label><span className="label">Email</span><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@devatop.org" /></label>
          <label><span className="label">Role</span><select className="input" value={role} onChange={(e) => { setRole(e.target.value as Role); setScope(NONE); }}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
          {(role === "state" || role === "programme" || role === "department") && <label><span className="label">Looks after</span>{picker(role, scope, setScope)}</label>}
        </div>
        <div><button className="btn" disabled={busy || !email.trim()}>{busy ? "Adding…" : "Add admin"}</button></div>
      </form>

      <div className="overflow-x-auto border-t-2 border-ink">
        <table className="w-full text-left min-w-[640px]">
          <thead><tr className="text-sm"><th className="py-2">Email</th><th>Role</th><th>Looks after</th><th>Since</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.userId} className="border-t border-rule align-top">
                <td className="py-3 font-bold">{a.email || "(no email)"}{a.userId === meId && <span className="stamp stamp-wait ml-2">You</span>}</td>
                {editing === a.userId ? (
                  <td colSpan={2}><div className="grid sm:grid-cols-2 gap-2 py-1">
                    <select className="input" aria-label="Role" value={eRole} onChange={(e) => { setERole(e.target.value as Role); setEScope(NONE); }}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                    {picker(eRole, eScope, setEScope)}
                  </div></td>
                ) : (<><td>{a.roleLabel}</td><td className="text-sm">{a.scope || <span className="opacity-50">None</span>}</td></>)}
                <td className="text-sm">{new Date(a.since).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="text-right whitespace-nowrap">
                  {a.userId === meId ? <span className="text-sm opacity-60">Ask another Super Admin to change your role</span> : editing === a.userId ? (
                    <span className="flex gap-2 justify-end"><button className="btn btn-sm" disabled={busy} onClick={() => save(a)}>Save</button><button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button></span>
                  ) : (
                    <span className="flex gap-2 justify-end"><button className="btn btn-sm btn-ghost" onClick={() => { setEditing(a.userId); setERole(a.role); setEScope(NONE); }}>Change role</button><button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => remove(a)}>Remove</button></span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
