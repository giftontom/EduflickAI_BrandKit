// Eduflick AI — Instagram profile avatar (gradient).
// Renders the avatar IN ISOLATION (no surrounding layout) so the capture is clean and the
// indigo-gradient disc fills the square edge-to-edge — correct for Instagram's circular crop.
//
//   cd tools && npm run export:avatar          → ../../assets/logo/social/avatar-pf-av-{400,1024}.png (+ Downloads)
//   SIZE=512 npm run export:avatar             → custom size(s), comma-separated
//
// Matches the brand avatar: diagonal indigo gradient (i-violet → indigo-ink), paper mark, faint rim.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT, 'assets/logo/social');
const DOWNLOADS = path.resolve(process.env.HOME || '', 'Downloads');
const SIZES = (process.env.SIZE || '400,1024').split(',').map((s) => Number(s.trim())).filter(Boolean);

if (!SIZES.length) {
  console.error('✗ No valid SIZE provided. Use e.g. SIZE=512 or SIZE=400,1024');
  process.exit(1);
}

try {
  fs.mkdirSync(OUT_DIR, { recursive: true });
} catch (err) {
  console.error(`✗ Cannot create output directory ${OUT_DIR}: ${err.message}`);
  process.exit(1);
}

const MARK = `<svg viewBox="0 0 180 180" style="width:44%;height:44%;display:block"><path d="M13 13 L167 13 L167 82 L120 112.5 L167 143 L167 167 L13 167 Z" fill="#F5F2EA"/></svg>`;
const page_html = (px) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:transparent}
  .av{width:${px}px;height:${px}px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(140deg,#4A3DD9 0%,#3A2BB8 28%,#261A82 56%,#150D52 80%,#0B0822 100%)}
</style></head><body><div class="av">${MARK}</div></body></html>`;

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
console.log('Rendering isolated gradient avatar …\n');

for (const SIZE of SIZES) {
  let page;
  try {
    page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
    await page.setContent(page_html(SIZE), { waitUntil: 'load' });

    const outFile = path.join(OUT_DIR, `avatar-pf-av-${SIZE}.png`);
    await page.locator('.av').screenshot({ path: outFile, omitBackground: true });   // transparent corners, disc fills

    const stat = fs.statSync(outFile);
    console.log(`  ✓ avatar-pf-av-${SIZE}.png  (${SIZE}×${SIZE} px, ${(stat.size / 1024).toFixed(1)} KB)`);

    // Also copy to Downloads for convenience
    if (fs.existsSync(DOWNLOADS)) {
      try {
        const dlName = SIZE === 400
          ? 'eduflick-ai-instagram-profile-pic.png'
          : `eduflick-ai-instagram-profile-pic-${SIZE}.png`;
        const dlPath = path.join(DOWNLOADS, dlName);
        fs.copyFileSync(outFile, dlPath);
        console.log(`  ✓ ${dlPath}`);
      } catch (err) {
        console.warn(`  ⚠ Could not copy to Downloads: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`  ✗ Failed at ${SIZE}px: ${err.message}`);
    exitCode = 1;
  } finally {
    if (page) await page.close();
  }
}

await browser.close();
if (exitCode === 0) console.log('\nDone.');
process.exit(exitCode);
