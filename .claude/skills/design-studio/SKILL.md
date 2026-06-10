---
name: design-studio
description: Universal graphic-design studio — design and ship on-brand visual artifacts (posters, social tiles/carousels, slide decks, brochure pages, landing sections, OG cards) for ANY brand or project. Drives the whole pipeline: load a brand profile → assemble from a recipe + the effects toolkit → render and look → QA → export to PDF or pixel-perfect PNG. Orchestrates the design-tokens, design-effects, image-composite, web-to-pdf and web-to-image skills. Use when asked to design/build/lay out any visual artifact, especially across a set, or to set up a reusable design system for a new brand.
user-invocable: true
---

# design-studio — assemble → render → QA → export, for any brand

The umbrella skill. It doesn't hardcode a look; it reads a **brand profile** and composes the five
engine skills into finished, on-brand artifacts. Same pipeline, any brand — swap the profile, get a
different brand with zero workflow change.

## The engine skills it orchestrates
| Skill | Role |
| --- | --- |
| **design-tokens** | the brand profile → `tokens.css` (`--accent`, neutrals, fonts) — the source of truth |
| **design-effects** | cinematic CSS (halo, grain, vignette, glass, glow, canvas frames) |
| **image-composite** | image + type/graphics, the right z-order + generative-image prompt kit |
| **web-to-pdf** | client-side multi-page PDF download (documents) |
| **web-to-image** | pixel-perfect PNG export (social/raster) |

## The brand profile (the contract)
Everything brand-specific lives in one file, not in the skills. See `brand-profile.schema.json`
(the contract) and `brand-profile.example.json` (a filled instance). It captures:
`tokens` (path to the project's `tokens.json`), `logo` (svg/path + lockup rules), `type`
(headline/label casing, accent-word rule), `voice` (do/don't, lexicon), `color` (semantic usage,
third-hue policy), and `imagery` (stance + negatives). To onboard a new brand: fill this once.

## The core workflow (works for you OR a small/cheap model)
1. **Pick the artifact** → open the matching `recipes/*.md` (poster · social-tile · slide-deck ·
   brochure-page · landing-section).
2. **Load context** → the brand profile + `tokens.css` + `design-effects/effects.css`. For a
   small model, paste the recipe's system framing + the cheat values inline.
3. **Fill the FACTS block** → real dates/prices/names/links. **Never invent these** — missing →
   typeset `[[NEEDS: …]]`. (See `SMALL_MODELS_GUIDE.md`.)
4. **Assemble, don't invent** → build at true pixels from a `design-effects` `.canvas--*` frame;
   typeset the provided copy per the profile's casing/accent rules; reuse effect classes verbatim.
5. **Render and LOOK** → screenshot it. A model will claim "one hue" and emit two; looking is the
   only real check. (`web-to-image` makes the screenshot.)
6. **QA** → run `QA_CHECKLIST.md` (parameterized by the brand profile). Ship at ≥ 85, zero hard-fails.
7. **Export** → documents → `web-to-pdf` (inline every asset!); social/raster → `web-to-image`.

## Decision: which export?
| Artifact | Export | Why |
| --- | --- | --- |
| Brochure, prospectus, one-pager, report, certificate | **web-to-pdf** | downloadable multi-page PDF |
| IG post/carousel, story, OG card, ad, avatar, thumbnail | **web-to-image** | exact-pixel PNG, true effects |
| Slide deck | either | PNG per slide, or PDF of all slides |

## Starting a brand from scratch
1. `design-tokens`: copy `tokens.starter.json` → set the accent ramp, neutrals, fonts; build `tokens.css`.
2. `design-studio`: copy `brand-profile.example.json` → set name, logo, casing/voice, imagery stance.
3. Build the first artifact from a recipe; QA; export. The profile + tokens now drive everything.

## The one rule that makes output look designed, not templated
**Discipline beats decoration.** One hue (the profile's accent) + neutrals; one type system; one
focal per canvas; light as a halo *behind* the focal, never a filter on it; generous negative space.
The recipes and QA enforce exactly this — for whatever brand the profile defines.

Provenance: generalizes the Eduflick `design-system` workflow (`recipes/`, `QA_CHECKLIST.md`,
`SMALL_MODELS_GUIDE.md`, the visual-builder system prompt) into a brand-agnostic orchestrator.
