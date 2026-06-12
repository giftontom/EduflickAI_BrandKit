# Brand Studio — Roadmap

The studio's phased development plan. Status as of 2026-06-12: **development paused at a
verified-working state** (commit `7327cef`) — all 11 routes render with zero console errors,
security probes hold, the facts guard is green across the repo, and the token pipeline is in
sync. This file is the resume point.

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

## PENDING — Phase 0 remainder (merge-readiness; do this first on resume)

| # | Item | Size |
|---|------|------|
| 1 | **Test suite** (`node:test`, zero new deps) under `tools/test/`: the six EDITMODE invariants (0 blocks / 1 match / 2-match ambiguity / traversal / non-html / retired-string — each asserting write-vs-no-write), traversal corpus against the static handler, guard-bypass on facts/comments/launch-grid (422 without override, written-with-flag with), atomicity (no tmp residue; corrupt JSON never crashes the manifest), concurrency (serialized queue, no lost writes), runner (unknown 400 / busy 409), Host/Origin 403 probes, whitelist-matches-README. Plus `tools/test/smoke.mjs` route-smoke (boot on `STUDIO_PORT=8099`, every route, zero console errors). Tests must snapshot + restore every file they touch. | L |
| 2 | **CI jobs**: `studio-tests` (npm ci → node --test → smoke), `server-zero-dep` (fail on any non-`node:`/non-relative import in server + lib), `vendor-integrity` (recompute the two vendored SHA-256s vs `vendor/README.md`), extend the generated-drift job to regenerate + diff `DESIGN_FEEDBACK.md`; run on PRs into `unify-design-system` as well as `main`. | M |
| 3 | **Docs reconciliation**: README write-surface section still says four paths — it is now six (launch-grid.json + the caro-data island); document the launch-grid + export-zip + tokens/status endpoints and the hardening behaviors. | S |
| 4 | **Cold-start UX**: dashboard first-class empty state when `exports/` is cold (explain + inline run buttons, refresh on exit 0); distinguish *absent* from *stale* everywhere staleness rolls up. | S/M |
| 5 | **Tokens-sync badge** in `#/brand` reading `GET /api/tokens/status` (endpoint shipped; UI pending) with a one-click `tokens` run. | S |
| 6 | **Hygiene**: rename `tools/package.json` to `eduflick-brand-studio`; exact-pin `playwright` + `style-dictionary`; add `test` / `test:smoke` scripts. | S |
| 7 | **FACTS.md cleanup**: fold the informal hand-typed notes (lead-magnet retirement, orientation idea) into proper FACTS structure — they pass the guard but sit loose in the tables. | S |
| 8 | **Merge sequence**: rebase onto `unify-design-system` → merge `unify-design-system` into `main` first (PR #1) → merge this branch with `--no-ff` + annotated tag `studio-v0.1.0` → move this CHANGELOG block under the version heading. | M |

**Exit criteria:** all tests green in CI, docs match code, cold-start sane, merged + tagged.

## Phase 1 — Operator loop (the studio becomes the daily cockpit)

- **Generation panel** (`#/generate`): server assembles the prompt deterministically —
  system prompt + template + a live-rendered FACTS block — so a small model cannot invent
  prices/seats/dates. Clipboard mode default (zero-dep); opt-in env-gated local-model bridge
  (spawn/fetch only, never an SDK import). Drafts land as a guarded `drafts/`-only write path.
- **QA runner on drafts**: one-click `scanTextRetired` + checklist hard-fails inline.
- **Operator dashboard**: three computed panels — stale-and-live (re-render in one click),
  due/overdue (`scheduledFor` vs today), blocked (guard failures / placeholders); cohort
  banner reading live seat count from FACTS.
- **Calendar + kanban board** over `status.json` (the existing 5-state enum, drag = status
  patch); wave-order guard for the launch mural (warn on out-of-order posting).
- **Status state machine**: legal-transition guard (draft→approved→scheduled→posted, any→retired;
  409 unless override) + append-only per-asset history; block scheduling stale/absent assets.

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
