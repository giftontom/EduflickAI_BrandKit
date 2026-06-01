---
name: eduflick-design
description: Use this skill to generate well-branded interfaces and assets for Eduflick AI (a Tomatrix Technologies venture — short-form, AI-curated learning), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out
and create static HTML files for the user to view. If working on production code, you can
copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build
or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_
production code, depending on the need.

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

## The non-negotiables
- **Indigo + neutral only.** `#5B5BF0` primary; paper `#F5F2EA` and ink `#0A0B10` support.
  Never introduce a third hue. Coral `#FF6E5A` is a semantic warn/CTA flag, used sparingly.
- **Dark by default**, paper theme for documents/marketing.
- **Type:** Manrope (lowercase display 800–900, tight tracking), Instrument Serif italic for
  one or two accent words, JetBrains Mono for all labels/meta/numbers (UPPERCASE, wide tracking).
- **Voice:** confident, technical, no fluff. Short declaratives. Own the word "flick." No emoji.
  Achievements are "Sparks" you *earn* — never "level up / unlock / claim reward."
- **The mark** (square + right-edge notch) is the motif — it becomes UI states, badges, bullets.
  Never distort, rotate, recolor with a third hue, or add bevels/glows to it.
