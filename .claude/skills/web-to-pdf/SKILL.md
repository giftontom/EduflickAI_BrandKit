---
name: web-to-pdf
description: Add a client-side "Download PDF" button to any HTML document — turns multi-page browser-rendered HTML into a downloadable, multi-page PDF using html2canvas + jsPDF, entirely in the browser (no server, no print dialog). Use for brochures, prospectuses, one-pagers, reports, certificates, invoices, or any designed document a user should be able to download as PDF. Brand-neutral and drop-in; includes the hard-won gotchas (asset tainting, SVG filters, web fonts, A4 sizing).
user-invocable: true
---

# web-to-pdf — browser HTML → downloadable PDF, no server

Drop `assets/pdf-export.js` into any page, mark each page-sized element with class `.sheet`, wire a
button, and users can download the whole document as a crisp multi-page PDF — client-side, offline
after load, no print dialog. This is the proven engine from a production brochure exporter, made
brand-neutral and configurable.

## Quick start

1. Load the two UMD libraries, then this skill's script:

   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
   <script src="assets/pdf-export.js"></script>
   ```

2. Structure the document as page-sized sheets (A4 = `794×1123px`); see `templates/print-sheet.css`.
3. Wire a button:

   ```html
   <button id="downloadPdfBtn">Download PDF</button>
   <script>
     PdfExport.attachButton('#downloadPdfBtn', { sheetSelector: '.sheet', filename: 'my-doc.pdf' });
   </script>
   ```

`templates/starter.html` is a complete working 2-page document — open it and click Download PDF.

## API (`PdfExport`)

- **`attachButton(target, opts)`** — wires a click handler with disabled + "Page n of N…" progress.
- **`download(opts)`** — generate + save directly. Returns a promise. Options:

| Option | Default | Meaning |
| --- | --- | --- |
| `sheetSelector` | `.sheet` | one matched element → one PDF page |
| `filename` | `document.pdf` | saved filename |
| `pageWidthPx` / `pageHeightPx` | `794` / `1123` | A4 @96dpi; change for other sizes |
| `pageWidthMm` | `210` | physical page width (A4); height derived from canvas ratio |
| `scale` | `2` | render scale (auto-retries at 1 on memory pressure) |
| `quality` | `0.92` | JPEG quality of the rasterized page |
| `background` | `--paper` var → white | page background color |
| `onProgress(n,total)` | — | progress callback |

## What the engine handles for you

- **Multi-page** — clones each sheet offscreen, rasterizes, appends a jsPDF page sized to it.
- **`<use>` icons** — inlines `<use href="#sym">` from sprite symbols and resolves `currentColor` /
  `fill` (html2canvas can't follow `<use>` references).
- **SVG filters** — strips CSS `filter` on SVGs (html2canvas paints filtered SVGs blank).
- **CSS vars** — resolves `var(--x)` fills against computed styles.
- **Fonts** — waits for `document.fonts.ready` before shooting.
- **Resilience** — retries a failed page at lower scale; restores the button on error.

## The non-negotiable gotchas (read `reference.md`)

1. **Inline every asset as a base64 data URI.** A single `file://` image, cross-origin image, or
   SVG-*filter* background **taints the canvas** and the download fails silently/with an error.
2. **No SVG-filter backgrounds.** Use the inline grain data URI from `design-effects` instead.
3. **Load web fonts** (and let them settle) before exporting, or text falls back.
4. **Build sheets at true A4 pixels** (`794×1123`) so pages map predictably to paper.

## When to use a different tool

- Need **pixel-perfect raster** (PNG for social, true clip-paths/`backdrop-filter`)? → `web-to-image`
  (Playwright). html2canvas is a re-implementation of CSS and misses some effects.
- Document is **mostly long-flowing text**? Native `window.print()` + `@page` may paginate better;
  this engine is best for **fixed, designed pages**.

Pairs with: `design-tokens` (theme the sheets), `design-effects` (cinematic surfaces — mind the
export-safe subset), `image-composite` (inline-data-URI backdrops).
