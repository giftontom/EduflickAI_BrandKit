/* launch.mjs — the launch-grid MANAGER (the workbench).
   A 3×4 profile-order grid of the 12 launch posts (PNG thumbs, status pills,
   wave chips, carousel badges) + a side editor panel: caption editing with
   live brand lint, carousel slide copy, status control with a lint-aware
   approve guard, per-post notes/comments, and a post-day copy kit.
   Data: GET/POST /api/launch-grid* (plan + slides island) — see api.mjs;
   posting status lives in status.json under `launch-grid/<post.id>`.
   The Instagram showcase (views/instagram.mjs) renders what gets approved here. */

import { el, clear, debounce, rootHref, copyBtn, fmtWhen, openModal, announce, downloadBlob } from '../dom.mjs';
import { getDrafts, fetchText } from '../api.mjs';
import { statusControl } from '../components/status-badge.mjs';
import { createLogStream } from '../components/log-stream.mjs';

const SURFACE_ID = 'launch-grid';
const WAVES = [
  { n: 1, label: 'the feed' },
  { n: 2, label: 'identity' },
  { n: 3, label: 'why + parent' },
  { n: 4, label: 'course' },
];

/* serif-accent markers (*word*) are brand typesetting signals, not literal
   Instagram text — strip them whenever a caption leaves the studio. */
const stripMarkers = (s) => String(s || '').replace(/\*([^*]+)\*/g, '$1');

export function assembleCaption(caption) {
  const c = caption || {};
  const parts = [c.hook, c.body, c.cta].map(stripMarkers).filter((s) => s && s.trim());
  const tags = (c.hashtags || []).join(' ');
  if (tags) parts.push(tags);
  return parts.join('\n\n');
}

/* ---- parse a generated caption draft into {hook, body, cta, hashtags[]} ----
   Best-effort, never throws. Handles the instagram-caption template OUTPUT
   format ("--- VARIANT 1 ---\nHook:\nBody:\nCTA:\nHashtags:") AND the markdown
   draft style the studio actually saves ("**Hook:** …" inside a "## N ·" block,
   sometimes blockquoted with "> "). We read only the FIRST recognizable block:
     - if a "--- VARIANT … ---" marker exists, scope to the first variant;
     - find the first Hook/Body/CTA/Hashtags labels (case-insensitive, tolerating
       leading ">", markdown bold/italic "*"/"_" wrappers around the label);
     - each field's value is the text after its label, plus any following lines
       up to the next recognized label;
     - Hashtags -> whitespace-split, keep only tokens starting with "#".
   GRACEFUL FALLBACK: if no Hook/Body/CTA label is found, the whole trimmed text
   becomes `body`, hook/cta empty, hashtags []. */
export function parseCaptionDraft(text) {
  const empty = { hook: '', body: '', cta: '', hashtags: [] };
  const raw = String(text == null ? '' : text);
  if (!raw.trim()) return { ...empty };

  /* if variant markers exist, scope to the first variant block only */
  let scope = raw;
  const variantRe = /^\s*-{2,}\s*variant\b[^\n]*$/gim;
  const marks = [...raw.matchAll(variantRe)];
  if (marks.length) {
    const start = marks[0].index + marks[0][0].length;
    const end = marks.length > 1 ? marks[1].index : raw.length;
    scope = raw.slice(start, end);
  }

  /* a line is a "Hook:"/"Body:"/"CTA:"/"Hashtags:" label when, after stripping a
     leading blockquote ">" and markdown emphasis, it starts with that word + ":".
     Returns {key, rest} or null. */
  const labelOf = (line) => {
    const bare = line
      .replace(/^\s*>?\s*/, '')        // blockquote prefix
      .replace(/^[*_]+/, '')           // opening md emphasis
      .trimStart();
    const m = bare.match(/^(hook|body|cta|hashtags)\b\s*[*_]*\s*:\s*(.*)$/i);
    if (!m) return null;
    return { key: m[1].toLowerCase(), rest: m[2] };
  };

  const fields = { hook: null, body: null, cta: null, hashtags: null };
  const lines = scope.split(/\r?\n/);
  let current = null;
  let found = false;
  for (const line of lines) {
    const label = labelOf(line);
    if (label) {
      found = true;
      current = label.key;
      fields[current] = label.rest != null ? label.rest : '';
      continue;
    }
    /* continuation line for the field in progress (skip stray blank lines so a
       leading blank after a label does not pad the value) */
    if (current && fields[current] != null) {
      const piece = line.replace(/^\s*>\s?/, '');
      if (fields[current] === '' && !piece.trim()) continue;
      fields[current] += (fields[current] ? '\n' : '') + piece;
    }
  }

  if (!found) return { hook: '', body: raw.trim(), cta: '', hashtags: [] };

  /* strip trailing md emphasis the label-open strip left behind, trim edges */
  const clean = (s) => String(s == null ? '' : s).replace(/[\s*_]+$/g, '').trim();
  const hashtags = clean(fields.hashtags)
    .split(/\s+/)
    .filter((t) => t.startsWith('#'));
  return {
    hook: clean(fields.hook),
    body: clean(fields.body),
    cta: clean(fields.cta),
    hashtags,
  };
}

/* ---- caption lint (the brand + instagram rules) ---- */
export function lintCaption(caption, rules) {
  const c = caption || {};
  const issues = [];
  const text = [c.hook, c.body, c.cta].map((s) => String(s || '')).join('\n');
  const noHandles = text.replace(/@[a-z0-9._]+/gi, ' ');
  if (/https?:\/\/|www\./i.test(noHandles) || /\b[a-z0-9-]+\.(com|ai|in|io|net|org)\b/i.test(noHandles)) {
    issues.push({ level: 'red', msg: 'url in caption — instagram is link-in-bio only' });
  }
  let emoji = null;
  try { emoji = text.match(/\p{Extended_Pictographic}/u); } catch { /* old engines: skip */ }
  if (emoji) issues.push({ level: 'red', msg: `emoji found: ${emoji[0]}` });
  for (const w of (rules && rules.forbidden) || []) {
    if (text.toLowerCase().includes(String(w).toLowerCase())) {
      issues.push({ level: 'red', msg: `forbidden: "${w}"` });
    }
  }
  const tags = c.hashtags || [];
  const pool = (((rules && rules.pool) || [])).map((t) => String(t).toLowerCase());
  for (const t of tags) {
    if (!pool.includes(String(t).toLowerCase())) issues.push({ level: 'red', msg: `hashtag not in pool: ${t}` });
  }
  const min = (rules && rules.hashtagMin) || 3;
  const max = (rules && rules.hashtagMax) || 5;
  if (tags.length < min || tags.length > max) {
    issues.push({ level: 'red', msg: `${tags.length} hashtag${tags.length === 1 ? '' : 's'} — allowed ${min}–${max}` });
  }
  const total = assembleCaption(c).length;
  if (total > 2200) issues.push({ level: 'red', msg: `caption ${total}/2200 — over the limit` });
  const hookLen = stripMarkers(c.hook).length;
  if (hookLen > 125) issues.push({ level: 'amber', msg: `hook past the 125-char "…more" fold (${hookLen})` });
  return issues;
}

export function render(root, ctx) {
  /* ---- state ---- */
  let plan = null;          // launch-grid.json content
  let slidesData = null;    // caro-data island content {slug: {title,surf,slides[]}}
  let comments = [];
  let openId = null;        // post id with the editor open
  let work = null;          // working copy {caption, notes, slides?} for the open post
  let dirty = false;
  let slidesDirty = false;
  let crop34 = true;
  let ghost = true;
  let waveFilter = null;
  let stream = null;
  let running = false;
  let disposed = false;
  let lintNow = [];
  let previewClose = null;
  const debounced = [];

  /* ---- hosts ---- */
  const headHost = el('header', { class: 'page-head' });
  const bannerHost = el('div', { class: 'banner-host' });
  const logHost = el('div', { class: 'log-host', hidden: true });
  const waveHost = el('div', { class: 'lgm-waves' });
  const gridHost = el('div', { class: 'lgm-grid-wrap' });
  const panelHost = el('aside', { class: 'lgm-panel', hidden: true });
  const layout = el('div', { class: 'lgm-layout' }, gridHost, panelHost);
  root.append(headHost, bannerHost, logHost, waveHost, layout);

  /* ---- data helpers ---- */
  const surface = () =>
    (ctx.manifest && ctx.manifest.surfaces ? ctx.manifest.surfaces.find((s) => s.id === SURFACE_ID) : null);
  const itemFor = (id) => {
    const s = surface();
    return s && s.items ? s.items.find((i) => i.name === id) : null;
  };
  const statusOf = (id) => {
    const entry = ctx.entryFor(`${SURFACE_ID}/${id}`);
    if (entry && entry.status) return entry.status;
    const item = itemFor(id);
    return (item && item.status) || 'draft';
  };
  const postsDesc = () => (plan ? [...plan.posts].sort((a, b) => b.post - a.post) : []);
  const commentsFor = (id) =>
    comments.filter((c) => c && c.assetRef && c.assetRef.assetId === `${SURFACE_ID}/${id}`);

  function banner(kind, text, extra) {
    clear(bannerHost);
    const b = el('div', { class: `banner banner-${kind}` }, el('span', null, text));
    if (extra) b.append(extra);
    b.append(el('button', {
      class: 'banner-close', type: 'button', 'aria-label': 'dismiss',
      onclick: () => clear(bannerHost),
    }, '×'));
    bannerHost.append(b);
  }

  /* ---- header ---- */
  function renderHead() {
    clear(headHost);
    const s = surface();
    const tileItems = postsDesc().map((p) => itemFor(p.id)).filter(Boolean);
    const exported = tileItems.filter((i) => i.exists).length;
    const stale = tileItems.filter((i) => i.exists && i.stale).length;

    const cropBtn = el('button', {
      class: `btn-mini${crop34 ? ' is-on' : ''}`, type: 'button',
      'aria-pressed': String(crop34), title: 'instagram crops profile thumbs to 3:4',
      onclick: () => { crop34 = !crop34; renderHead(); renderGrid(); },
    }, crop34 ? '3:4 crop' : '4:5 full');
    const ghostBtn = el('button', {
      class: `btn-mini${ghost ? ' is-on' : ''}`, type: 'button',
      'aria-pressed': String(ghost), title: 'dim posted tiles so the remaining queue pops',
      onclick: () => { ghost = !ghost; renderHead(); renderGrid(); },
    }, 'dim posted');
    const runBtn = el('button', {
      class: 'btn btn-primary btn-sm', type: 'button', disabled: running,
      onclick: runExport,
    }, running ? 'exporting…' : 'run export');

    headHost.append(
      el('span', { class: 'eyebrow' }, 'surface · launch grid'),
      el('h1', { class: 'page-title' }, 'launch ', el('em', null, 'grid')),
      el('p', { class: 'page-sub' },
        'plan, edit, approve and export the 12-tile launch — click a post to work on it. approved posts appear on the instagram tab.'),
      el('div', { class: 'page-toolbar' },
        cropBtn, ghostBtn,
        el('a', {
          class: 'btn-mini', target: '_blank', rel: 'noopener',
          href: s ? rootHref(s.source) : '#',
        }, 'open live mural'),
        el('button', {
          class: 'btn-mini', type: 'button',
          title: 'bundle the rendered tiles, carousel slides and captions into a zip',
          onclick: openBulkExport,
        }, 'bulk export ▾'),
        runBtn,
        el('span', { class: 'page-meta mono' },
          `${exported}/12 exported`,
          stale ? el('span', { class: 'meta-warn' }, ` · ${stale} stale`) : null),
      ),
    );
  }

  /* ---- export action ---- */
  async function runExport() {
    try {
      const r = await ctx.api.runAction('export');
      running = true;
      renderHead();
      if (stream) stream.dispose();
      stream = createLogStream({ action: 'export' });
      clear(logHost);
      logHost.append(stream.el);
      logHost.hidden = false;
      stream.attach(r.id);
    } catch (err) {
      banner('err', err && err.status === 409
        ? 'another action is already running. see actions.'
        : String((err && err.message) || err).toLowerCase());
    }
  }

  /* ---- bulk export (zip the rendered pngs + captions) ---- */
  const SCOPE_STATUSES = ['approved', 'scheduled', 'posted'];

  const scopedPosts = (approvedOnly) => {
    const list = postsDesc();
    return approvedOnly ? list.filter((p) => SCOPE_STATUSES.includes(statusOf(p.id))) : list;
  };

  /* the frame names of a carousel: index 0 = the post tile (the cover is the
     single source — never a separate render), 1..n-1 = the deck slide renders */
  function carouselFrames(post) {
    const slug = post.carouselSlug;
    if (!slug || !slidesData || !slidesData[slug]) return [];
    const n = slidesData[slug].slides.length;
    const frames = [post.id];
    for (let i = 2; i <= n; i++) frames.push(`slide-${slug}-${String(i).padStart(2, '0')}`);
    return frames;
  }

  /* each builder returns {files:[{src|text,name}], missing} — `missing` counts
     frames whose png hasn't been exported yet (skipped, not fatal). */
  function tileEntries(posts, prefix = '') {
    const files = [];
    let missing = 0;
    for (const p of posts) {
      const it = itemFor(p.id);
      if (it && it.exists) files.push({ src: it.png, name: `${prefix}${p.id}.png` });
      else missing += 1;
    }
    return { files, missing };
  }

  function slideEntries(posts, prefix = '') {
    const files = [];
    let missing = 0;
    let carousels = 0;
    for (const p of [...posts].sort((a, b) => a.post - b.post)) {
      const frames = carouselFrames(p);
      if (!frames.length) continue;
      carousels += 1;
      const folder = `${prefix}${String(p.post).padStart(2, '0')}-${p.carouselSlug}`;
      frames.forEach((fname, i) => {
        const it = itemFor(fname);
        const name = `${folder}/${String(i + 1).padStart(2, '0')}_${fname}.png`;
        if (it && it.exists) files.push({ src: it.png, name });
        else missing += 1;
      });
    }
    return { files, missing, carousels };
  }

  function captionEntries(posts, prefix = '') {
    const files = [];
    const combined = [];
    for (const p of [...posts].sort((a, b) => a.post - b.post)) {
      const text = assembleCaption(p.caption);
      files.push({ name: `${prefix}${p.id}.txt`, text });
      combined.push(`#${String(p.post).padStart(2, '0')} · ${p.pos} · ${p.role}\n\n${text}`);
    }
    files.push({ name: `${prefix}_all-captions.txt`, text: combined.join('\n\n———\n\n') });
    return { files, missing: 0 };
  }

  /* onStatus(kind,msg) lets callers (the modal) show feedback in-place; without
     it we fall back to the page banner (which sits BEHIND any open modal). */
  async function downloadZip(files, zipName, missing, btn, onStatus) {
    const say = (kind, msg) => (onStatus ? onStatus(kind, msg) : banner(kind, msg));
    if (!files || !files.length) { say('err', 'nothing to bundle — run export first'); return; }
    const restore = btn ? btn.textContent : null;
    if (btn) { btn.disabled = true; btn.textContent = 'bundling…'; }
    try {
      const { blob, filename } = await ctx.api.exportZip({ files, zipName });
      downloadBlob(blob, filename);
      announce('bundle downloaded');
      say('ok', `bundled ${files.length} file${files.length === 1 ? '' : 's'} → ${filename}${missing ? ` · ${missing} not exported yet` : ''}`);
    } catch (err) {
      const code = err && err.status;
      const msg = code === 404
        ? 'export endpoint missing — restart the studio server (ctrl+c, then npm run studio)'
        : code === 413
          ? 'bundle too large — pick a smaller scope or run export again'
          : String((err && err.message) || err).toLowerCase();
      say('err', msg);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = restore; }
    }
  }

  function openBulkExport() {
    let approvedOnly = false;
    const rowsHost = el('div', { class: 'lgm-bulk-rows' });
    const statusHost = el('div', { class: 'lgm-bulk-status', role: 'status', 'aria-live': 'polite', hidden: true });
    const setStatus = (kind, msg) => {
      clear(statusHost);
      statusHost.hidden = false;
      statusHost.className = `lgm-bulk-status lgm-bulk-${kind}`;
      statusHost.append(el('span', null, msg));
    };

    const row = ({ title, desc, files, missing, zipName }) => {
      const btn = el('button', {
        class: 'btn btn-primary btn-sm lgm-bulk-dl', type: 'button', disabled: !files.length,
      }, files.length ? 'download .zip' : 'nothing yet');
      btn.addEventListener('click', () => downloadZip(files, zipName, missing, btn, setStatus));
      return el('div', { class: 'lgm-bulk-row' },
        el('div', { class: 'lgm-bulk-meta' },
          el('span', { class: 'lgm-bulk-title' }, title),
          el('span', { class: 'mono lgm-bulk-desc' }, desc,
            missing ? el('span', { class: 'meta-warn' }, ` · ${missing} not exported`) : null)),
        btn);
    };

    const renderRows = () => {
      clear(rowsHost);
      const posts = scopedPosts(approvedOnly);
      if (!posts.length) {
        rowsHost.append(el('p', { class: 'mono lgm-hint' }, 'no posts match this scope yet.'));
        return;
      }
      const tiles = tileEntries(posts);
      const slides = slideEntries(posts);
      const caps = captionEntries(posts);
      const kit = [
        ...tileEntries(posts, 'tiles/').files,
        ...slideEntries(posts, 'carousels/').files,
        ...captionEntries(posts, 'captions/').files,
      ];
      rowsHost.append(
        row({ title: 'feed tiles', desc: `${tiles.files.length} png`, files: tiles.files, missing: tiles.missing, zipName: 'eduflick-launch-tiles.zip' }),
        row({ title: 'carousel slides', desc: `${slides.files.length} frames · ${slides.carousels} carousel${slides.carousels === 1 ? '' : 's'}`, files: slides.files, missing: slides.missing, zipName: 'eduflick-launch-carousels.zip' }),
        row({ title: 'everything · post-day kit', desc: `tiles + carousels + captions · ${kit.length} files`, files: kit, missing: tiles.missing + slides.missing, zipName: 'eduflick-launch-kit.zip' }),
        row({ title: 'captions only', desc: `${caps.files.length} text files`, files: caps.files, missing: 0, zipName: 'eduflick-launch-captions.zip' }),
      );

      /* by wave — each wave is one row of the grid (bottom→top = wave 1→4).
         Each download is that row's tiles + carousel slides + captions. */
      const waveSlug = (w) => `wave-${w.n}-${w.label.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')}`;
      rowsHost.append(el('div', { class: 'mono-up lgm-bulk-divider' }, 'by wave · each row'));
      for (const w of WAVES) {
        const wavePosts = posts.filter((p) => p.wave === w.n);
        if (!wavePosts.length) {
          rowsHost.append(row({
            title: `wave ${w.n} · ${w.label}`, desc: 'no posts in scope',
            files: [], missing: 0, zipName: `eduflick-${waveSlug(w)}.zip`,
          }));
          continue;
        }
        const wt = tileEntries(wavePosts, 'tiles/');
        const ws = slideEntries(wavePosts, 'carousels/');
        const wc = captionEntries(wavePosts, 'captions/');
        rowsHost.append(row({
          title: `wave ${w.n} · ${w.label}`,
          desc: `${wavePosts.length} post${wavePosts.length === 1 ? '' : 's'} · ${wt.files.length} tile${wt.files.length === 1 ? '' : 's'} · ${ws.files.length} slide frame${ws.files.length === 1 ? '' : 's'} + captions`,
          files: [...wt.files, ...ws.files, ...wc.files],
          missing: wt.missing + ws.missing,
          zipName: `eduflick-${waveSlug(w)}.zip`,
        }));
      }
    };

    openModal(el('div', { class: 'modal-body lgm-bulk' },
      el('div', { class: 'lgm-bulk-head' },
        el('span', { class: 'mono-up' }, 'bulk export'),
        el('label', { class: 'lgm-bulk-scope' },
          el('input', { type: 'checkbox', onchange: (e) => { approvedOnly = e.target.checked; renderRows(); } }),
          el('span', null, 'approved, scheduled & posted only'))),
      rowsHost,
      statusHost,
      el('p', { class: 'mono lgm-hint' },
        'bundles the rendered pngs (2160×2700) into one zip — run export first to refresh stale tiles.')),
    { hostClass: 'lgm-bulk-modal' });
    renderRows();
  }

  /* ---- wave strip ---- */
  function renderWaves() {
    clear(waveHost);
    if (!plan) return;
    for (const w of WAVES) {
      const ids = plan.posts.filter((p) => p.wave === w.n).map((p) => p.id);
      const posted = ids.filter((id) => statusOf(id) === 'posted').length;
      waveHost.append(el('button', {
        class: `lgm-wave${waveFilter === w.n ? ' is-on' : ''}`, type: 'button',
        'aria-pressed': String(waveFilter === w.n),
        onclick: () => { waveFilter = waveFilter === w.n ? null : w.n; renderWaves(); renderGrid(); },
      },
        el('span', { class: 'mono-up lgm-wave-n' }, `wave ${w.n}`),
        el('span', { class: 'lgm-wave-label' }, w.label),
        el('span', { class: 'mono lgm-wave-meta' }, `${posted}/${ids.length} posted`)));
    }
    waveHost.append(el('span', { class: 'mono lgm-order-note' },
      'post bottom row first, right → center → left · waves 1 → 4 · newest lands top-left'));
  }

  /* ---- the grid ---- */
  function renderGrid() {
    clear(gridHost);
    if (!plan) return;
    const grid = el('div', { class: `lgm-grid ${crop34 ? 'lgm-c34' : 'lgm-c45'}` });
    for (const post of postsDesc()) {
      grid.append(tileFor(post));
    }
    gridHost.append(grid);
  }

  function tileFor(post) {
    const item = itemFor(post.id);
    const status = statusOf(post.id);
    const slug = post.carouselSlug;
    const slideCount = slug && slidesData && slidesData[slug] ? slidesData[slug].slides.length : 0;
    const ghosted = ghost && status === 'posted';
    const dimmed = waveFilter && post.wave !== waveFilter;

    const tile = el('button', {
      class: `lgm-tile${ghosted ? ' lgm-ghosted' : ''}${dimmed ? ' lgm-dim' : ''}${openId === post.id ? ' lgm-active' : ''}`,
      type: 'button',
      'aria-label': `post ${post.post} · ${post.pos} · ${post.role} · ${status}`,
      title: `#${post.post} · ${post.pos} · ${post.role}${item && item.stale ? ' · stale export' : ''}`,
      onclick: () => openEditor(post.id),
    });
    if (item && item.exists) {
      tile.append(el('img', { src: rootHref(item.png), alt: '', loading: 'lazy', decoding: 'async' }));
    } else {
      tile.append(el('span', { class: 'lgm-cold' },
        el('span', { class: 'mono-up' }, 'not exported'),
        el('span', { class: 'lgm-cold-role' }, post.role)));
    }
    tile.append(
      el('span', { class: 'mono lgm-chip lgm-chip-id' }, `#${post.post} · ${post.pos}`),
      el('span', { class: `badge s-${status} lgm-chip-status` }, status),
      el('span', { class: 'mono lgm-chip lgm-chip-wave' }, `w${post.wave}`),
    );
    if (slideCount) {
      tile.append(el('span', { class: 'mono lgm-chip lgm-chip-car', title: `carousel · ${slideCount} slides` },
        el('span', { class: 'lgm-carstack', 'aria-hidden': 'true' }), `${slideCount}`));
    }
    if (item && item.exists && item.stale) tile.classList.add('lgm-stale');
    const open = commentsFor(post.id).filter((c) => c.status === 'open').length;
    if (open) tile.append(el('span', { class: 'annot-count lgm-chip-notes', title: `${open} open note${open === 1 ? '' : 's'}` }, String(open)));
    if (ghosted) tile.append(el('span', { class: 'mono-up lgm-posted-mark' }, '✓ posted'));
    return tile;
  }

  /* ---- slide preview (rendered PNGs, pager) ---- */
  function openSlidesPreview(post, startAt = 0) {
    const slug = post.carouselSlug;
    if (!slug || !slidesData || !slidesData[slug]) return;
    const n = slidesData[slug].slides.length;
    /* frame 1 = the post tile itself (the cover is never a separate render) */
    const frames = [post.id];
    for (let i = 2; i <= n; i++) frames.push(`slide-${slug}-${String(i).padStart(2, '0')}`);
    let idx = Math.min(Math.max(startAt, 0), frames.length - 1);

    const media = el('div', { class: 'lgm-pv-media' });
    const dots = el('div', { class: 'lgm-pv-dots' });
    const metaEl = el('span', { class: 'mono meta-dim' });
    const renderFrame = () => {
      clear(media);
      const it = itemFor(frames[idx]);
      if (it && it.exists) {
        media.append(el('img', { src: rootHref(it.png), alt: `${slug} · slide ${idx + 1}` }));
      } else {
        media.append(el('span', { class: 'lgm-cold' },
          el('span', { class: 'mono-up' }, 'not exported'),
          el('span', { class: 'mono' }, frames[idx])));
      }
      if (frames.length > 1) {
        media.append(
          el('button', { class: 'lgm-pv-nav lgm-pv-prev', type: 'button', 'aria-label': 'previous slide', onclick: () => nav(-1) }, '‹'),
          el('button', { class: 'lgm-pv-nav lgm-pv-next', type: 'button', 'aria-label': 'next slide', onclick: () => nav(1) }, '›'));
      }
      clear(dots);
      frames.forEach((_, i) => dots.append(el('i', { class: i === idx ? 'on' : '' })));
      metaEl.textContent = `${String(idx + 1).padStart(2, '0')}/${String(n).padStart(2, '0')} · ${frames[idx]}${it && it.stale ? ' · stale' : ''}`;
    };
    const nav = (d) => { idx = (idx + d + frames.length) % frames.length; renderFrame(); };
    const onKey = (e) => {
      if (e.key === 'ArrowRight') nav(1);
      if (e.key === 'ArrowLeft') nav(-1);
    };
    document.addEventListener('keydown', onKey);
    previewClose = openModal(el('div', { class: 'modal-body lgm-pv' },
      el('div', { class: 'lgm-pv-head' },
        el('span', { class: 'mono-up lgm-p-id' }, `slides · ${slug} · ${post.role}`), metaEl),
      media, dots,
      el('p', { class: 'mono lgm-hint' }, 'renders from the last export — run export after editing copy. ← → to flip.')),
    {
      hostClass: 'lgm-pv-modal',
      onClose: () => { document.removeEventListener('keydown', onKey); previewClose = null; },
    });
    renderFrame();
  }

  /* ---- editor panel ---- */
  function confirmModal(text, yesLabel) {
    return new Promise((resolve) => {
      let done = false;
      const body = el('div', { class: 'modal-body' },
        el('p', { class: 'pop-title' }, text),
        el('div', { class: 'modal-actions' },
          el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { done = true; close(); resolve(false); } }, 'keep editing'),
          el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => { done = true; close(); resolve(true); } }, yesLabel || 'continue')));
      const close = openModal(body, { onClose: () => { if (!done) resolve(false); } });
    });
  }

  async function openEditor(id) {
    if (openId === id) return;
    if ((dirty || slidesDirty) && !(await confirmModal('unsaved changes — discard them?', 'discard'))) return;
    openId = id;
    dirty = false;
    slidesDirty = false;
    const post = plan.posts.find((p) => p.id === id);
    work = {
      caption: {
        hook: post.caption.hook, body: post.caption.body, cta: post.caption.cta,
        hashtags: [...(post.caption.hashtags || [])],
      },
      notes: post.notes || '',
      slides: post.carouselSlug && slidesData[post.carouselSlug]
        ? slidesData[post.carouselSlug].slides.map((s) => ({ ...s }))
        : null,
    };
    layout.classList.add('lgm-open');
    panelHost.hidden = false;
    renderPanel();
    renderGrid();
  }

  async function closeEditor() {
    if ((dirty || slidesDirty) && !(await confirmModal('unsaved changes — discard them?', 'discard'))) return;
    openId = null;
    work = null;
    dirty = false;
    slidesDirty = false;
    layout.classList.remove('lgm-open');
    panelHost.hidden = true;
    clear(panelHost);
    renderGrid();
  }

  function renderPanel() {
    clear(panelHost);
    if (!openId) return;
    const post = plan.posts.find((p) => p.id === openId);
    const item = itemFor(post.id);
    const rules = plan.igRules || {};
    lintNow = lintCaption(work.caption, rules);

    /* -- head -- */
    const head = el('div', { class: 'lgm-p-head' },
      el('div', null,
        el('span', { class: 'mono-up lgm-p-id' }, `#${String(post.post).padStart(2, '0')} · ${post.pos} · wave ${post.wave}`),
        el('h2', { class: 'lgm-p-role' }, post.role)),
      el('button', { class: 'btn-mini', type: 'button', 'aria-label': 'close editor', onclick: closeEditor }, '✕'));

    /* -- status (lint-aware approve guard) -- */
    const statusHost = el('div', { class: 'lgm-p-status' },
      statusControl({
        id: `${SURFACE_ID}/${post.id}`,
        entry: ctx.entryFor(`${SURFACE_ID}/${post.id}`),
        onSave: async (sid, patch) => {
          if (patch.status === 'approved' && lintNow.some((i) => i.level === 'red')) {
            const go = await confirmModal('lint issues exist — approve anyway?', 'approve anyway');
            if (!go) throw new Error('approval cancelled');
          }
          const merged = await ctx.saveStatus(sid, patch);
          renderWaves();
          renderGrid();
          return merged;
        },
      }));

    /* -- caption editor -- */
    const lintHost = el('div', { class: 'lgm-lint' });
    const refreshLint = () => {
      lintNow = lintCaption(work.caption, rules);
      clear(lintHost);
      if (!lintNow.length) {
        lintHost.append(el('div', { class: 'lgm-lint-row lgm-ok' }, el('i', { class: 'lgm-dot' }), 'lint clean — on brand'));
        return;
      }
      for (const i of lintNow) {
        lintHost.append(el('div', { class: `lgm-lint-row lgm-${i.level}` }, el('i', { class: 'lgm-dot' }), i.msg));
      }
    };
    const lintDeb = debounce(refreshLint, 150);
    debounced.push(lintDeb);

    const markDirty = () => { dirty = true; saveBtn.disabled = false; lintDeb(); hookMeta(); };

    const hookIn = el('input', {
      class: 'pop-input lgm-in', type: 'text', value: work.caption.hook,
      'aria-label': 'caption hook',
      oninput: () => { work.caption.hook = hookIn.value; markDirty(); },
    });
    const hookFold = el('span', { class: 'mono lgm-fold' });
    const hookMeta = () => {
      const n = stripMarkers(work.caption.hook).length;
      hookFold.textContent = `${n}/125 above the fold`;
      hookFold.classList.toggle('meta-warn', n > 125);
    };
    const bodyIn = el('textarea', {
      class: 'pop-notes lgm-ta', rows: 7, 'aria-label': 'caption body',
      oninput: () => { work.caption.body = bodyIn.value; markDirty(); },
    });
    bodyIn.value = work.caption.body;
    const ctaIn = el('input', {
      class: 'pop-input lgm-in', type: 'text', value: work.caption.cta,
      'aria-label': 'caption cta',
      oninput: () => { work.caption.cta = ctaIn.value; markDirty(); },
    });

    /* -- hashtag chips -- */
    const tagHost = el('div', { class: 'lgm-tags' });
    const renderTags = () => {
      clear(tagHost);
      for (const t of work.caption.hashtags) {
        tagHost.append(el('span', { class: 'lgm-tag' }, t,
          el('button', {
            class: 'lgm-tag-x', type: 'button', 'aria-label': `remove ${t}`,
            onclick: () => { work.caption.hashtags = work.caption.hashtags.filter((x) => x !== t); renderTags(); markDirty(); },
          }, '×')));
      }
      const remaining = (rules.pool || []).filter(
        (p) => !work.caption.hashtags.some((t) => t.toLowerCase() === p.toLowerCase()));
      const count = el('span', { class: 'mono lgm-tag-count' },
        `${work.caption.hashtags.length}/${rules.hashtagMax || 5}`);
      tagHost.append(count);
      if (remaining.length) {
        const addWrap = el('div', { class: 'lgm-tag-add' });
        const addBtn = el('button', {
          class: 'btn-mini', type: 'button', 'aria-expanded': 'false',
          onclick: () => {
            const open = list.hidden;
            list.hidden = !open;
            addBtn.setAttribute('aria-expanded', String(open));
          },
        }, '+ tag');
        const list = el('div', { class: 'lgm-tag-pool', hidden: true },
          ...remaining.map((p) => el('button', {
            class: 'lgm-tag lgm-tag-opt', type: 'button',
            onclick: () => { work.caption.hashtags.push(p); renderTags(); markDirty(); },
          }, p)));
        addWrap.append(addBtn, list);
        tagHost.append(addWrap);
      }
    };
    renderTags();

    /* -- import from draft (ADDITIVE) --
       closes the generate -> draft -> caption loop: an operator generates +
       saves a caption draft in #/generate, then here imports it to PRE-FILL the
       caption fields for review. It only sets the working copy + visible inputs
       and marks dirty; it NEVER auto-saves and writes nothing — the existing
       "save caption" button (the guarded /api/launch-grid/post write) is the only
       write path, unchanged. */
    const applyImportedCaption = (parsed) => {
      work.caption.hook = parsed.hook;
      work.caption.body = parsed.body;
      work.caption.cta = parsed.cta;
      work.caption.hashtags = [...parsed.hashtags];
      hookIn.value = parsed.hook;
      bodyIn.value = parsed.body;
      ctaIn.value = parsed.cta;
      renderTags();
      markDirty();          // enables save + refreshes lint (via lintDeb) + hookMeta
      refreshLint();        // immediate (not debounced) so the operator sees it at once
    };

    const openImportPicker = () => {
      const listHost = el('div', { class: 'lgm-import-list' });
      const noteHost = el('div', { class: 'lgm-import-note', role: 'status', 'aria-live': 'polite', hidden: true });
      const setNote = (kind, text) => {
        clear(noteHost);
        noteHost.hidden = false;
        noteHost.className = `lgm-import-note lgm-import-${kind}`;
        noteHost.append(el('span', null, text));
      };
      let close = null;
      const choose = async (name, btn) => {
        const restore = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'importing…';
        try {
          const text = await fetchText(`content-studio/drafts/${name}`);
          const parsed = parseCaptionDraft(text);
          applyImportedCaption(parsed);
          if (close) close();
          announce('caption imported from draft for review');
          banner('ok', `imported from ${name} — review the fields + lint, then save`);
        } catch (err) {
          btn.disabled = false;
          btn.textContent = restore;
          setNote('err', `could not import ${name}: ${String((err && err.message) || err).toLowerCase()}`);
        }
      };
      const renderList = (drafts) => {
        clear(listHost);
        if (!drafts.length) {
          listHost.append(el('p', { class: 'mono lgm-hint' },
            'no drafts yet — generate + save one on the generate tab first.'));
          return;
        }
        for (const d of drafts) {
          const name = String(d.name || '');
          if (!name) continue;
          const kb = Number.isFinite(d.size) ? `${Math.max(1, Math.round(d.size / 1024))}kb` : '';
          const btn = el('button', { class: 'lgm-import-opt', type: 'button' },
            el('span', { class: 'lgm-import-name' }, name),
            el('span', { class: 'mono meta-dim lgm-import-meta' },
              [kb, d.mtime ? fmtWhen(d.mtime) : ''].filter(Boolean).join(' · ')));
          btn.addEventListener('click', () => choose(name, btn));
          listHost.append(btn);
        }
      };
      close = openModal(el('div', { class: 'modal-body lgm-import' },
        el('div', { class: 'lgm-import-head' },
          el('span', { class: 'mono-up' }, 'import from draft'),
          el('p', { class: 'mono lgm-hint' },
            'pre-fills the caption fields for review — does not auto-save. choose a draft:')),
        listHost,
        noteHost),
      { hostClass: 'lgm-import-modal' });
      listHost.append(el('p', { class: 'mono lgm-hint' }, 'loading drafts…'));
      getDrafts()
        .then((list) => renderList(Array.isArray(list) ? list : []))
        .catch((err) => {
          clear(listHost);
          setNote('err', `drafts unreachable: ${String((err && err.message) || err).toLowerCase()}`);
        });
    };

    const importBtn = el('button', {
      class: 'btn-mini lgm-import-btn', type: 'button',
      title: 'pre-fill the caption from a generated draft (review before saving)',
      onclick: openImportPicker,
    }, 'import from draft ▾');

    /* -- save caption -- */
    const saveBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', disabled: true }, 'save caption');
    saveBtn.addEventListener('click', () => saveCaption(false));
    async function saveCaption(override) {
      saveBtn.disabled = true;
      try {
        const merged = await ctx.api.saveLaunchPost(post.id, { caption: work.caption, notes: work.notes }, override);
        Object.assign(post, merged);
        dirty = false;
        clear(bannerHost);
        announce('caption saved');
        banner('ok', `saved · ${post.id}`);
      } catch (err) {
        saveBtn.disabled = false;
        if (err && err.status === 422 && err.body && err.body.violations) {
          const list = el('span', { class: 'mono' },
            err.body.violations.map((v) => `"${v.bad}" → ${v.use}`).join(' · '));
          banner('err', 'brand guard: ', el('span', null, list, ' ',
            el('button', { class: 'btn-mini', type: 'button', onclick: () => saveCaption(true) }, 'save with override')));
        } else {
          banner('err', String((err && err.message) || err).toLowerCase());
        }
      }
    }

    /* -- notes -- */
    const notesIn = el('textarea', {
      class: 'pop-notes lgm-ta', rows: 3, 'aria-label': 'internal notes',
      oninput: () => { work.notes = notesIn.value; markDirty(); },
    });
    notesIn.value = work.notes;

    /* -- carousel slides -- */
    let slidesSection = null;
    if (post.carouselSlug && work.slides) {
      const slug = post.carouselSlug;
      const rail = el('div', { class: 'lgm-rail' });
      const total = work.slides.length;
      const slideThumb = (i) => {
        /* slide 1 IS the post tile (single source); frames 2..n are the deck renders */
        const name = i === 0 ? post.id : `slide-${slug}-${String(i + 1).padStart(2, '0')}`;
        const it = itemFor(name);
        const btn = el('button', {
          class: 'lgm-slide-view', type: 'button',
          title: 'view rendered slide', 'aria-label': `view slide ${i + 1} of ${slug}`,
          onclick: () => openSlidesPreview(post, i),
        });
        if (it && it.exists) btn.append(el('img', { src: rootHref(it.png), alt: '', loading: 'lazy' }));
        else btn.append(el('span', { class: 'mono-up lgm-slide-noimg' }, 'no png'));
        return btn;
      };
      work.slides.forEach((s, i) => {
        if (i === 0) {
          rail.append(el('div', { class: 'lgm-slide lgm-slide-cover' },
            slideThumb(0),
            el('div', { class: 'lgm-slide-fields' },
              el('span', { class: 'mono-up lgm-slide-idx' }, `01/${String(total).padStart(2, '0')}`),
              el('span', { class: 'lgm-slide-covernote' }, 'cover · the post tile itself (single source — same image in feed and carousel)'))));
          return;
        }
        const eb = el('input', { class: 'pop-input lgm-in lgm-in-eb', type: 'text', value: s.eb, 'aria-label': `slide ${i + 1} eyebrow` });
        const hl = el('input', { class: 'pop-input lgm-in', type: 'text', value: s.hl, 'aria-label': `slide ${i + 1} headline` });
        const sup = el('textarea', { class: 'pop-notes lgm-ta', rows: 2, 'aria-label': `slide ${i + 1} support` });
        sup.value = s.sup;
        const markSlides = () => { slidesDirty = true; saveSlidesBtn.disabled = false; };
        eb.addEventListener('input', () => { s.eb = eb.value; markSlides(); });
        hl.addEventListener('input', () => { s.hl = hl.value; markSlides(); });
        sup.addEventListener('input', () => { s.sup = sup.value; markSlides(); });
        rail.append(el('div', { class: 'lgm-slide' },
          slideThumb(i),
          el('div', { class: 'lgm-slide-fields' },
            el('span', { class: 'mono-up lgm-slide-idx' }, `${String(i + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`),
            el('span', { class: 'mono lgm-slide-motif', title: 'motif key — edit in the design system' }, s.motif),
            eb, hl, sup)));
      });
      const saveSlidesBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', disabled: true }, 'save slides');
      saveSlidesBtn.addEventListener('click', () => saveSlides(false));
      async function saveSlides(override) {
        saveSlidesBtn.disabled = true;
        try {
          const r = await ctx.api.saveLaunchSlides(slug, { slides: work.slides }, override);
          slidesData[slug] = r.entry;
          slidesDirty = false;
          announce('slides saved');
          banner('ok', `slides saved · ${slug} — the html changed, re-export to refresh pngs`);
        } catch (err) {
          saveSlidesBtn.disabled = false;
          if (err && err.status === 422 && err.body && err.body.violations) {
            const list = el('span', { class: 'mono' },
              err.body.violations.map((v) => `"${v.bad}" → ${v.use}`).join(' · '));
            banner('err', 'brand guard: ', el('span', null, list, ' ',
              el('button', { class: 'btn-mini', type: 'button', onclick: () => saveSlides(true) }, 'save with override')));
          } else {
            banner('err', String((err && err.message) || err).toLowerCase());
          }
        }
      }
      slidesSection = el('section', { class: 'lgm-sec' },
        el('div', { class: 'lgm-sec-head' },
          el('span', { class: 'section-label' }, `slides · ${slug} · ${total} frames`),
          el('button', { class: 'btn-mini', type: 'button', onclick: () => openSlidesPreview(post, 0) }, 'view slides ›')),
        el('p', { class: 'mono lgm-hint' }, 'hl/sup accept <em>…</em> for the serif accent — keep exactly one per slide. click a thumb to view it full-size.'),
        rail,
        el('div', { class: 'lgm-save-row' }, saveSlidesBtn));
    }

    /* -- post-day kit -- */
    const kit = el('section', { class: 'lgm-sec lgm-kit' },
      el('span', { class: 'section-label' }, 'post-day kit'),
      el('div', { class: 'lgm-kit-row' },
        copyBtn(() => assembleCaption(work.caption), 'copy caption'),
        item && item.exists
          ? el('a', { class: 'btn-mini', href: rootHref(item.png), download: `${post.id}.png` }, 'download png')
          : el('span', { class: 'mono meta-dim' }, 'png not exported')),
    );
    if (post.carouselSlug && slidesData[post.carouselSlug]) {
      const n = slidesData[post.carouselSlug].slides.length;
      const links = el('div', { class: 'lgm-kit-row lgm-kit-slides' }, el('span', { class: 'mono meta-dim' }, 'slides: '));
      for (let i = 1; i <= n; i++) {
        /* slide 01 = the post tile itself; 02..n are the deck renders */
        const name = i === 1 ? post.id : `slide-${post.carouselSlug}-${String(i).padStart(2, '0')}`;
        const it = itemFor(name);
        links.append(it && it.exists
          ? el('a', {
            class: 'mono lgm-slide-dl', href: rootHref(it.png), download: `${name}.png`,
            title: i === 1 ? 'cover = the post tile' : name,
          }, String(i).padStart(2, '0'))
          : el('span', { class: 'mono meta-dim lgm-slide-dl' }, String(i).padStart(2, '0')));
      }
      /* one-click zip of this carousel's frames, ordered for upload */
      const frames = carouselFrames(post);
      const zipFiles = [];
      let zipMissing = 0;
      frames.forEach((fname, idx) => {
        const it = itemFor(fname);
        const name = `${String(idx + 1).padStart(2, '0')}_${fname}.png`;
        if (it && it.exists) zipFiles.push({ src: it.png, name });
        else zipMissing += 1;
      });
      const dlAll = el('button', {
        class: 'btn-mini lgm-slide-zip', type: 'button', disabled: !zipFiles.length,
        title: 'download every slide of this carousel as a zip, in post order',
      }, 'all ↓ .zip');
      dlAll.addEventListener('click', () => downloadZip(zipFiles, `eduflick-${post.carouselSlug}-carousel.zip`, zipMissing, dlAll));
      links.append(dlAll);
      kit.append(links);
    }
    kit.append(el('p', { class: 'mono lgm-hint' }, 'export pngs are 2× (2160×2700) · captions copy with *markers* stripped'));

    /* -- comments -- */
    const list = commentsFor(post.id);
    const commentsHost = el('section', { class: 'lgm-sec' },
      el('span', { class: 'section-label' }, `notes & feedback · ${list.length}`));
    for (const c of list) {
      commentsHost.append(el('div', { class: 'lgm-comment' },
        el('span', { class: `mono-up lgm-c-status lgm-c-${c.status}` }, c.status),
        el('span', { class: 'lgm-c-text' }, c.text),
        el('span', { class: 'mono meta-dim' }, ` — ${c.author || 'studio'} · ${fmtWhen(c.createdAt)}`)));
    }
    const addNote = el('button', {
      class: 'btn-mini', type: 'button',
      onclick: () => {
        let saving = false;
        const ta = el('textarea', { class: 'pop-notes', rows: 4, 'aria-label': 'note text' });
        const msg = el('p', { class: 'pop-msg', hidden: true });
        const saveNote = async (override) => {
          if (saving) return;
          saving = true;
          try {
            await ctx.api.upsertComment({
              assetRef: {
                assetId: `${SURFACE_ID}/${post.id}`, kind: 'note',
                source: 'design-system/collateral/launch-grid.html',
                label: `launch grid · ${post.id}`,
              },
              text: ta.value,
            }, override);
            close();
            await loadComments();
            renderPanel();
            renderGrid();
            announce('note saved');
          } catch (err) {
            saving = false;
            msg.hidden = false;
            if (err && err.status === 422) {
              msg.textContent = 'brand guard flagged this note — save with override?';
              overrideBtn.hidden = false;
            } else {
              msg.textContent = String((err && err.message) || err).toLowerCase();
            }
          }
        };
        const overrideBtn = el('button', { class: 'btn-mini', type: 'button', hidden: true, onclick: () => saveNote(true) }, 'save with override');
        const close = openModal(el('div', { class: 'modal-body' },
          el('p', { class: 'pop-title' }, `note · ${post.id}`),
          ta, msg,
          el('div', { class: 'modal-actions' },
            overrideBtn,
            el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => saveNote(false) }, 'save note'))));
      },
    }, '+ add note');
    commentsHost.append(el('div', { class: 'lgm-kit-row' }, addNote,
      el('button', { class: 'btn-mini', type: 'button', onclick: () => ctx.navigate('/feedback') }, 'all feedback →')));

    /* -- assemble panel -- */
    panelHost.append(
      head, statusHost,
      el('section', { class: 'lgm-sec' },
        el('div', { class: 'lgm-sec-head' },
          el('span', { class: 'section-label' }, 'caption'),
          importBtn),
        el('label', { class: 'pop-label' }, 'hook'), hookIn, hookFold,
        el('label', { class: 'pop-label' }, 'body'), bodyIn,
        el('label', { class: 'pop-label' }, 'cta'), ctaIn,
        el('label', { class: 'pop-label' }, 'hashtags'), tagHost,
        lintHost,
        el('label', { class: 'pop-label' }, 'internal notes'), notesIn,
        el('div', { class: 'lgm-save-row' }, saveBtn)),
      slidesSection,
      kit,
      commentsHost,
    );
    refreshLint();
    hookMeta();
  }

  /* ---- comments ---- */
  async function loadComments() {
    try {
      const r = await ctx.api.getComments();
      comments = (r && r.comments) || [];
    } catch {
      comments = comments || [];
    }
  }

  /* ---- lifecycle ---- */
  function renderAll() {
    renderHead();
    renderWaves();
    renderGrid();
  }

  const onState = () => {
    if (disposed) return;
    running = false;
    renderAll();
    /* the open editor keeps its DOM — statuses/thumbs refresh around it */
  };
  window.addEventListener('studio-state', onState);

  (async () => {
    clear(gridHost);
    gridHost.append(el('div', { class: 'panel-card cold' },
      el('span', { class: 'mono-up empty-tag' }, 'loading'),
      el('p', { class: 'empty-note' }, 'fetching the launch plan…')));
    try {
      const [lg] = await Promise.all([ctx.api.getLaunchGrid(), loadComments()]);
      if (disposed) return;
      plan = lg.plan;
      slidesData = lg.slides;
      renderAll();
    } catch (err) {
      if (disposed) return;
      clear(gridHost);
      gridHost.append(el('div', { class: 'panel-card cold' },
        el('span', { class: 'mono-up empty-tag' }, 'launch-grid api unavailable'),
        el('p', { class: 'empty-note' },
          'the studio server needs a restart to serve /api/launch-grid. ',
          String((err && err.message) || err).toLowerCase())));
    }
  })();

  return function dispose() {
    disposed = true;
    window.removeEventListener('studio-state', onState);
    for (const d of debounced) { try { d.cancel(); } catch { /* noop */ } }
    if (stream) { try { stream.dispose(); } catch { /* noop */ } stream = null; }
    if (previewClose) { try { previewClose(); } catch { /* noop */ } previewClose = null; }
  };
}
