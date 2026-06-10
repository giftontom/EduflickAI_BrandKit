// Eduflick AI — procedural indigo backdrops for the evergreen IG feed posts.
// Atmospheric Mode-A fields (volumetric indigo light, particle drifts, soft planes) — reliable,
// unique per post, strictly indigo + neutral, no text/logo/people. Writes ig-*.png ONLY (never
// touches the photo backdrops poster-program/masterclass.png). For real representative PHOTOS
// instead, set PEXELS_API_KEY and use fetch:stock + treat:stock.
//
//   cd tools && npm run gen:ig-backdrops   → ../design-system/collateral/assets/backdrops/ig-*.png

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../design-system/collateral/assets/backdrops');
const W = 1080, H = 1350;
fs.mkdirSync(OUT, { recursive: true });

const MARK = 'M13 13 L167 13 L167 82 L120 112.5 L167 143 L167 167 L13 167 Z';
const rng = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

function dots(n, fx, fy, spread, rMax, color, opMax, seed) {
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * spread;
    const x = fx + Math.cos(a) * d, y = fy + Math.sin(a) * d * 1.1;
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const rad = 0.6 + r() * rMax, op = (opMax * (1 - d / (spread * 1.4))).toFixed(3);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="${color}" opacity="${op}"/>`;
  }
  return s;
}
const planes = (list) => list.map(([x, y, s, rot, op]) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity="${op}" filter="url(#soft2)"><path d="${MARK}" fill="#8B97FF"/></g>`).join('');

const defs = `
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="48"/></filter>
  <filter id="soft2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="fog"><feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="7" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <radialGradient id="vig" cx="50%" cy="42%" r="80%"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#06040f" stop-opacity="0.66"/></radialGradient>`;

// each: a dark indigo field with one off-centre glow (kept clear of the upper-left headline zone),
// faint fog + grain. variety via hot-spot, accent blobs, particles/planes.
const bg = (cx, cy, c0, c1, c2) => `<radialGradient id="bg" cx="${cx}%" cy="${cy}%" r="100%">
  <stop offset="0" stop-color="${c0}"/><stop offset="0.32" stop-color="${c1}"/><stop offset="0.7" stop-color="${c2}"/><stop offset="1" stop-color="#0A0B10"/></radialGradient>`;
const frame = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${inner}
  <rect width="${W}" height="${H}" filter="url(#fog)" opacity="0.38" style="mix-blend-mode:overlay"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/></svg>`;

const IG = {
  // pain hook — calm, deep; soft bloom lower-right
  'ig-hook': frame(`<defs>${bg(78, 70, '#2a2467', '#1a1547', '#100c2e')}</defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="860" cy="980" rx="520" ry="480" fill="#5B5BF0" opacity="0.34" filter="url(#soft)"/>
    ${planes([[640, 760, 3.2, 14, 0.10]])}`),
  // myth — restrained, single low glow
  'ig-myth': frame(`<defs>${bg(30, 24, '#241e57', '#15113c', '#0d0a28')}</defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="240" cy="300" rx="460" ry="420" fill="#4338b8" opacity="0.30" filter="url(#soft)"/>
    <ellipse cx="900" cy="1180" rx="420" ry="380" fill="#1c1550" opacity="0.55" filter="url(#soft)"/>`),
  // rag — particle drift converging right-of-centre
  'ig-rag': frame(`<defs>${bg(68, 58, '#221c5a', '#15113c', '#0c0a26')}</defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="760" cy="720" rx="360" ry="360" fill="#6E78F5" opacity="0.30" filter="url(#soft)"/>
    ${dots(380, 760, 720, 540, 2.4, '#aeb6ff', 0.42, 41)}`),
  // stack — a touch brighter / more energy; soft planes
  'ig-stack': frame(`<defs>${bg(60, 30, '#3a31a0', '#241c70', '#130f38')}</defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="760" cy="360" rx="540" ry="460" fill="#6E78F5" opacity="0.36" filter="url(#soft)"/>
    ${planes([[520, 120, 3.4, 10, 0.12], [120, 760, 3.0, -8, 0.09]])}`),
  // get hired — calm, dignified; bottom-centre glow
  'ig-hired': frame(`<defs>${bg(50, 86, '#241e57', '#15113c', '#0c0a26')}</defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="540" cy="1180" rx="560" ry="380" fill="#4f45cf" opacity="0.30" filter="url(#soft)"/>`),
  // masterclass — bright volumetric bloom centre-right (energetic)
  'ig-masterclass': frame(`<defs>${bg(64, 52, '#3a31a0', '#221c66', '#120e34')}</defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="720" cy="640" rx="460" ry="460" fill="#8B97FF" opacity="0.34" filter="url(#soft)"/>
    <ellipse cx="720" cy="640" rx="190" ry="190" fill="#dfe3ff" opacity="0.28" filter="url(#soft)"/>
    ${dots(300, 720, 640, 520, 2.2, '#c3c9ff', 0.4, 88)}`),
};

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: W, height: H } });
console.log('Rendering IG abstract backdrops →', OUT, '\n');
for (const [name, svg] of Object.entries(IG)) {
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, name + '.png'), clip: { x: 0, y: 0, width: W, height: H } });
  console.log('  ✓', name + '.png');
}
await browser.close();
console.log('\nDone — 6 IG backdrops.');
