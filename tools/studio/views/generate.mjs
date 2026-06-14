/* generate.mjs — the prompt-assembly + QA + save-draft panel.
   Three stacked stages, each independent so the view renders cold (no
   template fetched, nothing assembled) with zero console errors:
     1. pick a template + set task fields, then assemble a baked prompt
        (live FACTS + the template + the task) into a readonly mono box.
        warnings (FACTS that will surface as [[NEEDS]]) show as an amber note.
     2. paste the model's output and run the QA guard (retired strings +
        the checklist: emoji / forbidden words / invented numbers).
     3. save the pasted output as a draft .md under content-studio/drafts/.
   Everything here is read-only except the final POST /api/drafts. The
   violation/verdict styling mirrors the facts editor. */

import { el, clear, copyText, announce } from '../dom.mjs';
import {
  getGenTemplates, assemblePrompt, runPrompt, qaCheck, getDrafts, saveDraft,
} from '../api.mjs';

/* the five content pillars + three funnel phases the prompt templates name in
   their TASK blocks. The studio just passes the chosen string through; the
   server bakes it into the template (an empty choice is left blank). */
const PILLARS = ['Build in Public', 'Get Hired', 'Learn Fast', 'The Cohort', 'Pioneer Urgency'];
const FUNNEL_PHASES = ['Awareness', 'Consideration', 'Conversion'];

export function render(root) {
  let disposed = false;

  /* ---- stage 1: template + task fields → assembled prompt ---- */

  const tplSelect = el('select', { class: 'pop-input gen-select', 'aria-label': 'prompt template' },
    el('option', { value: '' }, 'loading templates…'));
  const cheatsheet = el('input', { type: 'checkbox', id: 'gen-cheatsheet' });

  const briefTa = el('textarea', {
    class: 'pop-input pop-notes gen-brief', 'aria-label': 'brief',
    placeholder: 'describe the post / visual / context (optional)',
  });
  const pillarSel = field('select', 'pillar', PILLARS);
  const funnelSel = field('select', 'funnel phase', FUNNEL_PHASES);
  const variantsInput = el('input', {
    class: 'pop-input gen-num', type: 'number', min: '1', max: '12', value: 3,
    'aria-label': 'variants',
  });
  const hookInput = el('input', { class: 'pop-input', type: 'text', 'aria-label': 'hook angle',
    placeholder: 'e.g. I know React but never shipped with LLMs' });
  const ctaInput = el('input', { class: 'pop-input', type: 'text', 'aria-label': 'cta intent',
    placeholder: 'e.g. book a seat | save + follow' });
  const notesInput = el('input', { class: 'pop-input', type: 'text', 'aria-label': 'notes',
    placeholder: 'anything else for the model (optional)' });

  const assembleBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', disabled: true }, 'assemble prompt');
  /* optional local-model bridge — DORMANT unless the operator set STUDIO_MODEL_CMD.
     On 501 it shows a calm note (clipboard mode still works); on 200 it drops the
     output into the paste-back box so QA + save-draft work on it unchanged. */
  const runBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', disabled: true }, 'run with local model');
  const stage1Msg = el('div', { class: 'banner-host gen-msg' });
  const warnHost = el('div', { class: 'gen-warn-host' });
  const promptBox = el('pre', { class: 'md-raw gen-prompt', tabindex: '0', 'aria-label': 'assembled prompt' });
  const copyPromptBtn = el('button', { class: 'btn-mini', type: 'button', disabled: true }, 'copy prompt');
  const promptWrap = el('div', { class: 'gen-prompt-wrap', hidden: true },
    el('div', { class: 'gen-prompt-head' },
      el('span', { class: 'mono-up gen-stage-tag' }, 'assembled prompt'),
      copyPromptBtn),
    warnHost,
    promptBox);

  /* ---- stage 2: paste output → QA ---- */

  const outputTa = el('textarea', {
    class: 'pop-input gen-output', 'aria-label': 'model output',
    placeholder: 'paste the model’s output here to QA-check it, then save it as a draft',
  });
  const qaBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', disabled: true }, 'check (qa)');
  const qaVerdict = el('span', { class: 'mono-up verdict' }, 'not checked');
  const qaHost = el('div', { class: 'viol-host gen-qa-host' });

  /* ---- stage 3: save as draft ---- */

  const channelInput = el('input', { class: 'pop-input gen-slug-in', type: 'text', 'aria-label': 'channel',
    placeholder: 'channel (optional, e.g. instagram)' });
  const slugInput = el('input', { class: 'pop-input gen-slug-in', type: 'text', 'aria-label': 'slug',
    placeholder: 'slug (e.g. awareness-grid-03)' });
  const filenamePreview = el('span', { class: 'mono gen-filename' }, drafsFilename('', ''));
  const saveBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', disabled: true }, 'save as draft');
  const saveMsg = el('div', { class: 'banner-host gen-msg' });
  const draftsHost = el('div', { class: 'gen-drafts' });

  root.append(
    el('header', { class: 'page-head' },
      el('span', { class: 'eyebrow' }, 'ops · generate'),
      el('h1', { class: 'page-title' }, 'assemble, ', el('em', null, 'check'), ', save'),
      el('p', { class: 'page-sub' },
        'bake the live facts into a prompt a small model can run without inventing. paste its output, run the qa guard, save a clean draft.')),

    el('section', { class: 'gen-stage' },
      el('span', { class: 'mono-up section-label' }, '1 · prompt'),
      el('div', { class: 'gen-grid' },
        labeled('template', tplSelect),
        labeled('include brand cheatsheet',
          el('label', { class: 'gen-check-row', for: 'gen-cheatsheet' },
            cheatsheet, el('span', { class: 'mono' }, 'append BRAND_CHEATSHEET.md to the system message'))),
        labeled('brief', briefTa),
        labeled('content pillar', pillarSel),
        labeled('funnel phase', funnelSel),
        labeled('variants', variantsInput),
        labeled('hook angle', hookInput),
        labeled('cta intent', ctaInput),
        labeled('notes', notesInput)),
      el('div', { class: 'gen-actions' }, assembleBtn, runBtn),
      stage1Msg,
      promptWrap),

    el('section', { class: 'gen-stage' },
      el('span', { class: 'mono-up section-label' }, '2 · model output + qa'),
      labeled('paste model output', outputTa),
      el('div', { class: 'gen-actions' }, qaBtn, qaVerdict),
      qaHost),

    el('section', { class: 'gen-stage' },
      el('span', { class: 'mono-up section-label' }, '3 · save as draft'),
      el('p', { class: 'gen-note mono' },
        'drafts land in content-studio/drafts/ and must be guard-clean — retired strings cannot be overridden here.'),
      el('div', { class: 'gen-grid gen-grid-save' },
        labeled('channel', channelInput),
        labeled('slug', slugInput)),
      el('div', { class: 'spec-row gen-filename-row' },
        el('span', { class: 'spec-key' }, 'writes'),
        filenamePreview),
      el('div', { class: 'gen-actions' }, saveBtn),
      saveMsg,
      el('div', { class: 'gen-drafts-wrap' },
        el('span', { class: 'mono-up gen-stage-tag' }, 'existing drafts'),
        draftsHost)));

  /* ---------------------------------------------------------------- stage 1 */

  function loadTemplates() {
    getGenTemplates().then((list) => {
      if (disposed) return;
      const items = Array.isArray(list) ? list : [];
      clear(tplSelect);
      if (!items.length) {
        tplSelect.append(el('option', { value: '' }, 'no templates found'));
        assembleBtn.disabled = true;
        return;
      }
      tplSelect.append(el('option', { value: '' }, 'select a template…'));
      for (const t of items) {
        tplSelect.append(el('option', { value: t.file }, String(t.title || t.file)));
      }
      syncAssemble();
    }).catch((err) => {
      if (disposed) return;
      clear(tplSelect).append(el('option', { value: '' }, 'templates unreachable'));
      banner(stage1Msg, 'err', `could not load templates: ${msg(err)}`);
    });
  }

  /* the task object the server bakes into the template's TASK block. Empty
     fields are dropped so the server leaves the template placeholder blank. */
  function taskPayload() {
    const t = {};
    const brief = briefTa.value.trim();
    const pillar = pillarSel.value;
    const funnel = funnelSel.value;
    const variants = parseInt(variantsInput.value, 10);
    const hook = hookInput.value.trim();
    const cta = ctaInput.value.trim();
    const notes = notesInput.value.trim();
    if (brief) t.brief = brief;
    if (pillar) t.pillar = pillar;
    if (funnel) t.funnelPhase = funnel;
    if (Number.isFinite(variants) && variants > 0) t.variants = variants;
    if (hook) t.hookAngle = hook;
    if (cta) t.ctaIntent = cta;
    if (notes) t.notes = notes;
    return t;
  }

  function syncAssemble() {
    const has = !!tplSelect.value;
    assembleBtn.disabled = !has;
    runBtn.disabled = !has;
  }
  tplSelect.addEventListener('change', syncAssemble);

  assembleBtn.addEventListener('click', async () => {
    const template = tplSelect.value;
    if (!template) return;
    assembleBtn.disabled = true;
    assembleBtn.textContent = 'assembling';
    clear(stage1Msg);
    try {
      const res = await assemblePrompt({
        template,
        includeCheatsheet: cheatsheet.checked,
        task: taskPayload(),
      });
      if (disposed) return;
      renderPrompt(res);
    } catch (err) {
      if (disposed) return;
      banner(stage1Msg, 'err', `assemble failed: ${msg(err)}`);
      promptWrap.hidden = true;
    } finally {
      assembleBtn.disabled = false;
      assembleBtn.textContent = 'assemble prompt';
    }
  });

  runBtn.addEventListener('click', async () => {
    const template = tplSelect.value;
    if (!template) return;
    runBtn.disabled = true;
    runBtn.textContent = 'running';
    clear(stage1Msg);
    try {
      const res = await runPrompt({
        template,
        includeCheatsheet: cheatsheet.checked,
        task: taskPayload(),
      });
      if (disposed) return;
      /* the server echoes the assembled prompt back — mirror the readonly box so
         the operator sees exactly what was sent through the local model. */
      if (res && typeof res.prompt === 'string') renderPrompt({ prompt: res.prompt, warnings: [] });
      const output = res && typeof res.output === 'string' ? res.output : '';
      outputTa.value = output;
      syncStage2();
      const note = res && res.timedOut
        ? 'local model timed out — partial output captured below'
        : 'ran via local model — output dropped into the paste-back box';
      banner(stage1Msg, 'ok', note);
      announce('ran via local model');
    } catch (err) {
      if (disposed) return;
      if (err.status === 501) {
        /* dormant default — not an error. Stay calm; clipboard mode still works. */
        clear(stage1Msg).append(el('div', { class: 'banner banner-warn mono gen-warn' },
          'no local model configured — set STUDIO_MODEL_CMD to enable this; clipboard mode works without it'));
        announce('no local model configured');
      } else {
        banner(stage1Msg, 'err', `local model run failed: ${msg(err)}`);
      }
    } finally {
      runBtn.disabled = !tplSelect.value;
      runBtn.textContent = 'run with local model';
    }
  });

  function renderPrompt(res) {
    const prompt = res && typeof res.prompt === 'string' ? res.prompt : '';
    promptBox.textContent = prompt;
    copyPromptBtn.disabled = !prompt;
    promptWrap.hidden = false;

    clear(warnHost);
    const warnings = res && Array.isArray(res.warnings) ? res.warnings : [];
    if (warnings.length) {
      warnHost.append(el('div', { class: 'banner banner-warn mono gen-warn' },
        el('div', { class: 'mono-up' },
          `${warnings.length} fact${warnings.length === 1 ? '' : 's'} unset — they ship as [[NEEDS]] markers`),
        el('ul', { class: 'gen-warn-list' },
          warnings.map((w) => el('li', null, String(w))))));
    }
    announce('prompt assembled');
  }

  copyPromptBtn.addEventListener('click', async () => {
    const ok = await copyWithFallback(promptBox.textContent, promptBox);
    copyPromptBtn.textContent = ok ? 'copied' : 'copy failed';
    copyPromptBtn.classList.toggle('is-err', !ok);
    setTimeout(() => { copyPromptBtn.textContent = 'copy prompt'; copyPromptBtn.classList.remove('is-err'); }, 1400);
  });

  /* ---------------------------------------------------------------- stage 2 */

  function syncStage2() {
    const has = outputTa.value.trim().length > 0;
    qaBtn.disabled = !has;
    syncSave();
  }
  outputTa.addEventListener('input', () => {
    syncStage2();
    /* a fresh paste invalidates the last verdict */
    qaVerdict.textContent = 'not checked';
    qaVerdict.className = 'mono-up verdict';
  });

  qaBtn.addEventListener('click', async () => {
    const text = outputTa.value;
    if (!text.trim()) return;
    qaBtn.disabled = true;
    qaVerdict.textContent = 'checking';
    qaVerdict.className = 'mono-up verdict';
    try {
      const res = await qaCheck(text);
      if (disposed || outputTa.value !== text) return;
      renderQa(res);
    } catch (err) {
      if (disposed) return;
      qaVerdict.textContent = 'check failed';
      qaVerdict.className = 'mono-up verdict v-bad';
      clear(qaHost).append(el('div', { class: 'banner banner-err mono' },
        `qa guard unreachable: ${msg(err)}`));
    } finally {
      qaBtn.disabled = !outputTa.value.trim();
    }
  });

  function renderQa(res) {
    const violations = res && Array.isArray(res.violations) ? res.violations : [];
    const checklist = res && Array.isArray(res.checklist) ? res.checklist : [];
    const total = violations.length + checklist.length;
    clear(qaHost);

    if (!total) {
      qaVerdict.textContent = 'qa clean';
      qaVerdict.className = 'mono-up verdict v-ok';
      qaHost.append(el('p', { class: 'mono meta-dim viol-clean gen-qa-clean' },
        'no retired strings, no emoji, no forbidden words, no invented numbers.'));
      announce('qa clean');
      return;
    }

    qaVerdict.textContent = `${total} finding${total === 1 ? '' : 's'}`;
    qaVerdict.className = 'mono-up verdict v-bad';

    /* retired-string violations are hard fails (red); checklist hits are
       softer flags (amber). Both render as the facts-style viol rows. */
    for (const v of violations) {
      qaHost.append(el('div', { class: 'viol' },
        v && v.line ? el('span', { class: 'mono-up viol-line' }, `line ${v.line}`) : el('span', { class: 'mono-up viol-line' }, 'retired'),
        el('span', { class: 'viol-bad' }, String(v && v.bad != null ? v.bad : v)),
        v && v.use ? el('span', { class: 'mono viol-use' }, `use: ${v.use}`) : null));
    }
    for (const c of checklist) {
      const rule = c && c.rule != null ? String(c.rule) : 'checklist';
      const hit = c && c.hit != null ? String(c.hit) : (typeof c === 'string' ? c : '');
      const note = c && c.note != null ? String(c.note) : '';
      qaHost.append(el('div', { class: 'viol viol-warn' },
        el('span', { class: 'mono-up viol-line viol-line-warn' }, rule),
        el('span', { class: 'viol-bad' }, hit),
        note ? el('span', { class: 'mono viol-use' }, note) : null));
    }
    announce(`${total} qa findings`);
  }

  /* ---------------------------------------------------------------- stage 3 */

  function refreshFilename() {
    filenamePreview.textContent = drafsFilename(channelInput.value, slugInput.value);
  }
  function syncSave() {
    const ready = slugInput.value.trim().length > 0 && outputTa.value.trim().length > 0;
    saveBtn.disabled = !ready;
  }
  channelInput.addEventListener('input', () => { refreshFilename(); syncSave(); });
  slugInput.addEventListener('input', () => { refreshFilename(); syncSave(); });

  saveBtn.addEventListener('click', async () => {
    const content = outputTa.value;
    const slug = slugInput.value.trim();
    const channel = channelInput.value.trim();
    if (!slug || !content.trim()) return;
    saveBtn.disabled = true;
    saveBtn.textContent = 'saving';
    clear(saveMsg);
    try {
      const res = await saveDraft({ channel: channel || undefined, slug, content });
      if (disposed) return;
      const wrote = res && (res.path || res.name) ? (res.path || res.name) : drafsFilename(channel, slug);
      banner(saveMsg, 'ok', `saved · ${String(wrote)}`);
      announce('draft saved');
      loadDrafts();
    } catch (err) {
      if (disposed) return;
      if (err.status === 422 && err.body && Array.isArray(err.body.violations)) {
        const n = err.body.violations.length;
        clear(saveMsg).append(el('div', { class: 'banner banner-err' },
          el('div', { class: 'mono-up' },
            `blocked · ${n} retired string${n === 1 ? '' : 's'} — drafts must be clean (no override here)`),
          el('div', { class: 'viol-host gen-save-viol' },
            err.body.violations.map((v) => el('div', { class: 'viol' },
              el('span', { class: 'mono-up viol-line' }, v && v.line ? `line ${v.line}` : 'retired'),
              el('span', { class: 'viol-bad' }, String(v && v.bad != null ? v.bad : v)),
              v && v.use ? el('span', { class: 'mono viol-use' }, `use: ${v.use}`) : null)))));
      } else {
        banner(saveMsg, 'err', `save failed: ${msg(err)}`);
      }
    } finally {
      saveBtn.textContent = 'save as draft';
      syncSave();
    }
  });

  function loadDrafts() {
    getDrafts().then((list) => {
      if (disposed) return;
      const items = Array.isArray(list) ? list : [];
      clear(draftsHost);
      if (!items.length) {
        draftsHost.append(el('p', { class: 'mono meta-dim viol-clean' }, 'no drafts yet.'));
        return;
      }
      for (const d of items) {
        const kb = Number.isFinite(d.size) ? `${Math.max(1, Math.round(d.size / 1024))}kb` : '';
        draftsHost.append(el('a', {
          class: 'quick-link gen-draft-link',
          href: `/content-studio/drafts/${encodeURIComponent(String(d.name || ''))}`,
          target: '_blank', rel: 'noopener',
        },
        el('span', { class: 'ql-label' }, String(d.name || '')),
        el('span', { class: 'ql-sub' }, kb)));
      }
    }).catch((err) => {
      if (disposed) return;
      clear(draftsHost).append(el('p', { class: 'mono meta-dim viol-clean' },
        `drafts unreachable: ${msg(err)}`));
    });
  }

  /* ---- boot the three stages ---- */
  loadTemplates();
  loadDrafts();
  refreshFilename();

  return function dispose() {
    disposed = true;
  };
}

/* ---- small local helpers (no shared-module churn) ---- */

/* a labeled stack: a small uppercase label over a control. */
function labeled(label, control) {
  return el('label', { class: 'gen-fieldwrap' },
    el('span', { class: 'mono-up gen-label' }, label),
    control);
}

/* a <select> with a blank first option + the given choices. */
function field(_tag, label, choices) {
  const sel = el('select', { class: 'pop-input gen-select', 'aria-label': label },
    el('option', { value: '' }, `— ${label} —`));
  for (const c of choices) sel.append(el('option', { value: c }, c));
  return sel;
}

/* live preview of the filename the server will write. Mirrors the server's
   slug/channel rule (lowercased, non [a-z0-9-] collapsed to '-'); the server
   re-validates and is the authority. Empty slug → a placeholder hint. */
function drafsFilename(channel, slug) {
  const norm = (s) => String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const c = norm(channel);
  const s = norm(slug);
  const base = [c, s].filter(Boolean).join('-');
  return `content-studio/drafts/${base || '<slug>'}.md`;
}

function banner(host, kind, text) {
  clear(host).append(el('div', { class: `banner banner-${kind === 'ok' ? 'ok' : 'err'} mono` }, String(text).toLowerCase()));
}

function msg(err) {
  return String((err && err.message) || err).toLowerCase();
}

/* clipboard with a select-the-element fallback when the async API is denied
   (insecure context / permission). Mirrors dom.copyText but adds the textarea
   selection path the task asked for. */
async function copyWithFallback(text, fallbackNode) {
  if (await copyText(String(text))) return true;
  try {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(fallbackNode);
    sel.removeAllRanges();
    sel.addRange(range);
    const ok = document.execCommand && document.execCommand('copy');
    sel.removeAllRanges();
    return !!ok;
  } catch {
    return false;
  }
}
