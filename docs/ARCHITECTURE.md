# Architecture — how the system fits together

> The big picture. For *rules* and *where each file goes* see
> [`../CONTRIBUTING.md`](../CONTRIBUTING.md); this doc is the **data flow** and the **two
> runtime surfaces** that the rest of the repo feeds.

This repo is a **content factory**: two sources of truth flow through a set of engines into
finished artifacts, which are exported to pixels/PDF and consumed by two live surfaces — a
local **brand studio** and the public **apply site**.

## The pipeline

```text
  SOURCES OF TRUTH            ENGINES                     ARTIFACTS                 EXPORT            SURFACES
  ─────────────────          ───────                     ─────────                 ──────            ────────
  design-system/             design-system/recipes/      design-system/collateral/ tools/*.mjs       brand studio
    tokens/tokens.json  ──►   content-studio/prompts/ ──►   posters · stories ·  ──► export:posters ─►  (tools/studio,
    → tokens.css              design-system/recipes/        instagram · launch-grid   export:stories     localhost:8090)
    → tokens.flat.json          snippets.md (components)   brochures/ (deliverables) export:wa
    → brand.tokens.mjs        .claude/skills/ (design     design-system/slides/     export:slides     live apply site
                                engine: effects, poster,   design-system/ui_kits/    export:pdf          (FAE_apply →
  content-studio/               web-to-image/pdf, …)                                 export:share        eduflickai.com
    FACTS.md (live values) ─►  .claude/agents/ (7-agent                            gen:backdrops          /apply)
                                team + pre-publish gate)                             → exports/ (gitignored)
```

Everything downstream **references** the two sources — it never hand-copies a value. Visual
tokens come from `tokens.json` (compiled by `npm run tokens`); live values (dates, prices,
seats, links) come from `FACTS.md`. The [`check:facts`](../tools/check-facts.mjs) guard fails
the build if a retired string, an unfilled `[[placeholder]]`, or an invented date slips into a
shipped file.

## The two sources of truth

| Source | Owns | Generated outputs (do not hand-edit) |
| --- | --- | --- |
| `design-system/tokens/tokens.json` | color, type, spacing, radius, shadow, motion | `tokens/tokens.css`, `tokens.flat.json`, `tools/brand.tokens.mjs` (via `npm run tokens`) |
| `content-studio/FACTS.md` | every live value (dates, prices, seats, links, venue, funnel) | nothing generated — read directly by humans, prompts, and the studio |

## The engines

- **Recipes** (`design-system/recipes/`) — per-artifact build instructions (poster, brochure-page,
  instagram-post, launch-grid, landing-section) + the shared component **snippets** (`snippets.md`,
  generated from `snippets.src.md` by `npm run snippets`).
- **Prompts** (`content-studio/prompts/`) — copy generators; each pulls its live numbers from a
  `FACTS` block so small/cheap models stay on-brand. See `content-studio/SMALL_MODELS_GUIDE.md`.
- **`.claude/skills/`** — a brand-neutral design engine (design-effects, design-tokens,
  image-composite, poster-design, web-to-image, web-to-pdf, design-studio). The Eduflick brand
  is the *profile* these skills read; see [`../.claude/skills/README.md`](../.claude/skills/README.md).
- **`.claude/agents/`** — a 7-agent team (lead, copywriter, design-engineer, visual-production,
  QA/fact-integrity, red-team, devops) + a pre-publish gate. See
  [`../.claude/agents/README.md`](../.claude/agents/README.md).

## The export layer

`tools/*.mjs` render HTML artifacts to exact pixels (Playwright + real Chromium) or to PDF, and
generate image backdrops. Output lands in `exports/` (gitignored — regenerable). Key scripts:
`export:posters`, `export:stories`, `export:wa`, `export:share`, `export:slides`, `export:pdf`,
`export:ig`, and the imagery pipeline `gen:backdrops` (providers: recraft / gemini / procedural).
Full list: [`../tools/README.md`](../tools/README.md). The day-to-day loops are in
[`WORKFLOW.md`](WORKFLOW.md).

## Runtime surface 1 — the brand studio (local)

`tools/studio-server.mjs` + `tools/studio/` is a zero-dependency local SPA to **view, manage, and
evaluate** every artifact in one place — galleries (posters/stories/instagram), the document
library (brochures + the program deck), a launch-grid manager, status/annotations, a facts editor,
and the **program room** (every current FAE poster/brochure/deck gathered to review). Run it with
`npm run studio` → `http://127.0.0.1:8090/tools/studio/`. It composes a live manifest by scanning
the artifacts (no duplicated data) and is covered by a `node --test` suite. Standalone posters
(e.g. the WhatsApp share poster at `design-system/collateral/whatsapp-poster.html`) are discovered
as `kind: poster`, not mis-filed as brochures.

## Runtime surface 2 — the apply site (live)

`FAE_apply/` is a **Cloudflare Worker + KV** registration site, live at **eduflickai.com/apply**.
It serves the static apply form (`public/apply/`), validates + stores submissions in KV, and is the
single destination of the **apply-direct funnel** (Awareness → Apply → booking call → close; the
old masterclass lead-magnet was retired). `src/worker.js` is the backend; `wrangler.jsonc` is the
config; `scripts/sync-brand.mjs` pulls brand assets/values so the form matches the kit. Deploy is a
gated `wrangler deploy`. See [`../FAE_apply/README.md`](../FAE_apply/README.md) and
[`SETUP.md`](SETUP.md).

## Top-level map (one line each)

`design-system/` visuals + tokens · `content-studio/` words + FACTS · `brochures/` finished
deliverables · `planning/` campaign strategy · `tools/` build/export/studio · `FAE_apply/` the live
site · `brand-book/` the narrative · `docs/` this index · `templates/` copy-to-start scaffolds ·
`.claude/` the design engine + agent team · `assets/` public mirror of `design-system/assets`. Full
descriptions: [`../CONTRIBUTING.md` § Where things go](../CONTRIBUTING.md).
