"use client";
import Link from "next/link";
import { useState } from "react";
import { Tally } from "@/components/Marks";
import { fmtDate } from "@/lib/data";
import { useMe } from "@/lib/useMe";

export default function Hours() {
  const { me, myHours, approved, pending, logHours } = useMe();
  const [a, setA] = useState(""); const [d, setD] = useState(""); const [h, setH] = useState("");
  const [err, setErr] = useState(""); const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(h);
    if (!a.trim() || !d || !(n > 0 && n <= 24)) { setErr("Add what you did, the date, and hours between 0.5 and 24."); return; }
    setBusy(true);
    const problem = await logHours({ activity: a.trim(), date: d, hours: n });
    setBusy(false);
    if (problem) { setErr(problem); return; }
    setA(""); setD(""); setH(""); setErr(""); setOk(true); setTimeout(() => setOk(false), 3000);
  };
  if (!me) return <div><h1 className="text-[length:var(--text-display)]">My <em className="accent">hours</em></h1><p className="mt-4">Your record starts with your first action. <Link className="underline font-bold" href="/opportunities">Find a call to action.</Link></p></div>;
  return (
    <div className="grid gap-12">
      <div>
        <h1 className="text-[length:var(--text-display)]">My <em className="accent">hours</em></h1>
        <p className="mt-3"><Link href="/guides" className="underline font-bold text-sm">How does this work?</Link></p>
        <div className="mt-6 grid md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-4"><div className="display text-[clamp(6rem,15vw,11rem)] leading-[0.8]">{approved}</div><div className="font-bold">approved hours · <span className="font-normal">{pending} pending</span></div></div>
          <div className="md:col-span-8"><Tally hours={approved} className="w-full max-w-xl text-ink" /></div>
        </div>
        <p className="why mt-3">Only approved hours count toward your totals, certificates and reports.</p>
      </div>

      <section className="grid md:grid-cols-12 gap-10">
        <div className="md:col-span-7">
          <h2 className="text-3xl md:text-4xl">The ledger</h2>
          <ul className="mt-3 border-t border-ink">
            {myHours.map((l) => (
              <li key={l.id} className="grid grid-cols-[auto_1fr_auto] gap-4 py-3 border-b border-rule items-center">
                <div className="display text-3xl w-12 text-right">{l.hours}</div>
                <div><div className="font-bold">{l.activity}</div><div className="text-sm opacity-75">{fmtDate(l.date)} · {l.method}</div></div>
                <span className={`stamp ${l.status === "approved" ? "stamp-ok" : l.status === "rejected" ? "stamp-bad" : "stamp-wait"}`}>{l.status}</span>
              </li>
            ))}
            {myHours.length === 0 && <li className="py-6">Your record starts with your first action. <Link className="underline font-bold" href="/opportunities">Find a call to action.</Link></li>}
          </ul>
        </div>
        <div className="md:col-span-5">
          <h2 className="text-3xl md:text-4xl">Log remote hours</h2>
          <form onSubmit={submit} className="mt-3 grid gap-4 border-2 border-ink p-4" noValidate>
            <div><label className="label" htmlFor="act">What did you do?</label><input id="act" className="input" value={a} onChange={(e) => setA(e.target.value)} placeholder="Wrote 4 posts for the Talkam campaign" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label" htmlFor="dt">Date</label><input id="dt" type="date" className="input" value={d} onChange={(e) => setD(e.target.value)} /></div>
              <div><label className="label" htmlFor="hr">Hours</label><input id="hr" inputMode="decimal" className="input" value={h} onChange={(e) => setH(e.target.value)} placeholder="3" /></div>
            </div>
            <span className="why -mt-2">An admin approves remote hours before they count. Events checked in by QR are recorded automatically.</span>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Send for approval"}</button>
            {ok && <p role="status" className="font-bold text-stamp">Sent. It stays pending until an admin approves it.</p>}
          </form>
        </div>
      </section>
    </div>
  );
}
