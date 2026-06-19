# Brand Studio — Roadmap

The studio's phased development plan. Status as of 2026-06-14 (current HEAD): **Phases 0, 1
(1a + 1b-1 + 1b-2 bar the cohort banner), 2a, and Phase 2b test-isolation complete.** Phase 0 gave
the studio its first test suite + CI purity jobs + docs + cold-start UX + hygiene. Phase 1a made
status a guarded state machine with audit history, a `#/board` kanban, and operator dashboard
panels. Phase 1b-1 added the `#/generate` panel (deterministic FACTS-grounded prompt assembly), a
QA runner, and the guarded `drafts/` write surface (the 7th write path). Phase 1b-2 added
`#/calendar`, the client + server stale-schedule guard (`allowStale`), the "blocked" dashboard
panel, and the opt-in local-model bridge; the ONLY remaining 1b-2 item is the cohort banner, which
is gated on the FACTS.md cleanup. Phase 2a (review gate + digest self-heal) is done, and Phase 2b is
underway: `STUDIO_CONTENT_DIR` test isolation shipped (the suite is now provably isolated from live
data) + a 24-finding adversarial hardening pass + channel-variants repurpose. All green: **112
node:test cases + a 14-route Playwright smoke**, facts clean, zero-dep +
vendor-integrity hold.
**Owner-gated items still pending:** FACTS.md content reconciliation (Phase-0 tail item 7 — brand
truth, partly speculative; now also unblocks the cohort banner + improves generation grounding) and
the merge to `main` (item 8 — outward-facing push). This file is the resume point.

> **Data-hygiene note (owner):** `content-studio/design-comments.json` currently holds 5 leftover
> `studio-test/comment` open comments (test residue from an earlier run, before snapshot/restore was
> added). They're harmless but inflate the open-comment count; clean them out of the JSON when
> convenient (the studio regenerates the digest on save/boot). Left untouched — it's owner data.

The full research + planning record (81 evaluated open-source projects, the 4-lens plan, the
adopt/build ledger) lives outside the repo; this file is the condensed, actionable version.

---

## Guardrails (non-negotiable, any phase)

1. **Server runtime deps = zero, forever.** `studio-server.mjs` + `tools/lib/*.mjs` import only
   `node:*` and relative repo files. External tools run as spawned children behind the action
   whitelist, never as imports.
2. **Localhost-first is a security control.** The bind stays loopback (asserted at boot);
   never configurable to a routable address without an auth story landing in the same change.
3. **Git is the only source of truth.** No database, ever. Every authored artifact is a
   committed, diffable file. Metrics and `exports/` are read-only / gitignored overlays.
4. **Generated files are never hand-edited** (`tokens.css`, `tokens.flat.json`,
   `brand.tokens.mjs`, `snippets.md`, `DESIGN_FEEDBACK.md`) — edit the source, regenerate.
5. **No generic write endpoint.** Every write path is fixed/whitelisted, traversal-guarded,
   atomic (tmp + fsync + rename), and server-side re-validated.
6. **Permissive licenses only.** AGPL/SSPL tools may be borrowed as *patterns*, never bundled.
7. **Render before done.** Any visual surface a change touches gets exported and looked at.

---

## DONE (already shipped on this branch)

- Ten-plus views (dashboard, social galleries, launch grid, instagram showcase, deck,
  brochures, brand, docs, facts editor, feedback, actions) + command palette + annotation
  layer, on a zero-build vanilla-ESM SPA.
- Guarded write surface: `status.json`, `FACTS.md`, `design-comments.json` (+ generated
  digest), EDITMODE blocks, `launch-grid.json` + the `caro-data` island — each path fixed,
  re-scanned server-side, atomic.
- Whitelisted action runner with SSE logs, single-flight, watchdog timeout, persisted lastRun.
- Server hardening: loopback assert, fail-fast busy port, loopback-Host + same-origin-Origin
  guards, fsync-durable writes, `GET /api/tokens/status` drift report.
- Token single-source pipeline (Style Dictionary) + tokens/snippets drift guard in CI.
- Read-only bulk export (`/api/export-zip`, dependency-free zip writer).

## DONE — Phase 0 (committed `065bac1`, all verified green)

- ✅ **Test suite** (`tools/test/`, zero new deps): 48 node:test API/security tests
  (`api.test.mjs` + `comments.test.mjs`) covering the six EDITMODE invariants, the static-handler
  traversal corpus, Host/Origin 403 guards, guard-bypass on facts/launch-grid/comments, launch-grid
  validation, atomicity, concurrency, the action runner, export-zip escape, and a docs-drift test
  (action whitelist must match the README). `helpers.mjs` snapshots+restores all six write paths
  byte-for-byte. `smoke.mjs` drives all 11 routes in headless Chromium asserting zero console errors.
- ✅ **CI jobs**: `studio-tests` (node 20 + chromium), `server-zero-dep`, `vendor-integrity`,
  generated-drift extended to `DESIGN_FEEDBACK.md`; PRs into `unify-design-system` now run CI.
  Unit invocation is the shell-expanded glob `test/*.test.mjs` (portable across node 18/20/22 —
  bare `node --test test/` MODULE_NOT_FOUNDs on node ≥20).
- ✅ **Docs reconciliation**: README documents all six write paths + the new endpoints +
  the full security posture; server header comment updated.
- ✅ **Cold-start UX**: dashboard empty-state hero + absent-vs-stale split (per-item `exists`/`stale`).
- ✅ **Tokens-sync badge** in `#/brand` reading `GET /api/tokens/status` with one-click rebuild.
- ✅ **Hygiene**: package renamed `eduflick-brand-studio`; `playwright`/`style-dictionary`
  exact-pinned; `test`/`test:smoke` scripts added.

## PENDING — Phase 0 tail (both owner-gated)

| # | Item | Why gated |
|---|------|-----------|
| 7 | **FACTS.md cleanup**: fold the informal hand-typed notes (lead-magnet retirement, the tentative "offline orientation" idea) into proper FACTS structure. | Brand truth + the orientation idea is speculative ("might") — a fact decision the owner must make, not guess. |
| 8 | **Merge sequence**: rebase onto `unify-design-system` → merge `unify-design-system` into `main` first (PR #1) → merge this branch `--no-ff` + tag `studio-v0.1.0` → move the CHANGELOG block under the version heading. | Outward-facing (pushes to GitHub, advances PR #1, reorders branches) — needs explicit go-ahead. |

**Exit criteria:** all tests green in CI, docs match code, cold-start sane, merged + tagged.

## Phase 1 — Operator loop (the studio becomes the daily cockpit)

**Phase 1a — DONE (committed `15893bc`, verified 60/60 tests, 12/12 smoke):**
- ✅ **Status state machine**: legal-transition guard (draft→approved→scheduled→posted, any→retired,
  retired→draft revive; 409 + `legalNext` unless `override:true`) + append-only per-asset
  `history`; new optional `scheduledFor`. Guard + history run inside the serialized write queue.
- ✅ **Kanban board** (`#/board`): every asset by pipeline stage, click-to-move via `legalNext`
  quick buttons + an override modal; the status-badge dropdown shares the same 409→override flow.
- ✅ **Operator dashboard panels**: due/overdue (`scheduledFor` ≤ today, not posted) and
  stale-and-live (manifest stale AND status ∈ scheduled/posted, one-click re-render).

**Phase 1b-1 — DONE (committed `4e2d5cb`, verified 81/81 tests, 13/13 smoke):**
- ✅ **Generation panel** (`#/generate`): server assembles the prompt deterministically —
  `00_SYSTEM_PROMPT.md` box (+ optional `BRAND_CHEATSHEET.md`) + a live CURRENT-FACTS block
  parsed from `FACTS.md` tables + the chosen template + operator task fields. Returns
  `{prompt, facts, warnings}` (warnings flag empty/placeholder FACTS → the model emits
  `[[NEEDS]]`). Clipboard-mode (Copy) is the zero-dep default. *Live-model bridge intentionally
  deferred — clipboard mode is the safe, complete core; the bridge is a later opt-in.*
- ✅ **QA runner** (`POST /api/qa/check`): `scanTextRetired` violations + a checklist (emoji,
  forbidden/hype words). Wired into the panel's paste-back stage.
- ✅ **Drafts write surface** (the 7th write path): `GET/POST /api/drafts` — `drafts/<name>.md`,
  slug/channel sanitized `^[a-z0-9][a-z0-9-]*$`, traversal-guarded, atomic, retired-string-guarded
  (422, no override — the repo facts-guard forbids retired strings repo-wide).

**Phase 1b-2 — all but the FACTS-gated cohort banner DONE:**
- ✅ **Calendar** (`#/calendar`, committed `4651e7f`): month grid over `scheduledFor` with
  prev/next/today nav, today highlighted, overdue chips flagged, read-only detail popover.
- ✅ **Stale-schedule warning** (client-side, in `#/board`): moving a card into scheduled/posted
  warns first if the asset's export is stale/absent per the manifest (the server guard is separate).
- ✅ **"Blocked" dashboard panel** (committed `33cb572`): `GET /api/drafts` items now carry
  additive `needsInput`/`violations` flags; the dashboard's third ops panel lists drafts with
  unfilled `[[NEEDS]]` placeholders or brand-guard violations.
- ✅ **Schedule→stale cross-check (hard, server-side)** (committed `24fcb44`): a new `allowStale`
  flag (distinct from `override`); scheduling/posting a KNOWN absent/stale manifest asset → 409
  `reason:'stale-export'` unless `allowStale:true`. Scoped to manifest assets so abstract test ids
  are never gated. Board + status-badge branch the 409 on `body.reason`.
- ✅ **Live-model bridge** (opt-in, committed `24fcb44`): `POST /api/generate/run` — dormant `501`
  unless `STUDIO_MODEL_CMD` is set; else spawn (no shell, watchdog timeout) with the prompt on
  stdin. Shares assembly with `/api/generate`. `#/generate` has a "run with local model" button.
  *(URL-bridge variant, `STUDIO_MODEL_URL`, not implemented — CMD path covers the local case.)*
- ⬜ **Cohort banner**: live seat count + key date from FACTS — *the only remaining 1b-2 item;
  gated on the FACTS.md cleanup (Phase-0 tail item 7). Until FACTS is reconciled it would surface
  placeholder rows, so it waits on the owner.*

## Phase 2 — Review + pipeline (content travels end-to-end)

**Phase 2a — DONE (committed `4e19cf0`, verified 97/97 tests, 14/14 smoke):**
- ✅ **Review gate**: an asset cannot reach `approved` with open comments — new `allowOpenComments`
  flag (independent of `override`/`allowStale`); `409 reason:'open-comments'` (with `openCount`)
  unless bypassed; resolved/wontfix don't block; board + dropdown branch the 409 → confirm + link
  to `#/feedback`.
- ✅ **Comments digest self-heal**: on boot, regenerate `DESIGN_FEEDBACK.md` from
  `design-comments.json` when they differ (no-op when in sync) — a crash between the two writes
  self-corrects.

**Phase 2b:**
- ✅ **Test isolation via `STUDIO_CONTENT_DIR`** (committed `80b0d83`): the server reads/writes its
  content-studio data from a configurable dir (default-identical when unset); the suite runs against
  a throwaway copy. PROVEN byte-identical content-studio before/after a full 98-test run — tests can
  now run safely while a live studio is open. This retires the old "don't run the suite while live"
  caution.
- ⬜ Full brief → generate → guard → render → QA → status pipeline (mostly wiring existing parts).
- ⬜ Dirty-file warn-and-diff: the FACTS editor already shows a disk-vs-buffer LCS diff before save;
  remaining gap is *server-side* optimistic concurrency (reject a save whose `baseHash` no longer
  matches disk) + the same for EDITMODE. Lower priority (client diff already covers the common case).
- ✅ **Channel variants / repurpose** (committed `1f87f64`): `/api/generate` + `/api/generate/run`
  accept an optional `sourceDraft` (an existing drafts/ file, validated + traversal-guarded) injected
  into the prompt as a "SOURCE COPY TO REPURPOSE" section; `#/generate` has a source-draft picker.
  Pick a source + the `repurpose-batch` template → the model rewrites it for a channel; save the
  variant via the existing drafts endpoint. Byte-identical prompt when no source is picked.
- ✅ **generate→asset (IG caption)** (committed `f86d4c1`): `#/launch` caption editor has an "import
  from draft" picker — `parseCaptionDraft` turns a generated draft into {hook,body,cta,hashtags} and
  pre-fills the editor for review + save via the existing guarded write. Frontend-only, additive.
- ⬜ generate→asset (EDITMODE): the same idea for a design-system HTML block (apply an approved
  draft into an EDITMODE block) — the remaining half of the loop.
- ⬜ Full brief → generate → guard → render → QA → status pipeline as one guided flow (the pieces
  now all exist and interconnect; this would be a UX wrapper).

## Phase 3 — Multi-brand platform

- ✅ **Phase 3a keystone — `brand.config.json`** (committed `8b831bc`): the brand profile at repo
  root (identity, the 11-action whitelist, 5 surfaces, paths, and `facts.retiredStrings` moved out
  of check-facts.mjs). Both check-facts.mjs and studio-server.mjs read it with per-field fallback to
  the old hardcoded values; **proven byte-identical when present, graceful fallback when absent**.
  122 tests. This makes the brand truth declarative — the foundation for design-skills reuse.
- ⬜ **Workspace mode: DEFERRED (YAGNI).** N brands in one process is only worth building when a
  REAL second brand exists; every traversal guard would need re-deriving per brand root (hard test
  gate — cross-tenant write escape). Do not build on spec.
- Plugin-shaped views (the ROUTES array already is); server plugins = read-only routes +
  whitelisted actions only.
- DTCG token migration (`$value`/`$type`, Style Dictionary native) + OKLCH; round-trip-review
  the hand-tuned brand hexes first.

## Phase 4 — Distribution (only when earned)

- One-command launcher (`npx` / Node SEA) — no Electron, no Tauri.
- Publish layer: git-as-queue + webhook handoff (n8n); the studio never holds platform
  credentials or OAuth tokens.
- Insights overlay: drop platform metric exports into a gitignored `metrics/` dir; the studio
  joins them to `status.json` read-only. Never fetches from platforms.
- New-brand scaffold via the design skills (whitelisted action + wizard view).
- Optional: spawned server-side PDF (Gotenberg/WeasyPrint) to retire the html2canvas
  paged-brochure taint — same spawned-child shape as Playwright.

---

## Adopt / build ledger (settled decisions)

| Concern | Decision |
|---|---|
| Task runner | Keep the homegrown SSE runner (more locked-down than any general tool; OliveTin is AGPL, pueue is a second daemon) |
| Token compiler | Style Dictionary, already adopted; DTCG is a config change later — no compiler swap |
| Status vocabulary | Borrowed (draft/approved/scheduled/posted/retired); runtimes rejected (DB-backed) |
| Visual-edit RPC | Homegrown postMessage (pattern source: sanity-io visual-editing, GrapesJS) |
| Scheduler | Git-as-queue + webhook handoff; never direct platform APIs in-studio |
| Low-code shells | Rejected (Appsmith/Budibase/Directus and kin own a DB → breaks git-as-truth) |
| Desktop shell | Deferred; Node SEA covers the horizon |
