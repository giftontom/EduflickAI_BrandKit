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
import { join, extname, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ROOT = join(dirname(SELF), '..'); // tools/ -> repo root

// Never scanned: deps, generated output, legacy archive, the definitive Brand
// Book (finalized facts override it — flag, don't enforce), and agent tooling.
const SKIP_DIRS = new Set(['.git', 'node_modules', '_archive', 'exports', 'brand-book', '.claude', '.vscode']);
const TEXT_EXT = new Set(['.md', '.html', '.css', '.mjs', '.js', '.json', '.txt', '.yml', '.yaml']);

// Retired strings (case-sensitive substring) -> what to use instead.
const RETIRED = [
  { bad: 'Enterprise Solutions', use: 'UXP Innovation Hub, Trivandrum (venue finalized)' },
  { bad: 'Technopark', use: 'Trivandrum / industry (de-emphasized everywhere)' },
  { bad: '#TechparkTrivandrum', use: '#TrivandrumTech (hashtag finalized)' },
  { bad: 'eduflick.com', use: 'eduflickai.com (correct domain)' },
];

// http(s) URIs that are XML namespaces / schema refs, not real links — skip in --links.
const LINK_SKIP = /(?:w3\.org|purl\.org|ns\.adobe\.com|sodipodi|inkscape\.org|schemas?\.|example\.(?:com|org))/;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, files);
    } else if (TEXT_EXT.has(extname(name)) && full !== SELF) {
      files.push(full);
    }
  }
  return files;
}

function scanRetired(files) {
  const hits = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const { bad, use } of RETIRED) {
        if (line.includes(bad)) {
          hits.push({ file: relative(ROOT, file), line: i + 1, bad, use });
        }
      }
    });
  }
  return hits;
}

function extractLinks(files) {
  const urls = new Map(); // url -> first "file:line"
  const re = /https?:\/\/[^\s)"'<>\]}]+/g;
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
