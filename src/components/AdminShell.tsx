"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { DEMO_ADMINS, ROLE_LABEL, type Action } from "@/lib/permissions";
import { useAdmin } from "@/lib/useAdmin";
import { resetDemo } from "@/lib/store";
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
  { label: "Reports", href: "/admin/reports", need: "reports.see" },
  { label: "Messages", href: "/admin/messages", need: "email.bulk" },
  { label: "Chat", href: "/admin/chat", need: "overview" },
  { label: "Departments", href: "/admin/departments", need: "departments.assign" },
  { label: "Audit log", href: "/admin/audit", need: "audit.see" },
];

/** `realAuth` is true once AUTH_ENABLED: idle and sign-out then end the real session. Until then the role switcher still drives the prototype. */
export function AdminShell({ children, realAuth = false }: { children: React.ReactNode; realAuth?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const { admin, idx, setIdx, can } = useAdmin();

  // sessions in the admin section end after 30 minutes idle (the proxy enforces the same limit on the server)
  useEffect(() => {
    const expire = async () => {
      if (realAuth) { await supabaseBrowser().auth.signOut(); router.push("/login?reason=idle"); }
      else router.push("/?session=expired");
    };
    let t = setTimeout(expire, ADMIN_IDLE_MS);
    const bump = () => { clearTimeout(t); t = setTimeout(expire, ADMIN_IDLE_MS); };
    window.addEventListener("pointerdown", bump); window.addEventListener("keydown", bump);
    return () => { clearTimeout(t); window.removeEventListener("pointerdown", bump); window.removeEventListener("keydown", bump); };
  }, [router, realAuth]);

  const current = NAV.find((n) => (n.href === "/admin" ? path === "/admin" : path.startsWith(n.href)));
  const allowed = !current || can(current.need);

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[15rem_1fr]">
      <aside className="print:hidden bg-ink text-paper md:min-h-screen md:sticky md:top-0 md:h-screen p-4 flex flex-col gap-5">
        <div><Link href="/" className="display text-3xl">Devatop</Link><span className="ml-2 bg-orange text-ink text-xs font-bold px-1.5 py-0.5 uppercase">Admin</span></div>
        <div>
          <label htmlFor="role" className="text-xs uppercase tracking-widest font-bold opacity-70">Viewing as (prototype)</label>
          <select id="role" className="mt-1 w-full bg-paper text-ink p-2 font-bold border-2 border-paper min-h-11" value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
            {DEMO_ADMINS.map((a, i) => <option key={i} value={i}>{ROLE_LABEL[a.role]}{a.scope ? ` · ${a.scope}` : ""}</option>)}
          </select>
          <p className="text-xs mt-2 opacity-80">Two-factor sign-in on · session ends after 30 min idle</p>
        </div>
        <nav aria-label="Admin" className="flex md:grid gap-1 overflow-x-auto">
          {NAV.filter((n) => can(n.need)).map((n) => {
            const on = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
            return <Link key={n.href} href={n.href} className={`px-3 py-2.5 font-bold whitespace-nowrap ${on ? "bg-orange text-ink" : "hover:bg-paper/10"}`}>{n.label}</Link>;
          })}
        </nav>
        <div className="mt-auto grid gap-2 text-sm">
          {realAuth && <button className="text-left underline opacity-80" onClick={async () => { await supabaseBrowser().auth.signOut(); window.location.assign("/login"); }}>Sign out</button>}
          <button className="text-left underline opacity-80" onClick={() => { if (confirm("Reset all prototype data in this browser?")) resetDemo(); }}>Reset demo data</button>
          <Link href="/" className="underline opacity-80">Public site</Link>
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
