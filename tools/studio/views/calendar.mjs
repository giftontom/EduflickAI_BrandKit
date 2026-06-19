/* calendar.mjs — the scheduling month grid. Every asset that carries a
   scheduledFor in status.json lands as a chip on its day cell (short label +
   status badge). A 7-column CSS grid (Sun..Sat) with leading/trailing blanks so
   the 1st sits under its real weekday. Month navigation is client-side only
   (prev/next mutate a local cursor; no URL change). Today's cell is highlighted;
   an overdue chip (scheduledFor before today and not yet posted/retired) gets a
   warning flag. Clicking a chip opens a read-only detail popover — there is no
   write path here, so the view never mutates status. Renders with zero console
   errors in any state, including an empty store / a month with nothing planned. */

import { el, clear, openModal, fmtDate } from '../dom.mjs';
import { STATUSES, statusBadge } from '../components/status-badge.mjs';

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/* local-midnight key for a Date, used to bucket chips per day and to mark today.
   scheduledFor is a calendar date, so we compare on the local day boundary. */
function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/* parse scheduledFor (an ISO date string) into a local Date at midnight, or null
   when absent/unparseable. A bare YYYY-MM-DD parses as UTC midnight; reading the
   UTC y/m/d and rebuilding a local Date keeps it on the intended calendar day. */
function parseScheduled(value) {
  if (!value) return null;
  const raw = new Date(String(value));
  if (Number.isNaN(raw.getTime())) return null;
  const bare = /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim());
  const d = bare
    ? new Date(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate())
    : raw;
  d.setHours(0, 0, 0, 0);
  return d;
}

function statusOf(entry) {
  return (entry && STATUSES.includes(entry.status)) ? entry.status : 'draft';
}

/* short label for a chip: drop the surface prefix when there is one. */
function shortLabel(id) {
  const parts = String(id).split('/');
  return parts.length > 1 ? parts.slice(1).join('/') : id;
}

export function render(root, ctx) {
  const cursor = startOfToday();
  cursor.setDate(1); /* first of the visible month */

  const headerHost = el('header', { class: 'page-head' });
  const navHost = el('div', { class: 'cal-nav' });
  const gridHost = el('div', { class: 'cal-grid-wrap' });
  const noteHost = el('p', { class: 'cal-note mono' });
  root.append(headerHost, navHost, gridHost, noteHost);

  /* gather every scheduled asset for the visible month, bucketed by day key. */
  function scheduledForMonth(year, month) {
    const buckets = new Map();
    let monthCount = 0;
    const assets = (ctx.status && ctx.status.assets) || {};
    for (const [id, entry] of Object.entries(assets)) {
      if (!entry || !entry.scheduledFor) continue;
      const when = parseScheduled(entry.scheduledFor);
      if (!when) continue;
      if (when.getFullYear() !== year || when.getMonth() !== month) continue;
      const key = dayKey(when);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ id, entry, when, status: statusOf(entry) });
      monthCount += 1;
    }
    for (const list of buckets.values()) list.sort((a, b) => a.id.localeCompare(b.id));
    return { buckets, monthCount };
  }

  /* read-only chip detail: id, status, scheduled date, notes. No write path. */
  function openChip(item) {
    const e = item.entry || {};
    const card = el('div', { class: 'override-form cal-pop' },
      el('span', { class: 'mono-up pop-title' }, shortLabel(item.id)),
      el('span', { class: 'mono cal-pop-id' }, item.id),
      el('div', { class: 'cal-pop-row' },
        statusBadge(item.status),
        el('span', { class: 'mono cal-pop-when' }, `scheduled · ${fmtDate(item.when)}`)),
      e.notes ? el('p', { class: 'tile-sub cal-pop-notes' }, String(e.notes)) : null,
      el('div', { class: 'pop-actions' },
        el('a', { class: 'btn-mini', href: '#/board' }, 'open board'),
        el('button', { class: 'btn-mini', type: 'button', onclick: () => { if (close) close(); } }, 'close')));
    const close = openModal(card);
  }

  function chip(item, today) {
    const overdue = item.when.getTime() < today.getTime()
      && item.status !== 'posted' && item.status !== 'retired';
    return el('button', {
      class: 'cal-chip' + (overdue ? ' is-overdue' : ''),
      type: 'button',
      title: item.id + (overdue ? ' · overdue' : ''),
      onclick: () => openChip(item),
    },
      overdue ? el('span', { class: 'cal-chip-dot', 'aria-hidden': 'true' }) : null,
      el('span', { class: 'cal-chip-label' }, shortLabel(item.id)),
      statusBadge(item.status));
  }

  function renderHeader() {
    clear(headerHost);
    const assets = (ctx.status && ctx.status.assets) || {};
    let scheduled = 0;
    for (const entry of Object.values(assets)) {
      if (entry && entry.scheduledFor && parseScheduled(entry.scheduledFor)) scheduled += 1;
    }
    headerHost.append(
      el('span', { class: 'eyebrow' }, 'pipeline · calendar'),
      el('h1', { class: 'page-title' }, 'scheduling calendar'),
      el('p', { class: 'page-sub' },
        'every asset with a scheduled date, on its day. overdue plans (past their date, not yet posted) are flagged. navigation is local; nothing here writes status.'),
      el('div', { class: 'page-meta mono' },
        el('span', null, `${scheduled} scheduled asset${scheduled === 1 ? '' : 's'}`),
        el('span', { class: 'meta-dim' }, 'read-only · click a chip for detail')));
  }

  function renderNav() {
    clear(navHost);
    const label = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    navHost.append(
      el('button', { class: 'btn-mini', type: 'button', onclick: () => shift(-1) }, '← prev'),
      el('span', { class: 'cal-month-label' }, label),
      el('button', { class: 'btn-mini', type: 'button', onclick: () => shift(1) }, 'next →'),
      el('button', { class: 'btn-mini cal-today-btn', type: 'button', onclick: goToday }, 'today'));
  }

  function renderGrid() {
    clear(gridHost);
    clear(noteHost);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const today = startOfToday();
    const { buckets, monthCount } = scheduledForMonth(year, month);

    const grid = el('div', { class: 'cal-grid' });
    for (const w of WEEKDAYS) grid.append(el('span', { class: 'mono cal-dow' }, w));

    const first = new Date(year, month, 1);
    const lead = first.getDay(); /* 0 = Sun .. 6 = Sat */
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    /* leading blanks so day 1 sits under its weekday */
    for (let i = 0; i < lead; i += 1) {
      grid.append(el('div', { class: 'cal-cell cal-cell-blank', 'aria-hidden': 'true' }));
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(year, month, day);
      const isToday = dayKey(cellDate) === dayKey(today);
      const items = buckets.get(dayKey(cellDate)) || [];
      grid.append(el('div', { class: 'cal-cell' + (isToday ? ' is-today' : '') },
        el('span', { class: 'mono cal-daynum' }, String(day)),
        items.length
          ? el('div', { class: 'cal-chips' }, items.map((it) => chip(it, today)))
          : null));
    }
    /* trailing blanks fill out the final week row for an even grid */
    const cellsSoFar = lead + daysInMonth;
    const trail = (7 - (cellsSoFar % 7)) % 7;
    for (let i = 0; i < trail; i += 1) {
      grid.append(el('div', { class: 'cal-cell cal-cell-blank', 'aria-hidden': 'true' }));
    }

    gridHost.append(grid);
    noteHost.textContent = monthCount
      ? `${monthCount} scheduled this month`
      : 'nothing scheduled this month';
  }

  function shift(delta) {
    cursor.setMonth(cursor.getMonth() + delta);
    renderNav();
    renderGrid();
  }

  function goToday() {
    const t = startOfToday();
    cursor.setFullYear(t.getFullYear(), t.getMonth(), 1);
    renderNav();
    renderGrid();
  }

  /* a fresh manifest/status: keep the visible month, refresh the chips. */
  function onState() { renderHeader(); renderGrid(); }
  window.addEventListener('studio-state', onState);

  renderHeader();
  renderNav();
  renderGrid();

  return function dispose() {
    window.removeEventListener('studio-state', onState);
  };
}
