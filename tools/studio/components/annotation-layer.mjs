/* annotation-layer.mjs — THE shared comment/annotation overlay (contract B2 + D).
   One reusable layer that drops numbered pins on ANY asset:
     - mode 'image':  normalized [0,1] coords over the <img> box.
     - mode 'iframe':  same-origin contentDocument; prefer a stable element
                       selector, fall back to per-page normalized coords;
                       re-project on scroll/resize/page-nav; filter by pageOf().
   Active mode: a click opens a compose modal -> api.upsertComment (with 422
   override UX). Each pin is a real <button> with a popover (status + delete).
   dispose() removes ALL listeners + the node and never throws. */

import { el, clear, openModal, announce } from '../dom.mjs';
import * as api from '../api.mjs';

const STATUSES = ['open', 'resolved', 'wontfix'];

export function createAnnotationLayer(opts = {}) {
  const {
    host, target, mode, assetBase,
    comments: initialComments = [],
    pageOf = null,
    onChange = null,
  } = opts;

  const layer = el('div', { class: 'annot-layer' });
  if (host) host.append(layer);

  let comments = Array.isArray(initialComments) ? initialComments.slice() : [];
  let active = false;
  let openPop = null;          // { pop, pin, close } for the single open popover
  let disposed = false;

  /* ---- helpers ---- */

  const assetId = assetBase && assetBase.assetId;
  const currentPage = () => (typeof pageOf === 'function' ? Number(pageOf()) || 1 : null);

  function forThisAsset(list) {
    return (list || []).filter((c) => c && c.assetRef && c.assetRef.assetId === assetId);
  }

  /* In iframe mode, only show pins anchored to the page currently in view. */
  function visibleComments() {
    if (mode !== 'iframe') return comments;
    const pg = currentPage();
    if (pg == null) return comments;
    return comments.filter((c) => {
      const a = c.assetRef && c.assetRef.anchor;
      const ap = a && a.page;
      return ap == null || Number(ap) === pg;
    });
  }

  /* the same-origin document of the iframe, or null while still loading */
  function frameDoc() {
    try { return target && target.contentDocument; } catch { return null; }
  }

  /* the page/slide element for a 1-based index, used as the coord basis */
  function pageElFor(page) {
    const doc = frameDoc();
    if (!doc) return null;
    const sel = '.page, .stage, [data-export]';
    const nodes = doc.querySelectorAll(sel);
    const idx = (Number(page) || 1) - 1;
    return nodes[idx] || doc.body || doc.documentElement;
  }

  /* a stable selector for an element clicked inside the frame */
  function selectorFor(node) {
    const doc = frameDoc();
    if (!node || !doc) return null;
    let cur = node;
    while (cur && cur !== doc.body && cur.nodeType === 1) {
      const ex = cur.getAttribute && cur.getAttribute('data-export');
      if (ex) return `[data-export="${cssEsc(ex)}"]`;
      cur = cur.parentElement;
    }
    const page = node.closest && (node.closest('.page') || node.closest('.stage'));
    if (page && page.parentElement) {
      const tag = page.classList.contains('stage') ? '.stage' : '.page';
      const sibs = Array.from(page.parentElement.children).filter((n) => n.matches && n.matches(tag));
      const k = sibs.indexOf(page) + 1;
      if (k > 0) return `${tag}:nth-of-type(${k})`;
    }
    return null;
  }

  function exportNameOf(node) {
    let cur = node;
    while (cur && cur.nodeType === 1) {
      const ex = cur.getAttribute && cur.getAttribute('data-export');
      if (ex) return ex;
      cur = cur.parentElement;
    }
    return null;
  }

  function cssEsc(s) {
    if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(s);
    return String(s).replace(/["\\]/g, '\\$&');
  }

  /* ---- anchor from a click (coordinate model D) ---- */

  function anchorFromImageClick(e) {
    const r = target.getBoundingClientRect();
    const x = clamp01((e.clientX - r.left) / r.width);
    const y = clamp01((e.clientY - r.top) / r.height);
    return { type: 'normalized', x, y };
  }

  function anchorFromFrameClick(e) {
    const doc = frameDoc();
    const page = currentPage() || 1;
    if (!doc) return { type: 'normalized', page, x: 0.5, y: 0.5 };
    /* coords inside the iframe document */
    let node = null;
    try { node = doc.elementFromPoint(e.clientX, e.clientY); } catch { node = null; }
    const selector = node ? selectorFor(node) : null;
    if (selector) {
      const anchor = { type: 'element', selector, page };
      const ex = exportNameOf(node);
      if (ex) anchor.exportName = ex;
      return anchor;
    }
    /* fallback: normalized within the current page element box */
    const pageEl = pageElFor(page);
    const pr = pageEl ? pageEl.getBoundingClientRect() : doc.documentElement.getBoundingClientRect();
    const x = clamp01((e.clientX - pr.left) / (pr.width || 1));
    const y = clamp01((e.clientY - pr.top) / (pr.height || 1));
    const anchor = { type: 'normalized', page, x, y };
    const ex = node ? exportNameOf(node) : null;
    if (ex) anchor.exportName = ex;
    return anchor;
  }

  function clamp01(n) {
    if (!Number.isFinite(n)) return 0.5;
    return Math.min(1, Math.max(0, n));
  }

  /* ---- pin positioning ---- */

  function placePin(pin, anchor) {
    if (mode === 'image' || anchor.type === 'normalized') {
      if (mode === 'image') {
        pin.style.left = `${clamp01(anchor.x) * 100}%`;
        pin.style.top = `${clamp01(anchor.y) * 100}%`;
        return true;
      }
    }
    /* iframe modes resolve against a live page-element box */
    const doc = frameDoc();
    if (!doc) return false;
    const page = anchor.page || 1;
    const pageEl = pageElFor(page);
    if (!pageEl) return false;
    const pr = pageEl.getBoundingClientRect();
    const wr = (host || layer).getBoundingClientRect();
    let x = 0.5;
    let y = 0.5;
    if (anchor.type === 'element' && anchor.selector) {
      let elNode = null;
      try { elNode = doc.querySelector(anchor.selector); } catch { elNode = null; }
      if (elNode) {
        const er = elNode.getBoundingClientRect();
        pin.style.left = `${er.left - wr.left + er.width / 2}px`;
        pin.style.top = `${er.top - wr.top + er.height / 2}px`;
        return true;
      }
      /* selector no longer resolves — fall back to page centre */
    } else if (anchor.type === 'normalized') {
      x = clamp01(anchor.x);
      y = clamp01(anchor.y);
    }
    pin.style.left = `${pr.left - wr.left + x * pr.width}px`;
    pin.style.top = `${pr.top - wr.top + y * pr.height}px`;
    return true;
  }

  /* ---- render pins ---- */

  function render() {
    if (disposed) return;
    closePop();
    clear(layer);
    for (const c of visibleComments()) {
      if (!c || !c.assetRef || !c.assetRef.anchor) continue;
      const status = STATUSES.includes(c.status) ? c.status : 'open';
      const pin = el('button', {
        class: 'annot-pin', type: 'button', 'data-status': status,
        'aria-label': `comment ${c.seq}: ${String(c.text || '').slice(0, 40)}`,
      }, String(c.seq == null ? '?' : c.seq));
      const ok = placePin(pin, c.assetRef.anchor);
      if (!ok) continue;
      pin.addEventListener('click', (ev) => { ev.stopPropagation(); togglePop(pin, c); });
      layer.append(pin);
    }
  }

  /* ---- pin popover (thread + status + delete) ---- */

  function closePop() {
    if (openPop) { openPop.close(); openPop = null; }
  }

  function togglePop(pin, comment) {
    if (openPop && openPop.pin === pin) { closePop(); return; }
    closePop();

    const sel = el('select', { class: 'cmd-input annot-status', 'aria-label': 'comment status' },
      STATUSES.map((s) => el('option', { value: s, selected: s === comment.status }, s)));
    const delBtn = el('button', { class: 'btn-mini is-err', type: 'button' }, 'delete');
    const msg = el('span', { class: 'mono annot-pop-msg' }, '');

    const pop = el('div', {
      class: 'annot-pop glass', role: 'dialog', 'aria-label': `comment ${comment.seq}`,
    },
    el('div', { class: 'annot-pop-head' },
      el('span', { class: 'mono-up annot-pop-seq' }, `#${comment.seq}`),
      el('span', { class: 'mono annot-pop-anchor' }, anchorLabel(comment.assetRef.anchor))),
    el('p', { class: 'annot-pop-text' }, String(comment.text || '')),
    el('div', { class: 'annot-pop-row' }, sel, delBtn),
    msg);

    layer.append(pop);
    /* position the popover beside the pin (inside the layer's coordinate space) */
    pop.style.left = pin.style.left;
    pop.style.top = pin.style.top;

    const close = () => { pop.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);

    sel.addEventListener('change', async () => {
      const next = sel.value;
      try {
        await api.upsertComment({ id: comment.id, status: next });
        announce(`comment ${comment.seq} marked ${next}`);
        closePop();
        await refresh();
        if (onChange) onChange();
      } catch (err) {
        msg.textContent = `could not update: ${errText(err)}`;
        msg.classList.add('is-err');
      }
    });

    delBtn.addEventListener('click', async () => {
      delBtn.disabled = true;
      delBtn.textContent = 'deleting';
      try {
        await api.deleteComment(comment.id);
        announce(`comment ${comment.seq} deleted`);
        closePop();
        await refresh();
        if (onChange) onChange();
      } catch (err) {
        delBtn.disabled = false;
        delBtn.textContent = 'delete';
        msg.textContent = `could not delete: ${errText(err)}`;
        msg.classList.add('is-err');
      }
    });

    openPop = { pop, pin, close };
  }

  function anchorLabel(anchor) {
    if (!anchor) return '';
    const pg = anchor.page ? `page ${anchor.page} · ` : '';
    if (anchor.type === 'element') return `${pg}${anchor.selector || anchor.exportName || 'element'}`;
    return `${pg}x ${fmt(anchor.x)}, y ${fmt(anchor.y)}`;
  }

  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2) : '?');

  /* ---- compose (active-mode click) ---- */

  function openCompose(anchor) {
    const ta = el('textarea', {
      class: 'annot-compose-ta', rows: '4', spellcheck: 'true',
      'aria-label': 'comment text', placeholder: 'what should change here?',
    });
    const violHost = el('div', { class: 'banner-host' });
    const saveBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button' }, 'save comment');
    let override = null;
    let overrideRow = null;

    const close = openModal(el('div', { class: 'modal-body annot-compose' },
      el('h3', { class: 'modal-title' }, 'add a comment'),
      el('span', { class: 'mono doc-path' }, `${assetBase.label} · ${anchorLabel(anchor)}`),
      ta,
      violHost,
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => close() }, 'cancel'),
        saveBtn)));

    async function submit(useOverride) {
      const text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      saveBtn.disabled = true;
      saveBtn.textContent = 'saving';
      try {
        const input = { assetRef: { ...assetBase, anchor }, text };
        await api.upsertComment(input, useOverride);
        announce('comment saved');
        close();
        await refresh();
        if (onChange) onChange();
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'save comment';
        if (err.status === 422 && err.body && Array.isArray(err.body.violations)) {
          showViolations(err.body.violations);
        } else {
          clear(violHost).append(el('div', { class: 'banner banner-err mono' },
            `save failed: ${errText(err)}`));
        }
      }
    }

    function showViolations(violations) {
      clear(violHost);
      override = el('input', { type: 'checkbox', id: 'annot-override' });
      overrideRow = el('label', { class: 'override-row', for: 'annot-override' },
        override,
        el('span', { class: 'mono' }, 'override the guard and save anyway'));
      violHost.append(el('div', { class: 'modal-viol' },
        el('span', { class: 'mono-up verdict v-bad' },
          `${violations.length} guard finding${violations.length === 1 ? '' : 's'}`),
        violations.map((v) => el('div', { class: 'viol' },
          el('span', { class: 'mono-up viol-line' }, v.line ? `line ${v.line}` : 'text'),
          el('span', { class: 'viol-bad' }, String(v.bad)),
          el('span', { class: 'mono viol-use' }, `use: ${v.use}`))),
        overrideRow));
      saveBtn.disabled = true;
      override.addEventListener('change', () => { saveBtn.disabled = !override.checked; });
    }

    saveBtn.addEventListener('click', () => submit(Boolean(override && override.checked)));
  }

  /* ---- click-to-add (active) ---- */

  function onLayerClick(e) {
    if (!active || disposed) return;
    if (e.target !== layer) return; /* clicks on pins/pops handled separately */
    const anchor = mode === 'image' ? anchorFromImageClick(e) : anchorFromFrameClick(e);
    openCompose(anchor);
  }
  layer.addEventListener('click', onLayerClick);

  /* ---- reprojection on iframe scroll/resize/page-nav ---- */

  let raf = 0;
  function reproject() {
    if (disposed) return;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (disposed) return;
      render();
    });
  }

  let frameWin = null;
  function bindFrame() {
    if (mode !== 'iframe' || !target) return;
    const doc = frameDoc();
    if (!doc) return;
    frameWin = doc.defaultView || (target.contentWindow || null);
    if (frameWin) {
      frameWin.addEventListener('scroll', reproject, { passive: true });
      frameWin.addEventListener('resize', reproject, { passive: true });
    }
  }
  function unbindFrame() {
    if (frameWin) {
      try {
        frameWin.removeEventListener('scroll', reproject);
        frameWin.removeEventListener('resize', reproject);
      } catch { /* cross-doc teardown — ignore */ }
      frameWin = null;
    }
  }

  const onWinResize = () => reproject();
  window.addEventListener('resize', onWinResize, { passive: true });

  const onFrameLoad = () => { if (!disposed) { bindFrame(); render(); } };
  if (mode === 'iframe' && target) {
    if (frameDoc()) bindFrame();
    else target.addEventListener('load', onFrameLoad);
  }

  /* ---- public API ---- */

  function setActive(on) {
    active = Boolean(on);
    layer.classList.toggle('is-active', active);
    if (!active) closePop();
  }

  function isActive() { return active; }

  async function refresh() {
    try {
      const res = await api.getComments();
      comments = forThisAsset(res && res.comments);
    } catch { /* keep last-known pins on a transient fetch error */ }
    render();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    try { if (raf) cancelAnimationFrame(raf); } catch { /* noop */ }
    try { closePop(); } catch { /* noop */ }
    try { layer.removeEventListener('click', onLayerClick); } catch { /* noop */ }
    try { window.removeEventListener('resize', onWinResize); } catch { /* noop */ }
    try { if (target) target.removeEventListener('load', onFrameLoad); } catch { /* noop */ }
    try { unbindFrame(); } catch { /* noop */ }
    try { if (layer.parentNode) layer.parentNode.removeChild(layer); } catch { /* noop */ }
  }

  function errText(err) {
    return String((err && (err.message || (err.body && err.body.error))) || err || 'error').toLowerCase();
  }

  /* initial paint */
  comments = forThisAsset(comments);
  render();

  return { el: layer, refresh, setActive, isActive, dispose };
}
