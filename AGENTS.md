# AGENTS.md — operating guide for AI agents

The single entry point for any AI agent (or automation) working in this repo. Humans:
see [`CONTRIBUTING.md`](CONTRIBUTING.md). This file is the durable home for "how to instruct
a model on this brand" — keep future agent instructions here.

## What this repo is

The Eduflick AI brand kit: a system for producing **on-brand copy and visuals at volume**,
reliably even with small/cheap models. Two halves:

- **`content-studio/`** — words. Skill: [`content-studio/SKILL.md`](content-studio/SKILL.md) (`eduflick-content`).
- **`design-system/`** — visuals. Skill: [`design-system/SKILL.md`](design-system/SKILL.md) (`eduflick-design`).

Typical flow: **content-studio writes the copy → design-system renders it.**

## Load order for a task

1. **Always:** the relevant cheat sheet — `content-studio/BRAND_CHEATSHEET.md` (words) and/or
   `design-system/DESIGN_CHEATSHEET.md` (visuals). Self-contained brand context.
2. **Live values:** `content-studio/FACTS.md` — the only source for dates/prices/seats/links.
3. **Small/cheap model?** Load the small-model guide
   (`content-studio/SMALL_MODELS_GUIDE.md` / `design-system/SMALL_MODELS_GUIDE.md`) and work the
   **assemble-don't-invent** track: system prompt + cheat sheet + `design-system/recipes/snippets.md`
   → fill a recipe/prompt's FACTS → generate **one** artifact → **render & look** → QA → export.
4. **Pick a template:** `content-studio/prompts/<type>.md` (copy) or
   `design-system/recipes/<type>.md` (visuals).

## Hard rules (these break the brand if ignored)

- **Never invent facts.** If a value isn't in `FACTS.md`, output `[[PLACEHOLDER]]`.
- **Never hardcode brand values.** Use `var(--token)`; the source is
  `design-system/tokens/tokens.json`. The mark path + fonts link are tokens too
  (`brand.mark-path`, `brand.fonts-link`) and available in `tools/brand.tokens.mjs`.
- **Indigo + neutral only.** Coral (`--warn`) is the sole semantic exception, used sparingly.
- **The mark** (square + one right-edge notch): never distort, rotate, recolor to a third hue,
  or put a glow/filter on it. Cinematic light goes in a halo *behind* it (`.halo`).
- **No emoji** in finished brand copy. Lowercase display type; mono UPPERCASE labels.
- **Render visuals before claiming done.** Visuals must be seen, not assumed.

## Generated files — do not hand-edit

`design-system/tokens/tokens.css`, `tokens/tokens.flat.json`, `tools/brand.tokens.mjs`,
`design-system/recipes/snippets.md`. Edit the source and regenerate:

```bash
cd tools && npm run tokens && npm run snippets
```

## Producing components / artifacts

- Reusable components: `design-system/components.css` + inventory in `design-system/COMPONENTS.md`.
- Paste-alone blocks (for models): `design-system/recipes/snippets.md` (generated from
  `snippets.src.md` — edit the `.src.md`, not the output).
- Export pixel-perfect PNGs: `cd tools && npm run export` (see `tools/README.md`).

## Adding future instructions

When a human gives an agent a new standing instruction about this brand, record it here (or in
the relevant `SKILL.md`) so the next agent inherits it. Cross-link the affected source file.
For repo conventions, see [`CONTRIBUTING.md`](CONTRIBUTING.md); for navigation, [`docs/README.md`](docs/README.md).
