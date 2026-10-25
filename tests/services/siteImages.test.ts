import { beforeAll, describe, expect, it } from "vitest";
import { listSiteImages, removeSiteImage, saveSchema, saveSiteImage } from "../../src/lib/services/siteImages";
import { freshServices, rejects } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let boss: string;
beforeAll(async () => { t = await freshServices(); boss = await t.h.admin("si-boss", "super_admin"); }, 60000);

const photo = { slotId: "hero-1", path: "photos/hero-1-1700000000000.webp", consent: true as const };
const video = { slotId: "loop-tally", path: "videos/loop-tally-1700000000000.mp4", posterPath: "videos/loop-tally-1700000000000.jpg", consent: true as const };

describe("site images service", () => {
  it("only accepts file names made for that slot, a still frame for clips, and the consent tick", () => {
    expect(saveSchema.safeParse(photo).success).toBe(true);
    expect(saveSchema.safeParse(video).success).toBe(true);
    expect(saveSchema.safeParse({ ...photo, path: "photos/../secret.webp" }).success).toBe(false);
    expect(saveSchema.safeParse({ ...photo, path: "photos/hero-2-1700000000000.webp" }).success).toBe(false); // another slot's file
    expect(saveSchema.safeParse({ ...photo, slotId: "nope" }).success).toBe(false);
    expect(saveSchema.safeParse({ ...video, posterPath: undefined }).success).toBe(false);
    expect(saveSchema.safeParse({ ...photo, consent: false }).success).toBe(false);
  });

  it("a Super Admin replaces a slot; the old files are handed back for cleanup; reset removes the row", async () => {
    const as = { sub: boss, aal: "aal2" as const };
    expect(await t.as(as, (tx) => saveSiteImage(tx, boss, photo, 120_000))).toEqual([]);
    const second = { ...photo, path: "photos/hero-1-1700000000999.webp" };
    expect(await t.as(as, (tx) => saveSiteImage(tx, boss, second, 90_000))).toEqual([photo.path]);
    expect(await t.as(as, (tx) => saveSiteImage(tx, boss, video, 400_000))).toEqual([]);
    const rows = await t.as("anon", (tx) => listSiteImages(tx)); // the public can read them
    expect(rows.map((r) => r.slotId).sort()).toEqual(["hero-1", "loop-tally"]);
    expect(rows.find((r) => r.slotId === "hero-1")).toMatchObject({ path: second.path, bytes: 90_000, consentBy: boss });
    expect(await t.as(as, (tx) => removeSiteImage(tx, "loop-tally"))).toEqual([video.path, video.posterPath]);
  });

  it("refuses files over the limit, and refuses anyone without settings.edit and two-factor", async () => {
    const as = { sub: boss, aal: "aal2" as const };
    expect((await rejects(t.as(as, (tx) => saveSiteImage(tx, boss, photo, 3 * 1024 * 1024)))).message).toMatch(/too big/i);
    const vol = await t.h.user("si-vol");
    await rejects(t.as({ sub: vol, aal: "aal1" }, (tx) => saveSiteImage(tx, vol, photo, 1000)));
    await rejects(t.as({ sub: boss, aal: "aal1" }, (tx) => saveSiteImage(tx, boss, photo, 1000)));
    expect(await t.as({ sub: boss, aal: "aal2" }, (tx) => removeSiteImage(tx, "hero-1"))).toHaveLength(1);
  });
});
