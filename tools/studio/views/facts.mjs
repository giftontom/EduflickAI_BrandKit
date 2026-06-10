/* facts.mjs — guarded editor for content-studio/FACTS.md.
   Mono textarea with a synced line gutter, debounced live guard check,
   and a save modal showing the disk-vs-candidate diff + guard verdict.
   Saving with findings requires the explicit override checkbox; the
   server re-checks regardless and returns the full repo-guard result. */

import { el, clear, debounce, openModal } from '../dom.mjs';
import { factsCheck, factsSave, fetchText } from '../api.mjs';
import { diffLines, renderDiff } from '../components/diff.mjs';

const FACTS_PATH = 'content-studio/FACTS.md';
const CHECK_DEBOUNCE_MS = 500;

export function render(root) {
  const bannerHost = el('div', { class: 'banner-host' });
  const verdict = el('span', { class: 'mono-up verdict' }, 'checking');
  const dirtyTag = el('span', { class: 'mono meta-dim' }, 'unchanged');
  const saveBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', disabled: true }, 'save');

  const gutter = el('div', { class: 'facts-gutter', 'aria-hidden': 'true' });
  const ta = el('textarea', {
    class: 'facts-ta', spellcheck: 'false', wrap: 'off',
    'aria-label': 'facts editor',
  });
  const violHost = el('div', { class: 'viol-host' });

  root.append(
    el('header', { class: 'page-head' },
      el('span', { class: 'eyebrow' }, 'ops · facts'),
      el('h1', { class: 'page-title' }, 'facts, under ', el('em', null, 'guard')),
      el('p', { class: 'page-sub' },
        `${FACTS_PATH} is the single source of truth. the guard checks while you type; nothing retired ships.`)),
    bannerHost,
    el('div', { class: 'facts-toolbar' }, verdict, dirtyTag, saveBtn),
    el('div', { class: 'facts-editor' }, gutter, ta),
    violHost);

  let diskText = null;
  let violations = [];
  let disposed = false;

  function setVerdict(v) {
    violations = Array.isArray(v) ? v : [];
    if (violations.length) {
      verdict.textContent = `${violations.length} finding${violations.length === 1 ? '' : 's'}`;
      verdict.className = 'mono-up verdict v-bad';
    } else {
      verdict.textContent = 'guard clean';
      verdict.className = 'mono-up verdict v-ok';
    }
    renderViolations();
    renderGutter();
  }

  function renderViolations() {
    clear(violHost);
    if (!violations.length) {
      violHost.append(el('p', { class: 'mono meta-dim viol-clean' }, 'no retired strings in the buffer.'));
      return;
    }
    for (const v of violations) {
      violHost.append(el('button', {
        class: 'viol', type: 'button',
        onclick: () => jumpToLine(v.line),
      },
      el('span', { class: 'mono-up viol-line' }, `line ${v.line}`),
      el('span', { class: 'viol-bad' }, String(v.bad)),
      el('span', { class: 'mono viol-use' }, `use: ${v.use}`)));
    }
  }

  function renderGutter() {
    const lineCount = ta.value.split('\n').length;
    const flagged = new Set(violations.map((v) => v.line));
    clear(gutter);
    for (let i = 1; i <= lineCount; i++) {
      gutter.append(el('span', { class: `gl${flagged.has(i) ? ' v' : ''}` }, String(i)));
    }
    gutter.scrollTop = ta.scrollTop;
  }

  function jumpToLine(line) {
    const lines = ta.value.split('\n');
    let pos = 0;
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) pos += lines[i].length + 1;
    ta.focus();
    ta.setSelectionRange(pos, pos + (lines[line - 1] || '').length);
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    ta.scrollTop = Math.max(0, (line - 4) * lh);
  }

  const runCheck = debounce(async () => {
    const content = ta.value;
    try {
      const res = await factsCheck(content);
      if (disposed || ta.value !== content) return;
      setVerdict(res.violations || []);
    } catch (err) {
      verdict.textContent = 'check failed';
      verdict.className = 'mono-up verdict v-bad';
      clear(violHost).append(el('div', { class: 'banner banner-err mono' },
        `guard check unreachable: ${String(err.message || err)}`.toLowerCase()));
    }
  }, CHECK_DEBOUNCE_MS);

  function refreshDirty() {
    const dirty = diskText !== null && ta.value !== diskText;
    saveBtn.disabled = !dirty;
    dirtyTag.textContent = dirty ? 'edited' : 'unchanged';
    dirtyTag.className = dirty ? 'mono meta-warn' : 'mono meta-dim';
  }

  ta.addEventListener('input', () => {
    renderGutter();
    refreshDirty();
    verdict.textContent = 'checking';
    verdict.className = 'mono-up verdict';
    runCheck();
  });
  ta.addEventListener('scroll', () => { gutter.scrollTop = ta.scrollTop; });

  saveBtn.addEventListener('click', () => openSaveModal());

  async function openSaveModal() {
    const candidate = ta.value;
    let fresh = '';
    try { fresh = await fetchText(FACTS_PATH); } catch { fresh = diskText || ''; }
    let liveViolations = violations;
    try { liveViolations = (await factsCheck(candidate)).violations || []; } catch { /* keep last */ }

    const override = el('input', { type: 'checkbox', id: 'override-guard' });
    const confirmBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button' }, 'save to disk');
    const modalMsg = el('div', { class: 'banner-host' });

    const violBlock = liveViolations.length
      ? el('div', { class: 'modal-viol' },
        el('span', { class: 'mono-up verdict v-bad' }, `${liveViolations.length} guard finding${liveViolations.length === 1 ? '' : 's'}`),
        liveViolations.map((v) => el('div', { class: 'viol' },
          el('span', { class: 'mono-up viol-line' }, `line ${v.line}`),
          el('span', { class: 'viol-bad' }, String(v.bad)),
          el('span', { class: 'mono viol-use' }, `use: ${v.use}`))),
        el('label', { class: 'override-row', for: 'override-guard' },
          override,
          el('span', { class: 'mono' }, 'override the guard and save anyway')))
      : el('span', { class: 'mono-up verdict v-ok' }, 'guard clean');

    const syncConfirm = () => { confirmBtn.disabled = liveViolations.length > 0 && !override.checked; };
    override.addEventListener('change', syncConfirm);
    syncConfirm();

    const close = openModal(el('div', { class: 'modal-body' },
      el('h3', { class: 'modal-title' }, 'review and save'),
      el('span', { class: 'mono doc-path' }, `${FACTS_PATH} · disk vs buffer`),
      renderDiff(diffLines(fresh, candidate)),
      violBlock,
      modalMsg,
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => close() }, 'cancel'),
        confirmBtn)));

    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'saving';
      try {
        const res = await factsSave(candidate, override.checked);
        diskText = candidate;
        refreshDirty();
        close();
        showGuardBanner(res.guard, override.checked);
      } catch (err) {
        confirmBtn.textContent = 'save to disk';
        syncConfirm();
        if (err.status === 422 && err.body && err.body.violations) {
          clear(modalMsg).append(el('div', { class: 'banner banner-err mono' },
            `blocked: ${err.body.violations.length} finding(s) — tick the override to force.`));
          liveViolations = err.body.violations;
        } else {
          clear(modalMsg).append(el('div', { class: 'banner banner-err mono' },
            `save failed: ${String(err.message || err)}`.toLowerCase()));
        }
      }
    });
  }

  function showGuardBanner(guard, overridden) {
    clear(bannerHost);
    const code = guard ? guard.exitCode : null;
    const ok = code === 0;
    bannerHost.append(el('div', { class: `banner ${ok ? 'banner-ok' : 'banner-err'}` },
      el('div', { class: 'mono-up' },
        ok
          ? `saved · repo guard exit 0${overridden ? ' · override used' : ''}`
          : `saved with override · repo guard exit ${code} — fix before publishing`),
      guard && guard.output ? el('pre', { class: 'log-body banner-log' }, guard.output) : null,
      el('button', {
        class: 'btn-mini banner-close', type: 'button',
        onclick: () => clear(bannerHost),
      }, 'dismiss')));
  }

  (async () => {
    try {
      diskText = await fetchText(FACTS_PATH);
      if (disposed) return;
      ta.value = diskText;
      renderGutter();
      refreshDirty();
      runCheck();
    } catch (err) {
      clear(bannerHost).append(el('div', { class: 'banner banner-err mono' },
        `could not load ${FACTS_PATH}: ${String(err.message || err)}`.toLowerCase()));
    }
  })();

  return function dispose() {
    disposed = true;
    runCheck.cancel();
  };
}
