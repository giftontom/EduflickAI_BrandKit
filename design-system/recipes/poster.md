# Recipe — poster (event / scarcity / announcement)

Load `00_SYSTEM_PROMPT.md` + `../DESIGN_CHEATSHEET.md` + `snippets.md` first. A poster is a single
high-impact canvas — masterclass announcement, "seats closing," sold-out, cohort launch. Output one
self-contained HTML file at A4 or 4:5, rendered + QA'd, then exported to PDF/PNG (or via the
Brochure Kit).

---

```text
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
>
> Eyebrow `FREE · LIVE · ~90 MIN`. Headline (72–96px) `build an *ai app*, live.` Then a left-aligned
> stack: serif lead "the doom-scroll antidote, applied." → dashed spec rows (S12): `WHEN / [[date]]`,
> `WHERE / [[venue]]`, `BRING / a laptop`, `COST / free`. Coral scarcity flag only if seats are the
> hook. CTA pill `register free →`. Footer wordmark + paper mark + `[[handle]]`. Faint dot grid. One hue.

**✗ Avoid:** centered flyer layout with clip-art, multiple colors, a big drop-shadow card, hype
("HURRY!! LIMITED!!"), a price/date not in FACTS, the mark stretched to fill a corner.

---

## Poster System v2 — 6 archetypes × 2 registers

Distilled from a teardown of 5 peer ed-tech ads (entri ×2, IIT-Delhi Abu Dhabi, skill.mount, SOF):
each poster fuses **text + colour + one hero device + proof + a course-detail infographic + one CTA**.
The living set is `../collateral/posters.html` (6 `[data-export]` sections, exported by
`../../tools/export-posters.mjs`). Two **registers** keep one brand with two energies:

- **premium** — restraint + negative space (SOF/IIT): cinematic photo (`S20`) or `S17` cine surface,
  big `S5` headline, `S23` feature-points. For hero / explainer / outcome.
- **playful** — scale + brighter indigo gradient + the **`S24` mark-burst** or an **`S21` mockup**,
  bigger type. For product-mockup / scarcity / masterclass. **No mascot, no new hue, no coral except scarcity.**

| # | Archetype | Register | Hero device (snippet) | data-export |
| --- | --- | --- | --- | --- |
| 1 | hero / cinematic | premium | duotone photo (`S20`) + accent headline | `poster-program` |
| 2 | product mockup | playful | browser/app window (`S21`) of a real project | `poster-build` |
| 3 | explainer / infographic | premium | icon feature-points (`S23`) | `poster-why` |
| 4 | outcome / proof | premium | achievement badge (`S22`) — **real facts only** | `poster-proof` |
| 5 | scarcity / CTA | premium | number-hero + coral flag (`S10`) | `poster-seats` |
| 6 | masterclass hook | playful | keyboard-glow photo / `S24` burst | `poster-masterclass` |

**The 7 fusion rules (every poster obeys):**

1. **One hero device** — mockup *or* photo *or* illustration *or* number; never stacked.
2. **Headline = a hook + one emphasis** (one `S5` serif/indigo accent word).
3. **Proof furniture** — badge / stat / guarantee — **only facts in `FACTS.md`**.
4. **A course-detail infographic** — `S12` dashed rows or `S23` feature-points.
5. **One CTA**; **one hue** (indigo + neutral); coral only for scarcity.
6. **Depth in 3 layers** — field (`S17`/`S20`) · mid (`S15` halo / `S16` grain) · foreground type/mark.
7. **Register dial** — premium = restraint; playful = scale + gradient + `S24` burst.

**Integrity:** Pioneer Cohort 01 hasn't run — **no fabricated alumni/placements.** The `S22`
testimonial ships as a template with `[[STUDENT NAME]]` / `[[QUOTE]]` placeholders; fill only with a
real cohort member. Until then, "proof" = the real deliverables (3 deployed projects, week-12 recruiter
networking).

**Image backdrops (every poster):** all 7 posters now sit on a real, text-free image (depth rule #6,
field layer) — not a flat colour. The `.img-layer` / `.scrim` / `.stack` z-stack keeps type crisp on
top; tune each backdrop so the hero glow lands behind the headline and the band under spec rows /
feature-points stays dark. Generate with `cd tools && npm run gen:backdrops` — it tries the Gemini
image-model **cascade** and, on a free-tier `429 / limit: 0`, auto-falls-back to the procedural
generator (`tools/_backdrop-art.mjs`), so a backdrop always lands. Mode A (abstract indigo) = `seats`,
`build`, `why`, `proof`, `enquiry`; Mode B (treated photo, `fetch:stock` → `treat:stock`) = `program`,
`masterclass`. Full method + the prompt kit: `../AI_IMAGERY_GUIDE.md` and the `poster-design` skill.

**Out of scope (next):** 1080×1920 story versions with native poll/quiz stickers (the engagement
device in 3 of the references).
