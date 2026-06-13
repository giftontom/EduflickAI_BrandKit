# Brand Studio — Roadmap

The studio's phased development plan. Status as of 2026-06-13: **Phase 0 + Phase 1a + Phase 1b-1
complete** (HEAD `4e2d5cb`). Phase 0 gave the studio its first test suite + CI purity jobs + docs +
cold-start UX + hygiene. Phase 1a made status a guarded state machine with audit history, a
`#/board` kanban, and operator dashboard panels. Phase 1b-1 added the `#/generate` panel
(deterministic FACTS-grounded prompt assembly), a QA runner, and the guarded `drafts/` write
surface (the 7th write path). All green: **81/81 node:test, 13/13 Playwright smoke**, facts clean
(191 files), zero-dep + vendor-integrity hold. **Owner-gated items still pending:** FACTS.md
content reconciliation (Phase-0 tail item 7 — brand truth, partly speculative) and the merge to
`main` (item 8 — outward-facing push). Next un-gated work: **Phase 1b-2** (calendar, blocked panel,
schedule→stale cross-check, live-model bridge). This file is the resume point.

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

**Phase 1b-2 — PENDING (no owner gate):**
- **Calendar** (month grid) over `scheduledFor`, paired with the board; wave-order guard for the
  launch mural (warn on out-of-order posting).
- **"Blocked" dashboard panel** (the third ops panel, deferred from 1a): drafts failing QA /
  containing `[[NEEDS]]` — now buildable since drafts exist.
- **Schedule→stale cross-check**: block/flag a transition to scheduled/posted on a stale/absent
  asset (server-side, reusing the manifest staleness).
- **Cohort banner**: live seat count + key date from FACTS — *gated on the FACTS.md cleanup
  (Phase-0 tail item 7); until then it would surface placeholder rows.*
- **Live-model bridge** (opt-in): env-gated `STUDIO_MODEL_CMD`/`STUDIO_MODEL_URL` — spawn/fetch
  only, never an SDK import; dormant (501) unless configured.

## Phase 2 — Review + pipeline (content travels end-to-end)

- Full brief → generate → guard → render → QA → status pipeline (mostly wiring existing parts).
- Annotation layer matures into review gates: an asset cannot reach `approved` with open
  blocking comments.
- Comments double-write self-heal: regenerate the digest from JSON on boot.
- Dirty-file warn-and-diff before FACTS/EDITMODE overwrites.
- Channel variants: one approved draft → per-channel repurposed versions, each tracked.

## Phase 3 — Multi-brand platform

- Extract `brand.config.json` (brand id, token source, FACTS path, surfaces, actions,
  prompts, retired-string list) — the studio's only knowledge of "which brand".
- Workspace mode: N brands, one process; every traversal guard re-derived per brand root
  (hard test gate — cross-tenant write escape is the failure mode).
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
