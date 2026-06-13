#!/usr/bin/env node
// studio-server.mjs — local server for the Eduflick Brand Studio.
//
//   cd tools && npm run studio       → http://localhost:8090/tools/studio/
//
// Serves the whole repo statically (via lib/static.mjs) plus a JSON API:
//
//   GET  /api/manifest             live-scanned asset manifest (nothing cached)
//   GET  /api/status               content-studio/status.json
//   POST /api/status               {id, patch} → merged entry (atomic write).
//                                  status changes obey a state machine (draft→
//                                  approved→scheduled→posted, any→retired,
//                                  retired→draft); an illegal move is 409 {error,
//                                  from, to, legalNext} unless patch.override. A
//                                  new id may take any status (creation). Every
//                                  real change appends to an append-only history
//                                  [{from, to, at, overridden?}] (from:null on
//                                  creation); same-status is an idempotent no-op.
//   GET  /api/actions              {running, lastRun} (lastRun survives restarts)
//   POST /api/actions/run          {action} → {id} | 409 busy | 400 unknown
//   GET  /api/actions/:id/stream   SSE log/exit events (replay + live)
//   GET  /api/tokens/status        mtime drift: token/snippet sources vs artifacts
//   POST /api/editmode             {file, edits} → EDITMODE block rewrite
//   POST /api/facts/check          {content} → {violations}
//   POST /api/facts/save           {content, override?} → guarded FACTS.md write
//   GET  /api/comments             content-studio/design-comments.json
//   POST /api/comments             {comment, override?} → upserted <Comment> (id+seq)
//   DELETE /api/comments/:id        delete a comment by UUID
//   GET  /api/launch-grid          {plan, slides} — launch-grid.json + caro-data island
//   POST /api/launch-grid/post     {id, patch, override?} → patch one launch post
//   POST /api/launch-grid/slides   {slug, slides, ..., override?} → rewrite one carousel
//   POST /api/export-zip           {files:[{src|text,name}], zipName?} → application/zip
//
// Write surface is exactly six paths: content-studio/status.json,
// content-studio/FACTS.md, content-studio/design-comments.json (which also
// regenerates content-studio/DESIGN_FEEDBACK.md), EDITMODE blocks inside
// design-system/*.html, content-studio/launch-grid.json, and the caro-data JSON
// island inside design-system/collateral/launch-grid.html. (export-zip is
// read-only.) Binds 127.0.0.1 only (loopback asserted at boot, exits
// on a busy port). Every request must carry a loopback Host header, and
// non-GET/HEAD /api calls with an Origin header must be same-origin — 403
// otherwise (DNS-rebinding + CSRF guards; no CORS headers are ever set).
// Writes are atomic AND durable (tmp file → fsync → rename). Actions get a
// watchdog timeout (STUDIO_ACTION_TIMEOUT_MS, default 15 min; SIGTERM then
// SIGKILL) and lastRun persists across restarts in tools/.studio-state.json.
// Port: STUDIO_PORT > PORT > 8090. Zero npm dependencies (built-ins).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createStaticHandler } from './lib/static.mjs';
import { scanTextRetired } from './check-facts.mjs';
import { renderFeedbackDigest } from './lib/feedback.mjs';
import { zipStore } from './lib/zip.mjs';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOLS, '..');
const PORT = Number(process.env.STUDIO_PORT || process.env.PORT || 8090);
const HOST = '127.0.0.1';

// Fail closed: the studio is a local tool and must never bind a routable
// address. Guards against a future edit quietly exposing the write surface.
if (!['127.0.0.1', 'localhost', '::1'].includes(HOST)) {
  console.error(`refusing to start: HOST ${HOST} is not loopback (127.0.0.1 / localhost / ::1)`);
  process.exit(1);
}

const STATUS_FILE = path.join(ROOT, 'content-studio', 'status.json');
const FACTS_FILE = path.join(ROOT, 'content-studio', 'FACTS.md');
const CAPTIONS_FILE = path.join(ROOT, 'content-studio', 'drafts', 'instagram-posts-captions.md');
const COMMENTS_FILE = path.join(ROOT, 'content-studio', 'design-comments.json');
const FEEDBACK_FILE = path.join(ROOT, 'content-studio', 'DESIGN_FEEDBACK.md');
const LAUNCH_GRID_FILE = path.join(ROOT, 'content-studio', 'launch-grid.json');
const LAUNCH_HTML_FILE = path.join(ROOT, 'design-system', 'collateral', 'launch-grid.html');
const EXPORTS_DIR = path.join(ROOT, 'exports');

const STATUSES = ['draft', 'approved', 'scheduled', 'posted', 'retired'];
const COMMENT_STATUSES = ['open', 'resolved', 'wontfix'];

// Status lifecycle state machine. Each key maps to the statuses it may move to
// WITHOUT an override. The happy path walks draft → approved → scheduled →
// posted; anything may be retired; a retired asset can be revived to draft.
// Any move not listed here (skips like draft → posted, and all backward moves)
// needs override:true on the patch. Setting the same status is an idempotent
// no-op handled separately (no history entry). A brand-new id is creation, not
// a transition, so it bypasses this map entirely.
const STATUS_TRANSITIONS = {
  draft: ['approved', 'retired'],
  approved: ['scheduled', 'retired'],
  scheduled: ['posted', 'retired'],
  posted: ['retired'],
  retired: ['draft'],
};

// The statuses reachable from `from` without an override (creation → every
// status; unknown/missing from-state → none).
function legalNext(from) {
  if (from == null) return [...STATUSES];
  return STATUS_TRANSITIONS[from] ? [...STATUS_TRANSITIONS[from]] : [];
}

// ---------------------------------------------------------------- utilities

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(body);
}

function readBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('body too large'), { httpCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJSONBody(req) {
  const raw = await readBody(req);
  try {
    const v = JSON.parse(raw || '{}');
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not an object');
    return v;
  } catch {
    throw Object.assign(new Error('invalid JSON body'), { httpCode: 400 });
  }
}

// Atomic + durable write: tmp file in the same directory, fsync the descriptor
// (so the bytes hit disk before the rename can make them visible), then rename.
function writeAtomic(file, content) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.tmp-${process.pid}`);
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, content);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
}

function statOrNull(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function readOrNull(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');

// ------------------------------------------------------------- status store

function loadStatus() {
  const raw = readOrNull(STATUS_FILE);
  if (raw == null) return { version: 1, assets: {} };
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && v.assets && typeof v.assets === 'object') return v;
  } catch {
    /* corrupt file → fresh store (never crash the manifest) */
  }
  return { version: 1, assets: {} };
}

// In-process promise queue serializes read-modify-write cycles.
let statusQueue = Promise.resolve();
function enqueueStatus(task) {
  const p = statusQueue.then(task);
  statusQueue = p.then(
    () => {},
    () => {},
  );
  return p;
}

// Guarded read-modify-write for a single asset's status entry. The whole cycle
// runs INSIDE the queue so the from-state is read fresh and concurrent writes
// serialize (no torn history). Resolves a discriminated result the handler maps
// to a response WITHOUT itself touching disk:
//   { ok: true,  entry }                    → 200, write happened (or no-op)
//   { ok: false, from, to, legalNext }       → 409, NOTHING written
// Legality (only relevant when the patch carries a status):
//   • brand-new id              → creation, any status, history [{from:null,to,at}]
//   • same status               → idempotent no-op, no history entry, still writes
//                                  the rest of the patch (e.g. scheduledFor/caption)
//   • from→to in STATUS_TRANSITIONS, or patch.override → applied; history appended
//     (override moves carry overridden:true on their entry)
//   • anything else             → illegal, { ok:false } and no write
function patchStatus(id, patch) {
  return enqueueStatus(() => {
    const store = loadStatus();
    const existing = store.assets[id];
    const isNew = existing === undefined;
    const from = isNew ? null : existing.status ?? null;
    const at = new Date().toISOString();
    const { override, ...fields } = patch;

    // Decide legality + whether this write appends a history entry. Only a real
    // status change records history; everything else just merges fields.
    let appendHistory = false;
    if ('status' in fields) {
      const to = fields.status;
      if (isNew) {
        // Creation: any status is allowed; seed history from null.
        appendHistory = true;
      } else if (to === from) {
        // Idempotent — same status again records no new history entry.
        appendHistory = false;
      } else if (legalNext(from).includes(to) || override === true) {
        appendHistory = true;
      } else {
        // Illegal transition, no override → 409, nothing written.
        return { ok: false, from, to, legalNext: legalNext(from) };
      }
    }

    const entry = { ...(existing || {}), ...fields, updatedAt: at };
    if (appendHistory) {
      const record = { from, to: fields.status, at };
      // Mark only override-forced moves; creation/legal moves stay unmarked.
      if (!isNew && override === true && !legalNext(from).includes(fields.status)) {
        record.overridden = true;
      }
      entry.history = [...(existing?.history || []), record];
    } else if (existing?.history) {
      entry.history = existing.history;
    }
    // `override` is a control flag, never persisted on the entry.
    delete entry.override;

    store.assets[id] = entry;
    writeAtomic(STATUS_FILE, JSON.stringify(store, null, 2) + '\n');
    return { ok: true, entry };
  });
}

// ------------------------------------------------------------- comments store

// The 4th write surface: design comments (numbered annotation pins). Persists to
// content-studio/design-comments.json and regenerates DESIGN_FEEDBACK.md on
// every write. Corruption-safe like loadStatus — a bad file never crashes the
// manifest scan; it reads back as an empty store.
function loadComments() {
  const raw = readOrNull(COMMENTS_FILE);
  if (raw == null) return { version: 1, comments: [] };
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && Array.isArray(v.comments)) return v;
  } catch {
    /* corrupt file → fresh store (never crash the manifest) */
  }
  return { version: 1, comments: [] };
}

// Same promise-queue pattern as enqueueStatus — serializes the read-modify-write
// cycle so concurrent upserts/deletes never interleave on the JSON file.
let commentsQueue = Promise.resolve();
function enqueueComments(task) {
  const p = commentsQueue.then(task);
  commentsQueue = p.then(
    () => {},
    () => {},
  );
  return p;
}

// Per-asset monotonic pin number (the "3" rendered on the pin). 1 + the highest
// existing seq among comments sharing the same assetRef.assetId.
function nextSeq(store, assetId) {
  let max = 0;
  for (const c of store.comments) {
    if (c.assetRef && c.assetRef.assetId === assetId && Number.isFinite(c.seq) && c.seq > max) {
      max = c.seq;
    }
  }
  return max + 1;
}

// Both write paths (upsert + delete) end here: persist the store atomically,
// THEN regenerate the digest atomically from the same in-memory store.
function persistComments(store) {
  writeAtomic(COMMENTS_FILE, JSON.stringify(store, null, 2) + '\n');
  writeAtomic(FEEDBACK_FILE, renderFeedbackDigest(store));
}

// --------------------------------------------------------- launch-grid store

// The 5th write surface: the Instagram launch-grid plan (per-post captions,
// waves, notes) in content-studio/launch-grid.json, plus the carousel slide
// copy living in launch-grid.html's <script id="caro-data"> JSON island.
// Posting status itself stays in status.json under `launch-grid/<post.id>`.
function loadLaunchPlan() {
  const raw = readOrNull(LAUNCH_GRID_FILE);
  if (raw == null) return null;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && Array.isArray(v.posts)) return v;
  } catch {
    /* corrupt file → null (the API reports it; never crash) */
  }
  return null;
}

const ISLAND_RE = /(<script type="application\/json" id="caro-data">\n)([\s\S]*?)(\n\s*<\/script>)/;

function readSlidesIsland() {
  const html = readOrNull(LAUNCH_HTML_FILE);
  if (html == null) {
    throw Object.assign(new Error('launch-grid.html not found'), { httpCode: 500 });
  }
  const m = html.match(ISLAND_RE);
  if (!m) {
    throw Object.assign(new Error('caro-data island not found in launch-grid.html'), { httpCode: 500 });
  }
  try {
    return { html, data: JSON.parse(m[2]) };
  } catch {
    throw Object.assign(new Error('caro-data island is not valid JSON'), { httpCode: 500 });
  }
}

// Same promise-queue pattern as enqueueStatus — one writer at a time across
// both the plan JSON and the html island.
let launchQueue = Promise.resolve();
function enqueueLaunch(task) {
  const p = launchQueue.then(task);
  launchQueue = p.then(
    () => {},
    () => {},
  );
  return p;
}

// Collect every string leaf of a value (caption object / slides array).
function stringLeaves(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) stringLeaves(x, out);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) stringLeaves(x, out);
  return out;
}

// Brand-guard a set of strings; scanTextRetired-shaped violations.
function scanStrings(strings) {
  const violations = [];
  for (const s of strings) {
    if (typeof s === 'string' && s) violations.push(...scanTextRetired(s));
  }
  return violations;
}

const LAUNCH_PATCH_KEYS = ['caption', 'notes', 'role', 'wave'];

function handleLaunchPostSave(body, res) {
  const { id, patch, override } = body;
  if (typeof id !== 'string' || !id.length) {
    return sendJSON(res, 400, { error: 'id must be a non-empty string' });
  }
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return sendJSON(res, 400, { error: 'patch must be an object' });
  }
  const unknown = Object.keys(patch).filter((k) => !LAUNCH_PATCH_KEYS.includes(k));
  if (unknown.length) {
    return sendJSON(res, 400, { error: `unknown patch keys: ${unknown.join(', ')}` });
  }
  if ('wave' in patch && !(Number.isInteger(patch.wave) && patch.wave >= 1 && patch.wave <= 4)) {
    return sendJSON(res, 400, { error: 'wave must be an integer 1-4' });
  }
  if ('caption' in patch) {
    const c = patch.caption;
    const okShape =
      c && typeof c === 'object' && !Array.isArray(c) &&
      ['hook', 'body', 'cta'].every((k) => typeof c[k] === 'string') &&
      Array.isArray(c.hashtags) && c.hashtags.every((t) => typeof t === 'string');
    if (!okShape) {
      return sendJSON(res, 400, { error: 'caption must be {hook, body, cta, hashtags[]} of strings' });
    }
  }
  if ('notes' in patch && typeof patch.notes !== 'string') {
    return sendJSON(res, 400, { error: 'notes must be a string' });
  }
  if ('role' in patch && typeof patch.role !== 'string') {
    return sendJSON(res, 400, { error: 'role must be a string' });
  }
  // Never trust the client's lint — re-scan all new text server-side.
  const violations = scanStrings(stringLeaves(patch));
  if (violations.length && !override) {
    return sendJSON(res, 422, { error: 'guard violations', violations });
  }
  return enqueueLaunch(() => {
    const plan = loadLaunchPlan();
    if (!plan) {
      return sendJSON(res, 500, { error: 'content-studio/launch-grid.json missing or invalid' });
    }
    const post = plan.posts.find((p) => p.id === id);
    if (!post) return sendJSON(res, 404, { error: `unknown post: ${id}` });
    Object.assign(post, patch, { updatedAt: new Date().toISOString() });
    plan.updatedAt = post.updatedAt;
    writeAtomic(LAUNCH_GRID_FILE, JSON.stringify(plan, null, 2) + '\n');
    return sendJSON(res, 200, post);
  });
}

function handleLaunchSlidesSave(body, res) {
  const { slug, slides, title, surf, override } = body;
  if (typeof slug !== 'string' || !slug.length) {
    return sendJSON(res, 400, { error: 'slug must be a non-empty string' });
  }
  const okSlides =
    Array.isArray(slides) && slides.length &&
    slides.every(
      (s) =>
        s && typeof s === 'object' && !Array.isArray(s) &&
        ['eb', 'motif', 'hl', 'sup'].every((k) => typeof s[k] === 'string'),
    );
  if (!okSlides) {
    return sendJSON(res, 400, { error: 'slides must be a non-empty array of {eb, motif, hl, sup} strings' });
  }
  const leaves = stringLeaves([slides, title, surf]);
  // [[placeholders]] in the html brick the export pre-flight — hard reject, no override.
  if (leaves.some((s) => s.includes('[['))) {
    return sendJSON(res, 422, {
      error: '[[placeholders]] are not allowed in launch-grid.html (the export pre-flight rejects them)',
    });
  }
  const violations = scanStrings(leaves);
  if (violations.length && !override) {
    return sendJSON(res, 422, { error: 'guard violations', violations });
  }
  return enqueueLaunch(() => {
    const { html, data } = readSlidesIsland();
    if (!Object.prototype.hasOwnProperty.call(data, slug)) {
      return sendJSON(res, 404, { error: `unknown carousel slug: ${slug}` });
    }
    const entry = { ...data[slug], slides };
    if (typeof title === 'string' && title) entry.title = title;
    if (typeof surf === 'string' && surf) entry.surf = surf;
    data[slug] = entry;
    const json = JSON.stringify(data, null, 2);
    if (/<\/script/i.test(json)) {
      return sendJSON(res, 422, { error: 'slide copy may not contain "</script"' });
    }
    // Function replacement — JSON content must never hit $-substitution rules.
    writeAtomic(LAUNCH_HTML_FILE, html.replace(ISLAND_RE, (_m, a, _b, c) => a + json + c));
    return sendJSON(res, 200, { ok: true, slug, entry });
  });
}

// --------------------------------------------------------------- export zip
//
// Bundles existing rendered PNGs (and small inline text files like captions)
// into a single .zip for download — the studio's "bulk export". Read-only: it
// never writes the repo. `src` entries must resolve INSIDE exports/; `name` is
// the path inside the archive (no absolute paths, no `..`). `text` entries
// carry inline content (caption .txt files) instead of a source file.

const MAX_ZIP_FILES = 600;
const MAX_ZIP_BYTES = 400 * 1024 * 1024; // 400 MiB — far above a full launch bundle

function sanitizeZipPath(name) {
  const s = String(name == null ? '' : name).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!s) return null;
  if (s.split('/').some((seg) => seg === '' || seg === '.' || seg === '..')) return null;
  if (!/^[\w./ +-]+$/.test(s)) return null;
  return s;
}

function handleExportZip(body, res) {
  const files = body && body.files;
  if (!Array.isArray(files) || files.length === 0) {
    return sendJSON(res, 400, { error: 'files must be a non-empty array' });
  }
  if (files.length > MAX_ZIP_FILES) {
    return sendJSON(res, 400, { error: `too many files (max ${MAX_ZIP_FILES})` });
  }
  const entries = [];
  let total = 0;
  for (const f of files) {
    const name = sanitizeZipPath(f && f.name);
    if (!name) return sendJSON(res, 400, { error: `invalid archive path: ${f && f.name}` });
    let data;
    if (f && typeof f.text === 'string') {
      data = Buffer.from(f.text, 'utf8');
    } else if (f && typeof f.src === 'string') {
      const abs = path.resolve(ROOT, f.src);
      if (abs !== EXPORTS_DIR && !abs.startsWith(EXPORTS_DIR + path.sep)) {
        return sendJSON(res, 400, { error: `src must be inside exports/: ${f.src}` });
      }
      const st = statOrNull(abs);
      if (!st || !st.isFile()) return sendJSON(res, 404, { error: `not exported: ${f.src}` });
      data = fs.readFileSync(abs);
    } else {
      return sendJSON(res, 400, { error: 'each file needs a src or text' });
    }
    total += data.length;
    if (total > MAX_ZIP_BYTES) return sendJSON(res, 413, { error: 'bundle too large' });
    entries.push({ name, data });
  }
  const zipName = sanitizeZipPath(body.zipName) || 'export.zip';
  const fname = path.basename(zipName.endsWith('.zip') ? zipName : `${zipName}.zip`);
  const zip = zipStore(entries);
  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${fname}"`,
    'Content-Length': zip.length,
    'Cache-Control': 'no-store',
  });
  res.end(zip);
}

// ---------------------------------------------------------------- manifest

const SURFACES = [
  {
    id: 'instagram',
    label: 'instagram posts',
    source: 'design-system/collateral/instagram-posts.html',
    exportDir: 'exports/instagram',
    script: 'export:ig',
    aspect: '1080x1350',
    enumerate: 'data-export',
  },
  {
    id: 'posters',
    label: 'posters',
    source: 'design-system/collateral/posters.html',
    exportDir: 'exports/posters',
    script: 'export:posters',
    aspect: '1080x1350',
    enumerate: 'data-export',
  },
  {
    id: 'stories',
    label: 'stories',
    source: 'design-system/collateral/stories.html',
    exportDir: 'exports/stories',
    script: 'export:stories',
    aspect: '1080x1920',
    enumerate: 'data-export',
  },
  {
    id: 'deck',
    label: 'program deck',
    source: 'brochures/Eduflick_Full_Stack_AI_Engineer_Program_Deck.html',
    exportDir: 'exports/full-stack-ai-engineer',
    script: 'export:slides',
    aspect: '1920x1080',
    enumerate: 'stage',
  },
  {
    id: 'launch-grid',
    label: 'launch grid',
    source: 'design-system/collateral/launch-grid.html',
    exportDir: 'exports',
    script: 'export',
    aspect: '1080x1350',
    enumerate: 'dir',
  },
];

const KIT_DOCS = [
  'instagram-kit',
  'brochure-kit',
  'content-calendar',
  'launch-grid',
  'posters',
  'stories',
  'instagram-posts',
].map((n) => `design-system/collateral/${n}.html`);

const DECK_FILE = 'brochures/Eduflick_Full_Stack_AI_Engineer_Program_Deck.html';

// Caption shape (content-studio/drafts/instagram-posts-captions.md):
//   ## N · `ig-<slug>.png` — title
//   **Hook:** … / **Body:** … / **CTA:** … / **Hashtags:** …
function parseCaptions() {
  const text = readOrNull(CAPTIONS_FILE);
  if (text == null) return {};
  const map = {};
  let cur = null;
  for (const line of text.split('\n')) {
    const h = line.match(/^##\s+\d+\s+·\s+`([^`]+)\.png`\s+—\s+(.*)$/);
    if (h) {
      cur = { title: h[2].trim() };
      map[h[1]] = cur;
      continue;
    }
    if (!cur) continue;
    const f = line.match(/^\*\*(Hook|Body|CTA|Hashtags):\*\*\s*(.*)$/);
    if (f) cur[f[1].toLowerCase()] = f[2].trim();
  }
  return map;
}

function enumerateItems(surface, sourceContent) {
  if (surface.enumerate === 'data-export') {
    const names = [];
    for (const m of (sourceContent || '').matchAll(/data-export="([^"]+)"/g)) names.push(m[1]);
    return names;
  }
  if (surface.enumerate === 'stage') {
    const n = ((sourceContent || '').match(/class="stage"/g) || []).length;
    return Array.from({ length: n }, (_, i) => `slide-${String(i + 1).padStart(2, '0')}`);
  }
  // 'dir' — top-level PNGs in the export dir (names are runtime-generated)
  try {
    return fs
      .readdirSync(path.join(ROOT, surface.exportDir), { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith('.png'))
      .map((d) => d.name.replace(/\.png$/, ''))
      .sort();
  } catch {
    return [];
  }
}

function buildSurfaces(statusStore, captions, commentCounts) {
  return SURFACES.map((s) => {
    const sourceAbs = path.join(ROOT, s.source);
    const sourceStat = statOrNull(sourceAbs);
    const sourceContent = s.enumerate === 'dir' ? null : readOrNull(sourceAbs);
    const items = enumerateItems(s, sourceContent).map((name) => {
      const png = `${s.exportDir}/${name}.png`;
      const st = statOrNull(path.join(ROOT, png));
      const counts = commentCounts.get(`${s.id}/${name}`);
      const item = {
        name,
        png,
        exists: !!st,
        stale: !!(st && sourceStat && sourceStat.mtimeMs > st.mtimeMs),
        mtime: st ? st.mtimeMs : null,
        status: statusStore.assets[`${s.id}/${name}`]?.status || 'draft',
        commentCount: counts ? counts.total : 0,
        openCount: counts ? counts.open : 0,
      };
      if (s.id === 'instagram' && captions[name]) item.caption = captions[name];
      return item;
    });
    return {
      id: s.id,
      label: s.label,
      source: s.source,
      exportDir: s.exportDir,
      script: s.script,
      aspect: s.aspect,
      items,
    };
  });
}

function labelFor(file) {
  return path
    .basename(file, '.html')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase();
}

function buildDocuments(commentCounts) {
  const docs = [];
  const push = (relPath, kind) => {
    const content = readOrNull(path.join(ROOT, relPath));
    if (content == null) return;
    const counts = commentCounts.get(`doc:${relPath}`);
    docs.push({
      path: relPath,
      kind,
      label: labelFor(relPath),
      editable: content.includes('/*EDITMODE-BEGIN*/'),
      commentCount: counts ? counts.total : 0,
      openCount: counts ? counts.open : 0,
    });
  };
  let brochureFiles = [];
  try {
    brochureFiles = fs
      .readdirSync(path.join(ROOT, 'brochures'))
      .filter((f) => f.endsWith('.html'))
      .sort();
  } catch {
    /* no brochures dir */
  }
  for (const f of brochureFiles) {
    const p = `brochures/${f}`;
    push(p, p === DECK_FILE ? 'deck' : 'brochure');
  }
  push('brand-book/Eduflick_Brand_Book_v4.html', 'brand-book');
  for (const p of KIT_DOCS) push(p, 'kit');
  return docs;
}

const DOC_SKIP_DIRS = new Set(['.git', 'node_modules', '_archive', 'exports']);

function walkMarkdown(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (DOC_SKIP_DIRS.has(e.name)) continue;
      if (rel(full) === 'tools/stock-sources') continue;
      walkMarkdown(full, out);
    } else if (e.isFile() && e.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function buildDocs() {
  const FACTS_REL = 'content-studio/FACTS.md';
  const entries = walkMarkdown(ROOT).map((abs) => {
    const relPath = rel(abs);
    const content = readOrNull(abs) || '';
    const h1 = content.match(/^#\s+(.+)$/m);
    const dir = path.posix.dirname(relPath);
    return {
      path: relPath,
      title: h1 ? h1[1].trim() : path.basename(relPath),
      dir: dir === '.' ? '' : dir,
    };
  });
  entries.sort((a, b) =>
    a.path === FACTS_REL ? -1 : b.path === FACTS_REL ? 1 : a.path < b.path ? -1 : 1,
  );
  return entries;
}

function listAssets(relDir, exts) {
  try {
    return fs
      .readdirSync(path.join(ROOT, relDir), { withFileTypes: true })
      .filter((d) => d.isFile() && exts.includes(path.extname(d.name).toLowerCase()))
      .map((d) => `${relDir}/${d.name}`)
      .sort();
  } catch {
    return [];
  }
}

function buildBrand() {
  return {
    logos: [
      ...listAssets('assets/logo', ['.svg', '.png']),
      ...listAssets('assets/logo/social', ['.svg', '.png']),
    ],
    partners: listAssets('assets/partners', ['.svg', '.png']),
    tokensFlat: 'design-system/tokens/tokens.flat.json',
  };
}

// Tally comments per assetRef.assetId (keys are `${surface.id}/${name}` or
// `doc:${path}` or `launch-grid/${tile}`) plus a top-level rollup. Loaded once
// per manifest GET — live-scanned, never cached.
function tallyComments(commentStore) {
  const byAsset = new Map(); // assetId -> { total, open }
  const rollup = { total: 0, open: 0 };
  for (const c of commentStore.comments) {
    const assetId = c.assetRef && c.assetRef.assetId;
    if (typeof assetId !== 'string' || !assetId) continue;
    const isOpen = (c.status || 'open') === 'open';
    const cur = byAsset.get(assetId) || { total: 0, open: 0 };
    cur.total += 1;
    if (isOpen) cur.open += 1;
    byAsset.set(assetId, cur);
    rollup.total += 1;
    if (isOpen) rollup.open += 1;
  }
  return { byAsset, rollup };
}

function buildManifest() {
  const statusStore = loadStatus();
  const captions = parseCaptions();
  const { byAsset, rollup } = tallyComments(loadComments());
  return {
    generatedAt: new Date().toISOString(),
    surfaces: buildSurfaces(statusStore, captions, byAsset),
    documents: buildDocuments(byAsset),
    docs: buildDocs(),
    brand: buildBrand(),
    comments: rollup,
  };
}

// ----------------------------------------------------------------- actions

// Hardcoded whitelist — POST body must name an own key; spawn argv is constant
// shape ('npm run <key>'), never interpolated from anything else, no shell.
const ACTIONS = Object.freeze({
  export: true,
  'export:ig': true,
  'export:posters': true,
  'export:stories': true,
  'export:slides': true,
  'export:pdf': true,
  'gen:backdrops:proc': true,
  'check:facts': true,
  'gen:feedback': true,
  tokens: true,
  snippets: true,
});

const MAX_LOG_LINES = 5000;
const MAX_KEPT_RUNS = 5;
const TRUNCATION_MARKER = '[…log truncated…]';
// Watchdog: a run that exceeds this is SIGTERMed (SIGKILL 5 s later if needed).
const ACTION_TIMEOUT_MS = Number(process.env.STUDIO_ACTION_TIMEOUT_MS || 15 * 60 * 1000);
const STATE_FILE = path.join(TOOLS, '.studio-state.json');

const runs = new Map(); // id → {id, action, startedAt, endedAt, exitCode, lines, done, timedOut, clients}
let running = null; // {id, action, startedAt}

// lastRun survives restarts: persisted (atomic) on every finish, loaded at
// boot. The run id is omitted on disk — replay buffers don't survive a restart.
function persistLastRun(r) {
  const { action, exitCode, startedAt, endedAt, timedOut } = r;
  try {
    writeAtomic(STATE_FILE, JSON.stringify({ action, exitCode, startedAt, endedAt, timedOut }, null, 2) + '\n');
  } catch (err) {
    console.error(`could not persist ${rel(STATE_FILE)}: ${err.message}`);
  }
}

function loadLastRun() {
  const raw = readOrNull(STATE_FILE);
  if (raw == null) return null;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && typeof v.action === 'string') return v;
  } catch {
    /* corrupt file → no lastRun (never crash the boot) */
  }
  return null;
}

let lastRun = loadLastRun(); // {id?, action, exitCode, startedAt, endedAt, timedOut}

function sseWrite(res, event, data) {
  if (res.writableEnded || res.destroyed) return;
  try {
    res.write(`event: ${event}\ndata: ${data}\n\n`);
  } catch {
    /* client gone */
  }
}

function pushLine(run, line) {
  run.lines.push(line);
  if (run.lines.length > MAX_LOG_LINES) {
    // Drop oldest, keep a single marker at the head so replays show the gap.
    run.lines.splice(0, run.lines.length - MAX_LOG_LINES + 1, TRUNCATION_MARKER);
  }
  for (const res of run.clients) sseWrite(res, 'log', line);
}

function finishRun(run, code) {
  run.exitCode = code;
  run.endedAt = new Date().toISOString();
  run.done = true;
  lastRun = {
    id: run.id,
    action: run.action,
    exitCode: code,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    timedOut: !!run.timedOut,
  };
  persistLastRun(lastRun);
  running = null;
  for (const res of run.clients) {
    sseWrite(res, 'exit', JSON.stringify({ code, timedOut: !!run.timedOut }));
    try {
      res.end();
    } catch {
      /* already closed */
    }
  }
  run.clients.clear();
  // Keep only the most recent finished runs for late stream replays.
  const finished = [...runs.values()].filter((r) => r.done);
  while (finished.length > MAX_KEPT_RUNS) runs.delete(finished.shift().id);
}

function startAction(action) {
  const id = randomUUID();
  const run = {
    id,
    action,
    startedAt: new Date().toISOString(),
    endedAt: null,
    exitCode: null,
    lines: [],
    done: false,
    timedOut: false,
    clients: new Set(),
  };
  runs.set(id, run);
  running = { id, action, startedAt: run.startedAt };

  const child = spawn('npm', ['run', action], { cwd: TOOLS, env: process.env });
  // Watchdog: SIGTERM at the deadline, SIGKILL 5 s later if it hangs on.
  const watchdog = setTimeout(() => {
    run.timedOut = true;
    pushLine(run, `[timeout] ${action} exceeded ${ACTION_TIMEOUT_MS} ms — sending SIGTERM`);
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!run.done) child.kill('SIGKILL');
    }, 5000).unref();
  }, ACTION_TIMEOUT_MS);
  watchdog.unref();
  const partial = { out: '', err: '' };
  const onData = (key) => (chunk) => {
    partial[key] += chunk.toString('utf8');
    const parts = partial[key].split('\n');
    partial[key] = parts.pop();
    for (const line of parts) pushLine(run, line);
  };
  child.stdout.on('data', onData('out'));
  child.stderr.on('data', onData('err'));
  child.on('error', (err) => {
    clearTimeout(watchdog);
    pushLine(run, `spawn error: ${err.message}`);
    finishRun(run, -1);
  });
  child.on('close', (code) => {
    clearTimeout(watchdog);
    if (partial.out) pushLine(run, partial.out);
    if (partial.err) pushLine(run, partial.err);
    if (!run.done) finishRun(run, code == null ? -1 : code);
  });
  return id;
}

function handleStream(req, res, id) {
  const run = runs.get(id);
  if (!run) return sendJSON(res, 404, { error: 'unknown run id' });
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  for (const line of run.lines) sseWrite(res, 'log', line);
  if (run.done) {
    sseWrite(res, 'exit', JSON.stringify({ code: run.exitCode, timedOut: !!run.timedOut }));
    res.end();
    return;
  }
  run.clients.add(res);
  const hb = setInterval(() => {
    if (res.writableEnded || res.destroyed) return;
    try {
      res.write(': hb\n\n');
    } catch {
      /* client gone */
    }
  }, 15000);
  req.on('close', () => {
    clearInterval(hb);
    run.clients.delete(res);
  });
}

// Run the full repo guard (npm run check:facts) and capture its output.
function runGuard() {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', 'check:facts'], { cwd: TOOLS, env: process.env });
    let output = '';
    child.stdout.on('data', (c) => (output += c.toString('utf8')));
    child.stderr.on('data', (c) => (output += c.toString('utf8')));
    child.on('error', (err) => resolve({ exitCode: -1, output: `spawn error: ${err.message}` }));
    child.on('close', (code) => resolve({ exitCode: code == null ? -1 : code, output }));
  });
}

// -------------------------------------------------------------- token status

// Source → generated-artifact pairs of the token pipeline. A pair is stale
// when the artifact is missing or older than its source — mtime compare only
// (cheap, no hashing); `npm run tokens` / `npm run snippets` regenerate.
const TOKEN_PAIRS = [
  { source: 'design-system/tokens/tokens.json', artifact: 'design-system/tokens/tokens.css' },
  { source: 'design-system/tokens/tokens.json', artifact: 'design-system/tokens/tokens.flat.json' },
  { source: 'design-system/tokens/tokens.json', artifact: 'tools/brand.tokens.mjs' },
  { source: 'design-system/recipes/snippets.src.md', artifact: 'design-system/recipes/snippets.md' },
];

function buildTokensStatus() {
  const stale = [];
  for (const { source, artifact } of TOKEN_PAIRS) {
    const src = statOrNull(path.join(ROOT, source));
    if (!src) continue; // missing source → nothing to compare against
    const art = statOrNull(path.join(ROOT, artifact));
    if (!art || src.mtimeMs > art.mtimeMs) stale.push({ source, artifact });
  }
  return {
    inSync: stale.length === 0,
    stale,
    checkedAt: new Date().toISOString(),
    method: 'mtime',
  };
}

// ---------------------------------------------------------------- editmode

const EDITMODE_RE = /\/\*EDITMODE-BEGIN\*\/([\s\S]*?)\/\*EDITMODE-END\*\//g;

function handleEditmode(body, res) {
  const { file, edits } = body;
  if (typeof file !== 'string' || file.includes('\0')) {
    return sendJSON(res, 400, { error: 'file must be a string path' });
  }
  if (!edits || typeof edits !== 'object' || Array.isArray(edits) || !Object.keys(edits).length) {
    return sendJSON(res, 400, { error: 'edits must be a non-empty object' });
  }
  const abs = path.normalize(path.resolve(ROOT, file));
  const dsRoot = path.join(ROOT, 'design-system') + path.sep;
  if (!abs.startsWith(dsRoot)) {
    return sendJSON(res, 403, { error: 'file must be inside design-system/' });
  }
  if (!abs.endsWith('.html')) {
    return sendJSON(res, 400, { error: 'file must be .html' });
  }
  const content = readOrNull(abs);
  if (content == null) return sendJSON(res, 404, { error: 'file not found' });

  const spans = [];
  for (const m of content.matchAll(EDITMODE_RE)) {
    let parsed = null;
    try {
      parsed = JSON.parse(m[1]);
    } catch {
      /* unparseable span — not a candidate */
    }
    spans.push({ start: m.index, end: m.index + m[0].length, parsed });
  }
  if (!spans.length) return sendJSON(res, 422, { error: 'no EDITMODE block in file' });

  const keys = Object.keys(edits);
  const candidates = spans.filter(
    (s) => s.parsed && typeof s.parsed === 'object' && keys.every((k) => k in s.parsed),
  );
  if (candidates.length === 0) {
    return sendJSON(res, 422, { error: 'no EDITMODE block contains all edit keys', keys });
  }
  if (candidates.length > 1) {
    return sendJSON(res, 409, { error: 'ambiguous: multiple EDITMODE blocks match', keys });
  }

  const span = candidates[0];
  const merged = { ...span.parsed, ...edits };
  const serialized = JSON.stringify(merged, null, 2);

  // These files are inside check-facts' active-HTML scope — refuse to write a
  // block that would introduce a retired string or a [[placeholder]].
  const violations = scanTextRetired(serialized);
  if (/\[\[/.test(serialized)) {
    violations.push({ line: 0, bad: 'unresolved placeholder marker', use: 'a real value' });
  }
  if (violations.length) return sendJSON(res, 422, { error: 'guard violations', violations });

  const next =
    content.slice(0, span.start) +
    '/*EDITMODE-BEGIN*/' +
    serialized +
    '/*EDITMODE-END*/' +
    content.slice(span.end);
  writeAtomic(abs, next);
  return sendJSON(res, 200, { ok: true, file: rel(abs), keys });
}

// ---------------------------------------------------------------- comments

// Validate the assetRef sub-shape and the click anchor. Returns an error string
// (→ 400) or null when valid. assetRef.source MUST resolve to a real file under
// ROOT (no body-supplied path traversal — same posture as editmode).
function validateAssetRef(assetRef) {
  if (!assetRef || typeof assetRef !== 'object' || Array.isArray(assetRef)) {
    return 'comment.assetRef must be an object';
  }
  if (typeof assetRef.assetId !== 'string' || !assetRef.assetId.length) {
    return 'comment.assetRef.assetId must be a non-empty string';
  }
  if (typeof assetRef.source !== 'string' || !assetRef.source.length || assetRef.source.includes('\0')) {
    return 'comment.assetRef.source must be a non-empty string path';
  }
  // Source must resolve to an existing FILE inside ROOT (validated, not trusted).
  const abs = path.normalize(path.resolve(ROOT, assetRef.source));
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) {
    return 'comment.assetRef.source must be inside the repo';
  }
  const st = statOrNull(abs);
  if (!st || !st.isFile()) {
    return 'comment.assetRef.source does not resolve to an existing file';
  }
  const anchor = assetRef.anchor;
  if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) {
    return 'comment.assetRef.anchor must be an object';
  }
  // Normalized coords (when present) must be finite and within [0,1].
  for (const k of ['x', 'y']) {
    if (k in anchor && anchor[k] != null) {
      const v = anchor[k];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
        return `comment.assetRef.anchor.${k} must be a finite number in [0,1]`;
      }
    }
  }
  if (anchor.type === 'normalized') {
    if (!(Number.isFinite(anchor.x) && Number.isFinite(anchor.y))) {
      return 'normalized anchor requires finite x and y in [0,1]';
    }
  }
  return null;
}

function handleCommentUpsert(body, res) {
  const input = body && body.comment;
  const override = !!(body && body.override);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return sendJSON(res, 400, { error: 'comment must be an object' });
  }
  const isUpdate = typeof input.id === 'string' && input.id.length > 0;

  // Text is required on create; on update it is optional — a status-only edit
  // (mark resolved / won't fix) sends just {id, status}. When text is present
  // (create, or a text edit) it must be a non-empty string.
  const hasText = 'text' in input && input.text != null;
  if (!isUpdate || hasText) {
    if (typeof input.text !== 'string' || !input.text.trim().length) {
      return sendJSON(res, 400, { error: 'comment.text must be a non-empty string' });
    }
  }
  if ('status' in input && !COMMENT_STATUSES.includes(input.status)) {
    return sendJSON(res, 400, { error: `status must be one of: ${COMMENT_STATUSES.join(', ')}` });
  }

  // On create the client must supply a full assetRef; on update assetRef is
  // optional (status/text-only edits) but if present it is re-validated.
  if (!isUpdate || 'assetRef' in input) {
    const refErr = validateAssetRef(input.assetRef);
    if (refErr) return sendJSON(res, 400, { error: refErr });
  }

  // Guard the free-form text server-side — never trust the client's check.
  const violations = hasText ? scanTextRetired(input.text) : [];
  if (violations.length && !override) {
    return sendJSON(res, 422, { error: 'guard violations', violations });
  }

  return enqueueComments(() => {
    const store = loadComments();
    const now = new Date().toISOString();

    if (isUpdate) {
      const idx = store.comments.findIndex((c) => c.id === input.id);
      if (idx === -1) {
        sendJSON(res, 404, { error: 'unknown comment id' });
        return;
      }
      const existing = store.comments[idx];
      const merged = {
        ...existing,
        ...input,
        id: existing.id,
        seq: existing.seq,
        createdAt: existing.createdAt,
        updatedAt: now,
        overridden: violations.length ? true : !!existing.overridden,
      };
      store.comments[idx] = merged;
      persistComments(store);
      sendJSON(res, 200, merged);
      return;
    }

    const comment = {
      ...input,
      id: randomUUID(),
      seq: nextSeq(store, input.assetRef.assetId),
      status: COMMENT_STATUSES.includes(input.status) ? input.status : 'open',
      overridden: violations.length ? true : false,
      author: typeof input.author === 'string' && input.author ? input.author : 'studio',
      createdAt: now,
      updatedAt: now,
    };
    store.comments.push(comment);
    persistComments(store);
    sendJSON(res, 200, comment);
  });
}

function handleCommentDelete(id, res) {
  return enqueueComments(() => {
    const store = loadComments();
    const idx = store.comments.findIndex((c) => c.id === id);
    if (idx === -1) {
      sendJSON(res, 404, { error: 'unknown comment id' });
      return;
    }
    store.comments.splice(idx, 1);
    persistComments(store);
    sendJSON(res, 200, { ok: true, id });
  });
}

// ------------------------------------------------------------------ server

async function handleApi(req, res, pathname) {
  if (pathname === '/api/manifest' && req.method === 'GET') {
    return sendJSON(res, 200, buildManifest());
  }

  if (pathname === '/api/status') {
    if (req.method === 'GET') return sendJSON(res, 200, loadStatus());
    if (req.method === 'POST') {
      const body = await readJSONBody(req);
      const { id, patch } = body;
      if (typeof id !== 'string' || !id.length) {
        return sendJSON(res, 400, { error: 'id must be a non-empty string' });
      }
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return sendJSON(res, 400, { error: 'patch must be an object' });
      }
      if ('status' in patch && !STATUSES.includes(patch.status)) {
        return sendJSON(res, 400, { error: `status must be one of: ${STATUSES.join(', ')}` });
      }
      if ('scheduledFor' in patch && Number.isNaN(Date.parse(patch.scheduledFor))) {
        return sendJSON(res, 400, { error: 'scheduledFor must be an ISO date string' });
      }
      const result = await patchStatus(id, patch);
      if (!result.ok) {
        // Illegal transition, no override — nothing was written.
        return sendJSON(res, 409, {
          error: `illegal transition: ${result.from} → ${result.to}`,
          from: result.from,
          to: result.to,
          legalNext: result.legalNext,
        });
      }
      return sendJSON(res, 200, result.entry);
    }
    return sendJSON(res, 405, { error: 'method not allowed' });
  }

  if (pathname === '/api/actions' && req.method === 'GET') {
    return sendJSON(res, 200, { running, lastRun });
  }

  if (pathname === '/api/actions/run' && req.method === 'POST') {
    const body = await readJSONBody(req);
    const action = body.action;
    if (typeof action !== 'string' || !Object.prototype.hasOwnProperty.call(ACTIONS, action)) {
      return sendJSON(res, 400, { error: 'unknown action' });
    }
    if (running) return sendJSON(res, 409, { error: 'busy' });
    const id = startAction(action);
    return sendJSON(res, 200, { id });
  }

  const stream = pathname.match(/^\/api\/actions\/([0-9a-f-]+)\/stream$/);
  if (stream && req.method === 'GET') {
    return handleStream(req, res, stream[1]);
  }

  if (pathname === '/api/tokens/status' && req.method === 'GET') {
    return sendJSON(res, 200, buildTokensStatus());
  }

  if (pathname === '/api/editmode' && req.method === 'POST') {
    const body = await readJSONBody(req);
    return handleEditmode(body, res);
  }

  if (pathname === '/api/facts/check' && req.method === 'POST') {
    const body = await readJSONBody(req);
    if (typeof body.content !== 'string') {
      return sendJSON(res, 400, { error: 'content must be a string' });
    }
    return sendJSON(res, 200, { violations: scanTextRetired(body.content) });
  }

  if (pathname === '/api/facts/save' && req.method === 'POST') {
    const body = await readJSONBody(req);
    if (typeof body.content !== 'string') {
      return sendJSON(res, 400, { error: 'content must be a string' });
    }
    // Never trust the client's check — re-scan server-side.
    const violations = scanTextRetired(body.content);
    if (violations.length && !body.override) {
      return sendJSON(res, 422, { violations });
    }
    writeAtomic(FACTS_FILE, body.content);
    const guard = await runGuard();
    return sendJSON(res, 200, { ok: true, guard });
  }

  if (pathname === '/api/comments') {
    if (req.method === 'GET') return sendJSON(res, 200, loadComments());
    if (req.method === 'POST') {
      const body = await readJSONBody(req);
      return handleCommentUpsert(body, res);
    }
    return sendJSON(res, 405, { error: 'method not allowed' });
  }

  const commentId = pathname.match(/^\/api\/comments\/([0-9a-f-]+)$/);
  if (commentId && req.method === 'DELETE') {
    return handleCommentDelete(commentId[1], res);
  }

  if (pathname === '/api/launch-grid') {
    if (req.method === 'GET') {
      const plan = loadLaunchPlan();
      if (!plan) {
        return sendJSON(res, 500, { error: 'content-studio/launch-grid.json missing or invalid' });
      }
      const { data: slides } = readSlidesIsland();
      return sendJSON(res, 200, { plan, slides, generatedAt: new Date().toISOString() });
    }
    return sendJSON(res, 405, { error: 'method not allowed' });
  }

  if (pathname === '/api/launch-grid/post' && req.method === 'POST') {
    const body = await readJSONBody(req);
    return handleLaunchPostSave(body, res);
  }

  if (pathname === '/api/launch-grid/slides' && req.method === 'POST') {
    const body = await readJSONBody(req);
    return handleLaunchSlidesSave(body, res);
  }

  if (pathname === '/api/export-zip' && req.method === 'POST') {
    const body = await readJSONBody(req);
    return handleExportZip(body, res);
  }

  return sendJSON(res, 404, { error: 'not found' });
}

const staticHandler = createStaticHandler(ROOT);

// DNS-rebinding guard: a browser on this machine can be lured to a hostname an
// attacker points at 127.0.0.1 — refuse any request whose Host is not loopback.
const ALLOWED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

// CSRF guard: state-changing API calls must come from the studio's own origin.
// Browsers attach Origin on cross-site requests; no CORS headers are ever set,
// so cross-origin reads stay blocked by the browser itself.
const ALLOWED_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  `http://[::1]:${PORT}`,
]);

// Hostname part of a Host header: "localhost:8090" → "localhost",
// "[::1]:8090" → "[::1]". Missing/garbled headers come back '' (→ 403).
function hostnameOf(hostHeader) {
  const h = String(hostHeader || '').trim().toLowerCase();
  if (!h) return '';
  if (h.startsWith('[')) {
    const end = h.indexOf(']');
    return end === -1 ? '' : h.slice(0, end + 1);
  }
  return h.split(':')[0];
}

const server = http.createServer((req, res) => {
  if (!ALLOWED_HOSTNAMES.has(hostnameOf(req.headers.host))) {
    return sendJSON(res, 403, { error: 'forbidden: non-loopback Host header' });
  }
  const pathname = (req.url || '/').split('?')[0];
  if (pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.headers.origin;
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return sendJSON(res, 403, { error: 'forbidden: cross-origin request' });
      }
    }
    handleApi(req, res, pathname).catch((err) => {
      const code = err && err.httpCode ? err.httpCode : 500;
      if (!res.headersSent) sendJSON(res, code, { error: String((err && err.message) || err) });
    });
    return;
  }
  staticHandler(req, res);
});

// Fail fast instead of dying with a stack trace — a busy 8090 almost always
// means a stale test mock or a second studio.
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`port ${PORT} is already in use — likely a stale test mock or another studio.`);
    console.error(`free it with: lsof -ti :${PORT} | xargs kill`);
  } else {
    console.error(`server error: ${String((err && err.message) || err)}`);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`eduflick brand studio`);
  console.log(`  repo    ${ROOT}`);
  console.log(`  studio  http://localhost:${PORT}/tools/studio/`);
  console.log(`  api     http://localhost:${PORT}/api/manifest`);
  console.log('Ctrl+C to stop.');
});
