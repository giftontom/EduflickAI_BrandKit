# Recipe — slide (16:9) + contact sheet

Load `00_SYSTEM_PROMPT.md` + `../DESIGN_CHEATSHEET.md` + `snippets.md` first. Mirrors the five master
templates in `../slides/` (title · section · content/metrics · quote · closing). Build one slide per
request at 1920×1080; assemble a deck by generating each, then an `<iframe>` contact sheet (like
`../slides/index.html`).

---

```text
FACTS (only source of live numbers; missing → [[NEEDS: …]]):
- Any figures to display (seats, price, weeks, retention, dates): [[ ]]

INPUTS:
- Slide type: [[title | section divider | content/metrics | quote | closing]]
- Theme: [[dark (default) | indigo gradient (title/closing) | paper]]
- Slide number / total: [[03 / 12]]
- Eyebrow / section id: [[e.g. 03 · WHAT YOU BUILD]]
- Headline (lowercase, one *serif* word): [[ ]]
- Body / metrics / quote text: [[ ]]

BUILD RULES per type:
- TITLE: indigo gradient (S11 .hero-indigo), big lowercase headline (96px) w/ one serif word,
  wordmark + paper mark, a mono eyebrow. Lots of space.
- SECTION DIVIDER: dark, oversized mono section id (e.g. "02") + lowercase section name. Minimal.
- CONTENT/METRICS: dark, eyebrow + headline top; a 3- or 5-column grid of stat cards (S8) below.
  Numbers in Manrope 900, labels in mono. Dashed spec rows (S12) for detail.
- QUOTE: paper or dark, large Instrument-Serif italic pull-quote (S6 lead, scaled up) + a mono
  attribution line. One indigo accent.
- CLOSING: indigo gradient, a CTA headline + button (S7) + wordmark/mark + link.
GENERAL: 1920×1080 frame (S14), 120px padding, page number bottom-corner in mono, one hue, faint
texture only. Wrap in S13 (scale ~0.45). Return ONE HTML file per slide.

OUTPUT: one ```html ... ``` block (one slide). For a deck, repeat, then a contact sheet.
```

---

## Contact sheet (to QA a whole deck at once)

After generating slides as `TitleSlide.html`, `ContentSlide.html`, … build:

```html
<div style="background:#07080C;padding:40px;display:flex;flex-direction:column;gap:22px">
  <!-- repeat per slide -->
  <div style="aspect-ratio:16/9;border:1px solid rgba(245,242,234,0.1);border-radius:14px;overflow:hidden">
    <iframe src="TitleSlide.html" style="width:100%;height:100%;border:0" loading="lazy"></iframe>
  </div>
</div>
```

Render it once — visual drift between slides is obvious side-by-side. Re-gen the odd one out.

**✗ Avoid:** clip-art icons, a second hue, Title Case headlines, busy backgrounds, a different font
per slide, the mark resized/recolored differently across slides.
