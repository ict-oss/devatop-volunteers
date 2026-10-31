import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "../env";
import * as schema from "./schema";

/**
 * `db` connects as the database owner and therefore BYPASSES row-level security.
 * Use it only for trusted server work: cron jobs, migrations, sending email, the service role's tasks.
 * For anything done on behalf of a signed-in person use `asUser()` from ./rls so the database enforces their rights.
 */
// One connection pool per server process, even when Next loads this file separately for each route (and on every hot reload in development),
// so the app never opens more connections than DB_POOL_MAX.
const g = globalThis as unknown as { __devatopSql?: ReturnType<typeof postgres> };
// prepare:false for Supabase's pooler. DB_POOL_MAX=1 is only for the local test database (one connection that cannot take queries sent at the same time), so there nothing is pipelined.
// On Vercel every running copy of the site keeps its own pool, and Supabase only allows so many connections at once. So each copy keeps few connections
// (default 3) and lets idle ones go after 15 seconds, instead of holding five each for minutes. That keeps the total well under the limit.
const client = () => (g.__devatopSql ??= postgres(serverEnv().DATABASE_URL, { max: Number(process.env.DB_POOL_MAX) || 3, idle_timeout: 15, connect_timeout: 15, prepare: false, ...(process.env.DB_POOL_MAX === "1" ? { max_pipeline: 1 } : {}) }));
export const db = () => drizzle(client(), { schema });
/** The same connection as plain SQL text with $1 placeholders (for the demo-data tool). Owner connection: trusted server work only. */
export const rawSql = client;
export { schema };
