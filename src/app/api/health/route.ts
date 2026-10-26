import { sql } from "drizzle-orm";
import { trusted } from "@/lib/server/caller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL", "NEXT_PUBLIC_SITE_URL"] as const;

/** Open /api/health to see what is missing after a deploy. It reports only names and yes/no: never a value, a name of a person or a database message. */
export async function GET() {
  const env = Object.fromEntries(REQUIRED.map((k) => [k, !!process.env[k]]));
  const check = async (query: ReturnType<typeof sql>) => { try { await trusted().execute(query); return "ok"; } catch (e) { return `failed (${(e as { cause?: { code?: string } })?.cause?.code ?? (e as Error).name})`; } };
  const database = env.DATABASE_URL ? await check(sql`select 1`) : "no DATABASE_URL";
  const tables = database === "ok" ? await check(sql`select 1 from public.departments limit 1`) : "skipped";
  const mapView = database === "ok" ? await check(sql`select 1 from public.public_state_hours limit 1`) : "skipped";
  const ready = Object.values(env).every(Boolean) && database === "ok" && tables === "ok" && mapView === "ok";
  return Response.json({ ready, env, database, tables, mapView, hint: ready ? "All good." : "Fix the items that say false or failed, redeploy, and open this page again." }, { status: ready ? 200 : 503 });
}
