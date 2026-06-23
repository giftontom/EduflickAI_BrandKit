// Eduflick AI — procedural 9:16 backdrops for the FAE Instagram STORIES (1080×1920).
// Each is a cinematic indigo field tuned to its story's content zones — the hero glow lands where the
// headline goes; the dense lower band (spec rows) stays dark so HTML type over it reads. Strictly indigo
// + neutral — no text/logo/people (type/mark stay in HTML). Playwright rasterises an SVG per backdrop.
//
//   • story-fae      DARK (cine-ink) — the all-in-one twin of the WhatsApp poster; one soft central bloom.
//   • story-program  BRIGHT (cine-indigo) — the hero "program" twin of poster-program; directional light
//                    from the upper-right, a darker upper-left pocket for the headline, deep lower band.
//
//   cd tools && npm run gen:story-backdrop   → ../design-system/collateral/assets/backdrops/story-*.png

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../design-system/collateral/assets/backdrops');
const W = 1080, H = 1920;                                  // 9:16 IG-story canvas
fs.mkdirSync(OUT, { recursive: true });

const MARK = 'M13 13 L167 13 L167 82 L120 112.5 L167 143 L167 167 L13 167 Z';
const rng = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

// drifting particle field biased toward a focal point
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
// faint translucent notched feed-card planes (the brand mark as pure shape)
const planes = (list) => list.map(([x, y, s, rot, op]) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity="${op}" filter="url(#soft2)"><path d="${MARK}" fill="#8B97FF"/></g>`).join('');

// shared filters (blurs + fog + grain) — reused by every backdrop
const FILTERS = `
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="56"/></filter>
  <filter id="soft2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="fog"><feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves="3" seed="13" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`;

// ── story-fae · DARK cine-ink — one soft central bloom, dark lower two-thirds ──
const defsFae = `${FILTERS}
  <radialGradient id="vig" cx="50%" cy="26%" r="84%"><stop offset="0.46" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#06040f" stop-opacity="0.66"/></radialGradient>
  <linearGradient id="botfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.34" stop-color="#07050F" stop-opacity="0"/><stop offset="0.78" stop-color="#07050F" stop-opacity="0.5"/><stop offset="1" stop-color="#07050F" stop-opacity="0.82"/></linearGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8B97FF" stop-opacity="0"/><stop offset="0.4" stop-color="#8B97FF" stop-opacity="0.14"/><stop offset="1" stop-color="#8B97FF" stop-opacity="0"/></linearGradient>
  <radialGradient id="bg" cx="50%" cy="22%" r="118%"><stop offset="0" stop-color="#272150"/><stop offset="0.30" stop-color="#161230"/><stop offset="0.60" stop-color="#0C0B18"/><stop offset="1" stop-color="#0A0B10"/></radialGradient>`;
const svgFae = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defsFae}</defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" filter="url(#fog)" opacity="0.34" style="mix-blend-mode:overlay"/>
  <polygon points="430,-60 650,-60 980,1180 100,1180" fill="url(#beam)" opacity="0.7"/>
  <ellipse cx="540" cy="430" rx="560" ry="480" fill="#6E78F5" opacity="0.32" filter="url(#soft)"/>
  <ellipse cx="540" cy="400" rx="165" ry="165" fill="#c2c8f5" opacity="0.18" filter="url(#soft)"/>
  ${dots(230, 540, 420, 620, 1.8, '#aeb6ff', 0.18, 71)}
  ${planes([[70, -40, 3.2, 8, 0.10], [840, 220, 2.6, -10, 0.09], [720, 1300, 2.6, 16, 0.07]])}
  <rect width="${W}" height="${H}" fill="url(#botfade)"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/></svg>`;

// ── story-program · BRIGHT cine-indigo — directional light upper-right, dark upper-left for the
//    headline, deep lower band for the four spec rows (the poster-program hero brief) ──
const defsProg = `${FILTERS}
  <radialGradient id="bg" cx="64%" cy="22%" r="122%"><stop offset="0" stop-color="#6E78F5"/><stop offset="0.24" stop-color="#4B3FE0"/><stop offset="0.56" stop-color="#261A82"/><stop offset="1" stop-color="#0B0822"/></radialGradient>
  <radialGradient id="vig" cx="48%" cy="34%" r="86%"><stop offset="0.46" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#070516" stop-opacity="0.62"/></radialGradient>
  <linearGradient id="botfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.36" stop-color="#0A0820" stop-opacity="0"/><stop offset="0.8" stop-color="#0A0820" stop-opacity="0.64"/><stop offset="1" stop-color="#0A0820" stop-opacity="0.9"/></linearGradient>`;
const svgProg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defsProg}</defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" filter="url(#fog)" opacity="0.40" style="mix-blend-mode:overlay"/>
  <ellipse cx="975" cy="210" rx="520" ry="450" fill="#9aa6ff" opacity="0.50" filter="url(#soft)"/>
  <ellipse cx="985" cy="190" rx="170" ry="170" fill="#e7e9ff" opacity="0.30" filter="url(#soft)"/>
  <ellipse cx="350" cy="470" rx="650" ry="380" fill="#181043" opacity="0.48" filter="url(#soft)"/>
  <ellipse cx="120" cy="900" rx="430" ry="430" fill="#160f48" opacity="0.40" filter="url(#soft)"/>
  <ellipse cx="160" cy="1380" rx="560" ry="520" fill="#120c3c" opacity="0.6" filter="url(#soft)"/>
  ${dots(150, 975, 210, 540, 1.7, '#cdd2ff', 0.22, 37)}
  ${planes([[470, -40, 3.6, 8, 0.16], [-90, 520, 4.4, -6, 0.12], [770, 980, 2.8, 16, 0.10]])}
  <rect width="${W}" height="${H}" fill="url(#botfade)"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/></svg>`;

const STORY = { 'story-fae': svgFae, 'story-program': svgProg };

const only = process.env.ONLY ? process.env.ONLY.split(',').map((s) => s.trim()) : null;
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: W, height: H } });
for (const [name, svg] of Object.entries(STORY)) {
  if (only && !only.includes(name)) continue;
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, name + '.png'), clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`  ✓ ${name}.png  (1080×1920, procedural)`);
}
await browser.close();
console.log('→', OUT);
