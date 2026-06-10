#!/usr/bin/env node
// studio-server.mjs — local server for the Eduflick Brand Studio.
//
//   cd tools && npm run studio       → http://localhost:8090/tools/studio/
//
// Serves the whole repo statically (via lib/static.mjs) plus a JSON API:
//
//   GET  /api/manifest             live-scanned asset manifest (nothing cached)
//   GET  /api/status               content-studio/status.json
//   POST /api/status               {id, patch} → merged entry (atomic write)
//   GET  /api/actions              {running, lastRun}
//   POST /api/actions/run          {action} → {id} | 409 busy | 400 unknown
//   GET  /api/actions/:id/stream   SSE log/exit events (replay + live)
//   POST /api/editmode             {file, edits} → EDITMODE block rewrite
//   POST /api/facts/check          {content} → {violations}
//   POST /api/facts/save           {content, override?} → guarded FACTS.md write
//   GET  /api/comments             content-studio/design-comments.json
//   POST /api/comments             {comment, override?} → upserted <Comment> (id+seq)
//   DELETE /api/comments/:id        delete a comment by UUID
//
// Write surface is exactly four paths: content-studio/status.json,
// content-studio/FACTS.md, content-studio/design-comments.json (which also
// regenerates content-studio/DESIGN_FEEDBACK.md), and EDITMODE blocks inside
// design-system/*.html. Binds 127.0.0.1 only. Zero npm dependencies (built-ins).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createStaticHandler } from './lib/static.mjs';
import { scanTextRetired } from './check-facts.mjs';
import { renderFeedbackDigest } from './lib/feedback.mjs';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOLS, '..');
const PORT = Number(process.env.PORT || 8090);
const HOST = '127.0.0.1';

const STATUS_FILE = path.join(ROOT, 'content-studio', 'status.json');
const FACTS_FILE = path.join(ROOT, 'content-studio', 'FACTS.md');
const CAPTIONS_FILE = path.join(ROOT, 'content-studio', 'drafts', 'instagram-posts-captions.md');
const COMMENTS_FILE = path.join(ROOT, 'content-studio', 'design-comments.json');
const FEEDBACK_FILE = path.join(ROOT, 'content-studio', 'DESIGN_FEEDBACK.md');

const STATUSES = ['draft', 'approved', 'scheduled', 'posted', 'retired'];
const COMMENT_STATUSES = ['open', 'resolved', 'wontfix'];

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

// Atomic write: tmp file in the same directory, then rename.
function writeAtomic(file, content) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.tmp-${process.pid}`);
  fs.writeFileSync(tmp, content);
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

function patchStatus(id, patch) {
  return enqueueStatus(() => {
    const store = loadStatus();
    const entry = { ...(store.assets[id] || {}), ...patch, updatedAt: new Date().toISOString() };
    store.assets[id] = entry;
    writeAtomic(STATUS_FILE, JSON.stringify(store, null, 2) + '\n');
    return entry;
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

const runs = new Map(); // id → {id, action, startedAt, endedAt, exitCode, lines, done, clients}
let running = null; // {id, action, startedAt}
let lastRun = null; // {id, action, exitCode, startedAt, endedAt}

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
  if (run.lines.length > MAX_LOG_LINES) run.lines.splice(0, run.lines.length - MAX_LOG_LINES);
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
  };
  running = null;
  for (const res of run.clients) {
    sseWrite(res, 'exit', JSON.stringify({ code }));
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
    clients: new Set(),
  };
  runs.set(id, run);
  running = { id, action, startedAt: run.startedAt };

  const child = spawn('npm', ['run', action], { cwd: TOOLS, env: process.env });
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
    pushLine(run, `spawn error: ${err.message}`);
    finishRun(run, -1);
  });
  child.on('close', (code) => {
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
    sseWrite(res, 'exit', JSON.stringify({ code: run.exitCode }));
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
      const entry = await patchStatus(id, patch);
      return sendJSON(res, 200, entry);
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

  return sendJSON(res, 404, { error: 'not found' });
}

const staticHandler = createStaticHandler(ROOT);

const server = http.createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0];
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname).catch((err) => {
      const code = err && err.httpCode ? err.httpCode : 500;
      if (!res.headersSent) sendJSON(res, code, { error: String((err && err.message) || err) });
    });
    return;
  }
  staticHandler(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`eduflick brand studio`);
  console.log(`  repo    ${ROOT}`);
  console.log(`  studio  http://localhost:${PORT}/tools/studio/`);
  console.log(`  api     http://localhost:${PORT}/api/manifest`);
  console.log('Ctrl+C to stop.');
});
