/* launch.mjs — the live launch grid, in-app (contract C3 + D).
   Top: the launch-grid HTML embedded in an iframe (the row mural + carousel
   viewer run inside it unchanged) with a .viewer-toolbar carrying an annotate
   toggle. Annotation runs in mode 'iframe', kind 'iframe-grid', assetId
   `launch-grid/${slug}`. We try a __annot_context postMessage from the iframe
   (gated on e.source === iframe.contentWindow, mirroring editmode-host) to learn
   the current carousel slide; absent that — the grid does not emit it today — we
   fall back to the layer's element-selector (data-export tile names) / per-page
   normalized anchors. Below the live mural we surface the exported-PNG thumbnail
   grid (reusing renderSurfaceView) with its cold-state + run-export. dispose()
   tears down listeners + the annotation layer. */

import { el, clear, rootHref } from '../dom.mjs';
import { renderSurfaceView } from './social.mjs';
import { createAnnotationLayer } from '../components/annotation-layer.mjs';

const SURFACE_ID = 'launch-grid';

export function render(root, ctx) {
  const surface = surfaceOf(ctx);

  const head = el('header', { class: 'page-head' },
    el('span', { class: 'eyebrow' }, 'surface · launch grid'),
    el('h1', { class: 'page-title' }, 'launch grid'),
    el('p', { class: 'page-sub' },
      'the row mural and its carousels, live in-app. annotate any tile, then jump to the export grid below.'));
  root.append(head);

  if (!surface) {
    root.append(el('div', { class: 'panel-card cold' },
      el('span', { class: 'mono-up empty-tag' }, 'not found'),
      el('p', { class: 'empty-note' }, `no "${SURFACE_ID}" surface in the manifest.`)));
    return function dispose() {};
  }

  /* ---- live mural (iframe) + annotation ---- */

  let layer = null;
  let onMessage = null;
  let frameCtx = null; // last __annot_context the iframe volunteered (if any)

  const annotToggle = el('button', {
    class: 'btn-mini annot-toggle', type: 'button', 'aria-pressed': 'false',
  }, 'annotate');

  const ctxChip = el('span', { class: 'mono-up viewer-page', hidden: true }, '');

  const toolbar = el('div', { class: 'viewer-toolbar' },
    el('span', { class: 'mono-up' }, 'live mural'),
    ctxChip,
    el('span', { class: 'viewer-spacer' }),
    annotToggle,
    el('a', {
      class: 'btn-mini', href: rootHref(surface.source), target: '_blank', rel: 'noopener',
    }, 'open in tab'));

  const iframe = el('iframe', {
    class: 'doc-frame launch-frame',
    src: rootHref(surface.source),
    title: 'launch grid',
    loading: 'lazy',
  });

  /* the layer overlays this positioned wrapper, sized to the iframe box */
  const wrap = el('div', { class: 'viewer launch-viewer' }, iframe);

  root.append(toolbar, wrap);

  /* comments for this surface, kept in sync via the SSE/onChange refreshes */
  let commentsCache = null;

  /* current carousel/page index for anchor.page + pin filtering. If the grid
     ever emits __annot_context we honour it; otherwise everything lands on the
     mural (page 1) via the element-selector fallback. */
  function pageOf() {
    return (frameCtx && Number(frameCtx.page)) || 1;
  }

  function updateCtxChip() {
    if (frameCtx && frameCtx.label) {
      ctxChip.hidden = false;
      ctxChip.textContent = String(frameCtx.label).toLowerCase();
    } else {
      ctxChip.hidden = true;
      ctxChip.textContent = '';
    }
  }

  /* assetId is per-tile/slide: prefer the slug the iframe volunteers, else the
     surface-wide id. The layer's element anchor still records the data-export
     tile name, so a digest reader sees exactly which post the pin sits on. */
  function assetBase() {
    const slug = (frameCtx && frameCtx.slug) ? String(frameCtx.slug) : 'mural';
    return {
      assetId: `${SURFACE_ID}/${slug}`,
      kind: 'iframe-grid',
      source: surface.source,
      label: `launch grid · ${slug}`,
    };
  }

  function mountLayer() {
    if (layer) return;
    layer = createAnnotationLayer({
      host: wrap,
      target: iframe,
      mode: 'iframe',
      assetBase: assetBase(),
      comments: (commentsCache || []).filter(forAsset),
      pageOf,
      onChange: () => { refreshComments(); },
    });
    if (annotToggle.classList.contains('is-on')) layer.setActive(true);
  }

  function forAsset(c) {
    const id = c && c.assetRef && c.assetRef.assetId;
    return typeof id === 'string' && id.startsWith(`${SURFACE_ID}/`);
  }

  annotToggle.addEventListener('click', () => {
    const on = !annotToggle.classList.contains('is-on');
    annotToggle.classList.toggle('is-on', on);
    annotToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    annotToggle.textContent = on ? 'annotating' : 'annotate';
    if (layer) layer.setActive(on);
  });

  /* postMessage: optional slide context from the grid. Gated on the iframe's own
     window exactly like editmode-host's origin gate. Shape (forward-compat):
       { type:'__annot_context', slug, page, label } */
  onMessage = (e) => {
    if (!iframe.contentWindow || e.source !== iframe.contentWindow) return;
    const data = e.data;
    if (!data || data.type !== '__annot_context') return;
    frameCtx = {
      slug: data.slug == null ? null : String(data.slug),
      page: Number(data.page) || 1,
      label: data.label == null ? null : String(data.label),
    };
    updateCtxChip();
    if (layer) layer.refresh();
  };
  window.addEventListener('message', onMessage);

  /* mount the layer once the same-origin doc is reachable */
  iframe.addEventListener('load', () => { mountLayer(); });

  /* ---- exported-PNG thumbnail grid (reuse the generic surface view) ---- */

  async function refreshComments() {
    try {
      const res = await ctx.api.getComments();
      commentsCache = (res && res.comments) || [];
    } catch { commentsCache = commentsCache || []; }
    if (layer) layer.refresh();
  }
  refreshComments();

  const exportsHost = el('div', { class: 'launch-exports' },
    el('header', { class: 'page-head sub-head' },
      el('span', { class: 'eyebrow' }, 'exports · launch grid'),
      el('p', { class: 'page-sub' },
        'the rendered tile pngs. exports are gitignored — a fresh checkout starts cold.')));
  root.append(exportsHost);
  const disposeExports = renderSurfaceView(exportsHost, ctx, SURFACE_ID, {});

  /* ---- teardown ---- */

  return function dispose() {
    if (onMessage) { try { window.removeEventListener('message', onMessage); } catch { /* noop */ } }
    if (layer) { try { layer.dispose(); } catch { /* noop */ } layer = null; }
    if (typeof disposeExports === 'function') { try { disposeExports(); } catch { /* noop */ } }
  };
}

function surfaceOf(ctx) {
  const m = ctx && ctx.manifest;
  return m && m.surfaces ? m.surfaces.find((s) => s.id === SURFACE_ID) : null;
}
