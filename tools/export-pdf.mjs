// Render the brochure to a crisp, print-ready PDF with real Chromium (Playwright).
// Unlike the in-browser html2canvas button, Chromium renders the cinematic effects
// (gradients, halos, grain) pixel-perfect and keeps text selectable/vector.
//
//   cd tools && npm run export:pdf
//   cd tools && npm run export:pdf -- Eduflick_Full_Stack_AI_Engineer_Brochure_Dark.html
//
// Optional CLI arg = the brochure HTML basename under brochures/ (defaults to the
// light edition). The PDF is written alongside it with a .pdf extension.
//
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRCNAME = process.argv[2] || 'Eduflick_Full_Stack_AI_Engineer_Brochure.html';
const SRC = path.join(ROOT, 'brochures', SRCNAME);
const OUT = path.join(ROOT, 'brochures', SRCNAME.replace(/\.html$/, '.pdf'));

// Pre-export gate: never render unresolved [[placeholders]] into a deliverable.
const phHits = fs.readFileSync(SRC, 'utf8').split('\n')
  .flatMap((line, i) => (/\[\[/.test(line) ? [`  ${path.basename(SRC)}:${i + 1}  ${line.trim().slice(0, 140)}`] : []));
if (phHits.length) {
  console.error(`✗ Unresolved [[placeholders]] in ${SRC} — fix before exporting:`);
  for (const h of phHits) console.error(h);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + SRC, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

// Clean A4 print mode: each .sheet is exactly one A4 page, backgrounds on, no bleed/crop marks.
await page.addStyleTag({ content: `
@media print {
  @page { size: A4; margin: 0; }
  html, body { background:#fff; margin:0; }
  .pdf-download-btn, .cropmarks { display:none !important; }
  .sheet {
    width:210mm !important; height:297mm !important; min-height:297mm !important;
    padding:0 !important; margin:0 !important; box-shadow:none !important;
    overflow:hidden; page-break-after:always; break-after:page;
  }
  .sheet:last-child { page-break-after:auto; break-after:auto; }
}` });

await page.pdf({ path: OUT, printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('PDF →', OUT);
