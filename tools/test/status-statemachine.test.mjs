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
  apiJSON,
  startServer,
  stopServer,
  snapshot,
  restoreSnapshot,
  acquireStatusSection,
  releaseStatusSection,
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
  // Acquire BEFORE snapshotting so the snapshot captures a stable, sibling-
  // restored status.json — not a mid-run state.
  await acquireStatusSection();
  snap = snapshot();
  await startServer();
});

after(async () => {
  await stopServer();
  restoreSnapshot(snap);
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

// ------------------------------------------------- residue / tree cleanliness

test('zz residue: restore leaves no __sm_test_ entries in status.json', async () => {
  restoreSnapshot(snap);
  // After restore, the live store must hold none of this file's test ids.
  const raw = fs.readFileSync(STATUS_ABS, 'utf8');
  assert.ok(!raw.includes('__sm_test_'), 'status.json still carries __sm_test_ residue after restore');
});
