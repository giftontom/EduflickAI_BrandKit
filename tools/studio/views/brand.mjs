/* brand.mjs — the brand foundations as a living page: color token swatches
   (click to copy), type specimens set in the real classes, the spacing and
   radius scales, and the logo wall from assets/logo + assets/partners. */

import { el, clear, copyText, rootHref } from '../dom.mjs';

const COLOR_RE = /^(#|rgb)/i;

export function render(root, ctx) {
  root.append(el('header', { class: 'page-head' },
    el('span', { class: 'eyebrow' }, 'library · brand'),
    el('h1', { class: 'page-title' }, 'brand foundations'),
    el('p', { class: 'page-sub' }, 'one hue, two neutrals, three fonts. click a swatch to copy its value.')));

  const body = el('div', { class: 'brand-body' });
  root.append(body);

  build(body, ctx).catch((err) => {
    clear(body).append(el('div', { class: 'banner banner-err mono' },
      `could not load tokens: ${String(err.message || err)}`.toLowerCase()));
  });

  return null;
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
