# Recipe — brochure page (A4 document page)

One page of a multi-page document (prospectus, one-pager, report). Built for **PDF download via
`web-to-pdf`**, so the export-safety rules are mandatory.

```text
FACTS (missing → [[NEEDS: …]]):
- Page subject / section:  [[ ]]
- Specs / numbers / dates: [[ ]]
- Footer meta (page n/N, contact): [[ ]]

INPUTS:
- Page role: [[cover | content | spec table | pricing | closing/CTA]]
- Theme: [[light (default for docs) | dark]]
- Eyebrow / section id:    [[ ]]
- Headline (one accent word):[[ ]]
- Body + spec rows / table:[[ ]]

BUILD RULES:
1. .sheet at exactly 794×1123 (A4 @96dpi). Each page is one .sheet; the document is many.
2. Generous margins (~72px). Editorial: mono eyebrow, dashed spec rows, a hairline footer with
   page n/N. One focal per page.
3. Surface: usually light (.cine-paper .on-paper) for readability; dark only for a cover.
4. EXPORT-SAFETY (web-to-pdf — non-negotiable):
   - Every image/background is an INLINE base64 data URI. No file:// or remote images (they taint).
   - No SVG-filter backgrounds; use the inline .grain data URI instead.
   - Glows must be a real .halo div behind the element, NOT filter:drop-shadow (stripped in PDF).
   - Load the font <link>; let fonts settle before export.
5. Wire the download button with PdfExport.attachButton (see web-to-pdf starter).
6. Return ONE HTML file (all .sheet pages + the download button + the PDF scripts).

OUTPUT: one ```html … ``` block.
```

**✗ Avoid:** remote/file images (PDF will fail), filter-based glows (vanish in PDF), variable page
heights when you need exact A4, a number not in FACTS.
