/* brochures.mjs — every designed HTML document (brochures, the deck, the
   brand book, the collateral kits) in an iframe panel, grouped by kind.
   Kit pages that announce the tweaks protocol get an edit toggle. */

import { el, clear, rootHref } from '../dom.mjs';
import { createEditmodeHost } from '../components/editmode-host.mjs';

const KIND_ORDER = [
  ['brochure', 'brochures'],
  ['deck', 'program deck'],
  ['brand-book', 'brand book'],
  ['kit', 'kits'],
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

  let editHost = null;
  let selected = null;

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
        d.editable ? el('span', { class: 'badge s-approved ti-tag' }, 'editable') : null));
      }
    }
  }

  function select(d) {
    selected = d;
    renderList();
    clear(viewer);
    if (editHost) { editHost.dispose(); editHost = null; }

    const iframe = el('iframe', {
      class: 'doc-frame',
      src: rootHref(d.path),
      title: d.label,
      loading: 'lazy',
    });

    const head = el('div', { class: 'doc-head' },
      el('span', { class: 'doc-title' }, d.label),
      el('span', { class: 'mono doc-path' }, d.path),
      el('span', { class: 'doc-tools' },
        el('a', { class: 'btn-mini', href: rootHref(d.path), target: '_blank', rel: 'noopener' }, 'open in tab')));

    if (d.editable) {
      editHost = createEditmodeHost({ iframe, file: d.path });
      head.querySelector('.doc-tools').append(editHost.el);
    }

    viewer.append(head, iframe);
  }

  renderList();
  if (docs.length) select(docs[0]);
  else viewer.append(el('div', { class: 'panel-card cold' },
    el('span', { class: 'mono-up empty-tag' }, 'no documents'),
    el('p', { class: 'empty-note' }, 'the manifest returned no html documents.')));

  return function dispose() {
    if (editHost) editHost.dispose();
  };
}
