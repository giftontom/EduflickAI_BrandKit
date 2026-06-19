/* run-action.mjs — the one place the studio kicks off a whitelisted npm
   action and wires its SSE console. Both the actions view and the dashboard
   tiles (cold-start hero, facts guard, tokens drift) call this instead of
   re-implementing runAction + createLogStream + attach by hand.

   It does NOT own a refetch: log-stream dispatches the window 'action-exit'
   event on exit, which main.mjs already turns into refreshState() and a
   'studio-state' broadcast. Callers that need exit-code-aware behaviour pass
   onExit; the manifest is fresh by the time 'studio-state' re-renders them. */

import { el, clear } from '../dom.mjs';
import { createLogStream } from './log-stream.mjs';

/* runActionInto({ api, action, logHost, onStart, onExit }) -> Promise<boolean>
   - api:     the studio api client (ctx.api)
   - action:  the whitelisted action key, e.g. 'export:ig' or 'tokens'
   - logHost: a container element the streaming console mounts into (revealed)
   - onStart: optional callback once the run id is in hand
   - onExit:  optional (code) => void, fired when the stream reports exit
   Returns true if the run started, false if it was rejected (409/other).
   The caller owns single-flight guarding (a busy flag) before calling. */
export function runActionInto({ api, action, logHost, onStart, onExit } = {}) {
  let stream = null;

  const start = (async () => {
    try {
      const { id } = await api.runAction(action);
      if (onStart) onStart(id);
      stream = createLogStream({ action });
      clear(logHost).append(stream.el);
      logHost.hidden = false;
      stream.attach(id);
      if (onExit) {
        const handler = (e) => {
          if (!e.detail || e.detail.id !== id) return;
          window.removeEventListener('action-exit', handler);
          onExit(e.detail.code);
        };
        window.addEventListener('action-exit', handler);
      }
      return true;
    } catch (err) {
      logHost.hidden = false;
      clear(logHost).append(el('div', { class: 'banner banner-err mono' },
        err.status === 409
          ? 'another action is already running. see actions.'
          : `could not start ${action}: ${String(err.message || err)}`.toLowerCase()));
      return false;
    }
  })();

  return { start, dispose() { if (stream) stream.dispose(); } };
}
