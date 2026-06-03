---
name: eduflick-design
description: Use this skill to generate well-branded interfaces and assets for Eduflick AI (a Tomatrix Technologies venture — short-form, AI-curated learning), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

> **Sibling skill — copy & marketing:** this skill owns the *visuals*. For *words* — Instagram
> captions/carousels, reel & LinkedIn & ad copy, WhatsApp nurture flows, and the workflow for
> getting on-brand output from **small/cheap models** — use the `eduflick-content` skill at
> `../content-studio/SKILL.md`. Typical flow: content-studio writes the copy → this skill renders it.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out
and create static HTML files for the user to view. If working on production code, you can
copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build
or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_
production code, depending on the need.

## Building visuals with a small/cheap model? (Haiku, mini, local)
Use the **assemble-don't-invent** track — engineered so a small model stays on-brand:
- `DESIGN_CHEATSHEET.md` — the whole visual system in one paste-anywhere page (tokens, mark, rules).
- `SMALL_MODELS_GUIDE.md` — the render→inspect→fix loop + common visual failure modes.
- `recipes/` — `00_SYSTEM_PROMPT.md`, `snippets.md` (copy-paste HTML parts bin, incl. cinematic
  `S15–S19`: halo · grain · vignette · footer lockup · glass + deck-slide), and per-artifact
  recipes (instagram-post · poster · slide-deck · landing-section · brochure-page · **launch-grid**).
- `QA_CHECKLIST.md` — the visual pass/fail gate before export.
Flow: load system prompt + cheat sheet + snippets → fill a recipe's FACTS + text → generate one
HTML file → **render and look** → QA → **export pixel-perfect PNGs with `../tools`**
(`npm run export`) or drop into a `collateral/` kit.

## Quick start
1. Read `README.md` — brand context, content/voice, visual foundations, iconography, manifest.
2. Import `colors_and_type.css` and load the three Google fonts (Manrope, Instrument Serif,
   JetBrains Mono) — the link tag is in the README.
3. Use the mark from `assets/logo/mark*.svg`; build the wordmark in HTML
   (`<span class="wordmark">eduflick<i>AI</i></span>`).
4. For icons, inject the sprite (`ui_kits/_sprite.js` / `preview/_sprite.js`) and reference
   `<use href="#ic-name">` (24-icon house set + mark-companion state icons). Fill gaps from
   Lucide — same 2px round style.
5. Pull ready-made components from `ui_kits/app/` (consumer mobile) or `ui_kits/web/`
   (educator dashboard + marketing). Copy and adapt — they're cosmetic, not production logic.
6. For decks, start from `slides/*.html` (title, section, content, quote, closing).
7. For a full **Instagram launch**, open `collateral/Eduflick Launch Grid.html` — 12 mural-sliced
   tiles + an in-page carousel viewer + deck slides + motifs on cinematic surfaces (`S15–S19`).
8. **To ship PNGs:** render, QA, then `cd tools && npm run export` for pixel-perfect 1080×1350
   files (every post + carousel slide); `npm run export:avatar` for the profile picture.

## The non-negotiables
- **Indigo + neutral only.** `#5B5BF0` primary; paper `#F5F2EA` and ink `#0A0B10` support.
  Never introduce a third hue. Coral `#FF6E5A` is a semantic warn/CTA flag, used sparingly.
- **Dark by default**, paper theme for documents/marketing.
- **Type:** Manrope (lowercase display 800–900, tight tracking), Instrument Serif italic for
  one or two accent words, JetBrains Mono for all labels/meta/numbers (UPPERCASE, wide tracking).
- **Voice:** confident, technical, no fluff. Short declaratives. Own the word "flick." No emoji.
  Achievements are "Sparks" you *earn* — never "level up / unlock / claim reward."
- **The mark** (square + right-edge notch) is the motif — it becomes UI states, badges, bullets.
  Never distort, rotate, recolor with a third hue, or add bevels/glows to it. Cinematic light
  goes in a **halo *behind*** the mark, never as a filter on it — the mark stays flat.
- **Wordmark = "eduflick AI"** — a space then uppercase AI (white on dark/indigo, indigo on paper).
- **Co-brand: Tomatrix Technologies Pvt Ltd.** Eduflick mark *leads*; Tomatrix supports (1u
  divider), is **never recolored to indigo**, legal name always proper-cased; footer attribution
  "a Tomatrix Technologies venture" (mono). Logo: `assets/partners/tomatrix-logo-light.png`.
