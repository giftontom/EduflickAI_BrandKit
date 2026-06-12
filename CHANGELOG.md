# Changelog

Notable changes to the Eduflick AI Brand Kit. Versions track the brand book;
the surrounding tooling (content studio, design system, collateral kits) evolves
alongside it.

---

## Unreleased — brand studio (branch `brand-studio`)

### Added

- **Launch-grid manager.** The 12-post Instagram launch plan is now a committed, machine-readable
  store (`content-studio/launch-grid.json`: per-post captions, waves, roles, notes, IG rules) edited
  in-studio through guarded endpoints (`GET /api/launch-grid`, `POST /api/launch-grid/post`,
  `POST /api/launch-grid/slides`): every string is re-scanned server-side, `[[placeholders]]` are
  hard-rejected (they brick the export pre-flight), and carousel slide copy is rewritten inside
  `launch-grid.html`'s `caro-data` JSON island with injection guards. `#/instagram` simulates the
  profile grid using only approved/scheduled/posted launch posts. `POST /api/export-zip` bundles
  rendered PNGs + caption text files into one download (read-only, `exports/`-constrained), via a
  new dependency-free `tools/lib/zip.mjs`.
- **Server hardening (roadmap Phase 0).** Loopback asserted at boot and the port fails fast when
  busy (`STUDIO_PORT` > `PORT` > 8090); every request must carry a loopback Host header and non-GET
  `/api` calls with an Origin must be same-origin (DNS-rebinding + CSRF guards — no CORS headers are
  ever set); atomic writes now fsync before rename; actions get a watchdog timeout
  (`STUDIO_ACTION_TIMEOUT_MS`, default 15 min) and `lastRun` survives restarts in a gitignored
  state file; new `GET /api/tokens/status` reports token/snippet artifact drift. Verified live:
  all 11 routes render with zero console errors, security probes hold, facts guard green.
- **Roadmap.** `tools/studio/ROADMAP.md` — the studio's phased development plan: what shipped,
  what is pending before merge, and the future phases (operator loop, AI-assisted content,
  multi-brand, distribution). Development is paused at a verified-working state; the roadmap is
  the resume point.

- **Design feedback that Claude Code can act on.** Annotate mode drops numbered pin comments on any
  asset — instagram/poster/story PNGs and deck slides (normalized coordinates), brochure/deck pages
  and the launch-grid mural (same-origin iframe element-selectors / per-page coordinates). Pins
  persist to a committed `content-studio/design-comments.json` and are mirrored into a generated,
  grouped-by-source-file `content-studio/DESIGN_FEEDBACK.md` digest: a separate Claude Code chat
  opens that one file and implements each edit against the real source path + anchor + instruction.
  Statuses (`open` / `resolved` / `won't fix`) flow from the pin popover or a new `#/feedback`
  digest browser. New API: `GET/POST /api/comments`, `DELETE /api/comments/:id` (the 4th and only
  other write surface — fixed paths, server-side text guard with override, atomic digest
  regeneration), `gen:feedback` action. Comment text is exempt from the retired-string guard
  (free-form review) via a `check-facts` `SKIP_FILES` exclusion scoped to exactly those two files.
- **Launch grid, integrated.** `#/launch` renders the live launch-grid mural + carousels inside the
  platform (no more external tab), with annotation and the export thumbnail grid below.
- **Live document viewers.** Brochures (`#/brochures`) and the deck (`#/deck`) gain page/slide
  navigation, fit/100/200 zoom, and annotation while preserving the collateral-kit edit host.
- **Accessibility + UX.** Command palette (`Ctrl`/`Cmd-K`) over routes, docs, and actions; a focus
  trap with opener-restore in the modal; an `aria-live` announcer; ARIA-labelled pin buttons; all
  new motion gated behind `prefers-reduced-motion`. Manifest now carries per-asset comment counts.

- **Brand studio** — a local platform to view and manage every asset in the kit:
  `cd tools && npm run studio` → `http://localhost:8090/tools/studio/`. Galleries for
  instagram/posters/stories/deck exports (lazy grids, lightbox, stale ribbons,
  cold-state run-export buttons), live brochure/deck/brand-book/kit previews,
  brand foundations (token swatches, type specimens, logo wall), a rendered
  markdown viewer for all repo docs (FACTS.md pinned as source of truth, raw
  toggle, search), launch-pipeline status tracking per asset
  (draft/approved/scheduled/posted/retired → committed `content-studio/status.json`),
  a whitelisted action runner with live SSE logs (exports, backdrops, guards,
  token/snippet rebuilds), the host side of the collateral-kit edit panel
  (persists tweaks to the EDITMODE block on disk, guard-checked), and a FACTS.md
  editor with live guard validation, line diff, and explicit override.
  Server: `tools/studio-server.mjs` (localhost-only, zero new dependencies, writes
  limited to status.json, FACTS.md, and EDITMODE blocks). Static serving extracted
  to `tools/lib/static.mjs` with a hardened path-traversal guard (also fixes
  `serve.mjs`). Markdown rendering via vendored `marked` + `DOMPurify`
  (`tools/studio/vendor/`, licenses recorded). `check-facts.mjs` now exports its
  retired-string scanner for in-process validation; CLI behavior unchanged.

## Unreleased — full-project review fixes (branch `review-fixes`)

### Added

- **Launch deliverables committed.** Brochure variants (Dark / v2 spec / v3 platform /
  Enquiry), the Full-Stack AI Engineer program deck, poster/story/IG collateral surfaces
  with backdrop assets + `SOURCES.md` provenance, the export/generation tool suite
  (`export:{pdf,slides,posters,stories,ig}`, backdrop + stock pipelines), the
  `.claude/skills` automation layer, and launch content drafts.
- **Fact guard upgrades** (`tools/check-facts.mjs`): regex retired-strings (wrong-domain
  URL/email forms incl. the old gmail contact), `[[placeholder]]` leakage scan
  over active HTML, project-count assertion (canon: 3 deployed), invented-deadline scan,
  link-checker fixes. All export scripts now refuse to render HTML containing `[[…]]`.
- **SRI hashes** on every CDN `<script>` (jspdf, html2canvas, html-to-image) across
  brochures, the deck, and launch-grid.

### Fixed

- **Fabricated "applications close june 15"** removed from the program deck (FACTS:
  no close date); `[[masterclass date]]` / `[[cohort start]]` placeholders resolved out.
- **Enquiry page**: dead WhatsApp placeholder CTA → live apply CTA; `[[NOT SET]]` row removed.
- **Project count** reconciled to 3 deployed everywhere (capstone tiles recast); project 2
  renamed "RAG chatbot" per FACTS (was "enterprise AI chatbot"); "agentic platform" naming.
- **"Certified" removed** from all program artifacts and canon (FACTS.md never authorized it).
- **Retired `eduflick.ai` domain/email family** swept from legacy brochures, slides,
  brochure-kit, leadership poster, social README, and brand-book specimens.
- **CC BY-SA backdrop replaced**: `poster-program.png` regenerated procedurally (was an
  unattributed Wikimedia derivative); SOURCES.md updated.
- **One-hue rule**: violet/electric-blue alternate palettes deleted from instagram-kit and
  brochure-kit; off-palette coral gradient → token coral.
- **WCAG AA contrast**: low-alpha labels raised across all FS-AI brochure variants
  (contact keys, footers, cover stats, strikethrough price) to ≥4.6:1.
- **Copy canon**: close-date framing replaced with seats-remaining urgency across
  cheatsheet/prompts/schedules; de-emphasized-location few-shot fixed; unsourced "78% retention",
  "1:1 code reviews", week-4 deploy, and Supabase/Vercel/Google ADK launch-tile claims
  removed; playbook Wave-4 fork collapsed into a pointer to the launch plan;
  "embeds the cheat sheet" doc claim corrected.
- **markdownlint clean** (was 331 errors on CI): repo-wide formatting fixes; snippet
  source now regenerates lint-clean and idempotent.
- Stale duplicate `design-system/Eduflick Full-Stack AI Engineer Brochure.html` removed;
  index.html gained cards for all new deliverables and dropped a gitignored-PDF link.

## Unreleased — design-system unification

**Design system version:** `1.0.0` (tracked in `design-system/tokens/tokens.json` →
`brand.version`). The design system is now versioned independently of the brand book;
bump it here under **Added / Changed / Deprecated** when tokens or components change.

### Added

- **The agent team.** `.claude/agents/` — 7-agent Claude Code team
  (lead/copy/design-eng/visual/QA/red-team/devops) + the pre-publish
  Definition-of-Done gate — now committed instead of gitignored.
- **`brochures/README.md`** — artifact index: every edition + its use, canonical
  flags, and the PDFs-are-regenerable policy.
- **Imagery policy v2.** `AI_IMAGERY_GUIDE.md` covers both backdrop modes
  (abstract indigo + brand-treated photo duotone) and the hybrid per-surface policy;
  poster recipe gains the 6-archetype × 2-register system (snippets S21–S24).
- **Design token pipeline.** `design-system/tokens/tokens.json` is the single source
  of truth for color/type/space/radius/shadow/motion + the brand mark path & fonts link.
  `cd tools && npm run tokens` (Style Dictionary) generates `tokens/tokens.css`,
  `tokens/tokens.flat.json`, and `tools/brand.tokens.mjs`.
- **`design-system/components.css`** — reusable, token-based component classes (buttons,
  cards, stat/flick cards, tags, spec rows, backgrounds, cinematic surfaces, glass, footer
  lockup, mark) — the production twin of the snippet bin.
- **`design-system/COMPONENTS.md`** — the single component inventory.
- **Generated snippet bin.** `recipes/snippets.src.md` (with `{{token}}` placeholders) →
  `npm run snippets` → fully-inline `recipes/snippets.md`; inline values can no longer drift.
- **Collaboration scaffolding** — `.editorconfig`, `.prettierrc`, `.markdownlint.json`,
  `.github/CODEOWNERS`, PR template, `LICENSE`.
- **CI drift guard** — regenerates tokens + snippets and fails if they fall out of sync.

### Changed

- `colors_and_type.css` now `@import`s the generated tokens and holds only the semantic
  role aliases + text styles; the collateral copy is a thin shim.
- `tools/package-lock.json` is now committed (CI `npm ci` requires it).
- **Repo organization.** Deduped `design-system/uploads/` (byte-identical Leadership
  brochure copy removed); the program deck moved to
  `brochures/Eduflick_Full_Stack_AI_Engineer_Program_Deck.html` (no spaces in
  deliverable filenames); orphan render screenshots moved to `_ref/screens/`;
  `_ref` binaries (handoff zip, reference screenshots) untracked with provenance
  in `_ref/README.md`.
- **Docs refreshed to match reality** — root README, AGENTS.md, docs/README.md,
  tools/README.md, CONTRIBUTING.md, Makefile all cover the new toolbox, kits,
  agent team, and skill layer.

### Fixed

- CI `npm ci` no longer silently fails (missing committed lockfile).

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
