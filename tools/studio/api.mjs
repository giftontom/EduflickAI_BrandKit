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
/* status patch — the server now guards transitions via a state machine. An
   illegal transition between two existing statuses → 409 {error, from, to,
   legalNext}; pass override:true to force it (recorded with overridden:true).
   `patch.override` is the wire field the server reads; the optional 4th arg is
   a convenience that folds into the patch so callers can pass it either way. */
export const setStatus = (id, patch, override = false) =>
  post('/api/status', { id, patch: override ? { ...patch, override: true } : patch });
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
