// isolation.test.mjs — proves the WRITE suite can NEVER touch the user's live data.
//
// This is the single, dedicated assertion behind the whole content-sandbox effort.
// The user runs a LIVE studio on :8090 editing content-studio/* concurrently with
// the test run; the contract is that with STUDIO_CONTENT_DIR pointed at a throwaway
// COPY of content-studio, every server write (status patches, drafts, comment pins,
// FACTS, launch-grid) lands in the COPY and the REAL files are left byte-for-byte
// untouched.
//
// The test: capture the REAL content-studio/status.json mtime + sha256 BEFORE, run
// a server on a sandbox, drive REAL writes through it (a draft write + a status
// patch — two of the seven write paths), then capture the REAL status.json mtime +
// sha256 AFTER. They must be identical. (status.json is the canonical proof file:
// it is rewritten on every status patch, so if the env override were ignored this
// is the file that would change first.)
//
// node:test + node:assert + node:* only (no npm packages). Own port (8092) so it
// runs concurrently with the other suites without a bind collision.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  setPort,
  ROOT,
  apiJSON,
  rawGet,
  startServer,
  stopServer,
  makeContentSandbox,
  removeContentSandbox,
} from './helpers.mjs';

setPort(8092);

// The REAL (live) content-studio files this test guards. status.json is the
// canonical proof; the other two are belt-and-braces (a draft write + the digest
// regenerated alongside design-comments would touch these if the override failed).
const REAL_CS = path.join(ROOT, 'content-studio');
const REAL_STATUS = path.join(REAL_CS, 'status.json');
const REAL_DRAFTS = path.join(REAL_CS, 'drafts');

let sandbox;

// {sha, mtimeMs} of a file, or null if absent — a stable fingerprint to compare.
function fingerprint(abs) {
  try {
    const buf = fs.readFileSync(abs);
    const st = fs.statSync(abs);
    return { sha: crypto.createHash('sha256').update(buf).digest('hex'), mtimeMs: st.mtimeMs };
  } catch {
    return null;
  }
}

before(async () => {
  sandbox = makeContentSandbox();
  await startServer({ contentDir: sandbox });
});

after(async () => {
  await stopServer();
  removeContentSandbox(sandbox);
});

test('isolation: real writes through a sandboxed server leave the LIVE content-studio/status.json byte-identical', async () => {
  // Fingerprint the LIVE status.json BEFORE any write.
  const before = fingerprint(REAL_STATUS);
  assert.ok(before, 'precondition: the live content-studio/status.json exists to guard');

  // Also fingerprint the live drafts dir listing so a stray draft would be caught.
  const draftsBefore = (() => {
    try {
      return fs.readdirSync(REAL_DRAFTS).sort();
    } catch {
      return [];
    }
  })();

  // Drive REAL writes through the sandboxed server: a status patch (rewrites
  // status.json) AND a draft write (creates drafts/<name>.md). Both 200.
  const patch = await apiJSON('/api/status', {
    json: { id: '__isolation_test/probe', patch: { status: 'draft' } },
  });
  assert.equal(patch.status, 200, `status patch should succeed: ${JSON.stringify(patch.body)}`);

  const draft = await apiJSON('/api/drafts', {
    json: { slug: 'isolation-test-probe', content: 'isolation probe body' },
  });
  assert.equal(draft.status, 200, `draft write should succeed: ${JSON.stringify(draft.body)}`);

  // The writes landed in the SANDBOX (proof the server actually wrote something).
  const sandboxStatus = fs.readFileSync(path.join(sandbox, 'status.json'), 'utf8');
  assert.ok(sandboxStatus.includes('__isolation_test/probe'), 'the patch landed in the sandbox status.json');
  assert.ok(
    fs.existsSync(path.join(sandbox, 'drafts', 'isolation-test-probe.md')),
    'the draft landed in the sandbox drafts/',
  );

  // The LIVE status.json is byte-for-byte and mtime unchanged.
  const after = fingerprint(REAL_STATUS);
  assert.ok(after, 'the live status.json must still exist after the run');
  assert.equal(after.sha, before.sha, 'LIVE content-studio/status.json sha256 changed — the sandbox leaked!');
  assert.equal(after.mtimeMs, before.mtimeMs, 'LIVE content-studio/status.json mtime changed — it was rewritten!');

  // The LIVE drafts dir gained nothing.
  const draftsAfter = (() => {
    try {
      return fs.readdirSync(REAL_DRAFTS).sort();
    } catch {
      return [];
    }
  })();
  assert.deepEqual(draftsAfter, draftsBefore, 'LIVE content-studio/drafts/ gained a file — the sandbox leaked!');
});

test('isolation: GET /content-studio/FACTS.md is served from the SANDBOX, not the live file', async () => {
  // The /content-studio static reroute must read from CONTENT_DIR (= the sandbox),
  // NOT from the live content-studio/. Plant a distinct marker into the SANDBOX
  // FACTS.md (this never touches the real file), then fetch it over the wire and
  // assert the sandbox bytes come back — and that the real file's bytes do NOT,
  // and the real file stays byte-identical (the live read path is not even hit).
  const sandboxFacts = path.join(sandbox, 'FACTS.md');
  const realFacts = path.join(REAL_CS, 'FACTS.md');
  const realBefore = fingerprint(realFacts);
  assert.ok(realBefore, 'precondition: the live FACTS.md exists');

  // A marker that is unique and provably NOT in the live FACTS.md.
  const marker = `SANDBOX-FACTS-MARKER-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const realFactsText = fs.readFileSync(realFacts, 'utf8');
  assert.ok(!realFactsText.includes(marker), 'precondition: marker absent from the live FACTS.md');
  fs.writeFileSync(sandboxFacts, `${realFactsText}\n${marker}\n`);

  const { status, text } = await rawGet('/content-studio/FACTS.md');
  assert.equal(status, 200, 'the reroute serves the file 200');
  assert.ok(text.includes(marker), 'the reroute returned the SANDBOX FACTS.md (marker present)');

  // The live file was neither served nor written.
  const realAfter = fingerprint(realFacts);
  assert.equal(realAfter.sha, realBefore.sha, 'the live FACTS.md must be byte-identical (never written)');
  assert.equal(realAfter.mtimeMs, realBefore.mtimeMs, 'the live FACTS.md mtime must be unchanged');
});
