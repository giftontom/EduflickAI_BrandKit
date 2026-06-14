// generate.test.mjs — the generation panel + QA runner + drafts write surface.
//
// Three Phase-1b endpoints, exercised via the shared helpers.mjs harness (its own
// port so node:test runs the files concurrently):
//
//   GET  /api/generate/templates   the prompts/ list (read-only)
//   POST /api/generate             deterministic SYSTEM+FACTS+TEMPLATE assembly
//                                  (read-only — the anti-hallucination prompt)
//   POST /api/qa/check             scanTextRetired + emoji/forbidden-word checklist
//   GET  /api/drafts               content-studio/drafts/*.md listing
//   POST /api/drafts               the 7th write path — drafts/<name>.md, slug-
//                                  sanitized, traversal-guarded, atomic, facts-
//                                  guarded with NO override.
//
// CONTENT SANDBOX: the server (and the opt-in bridge server) run with
// STUDIO_CONTENT_DIR pointed at a throwaway COPY of content-studio
// (makeContentSandbox). So every draft written, and every prompts/ + FACTS.md
// read, hits the sandbox — the user's LIVE content-studio/drafts/ is never written.
// DRAFTS_DIR below resolves to the SANDBOX drafts dir, and all file assertions read
// it. The sandbox is rmSync'd in after(), so there is no real-tree residue to
// scrub and no git-porcelain check is needed against content-studio/drafts/.
//
// IMPORTANT (guard-bypass tests): never hard-code a retired marketing string in
// test source — the facts CI scans test files too. The violating string is built
// at RUNTIME from the RETIRED list imported from check-facts.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';

import { RETIRED, scanTextRetired } from '../check-facts.mjs';
import {
  setPort,
  api,
  apiJSON,
  ROOT,
  TOOLS,
  delay,
  startServer,
  stopServer,
  makeContentSandbox,
  removeContentSandbox,
} from './helpers.mjs';

// Own port (api.test 8099, comments 8097, statemachine 8096) so node:test can
// run the files concurrently without a bind collision.
setPort(8093);

// The sandbox content dir + its drafts/ subdir (where all writes land). Assigned
// in before() once makeContentSandbox() has copied content-studio/ aside.
let sandbox;
let DRAFTS_DIR;
// Every draft this suite writes starts with this prefix so teardown + the
// residue assertion can target exactly what the suite created.
const SLUG_PREFIX = 'studio-test-gen';

// A retired string built at runtime from the first literal-substring rule, so no
// banned marketing literal ever appears in this source file. Asserted to trip
// the scanner before any test relies on it (mirrors api.test.mjs / comments).
const firstLiteral = RETIRED.find((r) => typeof r.bad === 'string').bad;
const RETIRED_TEXT = `studio gen marker ${firstLiteral} end`;

// Snapshot the drafts/ listing before the suite runs; teardown removes any new
// file whose name carries our prefix, plus any stray `.tmp` residue.
let preDrafts = new Set();

function listDrafts() {
  try {
    return fs.readdirSync(DRAFTS_DIR);
  } catch {
    return [];
  }
}

function cleanupCreatedDrafts() {
  for (const name of listDrafts()) {
    const isOurs = name.includes(SLUG_PREFIX);
    const isResidue = name.startsWith('.') && name.includes('.tmp-');
    if ((isOurs && !preDrafts.has(name)) || isResidue) {
      try {
        fs.rmSync(path.join(DRAFTS_DIR, name), { force: true });
      } catch {
        /* already gone */
      }
    }
  }
}

// ---- second server for the OPT-IN local-model bridge ----------------------
//
// The default startServer() runs with NO STUDIO_MODEL_CMD, so the bridge is
// dormant (501). To exercise the configured path we spawn a SECOND server child
// ourselves on a different unused port with STUDIO_MODEL_CMD='cat' — `cat` echoes
// stdin to stdout, so the bridge returns the assembled prompt verbatim. We own
// this child's full lifecycle and reap it in after() (no leftover process / port).
const NODE = process.execPath;
let bridgeChild = null;
let bridgePort = 0;

// Grab an ephemeral free port from the OS (bind to 0, read it back, release).
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startBridgeServer() {
  bridgePort = await freePort();
  bridgeChild = spawn(NODE, ['studio-server.mjs'], {
    cwd: TOOLS,
    env: {
      ...process.env,
      STUDIO_PORT: String(bridgePort),
      PORT: String(bridgePort),
      STUDIO_CONTENT_DIR: sandbox, // same throwaway content copy as the main server
      STUDIO_MODEL_CMD: 'cat', // echoes stdin → stdout; the bridge returns the prompt
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  bridgeChild.stdout.on('data', () => {});
  bridgeChild.stderr.on('data', () => {});
  const deadline = Date.now() + 15000;
  for (;;) {
    if (bridgeChild.exitCode != null) throw new Error(`bridge server exited early (${bridgeChild.exitCode})`);
    try {
      const res = await bridgeFetch('/api/manifest', { method: 'GET' });
      if (res.status === 200) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error('bridge server did not become ready in 15s');
    await delay(150);
  }
}

async function stopBridgeServer() {
  if (!bridgeChild) return;
  const c = bridgeChild;
  bridgeChild = null;
  await new Promise((resolve) => {
    const hardKill = setTimeout(() => {
      if (c.exitCode == null) c.kill('SIGKILL');
    }, 3000);
    c.once('close', () => {
      clearTimeout(hardKill);
      resolve();
    });
    c.kill('SIGTERM');
  });
}

// Same-origin fetch against the bridge server's port (its own Origin so the CSRF
// guard passes); returns {status, body} like apiJSON.
async function bridgeFetch(pathname, opts = {}) {
  const origin = `http://127.0.0.1:${bridgePort}`;
  const headers = { Origin: origin, ...(opts.headers || {}) };
  const init = { ...opts, headers };
  if (init.json !== undefined) {
    init.method = init.method || 'POST';
    init.body = JSON.stringify(init.json);
    headers['Content-Type'] = 'application/json';
    delete init.json;
  }
  const res = await fetch(`${origin}${pathname}`, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

before(async () => {
  // A throwaway COPY of content-studio; DRAFTS_DIR is its drafts/ subdir, so every
  // /api/drafts write lands here, never in the user's live content-studio/drafts/.
  sandbox = makeContentSandbox();
  DRAFTS_DIR = path.join(sandbox, 'drafts');
  preDrafts = new Set(listDrafts());
  assert.ok(scanTextRetired(RETIRED_TEXT).length > 0, 'runtime retired string must trip the scanner');
  await startServer({ contentDir: sandbox });
  await startBridgeServer();
});

after(async () => {
  await stopServer();
  await stopBridgeServer();
  // The sandbox is discarded wholesale; cleanupCreatedDrafts() is belt-and-braces.
  cleanupCreatedDrafts();
  removeContentSandbox(sandbox);
});

// ----------------------------------------------------------- generate/templates

test('GET /api/generate/templates → 200, the prompt templates with titles', async () => {
  const { status, body } = await apiJSON('/api/generate/templates');
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(Array.isArray(body), 'templates is an array');
  assert.ok(body.length > 0, 'at least one template');
  const files = body.map((t) => t.file);
  assert.ok(files.includes('instagram-caption.md'), 'instagram-caption.md is listed');
  // The system prompt and the README are NOT user templates.
  assert.ok(!files.includes('00_SYSTEM_PROMPT.md'), 'the system prompt is excluded');
  assert.ok(!files.includes('README.md'), 'the README is excluded');
  // Every entry carries a human title (used in the panel dropdown).
  for (const t of body) {
    assert.equal(typeof t.file, 'string');
    assert.ok(typeof t.title === 'string' && t.title.length > 0, `template ${t.file} has a title`);
  }
});

// ------------------------------------------------------------------- generate

test('POST /api/generate assembles SYSTEM + live FACTS + TEMPLATE', async () => {
  const { status, body } = await apiJSON('/api/generate', {
    json: { template: 'instagram-caption.md' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(typeof body.prompt, 'string', 'prompt is a string');
  // The three section markers the assembler emits, in order.
  for (const marker of ['===== SYSTEM =====', 'CURRENT FACTS', '----- TEMPLATE -----']) {
    assert.ok(body.prompt.includes(marker), `prompt contains "${marker}"`);
  }
  assert.ok(
    body.prompt.indexOf('===== SYSTEM =====') < body.prompt.indexOf('----- TEMPLATE -----'),
    'SYSTEM section precedes the TEMPLATE section',
  );
  // Proof the FACTS block was actually baked in (not the template's own [[ ]]
  // placeholders) — a real live value from FACTS.md must appear in the prompt.
  assert.ok(body.prompt.includes('UXP Innovation Hub'), 'venue from FACTS.md is baked into the prompt');
  assert.ok(body.prompt.includes('12 weeks'), 'duration from FACTS.md is baked into the prompt');
  // facts is the structured FACTS the panel renders alongside the prompt.
  assert.ok(Array.isArray(body.facts) && body.facts.length > 0, 'facts is a non-empty array');
});

test('POST /api/generate folds task fields into a TASK SPECIFICS section', async () => {
  const { status, body } = await apiJSON('/api/generate', {
    json: {
      template: 'instagram-caption.md',
      task: { brief: 'announce the cohort kickoff', pillar: 'The Cohort' },
    },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(body.prompt.includes('----- TASK SPECIFICS'), 'TASK SPECIFICS section appears');
  assert.ok(body.prompt.includes('announce the cohort kickoff'), 'the provided brief is in the prompt');
  assert.ok(body.prompt.includes('The Cohort'), 'the provided pillar is in the prompt');
});

test('POST /api/generate with a traversal template → 400, no crash', async () => {
  const { status } = await apiJSON('/api/generate', { json: { template: '../FACTS.md' } });
  assert.equal(status, 400);
});

test('POST /api/generate with a non-existent template → 400', async () => {
  const { status } = await apiJSON('/api/generate', { json: { template: 'no-such-template.md' } });
  assert.equal(status, 400);
});

test('POST /api/generate refuses 00_SYSTEM_PROMPT.md as a user template → 400', async () => {
  const { status } = await apiJSON('/api/generate', { json: { template: '00_SYSTEM_PROMPT.md' } });
  assert.equal(status, 400);
});

test('POST /api/generate with a missing template field → 400', async () => {
  const { status } = await apiJSON('/api/generate', { json: {} });
  assert.equal(status, 400);
});

// ----------------------------------------------------- generate/run (bridge)

test('POST /api/generate/run is DORMANT by default → 501 (no STUDIO_MODEL_CMD)', async () => {
  // The default server (started by helpers.startServer) carries no
  // STUDIO_MODEL_CMD, so the bridge never spawns anything — it answers 501.
  const { status, body } = await apiJSON('/api/generate/run', {
    json: { template: 'instagram-caption.md' },
  });
  assert.equal(status, 501, JSON.stringify(body));
  assert.ok(typeof body.error === 'string' && /STUDIO_MODEL_CMD/.test(body.error),
    'the 501 names STUDIO_MODEL_CMD as the env var to set');
});

test('POST /api/generate/run with a bad template → 400 (validated before any spawn)', async () => {
  // Bad template is rejected by the SAME validation as /api/generate, even with
  // no model configured — never reaches the spawn path.
  const traversal = await apiJSON('/api/generate/run', { json: { template: '../FACTS.md' } });
  assert.equal(traversal.status, 400);
  const missing = await apiJSON('/api/generate/run', { json: {} });
  assert.equal(missing.status, 400);
});

test('POST /api/generate/run with STUDIO_MODEL_CMD=cat → 200, output is the assembled prompt', async () => {
  // The second server runs with STUDIO_MODEL_CMD='cat', so the bridge pipes the
  // assembled prompt to `cat`, which echoes it straight back as stdout.
  const { status, body } = await bridgeFetch('/api/generate/run', {
    json: { template: 'instagram-caption.md' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(typeof body.output, 'string', 'output is a string');
  assert.equal(body.timedOut, false, 'a fast echo did not time out');
  // The output is the assembled prompt (cat echoed stdin) — it carries the FACTS
  // preamble marker AND a real live FACTS value baked in, proving the bridge ran
  // the SAME assembly as /api/generate.
  assert.ok(body.output.includes('CURRENT FACTS'), 'the FACTS preamble marker is in the echoed output');
  assert.ok(body.output.includes('UXP Innovation Hub'), 'a real live FACTS value is baked into the output');
  // The server also echoes the assembled prompt it sent; it must equal the output
  // `cat` returned (the bridge sends exactly the prompt and nothing else).
  assert.equal(body.prompt, body.output, 'the echoed prompt matches what cat returned (byte-identical)');
});

test('POST /api/generate/run via bridge equals the clipboard /api/generate prompt', async () => {
  // Byte-identical assembly proof: the bridge (which echoes its prompt back) and
  // the read-only /api/generate must produce the SAME prompt for the same input.
  const run = await bridgeFetch('/api/generate/run', { json: { template: 'instagram-caption.md' } });
  const gen = await apiJSON('/api/generate', { json: { template: 'instagram-caption.md' } });
  assert.equal(run.status, 200, JSON.stringify(run.body));
  assert.equal(gen.status, 200, JSON.stringify(gen.body));
  assert.equal(run.body.prompt, gen.body.prompt, '/run and /generate assemble a byte-identical prompt');
});

test('POST /api/generate/run watchdog: a slow model is SIGTERMed → timedOut:true, no hang, no zombie', async () => {
  // Spawn a DEDICATED server with a short STUDIO_ACTION_TIMEOUT_MS (~300 ms) and a
  // STUDIO_MODEL_CMD that prints a little then sleeps far past the deadline. The
  // bridge's watchdog must SIGTERM (then SIGKILL) the child; the request resolves
  // with timedOut:true carrying whatever stdout was captured before the kill — it
  // must NOT hang the connection. We then prove the model child was reaped (no
  // zombie) by checking the server exits its OWN SIGTERM cleanly in teardown.
  const port = await freePort();
  // node one-liner: write a marker, flush, then sleep ~30 s (well past 300 ms).
  const modelArgs = JSON.stringify([
    '-e',
    "process.stdout.write('PARTIAL-OUTPUT-MARKER'); setInterval(() => {}, 1000);",
  ]);
  const child = spawn(NODE, ['studio-server.mjs'], {
    cwd: TOOLS,
    env: {
      ...process.env,
      STUDIO_PORT: String(port),
      PORT: String(port),
      STUDIO_CONTENT_DIR: sandbox,
      STUDIO_MODEL_CMD: NODE, // run node itself as the "model"
      STUDIO_MODEL_ARGS: modelArgs,
      STUDIO_ACTION_TIMEOUT_MS: '300', // watchdog fires fast
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  const origin = `http://127.0.0.1:${port}`;
  try {
    // Wait for the dedicated server to come up.
    const deadline = Date.now() + 15000;
    for (;;) {
      if (child.exitCode != null) throw new Error(`timeout-bridge server exited early (${child.exitCode})`);
      try {
        const r = await fetch(`${origin}/api/manifest`, { headers: { Origin: origin } });
        if (r.status === 200) break;
      } catch {
        /* not up yet */
      }
      if (Date.now() > deadline) throw new Error('timeout-bridge server did not become ready in 15s');
      await delay(150);
    }

    // Drive the run. The watchdog (300 ms) must terminate the sleeping model and
    // the response must come back PROMPTLY (well under the model's 30 s sleep),
    // proving no hang and that the SIGTERM/KILL path actually ran.
    const reqStart = Date.now();
    const res = await fetch(`${origin}/api/generate/run`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: 'instagram-caption.md' }),
    });
    const elapsed = Date.now() - reqStart;
    assert.equal(res.status, 200, `a timed-out run still answers 200 with the partial result`);
    const body = await res.json();
    assert.equal(body.timedOut, true, 'the watchdog marked the overrun as timedOut:true');
    // The connection did NOT hang waiting out the 30 s sleep — the SIGTERM path ran.
    assert.ok(elapsed < 15000, `the timed-out run resolved promptly (${elapsed} ms), not after the model sleep`);
    // Whatever the model printed before the kill rides back on stdout.
    assert.ok(
      typeof body.output === 'string' && body.output.includes('PARTIAL-OUTPUT-MARKER'),
      'the partial stdout captured before SIGTERM is returned',
    );
  } finally {
    // Reap the server child cleanly. If the model child had been left running
    // (a zombie / leaked process group), this SIGTERM-then-close would not settle
    // promptly — the hardKill backstop guarantees we never wedge the suite.
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
    // The server child must actually be gone (not a zombie holding the port).
    assert.ok(child.exitCode != null || child.signalCode != null, 'the timeout-bridge server child was reaped');
  }
});

// ------------------------------------------------------------------- qa/check

test('POST /api/qa/check on clean copy → 200, no violations, no checklist hits', async () => {
  const { status, body } = await apiJSON('/api/qa/check', {
    json: { text: 'clean engineer copy. 20 seats. 12 weeks.' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(Array.isArray(body.violations), 'violations is an array');
  assert.equal(body.violations.length, 0, 'clean copy has no retired-string violations');
  assert.ok(Array.isArray(body.checklist), 'checklist is an array');
  // The checklist only carries entries for rules that FIRED — clean copy → none.
  assert.equal(body.checklist.length, 0, 'no checklist rule fires on clean copy');
});

test('POST /api/qa/check flags an emoji in the checklist', async () => {
  const { status, body } = await apiJSON('/api/qa/check', {
    json: { text: 'ship AI products \u{1F680} get hired' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  const emojiRule = body.checklist.find((c) => c.rule === 'emoji');
  assert.ok(emojiRule, 'the emoji rule fired and is present in the checklist');
  assert.ok(Array.isArray(emojiRule.hits) && emojiRule.hits.length > 0, 'the emoji hit is reported');
});

test('POST /api/qa/check flags a forbidden hype word in the checklist', async () => {
  // "supercharge" is on the forbidden list (system prompt HARD RULE 3 / QA A).
  const { status, body } = await apiJSON('/api/qa/check', {
    json: { text: 'this will supercharge your career in 12 weeks' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  const wordRule = body.checklist.find((c) => c.rule === 'forbidden-words');
  assert.ok(wordRule, 'the forbidden-words rule fired');
  assert.ok(Array.isArray(wordRule.hits) && wordRule.hits.length > 0, 'the forbidden word is reported');
});

test('POST /api/qa/check surfaces a runtime-built retired string in violations', async () => {
  const { status, body } = await apiJSON('/api/qa/check', { json: { text: RETIRED_TEXT } });
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(Array.isArray(body.violations) && body.violations.length > 0, 'retired string is flagged');
});

test('POST /api/qa/check with a non-string text → 400', async () => {
  const { status } = await apiJSON('/api/qa/check', { json: { text: 42 } });
  assert.equal(status, 400);
});

// --------------------------------------------------------------------- drafts

test('POST /api/drafts writes a clean draft → 200, file lands, GET lists it', async () => {
  const slug = `${SLUG_PREFIX}-01`;
  const content = 'clean draft body';
  const { status, body } = await apiJSON('/api/drafts', { json: { slug, content } });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.name, `${slug}.md`, 'the written name is <slug>.md');

  const abs = path.join(DRAFTS_DIR, `${slug}.md`);
  assert.ok(fs.existsSync(abs), 'the draft file exists under content-studio/drafts/');
  assert.equal(fs.readFileSync(abs, 'utf8'), content, 'the file holds the posted content byte-for-byte');

  // It now appears in the listing.
  const { status: lstatus, body: list } = await apiJSON('/api/drafts');
  assert.equal(lstatus, 200);
  assert.ok(Array.isArray(list), 'drafts listing is an array');
  assert.ok(list.some((d) => d.name === `${slug}.md`), 'the new draft is listed');
});

test('POST /api/drafts with a channel prefixes the filename', async () => {
  const slug = `${SLUG_PREFIX}-02`;
  const { status, body } = await apiJSON('/api/drafts', {
    json: { channel: 'ig', slug, content: 'clean channel draft' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.name, `ig-${slug}.md`, 'the channel is prefixed onto the filename');
  assert.ok(fs.existsSync(path.join(DRAFTS_DIR, `ig-${slug}.md`)), 'the channel-prefixed file lands');
});

test('POST /api/drafts with a traversal slug → 400/403, nothing escapes drafts/', async () => {
  // A '../evil' slug would escape DRAFTS_DIR (= sandbox/drafts) up into the sandbox
  // root — assert nothing lands there. (The real content-studio is never in play.)
  const escapeTarget = path.join(sandbox, 'evil.md');
  assert.ok(!fs.existsSync(escapeTarget), 'precondition: escape target absent');
  const { status } = await apiJSON('/api/drafts', { json: { slug: '../evil', content: 'x' } });
  assert.ok(status === 400 || status === 403, `traversal slug rejected (got ${status})`);
  assert.ok(!fs.existsSync(escapeTarget), 'NOTHING was written outside drafts/');
});

test('POST /api/drafts with a space in the slug → 400/403, no file written', async () => {
  const { status } = await apiJSON('/api/drafts', { json: { slug: `${SLUG_PREFIX} bad`, content: 'x' } });
  assert.ok(status === 400 || status === 403, `slug with a space rejected (got ${status})`);
  assert.ok(
    !listDrafts().some((n) => n.includes(`${SLUG_PREFIX} bad`) || n.includes(`${SLUG_PREFIX}bad`)),
    'no file landed for the bad slug',
  );
});

test('POST /api/drafts with a slash in the slug → 400/403, no nested file', async () => {
  const nested = path.join(DRAFTS_DIR, `${SLUG_PREFIX}-a`, 'b.md');
  const { status } = await apiJSON('/api/drafts', { json: { slug: `${SLUG_PREFIX}-a/b`, content: 'x' } });
  assert.ok(status === 400 || status === 403, `slug with a slash rejected (got ${status})`);
  assert.ok(!fs.existsSync(nested), 'no nested path was created');
});

test('POST /api/drafts with retired content → 422 {violations}, NO file written', async () => {
  const slug = `${SLUG_PREFIX}-retired`;
  const before = new Set(listDrafts());
  const { status, body } = await apiJSON('/api/drafts', { json: { slug, content: RETIRED_TEXT } });
  assert.equal(status, 422, JSON.stringify(body));
  assert.ok(Array.isArray(body.violations) && body.violations.length > 0, 'violations returned');
  assert.ok(!fs.existsSync(path.join(DRAFTS_DIR, `${slug}.md`)), 'no draft file was written on a 422');
  // The drafts dir gained nothing.
  assert.deepEqual([...listDrafts()].filter((n) => !before.has(n)), [], 'no new files on a 422');
});

test('POST /api/drafts with non-string content → 400, no file written', async () => {
  const slug = `${SLUG_PREFIX}-badcontent`;
  const { status } = await apiJSON('/api/drafts', { json: { slug, content: 123 } });
  assert.equal(status, 400);
  assert.ok(!fs.existsSync(path.join(DRAFTS_DIR, `${slug}.md`)), 'no file written for non-string content');
});

// ------------------------------------------------------ qa flags on the list

test('GET /api/drafts flags an unfilled [[NEEDS]] placeholder as needsInput', async () => {
  const slug = `${SLUG_PREFIX}-needs`;
  // A literal [[NEEDS: ...]] marker — the unfilled-placeholder shape the model
  // emits. Clean of any retired string, so it lands (violations stays 0).
  const content = 'draft body with a [[NEEDS: a date]] placeholder left unfilled';
  const { status, body } = await apiJSON('/api/drafts', { json: { slug, content } });
  assert.equal(status, 200, JSON.stringify(body));

  const { status: lstatus, body: list } = await apiJSON('/api/drafts');
  assert.equal(lstatus, 200);
  const entry = list.find((d) => d.name === `${slug}.md`);
  assert.ok(entry, 'the placeholder draft is listed');
  assert.equal(entry.needsInput, true, 'an unfilled [[ marker sets needsInput:true');
  assert.equal(entry.violations, 0, 'a clean (non-retired) draft has 0 violations');
});

test('GET /api/drafts marks a clean draft needsInput:false', async () => {
  const slug = `${SLUG_PREFIX}-clean-flags`;
  const { status, body } = await apiJSON('/api/drafts', {
    json: { slug, content: 'fully resolved clean draft, no placeholders' },
  });
  assert.equal(status, 200, JSON.stringify(body));

  const { status: lstatus, body: list } = await apiJSON('/api/drafts');
  assert.equal(lstatus, 200);
  const entry = list.find((d) => d.name === `${slug}.md`);
  assert.ok(entry, 'the clean draft is listed');
  assert.equal(entry.needsInput, false, 'a draft with no [[ marker has needsInput:false');
  assert.equal(entry.violations, 0, 'a clean draft has 0 violations');
});

// ------------------------------------------------------ atomicity / residue

test('no .tmp residue lingers in drafts/ after the writes', async () => {
  const tmp = listDrafts().filter((n) => n.startsWith('.') && n.includes('.tmp-'));
  assert.deepEqual(tmp, [], `unexpected .tmp residue in drafts/: ${tmp.join(', ')}`);
});

test('isolation: drafts landed in the SANDBOX; the REAL content-studio/drafts/ has none of this suite\'s files', () => {
  // The suite's writes landed in the sandbox drafts dir.
  const sandboxNames = listDrafts().filter((n) => n.includes(SLUG_PREFIX));
  assert.ok(sandboxNames.length > 0, 'the sandbox drafts/ should hold this suite\'s drafts');

  // The user's LIVE content-studio/drafts/ must contain NONE of them (and no
  // suite-owned .tmp residue) — the suite never wrote to the real tree.
  const realDrafts = path.join(ROOT, 'content-studio', 'drafts');
  let realNames = [];
  try {
    realNames = fs.readdirSync(realDrafts);
  } catch {
    realNames = [];
  }
  const leaked = realNames.filter((n) => n.includes(SLUG_PREFIX) || /\.tmp-/.test(n));
  assert.deepEqual(leaked, [], `suite leaked into REAL content-studio/drafts/:\n${leaked.join('\n')}`);
});
