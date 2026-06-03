# Eduflick AI — Design Cheat Sheet (self-contained, for building visuals)

> **The visual twin of `../content-studio/BRAND_CHEATSHEET.md`.** That one governs *words*; this
> one governs *pixels*. Paste this whole file into any model to make it produce on-brand HTML
> artifacts (Instagram canvases, posters, slides, brochures, web sections). It is complete on its
> own — don't summarize it for a small model.

The full narrative version is `README.md`. This is the compressed, paste-ready version.

---

## 0. The aesthetic in one line
A precise, editorial, **engineer's** aesthetic — dark by default, **indigo as the single signal
hue**, lots of mono metadata, tight lowercase display type, generous negative space, no photos.

## 1. Color — the iron rule
- **One brand hue: indigo.** `#5B5BF0` is PRIMARY (buttons, mark, signal). Accent/light
  `#8B97FF` (the "AI" tint). Deep `#0B0822` indigo-ink for hero gradients.
- **Neutral pair only:** warm **paper** `#F5F2EA` (light bg), cool **ink** `#0A0B10` (dark bg).
- **NEVER introduce a third hue.** No teal, no purple, no gradient rainbow.
- **Coral `#FF6E5A`** is the ONLY exception — a *semantic* flag for CTAs, scarcity ("seats left"),
  errors. Used sparingly, never decoratively. Success green `#4ADE80`, equally rare.
- Full ramp: `#EEF0FF #DCE0FF #B7C0FF #8B97FF #6E78F5 #5B5BF0 #4B3FE0 #3A2BB8 #261A82 #150D52 #0B0822`.

## 2. Theme
- **Dark is the default.** Canvas `#0A0B10`, card surface `#11131C`, raised `#181B28`.
- **Paper theme** for documents, decks, brochures, the marketing site: bg `#F5F2EA`, card `#FFF`.
- `#5B5BF0` works on both. To flip, wrap in `class="theme-light"` (defined in `colors_and_type.css`).

## 3. Type
Three Google Fonts, no substitution. Load this exact tag in `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```
- **Manrope** — everything structural. Display/headings **800–900**, body **500**. Lowercase
  display, **tight negative tracking** (−0.03 to −0.05em). Line-height ~0.9 on display.
- **Instrument Serif** — *italic only*, indigo-tinted (`#8B97FF`), for **one or two accent words**
  inside a headline (the editorial beat). Never the whole line.
- **JetBrains Mono** — ALL labels, eyebrows, meta, numbers, code. **UPPERCASE, wide tracking**
  (0.22em). e.g. `LESSON 047 · 60 SECONDS`, `PIONEER COHORT 01`.
- Scale (px): display 88 · h1 64 · h2 40 · h3 28 · h4 22 · lead(serif) 21 · body 16 · small 14 ·
  mono-meta 11 · micro 10.

### Casing (signature — don't get this wrong)
- Display/headlines = **lowercase**. Mono labels = **UPPERCASE**. Body = sentence case.
- Wordmark = **"eduflick AI"** in HTML: `<span class="wordmark">eduflick<i>AI</i></span>` — a
  space then **uppercase AI** (white on dark/indigo, indigo `#5B5BF0` on paper).

## 4. The mark
A single closed path on a 180×180 viewBox — a square "feed card" with a triangular notch bitten
from its **right edge** (the "play"). **One shape, one notch.**
```html
<svg viewBox="0 0 180 180" width="48" height="48" aria-hidden="true">
  <path d="M13 13 L167 13 L167 82 L120 112.5 L167 143 L167 167 L13 167 Z" fill="#5B5BF0"/>
</svg>
```
Fills: indigo `#5B5BF0` (default), paper `#F5F2EA` (on dark/indigo), ink `#0B0822` (on paper).
**Never** distort, rotate, recolor with a third hue, add bevels/glows/inner-shadows, or paste
foreign shapes on it. It stays flat with a near-zero **3px** corner radius (reads as a sharp card).
Min sizes: app icon ≥40px · tab ≥24px · favicon ≥16px · never <10px.

## 5. Spacing · radius · shadow · motion
- **Spacing scale (px):** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96. Be generous.
- **Radius (px):** sm 6 · md 10 · lg 14 · xl 18 · 2xl 22 · 3xl 28 · pill 999. Cards 14–18; big
  hero/section 22–28. **The mark stays at 3px.**
- **Borders:** 1px, very low opacity hairlines — `rgba(245,242,234,0.08)` on dark,
  `rgba(10,11,16,0.08)` on paper. Dashed hairlines separate spec/meta rows.
- **Shadows:** restrained. The hero move is the **brand glow** `0 8px 32px -8px rgba(91,91,240,.35)`.
  No bevels.
- **Motion:** ease-out `cubic-bezier(0.16,1,0.3,1)`, ease-in-out `cubic-bezier(0.7,0,0.2,1)`,
  spring `cubic-bezier(0.34,1.56,0.64,1)` (celebration only). Durations: fast 150ms, base 300ms,
  slow 600ms. Hover: buttons lift `translateY(-2px)` + brand glow; cards raise + border brightens.
  Respect `prefers-reduced-motion`.

## 6. Backgrounds & texture (subtle, never loud)
- Solid ink or paper, OR a deep **indigo gradient** on hero canvases:
  `linear-gradient(150deg, #3A2BB8, #0B0822)` (~135–160°).
- **Faint dot grid:** `radial-gradient(circle, rgba(245,242,234,0.06) 1px, transparent 1px)` at
  `background-size:22px 22px`. **Line grid:** 40px at ~4–10% opacity. Always low-opacity over indigo.
- **No photography.** Replace imagery with the mark, with data, or with editorial type.
- **Cinematic depth (sanctioned — still one hue):** offset the gradient hot-spot for *directional*
  light; add a soft **vignette** (corner darkening) and a faint **grayscale film grain** (≤5%,
  desaturated — texture, not a hue; it also kills gradient banding). Light a focal element with a
  **halo *behind* it** — never a glow/filter *on the mark* (the mark always stays flat). See
  `recipes/snippets.md` S15–S19.

## 7. Layout language
- Editorial **spec-sheet** feel: mono "id" tags and section numbers label everything
  (`00 · at a glance`, `01 · the gap`). 3- and 5-column token/pillar grids recur.
- Generous negative space. Depth comes from hairline borders + faint shadow, not heavy elevation.
- Cards: `#11131C` surface, 1px hairline, 18px radius, ~28px padding on dark; white surface +
  `rgba(10,11,16,0.14)` border on paper.

## 8. Canvas sizes (build at true ratio, scale down to preview)
| Artifact | Pixels / ratio |
| --- | --- |
| IG feed square | 1080×1080 (1:1) |
| IG portrait / carousel | 1080×1350 (4:5) |
| IG/Reel story | 1080×1920 (9:16) |
| Slide | 1920×1080 (16:9) |
| A4 print (poster/brochure) | 794×1123px @96dpi (210×297mm); use `@page { size:A4 }` for print |
| OG card | 1200×630 |

## 9. Assets you can reference (relative to this folder)
- Tokens: `colors_and_type.css` (import first). Logo: `assets/logo/mark*.svg`, `lockup-*.svg`,
  `favicon.svg`. Icons: `assets/icons/eduflick-icons.svg` (24 line icons, use `#ic-play` etc.) +
  `assets/icons/mark-companions.svg` (mark-as-state). Social PNGs: `assets/logo/social/`.
- Ready containers: `collateral/` kits — **`Eduflick Launch Grid.html`** (12-tile cinematic IG
  launch mural + carousel viewer + deck slides), Instagram/Brochure/Calendar — plus `slides/` deck
  templates, `ui_kits/` product components. Copy-paste snippets: `recipes/snippets.md`.
- **Co-brand:** parent logo `assets/partners/tomatrix-logo-light.png`. The Eduflick mark *leads*,
  a 1u divider separates them, **Tomatrix is never recolored to indigo**, the legal name is
  proper-cased "Tomatrix Technologies Pvt Ltd"; footer "a Tomatrix Technologies venture" (mono).
- **Export:** render → QA → `cd ../tools && npm run export` for pixel-perfect 1080×1350 PNGs
  (every post + carousel slide); `npm run export:avatar` for the profile picture.

## 10. Hard DOs / DON'Ts
**DO:** one hue (indigo) + neutral · dark default · lowercase display · UPPERCASE mono labels ·
one serif accent word · the mark flat & undistorted · faint dot/line texture · generous space ·
numbers and mono ids everywhere · the 3 Google fonts.
**DON'T:** a third hue · coral as decoration · emoji as iconography (use a serif letter in a
mark-tile, or a line icon) · stock photos · Title Case headlines · drop shadows/bevels on the mark
· heavy elevation · rainbow gradients · rounded-blob marks · system fonts · recoloring the
Tomatrix logo to indigo · a glow/filter *on* the mark (light goes in a halo *behind* it).

## 11. Minimal on-brand HTML skeleton (dark)
```html
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Manrope',sans-serif;background:#0A0B10;color:#F5F2EA;padding:80px;
       -webkit-font-smoothing:antialiased}
  .eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;
           letter-spacing:0.22em;text-transform:uppercase;color:#8B97FF}
  h1{font-weight:900;font-size:64px;letter-spacing:-0.05em;line-height:0.9;
     text-transform:lowercase;margin:16px 0}
  h1 em{font-family:'Instrument Serif',serif;font-style:italic;font-weight:400;color:#8B97FF}
  p{font-weight:500;font-size:16px;line-height:1.6;color:#C9C5BA;max-width:62ch}
</style></head>
<body>
  <span class="eyebrow">PIONEER COHORT 01</span>
  <h1>stop learning ai theory. ship <em>ai products</em>.</h1>
  <p>12 weeks, in-person at Technopark. 3 deployed projects. 20 seats.</p>
</body></html>
```

---
*Eduflick AI · a Tomatrix Technologies venture · distilled from Brand Book v4.0 + `colors_and_type.css`.
When in doubt: darker, fewer colors, more mono labels, more negative space, lowercase.*
