// codemod-hex.mjs — replace hardcoded brand hex values with the matching
// `var(--token)` so surfaces reference the single token source.
//
//   node codemod-hex.mjs            # DRY RUN — report what would change
//   node codemod-hex.mjs --write    # apply the changes
//
// Safety:
//  - Only touches CSS contexts: *.css files, and the contents of HTML
//    <style> blocks and inline style="..." attributes. It never rewrites
//    SVG presentation attributes (fill="#..."/stroke="#..."), where var()
//    would not resolve.
//  - Excludes the Brand Book (validate-don't-refactor), generated token
//    files, node_modules, _archive, exports.
//
// Run `npm run tokens` first so tokens.flat.json is current.

import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const WRITE = process.argv.includes("--write");

const flat = JSON.parse(
  readFileSync(resolve(root, "design-system/tokens/tokens.flat.json"), "utf8"),
);

// hex (uppercased) -> var(--name), only for 6-digit hex color tokens
const hexToVar = new Map();
for (const [name, value] of Object.entries(flat)) {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) hexToVar.set(value.toUpperCase(), `var(--${name})`);
}

const EXCLUDE_DIRS = new Set(["node_modules", ".git", "_archive", "exports", "tokens"]);
const EXCLUDE_FILES = new Set(["Eduflick_Brand_Book_v4.html"]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (EXCLUDE_DIRS.has(entry)) continue;
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.(css|html)$/.test(entry) && !EXCLUDE_FILES.has(entry)) yield p;
  }
}

const hexRe = /#[0-9a-fA-F]{6}\b/g;
const replaceHex = (text) =>
  text.replace(hexRe, (m) => hexToVar.get(m.toUpperCase()) ?? m);

// In HTML, only transform <style>…</style> blocks and style="…" attributes.
function transformHtml(src) {
  let count = 0;
  const tally = (before, after) => {
    count += (before.match(hexRe) || []).filter((h) => hexToVar.has(h.toUpperCase())).length
      ? before !== after
      : 0;
  };
  let out = src.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (full, body) => {
    const nb = replaceHex(body);
    if (nb !== body) tally(body, nb);
    return full.replace(body, nb);
  });
  out = out.replace(/style="([^"]*)"/gi, (full, body) => {
    const nb = replaceHex(body);
    return `style="${nb}"`;
  });
  return out;
}

let totalFiles = 0;
let totalRepls = 0;
for (const file of walk(root)) {
  const src = readFileSync(file, "utf8");
  const out = file.endsWith(".css") ? replaceHex(src) : transformHtml(src);
  if (out === src) continue;
  const before = (src.match(hexRe) || []).filter((h) => hexToVar.has(h.toUpperCase())).length;
  const after = (out.match(hexRe) || []).filter((h) => hexToVar.has(h.toUpperCase())).length;
  const changed = before - after;
  if (changed <= 0) continue;
  totalFiles++;
  totalRepls += changed;
  console.log(`${WRITE ? "✎" : "·"} ${relative(root, file)} — ${changed} hex → var()`);
  if (WRITE) writeFileSync(file, out);
}

console.log(
  `\n${WRITE ? "Applied" : "Would apply"} ${totalRepls} replacements across ${totalFiles} files.` +
    (WRITE ? "" : "  Re-run with --write to apply."),
);
