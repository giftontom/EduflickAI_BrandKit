# Brochures — finished program deliverables

Self-contained HTML artifacts, each with an in-page **Download PDF** button.
This is the index: what each file is, which is canonical, and how PDFs are made.

## Full-Stack AI Engineer Program (Cohort 01 — the live program)

| File | Edition | Use it for |
| --- | --- | --- |
| `Eduflick_Full_Stack_AI_Engineer_Brochure.html` | **Canonical** full brochure (light/paper) | The default share — prospects, partners, print |
| `Eduflick_Full_Stack_AI_Engineer_Brochure_Dark.html` | Dark Edition | Screen-first sharing, dark-context placements |
| `Eduflick_Full_Stack_AI_Engineer_Brochure_v2.html` | Spec Edition (dark spec-sheet) | Technical audiences — stack/curriculum as a spec sheet |
| `Eduflick_Full_Stack_AI_Engineer_Brochure_v3.html` | Platform Edition | Platform/outcome framing |
| `Eduflick_Full_Stack_AI_Engineer_Enquiry.html` | Enquiry leaflet (dark, short) | Quick response to DMs/walk-in enquiries |
| `Eduflick_Full_Stack_AI_Engineer_Program_Deck.html` | Presentation deck (landscape) | Talks, masterclass, counselling sessions |

## Corporate / B2B

| File | Edition | What |
| --- | --- | --- |
| `Tomatrix_Corporate_AI_Training_Brochure_v2.html` | **Corporate Edition** — Tomatrix's own identity | Deep navy + **Tata blue**, Inter + IBM Plex Mono, sentence case, flat corporate surfaces. The default share for company buyers. |
| `Tomatrix_Corporate_AI_Training_Brochure.html` | Editorial Edition — Eduflick house style | Cream + indigo, Manrope + Instrument Serif, all-lowercase headlines. Consistent with the Full-Stack AI Engineer set. |

Same 6-page content in both; only the visual system differs.

**v2 palette — the institutional register.** Accent is **Tata blue `#486AAE`**
(PMS 7683 C), on a deep navy field `#132A4D` → `#0A1628`. The whole ramp sits at hue
216–220°, anchored on Tata blue's 220°.

This replaced a first attempt that sampled the logo directly — `#019BE1` azure and
`#54C5F8` sky. That palette was *accurate* but wrong in feel: at hue 199° and **99%
saturation** it read energetic and startup-ish. Tata blue is 220° at **41% saturation**,
and that desaturation is what reads as institutional and trustworthy. Keep this in mind
before "correcting" the accent back toward the logo cyan.

**Known tension:** the logo asset is still cyan, so the chevron is the one cool note on
the page. That is deliberate — a logo is never recoloured, and confining cyan to the mark
makes it the single brand signature while every system accent is Tata blue. All
foreground/background pairs pass WCAG AA (lowest is white-on-`#486AAE` at 5.32:1).

v2 deliberately does **not** follow the Eduflick token set — it is a separate corporate
identity, so `design-system/` tokens and the lowercase/serif-accent rules do not apply.

**Co-brand exception:** this is the one artifact where **Tomatrix leads** the cover
lockup and the Eduflick mark is credited as the training & academy arm in the running
footer — the buyer is a company's L&D / engineering leadership, not a student. UXP is
deliberately absent (it is the FAE cohort's venue partner, irrelevant to training
delivered at a client site). Facts live under "Corporate AI training (Tomatrix)" in
[`../content-studio/FACTS.md`](../content-studio/FACTS.md); the contact block is a
stand-in pending Tomatrix-specific details.

## Brand / product

| File | What |
| --- | --- |
| `Eduflick_AI_Brochure.html` | Product/vision brochure (Edition 02) |

## PDFs

**PDFs are not tracked in git** (`*.pdf` is gitignored) — they are regenerable
outputs. Make one by:

1. Opening the HTML and clicking **Download PDF** (html2canvas + jsPDF, fully
   in-browser), or
2. `cd tools && npm run export:pdf` (brochures) / `npm run export:slides`
   (the deck — landscape).

## Editing rules

- **Facts** (dates, prices, seats, links) come from
  [`../content-studio/FACTS.md`](../content-studio/FACTS.md) — never hand-typed
  from memory. Run `npm run check:facts` after edits.
- **Assets must stay inline** (data-URI images, no `file://` refs, no
  SVG-filter backgrounds) or html2canvas taints the canvas and the Download
  PDF button silently fails. See `tools/_inject-dark-bg.mjs` for the pattern.
- Old/superseded drafts go to [`../_archive/`](../_archive/), not here.
