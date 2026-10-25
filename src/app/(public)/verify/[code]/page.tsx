import Link from "next/link";
import { Check } from "@/components/Marks";
import { authEnabled } from "@/lib/env";
import { fmtDate } from "@/lib/data";
import { verifyCertificate } from "@/lib/services/certificates";
import { asVisitor } from "@/lib/server/caller";

export const metadata = { title: "Verify a certificate", robots: { index: false } };
export const dynamic = "force-dynamic";

// Prototype: one demo certificate. In production this looks the code up in `certificates`
// and shows ONLY name, hours and dates (no other personal data).
const DEMO = { code: "DVT-7K2M-9QXA", name: "Amaka Obi", hours: 18, start: "12 Sep 2026", end: "17 Oct 2026" };

export default async function Verify({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  // real mode: look the code up in the database; only name, hours and dates come back (nothing else about the person)
  const real = authEnabled() ? await asVisitor((tx) => verifyCertificate(tx, code)) : null;
  const cert = authEnabled() ? real && { code: code.toUpperCase(), name: real.holderName, hours: real.hours, start: fmtDate(real.periodStart), end: fmtDate(real.periodEnd) } : code.toUpperCase() === DEMO.code ? DEMO : null;
  const ok = !!cert;
  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-16 md:py-24 min-h-[60vh]">
      {ok ? (
        <>
          <span className="stamp stamp-ok text-base inline-flex items-center gap-2"><Check className="w-5 h-5" /> Verified</span>
          <h1 className="text-[length:var(--text-display)] mt-4">This certificate is <em className="accent" style={{ color: "#0B6E4F" }}>genuine.</em></h1>
          <p className="mt-8 text-[length:var(--text-lead)] max-w-2xl">
            Issued by Devatop Centre for Africa Development to <b>{cert!.name}</b> for <b>{cert!.hours} hours</b> of volunteering, {cert!.start} to {cert!.end}.
          </p>
          <p className="mt-4 text-sm opacity-70">Code {cert!.code}. For privacy, this page shows nothing else about the volunteer.</p>
        </>
      ) : (
        <>
          <span className="stamp stamp-bad text-base">Not found</span>
          <h1 className="text-[length:var(--text-display)] mt-4">We can&apos;t find that <em className="accent" style={{ color: "#B42318" }}>code.</em></h1>
          <p className="mt-6 text-[length:var(--text-lead)] max-w-xl">Check the code on the certificate and try again. {!authEnabled() && <>Demo code: <Link className="underline font-bold" href="/verify/DVT-7K2M-9QXA">DVT-7K2M-9QXA</Link></>}</p>
        </>
      )}
      <Link href="/apply" className="btn mt-10">Become a volunteer</Link>
    </div>
  );
}
