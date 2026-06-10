# Image-prompt kit (brand-neutral) — one brief → an on-brand backdrop

Generate **only the imagery layer** (an abstract, on-brand texture). The words, numbers, and logo
never go in the image — they stay in HTML on top (see `img-layer.css`). Fill the `{{placeholders}}`
from your brand profile (`tokens.json`) once and reuse.

> Decide this up front and write it down: imagery is **abstract, {{accent-name}}-monochrome,
> mood-only** — not photoreal people/objects/stock scenes (unless your brand explicitly allows
> photography, in which case adapt the preamble + negatives accordingly).

## 1 · Style preamble (paste verbatim on every generation — it's the prior)
```
Abstract generative brand texture for "{{brand-name}}". {{mood-words: e.g. precise, editorial, calm,
premium, minimal, generous negative space}}. Single-hue palette built on {{accent-name}}.
Form vocabulary (use what the brief asks): volumetric {{accent-name}} light in dark space;
a fine particle / dot field; topographic contour lines; soft intersecting geometric planes;
{{optional brand-motif abstracted into pure shape — NOT a logo}}. Faint dot-grid or 40px line-grid
structure, low contrast. Lighting dark and soft, no harsh flare. Composition clean, asymmetric,
with room for text to be added later. This is a BACKGROUND TEXTURE, not a scene and not a photo.
```

## 2 · Palette literals (embed every time — your accent ramp + neutrals)
```
{{ink}} (background)  ·  {{accent-ink}} (deep)  ·  {{accent}} (primary)
·  {{accent-light}} (accent/highlight)  ·  {{paper}} (rare faint light only)
{{accent-name}} and its ramp + neutral ONLY. No other hue anywhere.
```

## 3 · Negative block (always pass / append as "do NOT include")
```
text, letters, words, numbers, captions, watermark, logo, signature;
people, faces, hands, bodies, real objects, devices, screens, UI;
photograph, photorealism, stock-photo look;
any hue outside {{accent-name}} + neutral — no second/third hue, no rainbow gradient;
bevels, glossy 3D, heavy lens flare, busy collage, clutter.
```

## 4 · Aspect-ratio map (generate at the target size — no re-crop surprises)
| Canvas | Ratio | Pixels |
| --- | --- | --- |
| Square | 1:1 | 1080 × 1080 |
| Portrait / feed tile | 4:5 | 1080 × 1350 |
| Story / reel | 9:16 | 1080 × 1920 |
| Slide / hero | 16:9 | 1920 × 1080 |
| OG / link card | 1.91:1 | 1200 × 630 |
| Print page | A4 | 2480 × 3508 @300dpi |

## 5 · Fill-in template (one message → one backdrop)
```
[STYLE PREAMBLE]    ← §1, verbatim
[PALETTE LITERALS]  ← §2, verbatim
BRIEF: {{one line of mood — e.g. "deep accent light pulling toward an off-center focal point, calm,
        space for a lowercase headline lower-left"}}
ASPECT: {{4:5}}
NEGATIVE: [NEGATIVE BLOCK]   ← §3, verbatim
```

## 6 · Consistency controls (any modern image model)
| Control | Do | Why |
| --- | --- | --- |
| Style preamble | send §1 on *every* call | a stable visual prior across a series |
| Reference images | attach 3–6 approved "north-star" backdrops | locks palette + feel (not luck) |
| Seed | lock one seed per series; vary only the BRIEF | a coherent family; change seed for a new look |
| Negative | always pass §3 | stops text/people/second-hue drift at the source |
| Aspect | set the true ratio per §4 | generate at target size |

**Leverage move:** keep §1+§2+§3 in a prompt-cached LLM system prompt; feed it a one-line BRIEF and
let it expand to the full image prompt, then call your image model. One brief → a finished, on-brand
prompt → the backdrop. (Model-agnostic: works with any API-first image model.)
