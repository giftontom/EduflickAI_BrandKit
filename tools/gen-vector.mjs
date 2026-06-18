// Eduflick AI — native-vector generator (Recraft recraftv3_vector → true editable SVG).
// For GENERIC brand ICONS / GLYPHS / spot motifs only. NEVER regenerate the brand MARK
// (the square feed-card + triangular notch) or any logo/lockup — their canonical geometry
// lives in tokens.json / assets/logo/mark.svg; use those files, never this generator
// (a brand-mark/logo concept is hard-rejected below).
// Output is real <path> SVG (editable in Figma/code), palette pinned via `controls`.
// Text is never generated; marks are pure shape.
//
//   cd tools
//   node --env-file-if-exists=../.env.local gen-vector.mjs                       # default brand glyph set
//   node --env-file-if-exists=../.env.local gen-vector.mjs "node:upward arrow of connected nodes"
//   OUT=/tmp/v node --env-file-if-exists=../.env.local gen-vector.mjs            # scratch dir
//
// Concepts are "slug:description" or just "description" (a slug is derived). Reads
// RECRAFT_API_KEY (required) and optional RECRAFT_VECTOR_STYLE from the environment.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECRAFT_COLORS as COLORS, RECRAFT_BG as BG } from './providers/recraft.mjs';   // one source for brand RGBs

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY  = process.env.RECRAFT_API_KEY;
const BASE = 'https://external.api.recraft.ai/v1';
const STYLE = process.env.RECRAFT_VECTOR_STYLE || 'vector_illustration';
const OUT  = process.env.OUT
  ? path.resolve(process.env.OUT)
  : path.resolve(__dirname, '../design-system/collateral/assets/vectors');

if (!KEY) {
  console.error('RECRAFT_API_KEY not set — run with:  node --env-file-if-exists=../.env.local gen-vector.mjs');
  process.exit(1);
}

const LEAD ='Minimal flat geometric brand icon, deep indigo monochrome, a single clean centred mark, crisp simple vector shapes, generous padding, no text, no letters, no numbers.';
const MAX_PROMPT = 1000;

// "slug:description" → {slug, desc}; bare "description" → slug derived from the first words.
const DEFAULT_CONCEPTS = [
  'growth-node:an upward growth arrow built from a few connected circular nodes',
  'stack:a clean stack of three offset rounded layers (a full-stack motif)',
  'spark:a compact four-point spark / star burst, minimal',
  'network:a small symmetric cluster of circular nodes joined by thin lines',
];

const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// Hard guardrail: never (re)generate the owned brand mark / logo via AI.
const FORBIDDEN = /\b(notch|feed[- ]?card|brand[- ]?mark|wordmark|logo|lockup)\b/i;

const args = process.argv.slice(2);
const concepts = (args.length ? args : DEFAULT_CONCEPTS).map((c, idx) => {
  const i = c.indexOf(':');
  let slug, desc;
  if (i > 0 && i < 24 && !c.slice(0, i).includes(' ') && clean(c.slice(0, i))) {
    slug = clean(c.slice(0, i)); desc = c.slice(i + 1).trim();      // explicit "slug:description"
  } else {
    desc = c.trim(); slug = clean(c).split('-').slice(0, 3).join('-');
  }
  return { slug: slug || `icon-${idx + 1}`, desc };
});

const blocked = concepts.filter((c) => FORBIDDEN.test(c.desc));
if (blocked.length) {
  console.error('Refusing to AI-generate the brand mark / logo — use tokens.json / assets/logo/mark.svg instead:');
  for (const b of blocked) console.error(`  ✗ "${b.desc}"`);
  process.exit(1);
}

// Deduplicate slugs so colliding concepts don't silently overwrite each other's paid output.
const seen = new Map();
for (const c of concepts) {
  const n = seen.get(c.slug) || 0;
  seen.set(c.slug, n + 1);
  if (n) c.slug = `${c.slug}-${n + 1}`;
}

fs.mkdirSync(OUT, { recursive: true });

async function genVector({ slug, desc }) {
  const prompt = [LEAD, desc].join(' ').slice(0, MAX_PROMPT);
  const body = {
    model: 'recraftv3_vector',
    prompt,
    style: STYLE,
    size: '1024x1024',
    response_format: 'b64_json',
    controls: { colors: COLORS, background_color: BG, no_text: true },
  };
  try {
    const res = await fetch(`${BASE}/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const txt = await res.text();
    if (!res.ok) { console.log(`  ✗ ${slug}: HTTP ${res.status}: ${txt.replace(/\s+/g, ' ').slice(0, 160)}`); return false; }
    const b64 = JSON.parse(txt)?.data?.[0]?.b64_json;
    if (!b64) { console.log(`  ✗ ${slug}: no image in response`); return false; }
    const svg = Buffer.from(b64, 'base64').toString('utf8');   // recraftv3_vector returns SVG
    if (!svg.includes('<svg')) { console.log(`  ✗ ${slug}: response was not SVG`); return false; }
    const file = path.join(OUT, slug + '.svg');
    fs.writeFileSync(file, svg);
    console.log(`  ✓ ${slug}.svg  (${(svg.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (e) { console.log(`  ✗ ${slug}: ${e.message}`); return false; }
}

console.log(`Vectors → ${OUT}`);
console.log(`Concepts: ${concepts.map((c) => c.slug).join(', ')}\n`);
let ok = 0;
for (const c of concepts) if (await genVector(c)) ok++;
console.log(`\nDone — ${ok}/${concepts.length} vector(s).`);
process.exit(ok ? 0 : 1);
