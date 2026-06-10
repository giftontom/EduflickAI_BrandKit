/* editmode-host.mjs — host side of the kit tweaks-panel protocol.
   The kit page (inside an iframe) announces { type: '__edit_mode_available' };
   we then show an edit toggle that activates/deactivates the panel via
   postMessage. Key edits arrive as { type: '__edit_mode_set_keys', edits },
   are coalesced, debounced 400ms, and persisted through POST /api/editmode.
   All messages are gated on e.source === iframe.contentWindow. */

import { el } from '../dom.mjs';
import { editmodeSave } from '../api.mjs';

const AVAILABILITY_TIMEOUT_MS = 8000;
const SAVE_DEBOUNCE_MS = 400;

export function createEditmodeHost({ iframe, file }) {
  let available = false;
  let active = false;
  let disposed = false;
  let pending = {};
  let saveTimer = null;

  const toggle = el('button', { class: 'btn-mini glass-pill edit-toggle', type: 'button', hidden: true }, 'edit');
  const chip = el('span', { class: 'mono-up edit-chip', hidden: true }, '');
  const hint = el('span', { class: 'mono edit-hint', hidden: true },
    'edit panel needs network (kit pages load react from cdn)');
  const root = el('span', { class: 'edit-host' }, toggle, chip, hint);

  const post = (type) => {
    if (iframe.contentWindow) iframe.contentWindow.postMessage({ type }, '*');
  };

  function setToggle(on) {
    active = on;
    toggle.classList.toggle('is-on', on);
    toggle.textContent = on ? 'editing' : 'edit';
  }

  toggle.addEventListener('click', () => {
    setToggle(!active);
    post(active ? '__activate_edit_mode' : '__deactivate_edit_mode');
  });

  function setChip(text, kind) {
    chip.hidden = false;
    chip.textContent = text;
    chip.className = `mono-up edit-chip${kind ? ` chip-${kind}` : ''}`;
  }

  async function flushSave() {
    const edits = pending;
    pending = {};
    if (!Object.keys(edits).length) return;
    setChip('saving', '');
    try {
      await editmodeSave(file, edits);
      setChip('saved', 'ok');
      setTimeout(() => { if (chip.textContent === 'saved') chip.hidden = true; }, 1600);
    } catch (err) {
      /* merge back under any newer keystrokes so a retry is not lossy */
      pending = { ...edits, ...pending };
      setChip(`save failed: ${String(err.message || err)}`.toLowerCase(), 'err');
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  }

  const availabilityTimer = setTimeout(() => {
    if (!available && !disposed) hint.hidden = false;
  }, AVAILABILITY_TIMEOUT_MS);

  function onMessage(e) {
    if (!iframe.contentWindow || e.source !== iframe.contentWindow) return;
    const type = e.data && e.data.type;
    if (type === '__edit_mode_available') {
      available = true;
      toggle.hidden = false;
      hint.hidden = true;
    } else if (type === '__edit_mode_dismissed') {
      /* panel closed itself — flip the toggle off AND echo the deactivate,
         which is what actually hides the panel on the kit side */
      setToggle(false);
      post('__deactivate_edit_mode');
    } else if (type === '__edit_mode_set_keys' && e.data.edits && typeof e.data.edits === 'object') {
      Object.assign(pending, e.data.edits);
      scheduleSave();
    }
  }
  window.addEventListener('message', onMessage);

  function dispose() {
    disposed = true;
    clearTimeout(availabilityTimer);
    clearTimeout(saveTimer);
    window.removeEventListener('message', onMessage);
  }

  return { el: root, dispose };
}
