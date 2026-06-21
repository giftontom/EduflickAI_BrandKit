#!/usr/bin/env node
/**
 * sync-brand.mjs — copy the canonical Eduflick AI brand assets into ./public so
 * the Worker can serve them same-origin. Reuses the design system rather than
 * re-authoring it, so this page can never drift from the brand book.
 *
 * Run via `npm run sync:brand` (the dev/deploy scripts run it automatically).
 * Idempotent. Source of truth lives in the repo's design-system/ and assets/.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // FAE_apply/scripts
const PROJECT = join(HERE, '..'); // FAE_apply
const REPO = join(PROJECT, '..'); // repo root

const CSS_OUT = join(PROJECT, 'public', 'assets', 'css');
const LOGO_OUT = join(PROJECT, 'public', 'assets', 'logo');

const CSS = [
  ['design-system/tokens/tokens.css', 'tokens.css'],
  ['design-system/colors_and_type.css', 'colors_and_type.css'],
  ['design-system/components.css', 'components.css'],
];
const LOGOS = [
  ['assets/logo/favicon.svg', 'favicon.svg'],
  ['assets/logo/mark-paper.svg', 'mark-paper.svg'],
];

function ensure(dir) {
  mkdirSync(dir, { recursive: true });
}

function copy(srcRel, destDir, destName) {
  const src = join(REPO, srcRel);
  if (!existsSync(src)) {
    console.error(`✗ missing source: ${srcRel}`);
    process.exitCode = 1;
    return false;
  }
  copyFileSync(src, join(destDir, destName));
  console.log(`  ✓ ${srcRel} -> public/assets/${destDir === CSS_OUT ? 'css' : 'logo'}/${destName}`);
  return true;
}

ensure(CSS_OUT);
ensure(LOGO_OUT);

console.log('syncing brand assets…');
for (const [src, name] of CSS) copy(src, CSS_OUT, name);
for (const [src, name] of LOGOS) copy(src, LOGO_OUT, name);

// colors_and_type.css imports `tokens/tokens.css`; in public/assets/css/ the
// token file sits alongside it, so rewrite the import path to ./tokens.css.
const ctPath = join(CSS_OUT, 'colors_and_type.css');
if (existsSync(ctPath)) {
  const before = readFileSync(ctPath, 'utf8');
  const after = before.replace(/@import\s+url\(["']?tokens\/tokens\.css["']?\)/, '@import url("./tokens.css")');
  if (after !== before) {
    writeFileSync(ctPath, after);
    console.log('  ✓ rewrote @import path -> ./tokens.css');
  }
}

console.log('brand sync complete.');
