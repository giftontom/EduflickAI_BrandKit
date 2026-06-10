/* log-stream.mjs — streaming console for a running action.
   Subscribes the SSE stream, appends lines (capped), autoscrolls with
   stick-to-bottom, shows an exit badge, and dispatches a window
   'action-exit' CustomEvent so the shell can refetch the manifest. */

import { el } from '../dom.mjs';
import { streamAction } from '../api.mjs';

const MAX_LINES = 2000;

export function createLogStream({ action } = {}) {
  const exitBadge = el('span', { class: 'mono-up log-exit' }, 'running');
  const body = el('pre', { class: 'log-body' });
  const root = el('div', { class: 'log-panel' },
    el('div', { class: 'log-head' },
      el('span', { class: 'mono-up log-title' }, action ? `npm run ${action}` : 'log'),
      exitBadge),
    body);

  let stick = true;
  body.addEventListener('scroll', () => {
    stick = body.scrollTop + body.clientHeight >= body.scrollHeight - 8;
  });

  function push(line) {
    body.append(document.createTextNode(String(line) + '\n'));
    while (body.childNodes.length > MAX_LINES) body.removeChild(body.firstChild);
    if (stick) body.scrollTop = body.scrollHeight;
  }

  let handle = null;
  function attach(id) {
    exitBadge.textContent = 'running';
    exitBadge.className = 'mono-up log-exit';
    handle = streamAction(id, {
      onLog: push,
      onExit: (code) => {
        const ok = code === 0;
        exitBadge.textContent = `exit ${code === null ? '?' : code}`;
        exitBadge.classList.add(ok ? 'exit-ok' : 'exit-bad');
        window.dispatchEvent(new CustomEvent('action-exit', { detail: { id, action, code } }));
      },
    });
  }

  function dispose() { if (handle) handle.close(); }

  return { el: root, attach, push, dispose };
}
