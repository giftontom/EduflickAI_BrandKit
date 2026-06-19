# Docs index — the map

One place to find everything. New here? Read in this order: this map →
[`../CONTRIBUTING.md`](../CONTRIBUTING.md) → the cheat sheet for your task.

## Start here

| You want to… | Go to |
| --- | --- |
| Understand the repo | [`../README.md`](../README.md) |
| Contribute (rules, where things go) | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) |
| Drive an AI agent | [`../AGENTS.md`](../AGENTS.md) |
| Know the brand (the why) | [`../brand-book/Eduflick_Brand_Book_v4.html`](../brand-book/Eduflick_Brand_Book_v4.html) |
| Use the agent team / pre-publish gate | [`../.claude/agents/README.md`](../.claude/agents/README.md) |
| Use the brand-neutral design engine | [`../.claude/skills/README.md`](../.claude/skills/README.md) |
| Find a brochure / deck (which is canonical) | [`../brochures/README.md`](../brochures/README.md) |

## Words (content-studio)

| Doc | Purpose |
| --- | --- |
| [`BRAND_CHEATSHEET.md`](../content-studio/BRAND_CHEATSHEET.md) | The whole brand on one page — paste into any model |
| [`FACTS.md`](../content-studio/FACTS.md) | ⭐ Single source for live values (dates/prices/seats/links) |
| [`SMALL_MODELS_GUIDE.md`](../content-studio/SMALL_MODELS_GUIDE.md) | Reliable copy from small/cheap models |
| [`CHANNELS.md`](../content-studio/CHANNELS.md) · [`prompts/`](../content-studio/prompts/) | Per-channel specs + copy templates |
| [`QA_CHECKLIST.md`](../content-studio/QA_CHECKLIST.md) | Copy pass/fail gate |
| [`INSTAGRAM_LAUNCH_PLAN.md`](../content-studio/INSTAGRAM_LAUNCH_PLAN.md) · [`POSTING_SCHEDULE.md`](../content-studio/POSTING_SCHEDULE.md) | The live launch |

## Visuals (design-system)

| Doc | Purpose |
| --- | --- |
| [`README.md`](../design-system/README.md) | Foundations, iconography, manifest |
| [`tokens/tokens.json`](../design-system/tokens/tokens.json) | ⭐ Single source for design tokens |
| [`components.css`](../design-system/components.css) + [`COMPONENTS.md`](../design-system/COMPONENTS.md) | Reusable component layer + inventory |
| [`DESIGN_CHEATSHEET.md`](../design-system/DESIGN_CHEATSHEET.md) | The visual system on one page |
| [`SMALL_MODELS_GUIDE.md`](../design-system/SMALL_MODELS_GUIDE.md) · [`recipes/`](../design-system/recipes/) | Assemble-don't-invent build kit |
| [`AI_IMAGERY_GUIDE.md`](../design-system/AI_IMAGERY_GUIDE.md) | Backdrops: abstract indigo + photo duotone — the hybrid per-surface policy |
| [`QA_CHECKLIST.md`](../design-system/QA_CHECKLIST.md) | Visual pass/fail gate |
| `collateral/` · `ui_kits/` · `slides/` · `preview/` | Kits (launch grid, IG posts, posters, stories…), product UI, deck templates, token previews |

## Build & automation (tools)

| Command | Does |
| --- | --- |
| [`tools/README.md`](../tools/README.md) | The full toolbox reference |
| `npm run tokens` | tokens.json → tokens.css + flat json + brand.tokens.mjs |
| `npm run snippets` | snippets.src.md + tokens → snippets.md |
| `npm run check:facts` | facts-integrity guard (retired strings, optional `--links`) |
| `npm run export` / `export:ig` / `export:posters` / `export:stories` | pixel-perfect PNGs per kit |
| `npm run export:slides` / `export:pdf` | deck + brochure PDFs |
| `npm run gen:backdrops` (`:proc`) / `gen:ig-backdrops` | AI / procedural backdrop generation |
| `npm run fetch:stock` + `treat:stock` | photoreal indigo-duotone backdrop pipeline |
| `npm run export:avatar` | the gradient profile avatar |
| `npm run serve` | local preview server |

## Templates

[`../templates/`](../templates/) — recipe, prompt, snippet, and asset-add checklists.

## Reference / housekeeping

[`../CHANGELOG.md`](../CHANGELOG.md) · [`../LICENSE`](../LICENSE) ·
[`../planning/`](../planning/) (campaign strategy)
