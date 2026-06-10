// Eduflick AI — pixel-perfect launch-grid exporter
// Renders the launch grid in real Chromium and screenshots every post (as its
// true mural slice) and every carousel slide at exact 1080×1350.
//
//   cd tools
//   npm install
//   npx playwright install chromium     # one-time
//   npm run export                      # → ../exports/*.png at 2x (2160×2700)
//   SCALE=1 npm run export              # → exact 1080×1350
//
// Why Playwright (not html2canvas/dom-to-image): it uses the real browser engine,
// so clip-path notches, radial gradients, drop-shadow glow, the Tomatrix logo and
// web-font kerning come out exactly as the browser paints them — true pixel accuracy.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, '../design-system/collateral/launch-grid.html');
const OUT  = path.resolve(__dirname, '../exports');
const SCALE = Number(process.env.SCALE || 2);                 // 2 = crisp (2160×2700) · 1 = exact 1080×1350

// --- Validation ---
if (!fs.existsSync(HTML)) {
  console.error(`✗ Launch grid not found: ${HTML}`);
  console.error('  Make sure design-system/collateral/launch-grid.html exists.');
  process.exit(1);
}

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
console.log('Loading', url, '\nScale:', SCALE + 'x  →', OUT, '\n');

let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  console.error('✗ Failed to launch Chromium. Is Playwright installed?');
  console.error('  Run: cd tools && npm install && npx playwright install chromium');
  console.error(`  Error: ${err.message}`);
  process.exit(1);
}

let exitCode = 0;
try {
  const page = await browser.newPage({ deviceScaleFactor: SCALE });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (err) {
    console.error(`✗ Failed to load page: ${err.message}`);
    console.error('  Is the file path correct? Try running: cd tools && npm run serve');
    exitCode = 1;
    throw err;
  }

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);                               // let the Tomatrix logo + gradients settle
  await page.addStyleTag({ content: '.dlbtn{display:none!important}' });   // never bake the hover button into exports

  // grow the viewport to the full (unscaled) export page so every region is paintable
  const dims = await page.evaluate(() => ({
    w: Math.ceil(document.body.scrollWidth),
    h: Math.ceil(document.body.scrollHeight),
  }));

  if (dims.w === 0 || dims.h === 0) {
    console.error('✗ Page dimensions are zero — the page may not have rendered.');
    console.error('  Check that the HTML file loads correctly in a browser.');
    exitCode = 1;
    throw new Error('Zero page dimensions');
  }

  await page.setViewportSize({ width: dims.w, height: dims.h });
  await page.waitForTimeout(200);

  const targets = await page.$$('[data-export]');
  if (!targets.length) {
    console.error('✗ No [data-export] nodes found — is export mode active?');
    console.error('  Open the URL with ?export=1 to verify export markup is present.');
    exitCode = 1;
    throw new Error('No export targets');
  }

  console.log(`Exporting ${targets.length} images…\n`);
  let n = 0;
  const skipped = [];
  for (const el of targets) {
    const name = await el.getAttribute('data-export');
    try {
      const box = await el.boundingBox();
      if (!box || box.width === 0 || box.height === 0) {
        skipped.push(name);
        continue;
      }
      // clip-from-page captures the composited region, so transparent post tiles
      // still include their slice of the continuous mural background.
      await page.screenshot({
        path: path.join(OUT, name + '.png'),
        clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      });
      n++;
      console.log('  ✓', name + '.png');
    } catch (err) {
      console.warn(`  ✗ failed ${name}: ${err.message}`);
      skipped.push(name);
    }
  }

  if (skipped.length) {
    console.warn(`\n⚠ Skipped ${skipped.length} item(s): ${skipped.join(', ')}`);
  }
  console.log(`\nDone — ${n} PNGs at ${SCALE}x in ${OUT}`);

} catch (err) {
  if (exitCode === 0) exitCode = 1;
} finally {
  await browser.close();
}

process.exit(exitCode);
