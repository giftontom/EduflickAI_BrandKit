# Recipe — Instagram launch grid (12-tile mural + carousels)

Load `00_SYSTEM_PROMPT.md` + `../DESIGN_CHEATSHEET.md` + `snippets.md` first — and read
`../../content-studio/INSTAGRAM_LAUNCH_PLAN.md` for the copy (the words are already written; do
**not** reinvent them). The built artifact already exists:
`../collateral/launch-grid.html`. This recipe is for **building or extending** it, then
exporting pixel-perfect PNGs with `../../tools`.

> A launch grid is not 12 independent posts — it's **4 continuous mural rows** read top-to-bottom,
> each row spanning 3 columns on one surface. Each post is a **mural slice** at 1080×1350; the row
> only looks right when the three slices line up. Some tiles open as **carousels** (deck slides).

---

## The architecture (don't change without re-checking all 12 tiles)

- **Grid:** 3 columns × 4 rows = 12 tiles, posted **reverse-fill** (bottom-right first) so the
  mural assembles top-down as the feed grows. Tiles are 4:5 (1080×1350).
- **Surfaces (one hue, three values):** bright-indigo · paper · ink · indigo — assigned per row so
  adjacent rows contrast. Surface classes in the HTML: `.t-ink` / `.t-paper` (+ the deck `.vs-*`
  variants). **Paper rows flip the mark/motifs to indigo; dark/indigo rows use the paper-fill mark.**
- **Cinematic surface (S15–S19):** every tile sits on a directional gradient + vignette + faint
  grayscale grain; focal elements get a **halo behind** them. The mark stays flat.
- **Safe zone:** keep the headline + mark inside the centre **3:4** region — Instagram's grid
  thumbnail crops 4:5 tiles to 3:4, so anything near the top/bottom edge is clipped in the grid view.
- **Carousels:** tiles flagged in the `CARO` data object expand to deck slides (cover = the tile
  itself; inner slides use the em-based deck template + a `motif`). Grid/texture is **em-based** so a
  slide looks identical in the in-page viewer and in the export.

---

```text
FACTS (only source of live numbers — never typeset an invented value; missing → [[NEEDS: …]]):
- Handle / link / cohort start / seats / price: [[ pull from INSTAGRAM_LAUNCH_PLAN.md ]]

INPUTS (per tile you're building/editing):
- Tile id + grid position (e.g. post-08-uc, row 3): [[ ]]
- Surface: [[ bright-indigo | paper | ink | indigo ]]
- Role: [[ single mural slice | carousel cover + N deck slides ]]
- Eyebrow / headline (lowercase, ONE *asterisk* word) / proof / motif: [[ from the launch plan ]]

BUILD RULES:
1. Edit `../collateral/launch-grid.html` — reuse its surface classes, deck-slide template,
   and `motifHTML()`; assemble from snippets S15–S19. Do not invent new CSS, colors, or fonts.
2. Match the row's surface: paper → indigo mark + indigo motifs; dark/indigo → paper-fill mark.
   The "AI" of the wordmark is white on indigo/ink, indigo on paper.
3. Keep the headline + mark inside the 3:4 safe centre. Big type. One hue. Coral only for scarcity.
4. Carousel slides: one idea per slide, cover = hook + "swipe →", last = CTA; keep grain/grid em-based.
5. Co-brand tile: Eduflick mark leads, 1u divider, Tomatrix never indigo, legal name proper-cased.

RENDER + EXPORT:
- Render over http: `cd tools && npm run serve` → open the grid (use `…?export=1` to see tiles 1:1).
- Export: `npm run export` → `../exports/*.png` (every post slice + every slide). `SCALE=1` = exact
  1080×1350; default 2x is crisper. Re-run after any edit.
```

---

## Worked example (what good looks like — abbreviated)
>
> Row 3 is a **paper** carousel (post-08-uc). Cover = lowercase hook with one serif accent word,
> indigo mark, faint indigo grid; "swipe →" mono label bottom-right. Four inner deck slides each
> carry one curriculum idea + a mark-derived motif, on the paper surface with an em-based grid that
> matches the export. Run `npm run export` → `slide-uc-01…04` + `post-08-uc` all show the same grid
> scale. The three tiles of row 3 line up into one mural when viewed in the grid.

**✗ Avoid:** treating tiles as standalone (the row mural breaks), white text on a paper slide, a
fixed-px grid (viewer ≠ export), a glow on the mark, Tomatrix recolored to indigo, a headline pushed
into the cropped top/bottom edge.
