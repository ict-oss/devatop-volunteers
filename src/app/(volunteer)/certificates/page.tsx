"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CERT_CODE, useMe } from "@/lib/useMe";
import { DEPARTMENTS } from "@/lib/data";

export default function Certificates() {
  const { me, approved } = useMe();
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toString(`${location.origin}/verify/${CERT_CODE}`, { type: "svg", margin: 0, color: { dark: "#16130F", light: "#00000000" } }).then(setQr).catch(() => {});
  }, []);
  const dept = me ? DEPARTMENTS.find((d) => d.id === me.departments[0])?.name : "";

  if (!me || approved === 0) {
    return <div><h1 className="text-[length:var(--text-display)]">My <em className="accent">certificates</em></h1>
      <p className="mt-4 max-w-xl">Certificates are issued from approved hours only. Your record starts with your first action.</p><Link href="/opportunities" className="btn mt-5">Find a call to action</Link></div>;
  }
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[length:var(--text-display)]">My <em className="accent">certificates</em></h1>
        <div className="flex gap-2 print:hidden"><button className="btn" onClick={() => window.print()}>Print / save as PDF</button><button className="btn btn-ghost" onClick={() => alert("Prototype: production sends a letter request to a coordinator.")}>Request a recommendation letter</button></div>
      </div>

      {/* The front page of "The Devatop Record" */}
      <article className="border-2 border-ink bg-paper p-5 md:p-10 relative" aria-label="Certificate of volunteering">
        <div className="flex items-baseline justify-between border-b-4 border-ink pb-3">
          <span className="display text-4xl md:text-6xl">The Devatop Record</span>
          <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-right">Volunteer edition<br />Devatop Centre for Africa Development</span>
        </div>
        <p className="mt-6 uppercase tracking-widest font-bold text-sm">This certifies that</p>
        <h2 className="text-[clamp(3.5rem,13vw,10rem)] leading-[0.85] mt-1">{me.first} {me.last}</h2>
        <p className="mt-4 text-[length:var(--text-lead)] max-w-3xl">
          volunteered <b>{approved} approved hours</b>{dept ? <> in <b>{dept}</b></> : null}, 12 Sep 2026 to 17 Oct 2026, because <em className="accent" style={{ color: "#B83A12" }}>volunteers are known by action.</em>
        </p>
        <div className="mt-8 pt-5 border-t border-ink grid sm:grid-cols-[1fr_auto] gap-6 items-end">
          <div className="text-sm"><p><b>Verification code:</b> <code className="bg-ink text-paper px-2 py-0.5">{CERT_CODE}</code></p><p className="mt-1">Scan the code or visit <b>/verify/{CERT_CODE}</b>. The page confirms this certificate is genuine and shows nothing else about the volunteer.</p></div>
          <div className="w-28 h-28 sm:w-32 sm:h-32" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code that opens the verification page" role="img" />
        </div>
      </article>
      <p className="text-sm opacity-75">Prototype: the certificate uses the demo code. In production a PDF is generated server-side with a fresh unique code, and a certificate cannot be issued for hours that are not approved.</p>
      <Link href={`/verify/${CERT_CODE}`} className="underline font-bold print:hidden">Open the public verification page</Link>
    </div>
  );
}
