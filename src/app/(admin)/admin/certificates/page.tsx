import { redirect } from "next/navigation";
import { adminCaller, asCaller } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
import { CertificatesAdmin } from "@/components/admin/CertificatesAdmin";
import { certificateCandidates } from "@/lib/services/certificates";

export const metadata = { title: "Certificates" };

export default async function Page() {
  const me = await adminCaller("certificates.issue");
  if (!me) redirect("/admin/not-allowed");
  return <CertificatesAdmin candidates={await asCaller(me.caller, (tx) => certificateCandidates(tx))} />;
}
