# Eduflick AI — Component Inventory

> The single inventory of reusable UI components. Each lives as a **token-based
> class in `components.css`** and as a **paste-alone block in `recipes/snippets.md`**
> (snippet IDs in the table). Build new surfaces from these — don't reinvent.

**Load order:** `colors_and_type.css` (imports the generated `tokens/tokens.css`)
→ `components.css`. Components reference the **semantic role vars** (`--bg-card`,
`--fg1`, `--hairline`, `--accent`…), so they adapt to `.theme-light` automatically.

**The rule:** never hardcode a brand value in a surface. Use a class from here, or
a `var(--token)`. New brand values go in `tokens/tokens.json` first
(`cd tools && npm run tokens`).

---

## Inventory

| Component | Class(es) | Snippet | Key tokens | Notes |
| --- | --- | --- | --- | --- |
| **Button — primary** | `.btn .btn-primary` | S7 | `--i-500`, `--i-400`, `--shadow-brand` | Hover lifts `-2px` + brand glow. Label lowercase. |
| **Button — ghost** | `.btn .btn-ghost` | S7 | `--hairline-strong`, `--accent-soft` | Secondary action; border brightens on hover. |
| **Card** | `.card` | S8 | `--bg-card`, `--hairline`, `--radius-xl` | Base surface. Depth from border + faint shadow, not elevation. |
| **Stat card** | `.stat-card` + `.stat-num` / `.stat-label` | S8 | `--w-display`, `--fg1`, `--fg3` | Big number + mono label. Numbers as proof. |
| **Flick / feed card** | `.flick-card` + `.subject-tile` | S9 | `--i-500`, `--font-serif` | The product motif. Subject = serif **letter** in a mark-shaped tile, never emoji. |
| **Tag / pill** | `.tag` | S10 | `--hairline-strong`, `--fg2` | Neutral metadata pill (e.g. `next.js`). |
| **Scarcity flag** | `.tag-scarcity` | S10 | `--warn` | **The one allowed coral exception.** Scarcity/CTA only, sparingly. |
| **Spec / meta row** | `.spec-row` + `.spec-key` | S12 | `--font-mono`, `--hairline-strong` | Dashed editorial hairline row (`duration · 12 weeks`). |
| **Dot grid bg** | `.bg-dots` | S11 | — | Faint texture overlay; put on a `position:relative` wrapper. |
| **Line grid bg** | `.bg-linegrid` | S11 | — | 40px editorial grid at ~6% opacity. |
| **Indigo hero bg** | `.hero-indigo` | S11 | `--i-500`, `--i-700`, `--i-ink` | One-hue deep gradient for hero canvases. |
| **Halo (cinematic)** | `.halo` + `.focal` | S15 | — | Light **behind** the focal element. The mark stays flat — never a filter on it. |
| **Film grain** | `.surface` | S16 | — | Grayscale noise ≤5%; texture, not a hue. Kills gradient banding. |
| **Cinematic surface** | `.cine-indigo` / `.cine-ink` / `.cine-paper` + `.vignette` | S17 | `--i-400…--i-ink` | Directional gradient + vignette. Still one hue. |
| **Glass card** | `.glass` | S19 | `--hairline-strong` | Frosted fill + hairline + inset highlight + brand glow. |
| **Footer lockup** | `.brand-footer` + `.wordmark` | S18 | `--fg3` | Consistent brand attribution. On covers keep ≥135px above the bottom. |
| **Mark** | `.mk-path` (on `<path>`) | S2 | `brand.mark-path` | One square + one right-edge notch. Geometry lives only in `tokens.json` / `assets/logo/mark.svg`. Never distort, rotate, recolor to a third hue, or add glows. |
| **Wordmark** | `.wordmark` (+ `<i>`) | S3 | `--accent-soft` | Built in HTML, never an image: `eduflick` + uppercase `AI`. |

Text styles (`.display`, `h1`–`h4`, `.lead`, `.body`, `.mono`, `.eyebrow`, `.label`,
`.code`) live in `colors_and_type.css`.

---

## Adding a component

1. Add the class to `components.css` using `var(--token)` (or role vars) — no raw hex.
2. Add the paste-alone block to `recipes/snippets.src.md` with `{{token}}` placeholders,
   then `cd tools && npm run snippets`.
3. Add a row to the table above (class, snippet id, key tokens, do/don't).
4. If it introduces a new design value, add it to `tokens/tokens.json` first.

See [`README.md`](README.md) for foundations and [`recipes/README.md`](recipes/README.md)
for the assemble-don't-invent workflow.
