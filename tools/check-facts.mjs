#!/usr/bin/env node
/**
 * check-facts.mjs — FACTS / brand-integrity guard.
 *
 * Fails (exit 1) if any RETIRED brand string appears in active content. This is
 * the factual-integrity analogue of the tokens/snippets drift guard in ci.yml:
 * it stops stale facts (old venue names, retired hashtags) from creeping back in
 * after a value has been finalized.
 *
 * Usage:
 *   node check-facts.mjs           # retired-string scan (CI default, no network)
 *   node check-facts.mjs --links   # ALSO HEAD-check external http(s) links (local; networked, slower)
 *
 * When a fact is finalized and propagated, add its old form to RETIRED below so
 * the old value can never silently return. Single source for live values:
 * content-studio/FACTS.md.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ROOT = join(dirname(SELF), '..'); // tools/ -> repo root

// Free-form design feedback (the comment store + its generated digest) carries
// arbitrary human instruction text — "cut the technopark line" is a legitimate
// note ABOUT a retired string, not a usage of it. Never scan these for RETIRED;
// the store is validated server-side at write time instead.
const SKIP_FILES = new Set([
  'content-studio/design-comments.json',
  'content-studio/DESIGN_FEEDBACK.md',
]);

// Never scanned: deps, generated output, legacy archive, the definitive Brand
// Book (finalized facts override it — flag, don't enforce), and agent tooling.
const SKIP_DIRS = new Set(['.git', 'node_modules', '_archive', 'exports', 'brand-book', '.claude', '.vscode']);
const TEXT_EXT = new Set(['.md', '.html', '.css', '.mjs', '.js', '.json', '.txt', '.yml', '.yaml']);

// Retired strings -> what to use instead. `bad` is a case-sensitive substring,
// or a RegExp (tested per line; use `label` for the report).
export const RETIRED = [
  { bad: 'Enterprise Solutions', use: 'UXP Innovation Hub, Trivandrum (venue finalized)' },
  { bad: /technopark/i, label: 'Technopark (any case)', use: 'Trivandrum / industry (de-emphasized everywhere)' },
  { bad: '#TechparkTrivandrum', use: '#TrivandrumTech (hashtag finalized)' },
  { bad: 'eduflick.com', use: 'eduflickai.com (correct domain)' },
  // Wrong domain as URL or email host. The IG handle @eduflick.ai (and
  // instagram.com/eduflick.ai) is CORRECT and deliberately not matched here.
  {
    bad: /(https?:\/\/(?!instagram\.com)|[A-Za-z0-9._%+-]+@)eduflick\.ai/,
    label: 'eduflick.ai (as URL/email domain)',
    use: 'eduflickai.com (correct domain; @eduflick.ai IG handle is fine)',
  },
  { bad: 'careers.eduflick.ai', use: 'eduflickai.com (correct domain)' },
  { bad: 'eduflick.ai/engineer', use: 'eduflickai.com/apply (correct domain)' },
  { bad: 'eduflickai@gmail.com', use: 'info@eduflickai.com (official email)' },
  // Masterclass retired 2026-06-11 — the funnel is apply-direct now. These guard
  // the OFFERING strings only; the generic "masterclass / hook" DESIGN ARCHETYPE
  // (a reusable poster/imagery pattern) is deliberately NOT matched (no bare word).
  { bad: /free technical masterclass/i, label: 'Free Technical Masterclass (retired offering)', use: 'apply-direct funnel: "apply — link in bio" (IG) or eduflickai.com/apply (other surfaces)' },
  { bad: /free masterclass/i, label: 'free masterclass (retired offering)', use: 'apply-direct funnel: "apply — link in bio" (IG) or eduflickai.com/apply (other surfaces)' },
  { bad: 'eduflickai.com/masterclass', use: 'eduflickai.com/apply (masterclass URL retired 2026-06-11)' },
  { bad: /register free/i, label: 'Register Free (retired masterclass CTA)', use: '"Apply →" or "apply — link in bio" on IG (masterclass CTA retired 2026-06-11)' },
];

// ---- Active-HTML integrity checks (brochures/, design-system/, index.html) ----
// Markdown is exempt from these: placeholders are policy in .md sources, but a
// [[token]] reaching rendered HTML means an unfilled value shipped.
const PLACEHOLDER = /\[\[/;
// Canon (FACTS.md) is 3 deployed projects — flag any other count next to "deployed"/"live".
const PROJECT_COUNT = /\b(?:[045-9]|four|five)\s+(?:deployed|live)\b/i;
// FACTS.md: there is NO applications-close date — any dated "applications close …" is invented.
const DEADLINE = /applications?\s+close[sd]?\s+(?:on\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s*\d{0,2}/i;

// http(s) URIs that are XML namespaces / schema refs, not real links — skip in --links.
// Also skipped: font preconnect roots (404 by design) and Wikimedia file URLs
// (parens in filenames break naive URL extraction).
const LINK_SKIP = /(?:w3\.org|purl\.org|ns\.adobe\.com|sodipodi|inkscape\.org|schemas?\.|example\.(?:com|org)|fonts\.googleapis\.com|fonts\.gstatic\.com|commons\.wikimedia\.org)/;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, files);
    } else if (
      TEXT_EXT.has(extname(name)) &&
      full !== SELF &&
      !SKIP_FILES.has(relative(ROOT, full).split(sep).join('/'))
    ) {
      files.push(full);
    }
  }
  return files;
}

// Pure per-text scan — reused by the file walk below and by the studio server
// (POST /api/facts/check) so there is a single pattern source, no drift.
export function scanTextRetired(text) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    for (const { bad, label, use } of RETIRED) {
      const hit = bad instanceof RegExp ? bad.test(line) : line.includes(bad);
      if (hit) {
        hits.push({ line: i + 1, bad: label || String(bad), use });
      }
    }
  });
  return hits;
}

function scanRetired(files) {
  const hits = [];
  for (const file of files) {
    for (const h of scanTextRetired(readFileSync(file, 'utf8'))) {
      hits.push({ file: relative(ROOT, file), ...h });
    }
  }
  return hits;
}

// Active HTML = rendered surfaces where FACTS must hold (not .md sources).
function activeHtml(files) {
  return files.filter((f) => {
    if (extname(f) !== '.html') return false;
    const rel = relative(ROOT, f);
    return rel === 'index.html' || rel.startsWith('brochures/') || rel.startsWith('design-system/');
  });
}

function scanPattern(files, re) {
  const hits = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const m = line.match(re);
      if (m) hits.push({ file: relative(ROOT, file), line: i + 1, match: m[0] });
    });
  }
  return hits;
}

function extractLinks(files) {
  const urls = new Map(); // url -> first "file:line"
  // `$ { }` and backtick excluded so template-literal URLs don't produce junk.
  const re = /https?:\/\/[^\s)"'<>\]{}$`]+/g;
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(re)) {
        const url = m[0].replace(/[.,;:]+$/, '');
        if (LINK_SKIP.test(url)) continue;
        if (!urls.has(url)) urls.set(url, `${relative(ROOT, file)}:${i + 1}`);
      }
    });
  }
  return urls;
}

async function checkLinks(urls) {
  const dead = [];
  for (const [url, where] of urls) {
    try {
      const ctrl = AbortSignal.timeout(10000);
      let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl });
      if (res.status === 405 || res.status === 403) {
        res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(10000) });
      }
      if (res.status >= 400) dead.push({ url, where, status: res.status });
    } catch (err) {
      dead.push({ url, where, status: err.name === 'TimeoutError' ? 'timeout' : 'unreachable' });
    }
  }
  return dead;
}

// ---- CLI (skipped when imported as a module, e.g. by the studio server) ----
const IS_CLI = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (IS_CLI) {
const files = walk(ROOT);
let failed = false;

const hits = scanRetired(files);
if (hits.length) {
  failed = true;
  console.error(`✗ Retired brand strings found (${hits.length}):`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  "${h.bad}"  -> use ${h.use}`);
} else {
  console.log(`✓ No retired brand strings in ${files.length} scanned files.`);
}

const html = activeHtml(files);

const placeholders = scanPattern(html, PLACEHOLDER);
if (placeholders.length) {
  failed = true;
  console.error(`✗ Unresolved [[placeholders]] in active HTML (${placeholders.length}):`);
  for (const h of placeholders) console.error(`  ${h.file}:${h.line}  "${h.match}"  -> fill the value (FACTS.md) before shipping`);
} else {
  console.log(`✓ No [[placeholder]] leakage in ${html.length} active HTML files.`);
}

const counts = scanPattern(html, PROJECT_COUNT);
if (counts.length) {
  failed = true;
  console.error(`✗ Wrong project count in active HTML (${counts.length}) — canon is 3 deployed:`);
  for (const h of counts) console.error(`  ${h.file}:${h.line}  "${h.match}"  -> use "3 deployed" (FACTS.md)`);
} else {
  console.log(`✓ No wrong project counts in ${html.length} active HTML files.`);
}

const deadlines = scanPattern(html, DEADLINE);
if (deadlines.length) {
  failed = true;
  console.error(`✗ Invented application deadlines in active HTML (${deadlines.length}) — FACTS: no close date:`);
  for (const h of deadlines) console.error(`  ${h.file}:${h.line}  "${h.match}"  -> remove the date (FACTS.md: no close date)`);
} else {
  console.log(`✓ No invented application deadlines in ${html.length} active HTML files.`);
}

if (process.argv.includes('--links')) {
  const urls = extractLinks(files);
  console.log(`… Checking ${urls.size} external links (HEAD)…`);
  const dead = await checkLinks(urls);
  if (dead.length) {
    failed = true;
    console.error(`✗ Dead/unreachable external links (${dead.length}):`);
    for (const d of dead) console.error(`  [${d.status}] ${d.url}  (${d.where})`);
  } else {
    console.log(`✓ All ${urls.size} external links resolve.`);
  }
}

process.exit(failed ? 1 : 0);
}
