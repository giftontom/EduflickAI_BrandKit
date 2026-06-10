/* dashboard.mjs — the studio front door: focal headline with a halo,
   per-surface rollups, the facts guard tile, and quick links. */

import { el, clear } from '../dom.mjs';
import { STATUSES } from '../components/status-badge.mjs';
import { createLogStream } from '../components/log-stream.mjs';

export function render(root, ctx) {
  const hero = el('section', { class: 'hero-block' },
    el('div', { class: 'halo hero-halo', 'aria-hidden': 'true' }),
    el('div', { class: 'focal' },
      el('span', { class: 'eyebrow' }, 'eduflick ai · brand studio'),
      el('h1', { class: 'hero-title' }, 'the whole brand, in ', el('em', null, 'one room')),
      el('p', { class: 'hero-sub' },
        'live from the repo: galleries, documents, status and guards for the pioneer cohort launch.')));

  const statsGrid = el('div', { class: 'grid-stats' });
  const tilesGrid = el('div', { class: 'grid-tiles' });

  root.append(
    hero,
    el('section', { class: 'dash-section' },
      el('span', { class: 'mono-up section-label' }, '01 · surfaces'),
      statsGrid),
    el('section', { class: 'dash-section' },
      el('span', { class: 'mono-up section-label' }, '02 · guard + library'),
      tilesGrid));

  let guardStream = null;
  let guardRunning = false;

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
      const exported = s.items.filter((i) => i.exists).length;
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
        el('span', { class: 'mono stat-row' },
          el('span', null, 'exported'),
          el('span', { class: stale ? 'meta-warn' : 'meta-dim' }, stale ? `${stale} stale` : 'fresh')),
        pipeline ? el('span', { class: 'mono stat-row meta-dim' }, pipeline) : null));
    }
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

  /* keep the guard tile (and any running log) mounted; refresh stats only */
  function onState() {
    guardRunning = false;
    renderStats();
  }
  window.addEventListener('studio-state', onState);

  renderStats();
  renderTiles();

  return function dispose() {
    window.removeEventListener('studio-state', onState);
    if (guardStream) guardStream.dispose();
  };
}
