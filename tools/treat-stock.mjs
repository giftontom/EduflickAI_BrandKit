// Eduflick AI — stock-photo duotone treatment (the photoreal backdrop layer)
// Takes a raw source photo from tools/stock-sources/ and forces it on-brand: a
// luminance → indigo-ramp DUOTONE via an SVG <feComponentTransfer>, rendered in real
// Chromium (same engine as gen-backdrops-proc.mjs). Output is a clean indigo field at
// 1080×1350 under the SAME filenames posters.html already references — grain, vignette,
// scrim and halo are layered by posters.html (S16/S17/S20/.scrim), NOT baked in here.
//
//   cd tools
//   npm run fetch:stock      # get sources first (or hand-drop program.jpg / masterclass.jpg)
//   npm run treat:stock      # → ../design-system/collateral/assets/backdrops/poster-*.png
//   npm run export:posters   # composite the type/mark on top → ../exports/posters/*.png
//
// One hue only: every pixel maps onto the indigo ramp, so no third hue can survive.
// No text/logo is ever drawn — the source's own pixels are recolored, nothing added.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, 'stock-sources');
const OUT = path.resolve(__dirname, '../design-system/collateral/assets/backdrops');
const W = 1080, H = 1350;
fs.mkdirSync(OUT, { recursive: true });

// Which source → which backdrop, the duotone mode, crop focus, and a pre-contrast nudge.
// `dark`  → shadows #0A0B10 (ink) · mids #5B5BF0 (indigo) · highlights #8B97FF (light indigo)
// `paper` → shadows #5B5BF0 (indigo) · mids #8B97FF · highlights #F5F2EA (warm paper) — high-key
const JOBS = [
  { name: 'poster-program',     src: 'program.jpg',     mode: 'dark', pos: '50% 50%', pre: 'contrast(1.16) brightness(1.02)' },
  { name: 'poster-masterclass', src: 'masterclass.jpg', mode: 'dark', pos: '50% 62%', pre: 'contrast(1.2) brightness(1.04)' },
];

const LUMA = '0.2126 0.7152 0.0722 0 0';   // Rec.709 grayscale row
// 4-stop ramps (shadow → … → highlight) for richer, more cinematic gradation.
// dark : ink #0A0B10 → indigo-ink #0B0822 → indigo #5B5BF0 → light-indigo #8B97FF
// paper: indigo #5B5BF0 → light-indigo #8B97FF → warm paper #F5F2EA (high-key, kept for light surfaces)
const RAMP = {
  dark:  { r: '0.039 0.043 0.357 0.545', g: '0.043 0.031 0.357 0.592', b: '0.063 0.133 0.941 1.0' },
  paper: { r: '0.357 0.545 0.961',       g: '0.357 0.592 0.949',       b: '0.941 1.0 0.918' },
};
const filterDef = (id, m) => `
  <filter id="${id}" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="${LUMA} ${LUMA} ${LUMA} 0 0 0 0 1 0"/>
    <feComponentTransfer>
      <feFuncR type="table" tableValues="${m.r}"/>
      <feFuncG type="table" tableValues="${m.g}"/>
      <feFuncB type="table" tableValues="${m.b}"/>
    </feComponentTransfer>
  </filter>`;

const dataUri = (file) => {
  const buf = fs.readFileSync(file);
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
};

const page = (job, uri) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:#0A0B10}
  svg.defs{position:absolute;width:0;height:0}
  .frame{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${job.mode === 'paper' ? '#ECE7DA' : '#0A0B10'}}
  .frame img{width:100%;height:100%;object-fit:cover;object-position:${job.pos};display:block;
    filter:${job.pre} url(#duo-${job.mode})}
</style></head><body>
  <svg class="defs" xmlns="http://www.w3.org/2000/svg"><defs>
    ${filterDef('duo-dark', RAMP.dark)}${filterDef('duo-paper', RAMP.paper)}
  </defs></svg>
  <div class="frame"><img src="${uri}" alt=""></div>
</body></html>`;

const browser = await chromium.launch();
const tab = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: W, height: H } });

console.log(`Treating sources → indigo duotone\n  in : ${SRC}\n  out: ${OUT}\n`);
let made = 0, missing = [];
for (const job of JOBS) {
  const file = path.join(SRC, job.src);
  if (!fs.existsSync(file)) { missing.push(job.src); console.error(`  ✗ ${job.name}: missing ${job.src}`); continue; }
  await tab.setContent(page(job, dataUri(file)), { waitUntil: 'networkidle' });
  await tab.waitForTimeout(120);
  await tab.screenshot({ path: path.join(OUT, job.name + '.png'), clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`  ✓ ${job.name}.png  (${job.mode} · from ${job.src})`);
  made++;
}
await browser.close();

if (missing.length) {
  console.log(`\n${missing.length} source(s) missing: ${missing.join(', ')}`);
  console.log('Run `npm run fetch:stock`, or drop your own file(s) in tools/stock-sources/.');
}
console.log(`\nDone — ${made}/${JOBS.length} treated. (poster-seats stays procedural: gen-backdrops-proc.mjs)`);
process.exit(made ? 0 : 1);
