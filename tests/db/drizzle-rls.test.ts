import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { asUser } from "../../src/lib/db/rls";
import * as schema from "../../src/lib/db/schema";
import { Harness } from "./harness";

// The application talks to the database through Drizzle. asUser() must make Drizzle queries obey row-level security.
let h: Harness; let orm: ReturnType<typeof drizzle<typeof schema>>;
beforeAll(async () => {
  const db = new PGlite();
  await db.exec(fs.readFileSync("tests/db/supabase-stub.sql", "utf8"));
  for (const f of fs.readdirSync("src/lib/db/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(fs.readFileSync(path.join("src/lib/db/migrations", f), "utf8"));
  h = new Harness(db); orm = drizzle(db, { schema });
}, 60000);

// Drizzle wraps database errors as "Failed query: ..." and keeps the real Postgres message in `cause`
const rejectsWith = async (p: Promise<unknown>, re: RegExp) => {
  const e = await p.then(() => null, (x: unknown) => x as { message: string; cause?: { message: string } });
  expect(e, "expected the query to be rejected").not.toBeNull();
  expect(e!.cause?.message ?? e!.message).toMatch(re);
};

describe("asUser(): Drizzle queries are row-level-security queries", () => {
  it("a volunteer's SELECT returns only their own rows; an anonymous visitor's returns none", async () => {
    const a = await h.user("orm-a"), b = await h.user("orm-b");
    const mine = await asUser(orm, { sub: a, aal: "aal1" }, (tx) => tx.select().from(schema.volunteerProfiles));
    expect(mine.map((r) => r.userId)).toEqual([a]);
    await rejectsWith(asUser(orm, "anon", (tx) => tx.select().from(schema.volunteerProfiles)), /permission denied/);
    // Drizzle's own owner connection (no asUser) is NOT restricted: that is exactly why it is reserved for trusted jobs
    expect((await orm.select().from(schema.volunteerProfiles)).length).toBeGreaterThanOrEqual(2);
    void b;
  });

  it("an admin sees more only with two-factor; the role does not leak out of the transaction", async () => {
    const v = await h.user("orm-v", { state: "Lagos" }); const adm = await h.admin("orm-admin", "state_lead", { state: "Lagos" });
    const ids = (r: { userId: string }[]) => r.map((x) => x.userId);
    expect(ids(await asUser(orm, { sub: adm, aal: "aal1" }, (tx) => tx.select().from(schema.volunteerProfiles).where(eq(schema.volunteerProfiles.userId, v))))).toEqual([]);
    expect(ids(await asUser(orm, { sub: adm, aal: "aal2" }, (tx) => tx.select().from(schema.volunteerProfiles).where(eq(schema.volunteerProfiles.userId, v))))).toEqual([v]);
    // after the transaction the connection is back to the owner: no leaked role or claims
    const after = await orm.execute(`select current_user as u, current_setting('request.jwt.claim.sub', true) as sub`);
    expect(after.rows[0]).toMatchObject({ u: "postgres" });
    expect([null, ""]).toContain((after.rows[0] as { sub: string | null }).sub);
  });

  it("writes through asUser() are guarded too (a volunteer cannot make themselves active)", async () => {
    const v = await h.user("orm-w");
    await rejectsWith(asUser(orm, { sub: v, aal: "aal1" }, (tx) => tx.update(schema.volunteerProfiles).set({ status: "active" }).where(eq(schema.volunteerProfiles.userId, v))), /only be changed by an admin/);
  });
});
