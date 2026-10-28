"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROLE_LABEL, type Action, type Admin } from "@/lib/permissions";
import { RealAdminContext, useAdmin } from "@/lib/useAdmin";
import { SignOutButton } from "@/components/SignOutButton";
import { supabaseBrowser } from "@/lib/auth/supabase-browser";
import { ADMIN_IDLE_MS } from "@/lib/auth/routing";

// Admin section: no motion, no custom cursor (requirements section 16). Dense, calm, work-first.
const NAV: { label: string; href: string; need: Action }[] = [
  { label: "Today", href: "/admin", need: "overview" },
  { label: "Applications", href: "/admin/applications", need: "applications.decide" },
  { label: "Opportunities", href: "/admin/opportunities", need: "opportunities.edit" },
  { label: "Attendance", href: "/admin/attendance", need: "attendance.take" },
  { label: "Hours", href: "/admin/hours", need: "hours.approve" },
  { label: "Volunteers", href: "/admin/volunteers", need: "volunteers.list" },
  { label: "Certificates", href: "/admin/certificates", need: "certificates.issue" },
  { label: "Reports", href: "/admin/reports", need: "reports.see" },
  { label: "Messages", href: "/admin/messages", need: "email.bulk" },
  { label: "Chat", href: "/admin/chat", need: "overview" },
  { label: "Departments", href: "/admin/departments", need: "departments.assign" },
  { label: "Admins", href: "/admin/admins", need: "admins.manage" },
  { label: "Site images", href: "/admin/images", need: "settings.edit" },
  { label: "Audit log", href: "/admin/audit", need: "audit.see" },
];

/** Idle and sign-out end the real session. */
export function AdminShell({ children, realAdmin }: { children: React.ReactNode; realAdmin: Admin }) {
  return <RealAdminContext.Provider value={realAdmin}><ShellInner>{children}</ShellInner></RealAdminContext.Provider>;
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { admin, can } = useAdmin();

  // sessions in the admin section end after 30 minutes idle (the proxy enforces the same limit on the server)
  useEffect(() => {
    const expire = async () => { await supabaseBrowser().auth.signOut(); router.push("/login?reason=idle"); };
    let t = setTimeout(expire, ADMIN_IDLE_MS);
    const bump = () => { clearTimeout(t); t = setTimeout(expire, ADMIN_IDLE_MS); };
    window.addEventListener("pointerdown", bump); window.addEventListener("keydown", bump);
    return () => { clearTimeout(t); window.removeEventListener("pointerdown", bump); window.removeEventListener("keydown", bump); };
  }, [router]);

  const current = NAV.find((n) => (n.href === "/admin" ? path === "/admin" : path.startsWith(n.href)));
  const allowed = !current || can(current.need);

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[15rem_1fr]">
      <aside className="print:hidden bg-ink text-paper md:min-h-screen md:sticky md:top-0 md:h-screen p-4 flex flex-col gap-5">
        <div><Link href="/" className="display text-3xl">Devatop</Link><span className="ml-2 bg-orange text-ink text-xs font-bold px-1.5 py-0.5 uppercase">Admin</span></div>
        <p className="text-xs opacity-80">Signed in · two-factor on · session ends after 30 min idle</p>
        <nav aria-label="Admin" className="flex md:grid gap-1 overflow-x-auto">
          {NAV.filter((n) => can(n.need)).map((n) => {
            const on = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
            return <Link key={n.href} href={n.href} className={`px-3 py-2.5 font-bold whitespace-nowrap ${on ? "bg-orange text-ink" : "hover:bg-paper/10"}`}>{n.label}</Link>;
          })}
        </nav>
        <div className="mt-auto grid gap-2 text-sm">
          <SignOutButton className="text-left underline opacity-80" />
        </div>
      </aside>
      <main id="main" className="p-4 md:p-8 min-w-0">
        <div className="text-sm font-bold mb-4 flex flex-wrap gap-x-3"><span>{admin.name}</span><span className="opacity-60">{ROLE_LABEL[admin.role]}{admin.scope ? ` · ${admin.scope}` : ""}</span></div>
        {allowed ? children : (
          <div className="max-w-lg py-10">
            <p className="display text-6xl">Not allowed.</p>
            <p className="mt-3 text-lg">This page is not for your account. <Link className="underline font-bold" href="/admin">Go back to your dashboard.</Link></p>
          </div>
        )}
      </main>
    </div>
  );
}
