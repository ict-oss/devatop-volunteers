import { beforeAll, describe, expect, it } from "vitest";
import { seedOnce, SEED_VERSION } from "../../src/lib/db/seed";
import { SEED_DEPARTMENTS, SEED_GUIDES, SEED_PROGRAMMES } from "../../src/lib/db/seed-data";
import { DEFAULT_TEMPLATES } from "../../src/lib/emails";
import { freshDb, U, type Harness } from "./harness";

let h: Harness;
const run = async (text: string, params: unknown[] = []) => h.svc(text, params);
beforeAll(async () => { h = await freshDb(); }, 60000);

describe("seed file (step 2)", () => {
  it("fills a new database once, and says so", async () => {
    expect(await seedOnce(run)).toBe(true);
    expect((await h.svc<{ n: number }>("select count(*)::int n from programmes"))[0].n).toBe(SEED_PROGRAMMES.length);
    expect((await h.svc<{ n: number }>("select count(*)::int n from departments where status='active'"))[0].n).toBe(SEED_DEPARTMENTS.length);
    expect((await h.svc<{ n: number }>("select count(*)::int n from email_templates"))[0].n).toBe(7);
    expect(DEFAULT_TEMPLATES).toHaveLength(7);
    expect((await h.svc<{ n: number }>("select count(*)::int n from guides"))[0].n).toBe(SEED_GUIDES.length);
    expect((await h.svc<{ v: number }>("select (value #>> '{}')::int v from app_settings where key='seed_version'"))[0].v).toBe(SEED_VERSION);
  });

  it("settings: minimum age 16 and review days 7, as the database rules expect", async () => {
    const get = async (k: string) => (await h.svc<{ v: unknown }>("select value v from app_settings where key=$1", [k]))[0].v;
    expect(await get("min_age")).toBe(16);
    expect(await get("review_days")).toBe(7);
    expect((await h.svc<{ m: number }>("select min_age() m"))[0].m).toBe(16);
  });

  it("anyone can read min_age and review_days; the WhatsApp link and sender are not public", async () => {
    const keys = (await h.q<{ key: string }>("anon", "select key from app_settings order by key")).map((r) => r.key);
    expect(keys).toEqual(["min_age", "review_days"]);
  });

  it("an active volunteer sees the departments and the published volunteer guides; admin guides stay hidden", async () => {
    const v = await h.activeVolunteer("seed-reader");
    expect((await h.q(U(v), "select 1 from departments")).length).toBe(SEED_DEPARTMENTS.length);
    const titles = (await h.q<{ title: string }>(U(v), "select title from guides")).map((g) => g.title);
    expect(titles).toContain("Code of conduct");
    expect(titles.some((t) => t.startsWith("Admin handbook"))).toBe(false);
  });

  it("the code of conduct and safeguarding guide are must-reads (Start here depends on them)", async () => {
    const must = (await h.svc<{ title: string }>("select title from guides where must_read order by title")).map((g) => g.title);
    expect(must).toEqual(["Code of conduct", "Safeguarding in plain words"]);
  });

  it("both required trainings exist", async () => {
    expect((await h.svc<{ name: string }>("select name from trainings where required order by name")).map((t) => t.name)).toEqual(["Orientation", "Safeguarding"]);
  });

  it("running it again changes nothing, so an admin's edits are never undone", async () => {
    await h.svc("update departments set name='Digital and Tech' where name='ICT'");
    await h.svc("update app_settings set value='\"https://chat.whatsapp.com/real\"'::jsonb where key='whatsapp_group'");
    expect(await seedOnce(run)).toBe(false);
    expect((await h.svc<{ n: number }>("select count(*)::int n from departments"))[0].n).toBe(SEED_DEPARTMENTS.length);
    expect((await h.svc("select 1 from departments where name='ICT'")).length).toBe(0);
    expect((await h.svc<{ v: string }>("select value #>> '{}' v from app_settings where key='whatsapp_group'"))[0].v).toBe("https://chat.whatsapp.com/real");
  });
});
