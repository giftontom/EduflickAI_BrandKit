// Eduflick AI — WhatsApp share exporter
// Renders ONLY the all-in-one [data-export="poster-whatsapp"] tile from posters.html and
// emits two files:
//   • exports/posters/poster-whatsapp.png            crisp 2× archive (2160×2700)
//   • exports/whatsapp/Eduflick_FullStackAI_WhatsApp.jpg   share-ready (1080×1350, JPEG)
//
// Why a separate JPEG: WhatsApp re-encodes shared images to JPEG and resizes anything past
// ~1600px on the longest side, destroying shadow/gradient detail first. Shipping a clean
// 1080×1350 JPEG at Q86 (already under that ceiling, ~150–280 KB) means WhatsApp leaves it
// nearly untouched instead of crushing a heavy PNG — the type stays crisp at thumbnail + tap.
//
//   cd tools && npm run export:whatsapp

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, '../design-system/collateral/posters.html');
const OUT_PNG = path.resolve(__dirname, '../exports/posters');
const OUT_JPG = path.resolve(__dirname, '../exports/whatsapp');
const SEL = '[data-export="poster-whatsapp"]';

fs.mkdirSync(OUT_PNG, { recursive: true });
fs.mkdirSync(OUT_JPG, { recursive: true });

const url = 'file://' + encodeURI(HTML) + '?export=1';
const browser = await chromium.launch();
try {
  // 2× crisp PNG archive
  let page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  let el = await page.$(SEL);
  if (!el) { console.error('✗ poster-whatsapp not found'); process.exit(1); }
  await el.screenshot({ path: path.join(OUT_PNG, 'poster-whatsapp.png') });
  console.log('  ✓ poster-whatsapp.png  (2× archive)');
  await page.close();

  // 1× share-ready JPEG (1080×1350, under WhatsApp's 1600px ceiling)
  page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  el = await page.$(SEL);
  const jpg = path.join(OUT_JPG, 'Eduflick_FullStackAI_WhatsApp.jpg');
  await el.screenshot({ path: jpg, type: 'jpeg', quality: 86 });
  const kb = (fs.statSync(jpg).size / 1024).toFixed(0);
  console.log(`  ✓ Eduflick_FullStackAI_WhatsApp.jpg  (1080×1350, ${kb} KB)`);
} finally {
  await browser.close();
}
console.log('\nDone — WhatsApp share files in exports/whatsapp/ + exports/posters/');
process.exit(0);
