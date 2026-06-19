#!/usr/bin/env node
// smoke.mjs — headless browser smoke test for the studio SPA.
//
//   node test/smoke.mjs            (exit 0 = all routes clean, 1 = a failure)
//
// Boots the real studio-server.mjs on STUDIO_PORT=8098, launches Playwright
// Chromium headless, READS the route list by parsing the ROUTES array in
// tools/studio/main.mjs (never hard-coded), visits every hash route, and for
// each asserts: the #view main area renders non-empty AND zero console errors /
// pageerrors. The empty/cold exports state must NOT error. Prints a per-route
// PASS/FAIL table; always kills the server in finally.
//
// Playwright is the ONLY non-builtin import, and only here (per the brief).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.STUDIO_SMOKE_PORT || 8098);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.resolve(HERE, '..');
const NODE = process.execPath;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- parse ROUTES out of main.mjs (no hard-coding) ------------------------
//
// Each route is `{ pattern: /…/, view: x, params: … }`. We need a concrete hash
// path per pattern. We extract the regex source and, for the parameterized
// ones, substitute a known-good value. Unknown params fall back to a literal.
function parseRoutes() {
  const src = fs.readFileSync(path.join(TOOLS, 'studio', 'main.mjs'), 'utf8');
  const block = src.match(/const ROUTES = \[([\s\S]*?)\n\];/);
  if (!block) throw new Error('could not find the ROUTES array in main.mjs');
  const patterns = [...block[1].matchAll(/pattern:\s*\/(.+?)\/[a-z]*\s*,/g)].map((m) => m[1]);
  if (!patterns.length) throw new Error('parsed no route patterns from main.mjs');
  return patterns.map((p) => ({ source: p, hash: hashForPattern(p) }));
}

// Turn a route regex source into a concrete hash path. Known parameterized
// routes get real values (a real surface / a real doc handled by the bare path).
function hashForPattern(source) {
  // Anchors / slashes the studio uses: `^\/?$` → '/', `^\/social\/([^/]+)\/?$` …
  if (/\^\\\/\?\$/.test(source) || source === '^\\/?$') return '/';
  if (source.includes('social')) return '/social/posters'; // a real surface id
  if (source.includes('deck')) return '/deck';
  if (source.includes('brochures')) return '/brochures';
  if (source.includes('brand')) return '/brand';
  if (source.includes('docs')) return '/docs'; // bare → first doc (no param needed)
  if (source.includes('facts')) return '/facts';
  if (source.includes('actions')) return '/actions';
  if (source.includes('launch')) return '/launch';
  if (source.includes('instagram')) return '/instagram';
  if (source.includes('feedback')) return '/feedback';
  // Fallback: strip regex tokens to a literal-ish path.
  const lit = source.replace(/[\^$]/g, '').replace(/\\\//g, '/').replace(/\?|\(.*?\)/g, '');
  return lit.startsWith('/') ? lit : `/${lit}`;
}

// ---- server lifecycle -----------------------------------------------------

let child = null;
async function startServer() {
  child = spawn(NODE, ['studio-server.mjs'], {
    cwd: TOOLS,
    env: { ...process.env, STUDIO_PORT: String(PORT), PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  const deadline = Date.now() + 15000;
  for (;;) {
    if (child.exitCode != null) throw new Error(`server exited early (${child.exitCode})`);
    try {
      const res = await fetch(`${ORIGIN}/api/manifest`, { headers: { Host: `127.0.0.1:${PORT}` } });
      if (res.status === 200) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error('server did not become ready in 15s');
    await delay(150);
  }
}
function stopServer() {
  if (child && child.exitCode == null) child.kill('SIGKILL');
}

// ---- run ------------------------------------------------------------------

async function main() {
  const routes = parseRoutes();
  await startServer();

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const route of routes) {
      const page = await browser.newPage();
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
      });
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

      const url = `${ORIGIN}/tools/studio/#${route.hash}`;
      let nonEmpty = false;
      let detail = '';
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        // Wait for the view to leave the loading panel: #view has children and
        // is not the 'loading' cold card. The router renders synchronously after
        // refreshState resolves; poll up to ~8s.
        await page.waitForFunction(
          () => {
            const v = document.getElementById('view');
            if (!v || v.children.length === 0) return false;
            const tag = v.querySelector('.empty-tag');
            return !(tag && tag.textContent.trim() === 'loading');
          },
          { timeout: 8000 },
        );
        // Settle a beat so late console errors (image onload, etc.) surface.
        await delay(250);
        const info = await page.evaluate(() => {
          const v = document.getElementById('view');
          return { children: v ? v.children.length : 0, text: v ? v.textContent.trim().length : 0 };
        });
        nonEmpty = info.children > 0 && info.text > 0;
        detail = `${info.children} nodes, ${info.text} chars`;
      } catch (err) {
        detail = `nav/render error: ${err.message}`;
      }

      const pass = nonEmpty && errors.length === 0;
      results.push({ hash: route.hash, pass, nonEmpty, errors, detail });
      await page.close();
    }
  } finally {
    await browser.close();
    stopServer();
  }

  // ---- report ----
  const pad = (s, n) => String(s).padEnd(n);
  console.log('\nstudio smoke — per-route results');
  console.log('─'.repeat(64));
  console.log(`${pad('ROUTE', 22)}${pad('RESULT', 8)}DETAIL`);
  console.log('─'.repeat(64));
  let failed = 0;
  for (const r of results) {
    const tag = r.pass ? 'PASS' : 'FAIL';
    if (!r.pass) failed++;
    const note = r.pass ? r.detail : `${r.detail}${r.errors.length ? ' | ' + r.errors.join(' ; ') : ''}`;
    console.log(`${pad('#' + r.hash, 22)}${pad(tag, 8)}${note}`);
  }
  console.log('─'.repeat(64));
  console.log(`${results.length - failed}/${results.length} routes passed.\n`);
  return failed === 0 ? 0 : 1;
}

// Only drive the browser when run directly (node test/smoke.mjs). A test
// runner that auto-discovers and imports this file (bare `node --test`) must
// NOT boot a server or launch Chromium as an import side effect.
const isEntry = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntry) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error('smoke harness error:', err && err.stack ? err.stack : err);
      stopServer();
      process.exit(1);
    });
}
