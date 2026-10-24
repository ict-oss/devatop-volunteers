"use client";
import Link from "next/link";
import { useState } from "react";
import { DEPARTMENTS, SKILLS, STATE_NAMES } from "@/lib/data";
import { useMe } from "@/lib/useMe";
import { fmtDate } from "@/lib/data";

export default function Profile() {
  const { me, updateMe, deleteMe, myHours } = useMe();
  const [saved, setSaved] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  if (!me) return <div><h1 className="text-[length:var(--text-display)]">My <em className="accent">profile</em></h1><p className="mt-4">Nothing here yet. <Link className="underline font-bold" href="/apply">Apply to volunteer.</Link></p></div>;

  const save = (patch: Parameters<typeof updateMe>[0]) => { updateMe(patch); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const download = () => {
    const blob = new Blob([JSON.stringify({ profile: me, hours: myHours }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "my-devatop-data.json"; a.click();
  };
  const toggleSkill = (s: string) => save({ skills: me.skills.includes(s) ? me.skills.filter((x) => x !== s) : [...me.skills, s] });

  return (
    <div className="grid gap-12 max-w-3xl">
      <div className="flex items-end justify-between flex-wrap gap-3"><h1 className="text-[length:var(--text-display)]">My <em className="accent">profile</em></h1>{saved && <span role="status" className="stamp stamp-ok">Saved</span>}</div>
      <section className="grid gap-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <div><label className="label" htmlFor="ph">Phone</label><input id="ph" className="input" defaultValue={me.phone} onBlur={(e) => e.target.value !== me.phone && save({ phone: e.target.value })} /></div>
          <div><label className="label" htmlFor="em">Email</label><input id="em" className="input" defaultValue={me.email} onBlur={(e) => e.target.value !== me.email && save({ email: e.target.value })} /></div>
          <div><label className="label" htmlFor="st">State</label><select id="st" className="input" value={me.state} onChange={(e) => save({ state: e.target.value })}>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label" htmlFor="av">Availability</label><select id="av" className="input" value={me.availability} onChange={(e) => save({ availability: e.target.value })}>{["Weekdays", "Weekday evenings", "Weekends", "Flexible", "Only remote"].map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <fieldset><legend className="label">Skills</legend><div className="flex flex-wrap gap-2 mt-1">{SKILLS.map((s) => <button key={s} className="chip" aria-pressed={me.skills.includes(s)} onClick={() => toggleSkill(s)}>{s}</button>)}</div></fieldset>
        <div><span className="label">Departments</span><p>{me.departments.map((id) => DEPARTMENTS.find((d) => d.id === id)?.name).filter(Boolean).join(" · ") || "—"}</p><span className="why">Want to join another department? Ask from here; its Department Lead accepts or declines. (Coming in the next build.)</span></div>
      </section>

      <section className="border-t border-ink pt-6">
        <h2 className="text-3xl md:text-4xl">What you agreed to</h2>
        <ul className="mt-3">{me.consents.map((c) => (
          <li key={c.key} className="py-3 border-t border-rule text-sm"><b>{c.text}</b><br /><span className="opacity-70">Version {c.version} · agreed {fmtDate(c.at.slice(0, 10))}</span></li>))}
          {me.consents.length === 0 && <li className="py-3 text-sm">No consents recorded.</li>}</ul>
      </section>

      <section className="border-t border-ink pt-6 grid gap-4">
        <h2 className="text-3xl md:text-4xl">Your data, your call</h2>
        <div className="flex gap-3 flex-wrap"><button className="btn btn-ghost" onClick={download}>Download my data</button></div>
        {withdrawn ? (
          <div className="border-2 border-ink p-4" role="status"><b>Done.</b> Your account and data are deleted, emails have stopped and you are off the Roll. <Link className="underline" href="/">Back to the public site</Link></div>
        ) : (
          <div className="border-2 border-alert p-4 grid gap-3">
            <b>Withdraw consent and delete my account</b>
            <p className="text-sm">You can do this any time. We stop all emails and remove you from the public Roll straight away. Your hours remain in anonymised totals so reports stay accurate. This can&apos;t be undone.</p>
            <button className="btn btn-sm justify-self-start" style={{ background: "#B42318", color: "#fff", borderColor: "#B42318" }} onClick={() => { if (confirm("Delete your account and withdraw consent? This cannot be undone.")) { deleteMe(); setWithdrawn(true); } }}>Withdraw consent / delete my account</button>
          </div>
        )}
      </section>
    </div>
  );
}
