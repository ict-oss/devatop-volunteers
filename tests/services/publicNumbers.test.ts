import { beforeAll, describe, expect, it } from "vitest";
import { publicNumbers } from "../../src/lib/services/public";
import { freshServices } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
beforeAll(async () => { t = await freshServices(); }, 60000);

describe("the numbers on the public home page", () => {
  it("are zero on a new site (no invented figures)", async () => {
    expect(await t.as("anon", (tx) => publicNumbers(tx))).toEqual({ volunteers: 0, hours: 0, states: 0, stateHours: {}, roll: [] });
  });

  it("count approved hours only, per state, and list only people who chose to be on the Roll", async () => {
    const coord = await t.h.admin("pn-coord", "volunteer_coordinator");
    const lagos = await t.h.activeVolunteer("pn-lagos", { state: "Lagos" });
    const fct = await t.h.activeVolunteer("pn-fct", { state: "FCT Abuja" });
    await t.h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,'A','2026-10-01',5,'coordinator','approved',$2,now())", [lagos, coord]);
    await t.h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,'B','2026-10-01',4,'coordinator','approved',$2,now())", [fct, coord]);
    await t.h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'pending',current_date,9,'remote_log')", [lagos]);
    const n = await t.as("anon", (tx) => publicNumbers(tx));
    expect(n).toMatchObject({ volunteers: 2, hours: 9, states: 2, stateHours: { lagos: 5, federalcapitalterritory: 4 } });
    expect(n.roll).toEqual([]); // nobody opted in
  });
});
