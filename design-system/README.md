# Eduflick AI — Design System

> A feed for thinking. Short-form, AI-curated learning — one minute at a time.
> **Eduflick AI** is a venture of **Tomatrix Technologies Pvt Ltd**.

This repository is the working design system for the Eduflick AI brand: foundations
(color, type, spacing, motion), real logo assets, an iconography approach, and
high-fidelity UI kits that recreate the product surfaces. Use it to design on-brand
interfaces, marketing, decks, and prototypes.

---

## 1. Company & product context

Eduflick AI reimagines learning as a **feed**. It cuts any source — a lecture, a
paper, a video — into sequenced, personalised **one-minute "flicks."** The pitch:
*the doom-scroll antidote.* Short-form learning, anchored by AI that curates the
path (it sequences; the human decides) so the learner stays in flow.

The brand carries **one mark** — a square "feed card" with a triangular notch bitten
out of its right edge (the "play," the moment a lesson begins). One shape, one notch.

### Surfaces represented in the source material

| Surface | What it is | UI kit |
| --- | --- | --- |
| **Eduflick App** (consumer) | Mobile learning feed — flick cards, bottom nav, FAB, search, profile, the **Sparks** gamification system | `ui_kits/app/` |
| **Eduflick Web** (educator / institution) | Dark dashboard + light marketing site — top nav, sidebar, stat cards, content library, analytics | `ui_kits/web/` |
| **Full-Stack AI Engineer Program** | An active in-person cohort program run by Tomatrix (₹49K Pioneer Cohort, Technopark Trivandrum). Marketing-led, uses the same brand. | covered in `web` marketing components |

There are **two faces** to the brand: the consumer learning-feed *vision* and the
*active* AI-engineering cohort business. Both share one visual system.

### Sources given (store for reference — reader may not have access)

- **`EduflickAI_BrandKit/`** — local codebase (read-only, mounted). Key files:
  - `Eduflick_Brand_Book_v4.html` — the definitive 11-chapter brand book (mark,
    construction, color, type, motion, voice, UI, Sparks, social, print, governance).
    **This is the source of truth** for nearly everything here.
  - `Eduflick_AI_Social_Media_Campaign_Plan.md` — voice/tone + go-to-market for the
    cohort program.
  - `Eduflick_AI_Brochure.html`, `..._Leadership_Program_*`, `..._Full_Stack_AI_Engineer_Brochure.html`
    — marketing collateral.
  - `assets/logo/` — canonical SVG marks, lockups, favicon; `social/` PNGs (avatars, banners, OG card).
- No Figma or GitHub URL was provided.

---

## 2. Content fundamentals (voice & copy)

The voice is **confident, technical, no fluff. Talk like engineers, not marketers.**
Brevity is treated as a core value — *"brevity is respect."*

- **Casing.** Display and headings are **always lowercase** (`learn anything in sixty seconds.`).
  Mono labels are **UPPERCASE** with wide tracking (`LESSON 047 · 60 SECONDS`). Sentence
  case in body copy. The wordmark is `eduflick` lowercase + `AI` uppercase.
- **Person.** Speaks plainly to *you* ("pull down to retry," "your next 3 flicks are ready").
  Internally frames the brand as *we*. Avoids corporate "the user."
- **The serif accent.** One or two words per headline are set in *Instrument Serif italic*
  and tinted indigo — the emotional/editorial beat inside an otherwise tight sans headline
  (`a feed for **thinking.**`). Use it on the payoff word, never the whole line.
- **Sentence shape.** Short. Declarative. Often fragments. Cuts to the verb.
  `Mitosis cuts a cell in half. Then it does it again. In 60 seconds, you'll understand why.`
- **Numbers as proof.** `60s`, `8 flicks`, `78% retention`, `20 seats`. Concrete, not vague.
- **Own the unit.** "Flick" is the trademark noun — 1 flick = 1 concept = 60 seconds.
  Use it as a category word ("flick through," "your feed").
- **Emoji.** Effectively **not used** in product or polished brand copy. The brand book's
  voice examples *strip* emoji from captions. (Internal marketing planning docs use a few
  pillar emoji as shorthand, but finished brand-facing copy does not.)
- **Forbidden gamification copy.** Never "level up," "boost," "claim reward," "unlock."
  Achievements are *Sparks* you **earn**: "you earned a spark."

**Before / after the brand book teaches:**

| ✗ before | ✓ after |
| --- | --- |
| "Something went wrong! Please try again later or contact our support team." | "Lost connection. Pull down to retry." |
| "🧠✨ Did you know mitosis is CRUCIAL?! Learn EVERYTHING! 💯 #science #STEM…" | "Mitosis cuts a cell in half. Then it does it again. In 60 seconds, you'll understand why." |

**Signature lines:** *a feed for thinking · learn anything in sixty seconds · one shape, one notch · the flick is the unit.*

---

## 3. Visual foundations

A precise, editorial, **engineer's** aesthetic — dark by default, indigo as the single
signal hue, lots of mono metadata, tight lowercase display type.

- **Color.** One brand hue: **indigo** (`#5B5BF0` primary; ramps from `#EEF0FF` to
  `#0B0822` indigo-ink). Supported only by a **neutral pair** — warm **paper** `#F5F2EA`
  and cool **ink** `#0A0B10`. **The rule: indigo + neutral, never a third hue.** Coral
  `#FF6E5A` exists strictly as a semantic warn/scarcity/CTA flag — used sparingly, never
  decoratively. Success green `#4ADE80`.
- **Theme.** **Dark is the default** (ink canvas, `ink-2` cards). A light "paper" theme
  exists for documents, decks, and the marketing site. `#5B5BF0` works on both.
- **Type.** **Manrope** carries everything structural — display/heading at 800–900 with
  tight negative tracking (−0.03 to −0.05em), body at 500. **Instrument Serif** (italic
  only) is the editorial accent. **JetBrains Mono** is all metadata, labels, numbers, code.
- **Backgrounds.** Solid ink or paper, occasionally a deep indigo gradient
  (`i-700 → i-ink`, ~135–160°) on hero canvases. **Subtle texture, not loud:** faint dot
  grids (`radial-gradient … 22px`) and 40px line grids at ~4–10% opacity over indigo
  canvases. **No photography** in the core brand — the system is graphic and typographic.
  Imagery, when present, is replaced by the mark, by data, or by editorial type.
- **The mark as motif.** UI states, gamification badges, loading spinners, and bullets are
  all derived from the mark's geometry (the notch carving, wedges, receding queues). Never
  paste foreign shapes on top of it.
- **Animation.** Purposeful and quick. Primary easing `cubic-bezier(0.16,1,0.3,1)`
  (ease-out) and `cubic-bezier(0.7,0,0.2,1)` (ease-in-out); a spring
  `cubic-bezier(0.34,1.56,0.64,1)` for celebratory bounces (earning a Spark = ~1.2s, then
  it goes quiet). Durations: fast 150ms, base 300ms, slow 600ms. The signature motion is
  the **notch carving** out of a solid square. Respects `prefers-reduced-motion`.
- **Hover states.** Buttons lift (`translateY(-2px)`) and gain the indigo glow shadow
  (`--shadow-brand`) and a lighter indigo (`i-500 → i-400`). Cards raise to `ink-3`, scale
  ~1.03, border brightens to `line-2`. Links: indigo underline grows in. Icons scale ~1.25
  on the spring easing.
- **Press states.** Settle back down (remove lift), no harsh color change. Calm, not bouncy
  — except deliberate celebration moments.
- **Borders & hairlines.** 1px, very low-opacity (`rgba(245,242,234,0.08)` on dark;
  `rgba(10,11,16,0.08)` on paper). Dashed hairlines separate spec/meta rows. Grids are
  built from 1px gaps over a hairline background, not heavy rules.
- **Shadows.** Restrained on dark (deep, soft black). The hero move is the **brand glow**:
  `0 8px 32px -8px rgba(91,91,240,0.35)`. No bevels, no inner shadows on the mark — it
  stays flat.
- **Corner radii.** A consistent ramp: sm 6 · md 10 · lg 14 · xl 18 · 2xl 22 · 3xl 28.
  Feed cards and UI cards sit at 14–18px; large hero/section cards 22–28px; pills 999px.
  **The mark itself uses a near-zero 3px radius** — it reads as a sharp card, not a rounded blob.
- **Cards.** `ink-2` surface, 1px hairline border, 18px radius, ~28px padding on dark. On
  paper: white surface, `rgba(10,11,16,0.14)` border. Subtle — depth comes from the border
  and a faint shadow, not from heavy elevation.
- **Transparency & blur.** Used lightly — washes of indigo at 6–16% for soft fills and
  hover backgrounds; protection gradients on imagery are rare since imagery is rare.
- **Layout.** Generous, grid-driven, lots of negative space. Mono "id" tags and section
  numbers (`00 · at a glance`) label everything like an editorial spec sheet. Three- and
  five-column token/pillar grids are a recurring rhythm.

---

## 4. Iconography

- **Built-in line-icon set (primary).** The brand book ships a **24-icon system** as inline
  SVG `<symbol>`s — book, play, clock, search, star, heart, share, download, settings, user,
  bell, check, plus, arrow-right, arrow-up, menu, grid, lock, mail, map-pin, link, film,
  pencil, trash. Style: **2px stroke, round caps/joins, 24×24 viewBox, `currentColor`** — a
  Feather/Lucide-class geometric line set (filled variants for play/star/heart). These are
  extracted to **`assets/icons/eduflick-icons.svg`** as a reusable sprite. Reference with
  `<svg><use href="assets/icons/eduflick-icons.svg#ic-play"/></svg>`.
- **CDN fallback.** Because the house set matches **Lucide** in weight and style, any icon
  not in the 24 can be pulled from **Lucide** (`https://unpkg.com/lucide-static`) without a
  visible seam. Documented so designers don't hand-roll. *(Substitution flag: the UI kits
  use the extracted house sprite first and Lucide only to fill gaps — same 2px round style.)*
- **The mark companions.** A second, brand-specific icon family expresses **UI state** by
  transforming the mark itself (solid, outline, done, paused, queue, streak, share, loading).
  These are not generic icons — they are the logo doing a job. Extracted to
  **`assets/icons/mark-companions.svg`**.
- **Emoji.** Not used as iconography. Subject "badges" use a single serif **letter**
  (`B` biology, `M` math, `Φ` philosophy, `λ` languages) inside a mark-shaped tile — type as
  icon, never emoji.
- **Unicode.** Sparingly — arrows (`→ ↓`), middots (`·`) as separators in mono metadata.

---

## 5. Fonts

All three families are **Google Fonts** — no substitution required:

- **Manrope** — wght 400/500/600/700/800/900
- **Instrument Serif** — italic (ital@0;1)
- **JetBrains Mono** — wght 400/500

Load via:
```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## 6. Index / manifest

Root files:

| File | What |
| --- | --- |
| `README.md` | This document |
| `colors_and_type.css` | All foundation tokens (color, type, spacing, radius, shadow, motion) + semantic text styles. Import this first. |
| `SKILL.md` | Agent Skill entry point (cross-compatible with Claude Code) |
| `assets/logo/` | Canonical marks (`mark*.svg`), lockups (`lockup-*.svg`), `favicon.svg`, `LOGO_README.md` |
| `assets/logo/social/` | Avatars (indigo/ink/paper), LinkedIn banner, OG card |
| `assets/icons/` | `eduflick-icons.svg` (24 line icons) + `mark-companions.svg` (mark-state family) |
| `preview/` | Design-system cards rendered in the Design System tab |
| `ui_kits/app/` | Consumer mobile app UI kit (feed, flick player, search, profile, Sparks) |
| `ui_kits/web/` | Educator/institution web UI kit (dashboard, library, analytics, marketing) |
| `slides/` | Sample brand presentation slides (title, section, content, quote, closing) |

**Start here:** import `colors_and_type.css`, load the three Google fonts, then compose
with components from the relevant UI kit. Build wordmarks in HTML
(`<span class="wordmark">eduflick<i>AI</i></span>`) for reliable rendering; use the
`mark*.svg` files for the mark.

---

*Eduflick AI · a Tomatrix Technologies venture · brand source: Brand Book v4.0*
