# Vector (SVG) sources

The `*.svg` files here are **native-vector brand icons / glyphs** generated with
Recraft `recraftv3_vector` via `tools/gen-vector.mjs` (palette pinned to the indigo
tokens through Recraft `controls`). Output is real, editable `<path>` SVG.

> **Never** the brand mark or any logo/lockup. The square feed-card + triangular-notch
> mark has canonical geometry in `tokens.json` / `assets/logo/mark.svg` — use those files.
> `gen-vector.mjs` hard-rejects any concept matching `notch|feed-card|brand mark|logo|lockup`.

These are AI-generated and may need cleanup in Figma/code before shipping; treat each as a
starting point, not a final asset. Recraft's paid plan grants commercial ownership.

| Vector | Concept (prompt) | Generator | Notes |
| --- | --- | --- | --- |
| _example_ `growth-node.svg` | upward growth arrow of connected nodes | `npm run gen:vector` | review/clean before use |

Regenerate or add: `node --env-file-if-exists=../.env.local gen-vector.mjs "slug:description"`.
