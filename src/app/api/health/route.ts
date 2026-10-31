import { sql } from "drizzle-orm";
import { trusted } from "@/lib/server/caller";
import { rowsOf } from "@/lib/services/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL", "NEXT_PUBLIC_SITE_URL"] as const;

/** Open /api/health to see what is missing after a deploy. It reports only names and yes/no: never a value, a name of a person or a database message. */
export async function GET() {
  const env = Object.fromEntries(REQUIRED.map((k) => [k, !!process.env[k]]));
  const check = async (query: ReturnType<typeof sql>) => { try { await trusted().execute(query); return "ok"; } catch (e) { return `failed (${(e as { cause?: { code?: string } })?.cause?.code ?? (e as Error).name})`; } };
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
