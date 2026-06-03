# Building on-brand VISUALS with small models

The visual twin of `../content-studio/SMALL_MODELS_GUIDE.md`. That one is about copy; this one is
about getting a **small/cheap model** (Claude Haiku, GPT-4o-mini, Gemini Flash, local Llama/Mistral)
to output **on-brand HTML artifacts** — Instagram canvases, posters, slides, brochures, web
sections — without the design drifting into generic-AI-template land.

The whole strategy in one line: **the model ASSEMBLES pre-approved snippets and fills text — it
does not invent CSS, colors, fonts, or layout.**

---

## 1. Why small models fail at visual brand work (and the fix)

| Failure you'll see | Why | The fix this kit uses |
| --- | --- | --- |
| Random colors, gradients, a third hue | No brand prior; loves purple/teal | Give exact hexes in `DESIGN_CHEATSHEET.md`; forbid a third hue. Snippets hard-code the palette. |
| System fonts / wrong fonts | Forgets the font link | The HEAD snippet in `recipes/snippets.md` is mandatory; QA checks it. |
| Title Case headlines, no serif accent | Defaults to generic web copy | Casing rule is rule #1; snippets show `lowercase` + one `<em>`. |
| Distorts/recolors/rotates the mark | Tries to "improve" the logo | Paste the exact mark `<path>`; rule: never alter it. |
| Bevels, big drop shadows, rounded blobs, emoji icons | "Modern UI" training bias | Snippets carry the correct flat/hairline/glow look; QA forbids the rest. |
| Wrong canvas size / not true-ratio | Doesn't know IG/A4 dims | Each recipe states exact px + a scaled preview wrapper. |
| Invents a date/price/seat in the art | Same hallucination as copy | Text comes from a FACTS block (reuse the content-studio one). |
| Whole thing looks like a bootstrap template | No layout language | Recipes specify the editorial spec-sheet layout + which snippets to assemble. |

## 2. The seven rules of prompting a small model for visuals

1. **Inline everything.** Paste `DESIGN_CHEATSHEET.md` + the snippets it needs. It can't "open
   `colors_and_type.css`."
2. **Assemble, don't invent.** Hand it the exact HTML/CSS snippets from `recipes/snippets.md` and
   say "use these verbatim; only change the text and the layout order."
3. **One artifact, one canvas, per request.** One IG square. One slide. Not "a 7-slide deck" in
   one shot (do those slide-by-slide, then a contact sheet).
4. **State the canvas in pixels** + give the scaled-preview wrapper so you can eyeball it.
5. **Pin the palette and fonts as literals** in the prompt. Repeat "indigo + neutral only, the 3
   Google fonts only" near the end (recency helps).
6. **Forbid the mark edits explicitly:** "Use this exact `<path>`. Do not change its geometry,
   color, or rotation."
7. **Render and look.** HTML is verifiable — open it (or screenshot it) and run the QA checklist.
   Never ship visuals you haven't rendered.

## 3. The generate → RENDER → inspect → fix loop

```
  ┌─ 1. SYSTEM: recipes/00_SYSTEM_PROMPT.md  (holds DESIGN_CHEATSHEET + the snippet rules)
  ├─ 2. USER:   the recipe (e.g. recipes/instagram-post.md) + FACTS + the text to typeset
  ├─ 3. GEN:    ONE self-contained .html file
  ├─ 4. RENDER: open it in a browser / screenshot it  ← do NOT skip; visuals must be seen
  ├─ 5. CHECK:  run QA_CHECKLIST.md against the rendered result
  ├─ 6. FIX:    name the exact defect ("third hue on the badge → make it indigo")
  └─ 7. SHIP:   passes → export PNG/PDF from the kit
```

Step 4 is the one people skip and shouldn't. A small model will *say* it used indigo and actually
emit `#7C3AED`. Looking is the only reliable check. In a coding agent, screenshot the file; in a
chat UI, paste the HTML into a live preview.

## 4. Reuse the FACTS block (anti-hallucination)
Any real date/price/seat/link **typeset into the art** must come from the FACTS block — same one as
`../content-studio/SMALL_MODELS_GUIDE.md §4`. If it's not in FACTS, the model typesets
`[[NEEDS: …]]` so you catch it before export. Visuals are worse than copy here because a wrong
number rendered into a poster looks *official*.

## 5. Model settings
| Setting | Suggested | Why |
| --- | --- | --- |
| Temperature | 0.2–0.5 | Visual code wants determinism, not creativity. Low temp = it follows the snippets. |
| Max tokens | Generous | A full HTML file is long; don't truncate mid-`<style>`. |
| System / user | Cheat sheet + snippets → system; recipe + FACTS → user | Stable design prior across the session. |
| Output | "Return ONE complete HTML file, nothing before/after the code block" | So you can save+open directly. |

Claude API: put the cheat sheet + snippets in the system prompt and enable **prompt caching** —
you reuse them across every artifact. Haiku handles assembly well at low temp. (See `claude-api` skill.)

## 6. The two-model pattern
- **Small model = the assembler.** Emits the HTML from snippets + FACTS, in volume.
- **You / a bigger model = art director.** Render, run QA, name defects, request targeted fixes.
One render-and-critique pass over a cheap draft beats paying a big model to author from scratch.

## 7. Common defects → one-line fix to send

| Symptom | Fix to send |
| --- | --- |
| A non-indigo color appears | "Replace every color with indigo `#5B5BF0`/`#8B97FF` or neutral. No third hue." |
| Headline is Title Case | "Lowercase the headline. Mono labels stay UPPERCASE." |
| No serif accent word | "Wrap exactly one payoff word in `<em>` (serif italic, `#8B97FF`)." |
| Wrong/sans label font | "Labels and numbers must be JetBrains Mono, UPPERCASE, letter-spacing 0.22em." |
| Mark looks rotated/recolored/glowing | "Use the exact mark `<path>` from the cheat sheet, flat, no transform, no filter." |
| Big drop shadow / bevel | "Remove. Use only the 1px hairline border and the brand glow shadow." |
| Looks like a generic template | "Add a mono section id (e.g. `00 · cohort`), more negative space, hairline dividers." |
| Emoji as an icon | "Replace with a line icon (`assets/icons`) or a serif letter in a 3px mark-tile." |
| Canvas not true ratio | "Set the canvas to exactly [WxH]px; wrap in the scale-to-fit preview div." |
| Glow/filter on the mark | "Remove the filter from the mark. Put the light in a halo *behind* it (S15). The mark stays flat." |
| Tomatrix logo tinted indigo | "Restore the Tomatrix logo to its own colors (use the partners PNG). Never recolor it — the Eduflick mark leads." |
| Wordmark shows lowercase 'ai' | "Wordmark is 'eduflick AI' — uppercase AI; white on dark/indigo, indigo on paper." |

## 8. Batching a set (carousel / deck) without drift
Generate **slide-by-slide / card-by-card** with the *same* system prompt and snippet set, then ask
for a **contact sheet** HTML that embeds each as an `<iframe>` (mirror `slides/index.html`). Render
the contact sheet once — drift shows up instantly when the cards sit side by side. Re-gen only the
odd one out.

## 9. Minimal end-to-end example
> **System:** `recipes/00_SYSTEM_PROMPT.md` (+ the snippets it references)
> **User:** `recipes/instagram-post.md`, FACTS filled + "Square 1:1, paper theme, headline:
> 'ship *AI products*, not theory', eyebrow 'PIONEER COHORT 01', proof '20 seats · 12 weeks'."
> **Model →** one `.html` file.
> **You →** save, open, screenshot. Run `QA_CHECKLIST.md`. Fix the one defect. Export PNG from the
> Instagram Kit.

---

## 10. Cinematic surfaces, the launch grid & pixel-perfect export

Three things the kit added — the same **assemble-don't-invent** rule applies to all of them.

**Cinematic surfaces (`snippets.md` S15–S19).** Depth *without* a second hue: a directional
gradient, a soft vignette, faint grayscale grain (≤5% — also kills banding), a halo, glass cards.
These are **pre-approved snippets — paste them verbatim.** Don't let a small model invent grain,
blur, or shadow. The one rule it will break: putting the glow *on the mark*. The light is always a
halo **behind** the focal element; the mark itself stays flat.

**The launch grid (`recipes/launch-grid.md`).** A 12-tile Instagram mural — 4 continuous rows × 3
columns, each row on one surface (indigo / paper / ink). For a small model: **edit the existing
`collateral/Eduflick Launch Grid.html`**, one tile or slide at a time, reusing its surface classes
+ deck-slide template + `motifHTML()`. Match the surface (paper → indigo mark + motifs; dark/indigo
→ paper-fill mark). Keep grain/grid **em-based** so the in-page viewer and the export match. Don't
treat tiles as standalone — a row only reads as a mural when its three slices line up.

**Pixel-perfect export (`../tools/`).** Don't trust a `file://` screenshot for final assets. After
render + QA: `cd tools && npm run export` → real-Chromium PNGs of every post slice + every carousel
slide at 1080×1350 (`SCALE=1` exact; default 2x is crisper). `npm run export:avatar` builds the
profile picture; `npm run serve` gives an http preview with a per-tile ⬇ button. Re-export after
every edit — the exporter always reflects the current HTML.

---
*Golden rule: the small model is a typesetter, not a designer. You supply the canvas, the snippets,
and the facts; it places text into a frame that's already on-brand. Keep that division and cheap
models produce export-ready Eduflick visuals.*
