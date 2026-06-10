# design-effects — reference

## The mental model
A polished surface is layers of light, not decoration. From back to front:
1. **A directional gradient** (`.cine`) — the light has a *direction* (offset hot-spot), not a flat wash.
2. **A vignette** (`.vignette`) — darken the edges so the eye lands on the content.
3. **Grain** (`.grain`) — faint grayscale noise unifies the surface and kills gradient banding.
4. **Structure** (`.dot-grid` / `.line-grid`) — optional faint grid, hints at precision.
5. **A halo** (`.halo`) — a blurred radial *behind* the focal element, lighting it from behind.
6. **The focal** (`.focal`) — mark / headline / hero number, flat and crisp, on top.
7. **Glass** (`.glass`) — cards that float above the surface.

## Why "halo behind, never filter on"
A glow applied as a `filter` to a logo or headline smears its edges and reads as cheap. The same
light, placed as a blurred radial *behind* the element, makes it look lit and premium while the
element stays razor-sharp. `.focal { z-index: 1 }` keeps it above the `.halo`.

## Per-effect notes
- **`.cine*`** — three presets: accent (`.cine`), near-black (`.cine-ink`), light (`.cine-paper`).
  All key off your `--accent*` vars. Move the `at X% Y%` hot-spot to change light direction.
- **`.vignette`** — strength is `--vignette`. On light surfaces add `.on-paper` (drops it to ~7%).
- **`.grain`** — opacity baked into the data URI at 5%. It's grayscale on purpose: texture, not a
  hue. To make it stronger, raise the `opacity` inside the `--grain` SVG; keep it ≤ 8%.
- **`.halo`** — size it generously (often larger than the focal) and position absolutely. Colors are
  `--halo-1` (inner) / `--halo-2` (falloff), defaulting to accent-light/accent-mid alphas.
- **`.glow`** — a `drop-shadow`, so it follows alpha shapes (use on an SVG mark, not a text node).
- **`.glass`** — needs something behind it (gradient/image) to be worth using. `backdrop-filter`
  blur is the frosted look; falls back to the translucent fill where unsupported.

## Theming for a specific brand
Everything reads from `tokens.css`. To re-skin: change the `tokens.json` accent ramp and rebuild
(see `design-tokens`). To retune just an effect locally, override its tunable var on the surface:
```css
.cover { --halo-1: rgba(255,180,80,.5); --vignette: rgba(20,8,0,.6); }  /* warm spotlight on one cover */
```

## One-hue discipline
The toolkit is built so an entire surface — gradient, vignette, halo, glow, glass — stays within
**your accent + neutrals**. That single-hue restraint is what reads as "designed," not "templated."
Resist adding a second hue; add ramp tints instead.

## Export gotchas (full rules live in web-to-pdf / image-composite)
| Route | Grain | Glass blur | Imagery | Filters |
| --- | --- | --- | --- | --- |
| `web-to-image` (Playwright) | ✅ exact | ✅ | reference files normally | ✅ |
| `web-to-pdf` (html2canvas) | ✅ (inline data URI) | ⚠ prefer solid translucent fill | must be inline data URI | strip CSS `filter` on SVGs |

## Provenance
Distilled and de-branded from the Eduflick `recipes/snippets.md` cinematic set (`S11`, `S13–S19`):
indigo literals → `var(--accent*)`, paper/ink → `var(--paper)`/`var(--ink)`. The classes and
values are the same proven effects, now brand-agnostic.
