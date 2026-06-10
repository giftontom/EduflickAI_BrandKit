/* status-badge.mjs — pipeline status badge + dropdown + plan popover.
   Status enum mirrors the server contract. Persistence is optimistic:
   the caller's onSave(id, patch) updates local state first, then the API. */

import { el, fmtDate } from '../dom.mjs';

export const STATUSES = ['draft', 'approved', 'scheduled', 'posted', 'retired'];

export function statusBadge(status) {
  const s = STATUSES.includes(status) ? status : 'draft';
  return el('span', { class: `badge s-${s}` }, s);
}

function metaLine(entry) {
  if (!entry) return '';
  if (entry.status === 'scheduled' && entry.scheduledFor) return `for ${fmtDate(entry.scheduledFor)}`;
  if (entry.status === 'posted' && entry.postedAt) return `out ${fmtDate(entry.postedAt)}`;
  return '';
}

/* statusControl({ id, entry, onSave }) -> element
   onSave(id, patch) must return a Promise of the merged entry (and may throw). */
export function statusControl({ id, entry = {}, onSave }) {
  let current = { ...entry };

  const badgeHost = el('span', { class: 'badge-host' }, statusBadge(current.status));
  const meta = el('span', { class: 'mono status-meta' }, metaLine(current));

  const select = el('select', { class: 'status-select', 'aria-label': `status for ${id}` },
    STATUSES.map((s) => el('option', { value: s }, s)));
  select.value = STATUSES.includes(current.status) ? current.status : 'draft';

  function paint() {
    badgeHost.replaceChildren(statusBadge(current.status));
    meta.textContent = metaLine(current);
  }

  select.addEventListener('change', async () => {
    const prev = STATUSES.includes(current.status) ? current.status : 'draft';
    const next = select.value;
    const patch = { status: next };
    if (next === 'posted' && !current.postedAt) patch.postedAt = new Date().toISOString();
    current = { ...current, ...patch };
    paint();
    try {
      current = (await onSave(id, patch)) || current;
      paint();
    } catch {
      current = { ...current, status: prev };
      select.value = prev;
      paint();
      flashError();
    }
  });

  /* plan popover: scheduledFor + notes */
  const dateIn = el('input', { type: 'date', class: 'pop-input' });
  if (current.scheduledFor) dateIn.value = String(current.scheduledFor).slice(0, 10);
  const notesIn = el('textarea', { class: 'pop-input pop-notes', rows: 3, placeholder: 'notes' });
  notesIn.value = current.notes || '';

  const popMsg = el('span', { class: 'mono pop-msg' }, '');
  const pop = el('div', { class: 'status-pop glass', hidden: true },
    el('span', { class: 'mono-up pop-label' }, 'scheduled for'),
    dateIn,
    el('span', { class: 'mono-up pop-label' }, 'notes'),
    notesIn,
    el('div', { class: 'pop-actions' },
      el('button', {
        class: 'btn-mini', type: 'button',
        onclick: () => { pop.hidden = true; },
      }, 'close'),
      el('button', {
        class: 'btn-mini btn-mini-solid', type: 'button',
        onclick: async () => {
          const patch = { scheduledFor: dateIn.value || null, notes: notesIn.value };
          current = { ...current, ...patch };
          paint();
          popMsg.textContent = 'saving';
          try {
            current = (await onSave(id, patch)) || current;
            paint();
            popMsg.textContent = 'saved';
            setTimeout(() => { popMsg.textContent = ''; pop.hidden = true; }, 700);
          } catch {
            popMsg.textContent = 'save failed';
            flashError();
          }
        },
      }, 'save')),
    popMsg);

  const planBtn = el('button', {
    class: 'btn-mini', type: 'button', 'aria-label': `plan ${id}`,
    onclick: () => { pop.hidden = !pop.hidden; },
  }, 'plan');

  const root = el('div', { class: 'status-ctl' }, badgeHost, select, planBtn, meta, pop);

  function flashError() {
    root.classList.add('save-err');
    setTimeout(() => root.classList.remove('save-err'), 1500);
  }

  return root;
}
