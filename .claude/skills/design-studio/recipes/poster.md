# Recipe — poster (event / announcement / scarcity)

A single high-impact canvas: an announcement, "seats closing," a launch. One dominant headline,
editorial spec rows, one focal. Output one self-contained HTML file at A4 or 4:5; render → QA →
export (PDF via `web-to-pdf`, PNG via `web-to-image`).

```
FACTS (only source of live numbers; missing → [[NEEDS: …]]):
- Headline subject:        [[ ]]
- Date / time / venue:     [[ ]]
- Price / seats / scarcity:[[ ]]
- Link / handle / QR:      [[ ]]

INPUTS:
- Size:  [[A4 portrait 794×1123 | poster 1080×1350]]
- Theme: [[dark (.cine) | accent gradient (.hero) | light (.cine-paper .on-paper)]]
- Eyebrow (label-case):    [[e.g. FREE · LIVE · ~90 MIN]]
- Headline (per profile casing, one accent word): [[ ]]
- Proof / what they get:   [[2–4 short lines or a spec list]]
- CTA:                     [[e.g. register →]]

BUILD RULES:
1. One dominant headline filling the upper third; exactly the profile's accent-word treatment.
2. Editorial layout, not a centered flyer: a mono section id + key facts as dashed spec rows
   (label-case key / value), left-aligned.
3. Surface: .cine + .vignette (or .hero) + faint .grain/.dot-grid. One hue.
4. Scarcity is the ONE place --warn is allowed — at most one element.
5. Footer: wordmark + mark (inline SVG) + link/handle; keep clear space around the mark.
6. A4 print → include @page{size:A4;margin:0}, build at 794×1123, inline every asset for PDF.
   Otherwise wrap the canvas in .preview to view.
7. Return ONE complete HTML file.

OUTPUT: one ```html … ``` block.
```

**✗ Avoid:** centered clip-art flyer, multiple hues, a heavy drop-shadow card, hype, a
date/price not in FACTS, the mark stretched into a corner.
