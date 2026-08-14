# Brochures — finished program deliverables

Self-contained HTML artifacts, each with an in-page **Download PDF** button.
This is the index: what each file is, who it goes to, and whether it shows money.

Files are grouped by what they sell:

| Folder | Holds |
| --- | --- |
| [`fae-offline/`](fae-offline/) | Full-Stack AI Engineer — the in-person Trivandrum cohort (₹49,000) |
| [`fae-online/`](fae-online/) | Full-Stack AI Engineer — the 100% online cohort (₹35,000) |
| [`payment/`](payment/) | Close-stage payment docs, sent 1:1 after the interview |
| [`company/`](company/) | Company-level and academic decks — not program marketing |

## fae-offline — in-person cohort (₹49,000 · 20 seats · UXP Innovation Hub)

| File | Edition | Use it for | Shows price |
| --- | --- | --- | --- |
| `Eduflick_Full_Stack_AI_Engineer_Brochure.html` | **Canonical** full brochure (light/paper) | The default share — prospects, partners, print | yes + pay QR |
| `Eduflick_Full_Stack_AI_Engineer_Enquiry.html` | Enquiry leaflet (dark, 4pp) | Quick reply to DMs and walk-in enquiries | yes + pay QR |
| `Eduflick_Full_Stack_AI_Engineer_Curriculum.html` | Curriculum edition (light, 10pp) | **After the interview**, when the offer is personalised | **no** |
| `Eduflick_Full_Stack_AI_Engineer_Brochure_Dark.html` | Dark edition | Screen-first sharing, dark-context placements | yes |
| `Eduflick_Full_Stack_AI_Engineer_Brochure_v2.html` | Spec edition (dark spec-sheet) | Technical audiences — stack/curriculum as a spec sheet | yes |
| `Eduflick_Full_Stack_AI_Engineer_Brochure_v3.html` | Platform edition | Platform/outcome framing | yes |
| `Eduflick_Full_Stack_AI_Engineer_Program_Deck.html` | Presentation deck (landscape) | Talks and counselling sessions | yes |

## fae-online — online cohort (₹35,000 · 30 seats · India & global)

| File | Edition | Use it for | Shows price |
| --- | --- | --- | --- |
| `Eduflick_FAE_Online_Registration.html` | Registration & payment (3pp) | The doc you WhatsApp to collect a booking | yes + pay QR |
| `Eduflick_Full_Stack_AI_Engineer_Brochure_Online.html` | Full brochure (10pp) | The default online-cohort share | yes |
| `Eduflick_Full_Stack_AI_Engineer_Brochure_Online_4pg.html` | Leaflet (4pp) | Short-form share | yes |

## payment — close stage (sent 1:1, never published)

| File | Use it for | Shows price |
| --- | --- | --- |
| `Eduflick_FAE_Payment_Details.html` | Collecting a booking when the total was agreed personally | **no amounts at all** |

Pair it with `fae-offline/…_Curriculum.html`: the curriculum doc carries the
program, this one carries the account — neither states a figure, because
post-interview offers are personalised (see FACTS → *Registration & payment
collection*).

## company — not program marketing

| File | What |
| --- | --- |
| `Eduflick_AI_Brochure.html` | Product/vision brochure (Edition 02) |
| `Eduflick_AI_Project_Presentation.html` | St Thomas Institute final-year CSE project review deck |
| `Eduflick_AI_Zeroth_Review.pptx` | Zeroth-review slides for the same academic project |

## Payment QR

The brochures that collect money embed the **static HDFC merchant QR** for
Tomatrix Technologies. It is amount-less by design — the payer types the amount.
The exact EMV payload and account fields live in
[`../content-studio/FACTS.md`](../content-studio/FACTS.md) → *Registration &
payment collection*. Reuse that payload verbatim; do not re-derive it, and after
any change re-verify by machine-decoding the QR out of the exported PDF (an
eyeball check does not prove a QR still scans).

## PDFs

**PDFs are not tracked in git** (`*.pdf` is gitignored) — they are regenerable
outputs. Make one by:

1. Opening the HTML and clicking **Download PDF** (html2canvas + jsPDF, fully
   in-browser), or
2. `cd tools && npm run export:pdf -- <subdir>/<file>.html` (brochures) /
   `npm run export:slides` (the deck — landscape).

Export gotchas, learned the hard way:

- Export as **JPEG at scale 3** (0.95 light pages / 0.97 dark). PNG cannot
  compress the film-grain layer — the Enquiry brochure once exported at 122 MB,
  past WhatsApp's 100 MB document limit.
- The export script must run `resolveUseElements` before rasterising, or every
  `<use href="#b-mark">` logo mark comes out **blank**.

## Editing rules

- **Facts** (dates, prices, seats, links, account details) come from
  [`../content-studio/FACTS.md`](../content-studio/FACTS.md) — never hand-typed
  from memory. Run `npm run check:facts` after edits.
- **Assets must stay inline** (data-URI images, no `file://` refs, no
  SVG-filter backgrounds) or html2canvas taints the canvas and the Download
  PDF button silently fails. See `tools/_inject-dark-bg.mjs` for the pattern.
- Old/superseded drafts go to [`../_archive/`](../_archive/), not here.
- Anything you create here must be **committed**. Untracked files are invisible
  from git worktrees, which is how a whole online-cohort brochure set went
  missing once.
