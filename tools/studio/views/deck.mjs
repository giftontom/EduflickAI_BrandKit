/* deck.mjs — the program deck two ways: a LIVE slide viewer (the deck HTML in
   an iframe, .stage slides enumerated same-origin with prev/next, zoom and a
   universal annotation layer) and the EXPORTED frame grid (the generic surface
   gallery, run-export + lightbox). A toolbar toggle switches between them. */

import { el, clear, rootHref, announce } from '../dom.mjs';
import { renderSurfaceView } from './social.mjs';
import { createAnnotationLayer } from '../components/annotation-layer.mjs';

const ZOOMS = [
  { id: 'fit', label: 'fit', scale: null },
  { id: '100', label: '100%', scale: 1 },
  { id: '200', label: '200%', scale: 2 },
];

export function render(root, ctx) {
  const surface = ctx.manifest && ctx.manifest.surfaces
    ? ctx.manifest.surfaces.find((s) => s.id === 'deck')
    : null;
  const deckPath = surface && surface.source
    ? surface.source
    : deckDocPath(ctx);

  /* no deck on disk -> just the (empty) export grid */
  if (!deckPath) return renderSurfaceView(root, ctx, 'deck', {});

  const mount = el('div', { class: 'deck-view' });
  root.append(mount);

  let mode = 'live'; // 'live' | 'frames'
  let liveDispose = null;
  let gridDispose = null;

  function teardown() {
    if (liveDispose) { try { liveDispose(); } catch { /* noop */ } liveDispose = null; }
    if (gridDispose) { try { gridDispose(); } catch { /* noop */ } gridDispose = null; }
  }

  function renderMode() {
    teardown();
    clear(mount);
    if (mode === 'live') liveDispose = renderLiveDeck(mount, ctx, deckPath, surface, switchTo);
    else gridDispose = renderFrameGrid(mount, ctx, switchTo);
  }

  function switchTo(next) {
    if (next === mode) return;
    mode = next;
    renderMode();
  }

  renderMode();

  return function dispose() { teardown(); };
}

function deckDocPath(ctx) {
  const docs = (ctx.manifest && ctx.manifest.documents) || [];
  const d = docs.find((x) => x.kind === 'deck');
  return d ? d.path : null;
}

/* the export frame grid (the old behaviour) with a mode toggle in the toolbar */
function renderFrameGrid(mount, ctx, switchTo) {
  const toLive = el('button', {
    class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => switchTo('live'),
  }, 'live deck');
  return renderSurfaceView(mount, ctx, 'deck', { extraToolbar: [toLive] });
}

/* the live deck: iframe + .stage enumeration + zoom + annotation */
function renderLiveDeck(mount, ctx, deckPath, surface, switchTo) {
  const label = (surface && surface.label) ? String(surface.label) : 'program deck';

  let annot = null;
  let pages = 1;
  let currentPage = 1;
  let zoom = 'fit';
  let onFrameLoad = null;

  const headerHost = el('header', { class: 'page-head' },
    el('span', { class: 'eyebrow' }, 'surface · deck'),
    el('h1', { class: 'page-title' }, 'program deck'),
    el('p', { class: 'page-sub' }, 'the full-stack ai engineer deck, rendered live — annotate any slide.'));

  const iframe = el('iframe', {
    class: 'doc-frame', src: rootHref(deckPath), title: label, loading: 'lazy',
  });
  /* .viewer is the relative host the annotation layer overlays (inset:0);
     the inner .viewer-stage carries the zoom transform from its top-left. */
  const stage = el('div', { class: 'viewer-stage', style: { transformOrigin: '0 0' } }, iframe);
  const viewerWrap = el('div', { class: 'viewer', style: { position: 'relative', overflow: 'auto' } }, stage);

  const prevBtn = el('button', { class: 'btn-mini', type: 'button', 'aria-label': 'previous slide' }, 'prev');
  const nextBtn = el('button', { class: 'btn-mini', type: 'button', 'aria-label': 'next slide' }, 'next');
  const pageLabel = el('span', { class: 'viewer-page mono' }, 'slide 1 of 1');
  const zoomBtns = ZOOMS.map((z) => el('button', {
    class: `btn-mini${z.id === zoom ? ' active' : ''}`,
    type: 'button',
    'aria-label': `zoom ${z.label}`,
    onclick: () => setZoom(z.id),
  }, z.label));
  const annotToggle = el('button', {
    class: 'btn-mini annot-toggle', type: 'button', 'aria-pressed': 'false',
  }, 'annotate');
  const toFrames = el('button', { class: 'btn-mini', type: 'button', onclick: () => switchTo('frames') }, 'exported frames');
  const openTab = el('a', { class: 'btn-mini', href: rootHref(deckPath), target: '_blank', rel: 'noopener' }, 'open deck');

  const toolbar = el('div', { class: 'viewer-toolbar' },
    prevBtn, nextBtn, pageLabel,
    el('span', { class: 'viewer-spacer' }),
    el('span', { class: 'viewer-zoom' }, ...zoomBtns),
    annotToggle, toFrames, openTab);

  const thumbStrip = el('div', { class: 'thumb-strip' });

  mount.append(headerHost, toolbar, viewerWrap, thumbStrip);

  function slideNodes() {
    try {
      const doc = iframe.contentDocument;
      if (!doc) return [];
      return Array.from(doc.querySelectorAll('.stage'));
    } catch { return []; }
  }

  function setPageLabel() {
    pageLabel.textContent = `slide ${currentPage} of ${pages}`;
    prevBtn.disabled = pages <= 1 || currentPage <= 1;
    nextBtn.disabled = pages <= 1 || currentPage >= pages;
  }

  function scrollToSlide(n) {
    const node = slideNodes()[n - 1];
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }

  function gotoSlide(n) {
    currentPage = Math.min(pages, Math.max(1, n));
    scrollToSlide(currentPage);
    setPageLabel();
    renderThumbs();
    if (annot) annot.refresh();
  }

  prevBtn.addEventListener('click', () => gotoSlide(currentPage - 1));
  nextBtn.addEventListener('click', () => gotoSlide(currentPage + 1));

  function renderThumbs() {
    clear(thumbStrip);
    if (pages <= 1) return;
    for (let i = 1; i <= pages; i += 1) {
      thumbStrip.append(el('button', {
        class: `thumb${i === currentPage ? ' active' : ''}`,
        type: 'button',
        'aria-label': `go to slide ${i}`,
        onclick: () => gotoSlide(i),
      }, String(i)));
    }
  }

  function setZoom(id) {
    zoom = id;
    const z = ZOOMS.find((q) => q.id === id) || ZOOMS[0];
    zoomBtns.forEach((b, k) => b.classList.toggle('active', ZOOMS[k].id === id));
    if (z.scale == null) {
      stage.style.transform = '';
      stage.classList.remove('is-zoomed');
    } else {
      stage.style.transform = `scale(${z.scale})`;
      stage.classList.add('is-zoomed');
    }
    if (annot) annot.refresh();
  }

  annot = createAnnotationLayer({
    host: viewerWrap,
    target: iframe,
    mode: 'iframe',
    assetBase: {
      assetId: `doc:${deckPath}`,
      kind: 'iframe-deck',
      source: deckPath,
      label,
    },
    pageOf: () => currentPage,
    comments: [],
    onChange: null,
  });

  annotToggle.addEventListener('click', () => {
    const on = !annot.isActive();
    annot.setActive(on);
    annotToggle.classList.toggle('is-on', on);
    annotToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    announce(on ? 'annotation on — click a slide to drop a pin' : 'annotation off');
  });

  function onLoaded() {
    pages = slideNodes().length || 1;
    currentPage = 1;
    setPageLabel();
    renderThumbs();
    annot.refresh();
  }

  onFrameLoad = () => onLoaded();
  iframe.addEventListener('load', onFrameLoad);
  try { if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') onLoaded(); } catch { /* wait for load */ }
  setPageLabel();

  return function dispose() {
    if (annot) { try { annot.dispose(); } catch { /* noop */ } annot = null; }
    if (onFrameLoad) iframe.removeEventListener('load', onFrameLoad);
    onFrameLoad = null;
  };
}
