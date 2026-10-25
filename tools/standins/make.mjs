// Dev-only: regenerates the stand-in artwork (public/photos/*.webp) and the looping clips (public/video/*).
// Needs Playwright with Chromium and ffmpeg. Run: node tools/standins/make.mjs
// The art is abstract on purpose: no people, so no consent is needed. Real photos replace it from Admin > Site images.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "playwright");
import sharp from "sharp";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const slots = Object.fromEntries([...fs.readFileSync("src/lib/images.ts", "utf8").matchAll(/"([a-z0-9-]+)":\s*\{ id: "[^"]+", ratio: "(\d+)\/(\d+)"/g)].map((m) => [m[1], [Number(m[2]), Number(m[3])]]));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(here, "draw.html")).href);
fs.mkdirSync("public/photos", { recursive: true }); fs.mkdirSync("public/video", { recursive: true });

const shot = async () => page.locator("#c").screenshot({ type: "png" });
const done = [];
for (const name of await page.evaluate(() => window.names())) {
  const [rw, rh] = slots[name] ?? [1, 1], W = 1400, H = Math.round((W * rh) / rw);
  await page.setViewportSize({ width: W, height: H });
  await page.evaluate(([n, w, h]) => window.render(n, w, h, 0), [name, W, H]);
  await sharp(await shot()).webp({ quality: 74 }).toFile(`public/photos/${name}.webp`);
  done.push(name);
}
fs.writeFileSync("public/photos/manifest.json", JSON.stringify(done));

for (const [name, W, H] of [["loop-tally", 1120, 480], ["loop-ticker", 1200, 400]]) {
  const FPS = 24, N = 6 * FPS, dir = `${process.env.TMPDIR || "/tmp"}/dv-${name}`;
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: W, height: H });
  for (let i = 0; i < N; i++) {
    await page.evaluate(([n, w, h, t]) => window.render(n, w, h, t), [name, W, H, i / N]);
    fs.writeFileSync(`${dir}/f${String(i).padStart(4, "0")}.png`, await shot());
  }
  const base = ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${dir}/f%04d.png`, "-an"];
  execFileSync("ffmpeg", [...base, "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `public/video/${name}.mp4`]);
  execFileSync("ffmpeg", [...base, "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", `public/video/${name}.webm`]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", `${dir}/f0060.png`, "-q:v", "6", `public/video/${name}.jpg`]);
}
await browser.close();
console.log("done");
