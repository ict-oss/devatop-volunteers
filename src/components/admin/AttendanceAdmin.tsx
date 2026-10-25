"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { qrSecretAction, saveAttendanceAction, setPresentAction } from "@/app/actions/admin";
import { fmtDate } from "@/lib/data";
import type { OpportunityView } from "@/lib/services/opportunities";
import type { RosterRow } from "@/lib/services/attendance";
import { useAdmin } from "@/lib/useAdmin";
import { useAct } from "./useAct";

/** The door list and the QR code. The QR holds the call's secret, so only someone who may take attendance here can ever see it. */
export function AttendanceAdmin({ opps, selected, roster }: { opps: OpportunityView[]; selected: OpportunityView | null; roster: RosterRow[] }) {
  const { can } = useAdmin();
  const router = useRouter();
  const { act, busy, note } = useAct();
  const [each, setEach] = useState("4");
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const mark = can("attendance.take");

  // fetch the secret on demand and draw the QR in the browser (it never travels in the page's HTML)
  useEffect(() => {
    setQr(""); setUrl("");
    if (!selected || !mark) return;
    let live = true;
    qrSecretAction(selected.id).then(async (r) => {
      if (!live || !r.ok) return;
      const link = `${location.origin}/checkin/${selected.id}?s=${r.data.secret}`;
      setUrl(link);
      setQr(await QRCode.toString(link, { type: "svg", margin: 0, color: { dark: "#16130F", light: "#00000000" } }));
    });
    return () => { live = false; };
  }, [selected, mark]);

  if (!selected) return <div><h1 className="text-5xl md:text-7xl">Attendance</h1><p className="mt-3">No calls in your area yet. <a className="underline font-bold" href="/admin/opportunities">Create one.</a></p></div>;
  const present = roster.filter((r) => r.present).length;
  return (
    <div className="grid gap-8">
      <div><h1 className="text-5xl md:text-7xl">Attendance</h1><p className="mt-1 text-sm">Show the QR at the door, or tick people off from the list on your phone. Approve hours in bulk afterwards.</p></div>
      <label className="max-w-xl"><span className="label">Event</span>
        <select className="input" value={selected.id} onChange={(e) => router.push(`/admin/attendance?o=${e.target.value}`)}>{opps.map((x) => <option key={x.id} value={x.id}>{x.title}: {fmtDate(x.date)}</option>)}</select></label>
      <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start">
        <section className="border-2 border-ink p-4 print:border-0" aria-label="Event QR code">
          <div className="w-52 h-52" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label="QR code for volunteers to check in and out" />
          <p className="mt-3 text-sm font-bold max-w-52">Volunteers scan to check in on arrival and out when they leave. It works from 3 hours before the start to 6 hours after the end.</p>
          <div className="flex gap-2 mt-3 print:hidden"><button className="btn btn-sm" disabled={!qr} onClick={() => window.print()}>Print QR</button>{url && <a className="btn btn-sm btn-ghost" href={url} target="_blank" rel="noreferrer">Try it</a>}</div>
        </section>
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-3xl">Sign-up list</h2><b>{present}/{roster.length} present</b></div>
          <ul className="mt-2 border-t-2 border-ink">
            {roster.map((r) => (
              <li key={r.userId} className="py-1 border-b border-rule">
                <label className="flex items-center gap-4 min-h-14 cursor-pointer">
                  <input type="checkbox" className="size-7 accent-[#16130F]" disabled={!mark || busy} checked={r.present} onChange={(e) => act(setPresentAction(selected.id, r.userId, e.target.checked), "")} aria-label={`Mark ${r.name} present`} />
                  <span className="font-bold flex-1">{r.name}{r.walkIn && <span className="stamp stamp-info ml-2">Walk-in</span>}{r.signupStatus === "waitlisted" && <span className="stamp stamp-wait ml-2">Waitlist</span>}</span>
                  <span className="text-sm">{r.checkedOutAt ? <span className="stamp stamp-ok">{r.method === "qr" ? "QR in/out" : "Done"}</span> : r.checkedInAt ? <span className="stamp stamp-info">{r.method === "qr" ? "Checked in" : "Present"}</span> : <span className="opacity-50">&mdash;</span>}</span>
                </label>
              </li>))}
          </ul>
          {roster.length === 0 && <p className="py-6">Nobody has signed up yet.</p>}
          <div className="mt-5 flex flex-wrap gap-3 items-end">
            <label><span className="label">Hours each</span><input className="input w-28" inputMode="decimal" value={each} onChange={(e) => setEach(e.target.value)} /></label>
            <button className="btn" disabled={!mark || busy || present === 0} onClick={() => act(saveAttendanceAction(selected.id, Number(each)), (d) => `Attendance saved. ${d.added} hours ${d.added === 1 ? "entry" : "entries"} added, waiting for approval in Hours.`)}>Save attendance</button>
          </div>
          {!mark && <p className="text-sm mt-2">Your role cannot take attendance.</p>}
          <div className="mt-3">{note}</div>
        </section>
      </div>
    </div>
  );
}
