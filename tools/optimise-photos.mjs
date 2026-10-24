// npm run photos
// Takes originals from /raw-photos (named after a slot in src/lib/images.ts, any image format)
// and writes compressed WebP files to /public/photos. Volunteers are on paid data, so every
// public photo stays small: max 1600px wide, quality 72, typically 60-150 KB.
import fs from "fs";
import path from "path";
import sharp from "sharp";

const IN = "raw-photos", OUT = "public/photos";
const slots = [...fs.readFileSync("src/lib/images.ts", "utf8").matchAll(/^\s*"([a-z0-9-]+)":\s*\{ id:/gm)].map((m) => m[1]);
fs.mkdirSync(IN, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(IN).filter((f) => /\.(jpe?g|png|webp|heic|avif|tiff?)$/i.test(f));
if (!files.length) console.log(`No files in /${IN}. Drop photos there named after a slot, e.g. hero-1.jpg\nSlots: ${slots.join(", ")}`);

let total = 0;
for (const f of files) {
  const id = path.parse(f).name;
  if (!slots.includes(id)) { console.warn(`! ${f}: no slot called "${id}" — skipped. Slots: ${slots.join(", ")}`); continue; }
  const out = path.join(OUT, `${id}.webp`);
  // rotate() honours the phone's EXIF orientation; metadata (GPS, device) is stripped by default
  await sharp(path.join(IN, f)).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 72 }).toFile(out);
  const kb = Math.round(fs.statSync(out).size / 1024);
  total++;
  console.log(`✓ ${f} -> ${out} (${kb} KB)${kb > 220 ? "  <- large, consider a tighter crop" : ""}`);
}
// the site reads this one small file to learn which slots have a photo (no 404 probing)
const have = slots.filter((s) => fs.existsSync(path.join(OUT, s + ".webp")));
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(have));
console.log(`${total} photo(s) written. Missing slots: ${slots.filter((s) => !have.includes(s)).join(", ") || "none"}`);
