/* board.mjs — the pipeline kanban: one column per status in the STATUSES enum
   (draft → approved → scheduled → posted → retired). Every asset that carries a
   status entry shows as a card under its column. Moving a card is click-to-move,
   not drag: each card offers its legal-next statuses as buttons plus an
   "override…" menu for the guarded moves. The server's state machine is the
   source of truth — a 409 surfaces {from, to, legalNext} and offers to force it
   (a re-POST with override:true). The view renders with zero console errors in
   any state, including a completely empty store. */

import { el, clear, openModal, fmtDate } from '../dom.mjs';
import { STATUSES, statusBadge, confirmOverride } from '../components/status-badge.mjs';

/* the legal forward moves the client knows about, mirroring the server contract
   (same status is an idempotent no-op and is never offered). Used only to label
   the quick-move buttons; the server still validates every POST, so a drift here
   degrades to a 409 + override prompt rather than a silent wrong write. */
const LEGAL_NEXT = {
  draft: ['approved', 'retired'],
  approved: ['scheduled', 'retired'],
  scheduled: ['posted', 'retired'],
  posted: ['retired'],
  retired: ['draft'],
};

export function render(root, ctx) {
  const headerHost = el('header', { class: 'page-head' });
  const boardHost = el('div', { class: 'board' });
  root.append(headerHost, boardHost);

  function statusOf(entry) {
    return (entry && STATUSES.includes(entry.status)) ? entry.status : 'draft';
  }

  /* manifest export-health for an asset id (`<surfaceId>/<name>`), used only to
     warn before a go-live move. Returns null when the id is not a tracked
     surface item (e.g. a launch-grid pseudo-asset) so those moves are never
     blocked. `absent` = the export was never produced; `stale` = it exists but
     its source moved past it — both make scheduling/posting risky. */
  function exportHealth(id) {
    const m = ctx.manifest;
    if (!m || !Array.isArray(m.surfaces)) return null;
    const slash = String(id).indexOf('/');
    if (slash < 0) return null;
    const surfaceId = String(id).slice(0, slash);
    const name = String(id).slice(slash + 1);
    const surface = m.surfaces.find((s) => s.id === surfaceId);
    if (!surface || !Array.isArray(surface.items)) return null;
    const item = surface.items.find((i) => i.name === name);
    if (!item) return null;
    return { absent: !item.exists, stale: Boolean(item.exists && item.stale) };
  }

  /* a go-live guard: moving INTO scheduled/posted with a stale or missing export
     is dangerous (a live or about-to-go-live asset whose render is out of date).
     Mirrors the override modal's look; resolves true only on an explicit
     "schedule anyway". The server still runs its own state-machine guard. */
  function confirmStaleSchedule(id, next, health) {
    const reason = health.absent
      ? 'has never been exported'
      : 'export is older than its source (stale)';
    return new Promise((resolve) => {
      let close = null;
      let done = false;
      const finish = (val) => { if (done) return; done = true; if (close) close(); resolve(val); };
      const card = el('div', { class: 'override-form stale-warn-form' },
        el('span', { class: 'mono-up pop-title' }, `stale export · ${shortLabel(id)}`),
        el('p', { class: 'override-msg' },
          'this asset ',
          el('span', { class: 'meta-warn' }, reason),
          `. moving it to `,
          el('span', { class: 'badge s-' + (STATUSES.includes(next) ? next : 'draft') }, next),
          ' will schedule a render that is not current.'),
        el('p', { class: 'tile-sub' }, 're-render it first from the dashboard ops panel, or schedule anyway.'),
        el('div', { class: 'pop-actions' },
          el('button', { class: 'btn-mini', type: 'button', onclick: () => finish(false) }, 'cancel'),
          el('button', {
            class: 'btn-mini btn-mini-warn', type: 'button', onclick: () => finish(true),
          }, 'schedule anyway')));
      close = openModal(card, { onClose: () => finish(false) });
    });
  }

  /* short label for a card: the asset name (drop the surface prefix) over the
     full id. scheduledFor (when present) rides along as a meta line. */
  function shortLabel(id) {
    const parts = String(id).split('/');
    return parts.length > 1 ? parts.slice(1).join('/') : id;
  }

  /* move id to next, optimistic via ctx.saveStatus. On a 409 the state machine
     rejected it; surface the modal and, if the operator forces it, re-save with
     override:true. force=true skips straight to the override patch. */
  async function move(id, next, force) {
    /* client-side go-live guard, before any POST: warn when scheduling/posting a
       stale or missing export. Skipped on a forced move (override already implies
       intent) and never blocks ids that are not tracked surface items. */
    if (!force && (next === 'scheduled' || next === 'posted')) {
      const health = exportHealth(id);
      if (health && (health.absent || health.stale)) {
        const go = await confirmStaleSchedule(id, next, health);
        if (!go) { renderBoard(); return; }
      }
    }
    const patch = { status: next };
    if (next === 'posted') patch.postedAt = new Date().toISOString();
    if (force) patch.override = true;
    try {
      await ctx.saveStatus(id, patch);
      renderBoard();
    } catch (err) {
      if (err && err.status === 409 && err.body && !force) {
        const ok = await confirmOverride(err.body, id);
        if (ok) { await move(id, next, true); return; }
      }
      /* a non-409 failure or a declined override: re-render from canonical state
         (saveStatus already reverted its optimistic local write). */
      renderBoard();
    }
  }

  /* override menu: pick any status and force the move past the state machine.
     offered on every card so an operator is never stuck when the pipeline and
     reality disagree (e.g. a backward correction posted → approved). */
  function openOverrideMenu(id, current) {
    let close = null;
    const targets = STATUSES.filter((s) => s !== current);
    const card = el('div', { class: 'override-form' },
      el('span', { class: 'mono-up pop-title' }, `override · ${shortLabel(id)}`),
      el('p', { class: 'tile-sub' }, 'force any status past the pipeline guard.'),
      el('div', { class: 'override-legal' },
        targets.map((s) => el('button', {
          class: 'btn-mini', type: 'button',
          onclick: () => { if (close) close(); move(id, s, true); },
        }, s))),
      el('div', { class: 'pop-actions' },
        el('button', { class: 'btn-mini', type: 'button', onclick: () => { if (close) close(); } }, 'cancel')));
    close = openModal(card);
  }

  function card(id, entry) {
    const current = statusOf(entry);
    const next = LEGAL_NEXT[current] || [];
    const moves = el('div', { class: 'board-card-moves' },
      next.map((s) => el('button', {
        class: 'btn-mini', type: 'button', onclick: () => move(id, s, false),
      }, `→ ${s}`)),
      el('button', { class: 'btn-mini board-override', type: 'button', onclick: () => openOverrideMenu(id, current) },
        'override…'));

    return el('article', { class: 'board-card' },
      el('span', { class: 'mono board-card-name', title: id }, shortLabel(id)),
      el('span', { class: 'mono board-card-id' }, id),
      entry && entry.scheduledFor
        ? el('span', { class: 'mono board-card-when' }, `scheduled · ${fmtDate(entry.scheduledFor)}`)
        : null,
      moves);
  }

  function renderHeader() {
    clear(headerHost);
    const assets = (ctx.status && ctx.status.assets) || {};
    const n = Object.keys(assets).length;
    headerHost.append(
      el('span', { class: 'eyebrow' }, 'pipeline · board'),
      el('h1', { class: 'page-title' }, 'status board'),
      el('p', { class: 'page-sub' },
        'every tracked asset by pipeline stage. move a card with its quick buttons; the guard blocks illegal jumps, and "override…" forces one when you must.'),
      el('div', { class: 'page-meta mono' },
        el('span', null, `${n} tracked asset${n === 1 ? '' : 's'}`),
        el('span', { class: 'meta-dim' }, 'click-to-move · server-validated')));
  }

  function renderBoard() {
    clear(boardHost);
    const assets = (ctx.status && ctx.status.assets) || {};
    /* bucket every entry under its (clamped) status; a brand-new/unknown status
       falls back to draft so it always lands somewhere visible. */
    const cols = Object.fromEntries(STATUSES.map((s) => [s, []]));
    for (const [id, entry] of Object.entries(assets)) {
      cols[statusOf(entry)].push({ id, entry });
    }
    for (const list of Object.values(cols)) list.sort((a, b) => a.id.localeCompare(b.id));

    for (const s of STATUSES) {
      const list = cols[s];
      boardHost.append(el('section', { class: `board-col col-${s}` },
        el('div', { class: 'board-col-head' },
          statusBadge(s),
          el('span', { class: 'mono board-col-count' }, String(list.length))),
        el('div', { class: 'board-col-body' },
          list.length
            ? list.map((x) => card(x.id, x.entry))
            : el('p', { class: 'board-col-empty mono' }, 'empty'))));
    }
  }

  function onState() { renderHeader(); renderBoard(); }
  window.addEventListener('studio-state', onState);

  renderHeader();
  renderBoard();

  return function dispose() {
    window.removeEventListener('studio-state', onState);
  };
}
