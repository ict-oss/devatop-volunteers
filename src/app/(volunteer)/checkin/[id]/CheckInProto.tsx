"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { fmtDate } from "@/lib/data";
import { EMPTY_ATT, KEYS, SEED_HOURS, newId, nowIso, useLocal, type Attendance, type HourLog } from "@/lib/store";
import { useOpps } from "@/lib/useOpps";
import { useMe } from "@/lib/useMe";

const t = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");

export function CheckInProto() {
  const { id } = useParams<{ id: string }>();
  const { opps } = useOpps();
  const { me, loadDemo } = useMe();
  const [att, setAtt] = useLocal<Attendance[]>(KEYS.attendance, EMPTY_ATT);
  const [, setHours] = useLocal<HourLog[]>(KEYS.hours, SEED_HOURS);
  const [signups, setSignups] = useLocal<string[]>(KEYS.signups, []);
  const [stay, setStay] = useState("4");
  const o = opps.find((x) => x.id === id);

  if (!o) return <div><h1 className="text-[length:var(--text-display)]">Wrong <em className="accent">code.</em></h1><p className="mt-3">We can&apos;t find that event. Ask the coordinator to show the QR again.</p></div>;
  if (!me) return (
    <div className="max-w-xl"><h1 className="text-[length:var(--text-display)]">Check in to <em className="accent">{o.title}</em></h1>
      <p className="mt-4">You need to be an approved volunteer to check in.</p>
      <div className="mt-5 flex gap-3 flex-wrap"><Link href="/apply" className="btn">Become a volunteer</Link><button className="btn btn-ghost" onClick={loadDemo}>Prototype: load demo volunteer</button></div></div>
  );
  if (me.stage !== "Approved") return <div><h1 className="text-[length:var(--text-display)]">Not yet, <em className="accent">{me.first}.</em></h1><p className="mt-3">Check-in opens once your application is approved.</p></div>;

  const who = `${me.first} ${me.last}`;
  const rec = att.find((a) => a.oppId === o.id && a.who === who);
  const signed = signups.includes(o.id);

  const checkIn = () => {
    // walk-ins are allowed at the door; the coordinator sees them on the list
    if (!signed) setSignups((p) => [...p, o.id]);
    setAtt((p) => [...p, { id: newId(), oppId: o.id, who, mine: true, checkIn: nowIso(), method: "QR" }]);
  };
  const checkOut = () => {
    const h = Number(stay);
    if (!(h > 0 && h <= 24)) return;
    setAtt((p) => p.map((a) => (a.id === rec?.id ? { ...a, checkOut: nowIso() } : a)));
    // hours recorded automatically; they stay pending until an admin approves them
    setHours((p) => (p.some((x) => x.mine && x.activity === o.title) ? p : [{ id: newId(), who, mine: true, activity: o.title, date: o.date, hours: h, status: "pending", method: "QR", programme: o.programme, state: o.state }, ...p]));
  };

  const done = !!(rec?.checkIn && rec?.checkOut);
  return (
    <div className="max-w-2xl grid gap-6">
      <div><p className="font-bold uppercase tracking-widest text-sm">{o.programme} · {fmtDate(o.date)}</p>
        <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] mt-1">{done ? <>Thank <em className="accent">you.</em></> : rec?.checkIn ? <>You&apos;re <em className="accent">in.</em></> : <>Check in</>}</h1></div>
      <p className="text-[length:var(--text-lead)]"><b>{o.title}</b><br />{o.place}, {o.state}</p>

      {!rec?.checkIn && <button className="btn text-xl min-h-16" onClick={checkIn}>I&apos;m here — check me in</button>}
      {rec?.checkIn && !rec.checkOut && (
        <div className="grid gap-4 border-2 border-ink p-4">
          <p><span className="stamp stamp-ok">Checked in</span> at <b>{t(rec.checkIn)}</b>. Scan again, or tap below, when you leave.</p>
          <label className="max-w-48"><span className="label">Prototype: time on site (hours)</span><input className="input" inputMode="decimal" value={stay} onChange={(e) => setStay(e.target.value)} /></label>
          <button className="btn btn-ink text-xl min-h-16" onClick={checkOut}>Check me out</button>
        </div>
      )}
      {done && (
        <div className="border-2 border-ink p-4 grid gap-2" role="status">
          <p><span className="stamp stamp-ok">Checked out</span> {t(rec!.checkIn)} → {t(rec!.checkOut)}</p>
          <p>Your {stay} hours are recorded and wait for an admin to approve them. Only approved hours count.</p>
          <div className="flex gap-3 flex-wrap mt-2"><Link href="/hours" className="btn">See my hours</Link><Link href="/opportunities" className="btn btn-ghost">Find another call</Link></div>
        </div>
      )}
    </div>
  );
}
