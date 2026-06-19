// Eduflick AI — licensed-stock fetcher (sources for the photoreal poster backdrops)
// Downloads real-life source photos into tools/stock-sources/ and records their
// provenance (URL · author · license) in
// ../design-system/collateral/assets/backdrops/SOURCES.md.
//
// The photos are only the RAW source — treat-stock.mjs forces them on-brand
// (indigo duotone). Raw sources are gitignored; we commit the treated derivative.
//
//   cd tools
//   HARVEST=10 npm run fetch:stock               # download 10 candidates/poster to eyeball first
//   PICK_program=3 PICK_masterclass=2 npm run fetch:stock   # then pick the best by index
//   npm run fetch:stock                          # keyless: Wikimedia Commons (CC, downloadable)
//   PEXELS_API_KEY=… npm run fetch:stock         # preferred: Pexels (modern, free commercial use)
//
// Taste over automation: if every candidate is generic stock cheese, just drop your own
// hand-picked file in tools/stock-sources/<name>.jpg and run `npm run treat:stock`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR    = path.resolve(__dirname, 'stock-sources');
const SOURCES_MD = path.resolve(__dirname, '../design-system/collateral/assets/backdrops/SOURCES.md');
const UA     = 'EduflickAI-BrandKit/1.0 (https://eduflickai.com; info@eduflickai.com)';
const PEXELS = process.env.PEXELS_API_KEY;

fs.mkdirSync(SRC_DIR, { recursive: true });

// Which posters get a real photo, and what to search for (candid, modern, build-focused —
// queries are tried in order until one returns usable candidates).
// Subjects chosen to DUOTONE into something premium: high-contrast, dramatic light,
// simple composition (a dev at monitors in the dark, hands on a backlit keyboard) rather
// than flat fluorescent group photos that read amateur no matter the treatment.
const JOBS = [
  { name: 'program', subject: 'engineer building — dramatic, real, in-the-room',
    queries: ['programmer dark room monitors', 'developer working night computer',
              'coding workspace dark', 'software developer office desk',
              'server room data center', 'computer screen glow dark'] },
  { name: 'masterclass', subject: 'hands building live — cinematic close-up',
    queries: ['hands typing keyboard closeup', 'laptop dark coding night',
              'programmer hands keyboard', 'backlit mechanical keyboard',
              'typing computer dramatic light'] },

  // evergreen IG feed posts (duotone-friendly: code / screens / dramatic light)
  { name: 'ig-hook', subject: 'a developer at monitors in the dark',
    queries: ['programmer dark room monitors', 'developer working night computer', 'coding screen glow dark'] },
  { name: 'ig-myth', subject: 'someone at a laptop, late, focused',
    queries: ['person laptop dark desk', 'working laptop night', 'laptop screen dark room'] },
  { name: 'ig-rag', subject: 'source code on a screen',
    queries: ['source code computer screen', 'programming code monitor', 'code editor dark'] },
  { name: 'ig-stack', subject: 'a developer workspace / multiple monitors',
    queries: ['multiple monitors developer', 'software workspace desk dark', 'code editor screen dark'] },
  { name: 'ig-hired', subject: 'a professional office / meeting moment',
    queries: ['business meeting office', 'office handshake professional', 'people working office dark'] },
];

const stripHtml  = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const portraitness = (w, h) => Math.abs(w / h - 0.8);      // 4:5 ≈ 0.8 → smaller is better

// ── providers: each returns an array of {imgUrl,page,author,source,license,w,h} ──
async function searchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&size=large&per_page=8`;
  const res = await fetch(url, { headers: { Authorization: PEXELS } });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  return ((await res.json()).photos || []).map(p => ({
    imgUrl: p.src?.large2x || p.src?.original, page: p.url, author: p.photographer,
    source: 'Pexels', license: 'Pexels License (free commercial use, attribution optional)',
    w: p.width, h: p.height,
  }));
}

async function searchCommons(query) {
  // Keyless + reliably downloadable (Special:FilePath thumbnails). Wikimedia Commons has
  // good modern event/coding photos when queried for them (e.g. "hackathon").
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`, gsrnamespace: '6', gsrlimit: '24',
    prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '1600',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons HTTP ${res.status}`);
  const pages = Object.values((await res.json()).query?.pages || {});
  return pages.map(pg => pg.imageinfo?.[0]).filter(Boolean)
    .filter(ii => ii.mime === 'image/jpeg' && ii.width >= 1200 && ii.height >= 900)
    .map(ii => {
      const em = ii.extmetadata || {};
      return { imgUrl: ii.thumburl || ii.url, page: ii.descriptionurl,
               author: stripHtml(em.Artist?.value) || 'Unknown', source: 'Wikimedia Commons',
               license: stripHtml(em.LicenseShortName?.value) || 'see Commons page',
               w: ii.width, h: ii.height };
    });
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function candidatesFor(job) {
  const search = PEXELS ? searchPexels : searchCommons;
  const seen = new Set(); const all = [];
  for (const q of job.queries) {
    try {
      const hits = (await search(q)).filter(h => (h.w || 1200) >= 1000);
      let taken = 0;
      for (const h of hits) {                       // a few per query → variety, deduped
        if (seen.has(h.imgUrl)) continue;
        seen.add(h.imgUrl); all.push({ ...h, q });
        if (++taken >= 4) break;
      }
    } catch (e) { console.error(`    · "${q}" → ${e.message}`); }
  }
  all.sort((a, b) => portraitness(a.w || 1080, a.h || 1350) - portraitness(b.w || 1080, b.h || 1350));
  return all;
}

console.log(`Fetching ${JOBS.length} source photos · provider: ${PEXELS ? 'Pexels' : 'Wikimedia Commons (keyless)'}\n→ ${SRC_DIR}\n`);

const HARVEST = Number(process.env.HARVEST || 0);   // >0 → download N candidates to eyeball, then pick
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const jobs = ONLY.length ? JOBS.filter(j => ONLY.includes(j.name)) : JOBS;

const records = [];
let fail = 0;
for (const job of jobs) {
  console.log(`• ${job.name} — ${job.subject}`);
  const cands = await candidatesFor(job);
  if (!cands.length) { fail++; console.error(`  ✗ no candidates for ${job.name}`); continue; }

  if (HARVEST) {
    const dir = path.join(SRC_DIR, '_candidates', job.name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const n = Math.min(HARVEST, cands.length);
    console.log(`  harvesting ${n} candidates → stock-sources/_candidates/${job.name}/`);
    for (let i = 0; i < n; i++) {
      const h = cands[i], f = path.join(dir, String(i + 1).padStart(2, '0') + '.jpg');
      try { await download(h.imgUrl, f); console.log(`    ${String(i + 1).padStart(2)}. ${h.w}×${h.h} — ${stripHtml(h.author)} [${h.license}] · "${h.q}"`); }
      catch (e) { console.log(`    ${i + 1}. ✗ ${e.message}`); }
    }
    continue;   // harvest only — no <name>.jpg, no provenance
  }

  const pick = Math.max(1, Number(process.env[`PICK_${job.name}`] || 1));
  const hit = cands[pick - 1] || cands[0];
  const dest = path.join(SRC_DIR, `${job.name}.jpg`);
  try {
    const kb = (await download(hit.imgUrl, dest) / 1024).toFixed(0);
    console.log(`  ✓ ${job.name}.jpg (${kb} KB) [pick ${pick}/${cands.length}] — ${hit.source}: ${stripHtml(hit.author)} [${hit.license}] · "${hit.q}"`);
    records.push({ name: job.name, ...hit, author: stripHtml(hit.author) });
  } catch (e) { fail++; console.error(`  ✗ ${job.name}: ${e.message}`); }
}

// provenance record (committed) — the treated PNG is the derivative we ship.
// On a filtered (ONLY=…) run we skip the full rewrite to preserve existing rows; capture from the log.
if (records.length && !ONLY.length) {
  const rows = records.map(r =>
    `| \`poster-${r.name}.png\` | ${r.source} | ${r.author} | ${r.license} | ${r.page} |`).join('\n');
  fs.writeFileSync(SOURCES_MD, `# Backdrop image sources

The photoreal poster backdrops are real photographs run through the Eduflick indigo
**duotone** treatment (\`tools/treat-stock.mjs\`). This file records the provenance of each
source. Raw sources live in \`tools/stock-sources/\` (gitignored); the committed
\`*.png\` here is the treated, on-brand derivative.

> \`poster-seats.png\` is **not** listed — it is an abstract procedural backdrop
> (\`tools/gen-backdrops-proc.mjs\`), not a photograph.

| Backdrop | Source | Author | License | Page |
| --- | --- | --- | --- | --- |
${rows}

*Pexels and the CC licenses on Wikimedia Commons permit commercial use. CC-BY / CC-BY-SA
sources require attribution — keep this file with the assets. Regenerate with
\`npm run fetch:stock\`.*
`);
  console.log(`\n  ✓ provenance → ${path.relative(path.resolve(__dirname, '..'), SOURCES_MD)}`);
}

console.log(`\nDone — ${records.length}/${JOBS.length} fetched.${fail ? ' Review the misses above.' : ''}`);
console.log('Next: look at tools/stock-sources/*.jpg, then `npm run treat:stock`.');
process.exit(fail && !records.length ? 1 : 0);
