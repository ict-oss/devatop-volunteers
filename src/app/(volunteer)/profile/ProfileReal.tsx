"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccountAction, downloadMyDataAction, updateProfileAction } from "@/app/actions/volunteer";
import { supabaseBrowser } from "@/lib/auth/supabase-browser";
import { SKILLS, STATE_NAMES, fmtDate } from "@/lib/data";
import { useLive } from "@/lib/live";

const CONSENT_TEXT: Record<string, string> = { conduct: "Code of Conduct", safeguarding: "Safeguarding Agreement", privacy: "Privacy Notice and data use", media: "Photos and film at activities (optional)" };

export function ProfileReal() {
  const live = useLive()!; const me = live.me; const router = useRouter();
  const [phone, setPhone] = useState(me?.phone ?? ""); const [state, setState] = useState(me?.state ?? ""); const [availability, setAvailability] = useState(me?.availability ?? "");
  const [skills, setSkills] = useState<string[]>(me?.skills ?? []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false); const [gone, setGone] = useState(false);
  // after deleting, the refreshed page has no profile any more: keep showing the confirmation, not "Nothing here yet"
  if (!me && gone) return <div className="border-2 border-ink p-4" role="status"><b>Done.</b> Your account and data are deleted, you will get no more messages and you are off the Roll. <Link className="underline" href="/">Back to the public site</Link></div>;
  if (!me) return <div><h1 className="text-[length:var(--text-display)]">My <em className="accent">profile</em></h1><p className="mt-4">Nothing here yet. <Link className="underline font-bold" href="/apply">Apply to volunteer.</Link></p></div>;

  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const r = await updateProfileAction({ phone, state, availability, skills, languages: me.languages });
    setBusy(false);
    if (r.ok) { flash(true, "Saved."); router.refresh(); } else flash(false, r.message);
  };
  const download = async () => {
    const r = await downloadMyDataAction(); if (!r.ok) { flash(false, r.message); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([r.data.json], { type: "application/json" })); a.download = "my-devatop-data.json"; a.click();
  };
  const remove = async () => {
    if (!confirm("Delete your account and withdraw consent? This cannot be undone.")) return;
    setBusy(true); const r = await deleteAccountAction(); setBusy(false);
    if (!r.ok && r.code !== "partial") { flash(false, r.message); return; }
    await supabaseBrowser().auth.signOut(); setGone(true);
  };
  return (
    <div className="grid gap-12 max-w-3xl">
      <div className="flex items-end justify-between flex-wrap gap-3"><h1 className="text-[length:var(--text-display)]">My <em className="accent">profile</em></h1>{msg && <span role={msg.ok ? "status" : "alert"} className={`stamp ${msg.ok ? "stamp-ok" : "stamp-bad"}`}>{msg.text}</span>}</div>
      <form onSubmit={save} className="grid gap-5">
        <p className="font-bold">{me.first} {me.last} <span className="font-normal opacity-70">· {me.email}</span></p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div><label className="label" htmlFor="ph">Phone</label><input id="ph" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><label className="label" htmlFor="st">State</label><select id="st" className="input" value={state} onChange={(e) => setState(e.target.value)}>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label" htmlFor="av">Availability</label><select id="av" className="input" value={availability} onChange={(e) => setAvailability(e.target.value)}>{["Weekdays", "Weekday evenings", "Weekends", "Flexible", "Only remote"].map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <span className="why -mt-3">To change your email address, contact Devatop: it is the address you sign in with.</span>
        <fieldset><legend className="label">Skills</legend><div className="flex flex-wrap gap-2 mt-1">{SKILLS.map((s) => <button type="button" key={s} className="chip" aria-pressed={skills.includes(s)} onClick={() => setSkills((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])}>{s}</button>)}</div></fieldset>
        <div><button className="btn" disabled={busy || skills.length === 0}>{busy ? "Saving…" : "Save changes"}</button></div>
      </form>
      <section className="border-t border-ink pt-6">
        <h2 className="text-3xl md:text-4xl">What you agreed to</h2>
        <ul className="mt-3">{me.consents.map((c) => <li key={c.key + c.at} className="py-3 border-t border-rule text-sm"><b>{CONSENT_TEXT[c.key] ?? c.key}</b><br /><span className="opacity-70">Version {c.version} · agreed {fmtDate(c.at.slice(0, 10))}</span></li>)}{me.consents.length === 0 && <li className="py-3 text-sm">No consents recorded.</li>}</ul>
      </section>
      <section className="border-t border-ink pt-6 grid gap-4">
        <h2 className="text-3xl md:text-4xl">Your data, your call</h2>
        <div className="flex gap-3 flex-wrap"><button className="btn btn-ghost" onClick={download}>Download my data</button></div>
        {gone ? <div className="border-2 border-ink p-4" role="status"><b>Done.</b> Your account and data are deleted, you will get no more messages and you are off the Roll. <Link className="underline" href="/">Back to the public site</Link></div> : (
          <div className="border-2 border-alert p-4 grid gap-3">
            <b>Withdraw consent and delete my account</b>
            <p className="text-sm">You can do this any time. We stop all emails and remove you from the public Roll straight away. Your hours remain in anonymised totals so reports stay accurate. This can&apos;t be undone.</p>
            <button className="btn btn-sm justify-self-start" disabled={busy} style={{ background: "#B42318", color: "#fff", borderColor: "#B42318" }} onClick={remove}>Withdraw consent / delete my account</button>
          </div>)}
      </section>
    </div>
  );
}
