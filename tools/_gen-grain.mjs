// TEMP: generate a faint grayscale raster film-grain PNG and inject it into a brochure's
// --grain custom property. Re-runnable. Arg = html basename (default v2). Safe to delete.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAME = process.argv[2] || 'Eduflick_Full_Stack_AI_Engineer_Brochure_v2.html';
const HTML = path.join(ROOT, 'brochures', NAME);

const browser = await chromium.launch();
const page = await browser.newPage();
const dataURI = await page.evaluate(() => {
  const S = 130, c = document.createElement('canvas'); c.width = S; c.height = S;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + Math.floor(Math.random() * 135);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.floor(Math.random() * 46);
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
});
await browser.close();

let html = fs.readFileSync(HTML, 'utf8');
const re = /--grain:url\("[^"]*"\)/;
if (!re.test(html)) throw new Error('--grain placeholder not found in ' + NAME);
html = html.replace(re, `--grain:url("${dataURI}")`);
fs.writeFileSync(HTML, html);
console.log(`injected grain (~${Math.round(dataURI.length / 1024)} KB) → ${NAME}`);
