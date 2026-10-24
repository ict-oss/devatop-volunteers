import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

export type Caller = { sub: string; aal: "aal1" | "aal2" } | "anon";

/**
 * Run database work AS a signed-in person (or an anonymous visitor), so row-level security applies exactly as it
 * does for Supabase's own API: the transaction switches to the `authenticated` role and sets the same JWT claims
 * PostgREST sets. Nothing the callback does can see more than that person is allowed to see.
 *
 *   const rows = await asUser(db(), { sub: user.id, aal: "aal2" }, (tx) => tx.select().from(schema.applications));
 *
 * The role and claims are LOCAL to the transaction, so they cannot leak to the next request on a pooled connection.
 */
export async function asUser<TQueryResult extends PgQueryResultHKT, TSchema extends Record<string, unknown>, T>(
  db: PgDatabase<TQueryResult, TSchema>,
  caller: Caller,
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    if (caller === "anon") {
      await tx.execute(sql`select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true)`);
      await tx.execute(sql`set local role anon`);
    } else {
      const claims = JSON.stringify({ sub: caller.sub, role: "authenticated", aal: caller.aal });
      await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true), set_config('request.jwt.claim.sub', ${caller.sub}, true)`);
      await tx.execute(sql`set local role authenticated`);
    }
    return fn(tx);
  });
}
