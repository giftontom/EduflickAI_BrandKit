# Recipe — slide deck (16:9 presentation / pitch)

A set of 16:9 slides sharing one system: title, section, content, quote, closing. Export PNG per
slide (`web-to-image`) or a PDF of all slides (`web-to-pdf`).

```text
FACTS (missing → [[NEEDS: …]]):
- Deck title / subject:   [[ ]]
- Key numbers / claims:   [[ ]]
- Closing CTA / contact:  [[ ]]

INPUTS:
- Slides (type + text), e.g.:
  - TITLE:    eyebrow / headline (one accent word) / sub
  - SECTION:  section id + section name
  - CONTENT:  headline + 3–5 points OR a stat row OR a chart placeholder
  - QUOTE:    serif pull-quote + attribution
  - CLOSING:  CTA + wordmark + contact
- Theme: [[dark .cine-ink | accent .cine]]

BUILD RULES:
1. Each slide is .canvas--slide (1920×1080), data-export="slide-NN"; build at true pixels.
2. Shared chrome on every slide: eyebrow top-left, slide index top-right (NN · TT), footer lockup
   bottom — same positions throughout. That repetition is the deck's coherence.
3. Surface: .cine-ink + .vignette + faint .grain. Content sits in .content; use .glass cards for
   grouped points over the gradient.
4. One idea per slide; one focal with a .halo behind it. Big type; ≤ ~22 words of support.
5. Section dividers use a large mono section id + one serif word — minimal.
6. Return ONE HTML file with each slide a separate data-export node (so both exporters can page it).

OUTPUT: one ```html … ``` block.
```

**✗ Avoid:** bullet walls, a different layout/footer per slide, more than one focal, decorative
second hue, low-contrast text on the gradient (add .vignette / a .glass panel).
