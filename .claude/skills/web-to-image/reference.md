# web-to-image — reference

## The capture model

1. Launch headless Chromium at `deviceScaleFactor = SCALE`.
2. Load the page, `await document.fonts.ready`, settle 500ms.
3. Hide `HIDE_SELECTOR` (download buttons, on-screen chrome) so they never bake in.
4. Grow the viewport to the full page (`scrollWidth × scrollHeight`) so every region is paintable.
5. For each `[data-export="name"]`: read its `boundingBox`, screenshot **clipped to that box**,
   write `name.png`.

Because the clip is taken from the composited page, transparent export nodes keep whatever sits
behind them (a shared gradient, a sliced background mural). That's how a grid of "transparent" tiles
each export as their own slice of one continuous backdrop.

## Designing for export

- Build at **true pixels** using fixed-size frames (`design-effects` `.canvas--portrait` etc.).
  Don't rely on a scaled preview wrapper for the export node — clip uses the real box, and a
  `transform: scale()` changes the box. Export full-size nodes; scale only for on-screen viewing.
- **Lay export targets out from the top-left.** Don't *center* a canvas that's wider than the
  viewport: centering overflows its left edge into negative coordinates that `scrollWidth` doesn't
  capture, so the clip silently loses the left side (e.g. a 1920px slide exports at 1600px). Use
  `align-items: flex-start` / left-align in the export view; center only in a separate viewing view.
- An **export-mode view** is handy for big layouts: gate a full-size, button-free layout behind a
  query (`?export=1`) and pass `HTML_QUERY=export=1`. Keep the interactive view separate.
- Mark transient UI (hover download buttons, nav) with `data-export-hide` so it's removed in capture.

## Single asset / avatar pattern

For one isolated graphic (an avatar, an OG card), the same script works — give the single root node
`data-export="avatar"`. For special pixel processing (e.g. a gradient avatar with transparent
corners for a circular crop), a dedicated Node script using `sharp`/`canvas` may be cleaner; the
repo's `tools/export-pf-avatar.mjs` is one example of that approach.

## SCALE guidance

- `SCALE=1` → exact CSS pixels. Use when the platform wants an exact spec (e.g. 1080×1350).
- `SCALE=2` → 2× supersample; the platform downscales it crisply. Default; best perceived quality.
- Higher scales cost memory/time with diminishing returns above 2–3×.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| "No [data-export] nodes found" | add `data-export="name"` to each target; if using an export view, pass `HTML_QUERY` |
| Fonts wrong / boxes | fonts not loaded on `file://` → use `serve.mjs` + an http URL |
| Skipped (zero box) | the node is `display:none` or has no layout; ensure it's visible at capture time |
| Chromium launch fails | `npm install && npx playwright install chromium` |
| Effect missing | not an html2canvas limitation here — check it isn't hidden by `HIDE_SELECTOR` |

## Output naming

The file name is exactly the `data-export` value (`data-export="post-03-bl"` → `post-03-bl.png`).
Name targets deliberately; they become your asset filenames.
