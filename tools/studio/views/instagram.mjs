/* instagram.mjs — the SHOWCASE: a profile-faithful mock of @eduflick.ai that
   renders ONLY approved / scheduled / posted launch posts (read-only proof of
   how the real grid materializes wave by wave). Posts are managed and edited
   in the launch-grid manager (views/launch.mjs); statuses come from
   status.json (`launch-grid/<post.id>`). Below the profile mock: the approved
   evergreen tiles from the 'instagram' surface. */

import { el, clear, rootHref, copyBtn, openModal, downloadBlob } from '../dom.mjs';
import { openLightbox } from './social.mjs';

const SURFACE_ID = 'launch-grid';
const SHOWN = ['approved', 'scheduled', 'posted'];

const stripMarkers = (s) => String(s || '').replace(/\*([^*]+)\*/g, '$1');

function assembleCaption(caption) {
  const c = caption || {};
  const parts = [c.hook, c.body, c.cta].map(stripMarkers).filter((s) => s && s.trim());
  const tags = (c.hashtags || []).join(' ');
  if (tags) parts.push(tags);
  return parts.join('\n\n');
}

const BRAND_MARK = 'M 13 13 L 167 13 L 167 82 L 120 112.5 L 167 143 L 167 167 L 13 167 Z';

function markSvg(size) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 180 180');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', BRAND_MARK);
  path.setAttribute('fill', '#5B5BF0');
  svg.append(path);
  return svg;
}

export function render(root, ctx) {
  let plan = null;
  let slidesData = null;
  let crop34 = true;
  let includeScheduled = true;
  let disposed = false;
  let modalClose = null;

  const headHost = el('header', { class: 'page-head' });
  const mockHost = el('div', { class: 'igs-wrap' });
  const evergreenHost = el('div', { class: 'igs-evergreen' });
  const footHost = el('p', { class: 'mono igs-footnote' },
    'profile thumbs are center-cropped to 3:4 by instagram — check mural seams + safe zones in the 3:4 view before posting.');
  root.append(headHost, mockHost, evergreenHost, footHost);

  /* ---- data helpers ---- */
  const surfaceOf = (id) =>
    (ctx.manifest && ctx.manifest.surfaces ? ctx.manifest.surfaces.find((s) => s.id === id) : null);
  const itemFor = (sid, name) => {
    const s = surfaceOf(sid);
    return s && s.items ? s.items.find((i) => i.name === name) : null;
  };
  const statusOf = (sid, name) => {
    const entry = ctx.entryFor(`${sid}/${name}`);
    if (entry && entry.status) return entry.status;
    const item = itemFor(sid, name);
    return (item && item.status) || 'draft';
  };
  const shownStatuses = () => (includeScheduled ? SHOWN : SHOWN.filter((s) => s !== 'scheduled'));
  const visiblePosts = () => {
    if (!plan) return [];
    return plan.posts
      .filter((p) => shownStatuses().includes(statusOf(SURFACE_ID, p.id)))
      .sort((a, b) => b.post - a.post); /* newest first — exactly how the profile fills */
  };

  /* ---- header ---- */
  function renderHead() {
    clear(headHost);
    const cropBtn = el('button', {
      class: `btn-mini${crop34 ? ' is-on' : ''}`, type: 'button', 'aria-pressed': String(crop34),
      title: 'instagram crops profile thumbs to 3:4',
      onclick: () => { crop34 = !crop34; renderHead(); renderMock(); },
    }, crop34 ? '3:4 crop' : '4:5 full');
    const schedBtn = el('button', {
      class: `btn-mini${includeScheduled ? ' is-on' : ''}`, type: 'button',
      'aria-pressed': String(includeScheduled),
      onclick: () => { includeScheduled = !includeScheduled; renderHead(); renderMock(); },
    }, 'include scheduled');
    headHost.append(
      el('span', { class: 'eyebrow' }, 'showcase · instagram'),
      el('h1', { class: 'page-title' }, 'instagram'),
      el('p', { class: 'page-sub' },
        'the profile as it will look — only approved, scheduled and posted launch posts appear here. manage them from the launch grid.'),
      el('div', { class: 'page-toolbar' },
        cropBtn, schedBtn,
        el('button', { class: 'btn-mini', type: 'button', onclick: () => ctx.navigate('/launch') }, 'manage → launch grid'),
        el('button', { class: 'btn-mini', type: 'button', onclick: () => ctx.navigate('/social/instagram') }, 'evergreen gallery')),
    );
  }

  /* ---- profile mock ---- */
  function renderMock() {
    clear(mockHost);
    const posts = visiblePosts();
    const waves = new Set(posts.map((p) => p.wave));
    const waveSummary = waves.size ? `wave ${Math.max(...waves)} of 4` : 'pre-launch';

    const card = el('div', { class: 'igs-profile' });
    card.append(
      el('div', { class: 'igs-head' },
        el('span', { class: 'igs-avatar' }, markSvg(34)),
        el('div', { class: 'igs-id' },
          el('span', { class: 'igs-handle' }, '@eduflick.ai'),
          el('span', { class: 'mono igs-stats' }, `${posts.length} post${posts.length === 1 ? '' : 's'} · ${waveSummary}`))),
      el('div', { class: 'igs-bio' },
        el('b', null, 'eduflick AI'),
        el('span', null, 'a feed for thinking · full-stack ai engineer — pioneer cohort 01'),
        el('a', {
          class: 'igs-bio-link', href: 'https://eduflickai.com/apply',
          target: '_blank', rel: 'noopener',
          title: 'the bio is the one sanctioned home of the link',
        }, 'eduflickai.com/apply')),
    );

    const grid = el('div', { class: `igs-grid ${crop34 ? 'igs-c34' : 'igs-c45'}` });
    if (!posts.length) {
      grid.append(el('div', { class: 'igs-empty' },
        el('span', { class: 'mono-up empty-tag' }, 'nothing approved yet'),
        el('p', { class: 'empty-note' }, 'approve posts in the launch grid and they appear here.'),
        el('button', { class: 'btn-mini', type: 'button', onclick: () => ctx.navigate('/launch') }, 'open launch grid')));
    } else {
      for (const post of posts) grid.append(tileFor(post));
    }
    card.append(grid);
    mockHost.append(card);
  }

  function tileFor(post) {
    const item = itemFor(SURFACE_ID, post.id);
    const status = statusOf(SURFACE_ID, post.id);
    const tile = el('button', {
      class: `igs-tile${status === 'scheduled' ? ' igs-scheduled' : ''}`,
      type: 'button',
      'aria-label': `post ${post.post} · ${post.role} · ${status}`,
      onclick: () => openPreview(post),
    });
    if (item && item.exists) {
      tile.append(el('img', { src: rootHref(item.png), alt: '', loading: 'lazy', decoding: 'async' }));
    } else {
      tile.append(el('span', { class: 'igs-cold' },
        el('span', { class: 'mono-up' }, 'not exported'),
        el('span', null, post.role)));
    }
    if (post.carouselSlug) {
      tile.append(el('span', { class: 'igs-car', 'aria-hidden': 'true', title: 'carousel' }));
    }
    if (status === 'scheduled') {
      tile.append(el('span', { class: 'mono-up igs-sched-tag' }, 'scheduled'));
    }
    return tile;
  }

  /* ---- post preview (read-only IG post mock) ---- */
  function openPreview(post) {
    const status = statusOf(SURFACE_ID, post.id);
    const slug = post.carouselSlug;
    /* frame 1 = the post tile itself — the cover is never a separate render */
    const frames = [post.id];
    if (slug && slidesData && slidesData[slug]) {
      const n = slidesData[slug].slides.length;
      for (let i = 2; i <= n; i++) frames.push(`slide-${slug}-${String(i).padStart(2, '0')}`);
    }
    let idx = 0;

    const media = el('div', { class: 'igs-media' });
    const dots = el('div', { class: 'igs-dots' });
    const renderFrame = () => {
      clear(media);
      const it = itemFor(SURFACE_ID, frames[idx]);
      if (it && it.exists) {
        media.append(el('img', { src: rootHref(it.png), alt: `${post.id} · frame ${idx + 1}` }));
      } else {
        media.append(el('span', { class: 'igs-cold' },
          el('span', { class: 'mono-up' }, 'not exported'),
          el('span', { class: 'mono' }, frames[idx])));
      }
      if (frames.length > 1) {
        media.append(
          el('button', { class: 'igs-nav igs-prev', type: 'button', 'aria-label': 'previous slide', onclick: () => nav(-1) }, '‹'),
          el('button', { class: 'igs-nav igs-next', type: 'button', 'aria-label': 'next slide', onclick: () => nav(1) }, '›'));
      }
      clear(dots);
      if (frames.length > 1) {
        frames.forEach((_, i) => dots.append(el('i', { class: i === idx ? 'on' : '' })));
      }
    };
    const nav = (d) => { idx = (idx + d + frames.length) % frames.length; renderFrame(); };
    const onKey = (e) => {
      if (e.key === 'ArrowRight') nav(1);
      if (e.key === 'ArrowLeft') nav(-1);
    };
    document.addEventListener('keydown', onKey);

    const caption = el('div', { class: 'igs-caption' },
      el('p', { class: 'igs-cap-hook' }, stripMarkers(post.caption.hook)),
      el('p', { class: 'igs-cap-body' }, stripMarkers(post.caption.body)),
      el('p', { class: 'igs-cap-cta' }, stripMarkers(post.caption.cta)),
      el('p', { class: 'igs-cap-tags' }, (post.caption.hashtags || []).join(' ')));

    const metaRow = el('div', { class: 'igs-post-meta' },
      el('span', { class: 'mono meta-dim' }, `#${String(post.post).padStart(2, '0')} · ${post.pos} · wave ${post.wave}`),
      copyBtn(() => assembleCaption(post.caption), 'copy caption'));
    if (frames.length > 1) {
      const dlBtn = el('button', {
        class: 'btn-mini', type: 'button', title: 'download all carousel slides as a zip, in order',
      }, 'slides ↓ .zip');
      dlBtn.addEventListener('click', async () => {
        const files = [];
        let missing = 0;
        frames.forEach((fname, i) => {
          const it = itemFor(SURFACE_ID, fname);
          const name = `${String(i + 1).padStart(2, '0')}_${fname}.png`;
          if (it && it.exists) files.push({ src: it.png, name });
          else missing += 1;
        });
        if (!files.length) { dlBtn.textContent = 'not exported'; return; }
        const restore = dlBtn.textContent;
        dlBtn.disabled = true;
        dlBtn.textContent = 'bundling…';
        try {
          const { blob, filename } = await ctx.api.exportZip({ files, zipName: `eduflick-${slug}-carousel.zip` });
          downloadBlob(blob, filename);
          dlBtn.textContent = missing ? `done · ${missing} missing` : 'downloaded';
        } catch {
          dlBtn.textContent = 'failed';
        } finally {
          dlBtn.disabled = false;
          setTimeout(() => { dlBtn.textContent = restore; }, 1600);
        }
      });
      metaRow.append(dlBtn);
    }

    const body = el('div', { class: 'modal-body igs-post' },
      el('div', { class: 'igs-post-head' },
        el('span', { class: 'igs-avatar igs-avatar-sm' }, markSvg(18)),
        el('span', { class: 'igs-handle-sm' }, '@eduflick.ai'),
        el('span', { class: `mono meta-dim` }, ` · ${status}`)),
      media, dots, caption, metaRow);

    modalClose = openModal(body, {
      hostClass: 'igs-modal',
      onClose: () => { document.removeEventListener('keydown', onKey); modalClose = null; },
    });
    renderFrame();
  }

  /* ---- evergreen strip ---- */
  function renderEvergreen() {
    clear(evergreenHost);
    const s = surfaceOf('instagram');
    if (!s || !s.items) return;
    const approved = s.items.filter((i) => shownStatuses().includes(statusOf('instagram', i.name)));
    evergreenHost.append(el('span', { class: 'section-label' }, 'evergreen · approved'));
    if (!approved.length) {
      evergreenHost.append(el('p', { class: 'mono igs-none' },
        'no approved evergreen posts yet — manage them in the ',
        el('a', { href: '#/social/instagram' }, 'evergreen gallery'), '.'));
      return;
    }
    const row = el('div', { class: 'igs-ever-row' });
    for (const item of approved) {
      const card = el('button', {
        class: 'igs-ever-card', type: 'button',
        'aria-label': `${item.name} · ${statusOf('instagram', item.name)}`,
        onclick: () => openLightbox(item, s, ctx),
      });
      if (item.exists) card.append(el('img', { src: rootHref(item.png), alt: '', loading: 'lazy' }));
      else card.append(el('span', { class: 'igs-cold' }, el('span', { class: 'mono-up' }, 'not exported')));
      card.append(el('span', { class: 'mono igs-ever-name' }, item.name),
        el('span', { class: `badge s-${statusOf('instagram', item.name)}` }, statusOf('instagram', item.name)));
      row.append(card);
    }
    evergreenHost.append(row);
  }

  /* ---- lifecycle ---- */
  function renderAll() {
    renderHead();
    renderMock();
    renderEvergreen();
  }

  const onState = () => { if (!disposed) renderAll(); };
  window.addEventListener('studio-state', onState);

  (async () => {
    clear(mockHost);
    mockHost.append(el('div', { class: 'panel-card cold' },
      el('span', { class: 'mono-up empty-tag' }, 'loading'),
      el('p', { class: 'empty-note' }, 'fetching the launch plan…')));
    try {
      const lg = await ctx.api.getLaunchGrid();
      if (disposed) return;
      plan = lg.plan;
      slidesData = lg.slides;
      renderAll();
    } catch (err) {
      if (disposed) return;
      clear(mockHost);
      mockHost.append(el('div', { class: 'panel-card cold' },
        el('span', { class: 'mono-up empty-tag' }, 'launch-grid api unavailable'),
        el('p', { class: 'empty-note' },
          'the studio server needs a restart to serve /api/launch-grid. ',
          String((err && err.message) || err).toLowerCase())));
    }
  })();

  return function dispose() {
    disposed = true;
    window.removeEventListener('studio-state', onState);
    if (modalClose) { try { modalClose(); } catch { /* noop */ } modalClose = null; }
  };
}
