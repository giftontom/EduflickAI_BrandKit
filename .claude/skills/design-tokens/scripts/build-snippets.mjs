// build-snippets.mjs — resolve {{token}} placeholders in a source file from tokens.flat.json.
//
// Copy-paste snippet bins must carry their color/value literals INLINE (so each block
// survives being pasted alone into a small model). To stop those inline values from
// drifting from the token source, the source file uses {{token}} placeholders and this
// script resolves them from tokens.flat.json. Re-run after `build-tokens.mjs` and commit
// the output; a CI drift guard re-runs it and fails if the committed output is stale.
//
//   FLAT=build/tokens.flat.json SRC=snippets.src.md OUT=snippets.md node build-snippets.mjs
//
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FLAT = process.env.FLAT || resolve(process.cwd(), "build/tokens.flat.json");
const SRC = process.env.SRC || resolve(process.cwd(), "snippets.src.md");
const OUT = process.env.OUT || resolve(process.cwd(), "snippets.md");

const flat = JSON.parse(readFileSync(FLAT, "utf8"));
const unknown = new Set();
const out = readFileSync(SRC, "utf8").replace(/\{\{([a-z0-9-]+)\}\}/g, (m, name) =>
  name in flat ? flat[name] : (unknown.add(name), m),
);

if (unknown.size) {
  console.error(`✗ Unknown token placeholder(s): ${[...unknown].map((n) => `{{${n}}}`).join(", ")}`);
  process.exit(1);
}

writeFileSync(OUT, out);
console.log(`✓ ${OUT} generated from ${SRC} + ${FLAT}`);
