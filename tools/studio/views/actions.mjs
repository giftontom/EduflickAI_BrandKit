/* actions.mjs — run cards for the whitelisted npm scripts, single-flight
   state, the streaming console, last-run summary, and the studio rows
   (port/root, theme toggle, manifest refresh). */

import { el, clear, fmtWhen } from '../dom.mjs';
import { createLogStream } from '../components/log-stream.mjs';

const ACTIONS = [
  { name: 'export', label: 'export launch grid', desc: 'render the launch mural + carousel frames to exports/.' },
  { name: 'export:ig', label: 'export instagram', desc: 'feed posts at 1080×1350 to exports/instagram.' },
  { name: 'export:posters', label: 'export posters', desc: 'the poster set at 1080×1350 to exports/posters.' },
  { name: 'export:stories', label: 'export stories', desc: 'story canvases at 1080×1920 to exports/stories.' },
  { name: 'export:slides', label: 'export deck slides', desc: 'program deck at 1920×1080 to exports/full-stack-ai-engineer.' },
  { name: 'export:pdf', label: 'export pdf', desc: 'print pdfs from the brochure documents.' },
  { name: 'gen:backdrops:proc', label: 'procedural backdrops', desc: 'regenerate poster backdrops locally — no network, no key.' },
  { name: 'check:facts', label: 'facts guard', desc: 'scan every active file for retired brand strings.' },
  { name: 'tokens', label: 'rebuild tokens', desc: 'tokens.json to tokens.css, the flat json map and the js module.' },
  { name: 'snippets', label: 'rebuild snippets', desc: 'recompile the snippet specimens from their sources.' },
];

export function render(root, ctx) {
  const runningHost = el('div', { class: 'banner-host' });
  const cards = el('div', { class: 'grid-actions' });
  const logHost = el('div', { class: 'log-host', hidden: true });
  const lastRunHost = el('div', { class: 'lastrun' });
  const studioRows = el('div', { class: 'studio-rows' });

  root.append(
    el('header', { class: 'page-head' },
      el('span', { class: 'eyebrow' }, 'ops · actions'),
      el('h1', { class: 'page-title' }, 'one runner at a time'),
      el('p', { class: 'page-sub' }, 'every button is a whitelisted npm script in tools/. output streams below; nothing runs concurrently.')),
    runningHost,
    cards,
    logHost,
    lastRunHost,
    el('section', { class: 'dash-section' },
      el('span', { class: 'mono-up section-label' }, 'studio'),
      studioRows));

  let stream = null;
  let busy = false;
  const runBtns = new Map();

  function setBusy(on, actionName) {
    busy = on;
    for (const [, btn] of runBtns) btn.disabled = on;
    clear(runningHost);
    if (on) {
      runningHost.append(el('div', { class: 'banner banner-run mono-up' },
        `running ${actionName} — buttons unlock when it exits`));
    }
  }

  function attachStream(id, actionName) {
    if (stream) stream.dispose();
    stream = createLogStream({ action: actionName });
    clear(logHost).append(stream.el);
    logHost.hidden = false;
    stream.attach(id);
  }

  async function run(name) {
    if (busy) return;
    try {
      const { id } = await ctx.api.runAction(name);
      setBusy(true, name);
      attachStream(id, name);
    } catch (err) {
      clear(runningHost).append(el('div', { class: 'banner banner-err mono' },
        err.status === 409
          ? 'busy — an action is already running.'
          : `could not start ${name}: ${String(err.message || err)}`.toLowerCase()));
    }
  }

  function renderCards() {
    clear(cards);
    runBtns.clear();
    for (const a of ACTIONS) {
      const btn = el('button', {
        class: 'btn btn-primary btn-sm', type: 'button', disabled: busy,
        onclick: () => run(a.name),
      }, 'run');
      runBtns.set(a.name, btn);
      cards.append(el('div', { class: 'action-card' },
        el('span', { class: 'mono-up action-name' }, `npm run ${a.name}`),
        el('span', { class: 'action-label' }, a.label),
        el('p', { class: 'action-desc' }, a.desc),
        btn));
    }
  }

  function renderLastRun(lastRun) {
    clear(lastRunHost);
    if (!lastRun) return;
    const ok = lastRun.exitCode === 0;
    const dur = lastRun.startedAt && lastRun.endedAt
      ? `${Math.round((new Date(lastRun.endedAt) - new Date(lastRun.startedAt)) / 1000)}s`
      : '';
    lastRunHost.append(el('div', { class: 'spec-row' },
      el('span', { class: 'spec-key' }, 'last run'),
      el('span', null, `${lastRun.action}${dur ? ` · ${dur}` : ''} · ${fmtWhen(lastRun.endedAt)}`),
      el('span', { class: `mono-up ${ok ? 'exit-ok' : 'exit-bad'}` }, `exit ${lastRun.exitCode}`)));
  }

  function renderStudioRows() {
    clear(studioRows);
    const light = document.body.classList.contains('theme-light');
    const themeBtn = el('button', {
      class: 'btn-mini', type: 'button',
      onclick: () => {
        const toLight = !document.body.classList.contains('theme-light');
        window.dispatchEvent(new CustomEvent('studio-theme', { detail: { light: toLight } }));
        renderStudioRows();
      },
    }, light ? 'switch to ink' : 'switch to paper');
    const refreshBtn = el('button', {
      class: 'btn-mini', type: 'button',
      onclick: () => window.dispatchEvent(new CustomEvent('studio-refresh')),
    }, 'refresh now');

    const m = ctx.manifest;
    studioRows.append(
      el('div', { class: 'spec-row' },
        el('span', { class: 'spec-key' }, 'served from'),
        el('span', null, `${location.origin} · 127.0.0.1 only`)),
      el('div', { class: 'spec-row' },
        el('span', { class: 'spec-key' }, 'static root'),
        el('span', null, 'repo root — every kit page and export is addressable')),
      el('div', { class: 'spec-row' },
        el('span', { class: 'spec-key' }, 'theme'),
        el('span', null, light ? 'paper' : 'ink (default)'),
        themeBtn),
      el('div', { class: 'spec-row' },
        el('span', { class: 'spec-key' }, 'manifest'),
        el('span', null, m && m.generatedAt ? `scanned ${fmtWhen(m.generatedAt)}` : 'not loaded'),
        refreshBtn));
  }

  async function syncActions() {
    try {
      const a = await ctx.api.getActions();
      if (a.running) {
        setBusy(true, a.running.action);
        attachStream(a.running.id, a.running.action);
      } else {
        setBusy(false);
      }
      renderLastRun(a.lastRun);
    } catch (err) {
      clear(runningHost).append(el('div', { class: 'banner banner-err mono' },
        `actions api unreachable: ${String(err.message || err)}`.toLowerCase()));
    }
  }

  function onExit() {
    setBusy(false);
    syncActions();
    renderStudioRows();
  }
  window.addEventListener('action-exit', onExit);

  renderCards();
  renderStudioRows();
  syncActions();

  return function dispose() {
    window.removeEventListener('action-exit', onExit);
    if (stream) stream.dispose();
  };
}
