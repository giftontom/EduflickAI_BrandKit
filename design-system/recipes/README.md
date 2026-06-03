# Recipes — assemble on-brand visuals from snippets

The visual twin of `../../content-studio/prompts/`. Where those produce *copy*, these produce
**HTML artifacts** you can render and export: Instagram canvases, posters, slides, brochure pages,
web sections. They're built so a **small model** can run them by **assembling pre-approved
snippets** rather than inventing design.

## How to use
1. **Once per session:** paste `00_SYSTEM_PROMPT.md` as the **system message** (it embeds the
   design cheat sheet + the assemble-don't-invent rules) and append `snippets.md` (the parts bin).
2. **Per artifact:** paste the matching recipe below as the first user message — fill its FACTS
   block and the text/canvas inputs.
3. **RENDER it** — open the HTML / screenshot it. Visuals must be *seen*, not assumed.
4. **QA:** run `../QA_CHECKLIST.md` against the render; request targeted fixes.
5. **Export:** drop into the matching `../collateral/` kit, **or run `../../tools`
   (`npm run export`) for pixel-perfect PNGs**, or print to PDF.

Read `../SMALL_MODELS_GUIDE.md` for why each step matters, and `../DESIGN_CHEATSHEET.md` for the rules.

## Files
> **`snippets.md` is generated — do not hand-edit it.** Its inline brand values
> (hex, the mark path, the fonts link) come from `design-system/tokens/tokens.json`.
> Edit `snippets.src.md` (which uses `{{token}}` placeholders), then run
> `cd tools && npm run snippets` to regenerate `snippets.md`. This keeps the
> paste-alone blocks self-contained *and* drift-free.

| File | Produces | Canvas | Export via |
| --- | --- | --- | --- |
| `00_SYSTEM_PROMPT.md` | (loads the design system into the model) | — | — |
| `snippets.src.md` | **source** for the parts bin (`{{token}}` placeholders) | — | — |
| `snippets.md` | the parts bin — copy-paste HTML/CSS blocks (generated) | — | — |
| `instagram-post.md` | feed/portrait/story canvas (single or carousel slide) | 1080² · 1080×1350 · 1080×1920 | Instagram Kit |
| `poster.md` | event/scarcity/announcement poster | A4 or 4:5 | Brochure Kit / print |
| `slide-deck.md` | one slide (title/section/content/quote/closing) + contact sheet | 1920×1080 | `../slides/` |
| `landing-section.md` | a web hero / marketing section | responsive | `../ui_kits/web/` |
| `brochure-page.md` | an A4 brochure/one-pager page | A4 | Brochure Kit / `../brochures/` |
| `launch-grid.md` | a 12-tile Instagram launch mural — posts (mural slices) + carousel slides | 1080×1350 grid | `../collateral/launch-grid.html` → `../../tools` |

**Don't loosen the constraints/snippets casually** — they're what keep a small model on-brand.
Change the FACTS, the text, and the layout order; leave the palette, fonts, and the mark verbatim.
