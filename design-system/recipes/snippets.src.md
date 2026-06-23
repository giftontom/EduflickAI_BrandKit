# Snippets — the parts bin (copy verbatim, change only text)

Pre-approved, on-brand HTML/CSS blocks. A model assembles these; it does not invent alternatives.
Each carries correct brand values **inline** so it survives being copied alone. Paste this whole
file into the model's context alongside `00_SYSTEM_PROMPT.md`.

> Surfaces: blocks are written for the **dark** theme. For **paper** theme, swap bg `{{ink}}→{{paper}}`,
> card `{{ink-2}}→#FFF`, text `{{paper}}→{{ink}}`, body `{{paper-dim}}→#3A3D47`, hairline
> `rgba(245,242,234,.08)→rgba(10,11,16,.08)`. Indigo and the serif accent stay the same.

---

## S0 · `:root` token block (paste once near the top of `<style>`)

```css
:root{
  --i-500:{{i-500}}; --i-400:{{i-400}}; --i-300:{{i-300}}; --i-700:{{i-700}}; --i-ink:{{i-ink}};
  --paper:{{paper}}; --paper-dim:{{paper-dim}}; --ink:{{ink}}; --ink-2:{{ink-2}}; --ink-3:{{ink-3}};
  --muted:{{slate-500}}; --warn:{{warn}}; --success:{{success}};
  --line:rgba(245,242,234,0.08); --line-2:rgba(245,242,234,0.16);
  --shadow-brand:0 8px 32px -8px rgba(91,91,240,0.35);
  --ease-out:cubic-bezier(0.16,1,0.3,1);
  --font-d:'Manrope',sans-serif; --font-s:'Instrument Serif',serif; --font-m:'JetBrains Mono',monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font-d);background:var(--ink);color:var(--paper);-webkit-font-smoothing:antialiased}
```

## S1 · HEAD (mandatory — fonts + favicon)

```html
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{{fonts-link}}" rel="stylesheet">
```

## S2 · The mark (exact path — never alter geometry/rotation/fill-to-third-hue)

```html
<!-- fill: {{i-500}} indigo (default) · {{paper}} paper (on dark/indigo) · {{i-ink}} ink (on paper) -->
<svg viewBox="0 0 180 180" width="48" height="48" aria-hidden="true">
  <path d="{{mark-path}}" fill="{{i-500}}"/>
</svg>
```

## S3 · Wordmark (build in HTML, never an image)

```html
<span style="font-family:'Manrope';font-weight:800;letter-spacing:-0.045em;text-transform:lowercase;line-height:1">eduflick<i style="font-style:normal;color:{{i-300}};margin-left:0.1em">AI</i></span>
```

## S4 · Eyebrow / mono label (UPPERCASE)

```html
<span style="font-family:'JetBrains Mono';font-size:11px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:{{i-300}}">COHORT 01</span>
```

With the editorial leading rule:

```html
<div style="font-family:'JetBrains Mono';font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:{{slate-500}};display:flex;align-items:center;gap:12px">
  <span style="width:22px;height:1px;background:{{i-300}}"></span>00 · the cohort
</div>
```

## S5 · Display headline with one serif accent word (lowercase + one `<em>`)

```html
<h1 style="font-family:'Manrope';font-weight:900;font-size:64px;letter-spacing:-0.05em;line-height:0.9;text-transform:lowercase;color:{{paper}}">
  stop learning ai theory. ship <em style="font-family:'Instrument Serif';font-style:italic;font-weight:400;color:{{i-300}}">ai products</em>.
</h1>
```

## S6 · Body + serif lead

```html
<p style="font-family:'Manrope';font-weight:500;font-size:16px;line-height:1.6;color:{{paper-dim}};max-width:62ch">12 weeks, in-person in Trivandrum. 3 deployed projects. 20 seats.</p>
<p style="font-family:'Instrument Serif';font-style:italic;font-size:21px;line-height:1.35;color:{{paper}}">a feed for thinking.</p>
```

## S7 · Buttons (primary + ghost, with hover lift + brand glow)

```html
<style>
  .btn{font-family:'Manrope';font-weight:700;font-size:15px;letter-spacing:-0.01em;border:0;
    border-radius:999px;padding:14px 26px;cursor:pointer;text-decoration:none;display:inline-block;
    transition:transform .15s var(--ease-out),box-shadow .15s,background .15s}
  .btn-primary{background:{{i-500}};color:{{paper}}}
  .btn-primary:hover{transform:translateY(-2px);background:{{i-400}};box-shadow:0 8px 32px -8px rgba(91,91,240,.35)}
  .btn-ghost{background:transparent;color:{{paper}};border:1px solid rgba(245,242,234,0.16)}
  .btn-ghost:hover{transform:translateY(-2px);border-color:{{i-300}}}
</style>
<a class="btn btn-primary" href="#">apply →</a>
<a class="btn btn-ghost" href="#">see the curriculum</a>
```

## S8 · Card (dark) and stat card

```html
<div style="background:{{ink-2}};border:1px solid rgba(245,242,234,0.08);border-radius:18px;padding:28px">
  <span style="font-family:'JetBrains Mono';font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:{{slate-500}}">RAG · WEEK 08</span>
  <h3 style="font-family:'Manrope';font-weight:800;font-size:28px;letter-spacing:-0.025em;color:{{paper}};margin-top:10px">a chatbot that answers from your docs</h3>
</div>

<!-- stat card -->
<div style="background:{{ink-2}};border:1px solid rgba(245,242,234,0.08);border-radius:18px;padding:24px 28px">
  <div style="font-family:'Manrope';font-weight:900;font-size:48px;letter-spacing:-0.04em;color:{{paper}}">20</div>
  <div style="font-family:'JetBrains Mono';font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:{{slate-500}};margin-top:4px">SEATS · CAPPED</div>
</div>
```

## S9 · Flick / feed card (the product motif)

```html
<div style="background:{{ink-2}};border:1px solid rgba(245,242,234,0.08);border-radius:16px;padding:22px;display:flex;gap:16px;align-items:flex-start">
  <!-- subject tile: serif letter inside a mark-shaped tile -->
  <div style="width:44px;height:44px;border-radius:3px;background:{{i-500}};display:flex;align-items:center;justify-content:center;flex-shrink:0">
    <span style="font-family:'Instrument Serif';font-style:italic;font-size:24px;color:{{paper}}">B</span>
  </div>
  <div>
    <span style="font-family:'JetBrains Mono';font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:{{slate-500}}">LESSON 047 · 60 SECONDS</span>
    <h4 style="font-family:'Manrope';font-weight:800;font-size:18px;letter-spacing:-0.02em;color:{{paper}};text-transform:lowercase;margin-top:6px">how mitosis <em style="font-family:'Instrument Serif';font-style:italic;font-weight:400;color:{{i-300}}">splits</em> a cell</h4>
  </div>
</div>
```

## S10 · Tag / pill · coral scarcity flag (use coral sparingly)

```html
<span style="font-family:'JetBrains Mono';font-size:11px;letter-spacing:0.12em;text-transform:uppercase;padding:6px 12px;border-radius:999px;border:1px solid rgba(245,242,234,0.16);color:{{paper-dim}}">next.js</span>
<!-- scarcity flag (coral = the ONE allowed exception, only here) -->
<span style="font-family:'JetBrains Mono';font-size:11px;letter-spacing:0.12em;text-transform:uppercase;padding:6px 12px;border-radius:999px;background:rgba(255,110,90,0.12);color:{{warn}}">7 of 20 seats left</span>
```

## S11 · Backgrounds & texture

```css
/* faint dot grid (overlay; put on a positioned wrapper) */
.dots::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background-image:radial-gradient(circle,rgba(245,242,234,0.06) 1px,transparent 1px);
  background-size:22px 22px}
/* 40px line grid */
.linegrid::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;opacity:0.06;
  background-image:linear-gradient(rgba(245,242,234,1) 1px,transparent 1px),linear-gradient(90deg,rgba(245,242,234,1) 1px,transparent 1px);
  background-size:40px 40px}
/* indigo hero gradient */
.hero-indigo{background:radial-gradient(140% 100% at 0% 0%,{{i-500}} 0%,{{i-700}} 36%,{{i-ink}} 100%)}
/* brand glow on the mark/hero element */
.glow{filter:drop-shadow(0 8px 48px rgba(91,91,240,0.55))}
```

## S12 · Dashed spec/meta row (editorial hairline)

```html
<div style="display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px dashed rgba(245,242,234,0.16);font-family:'JetBrains Mono';font-size:12px;letter-spacing:0.06em;color:{{paper-dim}}">
  <span style="color:{{slate-500}};text-transform:uppercase;letter-spacing:0.18em">duration</span><span>12 weeks</span>
</div>
```

## S13 · Scale-to-fit preview wrapper (so a true-size canvas is viewable on screen)

```html
<!-- wrap any fixed-px canvas so it fits the viewport while staying true ratio -->
<div style="display:flex;justify-content:center;padding:40px;background:#07080C">
  <div style="transform:scale(0.5);transform-origin:top center"><!-- CANVAS GOES HERE --></div>
</div>
```

## S14 · Canvas frames (build at true pixels)

```html
<!-- IG square 1080×1080 (portrait: height:1350; story/reel: 1080×1920) -->
<div style="position:relative;width:1080px;height:1080px;overflow:hidden;background:{{ink}};
  display:flex;flex-direction:column;justify-content:space-between;padding:96px">
  <!-- eyebrow (S4) / headline (S5) / proof (S6) / footer wordmark (S3) -->
</div>

<!-- Slide 16:9 1920×1080 -->
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:{{ink}};padding:120px">
</div>

<!-- A4 page (print) -->
<style>@page{size:A4;margin:0}</style>
<div style="position:relative;width:794px;min-height:1123px;background:{{paper}};color:{{ink}};padding:72px">
  <!-- paper theme: see header note for token swaps -->
</div>
```

## S15 · Spotlight / halo (cinematic depth — light BEHIND a focal element)

The mark stays flat (never a filter on it). Put the light in a halo *behind* the mark/headline.

```css
.halo{position:absolute;pointer-events:none;border-radius:50%;
  background:radial-gradient(closest-side,rgba(139,151,255,0.5),rgba(110,120,245,0.18) 44%,transparent 72%);filter:blur(8px)}
.focal{position:relative;z-index:1}   /* the mark/headline sits above the halo */
```

```html
<div style="position:relative;display:flex;align-items:center;justify-content:center">
  <div class="halo" style="width:900px;height:900px;left:50%;top:50%;transform:translate(-50%,-50%)"></div>
  <svg class="focal" viewBox="0 0 180 180" width="460" height="460"><path d="{{mark-path}}" fill="{{paper}}"/></svg>
</div>
```

## S16 · Film grain (faint, grayscale — richness + kills gradient banding)

Desaturated noise at ≤5% — it's texture, not a hue. Layer it as the top bg of any surface.

```css
:root{--grain:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")}
.surface::before{content:'';position:absolute;inset:0;pointer-events:none;
  background-image:var(--grain),radial-gradient(circle,rgba(245,242,234,0.05) 1px,transparent 1px);
  background-size:140px 140px,46px 46px}      /* grain + faint dot grid; on paper swap dot to rgba(10,11,16,0.05) */
```

## S17 · Cinematic surface (directional gradient + vignette)

Offset the gradient hot-spot for *directional* light; add a vignette to focus the eye. One hue only.

```css
.cine-indigo{background:radial-gradient(130% 160% at 50% 30%,{{i-400}},{{i-600}} 24%,{{i-800}} 56%,{{i-ink}} 100%)}
.cine-ink   {background:radial-gradient(120% 130% at 82% 10%,#241E52,#15122F 32%,{{ink}} 64%)}
.cine-paper {background:radial-gradient(120% 150% at 24% 12%,#EFEAFE,#F2EEE5 44%,{{paper-2}} 100%)}
.vignette::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(135% 125% at 50% 40%,transparent 48%,rgba(7,5,22,0.55) 100%)}  /* paper: rgba(10,11,16,0.07) */
```

## S18 · Footer lockup (consistent brand attribution)

Small; on covers keep it ≥135px above the frame bottom so the 1:1 grid crop never cuts it.

```html
<div style="position:absolute;left:0;right:0;bottom:150px;display:flex;align-items:center;justify-content:center;gap:14px;color:rgba(245,242,234,0.46)">
  <svg viewBox="0 0 180 180" width="34" height="34"><path d="{{mark-path}}" fill="currentColor"/></svg>
  <span style="font-family:'Manrope';font-weight:800;letter-spacing:-0.03em;text-transform:lowercase;font-size:30px">eduflick<i style="font-style:normal;margin-left:0.22em">AI</i></span>
</div>
```

## S19 · Glass card + deck-slide skeleton

Frosted card: translucent fill + hairline + inset highlight + brand glow.

```css
.glass{background:rgba(20,18,52,0.45);backdrop-filter:blur(12px);border:1px solid rgba(245,242,234,0.16);border-radius:18px;
  box-shadow:0 20px 50px -18px rgba(0,0,0,0.6),inset 0 1px 0 rgba(245,242,234,0.16),0 8px 32px -8px rgba(91,91,240,0.45)}
```

Carousel **deck slide** — eyebrow + slide-index → motif + headline + support → footer + cue:

```html
<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:150px 100px">
  <div style="display:flex;justify-content:space-between"><span class="eyebrow">01 · THE GAP</span><span class="mono">01 · 07</span></div>
  <div><!-- motif (mark/stat/spark/bars/nodes…) --><h2>one <em>serif</em> word</h2><p>support, ≤ 22 words</p></div>
  <div style="display:flex;justify-content:space-between"><!-- S18 footer --><span class="mono">swipe →</span></div>
</div>
```

## S20 · AI image backdrop layer (composite — image UNDER the type/mark)

A generated indigo backdrop on the bottom; S16 grain + S17 vignette + S15 halo sit OVER it; the type
and mark stay in HTML on top. No text/logo/people in the image. Generate with
`../../tools/gen-backdrops.mjs` (Nano Banana / `gemini-3-pro-image`; needs a billing-enabled key) or
the procedural fallback `../../tools/gen-backdrops-proc.mjs`. See `../AI_IMAGERY_GUIDE.md`.

```css
.img-layer{position:absolute;inset:0;z-index:0;overflow:hidden}
.img-layer img{width:100%;height:100%;object-fit:cover;display:block}
/* legibility scrim — darken top + bottom; headline zone stays open (paper theme → swap to paper rgba) */
.scrim{position:absolute;inset:0;z-index:2;pointer-events:none;
  background:linear-gradient(180deg,rgba(7,5,22,0.46) 0%,rgba(7,5,22,0.05) 24%,rgba(7,5,22,0.04) 54%,rgba(7,5,22,0.72) 100%)}
```

```html
<div class="img-layer"><img src="assets/backdrops/NAME.png" alt=""></div><div class="scrim"></div>
<!-- then S16 grain · S17 vignette · S15 halo · the S4/S5/S6/S2 content stack — all OVER the image -->
```

## S21 · Browser / app mockup frame (show the real thing you build)

Window chrome wrapping an **HTML-built** faux UI — never a screenshot, so no third hue and no
invented text leaks in. Dots are neutral (one-hue rule). Swap the `.ui` body per project:
a **SaaS dashboard** (bars below), a **RAG chat** thread, or **agentic nodes**.

```html
<div style="border-radius:14px;overflow:hidden;background:{{ink-2}};border:1px solid rgba(245,242,234,0.10);box-shadow:0 30px 80px -30px rgba(0,0,0,0.7),0 8px 32px -8px rgba(91,91,240,0.35)">
  <div style="display:flex;align-items:center;gap:8px;padding:13px 16px;background:{{ink-3}};border-bottom:1px solid rgba(245,242,234,0.08)">
    <span style="width:11px;height:11px;border-radius:50%;background:rgba(245,242,234,0.22)"></span>
    <span style="width:11px;height:11px;border-radius:50%;background:rgba(245,242,234,0.16)"></span>
    <span style="width:11px;height:11px;border-radius:50%;background:rgba(245,242,234,0.10)"></span>
    <span style="margin-left:14px;font-family:'JetBrains Mono';font-size:11px;color:{{slate-500}}">localhost:3000 — saas-dashboard</span>
  </div>
  <div style="padding:26px 24px;display:flex;flex-direction:column;gap:18px">
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <span style="font-family:'Manrope';font-weight:800;font-size:22px;letter-spacing:-0.02em;color:{{paper}}">revenue</span>
      <span style="font-family:'JetBrains Mono';font-size:12px;color:{{i-300}}">+18.4% ↑</span>
    </div>
    <div style="height:130px;display:flex;align-items:flex-end;gap:12px">
      <!-- bars: indigo gradient, varying heights -->
      <span style="flex:1;height:46%;background:linear-gradient(180deg,{{i-300}},{{i-500}});border-radius:5px 5px 0 0"></span>
      <span style="flex:1;height:64%;background:linear-gradient(180deg,{{i-300}},{{i-500}});border-radius:5px 5px 0 0"></span>
      <span style="flex:1;height:38%;background:linear-gradient(180deg,{{i-300}},{{i-500}});border-radius:5px 5px 0 0"></span>
      <span style="flex:1;height:82%;background:linear-gradient(180deg,{{i-300}},{{i-500}});border-radius:5px 5px 0 0"></span>
      <span style="flex:1;height:70%;background:linear-gradient(180deg,{{i-300}},{{i-500}});border-radius:5px 5px 0 0"></span>
      <span style="flex:1;height:100%;background:linear-gradient(180deg,{{paper}},{{i-300}});border-radius:5px 5px 0 0"></span>
    </div>
    <div style="display:flex;gap:12px">
      <div style="flex:1;background:rgba(245,242,234,0.04);border:1px solid rgba(245,242,234,0.08);border-radius:12px;padding:14px 16px">
        <div style="font-family:'Manrope';font-weight:900;font-size:26px;color:{{paper}}">2,481</div>
        <div style="font-family:'JetBrains Mono';font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:{{slate-500}};margin-top:2px">users</div>
      </div>
      <div style="flex:1;background:rgba(245,242,234,0.04);border:1px solid rgba(245,242,234,0.08);border-radius:12px;padding:14px 16px">
        <div style="font-family:'Manrope';font-weight:900;font-size:26px;color:{{paper}}">99.9%</div>
        <div style="font-family:'JetBrains Mono';font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:{{slate-500}};margin-top:2px">uptime</div>
      </div>
    </div>
  </div>
</div>
<!-- RAG-chat body variant (drop in place of the dashboard body):
<div style="padding:22px;display:flex;flex-direction:column;gap:12px">
  <div style="align-self:flex-end;max-width:78%;background:{{i-500}};color:{{paper}};border-radius:14px 14px 4px 14px;padding:12px 16px;font-family:'Manrope';font-size:15px">summarise our refund policy</div>
  <div style="align-self:flex-start;max-width:86%;background:rgba(245,242,234,0.05);border:1px solid rgba(245,242,234,0.08);color:{{paper-dim}};border-radius:14px 14px 14px 4px;padding:12px 16px;font-family:'Manrope';font-size:15px">Refunds are issued within 14 days… <span style="color:{{i-300}};font-family:'JetBrains Mono';font-size:11px">[policy.pdf · p.3]</span></div>
</div> -->
```

## S22 · Achievement badge / ribbon + outcome block (proof — real facts only)

The skill.mount "PLACED" device, on-brand. **No invented alumni/placements** — the cohort hasn't
run. Use real outcomes; ship the testimonial as a labelled template until a real member exists.

```html
<!-- the badge -->
<span style="display:inline-flex;align-items:center;gap:10px;font-family:'Manrope';font-weight:900;font-size:18px;letter-spacing:0.04em;text-transform:uppercase;color:{{ink}};background:{{i-300}};border-radius:9px;padding:10px 18px;box-shadow:0 10px 34px -10px rgba(91,91,240,0.55)">
  <svg viewBox="0 0 180 180" width="18" height="18"><path d="{{mark-path}}" fill="{{ink}}"/></svg> deployed
</span>
<!-- the real outcome (FACTS) -->
<p style="font-family:'Manrope';font-weight:700;font-size:24px;letter-spacing:-0.02em;color:{{paper}};margin-top:18px">by week 12 you ship <em style="font-family:'Instrument Serif';font-style:italic;font-weight:400;color:{{i-300}}">three real</em> ai products.</p>
<!-- TESTIMONIAL TEMPLATE — fill ONLY with a real Cohort 01 member; until then leave the placeholders -->
<figure style="display:flex;gap:18px;align-items:center;margin-top:26px">
  <div style="width:72px;height:72px;border-radius:50%;background:{{ink-2}};border:1px solid rgba(245,242,234,0.12);flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden">
    <!-- duotone photo cut-out goes here (treat-stock.mjs); placeholder = mark -->
    <svg viewBox="0 0 180 180" width="30" height="30"><path d="{{mark-path}}" fill="{{i-300}}"/></svg>
  </div>
  <figcaption>
    <p style="font-family:'Instrument Serif';font-style:italic;font-size:20px;line-height:1.3;color:{{paper}}">“[[QUOTE — real cohort member only]]”</p>
    <p style="font-family:'JetBrains Mono';font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:{{slate-500}};margin-top:8px">[[STUDENT NAME]] · cohort 01</p>
  </figcaption>
</figure>
```

## S23 · Feature-point (icon + bold + caption) — the explainer infographic row

Repeat 3–4×. Swap the inline icon path per point (check / pin / star / clock). One hue: indigo tile.

```html
<div style="display:flex;gap:16px;align-items:flex-start">
  <span style="width:46px;height:46px;border-radius:12px;background:rgba(139,151,255,0.12);border:1px solid rgba(139,151,255,0.22);display:flex;align-items:center;justify-content:center;flex-shrink:0">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="{{i-300}}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  </span>
  <div>
    <p style="font-family:'Manrope';font-weight:800;font-size:18px;letter-spacing:-0.01em;color:{{paper}}">ship 3 deployed projects</p>
    <p style="font-family:'Manrope';font-weight:500;font-size:14px;line-height:1.5;color:{{paper-dim}};margin-top:3px">a SaaS dashboard, a RAG chatbot, an agentic platform.</p>
  </div>
</div>
<!-- icon paths: pin "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"+<circle cx=12 cy=10 r=3/> ·
     clock <circle cx=12 cy=12 r=9/>+"M12 7v5l3 2" · star "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z" -->
```

## S24 · Mark-burst motif (the playful hero — energy without a mascot)

An oversized flat mark over a radiating indigo sunburst. Strictly one hue; the mark stays flat
(the light/rays are behind it, never a filter on it). The playful register's hero device.

```html
<div style="position:relative;display:flex;align-items:center;justify-content:center;width:760px;height:760px">
  <div style="position:absolute;inset:0;border-radius:50%;
    background:repeating-conic-gradient(from 0deg, rgba(139,151,255,0.18) 0deg 5deg, transparent 5deg 17deg);
    -webkit-mask:radial-gradient(closest-side, transparent 28%, #000 44%, transparent 80%);
    mask:radial-gradient(closest-side, transparent 28%, #000 44%, transparent 80%)"></div>
  <div style="position:absolute;width:520px;height:520px;border-radius:50%;background:radial-gradient(closest-side,rgba(139,151,255,0.45),transparent 70%);filter:blur(8px)"></div>
  <svg viewBox="0 0 180 180" width="300" height="300" style="position:relative;z-index:1"><path d="{{mark-path}}" fill="{{paper}}"/></svg>
</div>
```

## S25 · Poll / quiz block (story engagement device)

The interactive device from the references (entri / IIT / skill.mount). Bake this on-brand card into
a **9:16 story** (`1080×1920`); for an organic story you can also overlay a **native IG poll sticker**
on this zone (native = actually interactive). Keep it in the story's safe area (clear of the top ~250px
and bottom ~250px IG chrome). Options are styled pills, not real buttons.

```html
<div style="background:rgba(20,18,52,0.55);backdrop-filter:blur(10px);border:1px solid rgba(245,242,234,0.14);border-radius:22px;padding:26px 24px;box-shadow:0 20px 50px -18px rgba(0,0,0,0.6)">
  <p style="font-family:'JetBrains Mono';font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:{{i-300}};margin:0 0 16px">be honest —</p>
  <div style="display:flex;flex-direction:column;gap:12px">
    <div style="font-family:'Manrope';font-weight:700;font-size:21px;color:{{paper}};background:rgba(245,242,234,0.06);border:1px solid rgba(245,242,234,0.16);border-radius:14px;padding:16px 22px">not yet</div>
    <div style="font-family:'Manrope';font-weight:700;font-size:21px;color:{{paper}};background:rgba(245,242,234,0.06);border:1px solid rgba(245,242,234,0.16);border-radius:14px;padding:16px 22px">i'm getting there</div>
  </div>
</div>
```

---
**Assembly order for most canvases:** frame (S14) → background texture (S11) → eyebrow (S4) →
headline with one serif word (S5) → body/proof (S6) → CTA button or scarcity flag (S7/S10) →
footer wordmark + mark (S3/S2). Wrap in S13 to preview.
**For cinematic depth:** swap the flat bg for S17 (directional gradient + vignette), add S16 grain
and an S15 halo behind the focal element, build cards with S19 glass, and sign off with S18.
**For an image backdrop:** drop an S20 `.img-layer` under everything (generated by
`../../tools/gen-backdrops*.mjs`); the cinematic layers and the type stack sit on top, unchanged.
**For the poster archetypes** (see `poster.md`): the *premium* register uses S20 photo/S17 cine +
S5 + S23 feature-points; the *playful* register uses S24 mark-burst or an S21 mockup + big type. The
fusion devices are S21 (mockup), S22 (badge/proof — real facts only), S23 (infographic), S24 (burst).
