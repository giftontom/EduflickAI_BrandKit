---
name: poster-design
description: Design a complete, on-brand POSTER SYSTEM — a set of high-impact 4:5 / A4 canvases (hero, product-mockup, explainer, outcome, scarcity, masterclass, enquiry) rather than one-off flyers. Use when asked to design posters, ad creatives, announcement/scarcity/event posters, or a poster campaign for any brand. Encodes a 6–7 archetype × 2 register system, the 7 fusion rules, the 3-layer depth model, and an AI image-backdrop pipeline (Gemini image model → procedural fallback) that puts a real, text-free image behind every poster while type/data/logo stay crisp in HTML on top. Composes design-effects, image-composite and web-to-image.
user-invocable: true
---

# poster-design — an archetype system, not a one-off flyer

A poster reads in one glance from a feed. The difference between "designed" and "templated" is a
**system**: every poster fuses the same six ingredients, varies by **archetype** and **register**, and
sits on a real **image backdrop** with the type, data and logo in crisp HTML on top. This skill is the
method; the brand (palette, mark, voice, FACTS) is data — it reads the same brand profile the other
design skills use (`tokens.css` `--accent` + neutrals, the logo, the imagery stance).

The reference implementation is the Eduflick AI poster set: `design-system/collateral/posters.html`
(7 `[data-export]` sections) → `tools/export-posters.mjs` → `exports/posters/*.png` (1080×1350).

## The fusion idea (from a teardown of strong ed-tech / SaaS ads)

Each poster fuses **text + colour + ONE hero device + proof + a course/product-detail infographic +
ONE CTA**. Miss one and it reads thin; stack two hero devices and it reads busy.

## The 6 archetypes × 2 registers

| Archetype | Register | Hero device | Eduflick export |
| --- | --- | --- | --- |
| hero / cinematic | premium | treated photo **or** cine surface + accent headline | `poster-program` |
| product mockup | playful | browser/app window of a real artifact (`S21`) | `poster-build` |
| explainer / infographic | premium | icon feature-points (`S23`) | `poster-why` |
| outcome / proof | premium | achievement badge + chips (`S22`) — **real facts only** | `poster-proof` |
| scarcity / CTA | premium | number-hero + the one allowed accent flag | `poster-seats` |
| masterclass / hook | playful | photo or mark-burst (`S24`) | `poster-masterclass` |
| (+ enquiry / details) | premium | one-tile spec block + contact CTA | `poster-enquiry` |

- **premium** = restraint + negative space (the SOF / IIT look): one big headline, generous dark space.
- **playful** = scale + a brighter accent field + a mockup or burst, bigger type.
- Two **registers**, never two brands: no mascot, no new hue, the warm/coral accent only for scarcity.

## The 7 fusion rules (every poster obeys)

1. **One hero device** — mockup *or* photo *or* illustration *or* number. Never stacked.
2. **Headline = a hook + one emphasis** — one serif / accent-coloured word, the rest plain.
3. **Proof furniture** — badge / stat / guarantee — **only values that exist in FACTS.** No invented alumni/placements.
4. **A detail infographic** — dashed spec rows *or* icon feature-points carry the real numbers.
5. **One CTA, one hue** — accent + neutral; the scarcity colour on at most one element.
6. **Depth in 3 layers** — field (image backdrop / cine surface) · mid (halo + grain + vignette) · foreground (type + mark).
7. **Register dial** — premium = restraint; playful = scale + brighter field + burst.

## The image backdrop layer (the part people forget)

Every poster gets a **real, text-free image** behind the type — never a flat colour, never a CSS-only
stand-in. Two modes, one hue:

- **Mode A — abstract generative texture** (default): volumetric indigo light, particle field, soft
  notched planes. Used for number-hero / spec-dense / mockup / explainer surfaces.
- **Mode B — brand-treated photography** (narrow exception): a real photo forced onto the accent ramp
  via an SVG duotone (`tools/treat-stock.mjs`). Backdrop-only, one hue, no readable text in source,
  people = atmosphere not testimonial. Used for the hero / masterclass moments.

**The z-order that keeps it legible** (see `.img-layer` / `.scrim` / `.stack` in `posters.html`):
`image (z0) → scrim gradient (z2, darkens the eyebrow + the dense lower band, leaves the headline zone
open) → grain + vignette + halo (z1–3) → content stack (z4)`. **Tune each backdrop to its content
zones**: put the glow where the headline goes; keep the band under spec rows / feature points dark.

### Generating the backdrops — `tools/gen-backdrops.mjs`

A robust pipeline that prefers real AI and degrades gracefully:

1. Builds the prompt = **style preamble + palette literals + a per-poster BRIEF + a hard negative block**
   (no text / people / third hue / photoreal). Briefs and the procedural art live in
   `tools/_backdrop-art.mjs` and are the single source of truth.
2. Tries a **cascade** of image models (`gemini-3-pro-image` → `gemini-2.5-flash-image` →
   `gemini-3.1-flash-image` → `imagen-4` predict); backs off once on a transient 429.
3. On a **hard free-tier block** (`limit: 0` / "only available on paid plans") it stops hammering the
   API and **falls back to the procedural generator** (`renderProcedural`) — same filenames, so a
   billed key later just overwrites them with real AI art. No poster is ever left without an image.

```bash
cd tools
GEMINI_API_KEY=… npm run gen:backdrops          # AI → procedural fallback (Mode-A set)
ONLY=poster-why,poster-proof npm run gen:backdrops
ALL=1 npm run gen:backdrops                       # also the hero/masterclass abstracts
NO_GEMINI=1 npm run gen:backdrops:proc            # procedural only, offline
```

> **Real-Gemini requires a billing-enabled Google Cloud project.** A free-tier `GEMINI_API_KEY`
> returns `429 / limit: 0` for *every* image model (Imagen included) — the fallback is what ships now.

## Workflow

1. **Fill FACTS** — dates / prices / seats / links from the brand's single source. Missing → `[[NEEDS: …]]`; never invent.
2. **Pick archetypes** — choose the set the campaign needs; assign a register to each.
3. **Assemble** — one `[data-export]` section per poster from the recipe + effect classes; one hero device each.
4. **Backdrops** — `npm run gen:backdrops` (AI or procedural); Mode B photos via `fetch:stock` → `treat:stock`.
5. **Render + LOOK** — `npm run export:posters`, then *open every PNG*. A model will claim "legible" and ship mud — looking is the only real check. Adjust the scrim / backdrop dark-band, re-export.
6. **QA** — one hue, one hero, one CTA; FACTS verbatim; mark has a quiet zone; nothing fabricated.

## The one rule that makes a poster look designed

**Discipline beats decoration.** One hue + neutrals, one hero device, one CTA, light as a *halo behind*
the focal (never a filter on the type), generous negative space — held consistently across the whole set.

Provenance: distilled from the Eduflick `design-system` poster system (`recipes/poster.md`,
`recipes/snippets.md` S20–S24) and its AI-imagery guide; brand-neutral, so it works for any brand whose
profile defines an accent, a mark and an imagery stance. Composes **design-effects** (halo/grain/vignette),
**image-composite** (backdrop + type z-order, generative-prompt kit) and **web-to-image** (PNG export).
