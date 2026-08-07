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
| `Tomatrix_Corporate_AI_Training_Brochure_v2.html` | **Corporate Edition** — Tomatrix's own identity | Royal blue + **aqua accent**, Inter + IBM Plex Mono, sentence case, flat corporate surfaces. The default share for company buyers. |
| `Tomatrix_Corporate_AI_Training_Brochure.html` | Editorial Edition — Eduflick house style | Cream + indigo, Manrope + Instrument Serif, all-lowercase headlines. Consistent with the Full-Stack AI Engineer set. |

Same 6-page content in both; only the visual system differs.

**v2 palette — sampled from a client-supplied reference brochure**, not chosen by eye:

| Token | Hex | Role |
| --- | --- | --- |
| royal blue | `#2E4096` | field + big section numerals (hue 230 / S 53%) |
| azure | `#336EB2` | the lighter end of the cover gradient (hue 212) |
| aqua-mint | `#8ACCD8` | accent — hairlines, timeline nodes, on-dark highlights, CTA |
| white | `#FFFFFF` | paper, with `#F4F6FA` panels |

**No gold or brass** — an antique-brass accent was tried and rejected by the client; the
aqua replaced it. Do not reintroduce a warm metallic.

Two earlier palettes were also replaced, both for *feel* rather than accuracy — worth
knowing before "correcting" this back:

- `#019BE1` azure sampled from the logo. Accurate, but hue 199 at **99% saturation** read
  energetic and startup-ish.
- `#486AAE` Tata blue (PMS 7683 C). Institutional, but flatter and less premium than the
  reference, which is more saturated and more violet.

The CTA is aqua with dark text on purpose: as `blue-500` it sat at **1.36:1 against the
blue field** — legible text, but invisible as a button. It is now 5.11:1.

**Known tension:** the logo is cyan `#54C5F8` (hue 199). It sits between the royal blue
and the aqua accent, so the lockup reads better here than it did against brass. A logo is
never recoloured.

**Each inner page has its own structure, deliberately.** A repeated "three cards + two
columns" skeleton on every page reads cheap, so: `02` contrast device (their way vs
ours) · `03` hairline role register · `04` horizontal process timeline · `05` comparison
matrix.

All foreground/background pairs pass WCAG AA — lowest is `blue-300` on the `blue-800`
field at 4.53:1.

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
