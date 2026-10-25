import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { SLOTS, VIDEOS } from "../src/lib/images";

// Light on data (requirements section 12): every image and clip the site ships stays small, and nothing is missing.
describe("site images and clips", () => {
  const manifest: string[] = JSON.parse(fs.readFileSync("public/photos/manifest.json", "utf8"));
  it("every image slot has a file, and the manifest lists exactly the files that exist", () => {
    for (const id of Object.keys(SLOTS)) {
      expect(fs.existsSync(`public/photos/${id}.webp`), id).toBe(true);
      expect(manifest, id).toContain(id);
    }
    for (const id of manifest) expect(SLOTS[id], `manifest lists unknown slot ${id}`).toBeDefined();
  });
  it("every image is under 300 KB", () => {
    for (const id of Object.keys(SLOTS)) expect(fs.statSync(`public/photos/${id}.webp`).size, id).toBeLessThan(300 * 1024);
  });
  it("every clip has an mp4, a webm and a poster, and stays under 300 KB (mp4)", () => {
    for (const id of Object.keys(VIDEOS)) {
      for (const ext of ["mp4", "webm", "jpg"]) expect(fs.existsSync(`public/video/${id}.${ext}`), `${id}.${ext}`).toBe(true);
      expect(fs.statSync(`public/video/${id}.mp4`).size, id).toBeLessThan(300 * 1024);
    }
  });
});
