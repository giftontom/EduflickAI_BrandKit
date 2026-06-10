#!/usr/bin/env node
// gen-feedback.mjs — regenerate content-studio/DESIGN_FEEDBACK.md from the
// committed design-comments.json store.
//
//   cd tools && npm run gen:feedback
//
// The studio server already regenerates the digest on every comment write; this
// CLI is the out-of-band rebuild (and the `gen:feedback` whitelisted action).
// Corruption-safe: a malformed store renders the empty digest rather than
// crashing, so the markdown artifact is always valid.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFeedbackDigest } from './lib/feedback.mjs';

const TOOLS = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TOOLS, '..');
const COMMENTS_FILE = join(ROOT, 'content-studio', 'design-comments.json');
const FEEDBACK_FILE = join(ROOT, 'content-studio', 'DESIGN_FEEDBACK.md');

function loadComments() {
  try {
    const v = JSON.parse(readFileSync(COMMENTS_FILE, 'utf8'));
    if (v && typeof v === 'object' && Array.isArray(v.comments)) return v;
  } catch {
    /* missing or corrupt → empty store (never crash the digest build) */
  }
  return { version: 1, comments: [] };
}

const store = loadComments();
const md = renderFeedbackDigest(store);
writeFileSync(FEEDBACK_FILE, md);

const total = store.comments.length;
const open = store.comments.filter((c) => (c.status || 'open') === 'open').length;
console.log(`gen:feedback — wrote DESIGN_FEEDBACK.md (${total} comment(s), ${open} open).`);
