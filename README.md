# Eduflick AI · Brand Kit

> **A feed for thinking.** Short-form, AI-curated learning — one minute at a time.
> Eduflick AI is a venture of **Tomatrix Technologies Pvt Ltd**.

The complete design system, brand book, marketing collateral, content studio, and
product UI kits — in one place. Built for speed: produce on-brand copy and visuals
at volume, even with small/cheap AI models.

---

## What's here

| Section | Description | Start here |
| --- | --- | --- |
| **Brand Book** | The definitive 11-chapter brand book (mark, color, type, motion, voice, UI, Sparks, governance) | [`brand-book/Eduflick_Brand_Book_v4.html`](brand-book/Eduflick_Brand_Book_v4.html) |
| **Design System** | Visual foundations — tokens, logo, icons, UI kits, slides, collateral kits | [`design-system/README.md`](design-system/README.md) |
| **Content Studio** | Marketing copy engine — brand cheat sheet, prompt library, small-model workflow, QA | [`content-studio/README.md`](content-studio/README.md) |
| **Brochures** | Program collateral — Full-Stack AI Engineer, Leadership Program, posters | [`brochures/`](brochures/) |
| **Planning** | 6-week social media campaign plan, funnel, targeting, measurement | [`planning/`](planning/) |
| **Tools** | Pixel-perfect PNG exporter (Playwright), avatar generator, static server | [`tools/README.md`](tools/README.md) |

---

## Quick start

### You need copy (words)
1. Read [`content-studio/BRAND_CHEATSHEET.md`](content-studio/BRAND_CHEATSHEET.md) — the whole brand in one page.
2. Pick a prompt from [`content-studio/prompts/`](content-studio/prompts/), fill its FACTS block.
3. Generate. Run the [`QA checklist`](content-studio/QA_CHECKLIST.md). Ship.

### You need visuals (pixels)
1. Import [`design-system/colors_and_type.css`](design-system/colors_and_type.css).
2. Load the 3 Google Fonts (Manrope, Instrument Serif, JetBrains Mono).
3. Compose from [`design-system/ui_kits/`](design-system/ui_kits/) or fill a [`collateral kit`](design-system/collateral/).
4. Export pixel-perfect PNGs: `cd tools && npm install && npm run export`.

### You're using a small/cheap AI model
Read the small-model guides — they're the heart of this kit:
- **Copy:** [`content-studio/SMALL_MODELS_GUIDE.md`](content-studio/SMALL_MODELS_GUIDE.md)
- **Visuals:** [`design-system/SMALL_MODELS_GUIDE.md`](design-system/SMALL_MODELS_GUIDE.md)

The strategy: **assemble, don't invent.** The model fills a tightly-constrained template;
you (or a bigger model) QA and ship.

---

## The active business

The **Full-Stack AI Engineer Program — Pioneer Cohort 01** is the live program this
brand kit serves:

- **12 weeks**, in-person at **UXP Innovation Hub, Trivandrum**
- **20 selective seats** · **₹49,000** founding price (₹70,000 from Cohort 2)
- **3 deployed projects** on a real stack (Cursor, Next.js, Claude/OpenAI, Pinecone, LangChain, n8n)
- Top-of-funnel: a **free technical masterclass** → [eduflickai.com/masterclass](https://eduflickai.com/masterclass)

The Instagram launch is fully planned — see [`content-studio/INSTAGRAM_LAUNCH_PLAN.md`](content-studio/INSTAGRAM_LAUNCH_PLAN.md)
for the 12-tile mural grid, full copy, and posting waves.

---

## The two skills (for AI agents)

This repo ships with two invocable agent skills:

| Skill | File | Owns |
| --- | --- | --- |
| `eduflick-content` | [`content-studio/SKILL.md`](content-studio/SKILL.md) | Words, strategy, small-model copy workflow |
| `eduflick-design` | [`design-system/SKILL.md`](design-system/SKILL.md) | Visuals — colors, type, logo, UI kits, HTML artifacts |

Use them together: content-studio writes the carousel copy → design-system renders it.

---

## Contributing & navigation

- **[`CONTRIBUTING.md`](CONTRIBUTING.md)** — the rules, where things go, the single-source
  workflow (`npm run tokens && npm run snippets` before committing).
- **[`AGENTS.md`](AGENTS.md)** — entry point for AI agents and future standing instructions.
- **[`docs/README.md`](docs/README.md)** — the doc index (one map to every guide).
- **[`templates/`](templates/)** — copy-to-start templates for recipes, prompts, components, assets.

The backbone is **one source of truth per concern**: tokens in
[`design-system/tokens/tokens.json`](design-system/tokens/tokens.json), live values in
[`content-studio/FACTS.md`](content-studio/FACTS.md), assets in `design-system/assets/`.

---

## Live preview

```bash
cd tools && npm install && npm run serve
# Open http://localhost:8080 → the brand kit landing page
# Open http://localhost:8080/design-system/collateral/launch-grid.html?export=1
#   → full-size export view
```

---

## Export assets

```bash
cd tools
npm run export              # All posts + carousel slides → ../exports/ (2x crisp)
SCALE=1 npm run export      # Exact 1080×1350
npm run export:avatar       # Profile avatar → ../assets/logo/social/
```

---

## Non-negotiables

- **One hue:** indigo `#5B5BF0` + neutral (paper `#F5F2EA` / ink `#0A0B10`). Coral `#FF6E5A` only for CTAs/scarcity.
- **Voice:** confident, technical, no fluff. Talk like engineers, not marketers.
- **No emoji** in finished brand copy. Numbers as proof.
- **The mark** is a square with a single notch — never distort, rotate, or add glows to it.
- **Never invent facts.** Dates, prices, seat counts come only from the FACTS block.

Full rules: [`content-studio/BRAND_CHEATSHEET.md`](content-studio/BRAND_CHEATSHEET.md) (words) +
[`design-system/DESIGN_CHEATSHEET.md`](design-system/DESIGN_CHEATSHEET.md) (visuals).

---

## Repository structure

```
eduflick-brand-kit/
├── index.html               ← Landing page (open in browser)
├── brand-book/               ← Source of truth: Brand Book v4.0
├── design-system/            ← Visuals: tokens, logo, icons, UI kits, recipes, collateral
│   ├── assets/               ←   Canonical logo, icon, partner assets
│   ├── recipes/              ←   Assemble-don't-invent build system
│   ├── collateral/           ←   Ready-to-fill Instagram/Brochure/Calendar kits
│   ├── ui_kits/              ←   Product UI components (app + web)
│   └── slides/               ←   Deck templates
├── content-studio/           ← Words: cheat sheet, prompts, QA, launch plan, playbook
│   └── prompts/              ←   Per-channel copy-paste templates
├── tools/                    ← Playwright PNG exporter + static server
├── brochures/                ← Program collateral (HTML + PDF)
├── planning/                 ← Campaign strategy
├── assets/                   ← Mirror of design-system/assets/ (backward compat)
└── exports/                  ← Generated PNGs (gitignored)
```

---

*Eduflick AI · a Tomatrix Technologies venture · [eduflickai.com](https://eduflickai.com) · [@eduflick.ai](https://instagram.com/eduflick.ai)*
