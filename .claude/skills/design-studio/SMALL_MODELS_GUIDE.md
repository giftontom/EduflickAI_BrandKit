# Getting reliable, on-brand artifacts from small / cheap models

The skills are engineered so a **small model** (Haiku, mini, a local Llama/Mistral) can produce
on-brand visuals — by **assembling pre-approved parts**, not inventing design. The same discipline
makes a large model faster and more consistent. Works for any brand the profile defines.

## The core idea: assemble, don't invent

A small model is bad at *judgment* (what's on-brand) and good at *typesetting into a template*. So
remove the judgment: give it the colors as `var(--…)`, the effects as named classes
(`design-effects`), the structure as a recipe, and the words as a filled FACTS block. Its only job is
to slot text into approved parts and return one HTML file.

## The loop: generate → check → fix

1. **Load context** — the filled `00_SYSTEM_PROMPT.md` + `tokens.css` + `effects.css` + the recipe.
   Small models build far better with `effects.css` present to copy classes from.
2. **Fill the FACTS block** — every live number/date/link. The model must use ONLY these; missing →
   `[[NEEDS: …]]`. This is the anti-hallucination guarantee: facts come from you, never the model.
3. **Generate ONE artifact at a time**, tightly constrained (one recipe, one canvas size).
4. **Render and LOOK** — screenshot via `web-to-image`. A model will *say* "one hue" and emit a
   second; *say* "lowercase" and capitalize. Looking is the only reliable check.
5. **QA** — `QA_CHECKLIST.md`. Regenerate only the parts that fail; tell it to "fix only these
   elements, keep the rest."

## The FACTS block (paste, filled, every time)

```text
FACTS (the ONLY source of live values; do not invent; missing → [[NEEDS: …]]):
- name / subject:  …
- date / time:     …
- price / numbers: …
- link / handle:   …
```

A wrong number rendered into art looks official. The FACTS block is non-negotiable.

## Output constraints that keep small models on-rails

- "Return ONE complete, self-contained HTML file. Nothing before or after the code block."
- "Use only `var(--…)` for color; never invent a hex." · "Reuse `design-effects` classes verbatim."
- "Build at the exact canvas size in the recipe." · "Exactly the profile's accent-word treatment."
- "If a fact is missing, typeset `[[NEEDS: …]]` — do not guess."

## Batching a set (carousel, deck, grid)

Generate the **cover/first** to lock the system, then generate each sibling with: "match this exact
grid, eyebrow rhythm, footer, and palette; change only the text to …". Consistency across the set is
the brand — enforce it by reusing the first as a template, not by re-deriving each.

## The two-model leverage pattern

Cheap model does **volume** (typeset 12 tiles); you (or a strong model) **art-direct** (pick the
system, write FACTS, run QA, approve). For generated imagery, the same split: cache the style
preamble + palette + negatives (`image-composite`) in a strong model's system prompt, feed one-line
briefs, let it expand to full image prompts, then call the image model. One brief → on-brand output.

## Failure modes to watch for (catch in the render, not the code)

| Symptom | Fix |
| --- | --- |
| a second hue creeps in | "only `var(--accent*)` + neutrals; remove every other color" |
| headline wrong casing / no accent word | restate the profile's `headlineCase` + `accentWord` |
| system font (fonts didn't load) | ensure the font `<link>`; wait for fonts before screenshot |
| invented date/price | re-paste FACTS; "use ONLY these; gaps → `[[NEEDS:…]]`" |
| glow smears the logo | move light to a `.halo` behind it; never a filter on the logo |
| looks like a template | more negative space, one focal, an editorial mono id, tighter type |

**The one rule:** render and look. Every guarantee in this kit is verified by *seeing* the result.
