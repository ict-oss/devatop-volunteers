"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLive } from "@/lib/live";
import type { CertificateView } from "@/lib/services/certificates";
import { fmtDate } from "@/lib/data";

function Certificate({ c }: { c: CertificateView }) {
  const [qr, setQr] = useState("");
  useEffect(() => { QRCode.toString(`${location.origin}/verify/${c.code}`, { type: "svg", margin: 0, color: { dark: "#16130F", light: "#00000000" } }).then(setQr).catch(() => {}); }, [c.code]);
  return (
    <article className="border-2 border-ink bg-paper p-5 md:p-10 relative" aria-label="Certificate of volunteering">
      <div className="flex items-baseline justify-between border-b-4 border-ink pb-3">
        <span className="display text-4xl md:text-6xl">The Devatop Record</span>
        <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-right">Volunteer edition<br />Devatop Centre for Africa Development</span>
      </div>
      <p className="mt-6 uppercase tracking-widest font-bold text-sm">This certifies that</p>
      <h2 className="text-[clamp(3.5rem,13vw,10rem)] leading-[0.85] mt-1">{c.holderName}</h2>
      <p className="mt-4 text-[length:var(--text-lead)] max-w-3xl">
        volunteered <b>{c.hours} approved hours</b>{c.roleTitle ? <> as <b>{c.roleTitle}</b></> : null}, {fmtDate(c.periodStart)} to {fmtDate(c.periodEnd)}, because <em className="accent" style={{ color: "#B83A12" }}>volunteers are known by action.</em>
      </p>
      <div className="mt-8 pt-5 border-t border-ink grid sm:grid-cols-[1fr_auto] gap-6 items-end">
        <div className="text-sm"><p><b>Verification code:</b> <code className="bg-ink text-paper px-2 py-0.5">{c.code}</code></p><p className="mt-1">Scan the code or visit <b>/verify/{c.code}</b>. The page confirms this certificate is genuine and shows nothing else about the volunteer.</p></div>
        <div className="w-28 h-28 sm:w-32 sm:h-32" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code that opens the verification page" role="img" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2 print:hidden">
        <a className="btn btn-sm" href={`/api/certificates/${c.code}/pdf`} target="_blank" rel="noreferrer">Download PDF</a>
        <Link className="btn btn-sm btn-ghost" href={`/verify/${c.code}`}>Open the public verification page</Link>
      </div>
    </article>
  );
}

export function CertificatesReal() {
  const live = useLive()!;
  const certs = live.certs;
  const approved = live.hours.filter((h) => h.status === "approved").reduce((s, h) => s + h.hours, 0);
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[length:var(--text-display)]">My <em className="accent">certificates</em></h1>
        {certs.length > 0 && <button className="btn print:hidden" onClick={() => window.print()}>Print</button>}
      </div>
      {certs.length === 0 ? (
        <div>
          <p className="max-w-xl">Certificates are issued by a coordinator from <b>approved hours only</b>. You have <b>{approved}</b> approved hour{approved === 1 ? "" : "s"} so far.
            {approved > 0 ? " Ask your coordinator to issue your certificate." : " Your record starts with your first action."}</p>
          <Link href="/opportunities" className="btn mt-5">Find a call to action</Link>
        </div>
      ) : certs.map((c) => <Certificate key={c.id} c={c} />)}
    </div>
  );
}
