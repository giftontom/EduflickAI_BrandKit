// Eduflick AI — share-poster exporter (Full-Stack AI Engineer Program)
// Renders ONLY the [data-export="poster-share"] tile from posters.html and emits
// two files tuned for forwarding on WhatsApp / chat / email:
//
//   ../exports/posters/poster-share.png                  2× crisp archive (2160×2700, PNG)
//   ../exports/share/Eduflick_FullStackAI_Share.jpg      share-ready (1080×1350, JPEG Q86)
//
// Why a 1× JPEG too: WhatsApp re-encodes shared images to JPEG and resizes anything
// past ~1600px on the longest side, crushing gradient/shadow detail first. A clean
// 1080×1350 JPEG at Q86 is already under that ceiling, so it travels nearly untouched
// and the type stays crisp at thumbnail + tap.
//
//   cd tools && npm run export:share

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML    = path.resolve(__dirname, '../design-system/collateral/posters.html');
const OUT_PNG = path.resolve(__dirname, '../exports/posters');
const OUT_JPG = path.resolve(__dirname, '../exports/share');
const SEL     = '[data-export="poster-share"]';

if (!fs.existsSync(HTML)) {
  console.error(`✗ Posters file not found: ${HTML}`);
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

fs.mkdirSync(OUT_PNG, { recursive: true });
fs.mkdirSync(OUT_JPG, { recursive: true });

const url = 'file://' + encodeURI(HTML) + '?export=1';
console.log('Loading', url, '\n');

let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  console.error('✗ Failed to launch Chromium. Run: cd tools && npm install && npx playwright install chromium');
  console.error(`  Error: ${err.message}`);
  process.exit(1);
}

let exitCode = 0;
try {
  // 2× crisp PNG archive (2160×2700)
  let page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);                 // let gradients + web fonts settle
  let el = await page.$(SEL);
  if (!el) {
    console.error(`✗ ${SEL} not found in posters.html`);
    exitCode = 1;
    throw new Error('export target missing');
  }
  const pngPath = path.join(OUT_PNG, 'poster-share.png');
  await el.screenshot({ path: pngPath });
  let box = await el.boundingBox();
  console.log('  ✓ poster-share.png', `(${Math.round(box.width)}×${Math.round(box.height)})`,
    `${(fs.statSync(pngPath).size / 1024).toFixed(0)} KB`);
  await page.close();

  // 1× share-ready JPEG (1080×1350, under WhatsApp's ~1600px ceiling)
  page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  el = await page.$(SEL);
  const jpgPath = path.join(OUT_JPG, 'Eduflick_FullStackAI_Share.jpg');
  await el.screenshot({ path: jpgPath, type: 'jpeg', quality: 86 });
  box = await el.boundingBox();
  console.log('  ✓ Eduflick_FullStackAI_Share.jpg', `(${Math.round(box.width)}×${Math.round(box.height)})`,
    `${(fs.statSync(jpgPath).size / 1024).toFixed(0)} KB`);

  console.log('\nDone — share poster exported.');
} catch (err) {
  if (exitCode === 0) { exitCode = 1; console.error('✗', err.message); }
} finally {
  await browser.close();
}
process.exit(exitCode);
