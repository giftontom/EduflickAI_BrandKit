// api.test.mjs — the studio server's automated test suite.
//
// node:test + node:assert + node:* builtins only (no npm packages). The harness
// (helpers.mjs) spawns the real studio-server.mjs on port 8099 against the REAL
// repo, snapshots the six write-path files (+ the gitignored action-state file)
// in before(), and restores them byte-for-byte in after(). The final residue
// test asserts git status --porcelain shows nothing attributable to the suite.
//
// IMPORTANT (guard-bypass tests): never hard-code a retired marketing string in
// test source — the facts CI scans the repo. We import the RETIRED list from
// check-facts.mjs and build a violating string at RUNTIME.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { RETIRED, scanTextRetired } from '../check-facts.mjs';
import {
  setPort,
  getPort,
  api,
  apiJSON,
  rawRequest,
  delay,
  ROOT,
  TOOLS,
  startServer,
  stopServer,
  snapshot,
  restoreSnapshot,
  acquireStatusSection,
  releaseStatusSection,
  writeFixtures,
  removeFixtures,
  FIXTURE_ONE,
  FIXTURE_TWO,
  FIXTURE_TXT,
  relFromRoot,
} from './helpers.mjs';

// This file owns port 8099 (comments.test.mjs uses 8097) so node:test can run
// the files concurrently without a bind collision.
setPort(8099);

// A retired string built at runtime from the first literal-substring rule, so
// no banned marketing literal ever appears in this source file. Asserted to
// actually trip the scanner before any test relies on it.
const firstLiteral = RETIRED.find((r) => typeof r.bad === 'string').bad;
const RETIRED_TEXT = `studio test marker ${firstLiteral} end`;

let snap;

before(async () => {
  // status.json is a SHARED file; hold the cross-process section lock for this
  // file's whole run so it never overlaps status-statemachine.test.mjs on it —
  // its corrupt-store test and restore would otherwise clobber sibling writes
  // (see helpers.mjs acquireStatusSection). Acquire BEFORE snapshotting so the
  // snapshot captures a stable, sibling-restored status.json.
  await acquireStatusSection();
  snap = snapshot();
  writeFixtures();
  assert.ok(scanTextRetired(RETIRED_TEXT).length > 0, 'runtime retired string must trip the scanner');
  await startServer();
});

after(async () => {
  await stopServer();
  removeFixtures();
  restoreSnapshot(snap);
  releaseStatusSection();
});

// --------------------------------------------------------------- smoke / read

test('GET /api/manifest returns the expected top-level shape', async () => {
  const { status, body } = await apiJSON('/api/manifest');
  assert.equal(status, 200);
  for (const k of ['generatedAt', 'surfaces', 'documents', 'docs', 'brand', 'comments']) {
    assert.ok(k in body, `manifest missing key: ${k}`);
  }
  assert.ok(Array.isArray(body.surfaces));
});

test('the API never sets Access-Control-Allow-Origin (no CORS)', async () => {
  const res = await api('/api/manifest');
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

// ------------------------------------------------------------------ editmode

test('editmode: 1 matching block rewrites and changes the bytes', async () => {
  const before = fs.readFileSync(FIXTURE_ONE);
  const { status, body } = await apiJSON('/api/editmode', {
    json: { file: relFromRoot(FIXTURE_ONE), edits: { headline: 'after edit' } },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.ok, true);
  const after = fs.readFileSync(FIXTURE_ONE);
  assert.notDeepEqual(after, before, 'bytes should change on a successful rewrite');
  assert.ok(after.toString('utf8').includes('after edit'));
});

test('editmode: 0 blocks → 422, no write', async () => {
  const noBlock = path.join(path.dirname(FIXTURE_ONE), '__studio_test_noblock__.html');
  fs.writeFileSync(noBlock, '<!doctype html><html><body>no editmode here</body></html>\n');
  try {
    const before = fs.readFileSync(noBlock);
    const { status, body } = await apiJSON('/api/editmode', {
      json: { file: relFromRoot(noBlock), edits: { headline: 'x' } },
    });
    assert.equal(status, 422, JSON.stringify(body));
    assert.deepEqual(fs.readFileSync(noBlock), before, 'no write when there is no block');
  } finally {
    fs.rmSync(noBlock, { force: true });
  }
});

test('editmode: 2 matching blocks → 409 ambiguous, bytes UNCHANGED', async () => {
  const before = fs.readFileSync(FIXTURE_TWO);
  const { status, body } = await apiJSON('/api/editmode', {
    json: { file: relFromRoot(FIXTURE_TWO), edits: { shared: 'c' } },
  });
  assert.equal(status, 409, JSON.stringify(body));
  assert.match(body.error, /ambiguous/i);
  assert.deepEqual(fs.readFileSync(FIXTURE_TWO), before, 'ambiguous edit must not write');
});

test('editmode: path outside design-system/ → 403', async () => {
  const { status, body } = await apiJSON('/api/editmode', {
    json: { file: 'content-studio/status.json', edits: { x: 1 } },
  });
  assert.equal(status, 403, JSON.stringify(body));
});

test('editmode: traversal escape out of design-system/ → 403', async () => {
  const { status } = await apiJSON('/api/editmode', {
    json: { file: 'design-system/../content-studio/FACTS.md', edits: { x: 1 } },
  });
  assert.equal(status, 403);
});

test('editmode: non-.html file → 400', async () => {
  const { status, body } = await apiJSON('/api/editmode', {
    json: { file: relFromRoot(FIXTURE_TXT), edits: { headline: 'x' } },
  });
  assert.equal(status, 400, JSON.stringify(body));
  assert.match(body.error, /\.html/);
});

test('editmode: edit introducing a retired string → 422, bytes UNCHANGED', async () => {
  const before = fs.readFileSync(FIXTURE_ONE);
  const { status, body } = await apiJSON('/api/editmode', {
    json: { file: relFromRoot(FIXTURE_ONE), edits: { headline: RETIRED_TEXT } },
  });
  assert.equal(status, 422, JSON.stringify(body));
  assert.ok(Array.isArray(body.violations) && body.violations.length > 0);
  assert.deepEqual(fs.readFileSync(FIXTURE_ONE), before, 'retired-string edit must not write');
});

test('editmode: edit introducing a double-square-bracket placeholder → 422, bytes UNCHANGED', async () => {
  const before = fs.readFileSync(FIXTURE_ONE);
  const placeholder = '[' + '[unfilled]' + ']';
  const { status, body } = await apiJSON('/api/editmode', {
    json: { file: relFromRoot(FIXTURE_ONE), edits: { headline: placeholder } },
  });
  assert.equal(status, 422, JSON.stringify(body));
  assert.deepEqual(fs.readFileSync(FIXTURE_ONE), before, 'placeholder edit must not write');
});

test('editmode: missing/empty edits → 400', async () => {
  const a = await apiJSON('/api/editmode', { json: { file: relFromRoot(FIXTURE_ONE), edits: {} } });
  assert.equal(a.status, 400);
  const b = await apiJSON('/api/editmode', { json: { file: relFromRoot(FIXTURE_ONE) } });
  assert.equal(b.status, 400);
});

// ------------------------------------------------------------------ traversal
// The static handler (lib/static.mjs) must never return a file outside ROOT.

test('traversal corpus vs the static handler never escapes the repo root', async () => {
  // Each request must NOT return 200 with an out-of-root file's bytes. We probe
  // for the repo-parent's existence of a recognizable file via the .. ladders.
  const repoName = path.basename(ROOT);
  const cases = [
    '/../../../../etc/hosts',
    '/..%2f..%2f..%2f..%2fetc%2fhosts',
    '/..%252f..%252fetc%252fhosts', // double-encoded
    '/%2e%2e/%2e%2e/etc/passwd',
    '/etc/passwd', // absolute-ish path joined under root
    `/../${repoName}-evil/secret.txt`, // prefix-sibling: ROOT + '-evil'
  ];
  for (const url of cases) {
    const res = await fetch(`http://127.0.0.1:${getPort()}${url}`);
    assert.equal(res.status, 404, `expected 404 for ${url}, got ${res.status}`);
    const text = await res.text();
    assert.ok(
      !/root:.*:0:0:/.test(text),
      `traversal ${url} leaked /etc/passwd-like contents`,
    );
  }
});

test('traversal: NUL byte in path → 404', async () => {
  // %00 decodes to a NUL byte, which the handler rejects before stat.
  const res = await fetch(`http://127.0.0.1:${getPort()}/tools/studio/main.mjs%00.png`);
  assert.equal(res.status, 404);
});

test('prefix-sibling directory cannot be read as if under root', async () => {
  // Create a real sibling dir "<ROOT>-evil" with a file; the startsWith(ROOT)
  // hole would have served it. lib/static.mjs requires ROOT + path.sep.
  const evilDir = ROOT + '-evil__studiotest';
  const evilFile = path.join(evilDir, 'secret.txt');
  fs.mkdirSync(evilDir, { recursive: true });
  fs.writeFileSync(evilFile, 'TOP SECRET SIBLING');
  try {
    const sib = path.basename(evilDir);
    const res = await fetch(`http://127.0.0.1:${getPort()}/../${sib}/secret.txt`);
    assert.equal(res.status, 404);
    const text = await res.text();
    assert.ok(!text.includes('TOP SECRET SIBLING'), 'prefix-sibling file must not be served');
  } finally {
    fs.rmSync(evilDir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------- host / origin

test('host/origin: POST with a cross-origin Origin → 403', async () => {
  const { status, body } = await apiJSON('/api/status', {
    method: 'POST',
    headers: { Origin: 'http://evil.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'x', patch: {} }),
  });
  assert.equal(status, 403, JSON.stringify(body));
  assert.match(body.error, /cross-origin/i);
});

test('host/origin: a non-loopback Host header → 403 (DNS-rebinding guard)', async () => {
  // Node's fetch/undici forces the real authority into Host, so a forged Host
  // can only be sent over a raw socket.
  const res = await rawRequest({ method: 'GET', pathname: '/api/manifest', host: 'evil.example' });
  assert.equal(res.status, 403, res.statusLine);
  assert.match(res.body, /non-loopback Host/i);
});

test('host/origin: a loopback Host header passes the rebinding guard', async () => {
  const res = await rawRequest({ method: 'GET', pathname: '/api/manifest', host: `127.0.0.1:${getPort()}` });
  assert.equal(res.status, 200, res.statusLine);
});

test('host/origin: same-origin POST passes the guard (reaches the handler)', async () => {
  // A same-origin POST with a deliberately bad body proves it got PAST the
  // guard and into validation (400), not 403.
  const { status } = await apiJSON('/api/status', { json: { id: '', patch: {} } });
  assert.equal(status, 400);
});

test('host/origin: a POST with NO Origin header passes (non-browser client)', async () => {
  // Browsers attach Origin cross-site; a curl/test client omits it. The guard
  // only blocks when an Origin is present and cross-site.
  const { status } = await apiJSON('/api/status', {
    headers: { Origin: undefined },
    json: { id: '', patch: {} },
  });
  assert.equal(status, 400, 'no-Origin POST should reach validation, not be 403');
});

// ----------------------------------------------------------- guard bypass

test('facts/save: retired string without override → 422 + violations, FACTS.md unchanged', async () => {
  const factsAbs = path.join(ROOT, 'content-studio', 'FACTS.md');
  const before = fs.readFileSync(factsAbs);
  const { status, body } = await apiJSON('/api/facts/save', { json: { content: RETIRED_TEXT } });
  assert.equal(status, 422, JSON.stringify(body));
  assert.ok(Array.isArray(body.violations) && body.violations.length > 0);
  assert.deepEqual(fs.readFileSync(factsAbs), before, 'FACTS.md must not change on a 422');
});

test('facts/save: retired string WITH override → 200 written (then restored by teardown)', async () => {
  const factsAbs = path.join(ROOT, 'content-studio', 'FACTS.md');
  const content = `${fs.readFileSync(factsAbs, 'utf8')}\n${RETIRED_TEXT}\n`;
  const { status, body } = await apiJSON('/api/facts/save', { json: { content, override: true } });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.ok(fs.readFileSync(factsAbs, 'utf8').includes(firstLiteral), 'override write should land');
});

test('facts/check: a clean string reports no violations; retired reports some', async () => {
  const clean = await apiJSON('/api/facts/check', { json: { content: 'a clean studio line' } });
  assert.equal(clean.status, 200);
  assert.equal(clean.body.violations.length, 0);
  const dirty = await apiJSON('/api/facts/check', { json: { content: RETIRED_TEXT } });
  assert.equal(dirty.status, 200);
  assert.ok(dirty.body.violations.length > 0);
});

test('facts/save: non-string content → 400', async () => {
  const { status } = await apiJSON('/api/facts/save', { json: { content: 123 } });
  assert.equal(status, 400);
});

// ----------------------------------------------------------- launch-grid

test('launch-grid: GET returns {plan, slides}', async () => {
  const { status, body } = await apiJSON('/api/launch-grid');
  assert.equal(status, 200);
  assert.ok(body.plan && Array.isArray(body.plan.posts));
  assert.ok(body.slides && typeof body.slides === 'object');
});

test('launch-grid/post: unknown id → 404', async () => {
  const { status, body } = await apiJSON('/api/launch-grid/post', {
    json: { id: 'post-nope-zz', patch: { notes: 'x' } },
  });
  assert.equal(status, 404, JSON.stringify(body));
});

test('launch-grid/post: unknown patch key → 400', async () => {
  const { status, body } = await apiJSON('/api/launch-grid/post', {
    json: { id: 'post-01-br', patch: { bogusKey: 'x' } },
  });
  assert.equal(status, 400, JSON.stringify(body));
  assert.match(body.error, /unknown patch keys/i);
});

test('launch-grid/post: wave out of 1-4 → 400', async () => {
  for (const wave of [0, 5, 1.5, -1]) {
    const { status } = await apiJSON('/api/launch-grid/post', {
      json: { id: 'post-01-br', patch: { wave } },
    });
    assert.equal(status, 400, `wave ${wave} should be 400`);
  }
});

test('launch-grid/post: retired caption text without override → 422, plan unchanged', async () => {
  const planAbs = path.join(ROOT, 'content-studio', 'launch-grid.json');
  const before = fs.readFileSync(planAbs);
  const { status, body } = await apiJSON('/api/launch-grid/post', {
    json: {
      id: 'post-01-br',
      patch: { caption: { hook: RETIRED_TEXT, body: 'b', cta: 'c', hashtags: ['#X'] } },
    },
  });
  assert.equal(status, 422, JSON.stringify(body));
  assert.ok(Array.isArray(body.violations) && body.violations.length > 0);
  assert.deepEqual(fs.readFileSync(planAbs), before, 'plan must not change on a 422');
});

test('launch-grid/slides: a [[placeholder]] → 422 hard reject (no override path)', async () => {
  const htmlAbs = path.join(ROOT, 'design-system', 'collateral', 'launch-grid.html');
  const before = fs.readFileSync(htmlAbs);
  const placeholder = '[' + '[seats]' + ']';
  const { status, body } = await apiJSON('/api/launch-grid/slides', {
    json: {
      slug: 'bl',
      slides: [{ eb: 'x', motif: 'y', hl: placeholder, sup: 'z' }],
      override: true, // even with override, placeholders are a hard reject
    },
  });
  assert.equal(status, 422, JSON.stringify(body));
  assert.match(body.error, /placeholder/i);
  assert.deepEqual(fs.readFileSync(htmlAbs), before, 'placeholder slides must not write');
});

test('launch-grid/slides: unknown slug → 404', async () => {
  const { status } = await apiJSON('/api/launch-grid/slides', {
    json: { slug: 'nope', slides: [{ eb: 'a', motif: 'b', hl: 'c', sup: 'd' }] },
  });
  assert.equal(status, 404);
});

test('launch-grid/slides: malformed slide shape → 400', async () => {
  const { status } = await apiJSON('/api/launch-grid/slides', {
    json: { slug: 'bl', slides: [{ eb: 'a' }] },
  });
  assert.equal(status, 400);
});

// ---------------------------------------------------------------- atomicity

test('atomicity: no .tmp residue beside the write-path files after writes', async () => {
  // Trigger a write (status patch) then assert no LEFTOVER tmp file.
  await apiJSON('/api/status', { json: { id: 'studio-test/atomic', patch: { status: 'draft' } } });
  const statusDir = path.join(ROOT, 'content-studio');
  const scan = () => fs.readdirSync(statusDir).filter((n) => /^\.status\.json\.tmp-/.test(n));
  // writeAtomic is tmp→fsync→rename: a leaked tmp persists, but a SIBLING test
  // file's server (its own pid, its own tmp name) can be caught mid-rename here
  // since the suite runs files concurrently against the same status.json. Re-poll
  // briefly; a genuine leak never clears, a transient cross-process tmp does.
  let leftovers = scan();
  for (let i = 0; i < 20 && leftovers.length; i++) {
    await delay(50);
    leftovers = scan();
  }
  assert.equal(leftovers.length, 0, `tmp residue: ${leftovers.join(', ')}`);
});

test('atomicity: garbage in status.json → GET /api/status sane empty; manifest still 200', async () => {
  const statusAbs = path.join(ROOT, 'content-studio', 'status.json');
  const before = fs.readFileSync(statusAbs);
  try {
    fs.writeFileSync(statusAbs, '{ this is not valid json ');
    const s = await apiJSON('/api/status');
    assert.equal(s.status, 200);
    assert.ok(s.body && typeof s.body.assets === 'object', 'corrupt store reads back as empty');
    const m = await apiJSON('/api/manifest');
    assert.equal(m.status, 200, 'manifest must survive a corrupt status.json');
  } finally {
    fs.writeFileSync(statusAbs, before);
  }
});

// --------------------------------------------------------------- concurrency

test('concurrency: 10 parallel status patches for 10 ids all land (serialized queue)', async () => {
  const ids = Array.from({ length: 10 }, (_, i) => `studio-test/concurrent-${i}`);
  await Promise.all(
    ids.map((id) => apiJSON('/api/status', { json: { id, patch: { status: 'approved' } } })),
  );
  const { body } = await apiJSON('/api/status');
  for (const id of ids) {
    assert.equal(body.assets[id]?.status, 'approved', `lost write for ${id}`);
  }
});

// -------------------------------------------------------------- action runner

test('actions/run: unknown action → 400', async () => {
  const { status, body } = await apiJSON('/api/actions/run', { json: { action: 'rm-rf-everything' } });
  assert.equal(status, 400, JSON.stringify(body));
});

test('actions: run check:facts, second run is 409, lastRun reflects the exit', async () => {
  const start = await apiJSON('/api/actions/run', { json: { action: 'check:facts' } });
  assert.equal(start.status, 200, JSON.stringify(start.body));
  const runId = start.body.id;
  assert.ok(runId, 'run id returned');

  // While in flight, a second run must be rejected single-flight (409).
  const second = await apiJSON('/api/actions/run', { json: { action: 'check:facts' } });
  assert.equal(second.status, 409, 'concurrent run should be busy');

  // Consume the SSE stream until the exit event (server replays + lives).
  const exitInfo = await readStreamUntilExit(runId);
  assert.ok('code' in exitInfo, 'stream produced an exit event');

  // After exit, GET /api/actions should report a lastRun for this action and
  // no running job.
  // Small settle so finishRun() has cleared `running`.
  for (let i = 0; i < 40; i++) {
    const a = await apiJSON('/api/actions');
    if (!a.body.running && a.body.lastRun && a.body.lastRun.action === 'check:facts') {
      assert.equal(a.body.lastRun.action, 'check:facts');
      assert.ok('exitCode' in a.body.lastRun);
      return;
    }
    await delay(100);
  }
  assert.fail('lastRun did not reflect check:facts after exit');
});

// Read an SSE stream to its exit event, returning the parsed {code, timedOut}.
async function readStreamUntilExit(runId) {
  const res = await api(`/api/actions/${runId}/stream`);
  assert.equal(res.status, 200);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const deadline = Date.now() + 60000;
  for (;;) {
    if (Date.now() > deadline) throw new Error('SSE stream did not emit exit within 60s');
    const { value, done } = await reader.read();
    if (value) buf += decoder.decode(value, { stream: true });
    const idx = buf.indexOf('event: exit');
    if (idx !== -1) {
      const dataLine = buf.slice(idx).match(/data: (.+)/);
      try {
        await reader.cancel();
      } catch {
        /* already closing */
      }
      return dataLine ? JSON.parse(dataLine[1]) : {};
    }
    if (done) return {};
  }
}

// ---------------------------------------------------------------- export-zip

test('export-zip: missing files array → 400', async () => {
  const { status } = await apiJSON('/api/export-zip', { json: {} });
  assert.equal(status, 400);
});

test('export-zip: empty files array → 400', async () => {
  const { status } = await apiJSON('/api/export-zip', { json: { files: [] } });
  assert.equal(status, 400);
});

test('export-zip: a src escaping exports/ → 400', async () => {
  const { status, body } = await apiJSON('/api/export-zip', {
    json: { files: [{ src: '../content-studio/FACTS.md', name: 'leak.md' }] },
  });
  assert.equal(status, 400, JSON.stringify(body));
  assert.match(body.error, /exports\//);
});

test('export-zip: an archive name with traversal → 400', async () => {
  const { status } = await apiJSON('/api/export-zip', {
    json: { files: [{ text: 'hi', name: '../escape.txt' }] },
  });
  assert.equal(status, 400);
});

test('export-zip: an inline text entry produces a zip (200, application/zip)', async () => {
  const res = await api('/api/export-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: [{ text: 'hello', name: 'note.txt' }], zipName: 'studiotest' }),
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/zip');
  const buf = Buffer.from(await res.arrayBuffer());
  assert.equal(buf.slice(0, 2).toString('utf8'), 'PK', 'looks like a zip');
});

// ---------------------------------------------------------------- docs drift

test('docs drift: action whitelist in server source == action list in README', async () => {
  const serverSrc = fs.readFileSync(path.join(TOOLS, 'studio-server.mjs'), 'utf8');
  // Parse the frozen ACTIONS object body.
  const m = serverSrc.match(/const ACTIONS = Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(m, 'could not find the ACTIONS whitelist in server source');
  const serverActions = new Set();
  for (const km of m[1].matchAll(/(?:'([^']+)'|([A-Za-z][\w:]*))\s*:\s*true/g)) {
    serverActions.add(km[1] || km[2]);
  }
  assert.ok(serverActions.size > 0, 'parsed no actions from server source');

  const readme = fs.readFileSync(path.join(TOOLS, 'studio', 'README.md'), 'utf8');
  // The README lists the whitelist inline as `export`, `export:ig`, … Pull the
  // backtick-quoted tokens out of the "Action whitelist:" sentence.
  const wlLine = readme.match(/Action whitelist:[\s\S]*?\n\n/);
  assert.ok(wlLine, 'README has no "Action whitelist:" section');
  const readmeActions = new Set(
    [...wlLine[0].matchAll(/`([a-z][\w:]*)`/g)].map((x) => x[1]),
  );

  const onlyInServer = [...serverActions].filter((a) => !readmeActions.has(a));
  const onlyInReadme = [...readmeActions].filter((a) => !serverActions.has(a));
  assert.deepEqual(
    { onlyInServer, onlyInReadme },
    { onlyInServer: [], onlyInReadme: [] },
    'action whitelist drifted between server source and README',
  );
});

// ------------------------------------------------- residue / tree cleanliness
//
// Restore this file's write-surface snapshot + fixtures, then assert NO residue
// attributable to THIS file remains. Two scopes:
//   1) the unique fixture artifacts (__studio_test_*, the -evil sibling) — these
//      are owned solely by this file, so they must never appear in porcelain.
//   2) the SHARED write-surface files (status.json, launch-grid.json,
//      launch-grid.html) — restored byte-for-byte here. (FACTS.md /
//      design-comments.json / DESIGN_FEEDBACK.md are ALSO written by the sibling
//      test files, which may still be running concurrently, so they are checked
//      by whichever file finishes last via its own after()+restore, not raced
//      here.)
//
// after() in EVERY test file restores the full write surface again, so the tree
// is byte-clean once the whole run finishes regardless of file order.

test('zz residue: this file leaves no git residue attributable to it', () => {
  removeFixtures();
  restoreSnapshot(snap);

  const porcelain = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  const lines = porcelain.split('\n').filter(Boolean).map((l) => l.slice(3));

  // (1) Unique-to-this-file artifacts must be gone entirely.
  const fixtureResidue = lines.filter((p) =>
    /design-system\/__studio_test_/.test(p) ||
    /design-system\/__studio_test__\.txt/.test(p) ||
    /-evil__studiotest/.test(p),
  );
  assert.deepEqual(fixtureResidue, [], `fixture residue left behind:\n${fixtureResidue.join('\n')}`);

  // (2) Shared files this file alone owns must be byte-restored (not in porcelain
  // unless they were already dirty BEFORE the suite — see snapshot()).
  const ownedShared = lines.filter((p) =>
    /^content-studio\/status\.json$/.test(p) ||
    /^content-studio\/launch-grid\.json$/.test(p) ||
    /^design-system\/collateral\/launch-grid\.html$/.test(p),
  );
  // Only flag a shared file if its snapshot was clean (null/absent or tracked
  // unchanged at start). We can't see git state from before; restoreSnapshot
  // wrote back the exact bytes, so any diff here is a real restore failure.
  for (const p of ownedShared) {
    const after = fs.readFileSync(path.join(ROOT, p));
    const want = snap[p];
    if (want != null) {
      assert.deepEqual(after, want, `restore failed for ${p} (bytes differ from snapshot)`);
    }
  }
});
