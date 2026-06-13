/* dashboard.mjs — the studio front door: focal headline with a halo,
   per-surface rollups, the facts guard tile, and quick links. When a fresh
   clone has zero exports, the whole front door becomes a cold-start hero
   instead of empty grids. */

import { el, clear, fmtDate } from '../dom.mjs';
import { STATUSES, statusBadge } from '../components/status-badge.mjs';
import { createLogStream } from '../components/log-stream.mjs';
import { runActionInto } from '../components/run-action.mjs';

/* surfaces whose exports fill the galleries — used by the cold-start hero so a
   fresh clone can run the exact exports that populate the dashboard. order
   matches the actions view; deduped against the live manifest at render time. */
const SEED_EXPORTS = [
  { action: 'export', label: 'launch grid + carousel' },
  { action: 'export:ig', label: 'instagram feed' },
  { action: 'export:posters', label: 'posters' },
  { action: 'export:stories', label: 'stories' },
  { action: 'export:slides', label: 'deck slides' },
];

export function render(root, ctx) {
  const statsGrid = el('div', { class: 'grid-stats' });
  const tilesGrid = el('div', { class: 'grid-tiles' });
  const opsGrid = el('div', { class: 'grid-ops' });

  let guardStream = null;
  let guardRunning = false;
  let coldRunner = null;
  /* single-flight re-render of a stale-and-live asset (one writer at a time,
     same as the cold-start hero); its log mounts into a shared host. */
  let staleRunner = null;
  let staleRunning = false;
  const staleLogHost = el('div', { class: 'log-host', hidden: true });

  /* total exported assets across every surface — 0 on a fresh clone, since
     exports/ is generated, not committed. drives the cold-start hero. */
  function totalAssets() {
    const m = ctx.manifest;
    if (!m || !Array.isArray(m.surfaces)) return 0;
    let n = 0;
    for (const s of m.surfaces) n += (s.items || []).length;
    return n;
  }

  /* mount the normal front door (hero + surface rollups + guard/library) */
  function mountFull() {
    root.append(
      el('section', { class: 'hero-block' },
        el('div', { class: 'halo hero-halo', 'aria-hidden': 'true' }),
        el('div', { class: 'focal' },
          el('span', { class: 'eyebrow' }, 'eduflick ai · brand studio'),
          el('h1', { class: 'hero-title' }, 'the whole brand, in ', el('em', null, 'one room')),
          el('p', { class: 'hero-sub' },
            'live from the repo: galleries, documents, status and guards for the pioneer cohort launch.'))),
      el('section', { class: 'dash-section' },
        el('span', { class: 'mono-up section-label' }, '01 · surfaces'),
        statsGrid),
      el('section', { class: 'dash-section' },
        el('span', { class: 'mono-up section-label' }, '02 · ops'),
        opsGrid),
      el('section', { class: 'dash-section' },
        el('span', { class: 'mono-up section-label' }, '03 · guard + library'),
        tilesGrid));
    renderStats();
    renderOps();
    renderTiles();
  }

  /* the cold-start hero: shown when no surface has any exported asset. exports/
     is generated, not committed, so fresh clones start cold. inline run buttons
     fill the galleries via the same run/stream path the actions view uses. */
  function mountCold() {
    const coldLogHost = el('div', { class: 'log-host', hidden: true });
    const have = new Set((ctx.manifest && ctx.manifest.surfaces || []).map((s) => s.script));
    const seeds = SEED_EXPORTS.filter((s) => have.size === 0 || have.has(s.action));
    const list = seeds.length ? seeds : SEED_EXPORTS;

    const btns = [];
    let coldRunning = false;
    const runSeed = (action) => {
      if (coldRunning) return;
      coldRunning = true;
      for (const b of btns) b.disabled = true;
      if (coldRunner) coldRunner.dispose();
      coldRunner = runActionInto({
        api: ctx.api,
        action,
        logHost: coldLogHost,
        /* on a clean exit, main.mjs has already refetched the manifest by the
           time 'studio-state' fires; onState() re-renders and, now that assets
           exist, swaps the cold hero for the full front door. on failure or a
           non-zero exit, re-enable the buttons so the user can retry. */
        onExit: (code) => { if (code !== 0) { coldRunning = false; for (const b of btns) b.disabled = false; } },
      });
      coldRunner.start.then((ok) => {
        if (!ok) { coldRunning = false; for (const b of btns) b.disabled = false; }
      });
    };

    const grid = el('div', { class: 'cold-seed-grid' });
    for (const seed of list) {
      const btn = el('button', {
        class: 'btn btn-primary btn-sm', type: 'button',
        onclick: () => runSeed(seed.action),
      }, `run ${seed.action}`);
      btns.push(btn);
      grid.append(el('div', { class: 'cold-seed' },
        el('span', { class: 'mono-up action-name' }, `npm run ${seed.action}`),
        el('span', { class: 'action-label' }, seed.label),
        btn));
    }

    root.append(
      el('section', { class: 'hero-block' },
        el('div', { class: 'halo hero-halo', 'aria-hidden': 'true' }),
        el('div', { class: 'focal' },
          el('span', { class: 'eyebrow' }, 'eduflick ai · brand studio'),
          el('h1', { class: 'hero-title' }, 'the galleries are ', el('em', null, 'cold')),
          el('p', { class: 'hero-sub' },
            'fresh clones start cold: exports/ is generated, not committed. run an export to fill the galleries — output streams below, and the dashboard fills in the moment it finishes.'))),
      el('section', { class: 'dash-section' },
        el('span', { class: 'mono-up section-label' }, 'fill the galleries'),
        grid,
        coldLogHost),
      el('section', { class: 'dash-section' },
        el('span', { class: 'mono-up section-label' }, 'meanwhile'),
        el('div', { class: 'quick-links cold-links' },
          quickLink('#/brand', 'brand', 'tokens · type · logos — committed, always available'),
          quickLink('#/facts', 'facts editor', 'guarded source of truth'),
          quickLink('#/actions', 'actions', 'the full runner — exports · guards · builds'))));
  }

  function pipelineCounts(surfaceId) {
    const counts = {};
    const assets = (ctx.status && ctx.status.assets) || {};
    for (const [id, entry] of Object.entries(assets)) {
      if (!id.startsWith(surfaceId + '/')) continue;
      const s = STATUSES.includes(entry.status) ? entry.status : 'draft';
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }

  function renderStats() {
    clear(statsGrid);
    const m = ctx.manifest;
    if (!m) return;
    for (const s of m.surfaces) {
      const total = s.items.length;
      /* the manifest's real per-item flags: `exists` is the export on disk,
         `stale` is exists && source newer than the export. so:
           absent = !exists (never exported), stale = exists && stale. */
      const exported = s.items.filter((i) => i.exists).length;
      const absent = s.items.filter((i) => !i.exists).length;
      const stale = s.items.filter((i) => i.exists && i.stale).length;
      const pipe = pipelineCounts(s.id);
      const pipeline = STATUSES
        .filter((st) => pipe[st])
        .map((st) => `${pipe[st]} ${st}`)
        .join(' · ');
      const href = s.id === 'deck' ? '#/deck' : `#/social/${s.id}`;
      statsGrid.append(el('a', { class: 'stat-card surface-stat', href },
        el('span', { class: 'stat-label' }, String(s.label || s.id).toLowerCase()),
        el('span', { class: 'stat-num' }, `${exported}/${total}`),
        el('span', { class: 'health-row mono' },
          absent
            ? el('span', { class: 'dash-pill pill-absent', title: `${absent} never exported` }, `${absent} absent`)
            : null,
          stale
            ? el('span', { class: 'dash-pill pill-stale', title: `${stale} export${stale === 1 ? '' : 's'} older than source` }, `${stale} stale`)
            : null,
          (!absent && !stale)
            ? el('span', { class: 'dash-pill pill-fresh' }, 'all fresh')
            : null),
        pipeline ? el('span', { class: 'mono stat-row meta-dim' }, pipeline) : null));
    }
  }

  /* today at local midnight — scheduledFor is a calendar date, so a same-day
     plan is due (not overdue) and tomorrow's plan is neither. */
  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /* two computed operator panels, pure client-side joins of status + manifest:
       due/overdue  — scheduledFor ≤ today and status not yet posted/retired
       stale & live — manifest stale AND status in {scheduled, posted} (dangerous:
                      a live or about-to-go-live asset whose source moved on)
     each panel shows a calm empty line rather than a broken grid when clear. */
  function renderOps() {
    clear(opsGrid);
    opsGrid.append(renderDuePanel(), renderStalePanel());
  }

  function renderDuePanel() {
    const assets = (ctx.status && ctx.status.assets) || {};
    const today = startOfToday();
    const rows = [];
    for (const [id, entry] of Object.entries(assets)) {
      if (!entry || !entry.scheduledFor) continue;
      const when = new Date(String(entry.scheduledFor));
      if (Number.isNaN(when.getTime())) continue;
      const status = STATUSES.includes(entry.status) ? entry.status : 'draft';
      if (status === 'posted' || status === 'retired') continue;
      if (when.getTime() > today.getTime()) continue;
      rows.push({ id, when, overdue: when.getTime() < today.getTime(), status });
    }
    rows.sort((a, b) => a.when - b.when);

    const body = rows.length
      ? el('ul', { class: 'ops-list' },
        rows.map((r) => el('li', { class: 'ops-row' + (r.overdue ? ' is-overdue' : '') },
          el('span', { class: 'mono ops-id', title: r.id }, r.id),
          el('span', { class: 'mono ops-when' }, (r.overdue ? 'overdue · ' : 'due · ') + fmtDate(r.when)),
          statusBadge(r.status))))
      : el('p', { class: 'ops-empty mono' }, 'nothing due — no scheduled assets at or past today.');

    return el('div', { class: 'panel-card ops-panel' },
      el('span', { class: 'mono-up section-label' }, 'due / overdue'),
      el('p', { class: 'tile-sub' }, 'scheduled assets at or past today that have not posted.'),
      body);
  }

  function renderStalePanel() {
    const assets = (ctx.status && ctx.status.assets) || {};
    const m = ctx.manifest;
    const rows = [];
    if (m && Array.isArray(m.surfaces)) {
      for (const s of m.surfaces) {
        for (const item of (s.items || [])) {
          if (!(item.exists && item.stale)) continue;
          const id = `${s.id}/${item.name}`;
          const status = (assets[id] && assets[id].status) || item.status || 'draft';
          if (status !== 'scheduled' && status !== 'posted') continue;
          rows.push({ id, status, script: s.script });
        }
      }
    }
    rows.sort((a, b) => a.id.localeCompare(b.id));

    let body;
    if (rows.length) {
      const btns = [];
      const rerender = (script) => {
        if (staleRunning) return;
        staleRunning = true;
        for (const b of btns) b.disabled = true;
        if (staleRunner) staleRunner.dispose();
        staleRunner = runActionInto({
          api: ctx.api,
          action: script,
          logHost: staleLogHost,
          /* on a clean exit main.mjs has already refetched the manifest by the
             time 'studio-state' fires; renderOps() re-runs and drops any asset
             that is no longer stale. on failure, re-enable so the user retries. */
          onExit: (code) => { if (code !== 0) { staleRunning = false; for (const b of btns) b.disabled = false; } },
        });
        staleRunner.start.then((ok) => {
          if (!ok) { staleRunning = false; for (const b of btns) b.disabled = false; }
        });
      };
      body = el('ul', { class: 'ops-list' },
        rows.map((r) => {
          const btn = el('button', {
            class: 'btn-mini', type: 'button', disabled: staleRunning,
            onclick: () => rerender(r.script),
          }, `re-render ${r.script}`);
          btns.push(btn);
          return el('li', { class: 'ops-row is-stale' },
            el('span', { class: 'mono ops-id', title: r.id }, r.id),
            statusBadge(r.status),
            btn);
        }));
    } else {
      body = el('p', { class: 'ops-empty mono' }, 'all live assets are fresh — no stale scheduled or posted exports.');
    }

    return el('div', { class: 'panel-card ops-panel' },
      el('span', { class: 'mono-up section-label' }, 'stale & live'),
      el('p', { class: 'tile-sub' }, 'scheduled or posted assets whose source moved past the export.'),
      body,
      staleLogHost);
  }

  function renderTiles() {
    clear(tilesGrid);
    const m = ctx.manifest;
    const guardLogHost = el('div', { class: 'log-host', hidden: true });
    const guardBtn = el('button', {
      class: 'btn btn-primary btn-sm',
      type: 'button',
      onclick: async () => {
        if (guardRunning) return;
        try {
          const { id } = await ctx.api.runAction('check:facts');
          guardRunning = true;
          if (guardStream) guardStream.dispose();
          guardStream = createLogStream({ action: 'check:facts' });
          clear(guardLogHost).append(guardStream.el);
          guardLogHost.hidden = false;
          guardStream.attach(id);
        } catch (err) {
          guardLogHost.hidden = false;
          clear(guardLogHost).append(el('div', { class: 'banner banner-err mono' },
            err.status === 409
              ? 'another action is already running. see actions.'
              : `could not start: ${String(err.message || err)}`.toLowerCase()));
        }
      },
    }, 'run guard');

    tilesGrid.append(
      el('div', { class: 'panel-card guard-tile' },
        el('span', { class: 'mono-up section-label' }, 'facts guard'),
        el('h3', { class: 'tile-title' }, 'no retired strings ship'),
        el('p', { class: 'tile-sub' }, 'scans every active file against the retired-fact patterns in the guard.'),
        guardBtn,
        guardLogHost),
      feedbackTile(m),
      el('div', { class: 'panel-card' },
        el('span', { class: 'mono-up section-label' }, 'quick links'),
        el('div', { class: 'quick-links' },
          quickLink('#/brochures', 'documents', m ? `${m.documents.length} pages` : ''),
          quickLink('#/docs', 'docs', m ? `${m.docs.length} markdown files` : ''),
          quickLink('#/brand', 'brand', 'tokens · type · logos'),
          quickLink('#/facts', 'facts editor', 'guarded source of truth'),
          quickLink('#/actions', 'actions', 'exports · guards · builds'))));
  }

  function quickLink(href, label, sub) {
    return el('a', { class: 'quick-link', href },
      el('span', { class: 'ql-label' }, label),
      el('span', { class: 'mono ql-sub' }, sub));
  }

  /* open-comments rollup: prefer the manifest's top-level comments tally,
     fall back to summing per-surface item openCount. links to the feedback view. */
  function feedbackTile(m) {
    const roll = (m && m.comments) || {};
    let total = Number.isFinite(roll.total) ? roll.total : 0;
    let open = Number.isFinite(roll.open) ? roll.open : 0;
    if (!roll.total && m && Array.isArray(m.surfaces)) {
      total = 0;
      open = 0;
      for (const s of m.surfaces) {
        for (const item of (s.items || [])) {
          if (Number.isFinite(item.commentCount)) total += item.commentCount;
          if (Number.isFinite(item.openCount)) open += item.openCount;
        }
      }
    }
    const sub = open
      ? `${open} open of ${total} across the brand`
      : (total ? `${total} comment${total === 1 ? '' : 's'}, none open` : 'no design comments yet');
    return el('a', { class: 'panel-card', href: '#/feedback' },
      el('span', { class: 'mono-up section-label' }, 'design feedback'),
      el('h3', { class: 'tile-title' },
        el('span', { class: open ? 'meta-warn' : 'meta-dim' }, String(open)),
        ` open comment${open === 1 ? '' : 's'}`),
      el('p', { class: 'tile-sub' }, sub),
      el('span', { class: 'mono ql-sub' }, 'open the feedback digest'));
  }

  let mode = null; /* 'cold' | 'full' — current mounted layout */

  function mount() {
    clear(root);
    mode = totalAssets() === 0 ? 'cold' : 'full';
    if (mode === 'cold') mountCold();
    else mountFull();
  }

  /* on a fresh manifest: if we crossed the cold/full boundary (an export just
     filled the galleries), re-mount the whole front door. otherwise keep the
     guard tile and any running log mounted and refresh the rollups + ops panels.
     a re-render just finished, so clear the stale single-flight flag and let the
     panel rebuild drop whatever is no longer stale (and re-enable the rest). */
  function onState() {
    guardRunning = false;
    staleRunning = false;
    const next = totalAssets() === 0 ? 'cold' : 'full';
    if (next !== mode) { mount(); return; }
    if (mode === 'full') { renderStats(); renderOps(); }
  }
  window.addEventListener('studio-state', onState);

  mount();

  return function dispose() {
    window.removeEventListener('studio-state', onState);
    if (guardStream) guardStream.dispose();
    if (coldRunner) coldRunner.dispose();
    if (staleRunner) staleRunner.dispose();
  };
}
