import { redirect } from "next/navigation";
import { adminCaller, asCaller, trusted } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
import { AuditAdmin } from "@/components/admin/AuditAdmin";
import { auditRaw, nameAuditRows } from "@/lib/services/overview";

export const metadata = { title: "Audit log" };

export default async function Page() {
  const me = await adminCaller("audit.see");
  if (!me) redirect("/admin/not-allowed");
  const raw = await asCaller(me.caller, (tx) => auditRaw(tx)); // the admin's own query finishes first
  return <AuditAdmin rows={await nameAuditRows(trusted(), raw)} />;
}
