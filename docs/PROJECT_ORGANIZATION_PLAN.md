# Eduflick Brand Kit — Project Organization & Documentation Plan

> Status: 2026-06-23. Drafted from a 3-track audit (structure, git/branches, docs).
> The WhatsApp-poster studio-visibility issue (the trigger) is **fixed** (see §5); the
> rest is staged for execution. Decision points are marked ⚠️.

## 0 · Trigger: WhatsApp poster invisible in the studio — FIXED
Root cause: the standalone WhatsApp poster (now `design-system/collateral/whatsapp-poster.html`,
`data-export="poster-wa"`) lived in `brochures/`, so the studio auto-classified it as a
**brochure**. It's a *different* design from the `poster-whatsapp` tile in `posters.html`.
Interim fix shipped: rendered it (`export-wa-poster.mjs` → `exports/posters/poster-wa.png`)
and surfaced it in the studio **program room** posters section. The structural fix (§2) gives
it a permanent poster home.

## 1 · The three problems
| Area | Problem | Severity |
|---|---|---|
| Git | The Pioneer→Early Bird reframe (`a14579f`) is on `unify-design-system`, **not on `main`** → main is stale. 11 branches, fragmented work. | 🔴 Highest |
| Structure | `brochures/` is a catch-all; **posters split** across `brochures/` + `design-system/collateral/posters.html`; stale `Leadership_Program_Prospectus.pdf`; non-FAE product brochure mixed with FAE; 57-char filenames. | 🟠 High |
| Docs | Stale **masterclass** refs in ~8 docs (README, CHANNELS, QA_CHECKLIST, POSTING_SCHEDULE, campaign plan, prompt examples) contradicting FACTS.md; no ARCHITECTURE/WORKFLOW/SETUP; `FAE_apply/` + studio undocumented. | 🟠 High |

## 2 · Target structure (one home per artifact)
```
deliverables/
  brochures/fae/   brochure-light · -dark · -spec · -platform · leaflet-enquiry
  brochures/product/  brochure-2026   (the non-FAE Eduflick_AI_Brochure)
  decks/fae/   program-deck.html
design-system/collateral/posters/   ← THE posters home
  posters.html (7 archetypes) · whatsapp-poster.html (standalone) · whatsapp-caption.txt
```
Delete: `Leadership_Program_Prospectus.pdf` (cancelled program); committed `*.pdf` (regenerable).
**Refs to update on move:** `tools/export-{pdf,slides,posters,whatsapp,wa-poster}.mjs`,
`_inject-dark-bg.mjs`, `_gen-grain.mjs`, `check-facts.mjs` scan paths, `index.html`, the
brand-studio surface config + `buildDocuments`, `.gitignore`, README/CONTRIBUTING/docs.

⚠️ **Decision A — depth:** *moderate* (recommended: move WhatsApp poster+caption to the posters
home, delete the stale PDF, nest `posters.html` under `posters/` — ~6 ref updates, no mass rename)
vs *full* `deliverables/` + kebab-case rename (~25 refs across branches).

## 3 · Git consolidation (fix stale `main`)
1. Branch `merge/reframe` off `main`; `merge --no-ff unify-design-system`; resolve with
   unify-design-system as truth for content; run `check:facts` + tests; PR → `main`.
2. Rebase `fae-apply-build` on new `main`; verify apply site; merge → `main`.
3. Land `phase1-image-providers`, `brand-studio` (incl. the program room + PDF + WhatsApp fix),
   `ig-fae-story` as ready.
4. Prune merged/stale: `review-fixes`, `worktree-docs-org`, `worktree-finalize-drafts`
   (salvage its 43-file WIP first), `worktree-whatsapp-poster-redesign`, `/tmp/ship-main`.

⚠️ **Decision B — strategy:** merge `unify-design-system`→`main` first (recommended) vs a fresh
integration branch. Never commit directly to `main` (branch + PR).

## 4 · Documentation
- **Currency sweep** (`grep -ri masterclass / register-free`): README, CHANNELS, QA_CHECKLIST,
  POSTING_SCHEDULE, `prompts/{ad-copy,reel-script}.md`, `recipes/instagram-post.md`; deprecation
  banner on `planning/…Campaign_Plan.md` + EDUFLICK_AI_PLAYBOOK.md.
- **Create:** `ARCHITECTURE.md` (repo map + why; documents `FAE_apply/` live site + the studio),
  `WORKFLOW.md` (edit→export→evaluate jobs), `SETUP.md` (first run). Link `.claude/{agents,skills}`
  from `docs/README.md`.
- **Keep canon:** FACTS.md + tokens.json (integrity is already excellent); cheatsheets stay derived.

## 5 · Studio alignment
After §2, point the studio posters surface + program room at the consolidated posters home so the
standalone WhatsApp poster shows in `#/social/posters` too (currently surfaced in the program room
only). Decide if both the standalone poster and the `poster-whatsapp` tile stay, or one is canonical.

## 6 · Execution order (each step verified)
- **Phase 1:** git consolidation §3.1–3.2 (main current) → doc currency sweep §4 → WhatsApp fix (done).
- **Phase 2 (DONE):** structure reorg §2 (moderate) — WhatsApp poster + caption → `design-system/collateral/`
  (discovered as kind `poster`, no longer mis-filed as a brochure); stale Leadership PDF confirmed gone; `posters.html`
  kept in place (≈15 refs) to avoid churn. Verified: check:facts green (224), poster re-rendered, studio suite 120/0/2-skip.
- **Phase 3:** new docs §4 + full studio alignment §5 + branch pruning §3.4.
Verify each: `npm run check:facts`, export scripts, studio suite (122 tests) + screenshots, live apply curl.
