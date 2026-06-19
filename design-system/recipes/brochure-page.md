# Recipe — A4 brochure / one-pager page

Load `00_SYSTEM_PROMPT.md` + `../DESIGN_CHEATSHEET.md` + `snippets.md` first. For print-ready
program collateral — a cover, a curriculum spread, an outcomes/pricing page, a one-pager. Output
ONE self-contained A4 HTML page (794×1123px @96dpi), print CSS included, rendered + QA'd, then
exported to PDF or assembled in `../collateral/brochure-kit.html` / `../brochures/`.

---

```text
FACTS (only source of live numbers; missing → [[NEEDS: …]]):
- Program facts to print: [[price ₹49,000 / retail ₹70,000 / 20 seats / 12 weeks / venue /
  payment ₹15K+₹17K+₹17K / cohort start / masterclass date]]
- Contact / link / QR:    [[ ]]

INPUTS:
- Page type: [[cover | curriculum (month 1/2/3) | what-you-build | outcomes/hiring | pricing | one-pager]]
- Theme: [[paper (default for print) | dark spread]]
- Page number / total: [[03 / 10]]
- Eyebrow / headline (lowercase, one *serif* word) / body / list items: [[ ]]

BUILD RULES:
1. Print canvas: `@page{size:A4;margin:0}`, page div 794×1123, ~72px margins. Paper theme by
   default (bg #F5F2EA, ink text) — swap tokens per the snippets header note.
2. Editorial spec-sheet layout: mono section id top (e.g. "03 · CURRICULUM"), a strong lowercase
   headline with one serif word, then content as dashed spec rows (S12), stat cards (S8), or a
   numbered list with mono indices. Generous whitespace; hairline dividers, not boxes-everywhere.
3. Numbers as proof everywhere (weeks, projects, seats, price). Stack as tags/pills (S10).
4. Running footer on every page: wordmark (S3) + page number (mono) + a thin hairline rule.
5. CTA/pricing page: Pioneer ₹49K vs retail ₹70K, payment structure as spec rows; coral (S10) only
   on a single scarcity element if used at all.
6. Cover: can be the dark/indigo spread — big headline, the mark, mono eyebrow, minimal.
7. One hue. Return ONE complete HTML page. For multi-page, repeat and keep the footer identical.

OUTPUT: one ```html ... ``` block.
```

---

## Worked example (abbreviated — curriculum page, paper)
>
> `@page A4`, paper bg, 72px margins. Top mono id `03 · CURRICULUM`. Headline `what you build, *month
> by month*.` Three blocks, each: mono `MONTH 01`, lowercase title, 2–3 dashed spec rows (S12) of
> topics + the deliverable ("→ deploy a SaaS dashboard"). Stack pills (S10): `next.js · claude ·
> pinecone · langchain`. Footer: wordmark + `03 / 10` + hairline. Ink on paper, indigo accents only.

**✗ Avoid:** a second print color, photos, Title Case headings, full-color boxes around everything,
a stat not in FACTS, the mark recolored per page, missing/printing-bleed-unsafe margins.
