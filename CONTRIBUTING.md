# Contributing to the Eduflick AI Brand Kit

This repo produces **on-brand words and visuals at volume**. To keep it unified as more
people (and AI agents) contribute, everything follows one rule:

> **Each kind of truth lives in exactly one file. Everything else references or is
> generated from it.** Never hand-copy a value that has a source.

| Truth | Single source | How to use it |
| --- | --- | --- |
| Visual tokens (color, type, space, radius, shadow, motion) | `design-system/tokens/tokens.json` | `var(--token)` in CSS; never hardcode hex/fonts |
| Live values (dates, prices, seats, links) | `content-studio/FACTS.md` | pull values in copy & typeset visuals; never from memory |
| Binary brand assets (logo, icons, partners, social) | `design-system/assets/` (canonical) | reference relatively; root `assets/` is the public mirror |
| Components | `design-system/components.css` + `COMPONENTS.md` | use a class; don't restyle from scratch |
| Brand narrative / governance | `brand-book/Eduflick_Brand_Book_v4.html` | the why behind every rule |

If you're an AI agent, start at [`AGENTS.md`](AGENTS.md).

---

## Setup

```bash
cd tools && npm install     # Playwright (Chromium) + Style Dictionary
```

Node ≥ 18 (see `.nvmrc`). The lockfile is committed — CI uses `npm ci`.

---

## The golden rules

1. **No hardcoded brand values.** Add the value to `tokens.json`, run `npm run tokens`, then
   use `var(--name)`. (Migration helper: `node tools/codemod-hex.mjs` — dry-run first.)
2. **Never invent facts.** Dates, prices, seat counts, links come from `content-studio/FACTS.md`.
   If a value isn't there, typeset a `[[PLACEHOLDER]]` — don't guess.
3. **Generated files are generated.** Don't hand-edit `tokens/tokens.css`, `tokens.flat.json`,
   `tools/brand.tokens.mjs`, or `recipes/snippets.md`. Edit the source, then regenerate.
4. **Brand non-negotiables:** indigo + neutral only (coral `--warn` is the lone semantic
   exception, used sparingly); the mark is never distorted/rotated/recolored/glowed; no emoji in
   finished brand copy; numbers as proof.

## Before you commit

```bash
cd tools && npm run tokens && npm run snippets   # regenerate from sources
```

Commit the regenerated files alongside your source change. CI fails if they drift.

## Where things go

```text
design-system/      visuals — tokens/, components.css, COMPONENTS.md, recipes/, collateral/,
                    ui_kits/, slides/, preview/, assets/ (canonical)
content-studio/     words — FACTS.md, BRAND_CHEATSHEET.md, prompts/, guides, QA
brochures/          finished program deliverables
planning/           campaign strategy
tools/              build + export scripts (tokens, snippets, exporter, server)
assets/             public mirror of design-system/assets (for index.html + external links)
```

## Adding things — follow the templates

| Adding a… | Do this | Template |
| --- | --- | --- |
| Design token | edit `tokens.json` → `npm run tokens` → use `var(--name)` | — |
| Component | class in `components.css` + block in `snippets.src.md` (`npm run snippets`) + row in `COMPONENTS.md` | [`templates/snippet.template.md`](templates/snippet.template.md) |
| Visual recipe | new file in `design-system/recipes/` | [`templates/recipe.template.md`](templates/recipe.template.md) |
| Copy prompt | new file in `content-studio/prompts/` | [`templates/prompt.template.md`](templates/prompt.template.md) |
| Brand asset | add to `design-system/assets/`; run the asset checklist | [`templates/asset-checklist.md`](templates/asset-checklist.md) |

## Conventions

- **File names:** `kebab-case`, no spaces. (Some legacy files still have spaces; rename on touch.)
- **Versioning:** use **git tags**, not `_vN` suffixes in filenames. The design system has its own
  version in `tokens.json` (`brand.version`) — bump it + add a `CHANGELOG.md` entry under
  **Added / Changed / Deprecated** when tokens or components change.
- **Quality gates:** run `design-system/QA_CHECKLIST.md` (visuals) and/or
  `content-studio/QA_CHECKLIST.md` (copy) before shipping. Re-export PNGs if a canvas changed.
- **Formatting:** Prettier + markdownlint configs are committed; `make format` applies them.

## PRs

Use the template (it auto-loads). CODEOWNERS routes review by area — set real handles in
`.github/CODEOWNERS` to activate.
