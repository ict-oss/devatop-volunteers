import { redirect } from "next/navigation";
import { authEnabled } from "@/lib/env";
import { adminCaller, asCaller } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
import { CertificatesAdmin } from "@/components/admin/CertificatesAdmin";
import { certificateCandidates } from "@/lib/services/certificates";

export const metadata = { title: "Certificates" };

export default async function Page() {
  if (!authEnabled()) return <div className="max-w-xl"><h1 className="text-5xl md:text-7xl">Certificates</h1><p className="mt-3">Issuing certificates from approved hours is available once sign-in is switched on. Volunteers get a PDF with a QR code that opens a public check page.</p></div>;
  const me = await adminCaller("certificates.issue");
  if (!me) redirect("/admin/not-allowed");
  return <CertificatesAdmin candidates={await asCaller(me.caller, (tx) => certificateCandidates(tx))} />;
}
