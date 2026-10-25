"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EMPTY_GREQ, KEYS, useLocal, type GuardianReq } from "@/lib/store";

// Opened from the email sent to a parent or guardian. Prototype: the request lives in this browser;
// production looks the token up server-side, expires it after 7 days and records who consented and when.
export function GuardianProto() {
  const { token } = useParams<{ token: string }>();
  const [reqs, setReqs] = useLocal<GuardianReq[]>(KEYS.guardian, EMPTY_GREQ);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const r = reqs.find((x) => x.token === token);
  const set = (status: GuardianReq["status"]) => setReqs((p) => p.map((x) => (x.token === token ? { ...x, status, at: new Date().toISOString() } : x)));

  if (!ready) return <div className="min-h-[60vh]" />;
  if (!r) return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-16 min-h-[60vh]"><h1 className="text-[length:var(--text-display)]">Link not <em className="accent">found.</em></h1>
      <p className="mt-4 text-[length:var(--text-lead)]">This link may have expired (they work for 7 days) or was copied wrongly. Ask the young person to send a new one.</p></div>
  );
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-14 md:py-20 min-h-[60vh]">
      {r.status === "pending" ? (
        <>
          <p className="font-bold uppercase tracking-widest text-sm">Parent or guardian consent</p>
          <h1 className="text-[clamp(2.75rem,8vw,6rem)] mt-2"><em className="accent">{r.applicantFirst}</em> wants to volunteer</h1>
          <div className="mt-6 grid gap-4 text-[length:var(--text-lead)] max-w-2xl">
            <p>Hello {r.guardianName}. {r.applicantFirst} has applied to volunteer with Devatop Centre for Africa Development, a youth-led organisation working against human trafficking and abuse. Because they are under 18, we need your permission first.</p>
            <p><b>How we keep young volunteers safe:</b> no young volunteer works alone, none works with children or survivors, every activity has a trained adult lead, and every volunteer signs our safeguarding agreement. You can withdraw consent at any time.</p>
            <p className="text-sm opacity-80">We record your answer with the date and time. We only use your contact details for this consent.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="btn text-lg" onClick={() => set("given")}>I give consent</button>
            <button className="btn btn-ghost text-lg" onClick={() => confirm(`Refuse consent for ${r.applicantFirst}?`) && set("refused")}>I do not give consent</button>
          </div>
        </>
      ) : r.status === "given" ? (
        <><span className="stamp stamp-ok text-base">Consent recorded</span><h1 className="text-[length:var(--text-display)] mt-4">Thank <em className="accent">you.</em></h1>
          <p className="mt-4 text-[length:var(--text-lead)] max-w-xl">{r.applicantFirst} can now finish their application. You can close this page.</p></>
      ) : (
        <><span className="stamp stamp-bad text-base">Consent refused</span><h1 className="text-[length:var(--text-display)] mt-4">Understood.</h1>
          <p className="mt-4 text-[length:var(--text-lead)] max-w-xl">{r.applicantFirst} will not be able to apply for now. If you change your mind, ask them to send a new link.</p></>
      )}
    </div>
  );
}
