# Recipes — pick the artifact, assemble, render, QA, export

Each recipe is a slot-filled brief: a **FACTS** block (the only source of live numbers — missing →
`[[NEEDS: …]]`), **INPUTS** (size/theme/text), **BUILD RULES** (how to assemble), and an **OUTPUT**
contract (one HTML file). Load `00_SYSTEM_PROMPT.md` (filled from the brand profile) + the generated
`tokens.css` + `design-effects/effects.css` first, then the recipe.

| Recipe | Artifact | Export |
| --- | --- | --- |
| `poster.md` | event / announcement / scarcity, A4 or 4:5 | PDF (`web-to-pdf`) or PNG (`web-to-image`) |
| `social-tile.md` | IG post / carousel slide / OG card | PNG (`web-to-image`) |
| `slide-deck.md` | 16:9 presentation deck | PNG per slide or PDF |
| `brochure-page.md` | A4 document page (multi-page doc) | PDF (`web-to-pdf`) — strict inline-asset rules |
| `landing-section.md` | responsive web section | ships as live web code |

**The loop (every recipe):** fill FACTS → assemble at true pixels from a `.canvas--*` frame, reusing
effect classes verbatim → **render and look** → `QA_CHECKLIST.md` (≥ 85, zero hard-fails) → export.

**The discipline (every recipe):** one hue (the profile's accent) + neutrals · one type system · one
focal per canvas · light as a halo *behind* the focal · generous negative space · never invent facts.
That restraint is what reads as designed, not templated — for any brand the profile defines.
