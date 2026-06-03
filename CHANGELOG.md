# Changelog

Notable changes to the Eduflick AI Brand Kit. Versions track the brand book;
the surrounding tooling (content studio, design system, collateral kits) evolves
alongside it.

---

## v4.0 — 2026-06-02

### Brand Book v4.0
- Complete rewrite: 11-chapter definitive brand book (mark construction, color,
  type, motion, voice, UI, Sparks system, social templates, print, governance)
- Single indigo hue + neutral palette locked in; coral restricted to semantic use only
- Manrope (display), Instrument Serif (italic accents), JetBrains Mono (labels)
  established as the permanent font stack
- "Flick" as the trademark unit; "Sparks" as the gamification noun
- Co-brand framework: Tomatrix Technologies Pvt Ltd as supporting parent

### New: Content Studio
- `BRAND_CHEATSHEET.md` — self-contained, one-page brand context for any AI model
- `SMALL_MODELS_GUIDE.md` — generate→check→fix loop for cheap models
- 8 prompt templates: Instagram caption, carousel, reel script, LinkedIn post,
  WhatsApp sequence, ad copy, repurpose batch, master system prompt
- `QA_CHECKLIST.md` — 100-point scorecard with hard-fail gates
- `INSTAGRAM_LAUNCH_PLAN.md` — complete 12-tile mural launch plan with full copy
- `EDUFLICK_AI_PLAYBOOK.md` — brand identity, pitch deck architecture, launch grid

### New: Design System
- `colors_and_type.css` — canonical design tokens (color ramps, type scale, spacing,
  radii, shadows, motion curves)
- `DESIGN_CHEATSHEET.md` — visual twin of the content cheat sheet
- `SMALL_MODELS_GUIDE.md` — assemble-don't-invent pipeline for visual artifacts
- `AI_IMAGERY_GUIDE.md` — abstract indigo backdrop generation (Nano Banana 2)
- `QA_CHECKLIST.md` — visual pass/fail gate
- 19 pre-approved HTML/CSS snippets (`recipes/snippets.md`)
- 6 artifact recipes: Instagram post, poster, slide deck, landing section,
  brochure page, launch grid
- 4 collateral kits: Instagram Kit, Brochure Kit, Content Calendar, Launch Grid
- 2 UI kits: mobile app (consumer feed), web (educator dashboard + marketing)
- 5 slide templates: title, section, content, quote, closing
- 24-icon line system (`eduflick-icons.svg`) + mark-companion state icons
- Preview cards for type, color, spacing, brand elements
- Logo assets: 5 mark variants, 5 lockups, favicon, social avatars/banners

### New: Tools
- Playwright-based PNG exporter: every post + carousel slide → pixel-perfect 1080×1350
- Profile avatar exporter (gradient + paper-fill mark)
- Zero-dependency static server for in-browser export

### New: Collateral
- Full-Stack AI Engineer Program brochure (10-page A4)
- AI Leadership Program brochure + prospectus PDF + poster
- Product brochure (4-page A4 cinematic edition)
- 12-tile cinematic Instagram Launch Grid with carousel viewer

### Changed
- Repo restructured from monolithic HTML files to modular skill-based layout
- Two invocable agent skills: `eduflick-content` + `eduflick-design`
- Root `index.html` landing page with card-based navigation

---

## v3.0 — 2026-05-13

- Major expansion: comprehensive brand system with UI components
- Introduction of mark construction rules and color system
- Early type hierarchy and spacing scale
- First brochure layouts

---

## v2.0 — 2026-05-12

- Refined layout and typography
- Expanded color palette exploration
- Early voice/tone documentation

---

## v1.0 — 2026-05-12

- Initial brand kit as a single monolithic HTML file
- Core mark design (square + notch)
- Basic color and type direction
- First program brochure concept

---

## Roadmap (planned, not scheduled)

- [ ] Self-hosted font files (remove Google Fonts dependency)
- [ ] Visual regression testing (golden-image diff on export)
- [ ] `FACTS.md` as single source of live values for all prompts
- [ ] `POSTING_SCHEDULE.md` — day-by-day 6-week content calendar
- [ ] CI/CD: lint Markdown, validate HTML, check broken links
- [ ] `recipes/ai-image.md` + `recipes/composite-canvas.md` — wire AI imagery
  into the assemble-don't-invent pipeline
- [ ] WhatsApp sequence fleshed out to same rigor as Instagram prompts
- [ ] Email nurture prompt template
- [ ] Component library build step (assemble snippets into shareable HTML)
