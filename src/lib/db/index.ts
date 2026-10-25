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
let client: ReturnType<typeof postgres> | undefined;
export const db = () => drizzle((client ??= postgres(serverEnv().DATABASE_URL, { max: Number(process.env.DB_POOL_MAX) || 5, prepare: false })), { schema }); // prepare:false for Supabase's pooler
export { schema };
