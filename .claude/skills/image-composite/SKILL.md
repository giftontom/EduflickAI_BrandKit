---
name: image-composite
description: Combine images with type and graphics the right way — layer a generated or photographic image as a mood-only backdrop BEHIND headlines, numbers, and a logo that stay in crisp HTML/SVG on top, unified by a cinematic treatment (vignette + grain + halo). Includes a brand-neutral generative-image prompt kit (style preamble, palette literals, negative block, aspect map) so AI-generated backdrops stay on-brand and text-free. Use for hero tiles, OG/social cards, story/reel backdrops, section dividers — any "image + graphics" composite.
user-invocable: true
---

# image-composite — image as mood, type as message

The reliable way to mix imagery with graphic design: the **image is the bottom layer and carries
only mood**; everything legible — headline, numbers, logo — stays in **HTML/SVG on top**. The two
are fused by the `design-effects` cinematic treatment, not a hand-rolled scrim. Keep that division
and imagery deepens a design instead of muddying it.

> Golden rule: **the image makes the mood, never the message.** If removing the image changes the
> *meaning*, you're using it wrong. No text, no logo, no faces baked into the pixels.

## The composite (z-order)

```text
.composite
  0  .img-layer  <img>          ← generated/photographic texture (cover) — mood only
  1  .grain  .vignette          ← design-effects: unify + focus (legibility)
  2  .halo                      ← design-effects: light the focal from behind
  3  .content   <h1> <svg logo> ← the message, crisp HTML/SVG, always on top
```

`assets/img-layer.css` is the *only* new CSS (the image wrapper + `.content` z-index). Layers 1–2
are existing `design-effects` classes — don't re-invent the scrim/grain/halo.

## Minimal markup

```html
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="effects.css">      <!-- design-effects -->
<link rel="stylesheet" href="img-layer.css">

<div class="composite canvas canvas--portrait grain vignette">
  <div class="img-layer"><img src="data:image/jpeg;base64,…" alt=""></div>  <!-- inline for PDF! -->
  <div class="halo" style="width:700px;height:700px;left:50%;top:30%;transform:translate(-50%,-50%)"></div>
  <div class="content" style="padding:96px">
    <h1>your <em>headline</em></h1>
    <!-- logo as SVG here, on top -->
  </div>
</div>
```

## Generating the backdrop (any image model)

Use `templates/image-prompt-kit.md`: fill the `{{placeholders}}` from your brand profile once
(brand name, accent name + ramp, mood words), then it's a reusable, model-agnostic prompt that
yields **abstract, single-hue, text-free** backdrops. Always pass the **negative block** (no text,
no people, no second hue) — that's what keeps generations on-brand and caption-safe.

When to generate vs. stay pure CSS: try `design-effects` (gradient + grain + halo) **first** — it's
free, crisp, instantly on-brand, and exports clean. Reach for a generated image only for organic
texture CSS can't synthesize (volumetric fog, real particle fields, fluid/topographic forms), then
layer the same treatment over it so it matches everything else.

## Export-path gotcha (decide before you build — see `reference.md`)

| Export route | Reference the image as… |
| --- | --- |
| `web-to-image` (Playwright) | a normal file path or URL — Playwright shoots the real browser, nothing taints |
| `web-to-pdf` (html2canvas) | an **inline base64 data URI** — a file/remote image taints the canvas and the PDF fails |

## QA the image alone, then the composite

Hard fails (regenerate): readable text/numbers; a person/face/hand/real object/stock look; a second
hue; a logo baked into the image; too busy / no clear area for a headline. Then composite-check:
vignette + grain applied → headline and logo read clearly; still one hue across the whole stack;
logo sits in HTML on top, flat; halo is *behind* the focal, never a filter on it.

Provenance: distilled and de-branded from `design-system/AI_IMAGERY_GUIDE.md` (the z-order layer
model + the generative-image prompt kit), made model-agnostic.
