# Recipe — poster (event / scarcity / announcement)

Load `00_SYSTEM_PROMPT.md` + `../DESIGN_CHEATSHEET.md` + `snippets.md` first. A poster is a single
high-impact canvas — masterclass announcement, "seats closing," sold-out, cohort launch. Output one
self-contained HTML file at A4 or 4:5, rendered + QA'd, then exported to PDF/PNG (or via the
Brochure Kit).

---

```
FACTS (only source of live numbers; missing → [[NEEDS: …]]):
- Event / headline subject:     [[e.g. Free Technical Masterclass]]
- Date / time / venue:          [[ ]]
- Price / retail / seats left:  [[₹49,000 / ₹70,000 / __ of 20]]
- Registration link / QR / handle: [[ ]]

INPUTS:
- Size: [[A4 portrait 794×1123 | IG-poster 1080×1350]]
- Theme: [[dark | indigo gradient | paper]]
- Eyebrow: [[UPPERCASE mono, e.g. FREE · LIVE · ~90 MIN]]
- Headline (lowercase, one *serif* word): [[e.g. build an *ai app*, live]]
- Supporting proof / what they get: [[2–4 short lines or a spec list]]
- CTA: [[register free → / book your seat →]]

BUILD RULES:
1. One dominant headline (very large — fills the upper third). One serif accent word only.
2. Use the editorial spec-sheet look: a mono section id (S4 rule), and the key facts as dashed
   spec rows (S12) — date / venue / price / seats. This IS the layout language; don't center
   everything like a flyer.
3. Background: faint dot or line grid (S11) over dark/indigo; paper theme for a printed/formal feel.
4. Scarcity (seats left) is the ONE place coral (S10) is allowed — use it on at most one element.
5. Footer: wordmark (S3) + mark (S2) + the link/handle. Leave a clear quiet zone around the mark.
6. For A4 print: include `@page{size:A4;margin:0}` and build at 794×1123; otherwise wrap in S13.
7. Return ONE complete HTML file.

OUTPUT: one ```html ... ``` block.
```

---

## Worked example (abbreviated — masterclass announcement, dark)
> Eyebrow `FREE · LIVE · ~90 MIN`. Headline (72–96px) `build an *ai app*, live.` Then a left-aligned
> stack: serif lead "the doom-scroll antidote, applied." → dashed spec rows (S12): `WHEN / [[date]]`,
> `WHERE / [[venue]]`, `BRING / a laptop`, `COST / free`. Coral scarcity flag only if seats are the
> hook. CTA pill `register free →`. Footer wordmark + paper mark + `[[handle]]`. Faint dot grid. One hue.

**✗ Avoid:** centered flyer layout with clip-art, multiple colors, a big drop-shadow card, hype
("HURRY!! LIMITED!!"), a price/date not in FACTS, the mark stretched to fill a corner.
