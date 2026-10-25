import { beforeAll, describe, expect, it } from "vitest";
import { A2, freshDb, U, type Harness } from "./harness";

let h: Harness;
beforeAll(async () => { h = await freshDb(); });

const ins = "insert into site_images (slot_id, kind, path, bytes, consent_by) values ($1, 'photo', 'photos/x.webp', 1000, $2)";

describe("site_images", () => {
  it("anyone can read, only settings.edit can change, and every change is audited", async () => {
    const boss = await h.admin("img-boss", "super_admin");
    const vol = await h.user("img-vol");

    await expect(h.q(U(vol), ins, ["hero-1", vol])).rejects.toThrow();            // a volunteer
    await expect(h.q(U(boss), ins, ["hero-1", boss])).rejects.toThrow();                  // super admin without two-factor
    await h.q(A2(boss), ins, ["hero-1", boss]);                           // super admin with two-factor
    expect((await h.q("anon", "select slot_id from site_images")).map((r) => (r as { slot_id: string }).slot_id)).toEqual(["hero-1"]);
    await expect(h.q("anon", "delete from site_images")).rejects.toThrow();
    await h.q(A2(boss), "delete from site_images where slot_id = 'hero-1'");
    const log = await h.svc<{ action: string }>("select action from audit_logs where table_name = 'site_images' order by id");
    expect(log.map((l) => l.action)).toEqual(["site_images.insert", "site_images.delete"]);
  });

  it("a video needs a poster and a photo must not have one", async () => {
    const id = await h.user("img-owner");
    await expect(h.svc("insert into site_images (slot_id, kind, path, bytes, consent_by) values ('loop-tally', 'video', 'videos/a.mp4', 10, $1)", [id])).rejects.toThrow();
    await expect(h.svc("insert into site_images (slot_id, kind, path, poster_path, bytes, consent_by) values ('hero-2', 'photo', 'p.webp', 'q.jpg', 10, $1)", [id])).rejects.toThrow();
  });
});
