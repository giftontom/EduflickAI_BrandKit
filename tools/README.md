# tools/ — build + export toolbox

Everything that builds, checks, or exports the brand kit. One `npm install`
(Playwright + Chromium + Style Dictionary), then:

| Command                               | Does                                                                             | Output                                            |
| ------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------- |
| `npm run tokens`                      | tokens.json → CSS custom props + flat JSON + JS module                           | `design-system/tokens/`, `tools/brand.tokens.mjs` |
| `npm run snippets`                    | snippets.src.md + tokens → inline snippet bin                                    | `design-system/recipes/snippets.md`               |
| `npm run check:facts`                 | facts-integrity guard — retired brand strings (add `-- --links` for link checks) | pass/fail                                         |
| `npm run export`                      | launch-grid posts + carousel slides                                              | `exports/*.png`                                   |
| `npm run export:ig`                   | Instagram tiles (`collateral/instagram-posts.html`)                              | `exports/instagram/`                              |
| `npm run export:posters`              | posters (`collateral/posters.html`)                                              | `exports/posters/`                                |
| `npm run export:stories`              | stories (`collateral/stories.html`)                                              | `exports/stories/`                                |
| `npm run export:slides`               | the program deck slides (landscape)                                              | `exports/full-stack-ai-engineer/`                 |
| `npm run export:pdf`                  | brochure → print-quality PDF (Chromium)                                          | `brochures/*.pdf` (gitignored)                    |
| `npm run export:avatar`               | the gradient profile avatar                                                      | `assets/logo/social/`                             |
| `npm run gen:backdrops` / `:proc`     | poster backdrops — Gemini AI / procedural fallback                               | `design-system/collateral/assets/backdrops/`      |
| `npm run gen:ig-backdrops`            | IG tile backdrops                                                                | same                                              |
| `npm run fetch:stock` + `treat:stock` | photoreal indigo-duotone pipeline                                                | same                                              |
| `npm run serve`                       | static preview server                                                            | `http://localhost:8080`                           |
| `npm run studio`                      | the brand studio (galleries, docs, status, guarded editing)                      | `http://localhost:8090/tools/studio/`             |
| `node codemod-hex.mjs`                | migrate hardcoded hex → `var(--token)` (dry-run first)                           | —                                                 |

Files starting with `_` (`_backdrop-art.mjs`, `_gen-grain.mjs`, `_inject-dark-bg.mjs`)
are **internal helpers** imported by the scripts above — not run directly.

`../exports/` is **generated output** (gitignored, ~hundreds of MB when full):
`exports/{instagram,posters,stories,full-stack-ai-engineer}/` per kit, plus
`post-*.png` / `slide-*.png` from the launch grid. Safe to delete; re-export anytime.

---

## The brand studio

```bash
cd tools && npm run studio        # → http://localhost:8090/tools/studio/
```

`studio-server.mjs` serves the whole repo plus a JSON API (`/api/manifest`, `/api/status`,
`/api/actions`, `/api/editmode`, `/api/facts/*`) behind `127.0.0.1`. The app at `tools/studio/`
gives you galleries for every export surface (with stale/missing detection — empty grids on a
fresh clone are normal, `exports/` is gitignored), an iframe browser for brochures/deck/kits, a
markdown reader for all docs, launch-pipeline status tracking (`content-studio/status.json`),
a guarded FACTS.md editor, and one-click pipeline runs with live logs. Its write surface is
exactly three paths — see [`studio/README.md`](studio/README.md).

`serve.mjs` and the studio share the static handler in `lib/static.mjs`.

## The launch-grid exporter

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

## Also: poster backdrops (the AI-imagery layer)

```bash
cd tools
GEMINI_API_KEY=…  npm run gen:backdrops        # Nano Banana 2 / gemini-3-pro-image → ../design-system/collateral/assets/backdrops/*.png
npm run gen:backdrops:proc                      # procedural fallback (no API) — same filenames
npm run export:posters                          # composite posters → ../exports/posters/*.png
```

Generates the **abstract indigo backdrops** layered _behind_ the type in `collateral/posters.html`
(see `../design-system/AI_IMAGERY_GUIDE.md`). The AI path needs a **billing-enabled** Gemini key —
image models return HTTP 429 (`limit: 0`) on the free tier. `gen:backdrops:proc` writes the same
filenames with SVG-rendered textures, so switching to real AI later is a drop-in re-run.

### Photoreal backdrops — real photos, forced on-brand (the hybrid path)

```bash
cd tools
npm run fetch:stock                       # keyless: Wikimedia Commons → tools/stock-sources/*.jpg
PEXELS_API_KEY=… npm run fetch:stock      # preferred: modern Pexels stock (free commercial use)
npm run treat:stock                       # indigo DUOTONE → backdrops/poster-program.png + poster-masterclass.png
npm run export:posters                    # composite the type/mark on top
```

`treat:stock` recolors a real photo onto the indigo ramp (luminance → ink / indigo / light-indigo
via an SVG `feComponentTransfer`), so the output stays strictly **one hue** and **no text or logo is
ever added** — only the photo's own pixels are remapped. Per the **hybrid** policy in
`AI_IMAGERY_GUIDE.md §2`: `program` + `masterclass` use photoreal duotone (the human / build
moments); `seats` keeps the abstract procedural spotlight (its hero is the number **20**).

Sources: hand-drop your own `program.jpg` / `masterclass.jpg` in `tools/stock-sources/` (best taste
control), or `fetch:stock`. Use `PICK_program=3 PICK_masterclass=2 npm run fetch:stock` to eye-pick a
different candidate. Raw sources are **gitignored**; only the treated PNG ships, with provenance +
license recorded in `backdrops/SOURCES.md` (Pexels & Commons CC both permit commercial use — keep
attribution for CC-BY / CC-BY-SA).

## Notes

- IG feed/portrait spec is 1080×1350 (4:5). `SCALE=1` matches it exactly; `SCALE=2`
  gives a crisper file that IG downscales cleanly.
- Re-run after editing the HTML — the exporter always reflects the current design.
- `exports/` is generated output; add it to `.gitignore` if you don't want it committed.
