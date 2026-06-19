// comments.test.mjs — the comments write surface (the 4th path) and its guard.
//
// POST /api/comments upserts a design pin into content-studio/design-comments.json
// and regenerates DESIGN_FEEDBACK.md. Text is brand-guarded server-side: a
// retired string is 422 unless override:true (recorded on the comment). Same
// runtime-built retired string as api.test.mjs — never a hard-coded literal.
//
// CONTENT SANDBOX: the server is spawned with STUDIO_CONTENT_DIR pointed at a
// throwaway COPY of content-studio (makeContentSandbox), so every read/write of
// design-comments.json + DESIGN_FEEDBACK.md hits the sandbox and the user's LIVE
// content-studio/ is never touched. All file assertions read the SANDBOX paths.
// The sandbox is rmSync'd in after(); because each test file gets its OWN sandbox
// the cross-file section lock on design-comments.json is no longer needed.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { RETIRED, scanTextRetired } from '../check-facts.mjs';
import { renderFeedbackDigest } from '../lib/feedback.mjs';
import {
  setPort,
  apiJSON,
  startServer,
  stopServer,
  spawnServerOnce,
  makeContentSandbox,
  removeContentSandbox,
} from './helpers.mjs';

// Own port (api.test.mjs uses 8099) so node:test can run the files concurrently.
setPort(8097);

const firstLiteral = RETIRED.find((r) => typeof r.bad === 'string').bad;
const RETIRED_TEXT = `studio comment marker ${firstLiteral} end`;

// A real file under the repo root — validateAssetRef requires the source to
// resolve to an existing FILE (no body-supplied traversal). This is a real-repo
// path (design-system/), unaffected by the content sandbox.
const REAL_SOURCE = 'design-system/collateral/launch-grid.html';

function pin(text, extra = {}) {
  return {
    comment: {
      text,
      assetRef: {
        assetId: 'studio-test/comment',
        source: REAL_SOURCE,
        anchor: { type: 'normalized', x: 0.5, y: 0.5 },
      },
    },
    ...extra,
  };
}

// The sandbox content dir + the two files this suite asserts against, INSIDE it.
let sandbox;
let COMMENTS_ABS;
let FEEDBACK_ABS;

before(async () => {
  sandbox = makeContentSandbox();
  COMMENTS_ABS = path.join(sandbox, 'design-comments.json');
  FEEDBACK_ABS = path.join(sandbox, 'DESIGN_FEEDBACK.md');
  assert.ok(scanTextRetired(RETIRED_TEXT).length > 0);
  await startServer({ contentDir: sandbox });
});

after(async () => {
  await stopServer();
  removeContentSandbox(sandbox);
});

test('comments: create with a clean pin → 200 and lands in the store', async () => {
  const { status, body } = await apiJSON('/api/comments', { json: pin('please tighten this headline') });
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(body.id, 'a created comment has a uuid');
  assert.equal(body.overridden, false);
  const store = JSON.parse(fs.readFileSync(COMMENTS_ABS, 'utf8'));
  assert.ok(store.comments.some((c) => c.id === body.id), 'comment persisted to store');

  // The digest regenerates on every write. existsSync is vacuous (the sandbox
  // ships a DESIGN_FEEDBACK.md already), so assert BYTE-EQUALITY instead: the file
  // on disk must equal renderFeedbackDigest recomputed from the post-write JSON of
  // record. This proves the server actually regenerated the digest FROM this exact
  // store (not a stale leftover) and that lib/feedback.mjs is the single format
  // source with no drift.
  const onDisk = fs.readFileSync(FEEDBACK_ABS, 'utf8');
  const want = renderFeedbackDigest(store);
  assert.equal(onDisk, want, 'DESIGN_FEEDBACK.md must be byte-identical to renderFeedbackDigest(store)');
});

test('comments: retired text without override → 422 + violations, store unchanged', async () => {
  const before = fs.readFileSync(COMMENTS_ABS);
  const { status, body } = await apiJSON('/api/comments', { json: pin(RETIRED_TEXT) });
  assert.equal(status, 422, JSON.stringify(body));
  assert.ok(Array.isArray(body.violations) && body.violations.length > 0);
  assert.deepEqual(fs.readFileSync(COMMENTS_ABS), before, 'store must not change on a 422');
});

test('comments: retired text WITH override → 200 and overridden:true is recorded', async () => {
  const { status, body } = await apiJSON('/api/comments', { json: pin(RETIRED_TEXT, { override: true }) });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.overridden, true, 'override is recorded on the comment');
});

test('comments: assetRef.source that does not resolve to a real file → 400', async () => {
  const { status, body } = await apiJSON('/api/comments', {
    json: {
      comment: {
        text: 'x',
        assetRef: {
          assetId: 'studio-test/comment',
          source: 'design-system/this-does-not-exist-zz.html',
          anchor: { type: 'normalized', x: 0.5, y: 0.5 },
        },
      },
    },
  });
  assert.equal(status, 400, JSON.stringify(body));
  assert.match(body.error, /existing file/i);
});

test('comments: missing text on create → 400', async () => {
  const { status } = await apiJSON('/api/comments', {
    json: {
      comment: {
        assetRef: { assetId: 'a', source: REAL_SOURCE, anchor: { type: 'normalized', x: 0.1, y: 0.1 } },
      },
    },
  });
  assert.equal(status, 400);
});

// ----------------------------------- Contract B: comments digest self-heal on boot
//
// DESIGN_FEEDBACK.md is a DERIVED view of design-comments.json (the JSON is the
// record). persistComments writes the JSON then the digest in two steps, so a crash
// between them leaves the digest stale. At startup the server regenerates the digest
// from the JSON of record: want = renderFeedbackDigest(loadComments()); if the file
// on disk differs, it rewrites it (and logs a one-line notice). In the NORMAL case
// (the committed digest already matches the committed JSON) boot writes nothing.
//
// These two tests boot a FRESH, isolated server on its OWN port (8095 — distinct
// from this file's singleton 8097, smoke.mjs 8098, and every other suite port),
// POINTED AT THE SAME SANDBOX, so the self-heal runs against the sandbox files we
// set up. Because the files are in the sandbox there is nothing live to restore —
// the whole sandbox is discarded in after().

// Corruption-safe load of the comment store from the SANDBOX, byte-identical in
// behaviour to the server's loadComments (bad/missing JSON → empty store). The
// digest the server self-heals TO is renderFeedbackDigest of exactly this.
function loadCommentsFromDisk() {
  let raw = null;
  try {
    raw = fs.readFileSync(COMMENTS_ABS, 'utf8');
  } catch {
    return { version: 1, comments: [] };
  }
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && Array.isArray(v.comments)) return v;
  } catch {
    /* corrupt → empty store */
  }
  return { version: 1, comments: [] };
}

test('contract B: a fresh boot regenerates a GARBAGE DESIGN_FEEDBACK.md from the JSON of record', async () => {
  // What the server must converge the digest to: the digest of the JSON on disk.
  const want = renderFeedbackDigest(loadCommentsFromDisk());
  let srv = null;
  try {
    // Corrupt the digest so it is provably out of sync with the JSON.
    fs.writeFileSync(FEEDBACK_ABS, 'GARBAGE not a valid digest @@@\n');
    assert.notEqual(fs.readFileSync(FEEDBACK_ABS, 'utf8'), want, 'precondition: digest starts out of sync');

    // Boot a fresh isolated server on the SAME sandbox — the self-heal runs once,
    // at boot.
    srv = await spawnServerOnce(8095, { contentDir: sandbox });

    // The digest on disk must now equal the regeneration from the JSON of record.
    assert.equal(
      fs.readFileSync(FEEDBACK_ABS, 'utf8'),
      want,
      'boot must regenerate DESIGN_FEEDBACK.md from design-comments.json',
    );
  } finally {
    if (srv) await srv.stop();
  }
});

test('contract B: a normal boot (digest already in sync) does NOT change DESIGN_FEEDBACK.md bytes', async () => {
  let srv = null;
  try {
    // First put the digest in sync with the JSON of record (what a committed,
    // self-consistent tree looks like). This is itself the want bytes.
    const want = renderFeedbackDigest(loadCommentsFromDisk());
    fs.writeFileSync(FEEDBACK_ABS, want);
    const beforeBoot = fs.readFileSync(FEEDBACK_ABS); // exact bytes pre-boot

    // Boot a fresh isolated server — with an in-sync digest this must be a no-op.
    srv = await spawnServerOnce(8095, { contentDir: sandbox });

    assert.deepEqual(
      fs.readFileSync(FEEDBACK_ABS),
      beforeBoot,
      'an in-sync digest must survive boot byte-for-byte (no-op self-heal)',
    );
  } finally {
    if (srv) await srv.stop();
  }
});
