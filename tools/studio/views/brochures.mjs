/* brochures.mjs — every designed HTML document (brochures, the deck, the
   brand book, the collateral kits) in an iframe viewer, grouped by kind.
   The viewer adds page nav, zoom (fit/100/200), a thumbnail strip and a
   universal annotation layer. Pages are enumerated same-origin via
   iframe.contentDocument.querySelectorAll('.page') after load; documents
   with no .page markers are treated as a single page. Kit pages that
   announce the tweaks protocol keep their edit toggle. */

import { el, clear, rootHref, announce } from '../dom.mjs';
import { createEditmodeHost } from '../components/editmode-host.mjs';
import { createAnnotationLayer } from '../components/annotation-layer.mjs';

const KIND_ORDER = [
  ['brochure', 'brochures'],
  ['deck', 'program deck'],
  ['brand-book', 'brand book'],
  ['kit', 'kits'],
];

const ZOOMS = [
  { id: 'fit', label: 'fit', scale: null },
  { id: '100', label: '100%', scale: 1 },
  { id: '200', label: '200%', scale: 2 },
];

export function render(root, ctx) {
  const docs = (ctx.manifest && ctx.manifest.documents) || [];
  const list = el('nav', { class: 'tree' });
  const viewer = el('div', { class: 'doc-viewer' });
  root.append(
    el('header', { class: 'page-head' },
      el('span', { class: 'eyebrow' }, 'library · documents'),
      el('h1', { class: 'page-title' }, 'documents'),
      el('p', { class: 'page-sub' }, 'brochures, the program deck, the brand book and the collateral kits — rendered live.')),
    el('div', { class: 'split' }, list, viewer));

  /* per-selection state torn down on every select() and on dispose() */
  let editHost = null;
  let annot = null;
  let selected = null;
  let pages = 1;
  let currentPage = 1;
  let zoom = 'fit';
  let onFrameLoad = null;
  let activeIframe = null;
  let comments = [];

  function groups() {
    const byKind = new Map(KIND_ORDER.map(([k]) => [k, []]));
    const other = [];
    for (const d of docs) {
      if (byKind.has(d.kind)) byKind.get(d.kind).push(d);
      else other.push(d);
    }
    const out = KIND_ORDER
      .map(([kind, label]) => ({ label, items: byKind.get(kind) }))
      .filter((g) => g.items.length);
    if (other.length) out.push({ label: 'other', items: other });
    return out;
  }

  function renderList() {
    clear(list);
    for (const g of groups()) {
      list.append(el('span', { class: 'mono-up tree-label' }, g.label));
      for (const d of g.items) {
        list.append(el('button', {
          class: `tree-item${selected && selected.path === d.path ? ' active' : ''}`,
          type: 'button',
          onclick: () => select(d),
        },
        el('span', { class: 'ti-label' }, d.label),
        el('span', { class: 'mono ti-path' }, d.path),
        d.openCount > 0 ? el('span', { class: 'annot-count ti-tag' }, String(d.openCount)) : null,
        d.editable ? el('span', { class: 'badge s-approved ti-tag' }, 'editable') : null));
      }
    }
  }

  /* tear down the per-document layers + listeners before swapping documents */
  function teardown() {
    if (annot) { try { annot.dispose(); } catch { /* noop */ } annot = null; }
    if (editHost) { editHost.dispose(); editHost = null; }
    if (activeIframe && onFrameLoad) {
      activeIframe.removeEventListener('load', onFrameLoad);
    }
    onFrameLoad = null;
    activeIframe = null;
  }

  function select(d) {
    selected = d;
    renderList();
    teardown();
    clear(viewer);
    pages = 1;
    currentPage = 1;
    zoom = 'fit';
    comments = [];

    const iframe = el('iframe', {
      class: 'doc-frame',
      src: rootHref(d.path),
      title: d.label,
      loading: 'lazy',
    });
    activeIframe = iframe;

    /* a positioned scaling wrapper so zoom (transform:scale) does not
       disturb the annotation layer, which overlays the whole .viewer.
       The .viewer is the relative host the layer overlays (inset:0); the
       inner .viewer-stage carries the zoom transform from its top-left. */
    const stage = el('div', {
      class: 'viewer-stage',
      style: { transformOrigin: '0 0' },
    }, iframe);
    const viewerWrap = el('div', {
      class: 'viewer',
      style: { position: 'relative', overflow: 'auto' },
    }, stage);

    /* toolbar controls */
    const prevBtn = el('button', { class: 'btn-mini', type: 'button', 'aria-label': 'previous page' }, 'prev');
    const nextBtn = el('button', { class: 'btn-mini', type: 'button', 'aria-label': 'next page' }, 'next');
    const pageLabel = el('span', { class: 'viewer-page mono' }, 'page 1 of 1');
    const zoomBtns = ZOOMS.map((z) => el('button', {
      class: `btn-mini${z.id === zoom ? ' active' : ''}`,
      type: 'button',
      'aria-label': `zoom ${z.label}`,
      onclick: () => setZoom(z.id),
    }, z.label));
    const annotToggle = el('button', {
      class: 'btn-mini annot-toggle', type: 'button', 'aria-pressed': 'false',
    }, 'annotate');

    const toolbar = el('div', { class: 'viewer-toolbar' },
      prevBtn, nextBtn, pageLabel,
      el('span', { class: 'viewer-spacer' }),
      el('span', { class: 'viewer-zoom' }, ...zoomBtns),
      annotToggle);

    const thumbStrip = el('div', { class: 'thumb-strip' });

    const head = el('div', { class: 'doc-head' },
      el('span', { class: 'doc-title' }, d.label),
      el('span', { class: 'mono doc-path' }, d.path),
      el('span', { class: 'doc-tools' },
        el('a', { class: 'btn-mini', href: rootHref(d.path), target: '_blank', rel: 'noopener' }, 'open in tab')));

    if (d.editable) {
      editHost = createEditmodeHost({ iframe, file: d.path });
      head.querySelector('.doc-tools').append(editHost.el);
    }

    viewer.append(head, toolbar, viewerWrap, thumbStrip);

    /* --- page enumeration (same-origin, after load) --- */

    function pageNodes() {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return [];
        return Array.from(doc.querySelectorAll('.page'));
      } catch { return []; }
    }

    function setPageLabel() {
      pageLabel.textContent = `page ${currentPage} of ${pages}`;
      prevBtn.disabled = pages <= 1 || currentPage <= 1;
      nextBtn.disabled = pages <= 1 || currentPage >= pages;
    }

    function scrollToPage(n) {
      const nodes = pageNodes();
      const node = nodes[n - 1];
      if (node && typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ block: 'start', inline: 'nearest' });
      }
    }

    function gotoPage(n) {
      currentPage = Math.min(pages, Math.max(1, n));
      scrollToPage(currentPage);
      setPageLabel();
      renderThumbs();
      if (annot) annot.refresh();
    }

    prevBtn.addEventListener('click', () => gotoPage(currentPage - 1));
    nextBtn.addEventListener('click', () => gotoPage(currentPage + 1));

    function renderThumbs() {
      clear(thumbStrip);
      if (pages <= 1) return;
      for (let i = 1; i <= pages; i += 1) {
        thumbStrip.append(el('button', {
          class: `thumb${i === currentPage ? ' active' : ''}`,
          type: 'button',
          'aria-label': `go to page ${i}`,
          onclick: () => gotoPage(i),
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

    /* --- annotation layer (mounts on the .viewer wrapper) --- */

    annot = createAnnotationLayer({
      host: viewerWrap,
      target: iframe,
      mode: 'iframe',
      assetBase: {
        assetId: `doc:${d.path}`,
        kind: 'iframe-brochure',
        source: d.path,
        label: d.label,
      },
      pageOf: () => currentPage,
      comments,
      onChange: () => { renderList(); },
    });

    annotToggle.addEventListener('click', () => {
      const on = !annot.isActive();
      annot.setActive(on);
      annotToggle.classList.toggle('is-on', on);
      annotToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      announce(on ? 'annotation on — click the page to drop a pin' : 'annotation off');
    });

    /* --- load timing: contentDocument is null until the iframe loads.
       Enumerate pages on load; if already loaded (cached), do it now. --- */

    function onLoaded() {
      const nodes = pageNodes();
      pages = nodes.length || 1; // documents with no .page markers = single page
      currentPage = 1;
      setPageLabel();
      renderThumbs();
      annot.refresh();
    }

    onFrameLoad = () => onLoaded();
    iframe.addEventListener('load', onFrameLoad);
    /* if same-origin doc is already parsed (bfcache / sync), reflect it now */
    try { if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') onLoaded(); } catch { /* wait for load */ }

    setPageLabel();
  }

  renderList();
  if (docs.length) select(docs[0]);
  else viewer.append(el('div', { class: 'panel-card cold' },
    el('span', { class: 'mono-up empty-tag' }, 'no documents'),
    el('p', { class: 'empty-note' }, 'the manifest returned no html documents.')));

  return function dispose() {
    teardown();
  };
}
