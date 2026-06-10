/* asset-card.mjs — one exported PNG (or its empty cold state) as a card:
   lazy thumbnail at the surface's true aspect, stale ribbon, status control,
   and — for instagram items — the parsed caption block with copy buttons. */

import { el, copyBtn, rootHref } from '../dom.mjs';
import { statusControl } from './status-badge.mjs';

export function aspectRatioOf(surface) {
  const m = /^(\d+)\s*x\s*(\d+)$/i.exec(String(surface.aspect || ''));
  return m ? `${m[1]} / ${m[2]}` : '4 / 5';
}

export function assetCard({ surface, item, entry, onSaveStatus, onOpen, onRunExport }) {
  const thumb = el('div', { class: 'asset-thumb', style: { aspectRatio: aspectRatioOf(surface) } });

  if (item.exists) {
    const img = el('img', {
      src: rootHref(item.png),
      alt: item.name,
      loading: 'lazy',
      decoding: 'async',
    });
    if (onOpen) img.addEventListener('click', () => onOpen(item));
    thumb.append(img);
    if (item.stale) thumb.append(el('span', { class: 'ribbon mono-up' }, 'stale · re-export'));
  } else {
    thumb.append(el('div', { class: 'empty-state' },
      el('span', { class: 'mono-up empty-tag' }, 'not exported'),
      el('p', { class: 'empty-note' }, 'exports build locally. run the export to fill this slot.'),
      onRunExport
        ? el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => onRunExport() },
          `run ${surface.script}`)
        : null));
  }

  const meta = el('div', { class: 'asset-meta' },
    el('span', { class: 'mono asset-name', title: item.png }, item.name),
    statusControl({ id: `${surface.id}/${item.name}`, entry, onSave: onSaveStatus }));

  const card = el('article', { class: 'asset-card' }, thumb, meta);
  if (item.caption) card.append(captionBlock(item.caption));
  return card;
}

function captionBlock(c) {
  const fields = [
    ['hook', c.hook],
    ['body', c.body],
    ['cta', c.cta],
    ['tags', c.hashtags],
  ];
  const combined = fields.map(([, v]) => v).filter(Boolean).join('\n\n');

  const head = el('div', { class: 'cap-head' },
    el('span', { class: 'mono-up cap-key' }, 'caption'),
    c.title ? el('span', { class: 'cap-title' }, c.title) : null,
    copyBtn(combined, 'copy caption'));

  const rows = fields
    .filter(([, v]) => Boolean(v))
    .map(([key, val]) => el('div', { class: 'cap-row' },
      el('span', { class: 'mono-up cap-key' }, key),
      el('span', { class: 'cap-text' }, val),
      copyBtn(val)));

  return el('div', { class: 'caption' }, head, rows);
}
