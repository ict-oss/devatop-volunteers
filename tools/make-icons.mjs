// Dev-only: draws the app icons (public/icons/*.png) used when someone installs the site on their phone.
// A stand-in tally mark in the brand colours; replace with the Devatop logo when it is added. Run: node tools/make-icons.mjs
import sharp from "sharp";
const ORANGE = "#F05023", INK = "#16130F";
const svg = (size, pad) => {
  const u = (size - pad * 2) / 100, x = (n) => pad + n * u;
  const bar = (n) => `<rect x="${x(n)}" y="${x(18)}" width="${9 * u}" height="${64 * u}" rx="${4.5 * u}" fill="${INK}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${ORANGE}"/>${[14, 32, 50, 68].map(bar).join("")}<rect x="${x(6)}" y="${x(46)}" width="${88 * u}" height="${9 * u}" rx="${4.5 * u}" fill="${INK}" transform="rotate(-24 ${x(50)} ${x(50)})"/></svg>`;
};
const out = (name, size, pad) => sharp(Buffer.from(svg(size, pad))).png({ compressionLevel: 9 }).toFile(`public/icons/${name}.png`);
await out("icon-192", 192, 14); await out("icon-512", 512, 36); await out("maskable-512", 512, 96); await out("apple-touch-icon", 180, 14);
