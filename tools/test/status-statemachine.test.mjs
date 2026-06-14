// status-statemachine.test.mjs — the status lifecycle state machine (POST /api/status).
//
// node:test + node:assert + node:* only (no npm packages). Spawns the real
// studio-server.mjs on its own port (8096 — distinct from api.test.mjs 8099 and
// comments.test.mjs 8097 so the files run concurrently), snapshots the six write
// paths in before(), and restores them byte-for-byte in after() so the repo tree
// stays clean — no __sm_test_ residue in status.json.
//
// Asserts THE STATE-MACHINE CONTRACT exactly:
//   • Allowed without override: draft→approved, approved→scheduled,
//     scheduled→posted, ANY→retired, retired→draft (revive).
//   • A brand-NEW id may be set to ANY status (creation, history[0].from===null).
//   • Setting the SAME status again is an idempotent no-op (no new history entry).
//   • Any OTHER move between two existing statuses (skips, all backward moves) →
//     409 {error, from, to, legalNext} and NO write, UNLESS override:true (then
//     applied + history entry marked overridden:true).
//   • Append-only history: {from, to, at} on every real change.
//   • scheduledFor: a valid ISO string is stored; an invalid one → 400, no write.
//
// Each test uses a fresh unique id (prefix '__sm_test_') so the cases never
// collide with each other, with the sibling files, or with prior runs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  setPort,
  ROOT,
  api,
  apiJSON,
  startServer,
  stopServer,
  snapshot,
  restoreSnapshot,
  acquireStatusSection,
  releaseStatusSection,
  acquireCommentsSection,
  releaseCommentsSection,
} from './helpers.mjs';

// Own port (api.test.mjs 8099, comments.test.mjs 8097) so node:test can run the
// files concurrently without a bind collision.
setPort(8096);

const STATUS_ABS = path.join(ROOT, 'content-studio', 'status.json');

// A fresh, unique asset id per test so no two cases ever touch the same entry.
let seq = 0;
const freshId = (label) => `__sm_test_/${label}-${Date.now()}-${seq++}`;

// POST a patch for `id` and return {status, body}.
const setStatus = (id, patch) => apiJSON('/api/status', { json: { id, patch } });

// Read the whole store back from the live API (proves what was persisted).
async function readEntry(id) {
  const { body } = await apiJSON('/api/status');
  return body.assets[id];
}

let snap;

before(async () => {
  // status.json is a SHARED file; hold the cross-process section lock for this
  // file's whole run so it never overlaps api.test.mjs on it (see helpers.mjs).
  // Contract A's review-gate cases also write design-comments.json (comment pins
  // that drive the open-comments tally), which comments.test.mjs writes too, so
  // hold THAT section for the whole run as well. Acquire BOTH before snapshotting
  // so the snapshot captures a stable, sibling-restored state — not a mid-run one.
  await acquireStatusSection();
  await acquireCommentsSection();
  snap = snapshot();
  await startServer();
});

after(async () => {
  await stopServer();
  restoreSnapshot(snap);
  releaseCommentsSection();
  releaseStatusSection();
});

// ----------------------------------------------------------------- creation

test('creation: a brand-new id may be set to any status directly (posted) → 200, history[0].from===null', async () => {
  const id = freshId('create-posted');
  const { status, body } = await setStatus(id, { status: 'posted' });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.status, 'posted');
  assert.ok(Array.isArray(body.history) && body.history.length === 1, 'creation seeds one history entry');
  assert.equal(body.history[0].from, null, 'creation history.from must be null');
  assert.equal(body.history[0].to, 'posted');
  assert.ok(body.history[0].at, 'history entry carries a timestamp');
  // A brand-new id is creation, NOT an overridden transition.
  assert.ok(!body.history[0].overridden, 'creation is not an override');
});

// --------------------------------------------------------- legal forward chain

test('legal forward chain on one id: draft→approved→scheduled→posted, each appends one history entry', async () => {
  const id = freshId('forward-chain');

  const created = await setStatus(id, { status: 'draft' });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  assert.equal(created.body.status, 'draft');
  assert.equal(created.body.history.length, 1);
  assert.equal(created.body.history[0].from, null);

  const chain = [
    ['approved', 'draft'],
    ['scheduled', 'approved'],
    ['posted', 'scheduled'],
  ];
  let expectedLen = 1;
  for (const [to, from] of chain) {
    const { status, body } = await setStatus(id, { status: to });
    assert.equal(status, 200, `${from}→${to} should be 200: ${JSON.stringify(body)}`);
    assert.equal(body.status, to);
    expectedLen += 1;
    assert.equal(body.history.length, expectedLen, `history should grow by one on ${from}→${to}`);
    const last = body.history[body.history.length - 1];
    assert.equal(last.from, from, `history.from for ${from}→${to}`);
    assert.equal(last.to, to, `history.to for ${from}→${to}`);
    assert.ok(!last.overridden, 'a legal forward move is not overridden');
  }
});

// --------------------------------------------------------------- any→retired

test('any→retired from several starting states → 200', async () => {
  for (const start of ['draft', 'approved', 'scheduled', 'posted']) {
    const id = freshId(`retire-from-${start}`);
    // Create directly at the start state (creation allows any status).
    const created = await setStatus(id, { status: start });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const { status, body } = await setStatus(id, { status: 'retired' });
    assert.equal(status, 200, `${start}→retired should be 200: ${JSON.stringify(body)}`);
    assert.equal(body.status, 'retired');
    const last = body.history[body.history.length - 1];
    assert.equal(last.from, start);
    assert.equal(last.to, 'retired');
    assert.ok(!last.overridden, 'any→retired is a legal move, not an override');
  }
});

// ----------------------------------------------------------- retired→draft

test('retired→draft (revive) → 200', async () => {
  const id = freshId('revive');
  const created = await setStatus(id, { status: 'retired' });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const { status, body } = await setStatus(id, { status: 'draft' });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.status, 'draft');
  const last = body.history[body.history.length - 1];
  assert.equal(last.from, 'retired');
  assert.equal(last.to, 'draft');
  assert.ok(!last.overridden, 'revive is a legal move, not an override');
});

// ----------------------------------------------------------------- idempotent

test('idempotent: setting the same status again → 200 and NO new history entry', async () => {
  const id = freshId('idempotent');
  const created = await setStatus(id, { status: 'approved' });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const lenAfterCreate = created.body.history.length;
  assert.equal(lenAfterCreate, 1);

  const again = await setStatus(id, { status: 'approved' });
  assert.equal(again.status, 200, JSON.stringify(again.body));
  assert.equal(again.body.status, 'approved');
  assert.equal(again.body.history.length, lenAfterCreate, 'same-status set must not append history');
});

// ---------------------------------------------------------------- illegal skip

test('illegal skip: draft→posted → 409 {error, from, to, legalNext}, status.json UNCHANGED', async () => {
  const id = freshId('skip');
  const created = await setStatus(id, { status: 'draft' });
  assert.equal(created.status, 200, JSON.stringify(created.body));

  const { status, body } = await setStatus(id, { status: 'posted' });
  assert.equal(status, 409, JSON.stringify(body));
  assert.ok(typeof body.error === 'string' && body.error.length, 'a 409 carries an error string');
  assert.equal(body.from, 'draft');
  assert.equal(body.to, 'posted');
  assert.ok(Array.isArray(body.legalNext), 'legalNext is an array');
  // legalNext for draft is exactly [approved, retired] (no posted).
  assert.deepEqual([...body.legalNext].sort(), ['approved', 'retired']);
  assert.ok(!body.legalNext.includes('posted'), 'posted is not a legal next from draft');

  // Re-GET proves nothing changed for this id: still draft, history of length 1.
  const entry = await readEntry(id);
  assert.equal(entry.status, 'draft', 'illegal skip must not mutate the stored status');
  assert.equal(entry.history.length, 1, 'illegal skip must not append history');
});

// ------------------------------------------------------------- illegal backward

test('illegal backward: posted→approved → 409, no write', async () => {
  const id = freshId('backward');
  const created = await setStatus(id, { status: 'posted' });
  assert.equal(created.status, 200, JSON.stringify(created.body));

  const { status, body } = await setStatus(id, { status: 'approved' });
  assert.equal(status, 409, JSON.stringify(body));
  assert.equal(body.from, 'posted');
  assert.equal(body.to, 'approved');
  assert.ok(Array.isArray(body.legalNext));
  // posted may only go to retired without an override.
  assert.deepEqual([...body.legalNext].sort(), ['retired']);

  const entry = await readEntry(id);
  assert.equal(entry.status, 'posted', 'backward move must not mutate the stored status');
  assert.equal(entry.history.length, 1, 'backward move must not append history');
});

// ------------------------------------------------------------------- override

test('override: an illegal transition with override:true → 200, applied, history marked overridden:true', async () => {
  const id = freshId('override');
  const created = await setStatus(id, { status: 'posted' });
  assert.equal(created.status, 200, JSON.stringify(created.body));

  // posted→approved is backward (illegal) but override forces it.
  const { status, body } = await apiJSON('/api/status', {
    json: { id, patch: { status: 'approved', override: true } },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.status, 'approved', 'override applies the forced transition');
  assert.equal(body.history.length, 2, 'override appends a history entry');
  const last = body.history[body.history.length - 1];
  assert.equal(last.from, 'posted');
  assert.equal(last.to, 'approved');
  assert.equal(last.overridden, true, 'a forced move is recorded with overridden:true');
  // The control flag is never persisted on the entry itself.
  assert.ok(!('override' in body), 'override is a control flag, not a stored field');
});

// ----------------------------------------------------------------- scheduledFor

test('scheduledFor: a valid ISO date → 200 stored on the entry', async () => {
  const id = freshId('sched-ok');
  const when = '2026-07-01T09:30:00.000Z';
  const { status, body } = await setStatus(id, { status: 'scheduled', scheduledFor: when });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.status, 'scheduled');
  assert.equal(body.scheduledFor, when, 'scheduledFor is stored on the entry');
  // Re-GET proves it persisted.
  const entry = await readEntry(id);
  assert.equal(entry.scheduledFor, when);
});

test('scheduledFor: an invalid date string → 400, no write', async () => {
  const id = freshId('sched-bad');
  const { status, body } = await setStatus(id, { status: 'draft', scheduledFor: 'not-a-date' });
  assert.equal(status, 400, JSON.stringify(body));
  // The id must not exist (the bad scheduledFor is rejected before any write).
  const entry = await readEntry(id);
  assert.equal(entry, undefined, 'a 400 on scheduledFor must not create the entry');
});

// --------------------------------------------------------------- concurrency

test('concurrency: N parallel legal transitions on N distinct new ids all land', async () => {
  const N = 10;
  const ids = Array.from({ length: N }, () => freshId('concurrent'));
  // Two-step each: create at draft, then move draft→approved. All in parallel.
  // Each id is independent, so the serialized queue must land every write.
  await Promise.all(ids.map((id) => setStatus(id, { status: 'draft' })));
  await Promise.all(ids.map((id) => setStatus(id, { status: 'approved' })));

  const { body } = await apiJSON('/api/status');
  for (const id of ids) {
    const entry = body.assets[id];
    assert.ok(entry, `lost entry for ${id}`);
    assert.equal(entry.status, 'approved', `lost transition for ${id}`);
    assert.equal(entry.history.length, 2, `expected create+transition history for ${id}`);
    assert.equal(entry.history[0].from, null);
    assert.equal(entry.history[1].from, 'draft');
    assert.equal(entry.history[1].to, 'approved');
  }
});

// ---------------------------------------- Contract A: hard schedule→stale guard
//
// AFTER the transition-legality check passes (or is overridden), and ONLY when
// the resulting status is 'scheduled' or 'posted', the server looks up the
// asset's health in the LIVE manifest. If the id is a KNOWN manifest item and it
// is absent (exists===false) OR stale (exists && stale===true), the move is
// refused 409 {reason:'stale-export'} and NOTHING is written — UNLESS the patch
// carries allowStale:true. allowStale is DISTINCT from override (override bypasses
// the transition-legality guard; allowStale bypasses ONLY the stale-export guard)
// and is a control flag, never persisted on the stored entry.
//
// Crucially the stale guard is SCOPED to known manifest ids only: an abstract
// '__sm_test_' id never appears in any surface's items, so it is exempt and the
// whole existing state-machine suite above keeps passing. The first test pins
// that scoping as the critical regression guard.

// Pull the live manifest as the server sees it (same shape the guard reads).
async function getManifest() {
  const res = await api('/api/manifest');
  return res.json();
}

// Find a present manifest item we can manufacture-absent: returns {id, pngAbs}.
async function firstPresentItem() {
  const m = await getManifest();
  for (const s of m.surfaces || []) {
    for (const it of s.items || []) {
      if (it.exists === true && it.png) {
        return { id: `${s.id}/${it.name}`, pngAbs: path.join(ROOT, it.png) };
      }
    }
  }
  return null;
}

test('contract A scoping: an UNKNOWN abstract id scheduled WITHOUT allowStale still works (stale guard is manifest-scoped)', async () => {
  // This is the regression guard for the whole suite above: a '__sm_test_' id is
  // not a manifest item, so the stale-export guard must NOT apply to it. Without
  // this exemption the existing draft→approved→scheduled chains would 409.
  const id = freshId('contractA-unknown');
  const created = await setStatus(id, { status: 'draft' });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const approved = await setStatus(id, { status: 'approved' });
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  // scheduled is the guarded status — an unknown id must still pass with NO flag.
  const { status, body } = await setStatus(id, { status: 'scheduled' });
  assert.equal(status, 200, `unknown id → scheduled must pass without allowStale: ${JSON.stringify(body)}`);
  assert.equal(body.status, 'scheduled');
});

test('contract A scoping: an UNKNOWN abstract id set straight to posted (creation) is exempt from the stale guard', async () => {
  // Creation to a guarded status (posted) on a non-manifest id must also pass —
  // the guard only fires for KNOWN manifest items, never abstract test ids.
  const id = freshId('contractA-unknown-posted');
  const { status, body } = await setStatus(id, { status: 'posted' });
  assert.equal(status, 200, `unknown id → posted (creation) must pass without allowStale: ${JSON.stringify(body)}`);
  assert.equal(body.status, 'posted');
});

test('contract A positive (absent): scheduling a KNOWN-but-absent asset → 409 stale-export; allowStale:true → 200', async () => {
  // On this worktree exports are present, so MANUFACTURE an absent asset
  // deterministically: pick a present manifest item, snapshot + delete its export
  // PNG so the live manifest reports exists:false, then exercise the guard. The
  // PNG (gitignored) is ALWAYS restored in finally, so the tree stays clean even
  // if an assertion throws. status.json for this id is restored from the suite
  // snapshot afterwards (the zz residue test re-restores the whole surface).
  const present = await firstPresentItem();
  assert.ok(present, 'expected at least one present manifest item to manufacture an absent one');
  const { id, pngAbs } = present;

  const pngBytes = fs.readFileSync(pngAbs); // snapshot the real export bytes
  const before = await readEntry(id); // whatever status this real id already had
  const beforeStatus = before ? before.status : null;

  try {
    fs.rmSync(pngAbs, { force: true }); // now the manifest reports exists:false

    // Confirm the manifest actually flipped to absent for this id (the guard's
    // input). If it did not, the rest of the assertions would be meaningless.
    const m = await getManifest();
    let manItem = null;
    for (const s of m.surfaces || []) {
      for (const it of s.items || []) {
        if (`${s.id}/${it.name}` === id) manItem = it;
      }
    }
    assert.ok(manItem, `id ${id} must still be a known manifest item`);
    assert.equal(manItem.exists, false, 'the deleted export must read back as exists:false');

    // Drive the id to a legal pre-scheduled state WITHOUT tripping the guard:
    // approved is not a guarded status, so this write always lands. Use override
    // so we reach 'approved' regardless of the id's current real status.
    const toApproved = await apiJSON('/api/status', {
      json: { id, patch: { status: 'approved', override: true } },
    });
    assert.equal(toApproved.status, 200, `staging to approved should pass: ${JSON.stringify(toApproved.body)}`);

    // approved→scheduled is a LEGAL transition, but the asset is absent and we
    // pass NO allowStale → the stale-export guard must refuse it 409, no write.
    const blocked = await apiJSON('/api/status', { json: { id, patch: { status: 'scheduled' } } });
    assert.equal(blocked.status, 409, `absent asset → scheduled must 409: ${JSON.stringify(blocked.body)}`);
    assert.equal(blocked.body.reason, 'stale-export', 'the 409 carries reason:stale-export');
    assert.equal(blocked.body.id, id, 'the 409 echoes the offending id');
    assert.equal(blocked.body.to, 'scheduled', 'the 409 echoes the attempted status');
    assert.ok(blocked.body.assetState && blocked.body.assetState.known === true, 'assetState.known is true');
    assert.equal(blocked.body.assetState.exists, false, 'assetState.exists reflects the absent export');

    // The blocked move wrote NOTHING: the stored status is still approved.
    const afterBlock = await readEntry(id);
    assert.equal(afterBlock.status, 'approved', 'a stale-export 409 must not mutate the stored status');

    // override:true (transition guard) but NOT allowStale (stale guard) → still
    // 409 stale-export: override does not bypass the stale guard. (We are already
    // at approved, so re-scheduling with override only proves the independence.)
    const overrideOnly = await apiJSON('/api/status', {
      json: { id, patch: { status: 'scheduled', override: true } },
    });
    assert.equal(overrideOnly.status, 409, `override alone must NOT bypass the stale guard: ${JSON.stringify(overrideOnly.body)}`);
    assert.equal(overrideOnly.body.reason, 'stale-export', 'override-only still trips the stale guard');
    const afterOverride = await readEntry(id);
    assert.equal(afterOverride.status, 'approved', 'override-only stale 409 must not write either');

    // WITH allowStale:true the same legal approved→scheduled move now proceeds.
    const allowed = await apiJSON('/api/status', {
      json: { id, patch: { status: 'scheduled', allowStale: true } },
    });
    assert.equal(allowed.status, 200, `allowStale:true must let the move through: ${JSON.stringify(allowed.body)}`);
    assert.equal(allowed.body.status, 'scheduled', 'allowStale applied the scheduled status');
    // allowStale is a control flag — never persisted on the stored entry.
    assert.ok(!('allowStale' in allowed.body), 'allowStale must not persist on the entry');
  } finally {
    fs.writeFileSync(pngAbs, pngBytes); // restore the gitignored export, identical
    // Restore this real id's status entry to its pre-test value so the suite
    // leaves status.json clean (the zz residue test also re-restores the whole
    // surface from the before() snapshot).
    if (beforeStatus !== null) {
      await apiJSON('/api/status', { json: { id, patch: { status: beforeStatus, override: true, allowStale: true } } });
    }
  }
});

// --------------------------------------------- Contract A: review gate (approve)
//
// AFTER the legality + stale-export guards, and ONLY when the RESULTING status is
// 'approved' on a real write (creation-to-approved counts), the server tallies the
// asset's OPEN design comments. If any are open the approve is refused 409
// {reason:'open-comments', id, to:'approved', openCount} and NOTHING is written —
// UNLESS the patch carries allowOpenComments:true. This flag is DISTINCT from
// override (legality) and allowStale (stale-export): none implies another, and it
// is never persisted on the stored entry. The gate is independent of the stale
// guard (which fires only for scheduled/posted) and of the legality guard (override
// forces an illegal move but does NOT bypass this gate). Resolved/wontfix comments
// do not count as open, so they never block.
//
// The comments these tests create live in design-comments.json (a LIVE owner file
// also covered by the before() snapshot), so they are DELETEd via the API in a
// finally and the whole write surface is restored from the snapshot afterwards.
// Comment assetIds use the '__rev_test/' prefix so the tally only ever sees this
// file's pins on this file's status ids.

// A real source file under the repo root — validateAssetRef requires the comment's
// assetRef.source to resolve to an existing FILE (already used by comments.test.mjs).
const REV_SOURCE = 'design-system/collateral/launch-grid.html';

// Track every comment id this file creates so the finally below removes each one.
const createdCommentIds = [];

// Create an OPEN design comment for `assetId` and return its uuid (also tracked).
async function createOpenComment(assetId) {
  const { status, body } = await apiJSON('/api/comments', {
    json: {
      comment: {
        text: `review-gate fixture for ${assetId}`,
        assetRef: {
          assetId,
          source: REV_SOURCE,
          anchor: { type: 'normalized', x: 0.5, y: 0.5 },
        },
      },
    },
  });
  assert.equal(status, 200, `comment create should succeed: ${JSON.stringify(body)}`);
  assert.ok(body.id, 'a created comment carries a uuid');
  assert.equal((body.status || 'open'), 'open', 'a fresh comment defaults to open');
  createdCommentIds.push(body.id);
  return body.id;
}

// Flip a comment to a non-open status (resolved/wontfix) via the upsert path
// (POST /api/comments with {id, status}) — the exact status-only edit shape.
async function setCommentStatus(commentId, commentStatus) {
  const { status, body } = await apiJSON('/api/comments', {
    json: { comment: { id: commentId, status: commentStatus } },
  });
  assert.equal(status, 200, `comment status edit should succeed: ${JSON.stringify(body)}`);
  assert.equal(body.status, commentStatus, 'the comment carries the new status');
}

test('contract A: approve with an OPEN comment → 409 open-comments; allowOpenComments:true → 200', async () => {
  const id = '__rev_test/a';
  await createOpenComment(id);

  // Creation-to-approved is a real write to 'approved' → the gate must fire.
  const blocked = await setStatus(id, { status: 'approved' });
  assert.equal(blocked.status, 409, `open comment must block approve: ${JSON.stringify(blocked.body)}`);
  assert.equal(blocked.body.reason, 'open-comments', 'the 409 carries reason:open-comments');
  assert.equal(blocked.body.id, id, 'the 409 echoes the offending id');
  assert.equal(blocked.body.to, 'approved', 'the 409 echoes the attempted status');
  assert.ok(blocked.body.openCount >= 1, 'openCount reflects the open comment(s)');

  // The blocked approve wrote NOTHING: the id must not exist in status.json yet.
  const afterBlock = await readEntry(id);
  assert.equal(afterBlock, undefined, 'a blocked approve must not create the entry');

  // allowOpenComments:true is the distinct bypass → the same approve now lands.
  const allowed = await apiJSON('/api/status', {
    json: { id, patch: { status: 'approved', allowOpenComments: true } },
  });
  assert.equal(allowed.status, 200, `allowOpenComments:true must let approve through: ${JSON.stringify(allowed.body)}`);
  assert.equal(allowed.body.status, 'approved', 'allowOpenComments applied the approved status');
  // The control flag is never persisted on the stored entry.
  assert.ok(!('allowOpenComments' in allowed.body), 'allowOpenComments must not persist on the entry');
});

test('contract A: a RESOLVED comment does not block approve → 200 (resolved/wontfix are not open)', async () => {
  const id = '__rev_test/b';
  const commentId = await createOpenComment(id);
  // Resolve it: the tally for this id drops to zero open.
  await setCommentStatus(commentId, 'resolved');

  // Approve a FRESH id whose only comment is resolved → the gate must not fire.
  const { status, body } = await setStatus(id, { status: 'approved' });
  assert.equal(status, 200, `a resolved-only asset must approve cleanly: ${JSON.stringify(body)}`);
  assert.equal(body.status, 'approved');
});

test('contract A independence: the gate does NOT fire for a non-approved target (open comment → retired) → 200', async () => {
  const id = '__rev_test/c';
  await createOpenComment(id);
  // Creation straight to 'retired' is a real write but the target is not approved,
  // so the open-comments gate is irrelevant and the move lands.
  const { status, body } = await setStatus(id, { status: 'retired' });
  assert.equal(status, 200, `open comment must not block a non-approved target: ${JSON.stringify(body)}`);
  assert.equal(body.status, 'retired');
});

test('contract A independence: override (legality) does NOT bypass the open-comments gate → 409', async () => {
  const id = '__rev_test/d';
  await createOpenComment(id);
  // Create at 'posted'; posted→approved is an illegal (backward) transition.
  const created = await setStatus(id, { status: 'posted' });
  assert.equal(created.status, 200, JSON.stringify(created.body));

  // override:true forces the illegal transition past the legality guard, but the
  // open-comments gate is independent and must still refuse the approve.
  const { status, body } = await apiJSON('/api/status', {
    json: { id, patch: { status: 'approved', override: true } },
  });
  assert.equal(status, 409, `override must not bypass the open-comments gate: ${JSON.stringify(body)}`);
  assert.equal(body.reason, 'open-comments', 'override-only approve still trips the open-comments gate');
  assert.ok(body.openCount >= 1, 'openCount reflects the open comment');

  // Nothing was written: the stored status is still posted.
  const entry = await readEntry(id);
  assert.equal(entry.status, 'posted', 'an open-comments 409 must not mutate the stored status');
});

test('contract A teardown: delete every __rev_test comment created by this file', async () => {
  // Remove the design pins this file added so design-comments.json + the digest
  // return to their pre-test shape (the snapshot restore in after() and the zz
  // residue test below are the byte-exact backstops; this exercises the DELETE
  // path and proves no orphaned __rev_test pins remain in the live store).
  for (const cid of createdCommentIds) {
    const { status } = await apiJSON(`/api/comments/${cid}`, { method: 'DELETE' });
    assert.ok(status === 200 || status === 404, `DELETE of ${cid} should resolve cleanly (got ${status})`);
  }
  const { body } = await apiJSON('/api/comments');
  const residue = (body.comments || []).filter(
    (c) => c.assetRef && typeof c.assetRef.assetId === 'string' && c.assetRef.assetId.startsWith('__rev_test/'),
  );
  assert.equal(residue.length, 0, 'no __rev_test comment pins may remain after teardown');
});

// ------------------------------------------------- residue / tree cleanliness

test('zz residue: restore leaves no __sm_test_ or __rev_test residue in the write surface', async () => {
  restoreSnapshot(snap);
  // After restore, the live store must hold none of this file's test ids.
  const raw = fs.readFileSync(STATUS_ABS, 'utf8');
  assert.ok(!raw.includes('__sm_test_'), 'status.json still carries __sm_test_ residue after restore');
  assert.ok(!raw.includes('__rev_test'), 'status.json still carries __rev_test residue after restore');
  // design-comments.json + DESIGN_FEEDBACK.md are part of the same snapshot — the
  // Contract A pins above must not survive the restore either.
  const commentsRaw = fs.readFileSync(path.join(ROOT, 'content-studio', 'design-comments.json'), 'utf8');
  assert.ok(!commentsRaw.includes('__rev_test'), 'design-comments.json still carries __rev_test residue after restore');
  const digestRaw = fs.readFileSync(path.join(ROOT, 'content-studio', 'DESIGN_FEEDBACK.md'), 'utf8');
  assert.ok(!digestRaw.includes('__rev_test'), 'DESIGN_FEEDBACK.md still carries __rev_test residue after restore');
});
