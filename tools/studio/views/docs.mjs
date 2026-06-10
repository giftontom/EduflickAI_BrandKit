/* docs.mjs — every tracked markdown file: a grouped tree (FACTS.md pinned
   first as the source of truth), a rendered viewer with raw toggle and
   placeholder highlighting, and a fetch-all substring search. */

import { el, clear, rootHref, debounce } from '../dom.mjs';
import { fetchText } from '../api.mjs';
import { renderMarkdown } from '../components/md.mjs';

const FACTS_PATH = 'content-studio/FACTS.md';

/* module-level caches survive route changes within a session */
const textCache = new Map();

async function loadText(path) {
  if (!textCache.has(path)) textCache.set(path, await fetchText(path));
  return textCache.get(path);
}

function encodePath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}

export function render(root, ctx, params = {}) {
  const docs = (ctx.manifest && ctx.manifest.docs) || [];
  const selectedPath = params.path && docs.some((d) => d.path === params.path)
    ? params.path
    : (docs[0] && docs[0].path);

  const search = el('input', {
    class: 'tree-search', type: 'search', placeholder: 'search docs',
    'aria-label': 'search docs',
  });
  const results = el('div', { class: 'tree-results', hidden: true });
  const treeBody = el('div', { class: 'tree-body' });
  const tree = el('nav', { class: 'tree' }, search, results, treeBody);
  const viewer = el('div', { class: 'doc-viewer' });

  root.append(
    el('header', { class: 'page-head' },
      el('span', { class: 'eyebrow' }, 'library · docs'),
      el('h1', { class: 'page-title' }, 'the written record'),
      el('p', { class: 'page-sub' }, 'every tracked markdown file in the kit. facts first — everything else derives from it.')),
    el('div', { class: 'split' }, tree, viewer));

  function itemLink(d, pinned = false) {
    return el('a', {
      class: `tree-item${d.path === selectedPath ? ' active' : ''}${pinned ? ' pinned' : ''}`,
      href: `#/docs/${encodePath(d.path)}`,
    },
    el('span', { class: 'ti-label' }, d.title || d.path),
    pinned ? el('span', { class: 'badge s-scheduled ti-tag' }, 'source of truth') : null,
    el('span', { class: 'mono ti-path' }, d.path));
  }

  function renderTree() {
    clear(treeBody);
    const facts = docs.find((d) => d.path === FACTS_PATH) || docs[0];
    if (facts) treeBody.append(itemLink(facts, true));
    const groups = new Map();
    for (const d of docs) {
      if (facts && d.path === facts.path) continue;
      const dir = d.dir || 'root';
      if (!groups.has(dir)) groups.set(dir, []);
      groups.get(dir).push(d);
    }
    for (const [dir, items] of groups) {
      treeBody.append(el('span', { class: 'mono-up tree-label' }, dir));
      for (const d of items) treeBody.append(itemLink(d));
    }
  }

  async function renderViewer() {
    clear(viewer);
    if (!selectedPath) {
      viewer.append(el('p', { class: 'empty-note' }, 'no markdown docs in the manifest.'));
      return;
    }
    const doc = docs.find((d) => d.path === selectedPath) || { path: selectedPath, title: selectedPath };
    const contentHost = el('div', { class: 'doc-content' },
      el('p', { class: 'mono meta-dim' }, 'loading'));
    let raw = false;
    const rawBtn = el('button', {
      class: 'btn-mini',
      type: 'button',
      onclick: () => { raw = !raw; rawBtn.textContent = raw ? 'rendered' : 'raw'; paint(); },
    }, 'raw');
    viewer.append(
      el('div', { class: 'doc-head' },
        el('span', { class: 'doc-title' }, doc.title || doc.path),
        el('span', { class: 'mono doc-path' }, doc.path),
        el('span', { class: 'doc-tools' },
          rawBtn,
          el('a', { class: 'btn-mini', href: rootHref(doc.path), target: '_blank', rel: 'noopener' }, 'open file'))),
      contentHost);

    let text = '';
    try {
      text = await loadText(doc.path);
    } catch (err) {
      clear(contentHost).append(el('div', { class: 'banner banner-err mono' },
        `could not load: ${String(err.message || err)}`.toLowerCase()));
      return;
    }
    function paint() {
      clear(contentHost).append(raw
        ? el('pre', { class: 'md-raw' }, text)
        : renderMarkdown(text));
    }
    paint();
  }

  /* fetch-all substring search; corpus loads once on first use */
  let corpusReady = false;
  async function ensureCorpus() {
    if (corpusReady) return;
    await Promise.allSettled(docs.map((d) => loadText(d.path)));
    corpusReady = true;
  }

  const runSearch = debounce(async () => {
    const q = search.value.trim().toLowerCase();
    if (!q) {
      results.hidden = true;
      treeBody.hidden = false;
      return;
    }
    clear(results).append(el('span', { class: 'mono meta-dim' }, 'searching'));
    results.hidden = false;
    treeBody.hidden = true;
    await ensureCorpus();
    if (search.value.trim().toLowerCase() !== q) return; /* superseded */
    clear(results);
    let hits = 0;
    for (const d of docs) {
      const text = textCache.get(d.path);
      if (!text) continue;
      const lines = text.split('\n');
      const matches = [];
      for (let i = 0; i < lines.length && matches.length < 3; i++) {
        if (lines[i].toLowerCase().includes(q)) matches.push({ line: i + 1, text: lines[i].trim() });
      }
      if (!matches.length) continue;
      hits++;
      results.append(el('a', { class: 'tree-item result', href: `#/docs/${encodePath(d.path)}` },
        el('span', { class: 'ti-label' }, d.title || d.path),
        el('span', { class: 'mono ti-path' }, d.path),
        matches.map((m) => el('span', { class: 'mono result-line' }, `${m.line} · ${clip(m.text, 90)}`))));
    }
    if (!hits) results.append(el('span', { class: 'mono meta-dim' }, 'no matches'));
  }, 300);

  search.addEventListener('input', runSearch);

  renderTree();
  renderViewer();

  return function dispose() {
    runSearch.cancel();
  };
}

function clip(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
