/* social.mjs — generic surface gallery (instagram / posters / stories /
   launch-grid; deck reuses it with a wider grid). Grid of asset cards,
   run-export with inline streaming log, lightbox, status pipeline. */

import { el, clear, rootHref } from '../dom.mjs';
import { assetCard, aspectRatioOf } from '../components/asset-card.mjs';
import { createLogStream } from '../components/log-stream.mjs';
import { createAnnotationLayer } from '../components/annotation-layer.mjs';

export function render(root, ctx, params = {}) {
  return renderSurfaceView(root, ctx, params.surfaceId, {});
}

export function renderSurfaceView(root, ctx, surfaceId, opts = {}) {
  const headerHost = el('header', { class: 'page-head' });
  const logHost = el('div', { class: 'log-host', hidden: true });
  const grid = el('div', { class: 'grid-assets' });
  root.append(headerHost, logHost, grid);

  let stream = null;
  let running = false;

  /* comments cached at the view level: fetched once, refreshed on a pin
     save/delete (onChange) and on studio-state, so the lightbox layer and the
     card badges always see the same store. */
  let comments = [];
  async function loadComments() {
    try {
      const res = await ctx.api.getComments();
      comments = (res && Array.isArray(res.comments)) ? res.comments : [];
    } catch { comments = []; }
  }
  function commentsFor(assetId) {
    return comments.filter((c) => c && c.assetRef && c.assetRef.assetId === assetId);
  }

  function surface() {
    const m = ctx.manifest;
    return m && m.surfaces ? m.surfaces.find((s) => s.id === surfaceId) : null;
  }

  async function runExport() {
    const s = surface();
    if (!s || running) return;
    try {
      const { id } = await ctx.api.runAction(s.script);
      running = true;
      if (stream) stream.dispose();
      stream = createLogStream({ action: s.script });
      clear(logHost).append(stream.el);
      logHost.hidden = false;
      stream.attach(id);
    } catch (err) {
      logHost.hidden = false;
      clear(logHost).append(el('div', { class: 'banner banner-err mono' },
        err.status === 409
          ? 'another action is already running. see actions.'
          : `could not start: ${String(err.message || err)}`.toLowerCase()));
    }
  }

  function renderHeader() {
    const s = surface();
    clear(headerHost);
    if (!s) {
      headerHost.append(
        el('span', { class: 'eyebrow' }, 'surface'),
        el('h1', { class: 'page-title' }, 'not found'),
        el('p', { class: 'page-sub' }, `no surface named "${surfaceId}" in the manifest.`));
      return;
    }
    const total = s.items.length;
    const exported = s.items.filter((i) => i.exists).length;
    const stale = s.items.filter((i) => i.exists && i.stale).length;
    headerHost.append(
      el('span', { class: 'eyebrow' }, `surface · ${s.id}`),
      el('h1', { class: 'page-title' }, String(s.label || s.id).toLowerCase()),
      el('div', { class: 'page-meta mono' },
        el('span', null, `${exported}/${total} exported`),
        el('span', { class: stale ? 'meta-warn' : '' }, stale ? `${stale} stale` : 'none stale'),
        el('span', null, String(s.aspect || '').replace('x', '×')),
        el('span', { class: 'meta-dim' }, s.exportDir)),
      el('div', { class: 'page-toolbar' },
        ...(opts.extraToolbar || []),
        el('a', { class: 'btn btn-ghost btn-sm', href: rootHref(s.source), target: '_blank', rel: 'noopener' },
          'open source'),
        el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: runExport },
          `run ${s.script}`)));
  }

  function renderGrid() {
    const s = surface();
    clear(grid);
    if (!s) return;
    const ratio = aspectRatioOf(s);
    grid.classList.toggle('wide', parseRatio(ratio) > 1);
    if (!s.items.length) {
      grid.append(el('div', { class: 'panel-card cold' },
        el('span', { class: 'mono-up empty-tag' }, 'cold state'),
        el('p', { class: 'empty-note' },
          'nothing exported yet for this surface. exports are gitignored, so a fresh checkout always starts empty.'),
        el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: runExport },
          `run ${s.script}`)));
      return;
    }
    for (const item of s.items) {
      grid.append(assetCard({
        surface: s,
        item,
        entry: ctx.entryFor(`${s.id}/${item.name}`),
        onSaveStatus: ctx.saveStatus,
        onOpen: (it) => openLightbox(it, s, ctx, {
          comments: commentsFor(`${s.id}/${it.name}`),
          onChange: async () => { await loadComments(); renderGrid(); },
        }),
        onRunExport: runExport,
      }));
    }
  }

  /* keep the log panel mounted while the grid refreshes underneath it */
  function onState() {
    running = false;
    renderHeader();
    renderGrid();
    loadComments().then(renderGrid);
  }
  window.addEventListener('studio-state', onState);

  renderHeader();
  renderGrid();
  loadComments().then(renderGrid);

  return function dispose() {
    window.removeEventListener('studio-state', onState);
    if (stream) stream.dispose();
    closeLightbox();
  };
}

function parseRatio(r) {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(r);
  return m ? Number(m[1]) / Number(m[2]) : 0.8;
}

function closeLightbox() {
  const host = document.getElementById('lightbox');
  host.hidden = true;
  clear(host);
  host.onclick = null;
}

export function openLightbox(item, surface, ctx, annot = {}) {
  const host = document.getElementById('lightbox');
  const src = rootHref(item.png);
  const name = String(item.name || '');
  const file = String(item.png || '').split('/').pop() || name;
  clear(host);
  host.hidden = false;

  let layer = null;
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    document.removeEventListener('keydown', onKey);
    if (layer) { try { layer.dispose(); } catch { /* dispose never throws */ } layer = null; }
    closeLightbox();
  }

  const img = el('img', { src, alt: name });
  const fig = el('figure', { class: 'lightbox-fig', style: { position: 'relative' } });
  const meta = el('figcaption', { class: 'lightbox-meta' },
    el('span', { class: 'mono lb-name' }, name),
    el('span', { class: 'mono lb-path' }, item.png),
    el('a', { class: 'btn-mini', href: src, download: file }, 'download'),
    el('button', { class: 'btn-mini', type: 'button', onclick: close }, 'close'));

  /* annotate toggle — only when we have a surface to anchor against */
  if (surface && ctx) {
    const annotBtn = el('button', {
      class: 'btn-mini annot-toggle', type: 'button',
      'aria-pressed': 'false', 'aria-label': 'toggle annotation mode',
    }, 'annotate');
    annotBtn.addEventListener('click', () => {
      if (!layer) return;
      const on = !layer.isActive();
      layer.setActive(on);
      annotBtn.classList.toggle('is-on', on);
      annotBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    meta.insertBefore(annotBtn, meta.querySelector('.btn-mini[download]'));

    layer = createAnnotationLayer({
      host: fig,
      target: img,
      mode: 'image',
      assetBase: {
        assetId: `${surface.id}/${item.name}`,
        kind: 'image',
        source: surface.source,
        label: `${surface.id} · ${item.name}`,
      },
      comments: Array.isArray(annot.comments) ? annot.comments : [],
      onChange: annot.onChange || null,
    });
  }

  fig.append(img, meta);
  host.append(fig);
  host.onclick = (e) => { if (e.target === host) close(); };
  document.addEventListener('keydown', onKey);
}
