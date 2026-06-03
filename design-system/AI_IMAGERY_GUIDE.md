# Generating on-brand AI IMAGERY (and blending it with the design system)

The visual twin of `SMALL_MODELS_GUIDE.md`. That one gets a small model to assemble **HTML
artifacts**; this one adds a new, deliberately narrow capability: using an AI image model to generate
an **abstract indigo backdrop layer** that sits *behind* the existing type and mark — so a hero tile
or a story can carry atmosphere and depth without breaking the brand.

The whole strategy in one line: **the AI generates only the imagery layer; the words, the numbers,
and the mark stay in HTML/CSS on top of it.** That single rule is what keeps the FACTS-block
anti-hallucination guarantee intact and the mark untouched, while still letting the brand breathe.

> Decision baked in: imagery is **abstract, indigo-monochrome, on-brand only** — never photoreal
> people, objects, or stock scenes. The standard generator is **Nano Banana 2 (Gemini 3 Pro Image)**.

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

## 2. The brand stance — this extends the rules, it doesn't break them

The system says *"No photography. No stock photos. Imagery replaced by the mark, by data, or by
editorial type"* (`recipes/00_SYSTEM_PROMPT.md`, `README.md §3`). AI imagery lives inside that rule,
not against it, because what we generate is **abstract texture, not a photograph**:

**Allowed (and only this):** abstract indigo-monochrome fields — volumetric light, fine particle
fields, topographic contours, soft geometric planes, the square-feed-card-with-a-notch motif
abstracted into shape. Dark by default. One hue plus its ramp.

**Never generated into the image:**
- **text, letters, words, numbers** — they hallucinate facts and never match Manrope/Mono anyway
- **the mark / any logo / watermark** — the mark stays exact HTML/SVG on top, untouched
- **people, faces, hands, real objects, devices** — that's the "no stock photos" line
- **a third hue** — no teal, no purple drift, no green/red/orange; indigo + neutral only
- **bevels, heavy lens flare, busy collage** — calm, editorial, generous negative space

If you can read a word in it, or point to a person in it, it failed. Re-generate.

## 3. The blend — a composite layer model

The "integration" is just **z-order** — and most of the layers already exist as snippets. The
generated image is the *bottom* layer; the treatment that makes it legible and on-brand is **the same
`S15`–`S17` cinematic toolkit** the rest of the system uses; the type and mark are the usual
`S4`/`S5`/`S6`/`S2` snippets on top. Nothing about the current recipes changes — the image slips in
*below* the `S14` frame's background, exactly where `S11`/`S17` normally sit.

```
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

```
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

```
ink #0A0B10 (background)  ·  indigo-ink #0B0822 (deep)  ·  indigo #5B5BF0 (primary)
·  light indigo #8B97FF (accent/highlight)  ·  warm paper #F5F2EA (use only as a rare faint light)
Indigo and its ramp + neutral ONLY. No other hue anywhere.
```

**Negative block (always pass / append "do NOT include"):**

```
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

```
[STYLE PREAMBLE]   ← paste verbatim, §4
[PALETTE LITERALS] ← paste verbatim, §4
BRIEF: [[one line of mood — e.g. "deep indigo light pulling toward an off-center notch, calm,
        space for a lowercase headline lower-left"]]
ASPECT: [[4:5]]
NEGATIVE: [NEGATIVE BLOCK]   ← paste verbatim, §4
```

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
this set once; reuse it forever. Use the shipped **`collateral/Eduflick Launch Grid.html`** as the
look to match: a good AI backdrop should be indistinguishable in palette and mood from those
cinematic tiles when it sits beside them. *(The ref folder isn't created here — it's the first thing
to make when you start generating.)*

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

## 7. Where this goes next (future — not built here)

This guide is the research + the reusable prompt kit. When the team is ready to wire imagery into the
assemble-don't-invent pipeline the way recipes are today, the next step is:

- `recipes/ai-image.md` — an image-only recipe (BRIEF → finished image prompt, §4 productized)
- `recipes/composite-canvas.md` — layers a generated image behind a canvas, then `S17`+`S16`+`S15`
  over it and the type on top (the §3 stack)
- a small **`S20` image-layer** snippet in `recipes/snippets.md` — just the `.img-layer` wrapper from
  §3 (the cinematic treatment it sits under, `S15`–`S17`/`S19`, already ships)
- ~5 lines added to `QA_CHECKLIST.md` for the §6 hard-fails
- a content-studio `IMAGE BRIEF` field (in `prompts/`) so one brief yields **copy + a matching
  backdrop** — the full "words and visuals from one brief" blend

Until then: use §4 + §5 by hand, gate with §6, composite with the §3 stack.

---
*Golden rule: the AI makes the mood, never the message. It generates an abstract indigo backdrop and
nothing else — no words, no mark, no people. The words, the numbers, and the mark stay in HTML on
top. Keep that division and AI imagery deepens the brand instead of diluting it.*
