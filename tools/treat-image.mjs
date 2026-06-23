// Eduflick AI — brand duotone treatment for ANY image (the deterministic "treat" step).
// Forces an input image onto the EXACT indigo ramp (desaturate + darken) via the shared
// _duotone.mjs primitives, rendered in Chromium. Use it to bring a Recraft/Gemini backdrop
// (or stock, or any image) onto the restrained brand indigo — no third hue survives.
// No text/logo is ever added; only the source's own pixels are recolored.
//
// This is the deterministic counterpart to a generative recolor: hue-exact, repeatable,
// free (no API). It fixes the one rough edge of Recraft style backdrops — their vivid,
// over-saturated glow — by remapping luminance onto the brand ramp.
//
//   cd tools
//   node treat-image.mjs in.png                  # -> in.treated.png  (dark mode)
//   MODE=paper node treat-image.mjs in.png out.png
//   W=1024 H=1280 node treat-image.mjs in.png    # custom size (default 1080x1350)
//   PRE='contrast(1.15)' node treat-image.mjs in.png   # pre-filter nudge before the duotone
//   PRE='brightness(0.4) contrast(1.3)' node treat-image.mjs recraft.png   # tame an over-bright
//                                          Recraft glow into the restrained dark brand field
//
// The source is cover-cropped to W×H (never distorted) — set W/H to the source aspect to
// avoid cropping (as the Recraft example does). PRE is interpolated into CSS — trusted local input.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { RAMP, filterDef } from './_duotone.mjs';

const IN = process.argv[2];
if (!IN || !fs.existsSync(IN)) {
  console.error('usage: node treat-image.mjs <in.(png|jpg|webp)> [out.png]   (env: MODE=dark|paper W H PRE)');
  process.exit(1);
}
const MODE = process.env.MODE || 'dark';
if (!RAMP[MODE]) { console.error(`unknown MODE "${MODE}" — use dark|paper`); process.exit(1); }
const parsed = path.parse(IN);
const OUT = process.argv[3] || path.join(parsed.dir, parsed.name + '.treated.png');
if (path.resolve(OUT) === path.resolve(IN)) {
  console.error('refusing to overwrite the input in place — pass an explicit output path');
  process.exit(1);
}
const W = Math.round(Number(process.env.W) || 1080), H = Math.round(Number(process.env.H) || 1350);
if (!(W > 0) || !(H > 0)) { console.error('W/H must be positive numbers'); process.exit(1); }
const PRE = process.env.PRE || 'contrast(1.05)';   // trusted local CSS filter input

const dataUri = (file) => {
  const buf = fs.readFileSync(file);
  // Sniff magic bytes — don't trust the extension (API downloads may have none).
  let mime = 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) mime = 'image/png';
  else if (buf[0] === 0x52 && buf[1] === 0x49 && buf.slice(8, 12).toString() === 'WEBP') mime = 'image/webp';
  return `data:${mime};base64,${buf.toString('base64')}`;
};

const html = (uri) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:#0A0B10}
  svg.defs{position:absolute;width:0;height:0}
  .frame{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${MODE === 'paper' ? '#ECE7DA' : '#0A0B10'}}
  .frame img{width:100%;height:100%;object-fit:cover;object-position:50% 50%;display:block;filter:${PRE} url(#duo)}
</style></head><body>
  <svg class="defs" xmlns="http://www.w3.org/2000/svg"><defs>${filterDef('duo', RAMP[MODE])}</defs></svg>
  <div class="frame"><img src="${uri}" alt=""></div>
</body></html>`;

const browser = await chromium.launch();
try {
  const tab = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: W, height: H } });
  await tab.setContent(html(dataUri(IN)), { waitUntil: 'networkidle' });
  await tab.waitForTimeout(120);
  await tab.screenshot({ path: OUT, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`✓ treated (${MODE}, ${W}x${H}) → ${OUT}`);
} catch (e) {
  console.error('treat failed:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
