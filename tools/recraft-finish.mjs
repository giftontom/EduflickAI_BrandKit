// Eduflick AI — Recraft finishing steps (cheap, deterministic post-processing).
//   upscale → crispUpscale    (sharpen/enlarge without inventing detail/hue; ~$0.004)
//   nobg    → removeBackground (cut out a subject for a badge/icon; ~$0.01)
// AVOID Recraft creativeUpscale — it invents content + hue and breaks the monochrome.
//
//   cd tools
//   node --env-file-if-exists=../.env.local recraft-finish.mjs upscale in.png [out.png]
//   node --env-file-if-exists=../.env.local recraft-finish.mjs nobg    icon.png [out.png]
//
// Reads RECRAFT_API_KEY. Output defaults to <name>.<mode>.png next to the input.

import fs from 'node:fs';
import path from 'node:path';

const KEY  = process.env.RECRAFT_API_KEY;
const BASE = 'https://external.api.recraft.ai/v1';
const ENDPOINTS = { upscale: 'crispUpscale', nobg: 'removeBackground' };

const [, , mode, inFile, outArg] = process.argv;
if (!KEY) {
  console.error('RECRAFT_API_KEY not set — run with: node --env-file-if-exists=../.env.local recraft-finish.mjs ...');
  process.exit(1);
}
if (!ENDPOINTS[mode] || !inFile || !fs.existsSync(inFile)) {
  console.error('usage: node recraft-finish.mjs <upscale|nobg> <in.(png|jpg)> [out.png]');
  process.exit(1);
}

const p = path.parse(inFile);
const out = outArg || path.join(p.dir, `${p.name}.${mode}.png`);
if (path.resolve(out) === path.resolve(inFile)) {
  console.error('refusing to overwrite the input — pass an explicit output path');
  process.exit(1);
}

const fd = new FormData();
fd.append('file', new Blob([fs.readFileSync(inFile)]), p.base);
fd.append('response_format', 'b64_json');

const res = await fetch(`${BASE}/images/${ENDPOINTS[mode]}`, {
  method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd,
});
const txt = await res.text();
if (!res.ok) {
  console.error(`${ENDPOINTS[mode]} failed: HTTP ${res.status}: ${txt.replace(/\s+/g, ' ').slice(0, 200)}`);
  process.exit(1);
}

// Response may be {image:{b64_json|url}} or {data:[{...}]} depending on endpoint — handle both.
const j = JSON.parse(txt);
const node = j?.image || j?.data?.[0] || j;
let buf;
if (node?.b64_json) buf = Buffer.from(node.b64_json, 'base64');
else if (node?.url) buf = Buffer.from(await (await fetch(node.url)).arrayBuffer());
else { console.error('unexpected response:', txt.slice(0, 200)); process.exit(1); }

fs.writeFileSync(out, buf);
console.log(`✓ ${mode} → ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
process.exit(0);
