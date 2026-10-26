import { connection } from "next/server";
import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/auth/session";

/**
 * Server-side door for every /admin page (rule 1): signed in, an admin, two-factor done. Anyone else is redirected
 * (a volunteer lands on /admin/not-allowed). Each page still calls requireAdmin(its own action) once it reads real data.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection(); // always render per request: who is signed in is never frozen at build time
  const session = await requireAdmin("overview");
  return <AdminShell realAdmin={session.admin}>{children}</AdminShell>;
}
