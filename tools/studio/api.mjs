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
export const setStatus = (id, patch) => post('/api/status', { id, patch });
export const getActions = () => request('/api/actions');
export const runAction = (action) => post('/api/actions/run', { action });
export const editmodeSave = (file, edits) => post('/api/editmode', { file, edits });
export const factsCheck = (content) => post('/api/facts/check', { content });
export const factsSave = (content, override = false) => post('/api/facts/save', { content, override });

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
