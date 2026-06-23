/* main.mjs — studio shell: hash router, manifest/status state, nav active
   state, theme persistence. Views subscribe to the window 'studio-state'
   event to refresh their data regions without losing local UI (running
   logs, editors). 'action-exit' (from log-stream) triggers a state refetch. */

import * as api from './api.mjs';
import { el, clear, announce } from './dom.mjs';
import * as dashboard from './views/dashboard.mjs';
import * as board from './views/board.mjs';
import * as calendar from './views/calendar.mjs';
import * as social from './views/social.mjs';
import * as deck from './views/deck.mjs';
import * as brochures from './views/brochures.mjs';
import * as program from './views/program.mjs';
import * as brand from './views/brand.mjs';
import * as docs from './views/docs.mjs';
import * as facts from './views/facts.mjs';
import * as generate from './views/generate.mjs';
import * as actions from './views/actions.mjs';
import * as launch from './views/launch.mjs';
import * as instagram from './views/instagram.mjs';
import * as feedback from './views/feedback.mjs';
import * as commandPalette from './components/command-palette.mjs';

const state = { manifest: null, status: null, loadError: null, loaded: false };

const ctx = {
  api,
  get manifest() { return state.manifest; },
  get status() { return state.status; },
  entryFor(id) {
    return (state.status && state.status.assets && state.status.assets[id]) || {};
  },
  saveStatus,
  navigate(hashPath) { location.hash = '#' + hashPath; },
  refreshState,
};

async function refreshState({ silent = false } = {}) {
  try {
    const [manifest, status] = await Promise.all([api.getManifest(), api.getStatus()]);
    state.manifest = manifest;
    state.status = status;
    state.loadError = null;
  } catch (err) {
    state.loadError = err;
  }
  state.loaded = true;
  if (!silent) window.dispatchEvent(new CustomEvent('studio-state'));
}

/* optimistic status save: local state first, API second, revert on failure.
   `patch.override` (forces a guarded transition), `patch.allowStale` (forces a
   move into scheduled/posted past the stale-export guard) and
   `patch.allowOpenComments` (approves past the open-comments review gate) are all
   wire-only control flags — they travel to the server but are never stored on the
   local entry. A 409 from the state machine (illegal transition), the stale-export
   guard, or the review gate reverts the optimistic write and rethrows so the
   caller can surface the reason and offer the matching override / schedule-anyway
   / approve-anyway path. */
async function saveStatus(id, patch) {
  if (!state.status) state.status = { version: 1, assets: {} };
  if (!state.status.assets) state.status.assets = {};
  const assets = state.status.assets;
  const prev = assets[id];
  const { override, allowStale, allowOpenComments, ...localPatch } = patch || {};
  assets[id] = { ...(prev || {}), ...localPatch };
  try {
    const merged = await api.setStatus(
      id, localPatch, Boolean(override), Boolean(allowStale), Boolean(allowOpenComments),
    );
    assets[id] = merged;
    return merged;
  } catch (err) {
    if (prev === undefined) delete assets[id];
    else assets[id] = prev;
    throw err;
  }
}

/* ---- router ---- */

const ROUTES = [
  { pattern: /^\/?$/, view: dashboard },
  { pattern: /^\/program\/?$/, view: program },
  { pattern: /^\/board\/?$/, view: board },
  { pattern: /^\/calendar\/?$/, view: calendar },
  { pattern: /^\/social\/([^/]+)\/?$/, view: social, params: (m) => ({ surfaceId: decodeURIComponent(m[1]) }) },
  { pattern: /^\/deck\/?$/, view: deck },
  { pattern: /^\/brochures\/?$/, view: brochures },
  { pattern: /^\/brand\/?$/, view: brand },
  { pattern: /^\/docs(?:\/(.+))?$/, view: docs, params: (m) => ({ path: m[1] ? m[1].split('/').map(decodeURIComponent).join('/') : null }) },
  { pattern: /^\/facts\/?$/, view: facts },
  { pattern: /^\/generate\/?$/, view: generate },
  { pattern: /^\/actions\/?$/, view: actions },
  { pattern: /^\/launch\/?$/, view: launch },
  { pattern: /^\/instagram\/?$/, view: instagram },
  { pattern: /^\/feedback\/?$/, view: feedback },
];

let disposeView = null;

function currentPath() {
  const raw = location.hash.replace(/^#/, '');
  return raw || '/';
}

function setNavActive(path) {
  document.querySelectorAll('#nav a[data-route]').forEach((a) => {
    const r = a.dataset.route;
    const on = r === '/' ? path === '/' : path === r || path.startsWith(r + '/');
    a.classList.toggle('active', on);
  });
}

function renderRoute() {
  const path = currentPath();
  const viewRoot = document.getElementById('view');
  if (disposeView) {
    try { disposeView(); } catch { /* view cleanup must never break routing */ }
    disposeView = null;
  }
  clear(viewRoot);
  setNavActive(path);

  if (!state.loaded) {
    viewRoot.append(el('div', { class: 'panel-card cold' },
      el('span', { class: 'mono-up empty-tag' }, 'loading'),
      el('p', { class: 'empty-note' }, 'scanning the repo.')));
    return;
  }
  if (state.loadError || !state.manifest) {
    viewRoot.append(el('div', { class: 'panel-card cold' },
      el('span', { class: 'mono-up empty-tag' }, 'studio api unreachable'),
      el('p', { class: 'empty-note' }, 'start the server, then retry:'),
      el('pre', { class: 'md-raw boot-cmd' }, 'cd tools && npm run studio'),
      el('button', {
        class: 'btn btn-primary btn-sm', type: 'button',
        onclick: async () => { await refreshState({ silent: true }); renderRoute(); },
      }, 'retry')));
    return;
  }

  const route = ROUTES.find((r) => r.pattern.test(path));
  if (!route) {
    viewRoot.append(el('div', { class: 'panel-card cold' },
      el('span', { class: 'mono-up empty-tag' }, 'not found'),
      el('p', { class: 'empty-note' }, `no view at ${path}`)));
    return;
  }
  const m = route.pattern.exec(path);
  const result = route.view.render(viewRoot, ctx, route.params ? route.params(m) : {});
  if (typeof result === 'function') disposeView = result;
}

/* ---- theme ---- */

const THEME_KEY = 'studio.theme';

function applyTheme(light) {
  document.body.classList.toggle('theme-light', light);
  document.body.classList.toggle('on-paper', light);
  try { localStorage.setItem(THEME_KEY, light ? 'paper' : 'ink'); } catch { /* private mode */ }
}

/* ---- boot ---- */

function boot() {
  let storedTheme = null;
  try { storedTheme = localStorage.getItem(THEME_KEY); } catch { /* private mode */ }
  applyTheme(storedTheme === 'paper');

  commandPalette.init(ctx);

  window.addEventListener('hashchange', renderRoute);
  window.addEventListener('action-exit', (e) => {
    const code = e.detail && e.detail.code;
    announce(code === 0 ? 'action finished' : 'action exited with errors');
    refreshState();
  });
  window.addEventListener('studio-theme', (e) => applyTheme(Boolean(e.detail && e.detail.light)));
  window.addEventListener('studio-refresh', async () => {
    await refreshState({ silent: true });
    renderRoute();
  });

  const refreshBtn = document.getElementById('nav-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'refreshing';
      await refreshState({ silent: true });
      renderRoute();
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'refresh manifest';
    });
  }

  renderRoute(); /* loading panel */
  refreshState({ silent: true }).then(renderRoute);
}

boot();
