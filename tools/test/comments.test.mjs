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
import { setPort, ROOT, apiJSON, startServer, stopServer, snapshot, restoreSnapshot } from './helpers.mjs';

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
  snap = snapshot();
  assert.ok(scanTextRetired(RETIRED_TEXT).length > 0);
  await startServer();
});

after(async () => {
  await stopServer();
  restoreSnapshot(snap);
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
