# Brochures — finished program deliverables

Self-contained HTML artifacts, each with an in-page **Download PDF** button.
This is the index: what each file is, which is canonical, and how PDFs are made.

## Full-Stack AI Engineer Program (Pioneer Cohort 01 — the live program)

| File | Edition | Use it for |
| --- | --- | --- |
| `Eduflick_Full_Stack_AI_Engineer_Brochure.html` | **Canonical** full brochure (light/paper) | The default share — prospects, partners, print |
| `Eduflick_Full_Stack_AI_Engineer_Brochure_Dark.html` | Dark Edition | Screen-first sharing, dark-context placements |
| `Eduflick_Full_Stack_AI_Engineer_Brochure_v2.html` | Spec Edition (dark spec-sheet) | Technical audiences — stack/curriculum as a spec sheet |
| `Eduflick_Full_Stack_AI_Engineer_Brochure_v3.html` | Platform Edition | Platform/outcome framing |
| `Eduflick_Full_Stack_AI_Engineer_Enquiry.html` | Enquiry leaflet (dark, short) | Quick response to DMs/walk-in enquiries |
| `Eduflick_Full_Stack_AI_Engineer_Program_Deck.html` | Presentation deck (landscape) | Talks, masterclass, counselling sessions |

## Leadership Program (Cohort 02)

| File | What |
| --- | --- |
| `Eduflick_AI_Leadership_Program_Brochure.html` | Prospectus edition |
| `Eduflick_AI_Leadership_Program_Brochure_v2.html` | Brochure edition (later revision) |
| `Eduflick_AI_Leadership_Program_Poster.html` | A4 poster |

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
