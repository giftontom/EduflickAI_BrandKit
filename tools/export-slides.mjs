// Eduflick AI — pixel-perfect slide exporter
// Renders the Full-Stack AI Engineer Program deck in real Chromium and
// screenshots every slide (.stage) at exact 1280×720.
//
//   cd tools
//   npm install                          # one-time (Playwright + Chromium)
//   npm run export:slides                # → ../exports/full-stack-ai-engineer/*.png at 2x (2560×1440)
//   SCALE=1 npm run export:slides        # → exact 1280×720
//
// Why Playwright (not html2canvas): the real browser engine paints gradients,
// web-font kerning and the clip-path mark exactly as designed. The in-deck
// "Download PDF" button (html2canvas + jsPDF) is the user-facing path; this is
// the crisp raster path for social/embeds.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, '../brochures/fae-offline/Eduflick_Full_Stack_AI_Engineer_Program_Deck.html');
const OUT  = path.resolve(__dirname, '../exports/full-stack-ai-engineer');
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
const page = await browser.newPage({ deviceScaleFactor: SCALE });
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
// undo the screen-fit transform so each slide shoots at its true 1280×720, and
// hide the floating Download button so it never bakes into a slide.
await page.evaluate(() => { const d = document.getElementById('deck'); if (d) d.style.transform = 'none'; });
await page.addStyleTag({ content: '.pdf-bar{display:none!important}' });
await page.waitForTimeout(400);                              // let gradients + fonts settle

const stages = await page.$$('.stage');
if (!stages.length) { console.error('No .stage slides found.'); await browser.close(); process.exit(1); }

console.log(`Exporting ${stages.length} slides…\n`);
let n = 0;
for (const el of stages) {
  const name = 'slide-' + String(n + 1).padStart(2, '0');
  await el.screenshot({ path: path.join(OUT, name + '.png') });
  n++;
  console.log('  ✓', name + '.png');
}

await browser.close();
console.log(`\nDone — ${n} PNGs at ${SCALE}x in ${OUT}`);
