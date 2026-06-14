// comments.test.mjs — the comments write surface (the 4th path) and its guard.
//
// POST /api/comments upserts a design pin into content-studio/design-comments.json
// and regenerates DESIGN_FEEDBACK.md. Text is brand-guarded server-side: a
// retired string is 422 unless override:true (recorded on the comment). Same
// runtime-built retired string as api.test.mjs — never a hard-coded literal.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { RETIRED, scanTextRetired } from '../check-facts.mjs';
import { renderFeedbackDigest } from '../lib/feedback.mjs';
import {
  setPort,
  ROOT,
  apiJSON,
  startServer,
  stopServer,
  snapshot,
  restoreSnapshot,
  spawnServerOnce,
  acquireCommentsSection,
  releaseCommentsSection,
} from './helpers.mjs';

// Own port (api.test.mjs uses 8099) so node:test can run the files concurrently.
setPort(8097);

const firstLiteral = RETIRED.find((r) => typeof r.bad === 'string').bad;
const RETIRED_TEXT = `studio comment marker ${firstLiteral} end`;

// A real file under the repo root — validateAssetRef requires the source to
// resolve to an existing FILE (no body-supplied traversal).
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

let snap;

before(async () => {
  // design-comments.json (+ DESIGN_FEEDBACK.md) is SHARED with the review-gate
  // cases in status-statemachine.test.mjs; hold the cross-process section lock for
  // this file's whole run so the two never overlap on it (see helpers.mjs). Acquire
  // BEFORE snapshotting so the snapshot captures a stable, sibling-restored state.
  await acquireCommentsSection();
  snap = snapshot();
  assert.ok(scanTextRetired(RETIRED_TEXT).length > 0);
  await startServer();
});

after(async () => {
  await stopServer();
  restoreSnapshot(snap);
  releaseCommentsSection();
});

test('comments: create with a clean pin → 200 and lands in the store', async () => {
  const commentsAbs = path.join(ROOT, 'content-studio', 'design-comments.json');
  const { status, body } = await apiJSON('/api/comments', { json: pin('please tighten this headline') });
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(body.id, 'a created comment has a uuid');
  assert.equal(body.overridden, false);
  const store = JSON.parse(fs.readFileSync(commentsAbs, 'utf8'));
  assert.ok(store.comments.some((c) => c.id === body.id), 'comment persisted to store');
  // The digest regenerates on every write.
  const digestAbs = path.join(ROOT, 'content-studio', 'DESIGN_FEEDBACK.md');
  assert.ok(fs.existsSync(digestAbs), 'digest regenerated');
});

test('comments: retired text without override → 422 + violations, store unchanged', async () => {
  const commentsAbs = path.join(ROOT, 'content-studio', 'design-comments.json');
  const before = fs.readFileSync(commentsAbs);
  const { status, body } = await apiJSON('/api/comments', { json: pin(RETIRED_TEXT) });
  assert.equal(status, 422, JSON.stringify(body));
  assert.ok(Array.isArray(body.violations) && body.violations.length > 0);
  assert.deepEqual(fs.readFileSync(commentsAbs), before, 'store must not change on a 422');
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
// from this file's singleton 8097, smoke.mjs 8098, and every other suite port) so
// the self-heal actually runs against the file state we set up. DESIGN_FEEDBACK.md
// is a LIVE owner file: each test snapshots its CURRENT bytes and restores them
// EXACTLY in a finally, even if an assertion throws.

const FEEDBACK_ABS = path.join(ROOT, 'content-studio', 'DESIGN_FEEDBACK.md');
const COMMENTS_ABS = path.join(ROOT, 'content-studio', 'design-comments.json');

// Corruption-safe load of the comment store from disk, byte-identical in behaviour
// to the server's loadComments (bad/missing JSON → empty store). The digest the
// server self-heals TO is renderFeedbackDigest of exactly this.
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
  const feedbackBytes = fs.readFileSync(FEEDBACK_ABS); // snapshot CURRENT owner bytes
  // What the server must converge the digest to: the digest of the JSON on disk.
  const want = renderFeedbackDigest(loadCommentsFromDisk());
  let srv = null;
  try {
    // Corrupt the digest so it is provably out of sync with the JSON.
    fs.writeFileSync(FEEDBACK_ABS, 'GARBAGE not a valid digest @@@\n');
    assert.notEqual(fs.readFileSync(FEEDBACK_ABS, 'utf8'), want, 'precondition: digest starts out of sync');

    // Boot a fresh isolated server — the self-heal runs once, at boot.
    srv = await spawnServerOnce(8095);

    // The digest on disk must now equal the regeneration from the JSON of record.
    assert.equal(
      fs.readFileSync(FEEDBACK_ABS, 'utf8'),
      want,
      'boot must regenerate DESIGN_FEEDBACK.md from design-comments.json',
    );
  } finally {
    if (srv) await srv.stop();
    fs.writeFileSync(FEEDBACK_ABS, feedbackBytes); // restore owner bytes EXACTLY
  }
});

test('contract B: a normal boot (digest already in sync) does NOT change DESIGN_FEEDBACK.md bytes', async () => {
  const feedbackBytes = fs.readFileSync(FEEDBACK_ABS); // snapshot CURRENT owner bytes
  let srv = null;
  try {
    // First put the digest in sync with the JSON of record (what a committed,
    // self-consistent tree looks like). This is itself the want bytes.
    const want = renderFeedbackDigest(loadCommentsFromDisk());
    fs.writeFileSync(FEEDBACK_ABS, want);
    const beforeBoot = fs.readFileSync(FEEDBACK_ABS); // exact bytes pre-boot

    // Boot a fresh isolated server — with an in-sync digest this must be a no-op.
    srv = await spawnServerOnce(8095);

    assert.deepEqual(
      fs.readFileSync(FEEDBACK_ABS),
      beforeBoot,
      'an in-sync digest must survive boot byte-for-byte (no-op self-heal)',
    );
  } finally {
    if (srv) await srv.stop();
    fs.writeFileSync(FEEDBACK_ABS, feedbackBytes); // restore owner bytes EXACTLY
  }
});
