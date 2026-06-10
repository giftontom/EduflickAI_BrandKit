// export-images.mjs — pixel-perfect HTML → PNG exporter (Playwright + real Chromium).
// Brand-neutral. Screenshots every element marked [data-export="name"] at exact pixels,
// clipping it from the composited page (so transparent tiles keep their background slice).
//
//   HTML_PATH=path/to/page.html OUT_DIR=./exports SCALE=2 node export-images.mjs
//
// Why Playwright (not html2canvas/dom-to-image): it uses the real browser engine, so clip-path
// notches, radial gradients, drop-shadow glow, backdrop-filter, web fonts and SVG come out
// exactly as the browser paints them — true pixel accuracy.
//
// Env:
//   HTML_PATH      (required) HTML file to render, OR a full http(s) URL
//   OUT_DIR        (default ./exports) where PNGs are written
//   SCALE          (default 2) deviceScaleFactor; 1 = exact CSS pixels, 2 = crisp @2x
//   HTML_QUERY     (optional) query string appended to a file path, e.g. "export=1"
//   HIDE_SELECTOR  (default "[data-export-hide],.dlbtn") elements hidden before capture

import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const HTML_PATH = process.env.HTML_PATH;
const OUT = path.resolve(process.env.OUT_DIR || "exports");
const SCALE = Number(process.env.SCALE || 2);
const HTML_QUERY = process.env.HTML_QUERY || "";
const HIDE_SELECTOR = process.env.HIDE_SELECTOR || "[data-export-hide],.dlbtn";

if (!HTML_PATH) {
  console.error("✗ Set HTML_PATH=path/to/page.html (or a full http(s) URL).");
  process.exit(1);
}

let url;
if (/^https?:\/\//.test(HTML_PATH)) {
  url = HTML_PATH;
} else {
  const abs = path.resolve(HTML_PATH);
  if (!fs.existsSync(abs)) {
    console.error(`✗ HTML not found: ${abs}`);
    process.exit(1);
  }
  url = pathToFileURL(abs).href + (HTML_QUERY ? "?" + HTML_QUERY : "");
}

fs.mkdirSync(OUT, { recursive: true });
console.log("Loading", url, "\nScale:", SCALE + "x  →", OUT, "\n");

let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  console.error("✗ Failed to launch Chromium. Run: npm install && npx playwright install chromium");
  console.error(`  Error: ${err.message}`);
  process.exit(1);
}

let exitCode = 0;
try {
  const page = await browser.newPage({ deviceScaleFactor: SCALE });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch (err) {
    console.error(`✗ Failed to load page: ${err.message}`);
    console.error("  If fonts/images are blocked on file://, run the bundled serve.mjs and use an http URL.");
    exitCode = 1;
    throw err;
  }

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500); // let gradients / late images settle
  await page.addStyleTag({ content: `${HIDE_SELECTOR}{display:none!important}` });

  // grow the viewport to the full (unscaled) page so every region is paintable
  const dims = await page.evaluate(() => ({
    w: Math.ceil(document.body.scrollWidth),
    h: Math.ceil(document.body.scrollHeight),
  }));
  if (!dims.w || !dims.h) {
    console.error("✗ Page dimensions are zero — it may not have rendered.");
    exitCode = 1;
    throw new Error("Zero page dimensions");
  }
  await page.setViewportSize({ width: dims.w, height: dims.h });
  await page.waitForTimeout(200);

  const targets = await page.$$("[data-export]");
  if (!targets.length) {
    console.error('✗ No [data-export] nodes found. Mark each export target: <div data-export="name">…');
    exitCode = 1;
    throw new Error("No export targets");
  }

  console.log(`Exporting ${targets.length} image(s)…\n`);
  let n = 0;
  const skipped = [];
  for (const el of targets) {
    const name = await el.getAttribute("data-export");
    try {
      const box = await el.boundingBox();
      if (!box || box.width === 0 || box.height === 0) {
        skipped.push(name);
        continue;
      }
      // clip-from-page captures the composited region (transparent nodes keep their bg slice)
      await page.screenshot({
        path: path.join(OUT, name + ".png"),
        clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      });
      n++;
      console.log("  ✓", name + ".png");
    } catch (err) {
      console.warn(`  ✗ failed ${name}: ${err.message}`);
      skipped.push(name);
    }
  }

  if (skipped.length) console.warn(`\n⚠ Skipped ${skipped.length}: ${skipped.join(", ")}`);
  console.log(`\nDone — ${n} PNG(s) at ${SCALE}x in ${OUT}`);
} catch (err) {
  if (exitCode === 0) exitCode = 1;
} finally {
  await browser.close();
}

process.exit(exitCode);
