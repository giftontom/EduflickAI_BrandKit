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

| File | What |
| --- | --- |
| `Tomatrix_Corporate_AI_Training_Brochure.html` | 6-page capability brochure for **Corporate AI Training** — live, custom-built training sold to companies |

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
