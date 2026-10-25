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
export const db = () => drizzle((g.__devatopSql ??= postgres(serverEnv().DATABASE_URL, { max: Number(process.env.DB_POOL_MAX) || 5, prepare: false })), { schema }); // prepare:false for Supabase's pooler
export { schema };
