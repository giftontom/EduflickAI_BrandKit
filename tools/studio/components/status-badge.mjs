/* status-badge.mjs — pipeline status badge + dropdown + plan popover.
   Status enum mirrors the server contract. Persistence is optimistic:
   the caller's onSave(id, patch) updates local state first, then the API. */

import { el, fmtDate, openModal } from '../dom.mjs';

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

  /* commit a status patch, with all three server guards in the loop. A 409 is
     branched purely on the body's `reason`:
       • open-comments (approving an asset that still has open review comments) →
         confirmReviewGate, then a second save carrying allowOpenComments:true.
       • stale-export (scheduling/posting an absent or stale render) → a "schedule
         anyway?" confirm, then a second save carrying allowStale:true.
       • else the state machine's illegal-transition 409 (from/to/legalNext) →
         confirmOverride, then a second save carrying override:true.
     override, allowStale and allowOpenComments are independent wire flags; each
     re-save preserves any flags already set. `prev` puts the control back whenever
     the change is abandoned or fails. */
  async function commit(patch, prev) {
    try {
      current = (await onSave(id, patch)) || current;
      paint();
    } catch (err) {
      if (err && err.status === 409 && err.body) {
        if (err.body.reason === 'open-comments') {
          const go = await confirmReviewGate(err.body, id);
          if (go) { await commit({ ...patch, allowOpenComments: true }, prev); return; }
        } else if (err.body.reason === 'stale-export') {
          const go = await confirmStaleExport(err.body, id);
          if (go) { await commit({ ...patch, allowStale: true }, prev); return; }
        } else {
          const ok = await confirmOverride(err.body, id);
          if (ok) { await commit({ ...patch, override: true }, prev); return; }
        }
      }
      current = { ...current, status: prev };
      select.value = prev;
      paint();
      flashError();
    }
  }

  select.addEventListener('change', async () => {
    const prev = STATUSES.includes(current.status) ? current.status : 'draft';
    const next = select.value;
    const patch = { status: next };
    if (next === 'posted' && !current.postedAt) patch.postedAt = new Date().toISOString();
    current = { ...current, ...patch };
    paint();
    await commit(patch, prev);
  });

  /* plan dialog: scheduledFor + notes. Rendered through openModal (body-level,
     focus-trapped) — an inline popover would be clipped by the asset card's
     content-visibility paint containment and become unreachable. */
  const dateIn = el('input', { type: 'date', class: 'pop-input' });
  const notesIn = el('textarea', { class: 'pop-input pop-notes', rows: 3, placeholder: 'notes' });
  const popMsg = el('span', { class: 'mono pop-msg' }, '');

  let closePlan = null;
  const planForm = el('div', { class: 'plan-form' },
    el('span', { class: 'mono-up pop-title' }, `plan · ${id}`),
    el('span', { class: 'mono-up pop-label' }, 'scheduled for'),
    dateIn,
    el('span', { class: 'mono-up pop-label' }, 'notes'),
    notesIn,
    el('div', { class: 'pop-actions' },
      el('button', {
        class: 'btn-mini', type: 'button',
        onclick: () => { if (closePlan) closePlan(); },
      }, 'cancel'),
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
            setTimeout(() => { if (closePlan) closePlan(); }, 700);
          } catch {
            popMsg.textContent = 'save failed';
            flashError();
          }
        },
      }, 'save')),
    popMsg);

  const planButton = el('button', {
    class: 'btn-mini', type: 'button', 'aria-label': `plan ${id}`,
    onclick: () => {
      dateIn.value = current.scheduledFor ? String(current.scheduledFor).slice(0, 10) : '';
      notesIn.value = current.notes || '';
      popMsg.textContent = '';
      closePlan = openModal(planForm, { onClose: () => { closePlan = null; } });
    },
  }, 'plan');

  const root = el('div', { class: 'status-ctl' }, badgeHost, select, planButton, meta);

  function flashError() {
    root.classList.add('save-err');
    setTimeout(() => root.classList.remove('save-err'), 1500);
  }

  return root;
}

/* confirmOverride(body, id) -> Promise<boolean>
   A modal for the state machine's 409: shows the rejected from→to and the legal
   next steps, then lets the operator either back off or force the move (which
   the caller re-POSTs with override:true). Shared by the status dropdown and the
   board so the override affordance reads the same everywhere. Resolves true only
   if the operator explicitly chooses to override. */
export function confirmOverride(body, id) {
  const from = body.from == null ? 'new' : String(body.from);
  const to = String(body.to == null ? '' : body.to);
  const legal = Array.isArray(body.legalNext) ? body.legalNext : [];
  return new Promise((resolve) => {
    let close = null;
    let done = false;
    const finish = (val) => { if (done) return; done = true; if (close) close(); resolve(val); };
    const card = el('div', { class: 'override-form' },
      el('span', { class: 'mono-up pop-title' }, `illegal transition · ${id}`),
      el('p', { class: 'override-msg' },
        el('span', { class: 'badge s-' + (STATUSES.includes(from) ? from : 'draft') }, from),
        el('span', { class: 'override-arrow mono' }, '→'),
        el('span', { class: 'badge s-' + (STATUSES.includes(to) ? to : 'draft') }, to),
        ' is not allowed by the pipeline.'),
      el('span', { class: 'mono-up pop-label' }, 'legal next'),
      el('div', { class: 'override-legal' },
        legal.length
          ? legal.map((s) => el('span', { class: 'badge s-' + (STATUSES.includes(s) ? s : 'draft') }, s))
          : el('span', { class: 'mono override-none' }, 'none — only retire or revive')),
      el('div', { class: 'pop-actions' },
        el('button', { class: 'btn-mini', type: 'button', onclick: () => finish(false) }, 'cancel'),
        el('button', {
          class: 'btn-mini btn-mini-warn', type: 'button', onclick: () => finish(true),
        }, 'override anyway')));
    close = openModal(card, { onClose: () => finish(false) });
  });
}

/* confirmStaleExport(body, id) -> Promise<boolean>
   A modal for the server's stale-export 409 (distinct from the illegal-transition
   one above — that carries legalNext, this carries reason:'stale-export' +
   assetState). Moving INTO scheduled/posted with an absent or stale render is
   risky; this offers to back off or schedule anyway (the caller re-POSTs with
   allowStale:true). Resolves true only on an explicit "schedule anyway". Mirrors
   the board's client-side stale warning so both reads identically. */
export function confirmStaleExport(body, id) {
  const to = String(body && body.to == null ? '' : body.to);
  const a = (body && body.assetState) || {};
  const absent = a.exists === false;
  const reason = absent
    ? 'has never been exported'
    : 'export is older than its source (stale)';
  return new Promise((resolve) => {
    let close = null;
    let done = false;
    const finish = (val) => { if (done) return; done = true; if (close) close(); resolve(val); };
    const card = el('div', { class: 'override-form stale-warn-form' },
      el('span', { class: 'mono-up pop-title' }, `stale export · ${id}`),
      el('p', { class: 'override-msg' },
        'this asset ',
        el('span', { class: 'meta-warn' }, reason),
        '. moving it to ',
        el('span', { class: 'badge s-' + (STATUSES.includes(to) ? to : 'draft') }, to),
        ' will schedule a render that is not current.'),
      el('p', { class: 'tile-sub' }, 're-render it first from the dashboard ops panel, or schedule anyway.'),
      el('div', { class: 'pop-actions' },
        el('button', { class: 'btn-mini', type: 'button', onclick: () => finish(false) }, 'cancel'),
        el('button', {
          class: 'btn-mini btn-mini-warn', type: 'button', onclick: () => finish(true),
        }, 'schedule anyway')));
    close = openModal(card, { onClose: () => finish(false) });
  });
}

/* confirmReviewGate(body, id) -> Promise<boolean>
   A modal for the review gate's 409 (the THIRD parallel case — distinct from the
   illegal-transition one, which carries legalNext, and the stale-export one, which
   carries assetState). Approving an asset that still has open review comments is
   blocked: this shows the open count, points to the feedback view to resolve them,
   and otherwise offers to approve anyway (the caller re-POSTs with
   allowOpenComments:true). The #/feedback link dismisses the modal by navigating.
   Resolves true only on an explicit "approve anyway". */
export function confirmReviewGate(body, id) {
  const n = Number((body && body.openCount) || 0);
  const plural = n === 1 ? '' : 's';
  return new Promise((resolve) => {
    let close = null;
    let done = false;
    const finish = (val) => { if (done) return; done = true; if (close) close(); resolve(val); };
    const card = el('div', { class: 'override-form review-warn-form' },
      el('span', { class: 'mono-up pop-title' }, `open review comments · ${id}`),
      el('p', { class: 'override-msg' },
        'this asset has ',
        el('span', { class: 'meta-warn' }, `${n} open review comment${plural}`),
        '. resolve them in the ',
        el('a', { class: 'review-gate-link', href: '#/feedback', onclick: () => finish(false) }, 'feedback view'),
        ' first, or approve anyway.'),
      el('div', { class: 'pop-actions' },
        el('button', { class: 'btn-mini', type: 'button', onclick: () => finish(false) }, 'cancel'),
        el('button', {
          class: 'btn-mini btn-mini-warn', type: 'button', onclick: () => finish(true),
        }, 'approve anyway')));
    close = openModal(card, { onClose: () => finish(false) });
  });
}
