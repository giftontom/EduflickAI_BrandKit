# Visual QA checklist — the gate every artifact passes before export

The visual twin of `../content-studio/QA_CHECKLIST.md`. Run it on any **rendered** artifact (you
must *look* at it, not just read the code). Paste it to a model with: *"Here is the rendered result
[+ screenshot/HTML]. Score 0–100 against this checklist, list every ✗ with the exact element, then
fix only those."*

Ships at **≥ 85** with **zero hard-fails**.

---

## A. HARD FAILS (any one = do not export, fix now)
- [ ] **One hue only.** Every color is indigo (`#5B5BF0`/`#8B97FF`/ramp) or neutral
      (paper `#F5F2EA` / ink `#0A0B10` / greys). **No third hue.** Coral `#FF6E5A` only on a real
      CTA/scarcity element; green `#4ADE80` only as success. Nothing else.
- [ ] **The 3 fonts, loaded.** Manrope (structure), Instrument Serif (italic accents), JetBrains
      Mono (labels/numbers). The Google Fonts `<link>` is present. No system/fallback fonts showing.
- [ ] **The mark is untouched.** Exact `<path>`, flat, no rotation/skew/scale-distortion, no
      recolor to a third hue, no bevel/glow/inner-shadow. Correct fill for its surface.
- [ ] **No invented facts.** Every date/price/seat/link typeset into the art is from FACTS; gaps
      are visible `[[NEEDS: …]]`, not guesses.
- [ ] **No emoji as iconography.** No stock photos.

## B. TYPE & CASING (target ≥ 27 / 30)
- [ ] **Display/headlines are lowercase.** **Mono labels/eyebrows are UPPERCASE** (tracking ~0.22em).
- [ ] **Exactly one (max two) serif-italic accent word** in the headline, tinted `#8B97FF`.
- [ ] Display weight 800–900, **tight negative tracking** (−0.03 to −0.05em), line-height ~0.9.
- [ ] Numbers, meta, ids are in **JetBrains Mono**. Wordmark = `eduflick` + indigo `AI`.
- [ ] Type hierarchy reads at a glance (eyebrow → headline → body → meta), not flat.

## C. LAYOUT & SURFACE (target ≥ 27 / 30)
- [ ] **Dark by default** (or paper for docs/print) — not a random light grey.
- [ ] Depth from **1px hairline borders + faint shadow / brand glow**, not heavy elevation/bevels.
- [ ] Card radii 14–18px (hero 22–28); **mark stays ~3px**; pills 999px.
- [ ] **Generous negative space**; an editorial **mono section id** present (e.g. `00 · cohort`).
- [ ] Texture (if any) is **faint** dot/line grid over indigo, low opacity — not loud.
- [ ] Correct **canvas size / true ratio** for the artifact (IG 1:1/4:5/9:16, slide 16:9, A4…).

## D. BRAND FIT & FINISH (target ≥ 18 / 20)
- [ ] Looks like Eduflick (precise, editorial, engineer's), **not a generic template / Canva default**.
- [ ] Coral, if used, is a single semantic flag — never decorative.
- [ ] Imagery replaced by mark / data / editorial type (no photos).
- [ ] Exports clean at target size (no clipping, no overflow, fonts rendered before screenshot).
- [ ] Matches its sibling assets in a set (carousel/deck cards share rhythm).

---

## Scorecard (for the model to fill)
```
SCORE: __ / 100
  Hard fails (A):        [none] OR list each with the offending element/color/value
  Type & casing (B):     __ / 30
  Layout & surface (C):  __ / 30
  Brand fit & finish (D):__ / 20
VERDICT:  SHIP  |  FIX   (ship only if ≥85 AND zero hard-fails)
FIXES (change only these elements, keep the rest):
  - ...
```

## Fast human pass (10 seconds, eyes only)
Glance at the render and ask: (1) Do I see any color that isn't indigo or neutral? (2) Is the big
headline lowercase with one italic word? (3) Is the mark clean and flat? (4) Does it feel like a
sharp spec sheet, or like a template? Those four catch ~90% of misses.
