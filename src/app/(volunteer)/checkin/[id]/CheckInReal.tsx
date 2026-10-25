"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { attendanceAction, checkInAction, checkOutAction } from "@/app/actions/volunteer";
import { fmtDate } from "@/lib/data";
import { useLive } from "@/lib/live";
import type { MyAttendance } from "@/lib/services/attendance";

const t = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");

/** QR check-in on the real database. The QR holds the call and its secret; the database checks the secret, the time window and that the person is an approved volunteer. */
export function CheckInReal() {
  const { id } = useParams<{ id: string }>();
  const secret = useSearchParams().get("s") ?? "";
  const live = useLive()!;
  const o = [...live.checkin, ...live.opps].find((x) => x.id === id);
  const [att, setAtt] = useState<MyAttendance | null>(null);
  const [hours, setHours] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (live.signedIn && o) attendanceAction(id).then((r) => r.ok && setAtt(r.data)); }, [id, live.signedIn, o]);

  if (!o) return <div><h1 className="text-[length:var(--text-display)]">Not <em className="accent">open.</em></h1><p className="mt-3 max-w-xl">Check-in opens 3 hours before a call starts and closes 6 hours after it ends. If that should be now, ask the coordinator to show the QR code again.</p></div>;
  if (!live.signedIn) return <div className="max-w-xl"><h1 className="text-[length:var(--text-display)]">Check in to <em className="accent">{o.title}</em></h1><p className="mt-4">Sign in first. You need to be an approved volunteer to check in.</p><Link href={`/login?next=${encodeURIComponent(`/checkin/${id}?s=${secret}`)}`} className="btn mt-5">Sign in</Link></div>;
  if (live.me?.stage !== "Approved") return <div><h1 className="text-[length:var(--text-display)]">Not yet, <em className="accent">{live.me?.first ?? "friend"}.</em></h1><p className="mt-3">Check-in opens once your application is approved.</p></div>;

  async function go(kind: "in" | "out") {
    setBusy(true); setError("");
    const r = kind === "in" ? await checkInAction(id, secret) : await checkOutAction(id, secret);
    setBusy(false);
    if (!r.ok) { setError(r.message); return; }
    setAtt({ checkedInAt: r.data.checkedInAt, checkedOutAt: r.data.checkedOutAt });
    if (kind === "out") setHours((r.data as MyAttendance & { hours: number }).hours);
  }
  const done = !!(att?.checkedInAt && att?.checkedOutAt);
  return (
    <div className="max-w-2xl grid gap-6">
      <div><p className="font-bold uppercase tracking-widest text-sm">{o.programme} · {fmtDate(o.date)}</p>
        <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] mt-1">{done ? <>Thank <em className="accent">you.</em></> : att?.checkedInAt ? <>You&apos;re <em className="accent">in.</em></> : <>Check in</>}</h1></div>
      <p className="text-[length:var(--text-lead)]"><b>{o.title}</b><br />{o.place}, {o.state}</p>
      {!secret && <p className="border-2 border-ink p-3 font-bold">Scan the QR code at the venue to check in. This page needs the code from the QR.</p>}
      {!att?.checkedInAt && <button className="btn text-xl min-h-16" disabled={busy || !secret} onClick={() => go("in")}>{busy ? "Checking in…" : "I\u2019m here: check me in"}</button>}
      {att?.checkedInAt && !att.checkedOutAt && (
        <div className="grid gap-4 border-2 border-ink p-4">
          <p><span className="stamp stamp-ok">Checked in</span> at <b>{t(att.checkedInAt)}</b>. Scan the code again, or tap below, when you leave.</p>
          <button className="btn btn-ink text-xl min-h-16" disabled={busy || !secret} onClick={() => go("out")}>{busy ? "Checking out…" : "Check me out"}</button>
        </div>
      )}
      {done && (
        <div className="border-2 border-ink p-4 grid gap-2" role="status">
          <p><span className="stamp stamp-ok">Checked out</span> {t(att!.checkedInAt)} to {t(att!.checkedOutAt)}</p>
          <p>{hours ? `Your ${hours} hours are` : "Your hours are"} recorded and wait for an admin to approve them. Only approved hours count.</p>
          <div className="flex gap-3 flex-wrap mt-2"><Link href="/hours" className="btn">See my hours</Link><Link href="/opportunities" className="btn btn-ghost">Find another call</Link></div>
        </div>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}
