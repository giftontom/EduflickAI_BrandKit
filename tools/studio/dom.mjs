/* dom.mjs — tiny DOM + utility helpers shared by every studio view/component.
   No framework: build elements, wire listeners, small ergonomics. */

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'dataset' && typeof v === 'object') {
      Object.assign(node.dataset, v);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(node.style, v);
    } else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden' || k === 'selected') {
      node[k] = v;
    } else {
      node.setAttribute(k, v === true ? '' : String(v));
    }
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, child) {
  if (child == null || child === false) return;
  if (Array.isArray(child)) { for (const c of child) appendChildren(node, c); return; }
  node.append(child.nodeType ? child : document.createTextNode(String(child)));
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function debounce(fn, ms) {
  let t = null;
  const wrapped = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

/* Root-absolute href for a repo-relative path from the manifest. */
export function rootHref(p) {
  if (!p) return '#';
  return p.startsWith('/') ? p : '/' + p;
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}

/* A micro copy-to-clipboard button with transient feedback. */
export function copyBtn(getText, label = 'copy') {
  const b = el('button', { class: 'btn-mini', type: 'button' }, label);
  b.addEventListener('click', async () => {
    const text = typeof getText === 'function' ? getText() : getText;
    const ok = await copyText(String(text));
    b.textContent = ok ? 'copied' : 'copy failed';
    b.classList.toggle('is-err', !ok);
    setTimeout(() => { b.textContent = label; b.classList.remove('is-err'); }, 1400);
  });
  return b;
}

export function fmtWhen(t) {
  if (!t && t !== 0) return '';
  const d = typeof t === 'number' ? new Date(t) : new Date(String(t));
  if (Number.isNaN(d.getTime())) return String(t);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).toLowerCase();
}

export function fmtDate(t) {
  if (!t) return '';
  const d = new Date(String(t));
  if (Number.isNaN(d.getTime())) return String(t);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase();
}

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/* Confine Tab/Shift+Tab focus within container, focusing the first focusable
   on open. Returns a release() that detaches the listener (does not move focus).
   Caller restores focus to the opener. */
export function focusTrap(container) {
  const focusables = () => Array.from(container.querySelectorAll(FOCUSABLE))
    .filter((n) => n.offsetParent !== null || n === document.activeElement);
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) { e.preventDefault(); container.focus(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !container.contains(active))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault(); first.focus();
    }
  };
  container.addEventListener('keydown', onKey);
  const initial = focusables();
  (initial[0] || container).focus();
  return () => container.removeEventListener('keydown', onKey);
}

/* Modal host (#modal in index.html). Returns a close() function.
   Traps focus inside the card, restores focus to the opener on close, and
   keeps Escape + click-outside dismissal. */
export function openModal(content, { onClose, hostClass } = {}) {
  const host = document.getElementById('modal');
  const opener = document.activeElement;
  clear(host);
  host.hidden = false;
  if (hostClass) host.classList.add(hostClass);
  const card = el('div', {
    class: 'modal-card glass', role: 'dialog', 'aria-modal': 'true', tabindex: '-1',
  }, content);
  host.append(card);
  const release = focusTrap(card);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    release();
    host.hidden = true;
    clear(host);
    if (hostClass) host.classList.remove(hostClass);
    document.removeEventListener('keydown', onKey);
    host.onclick = null;
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    if (onClose) onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  host.onclick = (e) => { if (e.target === host) close(); };
  document.addEventListener('keydown', onKey);
  return close;
}

/* Push a message to the polite live region (#live in index.html) for AT. */
export function announce(msg) {
  const live = document.getElementById('live');
  if (live) live.textContent = String(msg == null ? '' : msg);
}
