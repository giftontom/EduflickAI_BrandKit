// generate.test.mjs — the generation panel + QA runner + drafts write surface.
//
// Three Phase-1b endpoints, exercised against the REAL repo via the shared
// helpers.mjs harness (its own port so node:test runs the files concurrently):
//
//   GET  /api/generate/templates   the prompts/ list (read-only)
//   POST /api/generate             deterministic SYSTEM+FACTS+TEMPLATE assembly
//                                  (read-only — the anti-hallucination prompt)
//   POST /api/qa/check             scanTextRetired + emoji/forbidden-word checklist
//   GET  /api/drafts               content-studio/drafts/*.md listing
//   POST /api/drafts               the 7th write path — drafts/<name>.md, slug-
//                                  sanitized, traversal-guarded, atomic, facts-
//                                  guarded with NO override.
//
// DRAFTS ARE DYNAMIC FILES, not part of helpers' WRITE_SURFACE snapshot. So this
// suite owns its own residue cleanup: every file it writes uses the unique slug
// prefix `studio-test-gen`, the before() records the pre-suite drafts listing,
// and the after() deletes anything new under that prefix. A final residue test
// asserts `git status --porcelain content-studio/drafts/` is clean — nothing the
// suite created (or any escaped/`.tmp` file) is left behind.
//
// IMPORTANT (guard-bypass tests): never hard-code a retired marketing string in
// test source — the facts CI scans test files too. The violating string is built
// at RUNTIME from the RETIRED list imported from check-facts.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { RETIRED, scanTextRetired } from '../check-facts.mjs';
import {
  setPort,
  api,
  apiJSON,
  ROOT,
  startServer,
  stopServer,
} from './helpers.mjs';

// Own port (api.test 8099, comments 8097, statemachine 8096) so node:test can
// run the files concurrently without a bind collision.
setPort(8093);

const DRAFTS_DIR = path.join(ROOT, 'content-studio', 'drafts');
// Every draft this suite writes starts with this prefix so teardown + the
// residue assertion can target exactly what the suite created.
const SLUG_PREFIX = 'studio-test-gen';

// A retired string built at runtime from the first literal-substring rule, so no
// banned marketing literal ever appears in this source file. Asserted to trip
// the scanner before any test relies on it (mirrors api.test.mjs / comments).
const firstLiteral = RETIRED.find((r) => typeof r.bad === 'string').bad;
const RETIRED_TEXT = `studio gen marker ${firstLiteral} end`;

// Snapshot the drafts/ listing before the suite runs; teardown removes any new
// file whose name carries our prefix, plus any stray `.tmp` residue.
let preDrafts = new Set();

function listDrafts() {
  try {
    return fs.readdirSync(DRAFTS_DIR);
  } catch {
    return [];
  }
}

function cleanupCreatedDrafts() {
  for (const name of listDrafts()) {
    const isOurs = name.includes(SLUG_PREFIX);
    const isResidue = name.startsWith('.') && name.includes('.tmp-');
    if ((isOurs && !preDrafts.has(name)) || isResidue) {
      try {
        fs.rmSync(path.join(DRAFTS_DIR, name), { force: true });
      } catch {
        /* already gone */
      }
    }
  }
}

before(async () => {
  preDrafts = new Set(listDrafts());
  assert.ok(scanTextRetired(RETIRED_TEXT).length > 0, 'runtime retired string must trip the scanner');
  await startServer();
});

after(async () => {
  await stopServer();
  cleanupCreatedDrafts();
});

// ----------------------------------------------------------- generate/templates

test('GET /api/generate/templates → 200, the prompt templates with titles', async () => {
  const { status, body } = await apiJSON('/api/generate/templates');
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(Array.isArray(body), 'templates is an array');
  assert.ok(body.length > 0, 'at least one template');
  const files = body.map((t) => t.file);
  assert.ok(files.includes('instagram-caption.md'), 'instagram-caption.md is listed');
  // The system prompt and the README are NOT user templates.
  assert.ok(!files.includes('00_SYSTEM_PROMPT.md'), 'the system prompt is excluded');
  assert.ok(!files.includes('README.md'), 'the README is excluded');
  // Every entry carries a human title (used in the panel dropdown).
  for (const t of body) {
    assert.equal(typeof t.file, 'string');
    assert.ok(typeof t.title === 'string' && t.title.length > 0, `template ${t.file} has a title`);
  }
});

// ------------------------------------------------------------------- generate

test('POST /api/generate assembles SYSTEM + live FACTS + TEMPLATE', async () => {
  const { status, body } = await apiJSON('/api/generate', {
    json: { template: 'instagram-caption.md' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(typeof body.prompt, 'string', 'prompt is a string');
  // The three section markers the assembler emits, in order.
  for (const marker of ['===== SYSTEM =====', 'CURRENT FACTS', '----- TEMPLATE -----']) {
    assert.ok(body.prompt.includes(marker), `prompt contains "${marker}"`);
  }
  assert.ok(
    body.prompt.indexOf('===== SYSTEM =====') < body.prompt.indexOf('----- TEMPLATE -----'),
    'SYSTEM section precedes the TEMPLATE section',
  );
  // Proof the FACTS block was actually baked in (not the template's own [[ ]]
  // placeholders) — a real live value from FACTS.md must appear in the prompt.
  assert.ok(body.prompt.includes('UXP Innovation Hub'), 'venue from FACTS.md is baked into the prompt');
  assert.ok(body.prompt.includes('12 weeks'), 'duration from FACTS.md is baked into the prompt');
  // facts is the structured FACTS the panel renders alongside the prompt.
  assert.ok(Array.isArray(body.facts) && body.facts.length > 0, 'facts is a non-empty array');
});

test('POST /api/generate folds task fields into a TASK SPECIFICS section', async () => {
  const { status, body } = await apiJSON('/api/generate', {
    json: {
      template: 'instagram-caption.md',
      task: { brief: 'announce the cohort kickoff', pillar: 'The Cohort' },
    },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(body.prompt.includes('----- TASK SPECIFICS'), 'TASK SPECIFICS section appears');
  assert.ok(body.prompt.includes('announce the cohort kickoff'), 'the provided brief is in the prompt');
  assert.ok(body.prompt.includes('The Cohort'), 'the provided pillar is in the prompt');
});

test('POST /api/generate with a traversal template → 400, no crash', async () => {
  const { status } = await apiJSON('/api/generate', { json: { template: '../FACTS.md' } });
  assert.equal(status, 400);
});

test('POST /api/generate with a non-existent template → 400', async () => {
  const { status } = await apiJSON('/api/generate', { json: { template: 'no-such-template.md' } });
  assert.equal(status, 400);
});

test('POST /api/generate refuses 00_SYSTEM_PROMPT.md as a user template → 400', async () => {
  const { status } = await apiJSON('/api/generate', { json: { template: '00_SYSTEM_PROMPT.md' } });
  assert.equal(status, 400);
});

test('POST /api/generate with a missing template field → 400', async () => {
  const { status } = await apiJSON('/api/generate', { json: {} });
  assert.equal(status, 400);
});

// ------------------------------------------------------------------- qa/check

test('POST /api/qa/check on clean copy → 200, no violations, no checklist hits', async () => {
  const { status, body } = await apiJSON('/api/qa/check', {
    json: { text: 'clean engineer copy. 20 seats. 12 weeks.' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(Array.isArray(body.violations), 'violations is an array');
  assert.equal(body.violations.length, 0, 'clean copy has no retired-string violations');
  assert.ok(Array.isArray(body.checklist), 'checklist is an array');
  // The checklist only carries entries for rules that FIRED — clean copy → none.
  assert.equal(body.checklist.length, 0, 'no checklist rule fires on clean copy');
});

test('POST /api/qa/check flags an emoji in the checklist', async () => {
  const { status, body } = await apiJSON('/api/qa/check', {
    json: { text: 'ship AI products \u{1F680} get hired' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  const emojiRule = body.checklist.find((c) => c.rule === 'emoji');
  assert.ok(emojiRule, 'the emoji rule fired and is present in the checklist');
  assert.ok(Array.isArray(emojiRule.hits) && emojiRule.hits.length > 0, 'the emoji hit is reported');
});

test('POST /api/qa/check flags a forbidden hype word in the checklist', async () => {
  // "supercharge" is on the forbidden list (system prompt HARD RULE 3 / QA A).
  const { status, body } = await apiJSON('/api/qa/check', {
    json: { text: 'this will supercharge your career in 12 weeks' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  const wordRule = body.checklist.find((c) => c.rule === 'forbidden-words');
  assert.ok(wordRule, 'the forbidden-words rule fired');
  assert.ok(Array.isArray(wordRule.hits) && wordRule.hits.length > 0, 'the forbidden word is reported');
});

test('POST /api/qa/check surfaces a runtime-built retired string in violations', async () => {
  const { status, body } = await apiJSON('/api/qa/check', { json: { text: RETIRED_TEXT } });
  assert.equal(status, 200, JSON.stringify(body));
  assert.ok(Array.isArray(body.violations) && body.violations.length > 0, 'retired string is flagged');
});

test('POST /api/qa/check with a non-string text → 400', async () => {
  const { status } = await apiJSON('/api/qa/check', { json: { text: 42 } });
  assert.equal(status, 400);
});

// --------------------------------------------------------------------- drafts

test('POST /api/drafts writes a clean draft → 200, file lands, GET lists it', async () => {
  const slug = `${SLUG_PREFIX}-01`;
  const content = 'clean draft body';
  const { status, body } = await apiJSON('/api/drafts', { json: { slug, content } });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.name, `${slug}.md`, 'the written name is <slug>.md');

  const abs = path.join(DRAFTS_DIR, `${slug}.md`);
  assert.ok(fs.existsSync(abs), 'the draft file exists under content-studio/drafts/');
  assert.equal(fs.readFileSync(abs, 'utf8'), content, 'the file holds the posted content byte-for-byte');

  // It now appears in the listing.
  const { status: lstatus, body: list } = await apiJSON('/api/drafts');
  assert.equal(lstatus, 200);
  assert.ok(Array.isArray(list), 'drafts listing is an array');
  assert.ok(list.some((d) => d.name === `${slug}.md`), 'the new draft is listed');
});

test('POST /api/drafts with a channel prefixes the filename', async () => {
  const slug = `${SLUG_PREFIX}-02`;
  const { status, body } = await apiJSON('/api/drafts', {
    json: { channel: 'ig', slug, content: 'clean channel draft' },
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.name, `ig-${slug}.md`, 'the channel is prefixed onto the filename');
  assert.ok(fs.existsSync(path.join(DRAFTS_DIR, `ig-${slug}.md`)), 'the channel-prefixed file lands');
});

test('POST /api/drafts with a traversal slug → 400/403, nothing escapes drafts/', async () => {
  const escapeTarget = path.join(ROOT, 'content-studio', 'evil.md');
  assert.ok(!fs.existsSync(escapeTarget), 'precondition: escape target absent');
  const { status } = await apiJSON('/api/drafts', { json: { slug: '../evil', content: 'x' } });
  assert.ok(status === 400 || status === 403, `traversal slug rejected (got ${status})`);
  assert.ok(!fs.existsSync(escapeTarget), 'NOTHING was written outside drafts/');
});

test('POST /api/drafts with a space in the slug → 400/403, no file written', async () => {
  const { status } = await apiJSON('/api/drafts', { json: { slug: `${SLUG_PREFIX} bad`, content: 'x' } });
  assert.ok(status === 400 || status === 403, `slug with a space rejected (got ${status})`);
  assert.ok(
    !listDrafts().some((n) => n.includes(`${SLUG_PREFIX} bad`) || n.includes(`${SLUG_PREFIX}bad`)),
    'no file landed for the bad slug',
  );
});

test('POST /api/drafts with a slash in the slug → 400/403, no nested file', async () => {
  const nested = path.join(DRAFTS_DIR, `${SLUG_PREFIX}-a`, 'b.md');
  const { status } = await apiJSON('/api/drafts', { json: { slug: `${SLUG_PREFIX}-a/b`, content: 'x' } });
  assert.ok(status === 400 || status === 403, `slug with a slash rejected (got ${status})`);
  assert.ok(!fs.existsSync(nested), 'no nested path was created');
});

test('POST /api/drafts with retired content → 422 {violations}, NO file written', async () => {
  const slug = `${SLUG_PREFIX}-retired`;
  const before = new Set(listDrafts());
  const { status, body } = await apiJSON('/api/drafts', { json: { slug, content: RETIRED_TEXT } });
  assert.equal(status, 422, JSON.stringify(body));
  assert.ok(Array.isArray(body.violations) && body.violations.length > 0, 'violations returned');
  assert.ok(!fs.existsSync(path.join(DRAFTS_DIR, `${slug}.md`)), 'no draft file was written on a 422');
  // The drafts dir gained nothing.
  assert.deepEqual([...listDrafts()].filter((n) => !before.has(n)), [], 'no new files on a 422');
});

test('POST /api/drafts with non-string content → 400, no file written', async () => {
  const slug = `${SLUG_PREFIX}-badcontent`;
  const { status } = await apiJSON('/api/drafts', { json: { slug, content: 123 } });
  assert.equal(status, 400);
  assert.ok(!fs.existsSync(path.join(DRAFTS_DIR, `${slug}.md`)), 'no file written for non-string content');
});

// ------------------------------------------------------ qa flags on the list

test('GET /api/drafts flags an unfilled [[NEEDS]] placeholder as needsInput', async () => {
  const slug = `${SLUG_PREFIX}-needs`;
  // A literal [[NEEDS: ...]] marker — the unfilled-placeholder shape the model
  // emits. Clean of any retired string, so it lands (violations stays 0).
  const content = 'draft body with a [[NEEDS: a date]] placeholder left unfilled';
  const { status, body } = await apiJSON('/api/drafts', { json: { slug, content } });
  assert.equal(status, 200, JSON.stringify(body));

  const { status: lstatus, body: list } = await apiJSON('/api/drafts');
  assert.equal(lstatus, 200);
  const entry = list.find((d) => d.name === `${slug}.md`);
  assert.ok(entry, 'the placeholder draft is listed');
  assert.equal(entry.needsInput, true, 'an unfilled [[ marker sets needsInput:true');
  assert.equal(entry.violations, 0, 'a clean (non-retired) draft has 0 violations');
});

test('GET /api/drafts marks a clean draft needsInput:false', async () => {
  const slug = `${SLUG_PREFIX}-clean-flags`;
  const { status, body } = await apiJSON('/api/drafts', {
    json: { slug, content: 'fully resolved clean draft, no placeholders' },
  });
  assert.equal(status, 200, JSON.stringify(body));

  const { status: lstatus, body: list } = await apiJSON('/api/drafts');
  assert.equal(lstatus, 200);
  const entry = list.find((d) => d.name === `${slug}.md`);
  assert.ok(entry, 'the clean draft is listed');
  assert.equal(entry.needsInput, false, 'a draft with no [[ marker has needsInput:false');
  assert.equal(entry.violations, 0, 'a clean draft has 0 violations');
});

// ------------------------------------------------------ atomicity / residue

test('no .tmp residue lingers in drafts/ after the writes', async () => {
  const tmp = listDrafts().filter((n) => n.startsWith('.') && n.includes('.tmp-'));
  assert.deepEqual(tmp, [], `unexpected .tmp residue in drafts/: ${tmp.join(', ')}`);
});

test('git status shows no residue under content-studio/drafts/ from this suite', () => {
  // Clean up first so the porcelain check reflects a properly torn-down suite.
  cleanupCreatedDrafts();
  const out = execFileSync('git', ['status', '--porcelain', 'content-studio/drafts/'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const suiteResidue = out
    .split('\n')
    .filter((l) => l.trim().length)
    .filter((l) => l.includes(SLUG_PREFIX) || /\.tmp-/.test(l));
  assert.deepEqual(suiteResidue, [], `suite left residue under drafts/:\n${suiteResidue.join('\n')}`);
});
