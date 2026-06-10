# Visual QA checklist — the gate every artifact passes before export

Run it on the **rendered** artifact — you must *look* at it, not just read the code. Parameterized by
the brand profile (`{{…}}` = pull from the profile). Paste to a model with: *"Here is the rendered
result [+ screenshot/HTML]. Score 0–100 against this checklist, list every ✗ with the exact element,
then fix only those."*

Ships at **≥ 85** with **zero hard-fails**.

---

## A. HARD FAILS (any one = do not export, fix now)
- [ ] **One hue only.** Every color is the `--accent` ramp or a neutral (`--paper`/`--ink`/greys).
      Third hue: `{{color.thirdHuePolicy}}`. `--warn`/`--success` only on a real semantic element.
- [ ] **Brand fonts, loaded.** `--font-display` / `--font-serif` / `--font-mono` from tokens; the
      font `<link>` is present; no system/fallback fonts showing.
- [ ] **Logo untouched.** Built per the profile's mark/wordmark; flat; no rotate/skew/distort, no
      recolor to a non-accent hue, no bevel/glow/inner-shadow filter on it; correct fill for the surface.
- [ ] **No invented facts.** Every date/price/seat/link/name typeset into the art is from FACTS;
      gaps are visible `[[NEEDS: …]]`, not guesses.
- [ ] **Imagery stance honored.** `{{imagery.stance}}` — e.g. no stock photos / no text baked into a
      generated image / one hue across the composite.

## B. TYPE & CASING (target ≥ 27 / 30)
- [ ] Headlines `{{type.headlineCase}}`; labels/eyebrows `{{type.labelCase}}` (mono, wide tracking).
- [ ] Accent rule honored: `{{type.accentWord}}`.
- [ ] Display weight `{{type.displayWeight}}`, tight negative tracking, line-height ~0.9.
- [ ] Numbers/meta/ids in `--font-mono`. Wordmark typeset per the profile.
- [ ] Hierarchy reads at a glance (eyebrow → headline → body → meta), not flat.

## C. LAYOUT & SURFACE (target ≥ 27 / 30)
- [ ] Correct default theme (`{{defaultTheme}}`) — not a random light grey.
- [ ] Depth from 1px hairlines + faint shadow / accent glow / a halo **behind** the focal — not
      heavy elevation/bevels.
- [ ] One focal per canvas; generous negative space; an editorial mono section id present.
- [ ] Texture (if any) is faint dot/line grid / grain, low opacity — not loud.
- [ ] Correct **canvas size / true ratio** (IG 1:1/4:5/9:16, slide 16:9, A4 794×1123, OG 1200×630).

## D. BRAND FIT & FINISH (target ≥ 18 / 20)
- [ ] Looks like `{{brand.name}}` (per its aesthetic) — **not a generic template / Canva default**.
- [ ] Semantic color, if used, is a single flag — never decorative.
- [ ] Exports clean at target size (no clipping/overflow; fonts rendered before screenshot;
      assets inline if PDF-bound).
- [ ] Matches sibling assets in a set (carousel/deck cards share rhythm, footer, grid).

---

## Scorecard
```
SCORE: __ / 100
  Hard fails (A):        [none] OR list each with the offending element/color/value
  Type & casing (B):     __ / 30
  Layout & surface (C):  __ / 30
  Brand fit & finish (D):__ / 20
VERDICT:  SHIP  |  FIX   (ship only if ≥ 85 AND zero hard-fails)
FIXES (change only these elements, keep the rest):
  - …
```

## Fast human pass (10 seconds, eyes only)
(1) Any color that isn't the accent or neutral? (2) Headline casing + accent rule right? (3) Logo
clean and flat? (4) Does it feel designed (a sharp spec sheet) or templated? Those four catch ~90%.
