---
name: web-to-image
description: Render any HTML design to pixel-perfect PNG images at exact sizes, using Playwright + real Chromium. Mark elements with data-export="name" and each is screenshot at true pixels (1080×1350 social tiles, OG cards, avatars, slides, posters, carousel frames). Unlike html2canvas it uses the real browser engine, so clip-paths, gradients, backdrop-filter, drop-shadows and web fonts are exact. Use when you need raster output (PNG/JPG) for social media, ads, app stores, email, or thumbnails. Brand-neutral.
user-invocable: true
---

# web-to-image — HTML → pixel-perfect PNG, the way the browser paints it

Design a fixed-size canvas in HTML/CSS, mark what to export, and this renders each region to an
exact-pixel PNG in real Chromium. Because it's the real engine (not a CSS re-implementation),
**clip-path notches, radial gradients, `backdrop-filter` glass, drop-shadow glow, SVG and web-font
kerning all come out exactly right** — true pixel accuracy for anything you'll post or ship.

## Quick start

1. In your HTML, give each export target a name:

   ```html
   <div class="canvas canvas--portrait" data-export="post-01">…</div>   <!-- 1080×1350 -->
   <div class="canvas canvas--sq"       data-export="og-card">…</div>    <!-- 1080×1080 -->
   ```

   (The `design-effects` `.canvas--*` frames give exact sizes.)
2. Install once: `npm install` (pulls Playwright + Chromium via postinstall).
3. Export:

   ```bash
   HTML_PATH=design.html OUT_DIR=exports SCALE=2 node scripts/export-images.mjs
   ```

   → `exports/post-01.png`, `exports/og-card.png` at 2× (downscale cleanly), or `SCALE=1` for exact.

## Configuration (env)

| Var | Default | Meaning |
| --- | --- | --- |
| `HTML_PATH` | — (required) | HTML file, or a full `http(s)://` URL |
| `OUT_DIR` | `exports` | output folder |
| `SCALE` | `2` | `deviceScaleFactor`; `1` = exact CSS px, `2` = crisp @2× |
| `HTML_QUERY` | — | query appended to a file path (e.g. `export=1` to flip an export-mode view) |
| `HIDE_SELECTOR` | `[data-export-hide],.dlbtn` | elements hidden before capture (download buttons, chrome) |

## Why "clip from page" matters

Each target is clipped from the **composited** page by its bounding box — so a transparent tile
still captures its slice of a continuous background (a sliced mural, a shared gradient). Build the
full layout once; export the pieces.

## When to use this vs. web-to-pdf

| Need | Use |
| --- | --- |
| PNG/JPG for social, ads, OG, app store, email, avatars | **web-to-image** (this) |
| True clip-paths / `backdrop-filter` / exact effects | **web-to-image** |
| A downloadable multi-page **PDF** document | `web-to-pdf` |
| No Node / can't install | `web-to-pdf`'s in-browser path, or a manual screenshot |

## file:// vs http

Most pages export fine from a `file://` path. If fonts or images are blocked (CORS on `file://`),
serve over http and pass the URL:

```bash
ROOT=. PORT=8080 node scripts/serve.mjs            # in one shell
HTML_PATH=http://localhost:8080/design.html node scripts/export-images.mjs   # in another
```

## Common sizes

| Target | data | px (SCALE=1) |
| --- | --- | --- |
| IG square | 1:1 | 1080×1080 |
| IG portrait / carousel | 4:5 | 1080×1350 |
| Story / Reel | 9:16 | 1080×1920 |
| Slide / hero | 16:9 | 1920×1080 |
| OG / Twitter card | 1.91:1 | 1200×630 |
| Avatar | 1:1 | 400 / 1024 |

See `reference.md` for the avatar/single-asset pattern and troubleshooting. Provenance: generalized
from `tools/export-images.mjs` (a production launch-grid exporter) + `tools/serve.mjs`.
