---
name: design-tokens
description: Compile a single tokens.json "brand profile" into tokens.css (CSS custom properties), a flat JSON map, and a JS module — the source of truth that every other design skill reads (--accent, neutrals, fonts, spacing). Use when starting a new brand/project's visual system, defining or changing colors/type/spacing, keeping inline snippet values from drifting, or wiring a CI drift guard. Brand-neutral; works for any project.
user-invocable: true
---

# design-tokens — one source of truth for a brand's visual system

This is the **base layer** of the universal design-skill family. It turns a single
`tokens.json` (a project's **brand profile**) into the CSS variables that `design-effects`,
`web-to-pdf`, `image-composite`, and every recipe consume. Swap the `tokens.json`, rebuild,
and the whole system re-themes — no code changes anywhere else.

> **The brand profile *is* `tokens.json`.** Define a project's hue ramp, neutrals, fonts,
> spacing and radii once; everything downstream reads the generated `--vars`.

## The pipeline

```text
tokens.json  ──build-tokens.mjs (Style Dictionary)──▶  tokens.css      (:root { --accent … })
                                                         tokens.flat.json (name→value map)
                                                         tokens.mjs       (JS: tokens, logoPath, fontsLink)
```

Optional second stage for copy-paste snippet bins that must hold literals inline:

```text
snippets.src.md  +  tokens.flat.json  ──build-snippets.mjs──▶  snippets.md   ({{token}} → value)
```

## Quick start

1. Copy `templates/tokens.starter.json` to your project as `tokens.json` and edit the values —
   at minimum the `accent` ramp + aliases, neutrals (`paper`/`ink`), and the three font stacks.
2. Install once: `npm install` (pulls `style-dictionary`).
3. Build:

   ```bash
   TOKENS_SRC=tokens.json OUT_DIR=build node scripts/build-tokens.mjs
   ```

   → `build/tokens.css`, `build/tokens.flat.json`, `build/tokens.mjs`.
4. Load `tokens.css` first in any HTML (`<link>`, `@import`, or inline `<style>`), then layer
   `design-effects/effects.css` and your content on top.

## The variable contract (what downstream skills expect)

The **leaf key** of each token becomes its CSS var name. Keep these aliases present — the
effects toolkit and recipes are written against them:

| Var | Role |
| --- | --- |
| `--accent` | the one brand hue (everything keys off this) |
| `--accent-light` · `--accent-mid` · `--accent-deep` · `--accent-ink` | the ramp used by halos, gradients, glows |
| `--accent-50 … --accent-900` | full ramp (optional, for UI) |
| `--paper` · `--paper-2` · `--paper-dim` | light surfaces / muted-on-light |
| `--ink` · `--ink-2` · `--ink-3` · `--muted` | dark surfaces / muted text |
| `--line` · `--line-2` · `--line-ink` · `--line-ink-2` | hairlines (on dark / on light) |
| `--warn` · `--success` | semantic only — never decorative |
| `--font-display` · `--font-serif` · `--font-mono` | type roles |

`meta.*` (logo path, fonts link, version) is **excluded from `tokens.css`** (it isn't color)
but is available in `tokens.mjs` as `logoPath` / `fontsLink` for exporters and scripts.

## CI drift guard (keep generated files honest)

Generated outputs are committed. To prove they match the source, re-run the build in CI and
fail if the working tree changed:

```bash
node scripts/build-tokens.mjs && node scripts/build-snippets.mjs   # if you use snippet bins
git diff --exit-code -- build/ snippets.md
```

See `reference.md` for a ready-to-paste GitHub Actions step.

## Notes

- One hue is a feature, not a limit — a brand reads as a brand because color is disciplined.
  Add tints to the ramp, not new hues.
- This skill ships scripts + a starter, not a brand. The brand is your `tokens.json`.
