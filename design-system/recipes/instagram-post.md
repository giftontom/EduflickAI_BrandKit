# Recipe — Instagram canvas (feed / portrait / story / carousel slide)

Load `00_SYSTEM_PROMPT.md` + `../DESIGN_CHEATSHEET.md` + `snippets.md` first. Then paste the box
below. Output is ONE self-contained HTML file: a true-ratio canvas wrapped in the scale-to-fit
preview (S13). Render it, QA it, then recreate/export in `../collateral/instagram-kit.html`.

---

```text
FACTS (only source of live numbers — never typeset an invented value; missing → [[NEEDS: …]]):
- Masterclass date / cohort start / seats left: [[ ]]
- Price / retail / venue:                        [[₹49,000 / ₹70,000 / Trivandrum]]
- Handle / link in bio:                          [[ ]]

INPUTS:
- Format: [[square 1080×1080 | portrait 1080×1350 | story 1080×1920]]
- Theme:  [[dark | paper | indigo gradient]]
- Eyebrow (UPPERCASE mono): [[e.g. PIONEER COHORT 01]]
- Headline (lowercase, mark ONE word with *asterisks* for the serif accent): [[e.g. ship *ai products*, not theory]]
- Proof line (a number): [[e.g. 3 deployed projects · 12 weeks · 20 seats]]
- CTA or scarcity flag: [[e.g. "register free →" | "7 of 20 seats left"]]
- Footer: wordmark + mark.

BUILD RULES:
1. Use snippets verbatim: frame S14 → background S11 (faint) → eyebrow S4 → headline S5 (turn the
   *asterisk* word into the Instrument-Serif <em>) → proof S6 → CTA S7 or scarcity S10 → footer S3+S2.
2. Wrap the canvas in the S13 scale-to-fit preview (scale 0.5 for square/portrait, 0.4 for story).
3. One hue only. Big type — headline ≥ 72px on a 1080 canvas. Generous padding (96px).
4. If "indigo gradient" theme: use `.hero-indigo`, paper-fill the mark (S2), paper text.
5. Coral only if the CTA is a scarcity flag. Never elsewhere.
6. Return ONE complete HTML file. Nothing else.

OUTPUT: one ```html ... ``` block.
```

---

## Worked example (what good looks like — abbreviated)
>
> Square, dark theme. Eyebrow `PIONEER COHORT 01`. Headline `ship *ai products*, not theory.`
> Proof `3 deployed projects · 12 weeks · 20 seats`. CTA `register free →`. Footer wordmark + mark.
> → 1080² frame (S14) with faint dot grid (S11), 96px padding, content space-between: eyebrow top,
> 76px lowercase headline with `ai products` in serif indigo mid, mono proof + pill CTA, wordmark
> bottom-left and the paper-fill mark bottom-right. One hue. Wrapped in S13 at scale 0.5.

**Carousel:** run this once per slide (slide 1 = cover hook + "swipe →"; last = CTA), keep the same
eyebrow system and theme, then build a contact-sheet HTML that iframes all slides to check rhythm.

**✗ Avoid:** a second hue on the badge, Title Case headline, a drop-shadowed/rotated mark, an
emoji, a stat the FACTS block didn't give, headline too small to read in-feed.
