import { sql } from "drizzle-orm";
import { trusted } from "@/lib/server/caller";
import { rowsOf } from "@/lib/services/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL", "NEXT_PUBLIC_SITE_URL"] as const;

/** Open /api/health to see what is missing after a deploy. It reports only names and yes/no: never a value, a name of a person or a database message. */
export async function GET() {
  const env = Object.fromEntries(REQUIRED.map((k) => [k, !!process.env[k]]));
  /** A plain category for a database failure. Never the message itself: it could contain a host or user name. */
  const why = (e: unknown) => {
    const m = `${(e as { cause?: { message?: string } })?.cause?.message ?? ""} ${(e as Error)?.message ?? ""}`;
    if (/tenant or user not found/i.test(m)) return "tenant_or_user_not_found: the pooler user is wrong (it must look like postgres.PROJECTREF) or the Supabase project is paused";
    if (/password authentication failed|invalid password|SASL/i.test(m)) return "wrong_password: the password in DATABASE_URL is not the current database password";
    if (/ENOTFOUND|getaddrinfo|EAI_AGAIN/i.test(m)) return "host_not_found: the host in DATABASE_URL is wrong (use the Session pooler string, not the direct one)";
    if (/ECONNREFUSED|ETIMEDOUT|timeout|ECONNRESET/i.test(m)) return "cannot_reach: the database did not answer (project paused or wrong port)";
    if (/too many|max clients|remaining connection slots/i.test(m)) return "too_many_connections";
    if (/ssl|certificate/i.test(m)) return "ssl_problem";
    return "other";
  };
  const check = async (query: ReturnType<typeof sql>) => { try { await trusted().execute(query); return "ok"; } catch (e) { return `failed (${(e as { cause?: { code?: string } })?.cause?.code ?? (e as Error).name}) ${why(e)}`; } };
  const database = env.DATABASE_URL ? await check(sql`select 1`) : "no DATABASE_URL";
  const tables = database === "ok" ? await check(sql`select 1 from public.departments limit 1`) : "skipped";
  const seeded = database === "ok" && tables === "ok" ? Number(rowsOf<{ n: number }>(await trusted().execute(sql`select count(*)::int as n from public.departments`))[0]?.n ?? 0) : 0;
  const siteImages = database === "ok" ? await check(sql`select 1 from public.site_images limit 1`) : "skipped";
  // what the home page numbers will show (counts only), so an empty home page can be explained
  const count = async (q: ReturnType<typeof sql>) => { try { return Number(rowsOf<{ n: number }>(await trusted().execute(q))[0]?.n ?? 0); } catch { return -1; } };
  const homePage = database === "ok" ? {
    activeVolunteers: await count(sql`select count(*)::int as n from volunteer_profiles where status = 'active'`),
    approvedHourEntries: await count(sql`select count(*)::int as n from hour_logs where status = 'approved'`),
    pendingHourEntries: await count(sql`select count(*)::int as n from hour_logs where status = 'pending'`),
    publicStatsView: await check(sql`select volunteers, hours, states from public.public_stats`),
  } : "skipped";
  const ready = Object.values(env).every(Boolean) && database === "ok" && tables === "ok" && siteImages === "ok" && seeded > 0;
  return Response.json({ ready, env, database, tables, siteImages, departments: seeded, homePage, hint: ready ? "All good." : seeded === 0 && database === "ok" ? "The database has no departments: run npm run db:seed once (or add them in Admin > Departments)." : siteImages !== "ok" && database === "ok" ? "The database is missing newer tables or views: run npm run db:migrate on your computer, then open this page again." : "Fix the items that say false or failed, redeploy, and open this page again." }, { status: ready ? 200 : 503 });
}
