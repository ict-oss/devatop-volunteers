"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { fmtDate } from "@/lib/data";
import { EMPTY_ATT, KEYS, SEED_APPS, SEED_HOURS, newId, nowIso, useLocal, type Application, type Attendance, type HourLog } from "@/lib/store";
import { rosterFor, useOpps } from "@/lib/useOpps";
import { useAdmin } from "@/lib/useAdmin";

function Inner() {
  const { can, inScope, log } = useAdmin();
  const params = useSearchParams();
  const { opps } = useOpps();
  const [signups] = useLocal<string[]>(KEYS.signups, []);
  const [apps] = useLocal<Application[]>(KEYS.apps, SEED_APPS);
  const [att, setAtt] = useLocal<Attendance[]>(KEYS.attendance, EMPTY_ATT);
  const [, setHours] = useLocal<HourLog[]>(KEYS.hours, SEED_HOURS);
  const list = opps.filter((o) => inScope({ state: o.state }) || o.mode === "Remote");
  const [oid, setOid] = useState(params.get("o") ?? "");
  const o = list.find((x) => x.id === oid) ?? list[0];
  const me = apps.find((a) => a.mine);
  const meName = me ? `${me.first} ${me.last}` : null;
  const [each, setEach] = useState("4");
  const [qr, setQr] = useState("");
  const [msg, setMsg] = useState("");
  const mark = can("attendance.take");

  const roster = useMemo(() => (o ? rosterFor(o, meName, signups.includes(o.id)) : []), [o, meName, signups]);
  const rec = (who: string) => att.find((a) => a.oppId === o?.id && a.who === who);
  const url = typeof window !== "undefined" && o ? `${location.origin}/checkin/${o.id}` : "";
  useEffect(() => { if (url) QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#16130F", light: "#00000000" } }).then(setQr).catch(() => {}); }, [url]);

  if (!o) return <p>No opportunities in your scope.</p>;

  const toggle = (who: string, mine: boolean) => {
    if (!mark) return;
    setAtt((p) => {
      const ex = p.find((a) => a.oppId === o.id && a.who === who);
      if (ex) return p.map((a) => (a.id === ex.id ? { ...a, present: !a.present } : a));
      return [...p, { id: newId(), oppId: o.id, who, mine, present: true, method: "Coordinator" }];
    });
  };
  const present = roster.filter((r) => rec(r.who)?.present || (rec(r.who)?.checkIn && rec(r.who)?.checkOut));
  const submit = () => {
    const h = Number(each);
    if (!(h > 0 && h <= 24)) { setMsg("Enter hours between 0.5 and 24."); return; }
    // hours already recorded for this event (QR check-out) are not duplicated
    let made = 0;
    setHours((p) => {
      const have = new Set(p.filter((x) => x.activity === o.title).map((x) => x.who));
      const add: HourLog[] = present.filter((r) => !have.has(r.who)).map((r) => ({ id: newId(), who: r.who, mine: r.mine, activity: o.title, date: o.date, hours: h, status: "pending", method: "Coordinator", programme: o.programme, state: o.state }));
      made = add.length; return [...add, ...p];
    });
    log("Attendance saved", `${o.title} · ${present.length} present`);
    setMsg(`Attendance saved for ${present.length}. Hours sit as pending until approved in Hours.`);
    setTimeout(() => setMsg(""), 5000);
  };

  return (
    <div className="grid gap-8">
      <div><h1 className="text-5xl md:text-7xl">Attendance</h1><p className="mt-1 text-sm">Show the QR at the door, or tick people off from the list on your phone. Approve hours in bulk afterwards.</p></div>
      <label className="max-w-xl"><span className="label">Event</span>
        <select className="input" value={o.id} onChange={(e) => setOid(e.target.value)}>{list.map((x) => <option key={x.id} value={x.id}>{x.title} — {fmtDate(x.date)}</option>)}</select></label>

      <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start">
        <section className="border-2 border-ink p-4 print:border-0" aria-label="Event QR code">
          <div className="w-52 h-52" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label="QR code for volunteers to check in and out" />
          <p className="mt-3 text-sm font-bold max-w-52">Volunteers scan to check in on arrival and out when they leave.</p>
          <p className="text-xs break-all max-w-52 mt-1 opacity-70">{url}</p>
          <div className="flex gap-2 mt-3 print:hidden"><button className="btn btn-sm" onClick={() => window.print()}>Print QR</button><a className="btn btn-sm btn-ghost" href={url} target="_blank" rel="noreferrer">Try it</a></div>
        </section>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-3xl">Sign-up list</h2><b>{present.length}/{roster.length} present</b></div>
          <ul className="mt-2 border-t-2 border-ink">
            {roster.map((r) => {
              const a = rec(r.who);
              const done = !!(a?.checkIn && a?.checkOut);
              return (
                <li key={r.key} className="py-1 border-b border-rule">
                  <label className="flex items-center gap-4 min-h-14 cursor-pointer">
                    <input type="checkbox" className="size-7 accent-[#16130F]" disabled={!mark} checked={!!a?.present || done} onChange={() => toggle(r.who, r.mine)} aria-label={`Mark ${r.who} present`} />
                    <span className="font-bold flex-1">{r.who}{r.mine && " (you)"}</span>
                    <span className="text-sm">{done ? <span className="stamp stamp-ok">QR in/out</span> : a?.checkIn ? <span className="stamp stamp-info">Checked in</span> : a?.present ? <span className="stamp stamp-ok">Present</span> : <span className="opacity-50">—</span>}</span>
                  </label>
                </li>);
            })}
          </ul>
          {roster.length === 0 && <p className="py-6">Nobody has signed up yet.</p>}
          <div className="mt-5 flex flex-wrap gap-3 items-end">
            <label><span className="label">Hours each</span><input className="input w-28" inputMode="decimal" value={each} onChange={(e) => setEach(e.target.value)} /></label>
            <button className="btn" disabled={!mark || present.length === 0} onClick={submit}>Save attendance</button>
          </div>
          {!mark && <p className="text-sm mt-2">Your role cannot take attendance.</p>}
          {msg && <p role="status" className="mt-3 font-bold border-l-4 border-orange pl-3">{msg}</p>}
        </section>
      </div>
    </div>
  );
}

export default function Attendance() { return <Suspense fallback={null}><Inner /></Suspense>; }
