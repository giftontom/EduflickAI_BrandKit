# Generating on-brand AI IMAGERY (and blending it with the design system)

The visual twin of `SMALL_MODELS_GUIDE.md`. That one gets a small model to assemble **HTML
artifacts**; this one adds a new, deliberately narrow capability: using an AI image model to generate
an **abstract indigo backdrop layer** that sits *behind* the existing type and mark — so a hero tile
or a story can carry atmosphere and depth without breaking the brand.

The whole strategy in one line: **the AI generates only the imagery layer; the words, the numbers,
and the mark stay in HTML/CSS on top of it.** That single rule is what keeps the FACTS-block
anti-hallucination guarantee intact and the mark untouched, while still letting the brand breathe.

> Decision baked in: backdrops are **indigo-monochrome, on-brand only**, in one of two modes —
> (A) **abstract generative texture** (Nano Banana 2 / procedural), or (B) **brand-treated
> representational photography** forced to an indigo **duotone**. Which mode per surface is the
> **hybrid policy** in §2. Either way the image is the *backdrop*; the words, numbers, and mark
> stay in HTML on top.

---

## 1. Why & when — imagery is the exception, not the default

The brand is graphic and typographic on purpose. Most assets should stay **pure HTML/CSS/SVG**: it's
crisp, free, instantly on-brand, and exports clean. And atmosphere no longer needs a photo — the
snippet bin now ships a **cinematic-depth toolkit in pure CSS**: a directional gradient + vignette
(`S17`), faint grayscale film grain (`S16`), a halo *behind* a focal element (`S15`), and glass cards
(`S19`). **Try that first.** Reach for a *generated* image only when you need an **organic texture CSS
can't synthesize** — volumetric fog, a real particulate field, fluid or topographic forms — and even
then, layer it under the same `S16`/`S17` treatment so it matches everything else.

| Use AI imagery for… | Keep it pure graphic for… |
| --- | --- |
| hero / launch tiles (the top of the launch grid) | data-dense spec cards, pricing, curriculum tables |
| atmospheric section backgrounds, dividers | mid-carousel slides (one idea, must stay legible) |
| OG cards, LinkedIn banners, profile art | anything where a number is the hero |
| reel / story backdrops behind big type | brochure body pages, decks with lots of copy |

Rule of thumb: if removing the image changes the *meaning*, you're using it wrong. The image is
**mood**, never **message**. The message is always the type on top.

## 2. The brand stance — two backdrop modes, one hue

The system's original line is *"No photography. No stock photos. Imagery replaced by the mark, by
data, or by editorial type"* (`recipes/00_SYSTEM_PROMPT.md`, `README.md §3`). That still governs the
**default**. What we add is a **narrow, treated exception**: a backdrop may be a real photograph
**only after** it is forced onto the indigo ramp (a duotone) so it reads as one-hue brand texture,
not a stock photo. So there are now **two backdrop modes**, and both stay indigo-monochrome:

**Mode A — abstract generative texture** (the original).
Volumetric indigo light, particle fields, topographic contours, soft geometric planes, the
square-feed-card-with-a-notch motif. Dark by default. Generated (Nano Banana 2) or procedural
(`tools/gen-backdrops-proc.mjs`). Nothing recognizable; pure mood. One hue plus its ramp.

**Mode B — brand-treated representational photography** (the new, narrow exception).
A real photo of the actual thing — a room of people building, hands on a keyboard, code on a
screen — run through `tools/treat-stock.mjs`: an SVG `feComponentTransfer` remaps luminance onto
the indigo ramp (a duotone), erasing all original colour. The result is representational (you can
tell it's people building) but unmistakably Eduflick (one hue). The photo is still only a
*backdrop* — the message is the HTML type/mark on top.

**The hybrid policy — which mode per surface:**

| Surface | Mode | Why |
| --- | --- | --- |
| human / "hero" moments — the room, hands building, an in-person session | **B · photoreal duotone** | warmth + proof; shows the real thing |
| free masterclass / "see it built live" | **B · photoreal duotone** | the live-build moment is human |
| number-is-the-hero ("20 seats"), spec-dense, pricing, curriculum | **A · abstract** | a photo competes with the number; keep it calm |
| OG cards, dividers, atmospheric fills where no subject helps | **A · abstract** | mood only |

Rule of thumb unchanged: if removing the image changes the *meaning*, you're using it wrong — even
in Mode B the photo is mood/proof, never the claim. (Shipped example: `collateral/posters.html` —
`program` + `masterclass` are Mode B, `seats` is Mode A; the full 6-archetype poster system that
governs which surfaces use imagery is in `recipes/poster.md`.)

**Guardrails for Mode B (all must hold, or fall back to Mode A):**

- **One hue.** Output is a strict indigo duotone — the treatment guarantees it; never ship an
  untreated colour photo.
- **Backdrop only.** Type, numbers, and the mark stay in HTML on top; the photo sits in the `S20`
  image-layer with the `S16`/`S17`/scrim treatment over it.
- **No added text or logo**, and **no readable text in the source** — incidental on-screen code
  must be reduced to texture by the treatment + scrim, never a legible word or a real brand/logo.
- **People as atmosphere, not testimonial** — a figure building is fine; no posed face presented as
  a named student, no implied claim a photo can't back.
- **Same eyes-only QA** (§6) — if it doesn't sit beside the launch grid as one-hue Eduflick, it fails.

**Still never (either mode):** a third hue (teal/purple/green/red/orange), a rainbow gradient, added
text/letters/numbers, the mark or any logo baked into the pixels, bevels/heavy flare/busy collage.

## 3. The blend — a composite layer model

The "integration" is just **z-order** — and most of the layers already exist as snippets. The
generated image is the *bottom* layer; the treatment that makes it legible and on-brand is **the same
`S15`–`S17` cinematic toolkit** the rest of the system uses; the type and mark are the usual
`S4`/`S5`/`S6`/`S2` snippets on top. Nothing about the current recipes changes — the image slips in
*below* the `S14` frame's background, exactly where `S11`/`S17` normally sit.

```text
   ┌─ S14 canvas frame (unchanged) ───────────────────────────────┐
   │  layer 4 · TYPE · MARK · DATA    S4 S5 S6 S7 S2 S18   ← the message, always HTML/SVG
   │  layer 3 · FOCAL LIGHT           S15 halo behind     ← lights headline/mark, never on it
   │  layer 2 · CINEMATIC TREATMENT   S17 vignette + S16 grain   ← legibility + richness
   │  layer 1 · AI IMAGE              abstract indigo texture    ← mood only, no text / no mark
   └────────────────────────────────────────────────────────────────┘
```

The **only new CSS** is the image-layer wrapper itself; everything stacked above it is an existing
snippet — do **not** hand-roll the scrim, grain, or halo, they are `S17` / `S16` / `S15`:

```css
/* the one genuinely new piece: drop the generated backdrop behind everything */
.img-layer{position:absolute;inset:0;z-index:0;overflow:hidden}
.img-layer img{width:100%;height:100%;object-fit:cover;display:block}
/* then ON TOP of it, reuse the cinematic snippets verbatim:                    */
/*   S17 .vignette → darkens edges, focuses the eye, makes type read            */
/*   S16 grain     → unifies the texture with the CSS surfaces, kills banding    */
/*   S15 .halo     → lights the focal headline / mark from BEHIND                */
.content{position:relative;z-index:3}   /* eyebrow, headline, proof, CTA, mark live here */
```

Because layer 1 is indigo-monochrome, the cinematic treatment is indigo/ink, and the type is the
normal palette, the **one-hue rule holds across the whole stack**. Because no text is in layer 1, the
**FACTS guarantee holds**. Because the mark is on top in HTML, it stays **flat and exact** — the `S15`
halo lights it from *behind*, never as a filter on it.

**Export gotcha — match the path.** How you reference the backdrop depends on how the canvas exports:

- **Social PNGs via `../tools` (Playwright):** reference the image file normally — Playwright shoots
  the live browser, so nothing taints. This is the default for IG / launch-grid tiles.
- **Brochure / one-pager → PDF via html2canvas:** the backdrop **must be an inline base64 data URI**
  (`<img src="data:image/png;base64,…">` or `background-image:url(data:…)`), and avoid SVG-*filter*
  backgrounds, or the canvas taints and *Download PDF* fails. Inline it, or render that page through
  `../tools` instead.

## 4. The master image-prompt kit

The image-side analogue of `recipes/00_SYSTEM_PROMPT.md`. Paste the **style preamble** every time;
it is the prior that keeps every generation on-brand. Then add one `BRIEF:` line for the specific
mood. Keep the palette literals and the negative block attached.

**Style preamble (reuse verbatim, every generation):**

```text
Abstract generative brand texture for "Eduflick AI". Deep INDIGO MONOCHROME only.
Mood: precise, editorial, an engineer's calm — premium, minimal, lots of negative space.
Form vocabulary (pick what the brief asks): volumetric indigo light in dark space;
a fine particle / dot field; topographic contour lines; soft intersecting geometric planes;
an abstracted square "feed card" with a triangular notch bitten from one edge (the brand mark
as pure shape, NOT a logo). Faint dot-grid or 40px line-grid structure, low contrast.
Lighting dark and soft, no harsh flare. Composition: clean, asymmetric, room for text later.
This is a BACKGROUND TEXTURE, not a scene and not a photo.
```

**Palette literals (embed in every prompt):**

```text
ink #0A0B10 (background)  ·  indigo-ink #0B0822 (deep)  ·  indigo #5B5BF0 (primary)
·  light indigo #8B97FF (accent/highlight)  ·  warm paper #F5F2EA (use only as a rare faint light)
Indigo and its ramp + neutral ONLY. No other hue anywhere.
```

**Negative block (always pass / append "do NOT include"):**

```text
text, letters, words, numbers, captions, watermark, logo, signature;
people, faces, hands, bodies, real objects, devices, screens, UI;
photograph, photorealism, stock-photo look;
any green, red, orange, teal, purple, yellow, pink — no third hue, no rainbow gradient;
bevels, glossy 3D, heavy lens flare, busy collage, clutter.
```

**Aspect-ratio map (match the canvas you're feeding):**

| Canvas | Ratio | Pixels |
| --- | --- | --- |
| IG square | 1:1 | 1080 × 1080 |
| IG portrait / launch tile | 4:5 | 1080 × 1350 |
| Story / reel backdrop | 9:16 | 1080 × 1920 |
| Slide / landing hero | 16:9 | 1920 × 1080 |
| Print page | A4 | 2480 × 3508 @300dpi |

**Fill-in template (one message → one backdrop):**

```text
[STYLE PREAMBLE]   ← paste verbatim, §4
[PALETTE LITERALS] ← paste verbatim, §4
BRIEF: [[one line of mood — e.g. "deep indigo light pulling toward an off-center notch, calm,
        space for a lowercase headline lower-left"]]
ASPECT: [[4:5]]
NEGATIVE: [NEGATIVE BLOCK]   ← paste verbatim, §4
```

### Treatment (Mode B) — the indigo duotone

For representational photography you don't *prompt* — you **treat**. `tools/treat-stock.mjs` maps
the photo's luminance onto the indigo ramp via an SVG `feComponentTransfer` (shadows → mids →
highlights), so every pixel lands on one hue. Two ramps:

- **dark** (default, over ink) — 4-stop for richer gradation: `#0A0B10` → `#0B0822` → `#5B5BF0` → `#8B97FF`
  - `feFuncR "0.039 0.043 0.357 0.545"` · `feFuncG "0.043 0.031 0.357 0.592"` · `feFuncB "0.063 0.133 0.941 1.0"`
- **paper** (high-key, light surfaces): `#5B5BF0` → `#8B97FF` → `#F5F2EA`
  - `feFuncR "0.357 0.545 0.961"` · `feFuncG "0.357 0.592 0.949"` · `feFuncB "0.941 1.0 0.918"`

Pick sources that **duotone well**: high-contrast, dramatic light, simple composition (a server
wall, a backlit keyboard, a dev at monitors in the dark) read premium; flat, evenly-lit group
photos read amateur no matter the ramp. Harvest several and look — `HARVEST=10 npm run fetch:stock`
then `PICK_<name>=N`.

The **negative block above is for Mode A.** Mode B *keeps* every line of it **except** the
people/photo line — a real photo of people building is the whole point — because the duotone + the
§2 guardrails do the policing instead. What never changes: one hue, no added text, no logo, no third
colour. (Note: over a high-key *paper* duotone, dark display type needs a light text-shadow halo to
stay legible — see the `.poster.paper .headline` rule in `posters.html`.)

## 5. Nano Banana 2 / Gemini 3 Pro Image — how to run it

Chosen because it's **API-first** (slots into the repo's Claude-API + prompt-cache workflow) and
strong at **reference consistency**, so a series of tiles holds the same feel. Controls that turn
"a nice image" into "an on-brand series":

| Control | What to do | Why |
| --- | --- | --- |
| **Style preamble** | Send §4 preamble on *every* call (system/preface). | A stable visual prior, same idea as `00_SYSTEM_PROMPT.md`. |
| **Reference images** | Attach 3–6 approved "north-star" backdrops as references. | Locks palette + feel; this is how consistency is actually held, not luck. |
| **Seed** | Lock one seed per series; vary the BRIEF, keep the seed. | Same family across a launch grid; change seed only for a new look. |
| **Negative** | Always pass the §4 negative block. | Stops text, people, and third-hue drift at the source. |
| **Aspect** | Set true ratio per §4 — generate at target size. | No re-crop surprises behind a 4:5 tile. |

**Pairing with Claude (the leverage move):** keep the §4 style preamble + palette + negative block in
a **prompt-cached** Claude system prompt; feed it a one-line BRIEF and let it expand to the full
image prompt, then call `gemini-3-pro-image`. One brief → a finished, on-brand image prompt → the
backdrop. (See the `claude-api` skill for caching; mirrors the two-model pattern in
`SMALL_MODELS_GUIDE.md §6` — small/cheap does volume, you art-direct.)

**North-star reference set (suggested, optional):** once you have 3–6 images you trust, save them as
the canonical references — e.g. `collateral/assets/image-refs/` — and pass them on every call. Build
this set once; reuse it forever. Use the shipped **`collateral/launch-grid.html`** as the
look to match: a good AI backdrop should be indistinguishable in palette and mood from those
cinematic tiles when it sits beside them. *(The ref folder isn't created here — it's the first thing
to make when you start generating.)*

## 5b. Engines — Recraft (paid), Gemini, procedural · and the brand treatment

`tools/gen-backdrops.mjs` is now **provider-agnostic** — pick the engine with `PROVIDER` and the §4
prompt kit, the procedural floor, and the hard-block fallback are all shared. Keys live in the
gitignored **`.env.local`** (loaded via `--env-file-if-exists`).

| Asset | Engine | Why |
| --- | --- | --- |
| Abstract backdrop — signature restrained-dark | **procedural** (`_backdrop-art.mjs`) | deterministic, exact hex, structured (contour/dot/planes) |
| Abstract backdrop — smooth glow | **Recraft** (`gen:recraft` + brand `style_id`) → **`treat-image`** | flat + subject-free via a custom style; duotone tames the glow |
| Brand-treated photo | **`treat:stock`** duotone | exact hue, no generative drift |
| Logo / icon / spot vector | **Recraft `gen:vector`** (native SVG) | true editable paths; never the real lockup |
| Upscale / cutout finish | **`recraft:finish`** (`crispUpscale` / `removeBackground`) | sharpen / isolate without inventing hue |
| Exploration / multi-ref edit | **Gemini** (billing-enabled) | widest aspect ratios + reference fusion; SynthID watermark → prefer Recraft for shipped art |

**Recraft reality (validated live 2026-06):** stock styles always render a **subject**, so a flat
backdrop needs a **custom `style_id`** trained on our own flat backdrops (`npm run recraft:style` →
paste `RECRAFT_STYLE_ID` into `.env.local`). Even then Recraft skews **bright/saturated**, so for the
restrained signature look run the output through the brand duotone:

```bash
PRE='brightness(0.4) contrast(1.3)' node tools/treat-image.mjs backdrop.png out.png   # → restrained dark indigo
```

`treat-image.mjs` and `treat-stock.mjs` share the ramp in `tools/_duotone.mjs` — a luminance →
indigo-ramp map, so **no third hue survives** on any image you pass it. The pipeline:
**generate (procedural / Recraft) → treat (duotone) → composite under the §3 HTML type stack.**

## 6. Imagery QA — the eyes-only gate

Run this on the **generated image alone**, before you composite it. (This lives here; it does not
change `QA_CHECKLIST.md`.)

**Hard fails — regenerate, don't ship:**

- any readable text / letters / numbers in the image
- a person, face, hand, or a real object / device / stock-photo look
- a third hue (teal/purple/green/red/orange) or a rainbow gradient
- the mark or any logo generated *into* the image
- too busy / no clear area for a headline to land

**Then composite-check (image + the HTML on top):**

- `S17` vignette + `S16` grain applied → headline, proof, and footer all read clearly
- still **one hue** across the full stack (image + treatment + type)
- the mark sits in HTML on top, flat and exact — never in the pixels; the `S15` halo is *behind* it
- sits naturally beside the **Launch Grid** tiles (same palette, same cinematic mood)
- if it's bound for a brochure PDF, the backdrop is an inline data URI (see §3 export gotcha)
- passes the 10-second eyes-only test from `QA_CHECKLIST.md`: *"any color that isn't indigo or
  neutral? big lowercase headline with one italic word? mark clean and flat? feels like a sharp spec
  sheet, not a template?"*

**Render and look** — same discipline as everywhere in this kit; export the composite with `cd tools
&& npm run export` (or screenshot it). A model will *say* "indigo only" and emit a teal wash. Looking
is the only reliable check.

## 7. Where this goes next (what's built · what's next)

> **Update (provider phases, 2026-06):** the generator described below is now a **provider
> abstraction** — see **§5b**. Recraft is wired as a paid engine (with a brand `style_id`),
> native-vector icons ship via `gen:vector`, finishing via `recraft:finish`, and any image can be
> forced on-brand with `treat-image`. The Gemini-cascade description below still holds as the
> default provider.

**Built so far:** the **`S20` image-layer** snippet (`recipes/snippets.src.md`), the composite in
`collateral/posters.html` (**all 7 posters carry a real backdrop** — every `[data-export]` has an
`.img-layer`), and the generator `tools/gen-backdrops.mjs`. The generator is now **robust**: it tries
a **cascade** of image models (`gemini-3-pro-image` → `gemini-2.5-flash-image` →
`gemini-3.1-flash-image` → `imagen-4`), backs off once on a transient 429, and on a **hard free-tier
block** auto-falls-back to the procedural generator so no poster is ever left without an image. The
art itself (briefs + the procedural SVG textures) is one source of truth in `tools/_backdrop-art.mjs`,
shared with `tools/gen-backdrops-proc.mjs` (same filenames, so a billed key is a drop-in re-run).

> **Reality check (2026-06):** *every* Gemini/Imagen image model is **paid-only** on a free key —
> `gemini-3-pro-image` returns `429 / limit: 0`; Imagen returns *"only available on paid plans."* So
> what ships today is the on-brand **procedural** Mode-A set; enable billing on the key's Google Cloud
> project and `npm run gen:backdrops` swaps in real AI art with zero other changes.

The **Mode B duotone pipeline** is also built: `tools/fetch-stock.mjs` (licensed sources — Pexels,
or keyless Wikimedia Commons → `tools/stock-sources/`, with provenance in `backdrops/SOURCES.md`)
and `tools/treat-stock.mjs` (`npm run treat:stock` → indigo duotone, §4 ramps), wired into
`posters.html` so `program` + `masterclass` carry real treated photos (Mode B) while the other five
(`seats`, `build`, `why`, `proof`, `enquiry`) carry abstract Mode-A textures — the hybrid policy of
§2, shipped across the whole set.

Still open:

- `recipes/ai-image.md` — an image-only recipe (BRIEF → finished image prompt, §4 productized)
- `recipes/composite-canvas.md` — generalise the `posters.html` composite to any canvas (the §3 stack)
- ~5 lines added to `QA_CHECKLIST.md` for the §6 hard-fails
- a content-studio `IMAGE BRIEF` field (in `prompts/`) so one brief yields **copy + a matching
  backdrop** — the full "words and visuals from one brief" blend

Until then: use §4 + §5 by hand, gate with §6, composite with the §3 stack.

---
*Golden rule: the AI makes the mood, never the message. It generates an abstract indigo backdrop and
nothing else — no words, no mark, no people. The words, the numbers, and the mark stay in HTML on
top. Keep that division and AI imagery deepens the brand instead of diluting it.*
