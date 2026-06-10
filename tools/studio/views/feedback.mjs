/* feedback.mjs — the design-feedback digest BROWSER (contract C3).
   This is the human's view of what a separate Claude Code chat will act on:
   every pinned comment, grouped by the REAL source file to edit.
     left  = .tree of source files that have comments (+ open counts)
     right = comment cards for the selected file (seq, status select →
             api.upsertComment({id,status}), anchor, text, jump-to-asset, delete)
     top   = open/resolved/wontfix counts + a "rebuild digest" button that runs
             the gen:feedback action with an inline log-stream, and a link to open
             content-studio/DESIGN_FEEDBACK.md in the docs view.
   Refreshes on 'studio-state'. dispose() removes listeners + any live stream. */

import { el, clear, fmtDate } from '../dom.mjs';
import { createLogStream } from '../components/log-stream.mjs';

const FEEDBACK_DOC = 'content-studio/DESIGN_FEEDBACK.md';
const STATUSES = ['open', 'resolved', 'wontfix'];

export function render(root, ctx) {
  let comments = [];
  let selectedSource = null;
  let stream = null;

  /* ---- top bar: counts + rebuild + digest link ---- */

  const counts = el('div', { class: 'fb-counts mono' });
  const logHost = el('div', { class: 'log-host', hidden: true });

  const rebuildBtn = el('button', {
    class: 'btn btn-primary btn-sm', type: 'button',
  }, 'rebuild digest');
  rebuildBtn.addEventListener('click', rebuild);

  const head = el('header', { class: 'page-head' },
    el('span', { class: 'eyebrow' }, 'ops · feedback'),
    el('h1', { class: 'page-title' }, 'design feedback'),
    el('p', { class: 'page-sub' },
      'every pinned comment, grouped by the source file to edit. rebuild the digest, then a separate claude code chat opens it and fixes each file.'),
    counts,
    el('div', { class: 'page-toolbar' },
      rebuildBtn,
      el('a', {
        class: 'btn btn-ghost btn-sm',
        href: `#/docs/${encodePath(FEEDBACK_DOC)}`,
      }, 'open digest')));

  const tree = el('nav', { class: 'tree fb-tree' });
  const cards = el('div', { class: 'doc-viewer fb-cards' });

  root.append(
    el('div', { class: 'feedback-view' },
      head,
      logHost,
      el('div', { class: 'split' }, tree, cards)));

  /* ---- data ---- */

  function bySource() {
    const groups = new Map();
    for (const c of comments) {
      const src = c && c.assetRef && c.assetRef.source;
      if (typeof src !== 'string' || !src) continue;
      if (!groups.has(src)) groups.set(src, []);
      groups.get(src).push(c);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
    }
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }

  function openCountOf(list) {
    return list.filter((c) => (c.status || 'open') === 'open').length;
  }

  async function refreshComments() {
    try {
      const res = await ctx.api.getComments();
      comments = (res && res.comments) || [];
    } catch { comments = comments || []; }
    const groups = bySource();
    if (!selectedSource || !groups.has(selectedSource)) {
      selectedSource = groups.size ? groups.keys().next().value : null;
    }
    renderCounts();
    renderTree();
    renderCards();
  }

  /* ---- top counts ---- */

  function renderCounts() {
    const tally = { open: 0, resolved: 0, wontfix: 0 };
    for (const c of comments) {
      const s = STATUSES.includes(c.status) ? c.status : 'open';
      tally[s] += 1;
    }
    clear(counts).append(
      el('span', { class: 'fb-count' }, el('span', { class: 'v-bad' }, String(tally.open)), ' open'),
      el('span', { class: 'fb-count' }, el('span', { class: 'v-ok' }, String(tally.resolved)), ' resolved'),
      el('span', { class: 'fb-count' }, String(tally.wontfix), " won't fix"));
  }

  /* ---- left tree: source files with comments ---- */

  function renderTree() {
    clear(tree);
    const groups = bySource();
    if (!groups.size) {
      tree.append(el('p', { class: 'empty-note' },
        'no comments yet. open any asset, toggle annotate, and drop a pin.'));
      return;
    }
    tree.append(el('span', { class: 'mono-up tree-label' }, 'source files'));
    for (const [src, list] of groups) {
      const open = openCountOf(list);
      tree.append(el('button', {
        class: `tree-item${src === selectedSource ? ' active' : ''}`,
        type: 'button',
        onclick: () => { selectedSource = src; renderTree(); renderCards(); },
      },
      el('span', { class: 'ti-label' }, fileLabel(src)),
      el('span', { class: 'mono ti-path' }, src),
      open ? el('span', { class: 'annot-count ti-tag' }, String(open)) : null));
    }
  }

  /* ---- right: comment cards for the selected source ---- */

  function renderCards() {
    clear(cards);
    if (!selectedSource) {
      cards.append(el('p', { class: 'empty-note' }, 'select a source file to see its comments.'));
      return;
    }
    const groups = bySource();
    const list = groups.get(selectedSource) || [];
    cards.append(el('div', { class: 'doc-head' },
      el('span', { class: 'doc-title' }, fileLabel(selectedSource)),
      el('span', { class: 'mono doc-path' }, selectedSource)));
    for (const c of list) cards.append(commentCard(c));
  }

  function commentCard(c) {
    const status = STATUSES.includes(c.status) ? c.status : 'open';
    const anchor = (c.assetRef && c.assetRef.anchor) || {};

    const sel = el('select', { class: 'cmd-input fb-status', 'aria-label': `status of comment ${c.seq}` },
      STATUSES.map((s) => el('option', { value: s, selected: s === status }, s)));
    const msg = el('span', { class: 'mono fb-msg' }, '');
    sel.addEventListener('change', async () => {
      const next = sel.value;
      try {
        await ctx.api.upsertComment({ id: c.id, status: next });
        await refreshComments();
      } catch (err) {
        msg.textContent = `could not update: ${errText(err)}`;
        msg.classList.add('is-err');
      }
    });

    const delBtn = el('button', { class: 'btn-mini is-err', type: 'button' }, 'delete');
    delBtn.addEventListener('click', async () => {
      delBtn.disabled = true;
      delBtn.textContent = 'deleting';
      try {
        await ctx.api.deleteComment(c.id);
        await refreshComments();
      } catch (err) {
        delBtn.disabled = false;
        delBtn.textContent = 'delete';
        msg.textContent = `could not delete: ${errText(err)}`;
        msg.classList.add('is-err');
      }
    });

    const jump = jumpLink(c);

    return el('div', { class: 'fb-card', 'data-status': status },
      el('div', { class: 'fb-card-head' },
        el('span', { class: 'mono-up fb-seq' }, `#${c.seq == null ? '?' : c.seq}`),
        el('span', { class: 'mono fb-anchor' }, anchorLabel(anchor)),
        el('span', { class: 'viewer-spacer' }),
        el('span', { class: `badge ${status === 'open' ? 's-draft' : 's-approved'} fb-tag` }, status)),
      el('p', { class: 'fb-text' }, String(c.text || '')),
      el('div', { class: 'fb-card-foot' },
        sel,
        jump,
        delBtn,
        el('span', { class: 'mono meta-dim fb-when' },
          `id ${shortId(c.id)} · ${fmtDate(c.updatedAt || c.createdAt)}`)),
      msg);
  }

  /* a link that navigates to the surface/lightbox/viewer the comment sits on */
  function jumpLink(c) {
    const target = routeFor(c.assetRef);
    if (!target) return null;
    return el('button', { class: 'btn-mini', type: 'button', onclick: () => ctx.navigate(target) },
      'jump to asset');
  }

  /* ---- rebuild digest action + inline log stream ---- */

  async function rebuild() {
    if (rebuildBtn.disabled) return;
    rebuildBtn.disabled = true;
    rebuildBtn.textContent = 'rebuilding';
    try {
      const { id } = await ctx.api.runAction('gen:feedback');
      if (stream) stream.dispose();
      stream = createLogStream({ action: 'gen:feedback' });
      clear(logHost).append(stream.el);
      logHost.hidden = false;
      stream.attach(id);
    } catch (err) {
      logHost.hidden = false;
      clear(logHost).append(el('div', { class: 'banner banner-err mono' },
        err.status === 409
          ? 'another action is already running. see actions.'
          : `could not start: ${errText(err)}`));
    } finally {
      rebuildBtn.disabled = false;
      rebuildBtn.textContent = 'rebuild digest';
    }
  }

  /* ---- live refresh ---- */

  function onState() { refreshComments(); }
  window.addEventListener('studio-state', onState);

  refreshComments();

  return function dispose() {
    window.removeEventListener('studio-state', onState);
    if (stream) { try { stream.dispose(); } catch { /* noop */ } }
  };
}

/* ---- assetRef → hash route (jump to where the pin lives) ---- */

function routeFor(assetRef) {
  const id = assetRef && assetRef.assetId;
  if (typeof id !== 'string' || !id) return null;
  if (id.startsWith('launch-grid/')) return '/launch';
  if (id.startsWith('doc:')) {
    const kind = assetRef.kind;
    return kind === 'iframe-deck' ? '/deck' : '/brochures';
  }
  const slash = id.indexOf('/');
  if (slash > 0) {
    const surfaceId = id.slice(0, slash);
    return surfaceId === 'deck' ? '/deck' : `/social/${encodeURIComponent(surfaceId)}`;
  }
  return null;
}

/* ---- formatting helpers ---- */

function anchorLabel(anchor) {
  if (!anchor || !anchor.type) return 'no anchor';
  const pg = anchor.page ? `page ${anchor.page} · ` : '';
  if (anchor.type === 'element') {
    return `${pg}${anchor.selector || anchor.exportName || 'element'}`;
  }
  const x = fmt(anchor.x);
  const y = fmt(anchor.y);
  return `${pg}x ${x}, y ${y}`;
}

const fmt = (n) => (Number.isFinite(n) ? Number(n).toFixed(2) : '?');

function fileLabel(src) {
  const base = String(src).split('/').pop() || src;
  return base.replace(/\.[a-z]+$/i, '').replace(/[_-]/g, ' ').toLowerCase();
}

function shortId(id) {
  return String(id || '').slice(0, 8) || '?';
}

function encodePath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}

function errText(err) {
  return String((err && (err.message || (err.body && err.body.error))) || err || 'error').toLowerCase();
}
