# Launch-grid image exporter

Turns `../design-system/collateral/launch-grid.html` into ready-to-post PNGs —
every **post** (as its true mural slice) and every **carousel slide** at exact **1080×1350**.

## Two ways to export

### 1. Pixel-perfect, bulk (recommended)
Uses Playwright + real Chromium, so clip-path notches, gradients, the glow, the Tomatrix
logo and web fonts render **exactly** as the browser paints them.

```bash
cd tools
npm install                 # installs Playwright + (postinstall) Chromium
npm run export              # → ../exports/*.png  at 2x (2160×2700, crisp)
SCALE=1 npm run export      # → exact 1080×1350
```

Output lands in `../exports/`:
- `post-01-br.png … post-12-tl.png` — the 12 grid posts (each carries its mural slice)
- `slide-bl-01.png …`, `slide-uc-…`, `slide-tc-…`, `slide-ml-…`, `slide-mr-…`, `slide-ur-…`
  — every carousel slide

### 2. Quick, in-browser (no install)
Needs an internet connection (it embeds the web fonts). Good for one-offs; for final,
perfectly-accurate assets prefer method 1.
- **Any post (incl. single-image tiles):** hover the tile and click the **⬇** that appears.
  It downloads that post as its true **mural slice** at 1080×1350. Best in the
  **`…?export=1`** view, where tiles are full-size and the button is easy to hit.
- **Carousel slides:** tap a carousel tile to open the viewer, then hit **⬇ png**.

Open **`…?export=1`** to see every post and slide rendered 1:1 — the same view Playwright captures.

## Also: the profile avatar

```bash
cd tools
npm run export:avatar           # → ../assets/logo/social/avatar-pf-av-{400,1024}.png (+ Downloads copies)
SIZE=512 npm run export:avatar  # custom size(s), comma-separated
```

Renders the gradient Instagram avatar **in isolation** — a diagonal indigo gradient
(`i-violet → indigo-ink`) with the paper-fill mark and transparent corners (correct for IG's
circular crop). Re-run after changing the gradient or the mark.

## Notes
- IG feed/portrait spec is 1080×1350 (4:5). `SCALE=1` matches it exactly; `SCALE=2`
  gives a crisper file that IG downscales cleanly.
- Re-run after editing the HTML — the exporter always reflects the current design.
- `exports/` is generated output; add it to `.gitignore` if you don't want it committed.
