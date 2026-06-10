---
name: design-effects
description: A brand-neutral cinematic CSS toolkit for high-end web/graphic design — halo (light behind a focal element), faint grayscale film grain, directional gradient + vignette surfaces, glass cards, accent glow, dot/line grids, and true-pixel canvas frames. All effects are driven by CSS variables (--accent + neutrals from a tokens.css), so they re-theme to any brand. Use when designing posters, social tiles, slides, hero sections, or any surface that needs depth, atmosphere, and polish without looking like a generic template.
user-invocable: true
---

# design-effects — cinematic depth in pure CSS, for any brand

One stylesheet (`effects.css`) of composable, production-grade visual effects. Every color is a
CSS variable, so the same effects look on-brand for any project: load that project's `tokens.css`
(from the `design-tokens` skill) first, and the toolkit themes itself from `--accent` + neutrals.

> **The one rule that makes it look expensive:** light goes in a **halo behind** the focal
> element — never as a filter *on* it. A logo/headline stays flat and crisp; the glow lives in a
> blurred radial *behind* it. Everything here follows that.

## What's in `effects.css`

| Class | Effect | Use on |
| --- | --- | --- |
| `.canvas` + `--sq`/`--portrait`/`--story`/`--slide`/`--a4` | true-pixel frame at exact export sizes | the root of any artifact |
| `.preview` | scale-to-fit wrapper so a 1080px canvas fits your screen | wrap a canvas while designing |
| `.dot-grid` / `.line-grid` | faint structural grid (::before overlay) | any positioned surface |
| `.hero` | directional accent gradient (flat) | hero blocks, simple tiles |
| `.glow` | accent drop-shadow | a mark / focal graphic (not text) |
| `.halo` + `.focal` | spotlight **behind** a focal element | mark, big headline, hero number |
| `.grain` | faint grayscale fractal noise (kills banding) | any surface, on top |
| `.cine` / `.cine-ink` / `.cine-paper` + `.vignette` | cinematic directional gradient + edge darkening | covers, hero tiles, slides |
| `.glass` | frosted card: translucent + hairline + inset highlight + glow | cards over imagery/gradient |
| `.on-paper` | retunes grid/grain/vignette/glass for light surfaces | light-theme artifacts |

## How to use

1. **Load tokens first**, then this file:

   ```html
   <link rel="stylesheet" href="tokens.css">      <!-- your brand profile, from design-tokens -->
   <link rel="stylesheet" href="effects.css">
   ```

   (No tokens.css yet? `effects.css` ships neutral-indigo fallbacks so it still previews.)
2. **Build at true pixels.** Start from a `.canvas--*` frame; wrap in `.preview` while designing.
3. **Layer in the documented order** (see `reference.md`):
   surface gradient (`.cine` + `.vignette`) → `.grain` → grid → content → `.halo` behind the focal.
4. **Render and look.** These are visual; a screenshot is the only real check. Export pixel-perfect
   PNGs with the `web-to-image` skill, or to PDF with `web-to-pdf`.

## Composing for depth (the cinematic stack)

```text
.canvas (frame)
  └ .cine + .vignette        ← directional light + focused edges
     └ .grain                ← richness, no banding
        └ .dot-grid          ← faint structure
           └ .halo (behind)  ← lights the focal from behind
              └ .focal       ← the mark / headline / number (flat, crisp, on top)
                 └ .glass     ← cards float above it all
```

## Export-safety (important)

- The grain is an **inline `data:` SVG** — it survives `html2canvas`/PDF export.
- For PDF via `web-to-pdf`, avoid SVG *filter* backgrounds and keep any imagery as inline data
  URIs (see `web-to-pdf`/`image-composite` for the taint rule). `drop-shadow`/`blur` on elements is fine.
- `backdrop-filter` (`.glass`) renders in real browsers and Playwright (`web-to-image`) but is
  flaky under `html2canvas`; for PDF, prefer a solid translucent fill over true frosted blur.

See `effects.css` (the source, fully commented), `reference.md` (when/why each, gotchas), and
`preview.html` (a live demo of every effect, with `[data-export]` nodes ready for `web-to-image`).
