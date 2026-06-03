// build-snippets.mjs — generate recipes/snippets.md from snippets.src.md.
//
// The snippet bin is deliberately FULLY INLINE (each block must survive being
// pasted alone into a small model). To stop those inline values from drifting,
// snippets.src.md uses {{token}} placeholders that this script resolves from the
// single token source (tokens.flat.json). Run `npm run snippets` (or it runs as
// part of `npm run tokens`-adjacent CI) and commit the regenerated snippets.md.
//
// Run `npm run tokens` first so tokens.flat.json is current.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const flat = JSON.parse(
  readFileSync(resolve(root, "design-system/tokens/tokens.flat.json"), "utf8"),
);
const srcPath = resolve(root, "design-system/recipes/snippets.src.md");
const outPath = resolve(root, "design-system/recipes/snippets.md");

const src = readFileSync(srcPath, "utf8");
const unknown = new Set();
const out = src.replace(/\{\{([a-z0-9-]+)\}\}/g, (m, name) => {
  if (!(name in flat)) {
    unknown.add(name);
    return m;
  }
  return flat[name];
});

if (unknown.size) {
  console.error(`✗ Unknown token placeholder(s): ${[...unknown].map((n) => `{{${n}}}`).join(", ")}`);
  process.exit(1);
}

writeFileSync(outPath, out);
console.log("✓ snippets.md generated from snippets.src.md + tokens.flat.json");
