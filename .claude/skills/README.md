# Universal design skills

A brand-neutral, composable family of Claude skills for graphic design — build any visual artifact
for any brand, export it to PDF or pixel-perfect PNG. The technique is the **engine**; the brand is
**data** (a `tokens.json` + a brand profile). Swap the data, get a new brand, zero code change.

## The architecture
```
brand profile (tokens.json + brand-profile.json)
        │ design-tokens compiles tokens.json →
        ▼
   tokens.css  ──consumed by──▶  design-effects · image-composite · web-to-pdf · recipes
        ▲                                         orchestrated by
        └───────────────── design-studio ◀────────────────────────
```

## The skills
| Skill | What it does |
| --- | --- |
| **design-studio** | umbrella orchestrator: assemble → render → QA → export; owns the brand-profile contract + recipes |
| **poster-design** | the poster system: 6–7 archetype × 2 register set, the 7 fusion rules, + an AI image-backdrop pipeline (Gemini → procedural fallback) |
| **design-tokens** | `tokens.json` → `tokens.css` (+ flat JSON, JS) — the single source of truth, with a drift guard |
| **design-effects** | cinematic CSS toolkit: halo, grain, vignette, glass, glow, canvas frames — themed by `--accent` |
| **image-composite** | combine an image with type/graphics the right way + a brand-neutral generative-image prompt kit |
| **web-to-pdf** | client-side "Download PDF" button (html2canvas + jsPDF) for multi-page documents |
| **web-to-image** | pixel-perfect HTML → PNG export (Playwright + Chromium) for social/raster |

## Start here
- **New brand?** `design-tokens` (set the palette/fonts) → `design-studio` (fill the brand profile).
- **Designing an artifact?** `design-studio` → pick a recipe → render → QA → export.
- **Just need one capability?** Use the engine skill directly (e.g. `web-to-pdf` to add a download
  button; `design-effects` for cinematic CSS).

## Provenance & promotion
Extracted and de-branded from this repo's production Eduflick design system (token pipeline,
cinematic snippets, the brochure PDF exporter, the Playwright launch-grid exporter, the AI-imagery
guide). They live in `.claude/skills/` so they load as project skills here; because they're
brand-neutral, copying any of them to `~/.claude/skills/` (or packaging as a plugin) makes it
available in every project.

The Eduflick `design-system` is now one concrete consumer of these engines — its `tokens.json` is a
brand-profile instance; its brand non-negotiables (indigo, the mark, voice) are its profile data.
