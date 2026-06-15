/* api.mjs — thin client for the studio server (tools/studio-server.mjs).
   Every endpoint of the /api contract has exactly one wrapper here. */

const JSON_HEADERS = { 'content-type': 'application/json' };

async function request(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!res.ok) {
    const err = new Error((body && body.error) || `${res.status} ${res.statusText}`.toLowerCase());
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function post(url, payload) {
  return request(url, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) });
}

export const getManifest = () => request('/api/manifest');
export const getStatus = () => request('/api/status');
/* status patch — the server now guards transitions via a state machine. Three
   independent guards can reject a patch, each cleared by its own wire-only flag:
     • illegal transition between two existing statuses → 409 {error, from, to,
       legalNext}; pass override:true to force it (recorded with overridden:true).
     • a move INTO scheduled/posted whose export is absent or stale → 409 {error,
       reason:'stale-export', id, to, assetState}; pass allowStale:true to force
       past THAT guard only.
     • approving (resulting status === 'approved') while the asset still has open
       review comments → 409 {error, reason:'open-comments', id, to:'approved',
       openCount}; pass allowOpenComments:true to approve anyway.
   override, allowStale and allowOpenComments are independent control flags: each
   bypasses exactly one guard and none implies another. All three are wire-only —
   folded into the patch the server reads, never stored on the entry. The optional
   3rd/4th/5th args are a convenience so callers can pass any flag positionally. */
export const setStatus = (id, patch, override = false, allowStale = false, allowOpenComments = false) => {
  let p = patch;
  if (override) p = { ...p, override: true };
  if (allowStale) p = { ...p, allowStale: true };
  if (allowOpenComments) p = { ...p, allowOpenComments: true };
  return post('/api/status', { id, patch: p });
};
export const getActions = () => request('/api/actions');
export const runAction = (action) => post('/api/actions/run', { action });
export const editmodeSave = (file, edits) => post('/api/editmode', { file, edits });
export const factsCheck = (content) => post('/api/facts/check', { content });
export const factsSave = (content, override = false) => post('/api/facts/save', { content, override });

/* token-pipeline drift: {inSync, stale:[{source,artifact}], checkedAt, method}.
   `npm run tokens` / `npm run snippets` regenerate the stale artifacts. */
export const getTokensStatus = () => request('/api/tokens/status');

/* design comments — the 4th write surface (see contract A). The client builds
   the assetRef (incl. source + label); the server assigns id+seq and re-scans
   text. upsertComment(comment) creates (no id) or updates (with id). */
export const getComments = () => request('/api/comments');
export const upsertComment = (comment, override = false) => post('/api/comments', { comment, override });
export const deleteComment = (id) => request(`/api/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });

/* launch-grid — the 5th write surface (the Instagram launch plan). Plan lives
   in content-studio/launch-grid.json; carousel slide copy lives in the html's
   caro-data JSON island. Status stays in status.json via setStatus with
   `launch-grid/<post.id>` ids. 422 responses carry .body.violations. */
export const getLaunchGrid = () => request('/api/launch-grid');
export const saveLaunchPost = (id, patch, override = false) =>
  post('/api/launch-grid/post', { id, patch, override });
export const saveLaunchSlides = (slug, payload, override = false) =>
  post('/api/launch-grid/slides', { slug, ...payload, override });

/* generate — the prompt-assembly surface (read-only). The studio bakes the
   live FACTS.md + the chosen prompts/ template + the operator's task fields
   into one SYSTEM+USER prompt a small model can run without inventing values.
   getGenTemplates() lists the templates as [{file, title}]. assemblePrompt()
   posts {template, includeCheatsheet?, task?, sourceDraft?} and gets back
   {prompt, facts, warnings} — `warnings` flags FACTS values that will surface
   as [[NEEDS]]. sourceDraft is an OPTIONAL plain basename of an existing
   drafts/*.md file; when present the server injects that draft's copy into the
   assembled prompt (a SOURCE COPY TO REPURPOSE section) so the model rewrites
   it for the chosen template/channel. When absent the prompt is byte-identical
   to today. qaCheck(text) re-runs the repo guard + the QA checklist (emoji /
   forbidden words / invented numbers) over pasted model output → {violations,
   checklist}; it writes nothing. Both endpoints are read-only — no override,
   no disk. */
export const getGenTemplates = () => request('/api/generate/templates');
export const assemblePrompt = ({ template, includeCheatsheet = false, task = {}, sourceDraft } = {}) =>
  post('/api/generate', sourceDraft ? { template, includeCheatsheet, task, sourceDraft } : { template, includeCheatsheet, task });
export const qaCheck = (text) => post('/api/qa/check', { text });

/* runPrompt — the OPT-IN local-model bridge (read-only). POSTs the SAME inputs as
   assemblePrompt to /api/generate/run; the server assembles the identical prompt
   and, only if the operator set STUDIO_MODEL_CMD, runs it through that local
   process. On 200 returns {output, exitCode, timedOut, prompt}. It is DORMANT by
   default: with no STUDIO_MODEL_CMD the server answers 501, which `request`
   surfaces as a thrown error carrying .status (501) and .body.error — the caller
   treats that as "not configured", not a failure. 400/500 throw the same way.
   It threads the SAME optional sourceDraft as assemblePrompt so a local-model
   run repurposes the chosen source draft identically. */
export const runPrompt = ({ template, includeCheatsheet = false, task = {}, sourceDraft } = {}) =>
  post('/api/generate/run', sourceDraft ? { template, includeCheatsheet, task, sourceDraft } : { template, includeCheatsheet, task });

/* drafts — the 7th (fixed, drafts-only) write surface. listDrafts() returns
   [{name, mtime, size}] for content-studio/drafts/*.md. saveDraft writes
   drafts/<name>.md atomically; the server sanitizes slug/channel and re-scans
   for retired strings with NO override (the repo guard forbids them anywhere
   under content-studio/), so a 422 here means the text must be cleaned, not
   forced. 400/403 carry .body.error for the validation/path reason. */
export const getDrafts = () => request('/api/drafts');
export const saveDraft = ({ channel, slug, content } = {}) =>
  post('/api/drafts', channel ? { channel, slug, content } : { slug, content });

/* Bulk export — bundle already-rendered PNGs (+ inline caption text) into one
   .zip. `files` is [{src,name} | {text,name}]; `src` is a repo-relative path
   inside exports/. Returns the binary {blob, filename} (the server sets the
   download name via Content-Disposition). Errors carry .status / .body.error. */
export async function exportZip({ files, zipName }) {
  const res = await fetch('/api/export-zip', {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ files, zipName }),
  });
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch { /* non-json error */ }
    const err = new Error((body && body.error) || `${res.status} ${res.statusText}`.toLowerCase());
    err.status = res.status;
    err.body = body;
    throw err;
  }
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') || '';
  const m = cd.match(/filename="?([^"]+)"?/);
  return { blob, filename: (m && m[1]) || zipName || 'export.zip' };
}

/* SSE log stream for a running action. Replays buffered lines first.
   Returns { close }. onExit receives the numeric exit code (null if unparsable). */
export function streamAction(id, { onLog, onExit } = {}) {
  const es = new EventSource(`/api/actions/${encodeURIComponent(id)}/stream`);
  if (onLog) es.addEventListener('log', (e) => onLog(e.data));
  es.addEventListener('exit', (e) => {
    let code = null;
    try { code = JSON.parse(e.data).code; } catch { /* keep null */ }
    es.close();
    if (onExit) onExit(code);
  });
  return { close: () => es.close() };
}

/* Plain-text fetch of a repo file (served from the static root). */
export async function fetchText(path) {
  const href = path.startsWith('/') ? path : '/' + path;
  const res = await fetch(href, { cache: 'no-store' });
  if (!res.ok) {
    const err = new Error(`${res.status} while loading ${path}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}
