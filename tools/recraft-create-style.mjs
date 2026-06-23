// Create a reusable Recraft brand style_id from approved flat backdrops.
//
// Phase 0 finding: a custom style_id trained on our own flat backdrops is what makes
// Recraft produce flat, subject-free backdrops (stock styles inject a subject).
// Recraft caps the TOTAL upload at 5 MB, so each reference is downscaled (sips) first.
//
//   cd tools
//   node --env-file=../.env.local recraft-create-style.mjs                       # default dark set
//   node --env-file=../.env.local recraft-create-style.mjs poster-why poster-proof
//   RECRAFT_STYLE=digital_illustration … recraft-create-style.mjs                # pick base family
//
// Prints the new style_id to paste into .env.local as RECRAFT_STYLE_ID.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY  = process.env.RECRAFT_API_KEY;
const BASE = 'https://external.api.recraft.ai/v1';
if (!KEY) {
  console.error('RECRAFT_API_KEY not set — run with:  node --env-file=../.env.local recraft-create-style.mjs');
  process.exit(1);
}

const BACKDROPS = path.resolve(__dirname, '../design-system/collateral/assets/backdrops');
const STYLE = process.env.RECRAFT_STYLE || 'digital_illustration';
const MAX_TOTAL = 5 * 1024 * 1024;

// dark, flat, abstract references make the best brand style seed
const DEFAULT_REFS = ['poster-why', 'poster-proof', 'poster-enquiry', 'poster-whatsapp'];
const refs = (process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_REFS)
  .map(n => (n.endsWith('.png') ? path.resolve(n) : path.join(BACKDROPS, n + '.png')));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'recraft-style-'));
function downscale(src) {
  const dst = path.join(tmp, path.basename(src));
  try { execFileSync('sips', ['-Z', '640', src, '--out', dst], { stdio: 'ignore' }); return dst; }
  catch { return src; }   // sips unavailable (non-macOS) → use the original and rely on the size guard
}

// Refuse to seed a brand style from a PARTIAL set — that would silently drive every
// Recraft poster off-brand. Any missing reference is a hard error.
const missing = refs.filter(r => !fs.existsSync(r));
if (missing.length) {
  console.error(`! missing reference image(s):\n  ${missing.join('\n  ')}`);
  console.error('  generate them first (e.g. npm run gen:backdrops) or pass an explicit ref list.');
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
const files = refs.map(downscale);

const total = files.reduce((s, f) => s + fs.statSync(f).size, 0);
console.log(`Uploading ${files.length} ref(s), total ${(total / 1024).toFixed(0)} KB (cap 5 MB), base style "${STYLE}"`);
if (total > MAX_TOTAL) {
  console.error('! still over the 5 MB cap after downscale — pass fewer references');
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}

const fd = new FormData();
fd.append('style', STYLE);
for (const f of files) fd.append('file', new Blob([fs.readFileSync(f)], { type: 'image/png' }), path.basename(f));

const res = await fetch(`${BASE}/styles`, { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd });
const txt = await res.text();
fs.rmSync(tmp, { recursive: true, force: true });
if (!res.ok) { console.error('create-style failed:', res.status, txt.slice(0, 300)); process.exit(1); }

const j = JSON.parse(txt);
console.log(`\n✓ brand style created: ${j.id}`);
console.log(`  add to .env.local →  RECRAFT_STYLE_ID=${j.id}`);
console.log(`  then:  RECRAFT_STYLE_ID=${j.id} npm run gen:recraft`);
process.exit(0);
