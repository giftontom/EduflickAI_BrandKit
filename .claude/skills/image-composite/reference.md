# image-composite — reference

## Why this division works
- **One-hue holds.** The image is single-hue (your accent + neutral), the treatment is accent/ink,
  the type is the normal palette → the whole stack stays one hue. A photoreal or multicolor image
  breaks that instantly.
- **Facts stay safe.** No text is in the image, so nothing can hallucinate a wrong date/price/claim.
  Every word is HTML you control.
- **The logo stays exact.** It's HTML/SVG on top — flat, crisp, correctly colored. The halo lights
  it from *behind*; it's never a filter on the logo (which would smear it).

## The only new CSS
`img-layer.css` adds `.composite`, `.img-layer` (+`img`), an optional `.img-layer--tint`, and
`.content`. Everything that makes the image legible and on-brand is **design-effects**:
`.vignette` (focus), `.grain` (unify, kill banding), `.halo` (light the focal). Don't hand-roll
those — reuse them so the composite matches every other surface.

## Tinting an off-palette image
If a usable image leans slightly off-hue, `.img-layer--tint` lays a `mix-blend-mode: color` wash of
`--accent-ink` over it (opacity ~0.35) to pull it back toward brand. Use sparingly; it's a rescue,
not a default. Better to generate on-palette in the first place (pass the palette literals).

## Export-path gotcha (the one that bites)
How you reference the backdrop depends on how the canvas exports:
- **`web-to-image` (Playwright):** reference the image normally (`src="bg.jpg"` or a URL). Playwright
  screenshots the real browser, so nothing taints. This is the default for social/raster.
- **`web-to-pdf` (html2canvas):** the backdrop **must** be an inline base64 data URI
  (`<img src="data:image/jpeg;base64,…">` or `background-image:url(data:…)`). A `file://` or remote
  image **taints** the canvas and *Download PDF* fails. Also avoid SVG-*filter* backgrounds.
  If the image is too large to inline comfortably, render that page via `web-to-image` and embed the
  resulting PNG instead.

Decide the route **before** building, because it changes how you author the `<img>`.

## Generating on-brand backdrops — the controls that matter
From `templates/image-prompt-kit.md`:
- **Style preamble** every call = a stable visual prior (same idea as a cached system prompt).
- **Reference images** (3–6 approved "north-stars") = how consistency is actually held across a series.
- **Seed** locked per series, vary only the BRIEF = a coherent family; change seed for a new look.
- **Negative block** every call = stops text / people / second-hue at the source.
- **Aspect** set to the true target ratio = no re-crop surprises behind a fixed tile.

**Two-model leverage:** keep preamble + palette + negative in a prompt-cached LLM system prompt;
feed a one-line BRIEF, let it expand to the full image prompt, then call your image model. One brief
→ on-brand prompt → backdrop. Model-agnostic (any API-first image model).

## QA gate
**Image alone (regenerate on any fail):** readable text/letters/numbers; a person/face/hand/real
object or stock-photo look; a hue outside accent+neutral or a rainbow gradient; a logo generated
into the image; too busy / no clear area for a headline.

**Composite (image + HTML on top):** vignette + grain applied → headline, proof, footer read
clearly; one hue across the full stack; logo in HTML on top, flat; halo behind the focal; passes a
10-second eyes-only look. A model will *claim* "one hue" and emit a second — **render and look**;
that's the only reliable check (export with `web-to-image`).
