// TEMP build step: bake compact, darkened indigo-duotone backdrops into the dark
// brochure as inline JPEG data-URIs (html2canvas-safe — raster, no SVG filter).
// Re-runnable: it regex-replaces the --bg-* custom props each time. Safe to delete.
//
//   cd tools && node _inject-dark-bg.mjs
//
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BD = path.join(ROOT, 'design-system', 'collateral', 'assets', 'backdrops');
const HTML = path.join(ROOT, 'brochures', process.argv[2] || 'Eduflick_Full_Stack_AI_Engineer_Brochure_Dark.html');

// source duotone → css var, target width, extra darken (0..1 black overlay), jpeg quality
const JOBS = [
  { src: 'poster-program.png',     varName: 'bg-tech',   w: 820, darken: 0.34, q: 0.62 },
  { src: 'poster-masterclass.png', varName: 'bg-people', w: 820, darken: 0.40, q: 0.62 },
];

const fileToDataURI = (p) => {
  const buf = fs.readFileSync(p);
  return `data:image/png;base64,${buf.toString('base64')}`;
};

const browser = await chromium.launch();
const page = await browser.newPage();

let html = fs.readFileSync(HTML, 'utf8');

for (const job of JOBS) {
  const srcURI = fileToDataURI(path.join(BD, job.src));
  const dataURI = await page.evaluate(async ({ srcURI, w, darken, q }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = srcURI; });
    const scale = w / img.naturalWidth;
    const h = Math.round(img.naturalHeight * scale);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    // deepen toward the brand ink so it reads as mood, never competes with type
    ctx.fillStyle = `rgba(8,5,22,${darken})`;
    ctx.fillRect(0, 0, w, h);
    return c.toDataURL('image/jpeg', q);
  }, { srcURI, w: job.w, darken: job.darken, q: job.q });

  const kb = Math.round((dataURI.length * 3 / 4) / 1024);
  const re = new RegExp(`(--${job.varName}:)url\\("[^"]*"\\)`);
  if (!re.test(html)) throw new Error(`placeholder --${job.varName} not found in HTML`);
  html = html.replace(re, `$1url("${dataURI}")`);
  console.log(`  ✓ --${job.varName}  ← ${job.src}  (~${kb} KB)`);
}

fs.writeFileSync(HTML, html);
await browser.close();
console.log('injected backdrops →', path.basename(HTML));
