import { beforeAll, describe, expect, it } from "vitest";
import { seedOnce } from "../../src/lib/db/seed";
import { STARTER_CALLS, addStarterCalls } from "../../src/lib/services/starterCalls";
import { upcomingOpportunities } from "../../src/lib/services/opportunities";
import { freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let boss: string;
beforeAll(async () => { t = await freshServices(); await seedOnce(async (text, params) => t.h.svc(text, params as unknown[])); boss = await t.h.admin("sc-boss", "super_admin"); }, 60000);

describe("starter calls", () => {
  it("publishes every role once, on the public board, with plain wording and no dashes", async () => {
    const as = { sub: boss, aal: "aal2" as const };
    expect(await t.as(as, (tx) => addStarterCalls(tx))).toEqual({ added: STARTER_CALLS.length, skipped: 0 });
    expect(await t.as(as, (tx) => addStarterCalls(tx))).toEqual({ added: 0, skipped: STARTER_CALLS.length }); // safe to press twice
    const board = await t.as("anon", (tx) => upcomingOpportunities(tx));
    const titles = board.map((o) => o.title);
    expect(titles).toEqual(expect.arrayContaining(["AI4Rights Community Manager", "Content Creator, Devatop Centre for African Development", "AI4Rights Facilitator"]));
    expect(board).toHaveLength(STARTER_CALLS.length);
    for (const c of STARTER_CALLS) expect(`${c.title} ${c.description}`).not.toMatch(/[—–]| - /);
  });
  it("only a role that may edit opportunities can add them", async () => {
    const fresh = await freshServices(); await seedOnce(async (text, params) => fresh.h.svc(text, params as unknown[])); // nothing there yet, so a refusal cannot be hidden by "already exists"
    const viewer = await fresh.h.admin("sc-viewer", "viewer");
    await expect(fresh.as({ sub: viewer, aal: "aal2" }, (tx) => addStarterCalls(tx))).rejects.toBeTruthy();
    expect((await fresh.h.svc("select 1 from opportunities")).length).toBe(0);
  });
});
