// status-statemachine.test.mjs — the status lifecycle state machine (POST /api/status).
//
// node:test + node:assert + node:* only (no npm packages). Spawns the real
// studio-server.mjs on its own port (8096 — distinct from api.test.mjs 8099 and
// comments.test.mjs 8097 so the files run concurrently).
//
// CONTENT SANDBOX: the server runs with STUDIO_CONTENT_DIR pointed at a throwaway
// COPY of content-studio (makeContentSandbox), so all of this file's status.json
// writes AND the Contract A review-gate comment pins land in the sandbox — never
// in the user's LIVE content-studio/. The sandbox is rmSync'd in after(), so there
// is no __sm_test_ / __rev_test residue to scrub from the real tree, and because
// each test file owns its OWN sandbox the cross-file section locks are gone.
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
  makeContentSandbox,
  removeContentSandbox,
} from './helpers.mjs';

// Own port (api.test.mjs 8099, comments.test.mjs 8097) so node:test can run the
// files concurrently without a bind collision.
setPort(8096);

// The sandbox content dir + status.json INSIDE it (the only on-disk file this
// suite reads directly; everything else is asserted via the live API).
let sandbox;
let STATUS_ABS;

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

before(async () => {
  // Spawn against a throwaway COPY of content-studio: every status.json write and
  // every Contract A comment pin lands in the sandbox, never the live tree.
  sandbox = makeContentSandbox();
  STATUS_ABS = path.join(sandbox, 'status.json');
  await startServer({ contentDir: sandbox });
});

after(async () => {
  await stopServer();
  removeContentSandbox(sandbox);
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

// --------------------------------------------------- reserved id + patch allow-list
//
// A reserved object key as the asset id (__proto__/constructor/prototype) would
// index store.assets[id] onto a prototype slot — the write silently no-ops and a
// lying 200 comes back. The server rejects those ids 400 BEFORE the queue. And the
// patch is allow-listed (status/scheduledFor/postedAt/notes + the wire-only guard
// flags); any other key is 400 so nothing unknown is merged onto the entry.

test('reserved id: POST /api/status id "__proto__" → 400, not a lying 200, nothing written', async () => {
  for (const bad of ['__proto__', 'constructor', 'prototype']) {
    const { status, body } = await setStatus(bad, { status: 'draft' });
    assert.equal(status, 400, `reserved id ${bad} must be 400, got ${status}: ${JSON.stringify(body)}`);
    // The store must not have gained an OWN entry under the reserved key.
    const all = await apiJSON('/api/status');
    assert.ok(
      !Object.prototype.hasOwnProperty.call(all.body.assets, bad),
      `reserved id ${bad} must not be persisted as an own key`,
    );
  }
});

test('patch allow-list: an unknown patch key → 400; legit fields still 200', async () => {
  const id = freshId('allowlist');

  // An unknown key is rejected outright (mirrors launch-grid/post).
  const bad = await setStatus(id, { status: 'draft', bogusKey: 'x' });
  assert.equal(bad.status, 400, `unknown patch key must be 400: ${JSON.stringify(bad.body)}`);
  assert.match(bad.body.error, /unknown patch keys/i);
  // The bad write created nothing.
  assert.equal(await readEntry(id), undefined, 'a rejected patch must not create the entry');

  // The legit fields (status + scheduledFor + notes + postedAt) all pass.
  const okWhen = '2026-08-01T10:00:00.000Z';
  const okPosted = '2026-08-02T10:00:00.000Z';
  const good = await setStatus(id, {
    status: 'scheduled',
    scheduledFor: okWhen,
    notes: 'a legit note',
    postedAt: okPosted,
  });
  assert.equal(good.status, 200, `legit patch fields must pass: ${JSON.stringify(good.body)}`);
  assert.equal(good.body.status, 'scheduled');
  assert.equal(good.body.scheduledFor, okWhen, 'scheduledFor persisted');
  assert.equal(good.body.notes, 'a legit note', 'notes persisted');
  assert.equal(good.body.postedAt, okPosted, 'postedAt persisted');
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

// Find a present (exists, NOT already stale) item whose surface source file
// exists too, so we can manufacture staleness by aging the export below the
// source mtime. Returns {id, pngAbs, sourceAbs}. The source is a REAL-repo
// design-system/brochures HTML (outside CONTENT_DIR — never the sandbox).
async function firstFreshPresentItemWithSource() {
  const m = await getManifest();
  for (const s of m.surfaces || []) {
    const sourceAbs = s.source ? path.join(ROOT, s.source) : null;
    if (!sourceAbs || !fs.existsSync(sourceAbs)) continue;
    for (const it of s.items || []) {
      if (it.exists === true && it.stale === false && it.png) {
        return { id: `${s.id}/${it.name}`, pngAbs: path.join(ROOT, it.png), sourceAbs };
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
  // PNG (gitignored, a REAL-repo file OUTSIDE content-studio so it is not in the
  // sandbox) is ALWAYS restored in finally, so the tree stays clean even if an
  // assertion throws. This id's status.json entry lives in the THROWAWAY sandbox,
  // so the post-test status restore below is belt-and-braces only — the sandbox is
  // discarded wholesale in after().
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
    // Belt-and-braces: put this id's SANDBOX status entry back to its pre-test
    // value. The sandbox is discarded in after(), so this only keeps the live API
    // state tidy for any later assertion in this same run.
    if (beforeStatus !== null) {
      await apiJSON('/api/status', { json: { id, patch: { status: beforeStatus, override: true, allowStale: true } } });
    }
  }
});

test('contract A positive (stale): scheduling a KNOWN-but-STALE asset → 409 stale-export; allowStale:true → 200', async () => {
  // The companion to the absent branch: the export EXISTS but is STALE (its source
  // is newer than the export). Manufacture it without touching bytes: age the
  // export PNG's mtime to be OLDER than its surface source file, so the manifest
  // computes stale=true (sourceStat.mtimeMs > exportStat.mtimeMs). The PNG is a
  // gitignored REAL-repo file OUTSIDE content-studio (so not in the sandbox); we
  // restore its original mtime in finally so the tree stays clean even on throw.
  const present = await firstFreshPresentItemWithSource();
  assert.ok(present, 'expected a present, non-stale manifest item whose source file exists');
  const { id, pngAbs, sourceAbs } = present;

  const pngStat = fs.statSync(pngAbs); // snapshot the export's real mtimes
  const srcStat = fs.statSync(sourceAbs);
  const before = await readEntry(id);
  const beforeStatus = before ? before.status : null;

  try {
    // Age the export to 60 s BEFORE the source's mtime → source is now newer → stale.
    const olderMs = srcStat.mtimeMs - 60_000;
    fs.utimesSync(pngAbs, olderMs / 1000, olderMs / 1000);

    // Confirm the manifest now reports this id as exists:true + stale:true.
    const m = await getManifest();
    let manItem = null;
    for (const s of m.surfaces || []) {
      for (const it of s.items || []) {
        if (`${s.id}/${it.name}` === id) manItem = it;
      }
    }
    assert.ok(manItem, `id ${id} must still be a known manifest item`);
    assert.equal(manItem.exists, true, 'the aged export must still read back as exists:true');
    assert.equal(manItem.stale, true, 'the aged export must read back as stale:true');

    // Stage to approved (not a guarded status) so the scheduled move is reachable.
    const toApproved = await apiJSON('/api/status', {
      json: { id, patch: { status: 'approved', override: true } },
    });
    assert.equal(toApproved.status, 200, `staging to approved should pass: ${JSON.stringify(toApproved.body)}`);

    // approved→scheduled is legal, but the export is STALE and no allowStale → 409.
    const blocked = await apiJSON('/api/status', { json: { id, patch: { status: 'scheduled' } } });
    assert.equal(blocked.status, 409, `stale asset → scheduled must 409: ${JSON.stringify(blocked.body)}`);
    assert.equal(blocked.body.reason, 'stale-export', 'the 409 carries reason:stale-export');
    assert.equal(blocked.body.id, id, 'the 409 echoes the offending id');
    assert.equal(blocked.body.to, 'scheduled', 'the 409 echoes the attempted status');
    assert.ok(blocked.body.assetState && blocked.body.assetState.known === true, 'assetState.known is true');
    assert.equal(blocked.body.assetState.exists, true, 'assetState.exists is true (present but stale)');
    assert.equal(blocked.body.assetState.stale, true, 'assetState.stale reflects the stale export');

    // Nothing was written: the stored status is still approved.
    const afterBlock = await readEntry(id);
    assert.equal(afterBlock.status, 'approved', 'a stale-export 409 must not mutate the stored status');

    // WITH allowStale:true the same legal approved→scheduled move now proceeds.
    const allowed = await apiJSON('/api/status', {
      json: { id, patch: { status: 'scheduled', allowStale: true } },
    });
    assert.equal(allowed.status, 200, `allowStale:true must let the stale move through: ${JSON.stringify(allowed.body)}`);
    assert.equal(allowed.body.status, 'scheduled', 'allowStale applied the scheduled status');
    assert.ok(!('allowStale' in allowed.body), 'allowStale must not persist on the entry');
  } finally {
    // Restore the export's original mtime (no byte change was ever made).
    fs.utimesSync(pngAbs, pngStat.atime, pngStat.mtime);
    // Belt-and-braces: restore this id's SANDBOX status entry (sandbox is discarded
    // in after(); this only keeps later in-run assertions tidy).
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
// The comments these tests create live in the SANDBOX design-comments.json, never
// the user's live store, and the sandbox is discarded in after(). The teardown
// test below still DELETEs them via the API to exercise the DELETE path. Comment
// assetIds use the '__rev_test/' prefix so the tally only ever sees this file's
// pins on this file's status ids.

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
  // Exercise the DELETE path and prove no orphaned __rev_test pins remain in the
  // SANDBOX store. (The sandbox is discarded wholesale in after(); this is the
  // DELETE-path coverage, not a residue backstop — there is no live store to dirty.)
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
//
// Sandboxing means this file's test ids (__sm_test_, __rev_test) only ever live
// inside the throwaway sandbox — proven two ways: (1) the SANDBOX status.json DOES
// carry them (the writes really happened, against the copy); (2) the REAL
// content-studio files carry NONE of them (the live tree was never touched). The
// dedicated isolation.test.mjs proves the real files are byte-for-byte unchanged;
// this is the cheap in-file guard that the suite wrote to the sandbox, not live.

test('zz residue: writes landed in the SANDBOX, and the REAL content-studio carries none of this file\'s ids', () => {
  // (1) The sandbox status.json actually received this file's writes.
  const sandboxStatus = fs.readFileSync(STATUS_ABS, 'utf8');
  assert.ok(sandboxStatus.includes('__sm_test_'), 'sandbox status.json should hold this file\'s writes');

  // (2) The REAL content-studio files (the user's live data) hold NONE of this
  // file's test ids — the suite never wrote to them.
  const realCS = path.join(ROOT, 'content-studio');
  const realStatus = fs.readFileSync(path.join(realCS, 'status.json'), 'utf8');
  assert.ok(!realStatus.includes('__sm_test_'), 'REAL status.json must not carry __sm_test_ residue');
  assert.ok(!realStatus.includes('__rev_test'), 'REAL status.json must not carry __rev_test residue');
  const realComments = fs.readFileSync(path.join(realCS, 'design-comments.json'), 'utf8');
  assert.ok(!realComments.includes('__rev_test'), 'REAL design-comments.json must not carry __rev_test residue');
  const realDigest = fs.readFileSync(path.join(realCS, 'DESIGN_FEEDBACK.md'), 'utf8');
  assert.ok(!realDigest.includes('__rev_test'), 'REAL DESIGN_FEEDBACK.md must not carry __rev_test residue');
});
