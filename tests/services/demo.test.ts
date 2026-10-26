import { beforeAll, describe, expect, it } from "vitest";
import { seedOnce } from "../../src/lib/db/seed";
import { demoCount, removeDemo, seedDemo } from "../../src/lib/db/demo";
import { publicNumbers } from "../../src/lib/services/public";
import { freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
const run = async (text: string, params?: unknown[]) => (await t.pg.query(text, (params ?? []) as never[])).rows as Record<string, unknown>[];
beforeAll(async () => { t = await freshServices(); await seedOnce(async (text, params) => t.h.svc(text, params as unknown[])); }, 60000);

describe("temporary demo volunteers", () => {
  it("adds ten, shows them in the public numbers, never doubles up, and removes exactly them", async () => {
    const real = await t.h.activeVolunteer("demo-real", { state: "Lagos" }); // a real volunteer must survive the removal
    await t.h.admin("demo-admin", "super_admin");
    expect(await seedDemo(run)).toEqual({ added: 10, withHours: true });
    expect(await demoCount(run)).toBe(10);
    expect(await seedDemo(run)).toEqual({ added: 0, withHours: false });
    const n = await t.as("anon", (tx) => publicNumbers(tx));
    expect(n.volunteers).toBe(11); expect(n.hours).toBeGreaterThan(100); expect(n.states).toBeGreaterThanOrEqual(8); expect(n.stateHours.lagos).toBeGreaterThan(0);
    expect(await removeDemo(run)).toBe(10);
    expect(await demoCount(run)).toBe(0);
    const after = await t.as("anon", (tx) => publicNumbers(tx));
    expect(after).toMatchObject({ volunteers: 1, hours: 0, states: 1 });
    expect((await t.h.svc("select 1 from volunteer_profiles where user_id=$1", [real])).length).toBe(1);
  });
});
