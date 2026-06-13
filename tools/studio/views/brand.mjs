/* brand.mjs — the brand foundations as a living page: color token swatches
   (click to copy), type specimens set in the real classes, the spacing and
   radius scales, and the logo wall from assets/logo + assets/partners. A
   tokens-sync badge at the top flags when the token pipeline has drifted. */

import { el, clear, copyText, rootHref } from '../dom.mjs';
import { runActionInto } from '../components/run-action.mjs';

const COLOR_RE = /^(#|rgb)/i;

export function render(root, ctx) {
  root.append(el('header', { class: 'page-head' },
    el('span', { class: 'eyebrow' }, 'library · brand'),
    el('h1', { class: 'page-title' }, 'brand foundations'),
    el('p', { class: 'page-sub' }, 'one hue, two neutrals, three fonts. click a swatch to copy its value.')));

  /* tokens-sync badge — its own host so it can refresh independently of the
     token specimens below (which only need to reload after a rebuild). */
  const syncHost = el('div', { class: 'tokens-sync-host' });
  root.append(syncHost);

  const body = el('div', { class: 'brand-body' });
  root.append(body);

  build(body, ctx).catch((err) => {
    clear(body).append(el('div', { class: 'banner banner-err mono' },
      `could not load tokens: ${String(err.message || err)}`.toLowerCase()));
  });

  let syncRunner = null;
  let syncRunning = false;

  async function renderSync() {
    let status;
    try {
      status = await ctx.api.getTokensStatus();
    } catch (err) {
      clear(syncHost).append(el('div', { class: 'banner banner-err mono' },
        `could not read tokens status: ${String(err.message || err)}`.toLowerCase()));
      return;
    }
    clear(syncHost);
    const logHost = el('div', { class: 'log-host', hidden: true });

    if (status.inSync) {
      syncHost.append(el('div', { class: 'tokens-sync in-sync' },
        el('span', { class: 'dash-pill pill-fresh' }, 'tokens in sync'),
        el('span', { class: 'mono sync-meta' }, 'every artifact is newer than its source')));
      return;
    }

    const pairs = el('ul', { class: 'sync-pairs mono' },
      (status.stale || []).map((p) => el('li', null,
        el('span', { class: 'sync-src' }, p.source),
        el('span', { class: 'sync-arrow', 'aria-hidden': 'true' }, ' → '),
        el('span', { class: 'sync-art' }, p.artifact))));

    const runBtn = el('button', {
      class: 'btn btn-primary btn-sm', type: 'button',
      onclick: () => {
        if (syncRunning) return;
        syncRunning = true;
        runBtn.disabled = true;
        if (syncRunner) syncRunner.dispose();
        syncRunner = runActionInto({
          api: ctx.api,
          action: 'tokens',
          logHost,
          /* after a clean rebuild, re-read the status (and reload the specimens
             so changed values show). on failure, re-enable the button. */
          onExit: (code) => {
            syncRunning = false;
            runBtn.disabled = false;
            if (code === 0) {
              renderSync();
              build(clear(body), ctx).catch(() => { /* specimen reload best-effort */ });
            }
          },
        });
        syncRunner.start.then((ok) => { if (!ok) { syncRunning = false; runBtn.disabled = false; } });
      },
    }, 'run tokens build');

    syncHost.append(el('div', { class: 'tokens-sync drift' },
      el('div', { class: 'sync-head' },
        el('span', { class: 'dash-pill pill-stale' }, 'tokens drift'),
        el('span', { class: 'mono sync-meta' },
          `${status.stale.length} artifact${status.stale.length === 1 ? '' : 's'} older than source — run tokens build`)),
      pairs,
      runBtn,
      logHost));
  }

  renderSync();

  return function dispose() {
    if (syncRunner) syncRunner.dispose();
  };
}

async function build(body, ctx) {
  const brand = (ctx.manifest && ctx.manifest.brand) || {};
  const res = await fetch(rootHref(brand.tokensFlat || 'design-system/tokens/tokens.flat.json'), { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} loading tokens.flat.json`);
  const flat = await res.json();

  const colors = Object.entries(flat).filter(([, v]) => COLOR_RE.test(String(v)));
  const ramp = colors.filter(([k]) => k.startsWith('i-'));
  const semantic = colors.filter(([k]) => k === 'warn' || k === 'success');
  const neutrals = colors.filter(([k]) => !k.startsWith('i-') && k !== 'warn' && k !== 'success');

  body.append(
    section('00 · the indigo ramp', swatchGrid(ramp)),
    section('01 · neutrals', swatchGrid(neutrals)),
    section('02 · semantic — coral flags only', swatchGrid(semantic)),
    section('03 · type', typeSpecimens(flat)),
    section('04 · spacing', spacingTable(flat)),
    section('05 · radius', radiusRow(flat)),
    section('06 · logos', logoWall(brand.logos || [])),
    section('07 · partners', logoWall(brand.partners || [], true)));
}

function section(label, content) {
  return el('section', { class: 'dash-section' },
    el('span', { class: 'mono-up section-label' }, label),
    content);
}

function swatchGrid(entries) {
  const grid = el('div', { class: 'swatch-grid' });
  for (const [name, value] of entries) {
    const sw = el('button', { class: 'swatch', type: 'button', title: `copy ${value}` },
      el('span', { class: 'swatch-chip', style: { background: String(value) } }),
      el('span', { class: 'swatch-meta' },
        el('span', { class: 'mono sw-name' }, name),
        el('span', { class: 'mono sw-value' }, String(value))));
    sw.addEventListener('click', async () => {
      const ok = await copyText(String(value));
      const v = sw.querySelector('.sw-value');
      const orig = String(value);
      v.textContent = ok ? 'copied' : 'copy failed';
      setTimeout(() => { v.textContent = orig; }, 1200);
    });
    grid.append(sw);
  }
  return grid;
}

function typeSpecimens(flat) {
  const rows = el('div', { class: 'specimens' });
  const spec = (label, node) => rows.append(el('div', { class: 'specimen' },
    el('span', { class: 'mono spec-key' }, label),
    node));
  spec(`display · manrope ${flat['w-display'] || '900'} · ${flat['t-display'] || ''}`,
    el('span', { class: 'display spec-display' }, 'learn it, build it, ', el('em', null, 'ship it')));
  spec(`editorial · instrument serif italic · ${flat['t-lead'] || ''}`,
    el('span', { class: 'editorial' }, 'twelve weeks of evenings, three products in production.'));
  spec(`body · manrope ${flat['w-body'] || '500'} · ${flat['t-body'] || ''}`,
    el('p', { class: 'body spec-body' },
      'Manrope carries every paragraph. Sentence case, generous line height, never shouting.'));
  spec(`mono · jetbrains mono · ${flat['t-meta'] || ''}`,
    el('span', { class: 'mono-up' }, 'pioneer cohort 01 · lesson 047 · 60 seconds'));
  return rows;
}

function spacingTable(flat) {
  const wrap = el('div', { class: 'scale-table' });
  const keys = Object.keys(flat)
    .filter((k) => k.startsWith('space-'))
    .sort((a, b) => parseFloat(flat[a]) - parseFloat(flat[b]));
  for (const k of keys) {
    wrap.append(el('div', { class: 'spec-row' },
      el('span', { class: 'spec-key' }, k),
      el('span', { class: 'scale-bar-wrap' },
        el('span', { class: 'scale-bar', style: { width: flat[k] } })),
      el('span', null, flat[k])));
  }
  return wrap;
}

function radiusRow(flat) {
  const wrap = el('div', { class: 'radius-row' });
  const keys = Object.keys(flat)
    .filter((k) => k.startsWith('radius-'))
    .sort((a, b) => parseFloat(flat[a]) - parseFloat(flat[b]));
  for (const k of keys) {
    wrap.append(el('div', { class: 'radius-cell' },
      el('span', { class: 'radius-chip', style: { borderRadius: flat[k] } }),
      el('span', { class: 'mono sw-name' }, `${k.replace('radius-', '')} · ${flat[k]}`)));
  }
  return wrap;
}

function logoWall(paths, partners = false) {
  if (!paths.length) {
    return el('p', { class: 'empty-note' }, 'nothing found in the manifest for this section.');
  }
  const wall = el('div', { class: 'logo-wall' });
  paths.forEach((p, i) => {
    const file = String(p).split('/').pop() || String(p);
    wall.append(el('div', { class: `logo-tile ${tileBg(file, i, partners)}` },
      el('img', { src: rootHref(p), alt: file, loading: 'lazy' }),
      el('span', { class: 'mono logo-name' }, file)));
  });
  return wall;
}

/* pick a tile background the artwork will actually show on */
function tileBg(file, i, partners) {
  const f = file.toLowerCase();
  if (partners) {
    if (f.includes('dark')) return 't-paper';
    if (f.includes('light')) return 't-ink';
    return 't-checker';
  }
  if (f.includes('paper')) return 't-ink';
  if (f.includes('ink') || f.includes('mono')) return 't-paper';
  if (f.includes('banner') || f.includes('og-') || f.includes('avatar')) return 't-ink';
  return i % 2 ? 't-checker' : 't-ink';
}
