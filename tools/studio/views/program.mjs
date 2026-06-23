/* program.mjs — the FAE "program room": every poster, brochure and the deck
   for the Full-Stack AI Engineer program, current content, in one place to
   view + evaluate. A read-only overview that links into the dedicated
   surfaces/documents views for deep evaluation (status + annotations). It
   composes the live manifest (no new server data), so it stays in sync. */

import { el, clear, rootHref } from '../dom.mjs';
import { statusBadge } from '../components/status-badge.mjs';

/* the FAE program's documents (its brochures + deck); excludes the standalone
   WhatsApp poster file, which lives in the posters surface as poster-whatsapp. */
const FAE_DOC = /Full_Stack_AI_Engineer/;
const IS_POSTER_DOC = /WhatsApp_Poster/;

export function render(root, ctx) {
  const body = el('div', { class: 'program-room' });
  root.append(
    el('header', { class: 'page-head' },
      el('span', { class: 'eyebrow' }, 'program · full-stack ai engineer'),
      el('h1', { class: 'page-title' }, 'the program room'),
      el('p', { class: 'page-sub' },
        'every poster, brochure and the deck — current content, gathered here to view and evaluate. open any surface for full annotation + status.')),
    body);

  const surface = (id) => {
    const m = ctx.manifest;
    return (m && m.surfaces && m.surfaces.find((s) => s.id === id)) || null;
  };

  function sectionHead(title, meta, href, cta) {
    return el('div', { class: 'pr-head' },
      el('h2', { class: 'pr-h' }, title),
      el('span', { class: 'pr-meta mono' }, meta),
      href ? el('a', { class: 'btn-mini', href }, cta) : null);
  }

  function coldNote(msg) {
    return el('div', { class: 'panel-card cold' },
      el('span', { class: 'mono-up empty-tag' }, 'empty'),
      el('p', { class: 'empty-note' }, msg));
  }

  function posterCard(surf, it) {
    const entry = ctx.entryFor(`${surf.id}/${it.name}`);
    return el('a', { class: 'pr-poster', href: '#/social/posters', title: it.name },
      it.exists
        ? el('img', { class: 'pr-poster-img', src: rootHref(it.png), loading: 'lazy', decoding: 'async', alt: it.name })
        : el('div', { class: 'pr-poster-img pr-cold' }, el('span', { class: 'mono-up' }, 'not exported')),
      el('div', { class: 'pr-poster-meta' },
        el('span', { class: 'pr-poster-name' }, it.name.replace(/^poster-/, '')),
        entry.status ? statusBadge(entry.status) : null,
        it.openCount > 0 ? el('span', { class: 'annot-count' }, String(it.openCount)) : null,
        it.stale ? el('span', { class: 'badge s-retired' }, 'stale') : null));
  }

  function brochureRow(d) {
    return el('div', { class: 'pr-doc' },
      el('div', { class: 'pr-doc-id' },
        el('span', { class: 'pr-doc-label' }, d.label),
        el('span', { class: 'mono pr-doc-path' }, d.path)),
      el('div', { class: 'pr-doc-tools' },
        d.openCount > 0 ? el('span', { class: 'annot-count' }, String(d.openCount)) : null,
        el('a', { class: 'btn-mini', href: '#/brochures' }, 'view'),
        d.pdf ? el('a', { class: 'btn-mini', href: rootHref(d.pdf), target: '_blank', rel: 'noopener' }, 'PDF ↓') : null));
  }

  function mount() {
    clear(body);
    const docs = (ctx.manifest && ctx.manifest.documents) || [];

    /* posters */
    const posters = surface('posters');
    const pItems = posters ? posters.items : [];
    const pExported = pItems.filter((i) => i.exists).length;
    const pSec = el('section', { class: 'pr-section' },
      sectionHead('posters', `${pExported}/${pItems.length} exported`, '#/social/posters', 'open gallery'));
    if (pItems.length) {
      const grid = el('div', { class: 'pr-posters' });
      for (const it of pItems) grid.append(posterCard(posters, it));
      // The standalone WhatsApp share poster lives in brochures/ (data-export="poster-wa",
      // rendered separately to exports/posters/poster-wa.png) — surface it as a poster here
      // so it is no longer hidden/mis-filed as a "brochure".
      const waDoc = docs.find((d) => IS_POSTER_DOC.test(d.path) && FAE_DOC.test(d.path));
      if (waDoc) {
        grid.append(el('a', {
          class: 'pr-poster', href: rootHref(waDoc.path), target: '_blank', rel: 'noopener',
          title: 'WhatsApp share poster (opens the live page)',
        },
        el('img', { class: 'pr-poster-img', src: rootHref('exports/posters/poster-wa.png'), loading: 'lazy', decoding: 'async', alt: 'WhatsApp share poster' }),
        el('div', { class: 'pr-poster-meta' },
          el('span', { class: 'pr-poster-name' }, 'whatsapp share'),
          el('span', { class: 'badge' }, 'standalone'))));
      }
      pSec.append(grid);
    } else {
      pSec.append(coldNote('no posters in the manifest yet — run export:posters.'));
    }
    body.append(pSec);

    /* brochures */
    const brochs = docs.filter((d) =>
      d.kind === 'brochure' && FAE_DOC.test(d.path) && !IS_POSTER_DOC.test(d.path));
    const withPdf = brochs.filter((d) => d.pdf).length;
    const bSec = el('section', { class: 'pr-section' },
      sectionHead('brochures', `${brochs.length} docs · ${withPdf} with PDF`, '#/brochures', 'open documents'));
    if (brochs.length) {
      const wrap = el('div', { class: 'pr-docs' });
      for (const d of brochs) wrap.append(brochureRow(d));
      bSec.append(wrap);
    } else {
      bSec.append(coldNote('no FAE brochures found in brochures/.'));
    }
    body.append(bSec);

    /* deck — its own section (slide gallery link + the deck document/PDF row) */
    const deckDoc = docs.find((d) => d.kind === 'deck' && FAE_DOC.test(d.path));
    const deck = surface('deck');
    const dCount = deck ? deck.items.filter((i) => i.exists).length : 0;
    const dTotal = deck ? deck.items.length : 0;
    const dSec = el('section', { class: 'pr-section' },
      sectionHead('program deck', `${dCount}/${dTotal} slides`, '#/deck', 'open deck'));
    if (deckDoc) dSec.append(el('div', { class: 'pr-docs' }, brochureRow(deckDoc)));
    body.append(dSec);

    /* reference links */
    body.append(el('section', { class: 'pr-section pr-links' },
      el('span', { class: 'mono-up pr-links-label' }, 'reference'),
      el('a', { class: 'btn-mini', href: '#/facts' }, 'facts'),
      el('a', { class: 'btn-mini', href: '#/docs' }, 'docs'),
      el('a', { class: 'btn-mini', href: '#/feedback' }, 'design feedback')));
  }

  function onState() { mount(); }
  window.addEventListener('studio-state', onState);
  mount();

  return function dispose() {
    window.removeEventListener('studio-state', onState);
  };
}
