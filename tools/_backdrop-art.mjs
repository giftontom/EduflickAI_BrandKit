// Eduflick AI — shared backdrop ART (the procedural Mode-A image layer)
// One source of truth for the abstract indigo backdrops, imported by BOTH:
//   • gen-backdrops-proc.mjs   (render every backdrop procedurally — the offline path)
//   • gen-backdrops.mjs        (try Gemini per poster; on quota/billing failure, fall
//                               back to renderProcedural([name]) for that one poster)
//
// Strictly indigo + neutral. No text, no logo, no people — type/mark stay in HTML.
// Each backdrop is tuned to its poster's content zones: the hero glow sits where the
// headline goes; the dense lower band (spec rows / feature points) is kept dark so the
// HTML type over it stays crisp. 1080×1350 (the 4:5 feed-poster canvas).

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export const W = 1080, H = 1350;

// brand mark as pure shape (notched feed-card) — used as a faint background motif only
const MARK = 'M13 13 L167 13 L167 82 L120 112.5 L167 143 L167 167 L13 167 Z';
const rng = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

// a drifting particle field biased toward a focal point
function dots(n, fx, fy, spread, rMax, color, opMax, seed) {
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * spread;
    const x = fx + Math.cos(a) * d, y = fy + Math.sin(a) * d * 1.15;
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const rad = 0.6 + r() * rMax, op = (opMax * (1 - d / (spread * 1.4))).toFixed(3);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="${color}" opacity="${op}"/>`;
  }
  return s;
}

// big translucent notched feed-card planes (the mark as pure shape)
function planes(list) {
  return list.map(([x, y, s, rot, op]) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity="${op}" filter="url(#soft2)"><path d="${MARK}" fill="#8B97FF"/></g>`
  ).join('');
}

// faint topographic contour rings (the "explainer" signature for poster-why)
function contours(cx, cy, n, r0, rStep, color, op, squash = 0.86) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const r = r0 + i * rStep;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${(r * squash).toFixed(0)}" fill="none" stroke="${color}" stroke-width="1.3" opacity="${(op * (1 - i / n)).toFixed(3)}"/>`;
  }
  return s;
}

const defs = `
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="46"/></filter>
  <filter id="soft2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="fog"><feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="11" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <radialGradient id="vig" cx="50%" cy="40%" r="78%"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#070516" stop-opacity="0.62"/></radialGradient>
  <radialGradient id="vigP" cx="50%" cy="42%" r="80%"><stop offset="0.55" stop-color="#0A0B10" stop-opacity="0"/><stop offset="1" stop-color="#0A0B10" stop-opacity="0.10"/></radialGradient>
  <linearGradient id="botfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.46" stop-color="#07050F" stop-opacity="0"/><stop offset="1" stop-color="#07050F" stop-opacity="0.66"/></linearGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8B97FF" stop-opacity="0"/><stop offset="0.5" stop-color="#8B97FF" stop-opacity="0.16"/><stop offset="1" stop-color="#8B97FF" stop-opacity="0"/></linearGradient>`;

const svg = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${inner}</svg>`;

// ── the backdrops, keyed by [data-export] name ──────────────────────────────────
export const ART = {
  // POSTER 1 · program — hero / premium (abstract fallback; ships as a Mode-B treated photo)
  'poster-program': svg(`
    <radialGradient id="bg" cx="58%" cy="26%" r="95%"><stop offset="0" stop-color="#6E78F5"/><stop offset="0.26" stop-color="#4B3FE0"/><stop offset="0.58" stop-color="#261A82"/><stop offset="1" stop-color="#0B0822"/></radialGradient>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" filter="url(#fog)" opacity="0.42" style="mix-blend-mode:overlay"/>
    <ellipse cx="900" cy="230" rx="540" ry="440" fill="#9aa6ff" opacity="0.55" filter="url(#soft)"/>
    <ellipse cx="120" cy="1180" rx="460" ry="420" fill="#1b1450" opacity="0.55" filter="url(#soft)"/>
    ${planes([[470, -40, 3.6, 8, 0.18], [-90, 470, 4.4, -6, 0.13], [690, 760, 2.8, 18, 0.12]])}
    <rect width="${W}" height="${H}" fill="url(#vig)"/>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/>`),

  // POSTER 2 · seats — scarcity / premium · single volumetric column of light (one room)
  'poster-seats': svg(`
    <radialGradient id="bg" cx="68%" cy="40%" r="85%"><stop offset="0" stop-color="#2a2360"/><stop offset="0.32" stop-color="#181445"/><stop offset="0.7" stop-color="#0c0a26"/><stop offset="1" stop-color="#08070f"/></radialGradient>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" filter="url(#fog)" opacity="0.40" style="mix-blend-mode:overlay"/>
    <polygon points="560,-40 820,-40 1180,1390 360,1390" fill="url(#beam)"/>
    <ellipse cx="720" cy="540" rx="430" ry="430" fill="#aeb6ff" opacity="0.5" filter="url(#soft)"/>
    <ellipse cx="720" cy="540" rx="180" ry="180" fill="#e7e9ff" opacity="0.45" filter="url(#soft)"/>
    ${dots(420, 720, 560, 560, 2.6, '#c3c9ff', 0.5, 91)}
    <rect width="${W}" height="${H}" fill="url(#vig)"/>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.055"/>`),

  // POSTER 3 · masterclass — hook / playful (abstract fallback; ships as a Mode-B treated photo)
  'poster-masterclass': svg(`
    <radialGradient id="bg" cx="62%" cy="34%" r="95%"><stop offset="0" stop-color="#F1ECFF"/><stop offset="0.4" stop-color="#EFEAFB"/><stop offset="0.75" stop-color="#EFEAE0"/><stop offset="1" stop-color="#E9E3D6"/></radialGradient>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="700" cy="430" rx="360" ry="360" fill="#8B97FF" opacity="0.28" filter="url(#soft)"/>
    <ellipse cx="700" cy="430" rx="150" ry="150" fill="#ffffff" opacity="0.55" filter="url(#soft)"/>
    ${dots(520, 700, 430, 640, 2.4, '#6E78F5', 0.42, 23)}
    <rect width="${W}" height="${H}" fill="url(#vigP)"/>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.04" style="mix-blend-mode:multiply"/>`),

  // POSTER 4 · build — product-mockup / playful · bright indigo field, light from upper-right,
  // calmer lower-left so the headline + CTA read; the HTML mockup sits in the bright mid.
  'poster-build': svg(`
    <radialGradient id="bg" cx="60%" cy="28%" r="100%"><stop offset="0" stop-color="#727CF7"/><stop offset="0.28" stop-color="#4636C9"/><stop offset="0.6" stop-color="#241A78"/><stop offset="1" stop-color="#0D0934"/></radialGradient>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" filter="url(#fog)" opacity="0.40" style="mix-blend-mode:overlay"/>
    <ellipse cx="880" cy="250" rx="520" ry="430" fill="#9aa6ff" opacity="0.50" filter="url(#soft)"/>
    <ellipse cx="120" cy="1190" rx="500" ry="430" fill="#160f48" opacity="0.62" filter="url(#soft)"/>
    ${planes([[520, -30, 3.4, 10, 0.16], [-70, 520, 4.2, -8, 0.12], [720, 820, 2.6, 16, 0.12]])}
    <rect width="${W}" height="${H}" fill="url(#vig)"/>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/>`),

  // POSTER 5 · why — explainer / premium · DARK, calm; soft glow + faint topo contours behind
  // the upper-left headline, then a dark lower 2/3 so four feature rows stay legible.
  'poster-why': svg(`
    <radialGradient id="bg" cx="26%" cy="16%" r="115%"><stop offset="0" stop-color="#2A2358"/><stop offset="0.3" stop-color="#181440"/><stop offset="0.62" stop-color="#0C0A24"/><stop offset="1" stop-color="#08070F"/></radialGradient>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" filter="url(#fog)" opacity="0.36" style="mix-blend-mode:overlay"/>
    <ellipse cx="250" cy="300" rx="470" ry="400" fill="#6E78F5" opacity="0.40" filter="url(#soft)"/>
    <ellipse cx="250" cy="300" rx="150" ry="150" fill="#aeb6ff" opacity="0.30" filter="url(#soft)"/>
    ${contours(250, 300, 6, 180, 78, '#8B97FF', 0.11)}
    ${dots(150, 260, 300, 520, 1.6, '#8B97FF', 0.18, 53)}
    <rect width="${W}" height="${H}" fill="url(#botfade)"/>
    <rect width="${W}" height="${H}" fill="url(#vig)"/>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/>`),

  // POSTER 6 · proof — outcome / premium · DARK; a soft upward beam + glow behind the upper
  // headline/badge, dark lower band for the chips + spec rows.
  'poster-proof': svg(`
    <radialGradient id="bg" cx="50%" cy="18%" r="110%"><stop offset="0" stop-color="#2A2358"/><stop offset="0.32" stop-color="#17132E"/><stop offset="0.66" stop-color="#0B0B14"/><stop offset="1" stop-color="#08070F"/></radialGradient>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" filter="url(#fog)" opacity="0.36" style="mix-blend-mode:overlay"/>
    <polygon points="430,-40 650,-40 940,1100 140,1100" fill="url(#beam)" opacity="0.85"/>
    <ellipse cx="540" cy="300" rx="520" ry="380" fill="#6E78F5" opacity="0.38" filter="url(#soft)"/>
    <ellipse cx="540" cy="280" rx="150" ry="150" fill="#cdd2ff" opacity="0.30" filter="url(#soft)"/>
    ${dots(170, 540, 300, 520, 1.8, '#aeb6ff', 0.20, 71)}
    <rect width="${W}" height="${H}" fill="url(#botfade)"/>
    <rect width="${W}" height="${H}" fill="url(#vig)"/>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/>`),

  // POSTER 7 · enquiry — multi-detail / premium · DARK; glow + faint planes behind the upper-left
  // headline, dark lower band so the five-row spec block reads.
  'poster-enquiry': svg(`
    <radialGradient id="bg" cx="30%" cy="14%" r="115%"><stop offset="0" stop-color="#262050"/><stop offset="0.32" stop-color="#161232"/><stop offset="0.64" stop-color="#0B0A1E"/><stop offset="1" stop-color="#08070F"/></radialGradient>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" filter="url(#fog)" opacity="0.34" style="mix-blend-mode:overlay"/>
    <ellipse cx="300" cy="280" rx="470" ry="380" fill="#6478F0" opacity="0.36" filter="url(#soft)"/>
    <ellipse cx="300" cy="270" rx="140" ry="140" fill="#aeb6ff" opacity="0.26" filter="url(#soft)"/>
    ${planes([[40, -70, 3.0, 8, 0.12], [760, 120, 2.2, -10, 0.10]])}
    ${dots(140, 300, 280, 480, 1.6, '#8B97FF', 0.16, 29)}
    <rect width="${W}" height="${H}" fill="url(#botfade)"/>
    <rect width="${W}" height="${H}" fill="url(#vig)"/>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/>`),
};

// The default Mode-A set the abstract pipeline owns. program + masterclass ship as Mode-B
// treated photos (tools/treat-stock.mjs), so they are excluded unless ALL=1 is requested.
export const MODE_A = ['poster-seats', 'poster-build', 'poster-why', 'poster-proof', 'poster-enquiry'];
export const ALL = Object.keys(ART);

// Rasterise the named backdrops to <outDir>/<name>.png via real Chromium.
export async function renderProcedural(names, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: W, height: H } });
  const done = [];
  for (const name of names) {
    const art = ART[name];
    if (!art) { console.error(`  ! no procedural art for ${name}`); continue; }
    await page.setContent(`<!doctype html><html><body style="margin:0">${art}</body></html>`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(outDir, name + '.png'), clip: { x: 0, y: 0, width: W, height: H } });
    console.log('  ✓', name + '.png  (procedural)');
    done.push(name);
  }
  await browser.close();
  return done;
}
