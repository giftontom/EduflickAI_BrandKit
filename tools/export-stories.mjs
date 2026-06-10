// Eduflick AI — story exporter
// Renders design-system/collateral/stories.html in real Chromium and screenshots
// every [data-export] story at its true element size (1080×1920, the 9:16 IG-story canvas).
//
//   cd tools
//   npm run export:stories            # → ../exports/stories/*.png at 2x
//   SCALE=1 npm run export:stories    # → exact 1080×1920
//
// Same engine as export-posters.mjs (size comes from each element's box, not hardcoded).

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML  = path.resolve(__dirname, '../design-system/collateral/stories.html');
const OUT   = path.resolve(__dirname, '../exports/stories');
const SCALE = Number(process.env.SCALE || 2);

if (!fs.existsSync(HTML)) { console.error(`✗ Stories file not found: ${HTML}`); process.exit(1); }

// Pre-export gate: never render unresolved [[placeholders]] into a deliverable.
const phHits = fs.readFileSync(HTML, 'utf8').split('\n')
  .flatMap((line, i) => (/\[\[/.test(line) ? [`  ${path.basename(HTML)}:${i + 1}  ${line.trim().slice(0, 140)}`] : []));
if (phHits.length) {
  console.error(`✗ Unresolved [[placeholders]] in ${HTML} — fix before exporting:`);
  for (const h of phHits) console.error(h);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const url = 'file://' + encodeURI(HTML) + '?export=1';
console.log('Loading', url, '\nScale:', SCALE + 'x →', OUT, '\n');

let browser;
try { browser = await chromium.launch(); }
catch (err) {
  console.error('✗ Failed to launch Chromium. Run: cd tools && npm install && npx playwright install chromium');
  console.error(`  Error: ${err.message}`); process.exit(1);
}

let exitCode = 0;
try {
  const page = await browser.newPage({ deviceScaleFactor: SCALE });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const targets = await page.$$('[data-export]');
  if (!targets.length) { console.error('✗ No [data-export] nodes in stories.html.'); exitCode = 1; throw new Error('no targets'); }

  console.log(`Exporting ${targets.length} stories…\n`);
  for (const el of targets) {
    const name = await el.getAttribute('data-export');
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: path.join(OUT, name + '.png') });
    const box = await el.boundingBox();
    console.log('  ✓', name + '.png', `(${Math.round(box.width)}×${Math.round(box.height)})`);
  }
  console.log(`\nDone — ${targets.length} PNGs at ${SCALE}x in ${OUT}`);
} catch { if (exitCode === 0) exitCode = 1; }
finally { await browser.close(); }
process.exit(exitCode);
