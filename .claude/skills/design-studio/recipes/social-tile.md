# Recipe — social tile (IG post / carousel slide / OG card)

A single feed or carousel canvas. One idea, must read in 2 seconds at thumb size. Export PNG with
`web-to-image`.

```
FACTS (missing → [[NEEDS: …]]):
- The one idea / headline:  [[ ]]
- Proof number (if any):    [[ ]]
- Handle / CTA:             [[ ]]

INPUTS:
- Size:  [[1:1 1080×1080 | 4:5 1080×1350 | 9:16 story | 1.91:1 OG 1200×630]]
- Role:  [[cover | mid-carousel slide | CTA | single post]]
- Eyebrow (label-case + index, e.g. 01 · TOPIC): [[ ]]
- Headline (one accent word): [[ ]]
- Support (≤ 22 words):      [[ ]]

BUILD RULES:
1. Build at true pixels from .canvas--sq / --portrait / --story; mark the root data-export="name".
2. Surface: .cine/.cine-ink + .vignette + .grain. Cover may carry a generated backdrop
   (image-composite); mid-carousel stays clean for legibility.
3. One focal (headline OR stat OR mark) with a .halo behind it. Generous margins; keep the footer
   lockup ≥ ~135px above the bottom so platform crops never cut it.
4. Carousel: every slide shares the same grid, eyebrow rhythm, footer, and a "swipe →" cue. Number
   slides (01 · 07). Consistency across the set is the brand.
5. Footer: small wordmark + mark + handle.
6. Return ONE HTML file; for a carousel, one file with each slide a separate data-export node.

OUTPUT: one ```html … ``` block.
```

**✗ Avoid:** tiny headline, multi-hue, text to the very edge (crop risk), a different layout per
slide, a stat that isn't in FACTS.
