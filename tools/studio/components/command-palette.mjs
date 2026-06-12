/* command-palette.mjs — global Ctrl/Cmd-K launcher (contract B3/B4).
   Opens a modal with a fuzzy-filterable list of nav routes, a whitelisted set
   of safe actions, and the repo docs. Selecting a row navigates or runs it.
   init(ctx) is called once from main.mjs boot(); it registers the keydown only. */

import { el, clear, openModal, announce } from '../dom.mjs';

/* nav routes mirror index.html's #nav links — kept as a tiny static table so the
   palette works before the manifest loads. */
const ROUTE_ITEMS = [
  { label: 'dashboard', hint: 'overview', route: '/' },
  { label: 'launch grid', hint: 'manager · plan, edit, approve, export', route: '/launch' },
  { label: 'instagram', hint: 'showcase · approved posts', route: '/instagram' },
  { label: 'instagram · evergreen gallery', hint: 'surface', route: '/social/instagram' },
  { label: 'posters', hint: 'surface', route: '/social/posters' },
  { label: 'stories', hint: 'surface', route: '/social/stories' },
  { label: 'program deck', hint: 'surface', route: '/deck' },
  { label: 'documents', hint: 'library', route: '/brochures' },
  { label: 'brand', hint: 'library', route: '/brand' },
  { label: 'docs', hint: 'library', route: '/docs' },
  { label: 'facts editor', hint: 'ops', route: '/facts' },
  { label: 'feedback', hint: 'ops', route: '/feedback' },
  { label: 'actions', hint: 'ops', route: '/actions' },
];

/* only side-effect-free, idempotent regeneration actions are runnable here */
const ACTION_ITEMS = [
  { label: 'rebuild design feedback', hint: 'action · gen:feedback', action: 'gen:feedback' },
];

let opened = false;

export function init(ctx) {
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') {
      e.preventDefault();
      open(ctx);
    }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

function buildItems(ctx) {
  const items = [];
  for (const r of ROUTE_ITEMS) items.push({ ...r, kind: 'route' });
  for (const a of ACTION_ITEMS) items.push({ ...a, kind: 'action' });
  const docs = (ctx.manifest && ctx.manifest.documents) || [];
  for (const d of docs) {
    items.push({ label: String(d.label || d.path).toLowerCase(), hint: `docs · ${d.path}`, route: `/docs/${d.path}`, kind: 'route' });
  }
  return items;
}

function matches(item, q) {
  if (!q) return true;
  const hay = `${item.label} ${item.hint || ''}`.toLowerCase();
  return q.split(/\s+/).every((tok) => hay.includes(tok));
}

function open(ctx) {
  if (opened) return;
  opened = true;

  const input = el('input', {
    class: 'cmd-input', type: 'text', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'jump to a view, run an action, open a doc…', 'aria-label': 'command palette',
  });
  const list = el('ul', { class: 'cmd-list', role: 'listbox', 'aria-label': 'commands' });

  const all = buildItems(ctx);
  let filtered = all.slice();
  let cursor = 0;

  function run(item) {
    close();
    if (item.kind === 'action') {
      try {
        ctx.api.runAction(item.action);
        announce(`running ${item.action}`);
      } catch { announce(`could not start ${item.action}`); }
    } else if (item.route) {
      ctx.navigate(item.route);
    }
  }

  function renderList() {
    clear(list);
    filtered.forEach((item, i) => {
      const row = el('li', {
        class: `cmd-item${i === cursor ? ' active' : ''}`, role: 'option',
        'aria-selected': i === cursor ? 'true' : 'false',
      },
      el('span', { class: 'cmd-item-label' }, item.label),
      el('span', { class: 'mono cmd-item-hint' }, item.hint || ''));
      row.addEventListener('mousedown', (e) => { e.preventDefault(); run(item); });
      row.addEventListener('mouseenter', () => { cursor = i; markActive(); });
      list.append(row);
    });
    if (!filtered.length) {
      list.append(el('li', { class: 'cmd-item cmd-empty' },
        el('span', { class: 'mono meta-dim' }, 'no matches')));
    }
  }

  function markActive() {
    Array.from(list.children).forEach((row, i) => {
      const on = i === cursor;
      row.classList.toggle('active', on);
      row.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const act = list.children[cursor];
    if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest' });
  }

  function applyFilter() {
    filtered = all.filter((it) => matches(it, input.value.trim().toLowerCase()));
    cursor = 0;
    renderList();
  }

  input.addEventListener('input', applyFilter);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(cursor + 1, filtered.length - 1); markActive(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(cursor - 1, 0); markActive(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[cursor]) run(filtered[cursor]); }
  });

  const close = openModal(el('div', { class: 'modal-body cmd-palette' },
    el('span', { class: 'mono-up empty-tag' }, 'command'),
    input, list), { hostClass: 'cmd-modal', onClose: () => { opened = false; } });

  renderList();
  /* openModal focuses the first focusable (the input) via the focus trap */
}
