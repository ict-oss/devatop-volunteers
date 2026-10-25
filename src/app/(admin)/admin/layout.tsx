import { connection } from "next/server";
import { AdminShell } from "@/components/AdminShell";
import { authEnabled } from "@/lib/env";
import { requireAdmin } from "@/lib/auth/session";

/**
 * Server-side door for every /admin page (rule 1): signed in, an admin, two-factor done. Anyone else is redirected
 * (a volunteer lands on /admin/not-allowed). Each page still calls requireAdmin(its own action) once it reads real data.
 * Off until AUTH_ENABLED=true, so the clickable prototype keeps working for reviewers.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection(); // always render per request, so AUTH_ENABLED is read when the page is opened, not frozen at build time
  const real = authEnabled();
  if (real) await requireAdmin("overview");
  return <AdminShell realAuth={real}>{children}</AdminShell>;
}
