# web-to-pdf — reference & gotchas

## How it works (the pipeline)
For each `.sheet`: clone it into a hidden offscreen container fixed to the page width → inline any
`<use>` icons and strip SVG filters → `html2canvas` rasterizes the clone to a `<canvas>` → convert
to JPEG → add as a jsPDF page sized to the canvas's aspect ratio. Repeat; `pdf.save()`.

Cloning offscreen (rather than shooting the live node) means the visible page keeps its
shadows/margins while the export gets a clean, margin-free, shadow-free copy.

## The tainting rule — the #1 cause of "Download PDF does nothing"
`html2canvas` draws onto a `<canvas>`. The moment that canvas contains pixels the browser considers
cross-origin or non-readable, it becomes **tainted** and `toDataURL()` throws — the export fails.

Things that taint:
- `<img src="file://…">` or `src="https://other-domain/…">` without CORS.
- `background-image: url(file://…)` or a remote image.
- An **SVG `<filter>` used as a background** (e.g. a `feTurbulence` grain applied via a filtered
  `<rect>` that's referenced as a CSS background).

**The fix:** every raster asset must be an **inline base64 data URI**:
```html
<img src="data:image/png;base64,iVBORw0KGgo…">
<div style="background-image:url(data:image/png;base64,…)"></div>
```
For texture, use the inline `data:image/svg+xml` grain from `design-effects` (`--grain`) — it's a
data URI, so it's safe; it is *not* a filter-background, so it renders.

If you truly need an external/large image and can't inline it, render that page through the
`web-to-image` skill (Playwright shoots the real browser and never taints), and embed that PNG.

## SVG specifics
- **`<use>` references** aren't followed by html2canvas. The engine inlines them by cloning the
  referenced `<symbol>` and resolving `currentColor`/`fill`/`var()`. If your icons go missing, this
  is why — confirm the sprite `<symbol id>` exists in the DOM.
- **CSS `filter` on SVGs** renders blank. The engine forces `filter:none` on every SVG in the clone.
  So a glow done as `filter:drop-shadow(...)` on a mark will **not** appear in the PDF — bake glows
  as a halo behind the element (a real gradient div) instead. (See `design-effects` `.halo`.)

## Fonts
Call happens after `document.fonts.ready`. Still, load fonts in `<head>` (Google Fonts `<link>` or
`@font-face`) and give them a beat. If a heading exports in a fallback face, the font wasn't ready.

## Sizing & quality
- A4 @96dpi = **794×1123px**. Letter = ~816×1056px. Set `pageWidthPx`/`pageHeightPx` to match.
- `scale: 2` doubles raster resolution (crisper text/lines) at the cost of memory; the engine falls
  back to `scale: 1` automatically if a page fails. For very dense pages, start at `scale: 2` and
  let the fallback handle the heavy ones.
- Output is JPEG `0.92` — small files, no visible artifacts for typographic pages. For pages with
  hard flat-color edges and no photos, you can pass `quality: 1` or switch to PNG in the source.

## `backdrop-filter` / glass
`html2canvas` doesn't implement `backdrop-filter`, so true frosted glass won't blur in the PDF. Use
a solid translucent fill for PDF-bound cards (the `design-effects` `.glass` still gives a usable
translucent panel; just don't rely on the blur).

## Verifying
Open `templates/starter.html` in a real browser (not the file preview), click **Download PDF**:
- 2-page A4 PDF, text crisp, footer present, no console error.
- Add an inline-data-URI background to a sheet → still exports. Swap it for a `file://` image →
  observe the failure. That contrast is the whole rule.

## Provenance
Generalized from `brochures/Eduflick_Full_Stack_AI_Engineer_Brochure.html` (the `downloadPdfBtn`
handler + `resolveVar`/`resolveUseElements`). Brand specifics (filename, the `#F5F2EA` background)
became options; the mechanism is unchanged and battle-tested on real multi-page brochures.
