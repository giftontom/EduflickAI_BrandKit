// brand-config.test.mjs — proves the brand.config.json refactor (Phase 3a).
//
// The studio's brand-specific knowledge — the run-action whitelist, the manifest
// SURFACE data, the brand-specific paths, and the check-facts RETIRED list — was
// extracted from hardcoded structures in tools/studio-server.mjs +
// tools/check-facts.mjs into ONE declarative profile at the repo root,
// brand.config.json. This file is the regression net for that move. It asserts
// three contracts:
//
//   1. DEFAULT-IDENTICAL — with the REAL brand.config.json present (holding
//      today's Eduflick values), the live server's manifest surfaces + brand and
//      its /api/actions shape match the expected current shapes; the whitelist
//      still rejects an unknown action (400) and accepts a known one (200); and
//      the server's retired-string scanner still catches a retired string built
//      AT RUNTIME from check-facts.mjs (never a hard-coded literal). This is the
//      IRONCLAD invariant: config-present behaviour == today's behaviour.
//
//   2. CONFIG-DRIVEN — in a throwaway REPO sandbox we write a brand.config.json
//      VARIANT (a fake action + a fake retired string added). Both consumers pick
//      it up: the server whitelists the fake action (200) and its scanner catches
//      the fake retired string; the check-facts.mjs CLI, run from the sandbox,
//      flags a file containing the fake string. This proves the config actually
//      DRIVES behaviour rather than the hardcoded fallback shadowing it.
//
//   3. FALLBACK — in a repo sandbox with brand.config.json ABSENT (and, in a
//      second boot, MALFORMED) the server still boots and serves a sane manifest,
//      the whitelist falls back to the hardcoded actions, and the check-facts.mjs
//      CLI still catches a HARDCODED retired string. No crash, no behaviour loss.
//
// SANDBOXING: every server boot points STUDIO_CONTENT_DIR at a throwaway COPY of
// content-studio (makeContentSandbox) so no content write touches the user's LIVE
// files. The REPO sandboxes (contracts 2 + 3) live entirely under os.tmpdir() —
// they copy only the node:*-only runtime (studio-server.mjs, check-facts.mjs,
// lib/, a minimal package.json) into a temp tree whose ROOT carries the variant /
// absent / malformed config, so the config-resolution (ROOT/brand.config.json,
// derived from each module's own import.meta.url) reads the sandbox config — the
// REAL repo's brand.config.json is never moved, renamed, or written. Nothing here
// mutates git state.
//
// node:test + node:assert + node:* builtins only (no npm packages, G1).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';

import { RETIRED, scanTextRetired } from '../check-facts.mjs';
import {
  setPort,
  api,
  apiJSON,
  delay,
  ROOT,
  TOOLS,
  startServer,
  stopServer,
  makeContentSandbox,
  removeContentSandbox,
} from './helpers.mjs';

// This file owns port 8088 for the DEFAULT-IDENTICAL (real-ROOT) boot so node:test
// can run the suite files concurrently without a bind collision. The repo-sandbox
// boots use their own one-off ports (8089 / 8091), independent of the singleton.
setPort(8088);

const NODE = process.execPath; // exact node (avoids nvm shims), like helpers.mjs

// A retired string built AT RUNTIME from the first literal-substring rule, so no
// banned marketing literal ever appears in this source file (the facts CI scans
// the repo). Asserted below to actually trip the scanner before any test uses it.
const firstLiteral = RETIRED.find((r) => typeof r.bad === 'string').bad;
const RETIRED_TEXT = `brand-config test marker ${firstLiteral} end`;

// A fake retired string + fake action that exist ONLY in the contract-2 variant
// config. They are deliberately NOT real marketing strings and NOT in the
// hardcoded fallback, so catching/whitelisting them can ONLY come from the config.
const FAKE_RETIRED = 'zzz-fake-retired-brandkit-token-9f3a';
const FAKE_ACTION = 'fake:config:action:9f3a';

const REAL_CONFIG_PATH = path.join(ROOT, 'brand.config.json');

let sandbox; // throwaway content-studio copy shared by all boots in this file
let realConfigBytesBefore; // proves this file never WRITES the real config

before(() => {
  realConfigBytesBefore = fs.existsSync(REAL_CONFIG_PATH)
    ? fs.readFileSync(REAL_CONFIG_PATH)
    : null;
  sandbox = makeContentSandbox();
  assert.ok(
    scanTextRetired(RETIRED_TEXT).length > 0,
    'runtime retired string must trip the scanner (sanity)',
  );
  // The fake token must NOT be caught by the real/hardcoded RETIRED — otherwise
  // contract 2 could pass for the wrong reason.
  assert.equal(
    scanTextRetired(FAKE_RETIRED).length,
    0,
    'the fake retired token must be inert against the real config (else contract 2 is meaningless)',
  );
});

after(() => {
  removeContentSandbox(sandbox);
});

// ------------------------------------------------------------- repo sandbox kit
//
// Build a minimal temp REPO whose tools/ holds the node:*-only runtime and whose
// ROOT carries the given brand.config.json contents (or none). Returns the repo
// ROOT path; the server is spawned from <root>/tools so its ROOT === <root>.

function makeRepoSandbox({ config } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-repo-'));
  const toolsDir = path.join(root, 'tools');
  fs.mkdirSync(toolsDir, { recursive: true });

  // The only files the server + check-facts import at runtime (all node:*-only).
  fs.copyFileSync(path.join(TOOLS, 'studio-server.mjs'), path.join(toolsDir, 'studio-server.mjs'));
  fs.copyFileSync(path.join(TOOLS, 'check-facts.mjs'), path.join(toolsDir, 'check-facts.mjs'));
  fs.cpSync(path.join(TOOLS, 'lib'), path.join(toolsDir, 'lib'), { recursive: true });

  // A minimal package.json so `npm run <action>` (the action runner's spawn) has a
  // target. check:facts runs the copied guard; the fake action is a harmless no-op
  // so the spawn that follows a 200 whitelist hit never errors noisily.
  const pkg = {
    name: 'studio-repo-sandbox',
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      'check:facts': 'node check-facts.mjs',
      [FAKE_ACTION]: 'node -e ""',
    },
  };
  fs.writeFileSync(path.join(toolsDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  if (config !== undefined) {
    // `config` is a string written verbatim (lets us test malformed JSON too).
    fs.writeFileSync(path.join(root, 'brand.config.json'), config);
  }
  return root;
}

function removeRepoSandbox(root) {
  if (!root) return;
  try {
    fs.rmSync(root, { recursive: true, force: true });
  } catch {
    /* already gone */
  }
}

// Spawn an isolated server from a SANDBOX repo on its own port, polling that
// port's manifest until ready. Independent of the helpers.mjs singleton. Returns
// { origin, get, postJSON, stop }.
async function spawnRepoServer(port, repoRoot, { contentDir } = {}) {
  const env = { ...process.env, STUDIO_PORT: String(port), PORT: String(port) };
  if (contentDir) env.STUDIO_CONTENT_DIR = contentDir;
  const child = spawn(NODE, ['studio-server.mjs'], {
    cwd: path.join(repoRoot, 'tools'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.unref?.();
  let stderr = '';
  child.stdout.on('data', () => {});
  child.stderr.on('data', (d) => (stderr += d.toString('utf8')));

  const origin = `http://127.0.0.1:${port}`;
  const get = (p) => fetch(`${origin}${p}`, { headers: { Origin: origin } });
  const postJSON = (p, body) =>
    fetch(`${origin}${p}`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const deadline = Date.now() + 15000;
  for (;;) {
    if (child.exitCode != null) {
      throw new Error(`sandbox server exited early (code ${child.exitCode})\n${stderr}`);
    }
    try {
      const res = await get('/api/manifest');
      if (res.status === 200) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error(`sandbox server not ready within 15s\n${stderr}`);
    await delay(150);
  }
  return {
    origin,
    get,
    postJSON,
    stderr: () => stderr,
    async stop() {
      await new Promise((resolve) => {
        const hardKill = setTimeout(() => {
          if (child.exitCode == null) child.kill('SIGKILL');
        }, 3000);
        child.once('close', () => {
          clearTimeout(hardKill);
          resolve();
        });
        child.kill('SIGTERM');
      });
    },
  };
}

// Drain an action run's SSE stream to its exit event so the run finishes and
// `running` clears before the next assertion / teardown. Best-effort.
async function drainRun(getFn, runId) {
  let res;
  try {
    res = await getFn(`/api/actions/${runId}/stream`);
  } catch {
    return;
  }
  if (!res.ok || !res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const deadline = Date.now() + 30000;
  for (;;) {
    if (Date.now() > deadline) break;
    let chunk;
    try {
      chunk = await reader.read();
    } catch {
      break;
    }
    if (chunk.value) buf += decoder.decode(chunk.value, { stream: true });
    if (buf.includes('event: exit')) break;
    if (chunk.done) break;
  }
  try {
    await reader.cancel();
  } catch {
    /* already closing */
  }
}

// The surface DATA shape every surfaces[] entry must carry post-refactor — the
// fields buildSurfaces reads from the config/fallback (id/label/source/exportDir/
// script/aspect) plus the in-code-derived `items` array. `enumerate` is a build
// input, not echoed onto the output object.
const SURFACE_KEYS = ['id', 'label', 'source', 'exportDir', 'script', 'aspect', 'items'];
// The brand block buildBrand() returns — UNCHANGED by the refactor (identity in
// the config is intentionally NOT exposed in the manifest; the invariant is
// byte-identical-to-today).
const BRAND_KEYS = ['logos', 'partners', 'tokensFlat'];

// ============================================================================
// CONTRACT 1 — DEFAULT-IDENTICAL (real ROOT, real brand.config.json present)
// ============================================================================

test('default-identical: the REAL brand.config.json is present at the repo root', () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, 'brand.config.json')),
    'this contract requires the real brand.config.json to be present',
  );
});

test('default-identical: server boots with the real config and serves the expected manifest shape', async () => {
  await startServer({ contentDir: sandbox });
  try {
    const { status, body } = await apiJSON('/api/manifest');
    assert.equal(status, 200);

    // Top-level shape unchanged.
    for (const k of ['generatedAt', 'surfaces', 'documents', 'docs', 'brand', 'comments']) {
      assert.ok(k in body, `manifest missing key: ${k}`);
    }

    // surfaces: the exact current set of ids, each with the current field shape.
    assert.ok(Array.isArray(body.surfaces) && body.surfaces.length, 'surfaces is a non-empty array');
    const ids = body.surfaces.map((s) => s.id);
    assert.deepEqual(
      ids,
      ['instagram', 'posters', 'stories', 'deck', 'launch-grid'],
      'surface ids + order must match today',
    );
    for (const s of body.surfaces) {
      assert.deepEqual(
        Object.keys(s).sort(),
        [...SURFACE_KEYS].sort(),
        `surface ${s.id} must carry exactly the current fields`,
      );
      assert.ok(Array.isArray(s.items), `surface ${s.id}.items is an array`);
    }
    // The config's surface DATA must be reflected verbatim for known fields.
    const deck = body.surfaces.find((s) => s.id === 'deck');
    assert.equal(deck.source, 'brochures/Eduflick_Full_Stack_AI_Engineer_Program_Deck.html');
    assert.equal(deck.script, 'export:slides');
    assert.equal(deck.aspect, '1920x1080');

    // brand: UNCHANGED shape (identity intentionally not surfaced).
    assert.deepEqual(
      Object.keys(body.brand).sort(),
      [...BRAND_KEYS].sort(),
      'brand block shape must be byte-identical to today (no identity leakage)',
    );
    assert.equal(body.brand.tokensFlat, 'design-system/tokens/tokens.flat.json');
    assert.ok(Array.isArray(body.brand.logos));
    assert.ok(Array.isArray(body.brand.partners));
  } finally {
    await stopServer();
  }
});

test('default-identical: GET /api/actions shape + whitelist rejects unknown / accepts known', async () => {
  await startServer({ contentDir: sandbox });
  try {
    // /api/actions reports {running, lastRun} (the list itself is server-internal).
    const actions = await apiJSON('/api/actions');
    assert.equal(actions.status, 200);
    assert.ok('running' in actions.body, '/api/actions carries `running`');
    assert.ok('lastRun' in actions.body, '/api/actions carries `lastRun`');

    // Unknown action → 400 (whitelist membership unchanged).
    const unknown = await apiJSON('/api/actions/run', { json: { action: 'rm-rf-everything' } });
    assert.equal(unknown.status, 400, JSON.stringify(unknown.body));

    // A known action from the config (check:facts is the safe one used elsewhere)
    // → 200 with a run id. Drain it so `running` clears before teardown.
    const known = await apiJSON('/api/actions/run', { json: { action: 'check:facts' } });
    assert.equal(known.status, 200, JSON.stringify(known.body));
    assert.ok(known.body.id, 'a known action returns a run id');
    await drainRun((p) => api(p), known.body.id);
  } finally {
    await stopServer();
  }
});

test('default-identical: the server scanner catches a retired string (built at runtime from config-derived RETIRED)', async () => {
  await startServer({ contentDir: sandbox });
  try {
    // POST /api/facts/check runs scanTextRetired, whose RETIRED is now loaded from
    // brand.config.json. The violating text is built at runtime from the imported
    // RETIRED list — never a hard-coded literal.
    const { status, body } = await apiJSON('/api/facts/check', { json: { content: RETIRED_TEXT } });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.violations) && body.violations.length > 0, 'a retired string is caught');
    // The clean inverse: an innocuous string is NOT flagged.
    const clean = await apiJSON('/api/facts/check', { json: { content: 'a perfectly fine sentence' } });
    assert.equal(clean.status, 200);
    assert.deepEqual(clean.body.violations, [], 'a clean string produces no violations');
  } finally {
    await stopServer();
  }
});

// ============================================================================
// CONTRACT 2 — CONFIG-DRIVEN (variant config in a repo sandbox actually drives)
// ============================================================================

test('config-driven: a variant brand.config.json drives the whitelist AND the retired scanner', async () => {
  // Variant = the real config + a fake action + a fake retired string. Built by
  // reading the real config and extending it (so it stays a valid full profile).
  const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.config.json'), 'utf8'));
  const variant = {
    ...real,
    actions: [...real.actions, FAKE_ACTION],
    facts: {
      ...real.facts,
      retiredStrings: [
        ...real.facts.retiredStrings,
        { bad: FAKE_RETIRED, use: 'use the approved phrasing (fake test rule)' },
      ],
    },
  };
  const repo = makeRepoSandbox({ config: JSON.stringify(variant, null, 2) + '\n' });
  let srv;
  try {
    srv = await spawnRepoServer(8089, repo, { contentDir: sandbox });

    // (a) The fake action is now whitelisted (200) — proving config.actions drives
    //     the set, not the hardcoded ACTIONS.
    const fake = await srv
      .postJSON('/api/actions/run', { action: FAKE_ACTION })
      .then((r) => r.json().then((b) => ({ status: r.status, body: b })));
    assert.equal(fake.status, 200, `fake config action should be whitelisted: ${JSON.stringify(fake.body)}`);
    assert.ok(fake.body.id, 'the fake action returns a run id');
    await drainRun(srv.get, fake.body.id);

    // (b) The fake retired string is now caught by the server scanner — proving
    //     config.facts.retiredStrings drives RETIRED.
    const dirty = await srv
      .postJSON('/api/facts/check', { content: `lead-in ${FAKE_RETIRED} trailer` })
      .then((r) => r.json().then((b) => ({ status: r.status, body: b })));
    assert.equal(dirty.status, 200);
    assert.ok(
      Array.isArray(dirty.body.violations) && dirty.body.violations.length > 0,
      'the fake retired string from the variant config is caught',
    );
  } finally {
    if (srv) await srv.stop();
    removeRepoSandbox(repo);
  }
});

test('config-driven: the check-facts.mjs CLI flags the variant config retired string from the sandbox', async () => {
  const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.config.json'), 'utf8'));
  const variant = {
    ...real,
    facts: {
      ...real.facts,
      retiredStrings: [
        ...real.facts.retiredStrings,
        { bad: FAKE_RETIRED, use: 'use the approved phrasing (fake test rule)' },
      ],
    },
  };
  const repo = makeRepoSandbox({ config: JSON.stringify(variant, null, 2) + '\n' });
  try {
    // A scanned HTML surface containing the fake string. check-facts walks ROOT;
    // an active-HTML file under the sandbox root is in scope.
    fs.writeFileSync(
      path.join(repo, 'index.html'),
      `<!doctype html><html><body><p>copy with ${FAKE_RETIRED} inside</p></body></html>\n`,
    );
    let out = '';
    let code = 0;
    try {
      out = execFileSync(NODE, ['check-facts.mjs'], {
        cwd: path.join(repo, 'tools'),
        encoding: 'utf8',
      });
    } catch (err) {
      code = err.status ?? 1;
      out = `${err.stdout || ''}${err.stderr || ''}`;
    }
    assert.equal(code, 1, 'the guard exits non-zero when a retired string is present');
    assert.match(out, new RegExp(FAKE_RETIRED), 'the report names the variant-config retired string');
  } finally {
    removeRepoSandbox(repo);
  }
});

// ============================================================================
// CONTRACT 3 — FALLBACK (config absent / malformed → hardcoded defaults, no crash)
// ============================================================================

test('fallback: with brand.config.json ABSENT the server boots + serves a sane manifest off the hardcoded defaults', async () => {
  const repo = makeRepoSandbox(); // no config written
  assert.ok(!fs.existsSync(path.join(repo, 'brand.config.json')), 'sandbox has no config');
  let srv;
  try {
    srv = await spawnRepoServer(8089, repo, { contentDir: sandbox });

    const manifest = await srv.get('/api/manifest').then((r) => r.json());
    // Sane manifest: the hardcoded surface ids are present and well-shaped.
    const ids = manifest.surfaces.map((s) => s.id);
    assert.deepEqual(
      ids,
      ['instagram', 'posters', 'stories', 'deck', 'launch-grid'],
      'fallback surfaces == the hardcoded SURFACES_DEFAULT ids',
    );
    for (const s of manifest.surfaces) {
      assert.deepEqual(Object.keys(s).sort(), [...SURFACE_KEYS].sort());
    }
    assert.deepEqual(Object.keys(manifest.brand).sort(), [...BRAND_KEYS].sort());

    // Whitelist falls back to the hardcoded ACTIONS: a hardcoded action is
    // accepted, the config-only fake action is rejected.
    const known = await srv
      .postJSON('/api/actions/run', { action: 'check:facts' })
      .then((r) => r.json().then((b) => ({ status: r.status, body: b })));
    assert.equal(known.status, 200, `hardcoded action accepted via fallback: ${JSON.stringify(known.body)}`);
    await drainRun(srv.get, known.body.id);

    const fake = await srv
      .postJSON('/api/actions/run', { action: FAKE_ACTION })
      .then((r) => ({ status: r.status }));
    assert.equal(fake.status, 400, 'the config-only fake action is NOT whitelisted under fallback');
  } finally {
    if (srv) await srv.stop();
    removeRepoSandbox(repo);
  }
});

test('fallback: with brand.config.json MALFORMED the server still boots (never crashes) + serves a sane manifest', async () => {
  const repo = makeRepoSandbox({ config: '{ this is : not valid json, ]]' });
  let srv;
  try {
    srv = await spawnRepoServer(8091, repo, { contentDir: sandbox });
    const manifest = await srv.get('/api/manifest').then((r) => r.json());
    const ids = manifest.surfaces.map((s) => s.id);
    assert.deepEqual(
      ids,
      ['instagram', 'posters', 'stories', 'deck', 'launch-grid'],
      'malformed config → hardcoded surfaces',
    );
    // A hardcoded action still works; an unknown one is still rejected.
    const unknown = await srv.postJSON('/api/actions/run', { action: 'nope' }).then((r) => ({ status: r.status }));
    assert.equal(unknown.status, 400);
  } finally {
    if (srv) await srv.stop();
    removeRepoSandbox(repo);
  }
});

test('fallback: the check-facts.mjs CLI catches a HARDCODED retired string with NO config present', async () => {
  const repo = makeRepoSandbox(); // no config → check-facts uses RETIRED_FALLBACK
  try {
    // A retired string from the HARDCODED fallback list — built at runtime from
    // the imported RETIRED so no literal is committed. (RETIRED here mirrors the
    // fallback values; the first literal rule is identical in both.)
    fs.writeFileSync(
      path.join(repo, 'index.html'),
      `<!doctype html><html><body><p>${RETIRED_TEXT}</p></body></html>\n`,
    );
    let out = '';
    let code = 0;
    try {
      out = execFileSync(NODE, ['check-facts.mjs'], { cwd: path.join(repo, 'tools'), encoding: 'utf8' });
    } catch (err) {
      code = err.status ?? 1;
      out = `${err.stdout || ''}${err.stderr || ''}`;
    }
    assert.equal(code, 1, 'the guard exits non-zero on a hardcoded retired string with no config');
    assert.match(
      out,
      new RegExp(firstLiteral.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      'the report names the hardcoded retired string',
    );
  } finally {
    removeRepoSandbox(repo);
  }
});

// ============================================================================
// RESIDUE — this file mutates nothing in the real repo tree
// ============================================================================

test('zz residue: this file leaves no git residue in the real tree', () => {
  // Everything lived under os.tmpdir() (repo sandboxes) or a content-studio copy.
  // The real brand.config.json was only ever READ. This file (an untracked test
  // source) is a legitimate deliverable, NOT run residue — exclude it. Assert no
  // sandbox artifact (studio-repo-* / studio-content-*) leaked into the repo and
  // that the real brand.config.json is unmodified.
  const porcelain = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  const lines = porcelain.split('\n').filter(Boolean).map((l) => l.slice(3));
  const residue = lines.filter(
    (p) => /studio-repo-/.test(p) || /studio-content-/.test(p),
  );
  assert.deepEqual(residue, [], `sandbox artifacts leaked into the repo:\n${residue.join('\n')}`);

  // The real config must be byte-UNTOUCHED by this file (it is only ever READ;
  // contracts 2/3 use temp copies). Compare bytes captured in before().
  const after = fs.existsSync(REAL_CONFIG_PATH) ? fs.readFileSync(REAL_CONFIG_PATH) : null;
  if (realConfigBytesBefore == null) {
    assert.equal(after, null, 'this file must not CREATE the real brand.config.json');
  } else {
    assert.ok(after != null, 'this file must not DELETE the real brand.config.json');
    assert.deepEqual(after, realConfigBytesBefore, 'the REAL brand.config.json must be byte-identical (only read)');
  }
});

// Keep net import referenced so a future raw-socket assertion can be added without
// a lint churn; currently the contracts use fetch over the sandbox ports.
void net;
