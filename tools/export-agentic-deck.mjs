// Eduflick AI — Agentic Engineering & Orchestration workshop deck exporter
// Renders the deck in real Chromium: a crisp PNG per slide (.stage) at 1280×720,
// plus a single landscape PDF (one .stage per page).
//
//   cd tools
//   npm install                          # one-time (Playwright + Chromium)
//   npm run export:agentic               # → ../exports/agentic-engineering-workshop/*.png at 2x + .pdf
//   SCALE=1 npm run export:agentic       # exact 1280×720 PNGs
//
// Mirrors export-slides.mjs (the Full-Stack program deck) — same Playwright path,
// same pre-export [[placeholder]] gate — with an added multi-page PDF pass.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, '../brochures/Eduflick_Agentic_Engineering_Workshop_Deck.html');
const OUT  = path.resolve(__dirname, '../exports/agentic-engineering-workshop');
const SCALE = Number(process.env.SCALE || 2);                 // 2 = crisp (2560×1440) · 1 = exact 1280×720

if (!fs.existsSync(HTML)) { console.error('Cannot find:', HTML); process.exit(1); }

// Pre-export gate: never render unresolved [[placeholders]] into a deliverable.
const phHits = fs.readFileSync(HTML, 'utf8').split('\n')
  .flatMap((line, i) => (/\[\[/.test(line) ? [`  ${path.basename(HTML)}:${i + 1}  ${line.trim().slice(0, 140)}`] : []));
if (phHits.length) {
  console.error(`✗ Unresolved [[placeholders]] in ${HTML} — fix before exporting:`);
  for (const h of phHits) console.error(h);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const url = 'file://' + encodeURI(HTML);
console.log('Loading', url, '\nScale:', SCALE + 'x  →', OUT, '\n');

const browser = await chromium.launch();
// Viewport ≥1320px wide so the deck's fitDeck() computes scale=1 (min(1,(w-40)/1280))
// and never shrinks a late screenshot via its delayed re-fit timeouts.
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: SCALE });
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
// belt-and-braces: hard-disable the screen-fit transform, and hide the floating
// Download button so it never bakes into a slide.
await page.evaluate(() => { const d = document.getElementById('deck'); if (d) d.style.transform = 'none'; });
await page.addStyleTag({ content: '.pdf-bar{display:none!important} #deck{transform:none!important}' });
await page.waitForTimeout(900);

const stages = await page.$$('.stage');
if (!stages.length) { console.error('No .stage slides found.'); await browser.close(); process.exit(1); }

console.log(`Exporting ${stages.length} PNGs…`);
let n = 0;
for (const el of stages) {
  const name = 'slide-' + String(n + 1).padStart(2, '0');
  await el.screenshot({ path: path.join(OUT, name + '.png') });
  n++;
  console.log('  ✓', name + '.png');
}

// Landscape PDF — one .stage per page (uses the deck's @media print @page 1280×720).
console.log('\nExporting PDF…');
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(200);
const pdfPath = path.join(OUT, 'Eduflick_Agentic_Engineering_Workshop_Deck.pdf');
await page.pdf({ path: pdfPath, width: '1280px', height: '720px', printBackground: true, pageRanges: `1-${stages.length}` });
console.log('  ✓', path.basename(pdfPath));

await browser.close();
console.log(`\nDone — ${n} PNGs at ${SCALE}x + PDF in ${OUT}`);
