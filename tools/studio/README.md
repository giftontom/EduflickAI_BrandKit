# eduflick brand studio

One local platform to view and manage every brand asset: PNG galleries for the social surfaces
(with staleness + launch-pipeline status), the launch-grid mural and brochure / deck viewers
rendered live in-app, a markdown reader for every doc (FACTS.md pinned first), brand swatches and
logos, a guarded FACTS.md editor, and run buttons for the export/build pipeline with live streamed
logs. You can drop pin comments on any post, slide, brochure page, or launch tile; they collect
into a committed digest a separate Claude Code chat reads to implement the design edits. A command
palette (`Ctrl`/`Cmd-K`) jumps to any surface, doc, or action.

Zero npm dependencies on the server (node built-ins only), zero build step on the client
(vanilla ES modules + two vendored libraries).

## Quick start

```bash
cd tools && npm ci && npm run studio
# → http://localhost:8090/tools/studio/
```

`exports/` is gitignored, so on a fresh clone every gallery starts empty — that is the normal
cold state. Each surface shows a run-export button; running it populates the grid.

## Route map

| Route               | View                                                                |
| ------------------- | ------------------------------------------------------------------- |
| `#/`                | dashboard — per-surface counts, stale/missing rollup, quick actions |
| `#/social/:surface` | gallery for `instagram` / `posters` / `stories` / `launch-grid`     |
| `#/instagram`       | instagram showcase — the approved-only feed grid (links to gallery) |
| `#/launch`          | the live launch-grid mural + carousels, in-app, with annotation     |
| `#/deck`            | program deck — live slide viewer (page nav / zoom) + export grid    |
| `#/brochures`       | brochures, deck, brand book, kits — live viewer + page nav + zoom   |
| `#/brand`           | token swatches, type specimens, logo wall                           |
| `#/docs/*`          | markdown tree + rendered view                                       |
| `#/facts`           | guarded FACTS.md editor                                             |
| `#/feedback`        | design-feedback digest browser (every pin, grouped by source file)  |
| `#/actions`         | pipeline runner + streaming log console                             |

## API

All routes are JSON unless noted. The server also serves the whole repo statically (the studio
app itself, export PNGs, CSS, fonts).

| Route                     | Method     | Behavior                                                                               |
| ------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `/api/manifest`           | GET        | live-scanned manifest: surfaces, documents, docs, brand                                |
| `/api/status`             | GET / POST | read store / `{id, patch}` merge; serialized queue; atomic write                       |
| `/api/actions`            | GET        | `{running, lastRun}`                                                                   |
| `/api/actions/run`        | POST       | `{action}` from a hardcoded whitelist; single-flight (409 when busy)                   |
| `/api/actions/:id/stream` | GET        | SSE (`log` / `exit` events); replays buffered lines, then live; 15 s heartbeat         |
| `/api/tokens/status`      | GET        | `{inSync, stale[], checkedAt, method:'mtime'}` — token/snippet sources vs artifacts    |
| `/api/editmode`           | POST       | `{file, edits}` — rewrites one EDITMODE block inside `design-system/*.html`            |
| `/api/facts/check`        | POST       | `{content}` → `{violations}` (retired-string scan, in process)                         |
| `/api/facts/save`         | POST       | `{content, override?}` → 422 with violations unless override; then runs the full guard |
| `/api/comments`           | GET / POST | read store / upsert `{comment, override?}`; text guarded; regenerates the digest       |
| `/api/comments/:id`       | DELETE     | remove a comment; regenerates the digest                                               |
| `/api/launch-grid`        | GET        | `{plan, slides, generatedAt}` — launch-grid.json plan + the caro-data slide island     |
| `/api/launch-grid/post`   | POST       | `{id, patch, override?}` — patch one post (`caption`/`notes`/`role`/`wave`); guarded   |
| `/api/launch-grid/slides` | POST       | `{slug, slides, title?, surf?, override?}` — rewrite one carousel's slides; guarded     |
| `/api/export-zip`         | POST       | `{files:[{src\|text, name}], zipName?}` → `application/zip`; read-only, `exports/`-only |
| `/api/generate/templates` | GET        | `[{file, title}]` — the `prompts/` templates (read-only)                               |
| `/api/generate`           | POST       | `{template, includeCheatsheet?, task?}` → `{prompt, facts, warnings}`; assembles the SYSTEM+USER prompt from `00_SYSTEM_PROMPT.md` + live `FACTS.md` + the chosen template. Read-only |
| `/api/generate/run`       | POST       | same body → opt-in local-model bridge: assembles the same prompt, runs it through a local model, returns `{output, stderr, exitCode, timedOut, prompt}`. **Dormant `501` unless `STUDIO_MODEL_CMD` is set** (nothing is spawned); read-only |
| `/api/qa/check`           | POST       | `{text}` → `{violations, checklist}` (read-only): facts-guard violations + emoji / forbidden-word hits |
| `/api/drafts`             | GET / POST | GET `[{name, mtime, size, needsInput, violations}]` over `drafts/*.md`; POST `{channel?, slug, content}` → atomic `drafts/<name>.md` (slug/channel `^[a-z0-9][a-z0-9-]*$`, traversal-guarded, retired-string clean — 422 with no write and no override otherwise) |

Action whitelist: `export`, `export:ig`, `export:posters`, `export:stories`, `export:slides`,
`export:pdf`, `gen:backdrops:proc`, `gen:feedback`, `check:facts`, `tokens`, `snippets`. Each runs
as `npm run <name>` in `tools/` — constant argv, no shell.

## Write surface

The studio can write exactly seven paths, nothing else:

1. `content-studio/status.json` — launch-pipeline status entries (`/api/status`); `status` must be
   one of the known states, writes serialize through an in-process queue
2. `content-studio/FACTS.md` — only after a server-side retired-string re-check, or with an
   explicit override (`/api/facts/save`); the save is followed by a full `check:facts` run
3. `content-studio/design-comments.json` + its generated `content-studio/DESIGN_FEEDBACK.md`
   digest (`/api/comments`) — both are fixed paths, never client-supplied; on every write the
   JSON store is persisted and the markdown digest regenerated from it; `assetRef.source` must
   resolve to a real file under the repo root and comment text is re-scanned (422 unless override)
4. the `/*EDITMODE-BEGIN*/ … /*EDITMODE-END*/` JSON blocks inside `design-system/**/*.html`
   (`/api/editmode`) — never any other byte of those files; the path must resolve inside
   `design-system/` and end in `.html`, the edit must match exactly one block, and the rewritten
   block is guard-scanned (retired strings + `[[placeholder]]` markers) before any write
5. `content-studio/launch-grid.json` — the Instagram launch-grid plan (`/api/launch-grid/post`);
   only the `caption`/`notes`/`role`/`wave` keys of one post may change (caption shape enforced,
   `wave` an integer 1–4), and all new text is re-scanned server-side (422 unless override)
6. the `<script id="caro-data">` JSON island inside `design-system/collateral/launch-grid.html`
   (`/api/launch-grid/slides`) — one carousel's slides at a time, matched by slug; only the island
   bytes are rewritten, `[[placeholders]]` and a literal `</script` are hard-rejected, and the
   copy is brand-guarded (422 unless override)
7. `content-studio/drafts/<name>.md` — a generated draft (`POST /api/drafts`); the `slug` and
   optional `channel` are sanitized to `^[a-z0-9][a-z0-9-]*$` and joined into `<channel>-<slug>.md`,
   the resolved path is traversal-guarded to stay inside `drafts/`, the write is atomic, and the
   content is retired-string-guarded — a violation is 422 with **no write and no override** (the
   repo facts-guard forbids retired strings anywhere under `content-studio/`, so drafts must stay
   clean)

All writes are atomic and durable (tmp file → fsync → rename). There is no generic write endpoint;
every path above is a dedicated, server-side-validated handler. `/api/export-zip` is read-only —
it bundles already-rendered PNGs from `exports/` and never writes the repo.

## Design feedback → Claude Code

Enter annotate mode on any asset (the `annotate` toggle in the lightbox, the launch-grid mural, or
a brochure/deck viewer), click where the change belongs, and type the instruction. Each pin stores
a normalized coordinate (images) or an element selector / per-page coordinate (iframes) plus the
**real source file** it maps to. Every pin is mirrored into `content-studio/DESIGN_FEEDBACK.md`,
grouped by source file — so in a fresh Claude Code chat you open that one digest and say _"implement
the design feedback"_; each entry names the file to edit, the anchor, and the instruction. Mark a
pin `resolved` / `won't fix` from the pin popover or the `#/feedback` browser; the digest reflects
it. Comment text is **not** brand-gated (free-form review may quote retired strings), so the two
comment files are excluded from the `check-facts` scan; the editor still surfaces violations and lets
you save past them with an explicit override that is recorded on the comment.

## Security posture

- Binds `127.0.0.1` only — never exposed to the network. The bind host is asserted to be loopback
  (`127.0.0.1` / `localhost` / `::1`) at boot; if a future edit points it elsewhere the process
  refuses to start. Port is `STUDIO_PORT`, then `PORT`, then `8090`.
- A busy port is fatal by design: the server fails fast on `EADDRINUSE` (printing the `lsof` line to
  free it) instead of dying with a stack trace — a busy port almost always means a stale test mock
  or a second studio.
- DNS-rebinding guard: every request's `Host` header must be a loopback hostname (`localhost` /
  `127.0.0.1` / `[::1]`); anything else is `403` before routing.
- CSRF guard: a non-`GET`/`HEAD` `/api` request carrying an `Origin` header must be same-origin
  (`http://localhost|127.0.0.1|[::1]:<port>`), else `403`.
- **No `Access-Control-Allow-Origin` (or any other CORS) header is ever set — on the API
  responses *or* the static handler.** The static handler previously sent
  `Access-Control-Allow-Origin: *`; that was removed, so no response opts cross-origin reads in.
  The browser blocks cross-origin reads on its own.
- Static handler rejects path traversal (decode → normalize → must stay under the repo root)
  and NUL bytes.
- Actions: body must name an own key of the frozen whitelist; spawned without a shell;
  single-flight (`409` when one is running). A watchdog (`STUDIO_ACTION_TIMEOUT_MS`, default
  15 min) sends `SIGTERM` then `SIGKILL` 5 s later if the run overruns. The last finished run
  (`lastRun`) is persisted to `tools/.studio-state.json` (gitignored) and reloaded at boot.
- Editmode: path must resolve inside `design-system/`, end in `.html`, exist, and contain an
  EDITMODE block; the edit must match exactly one block; the rewritten block is guard-scanned
  (retired strings, unresolved placeholders) before any write.
- FACTS saves are re-scanned server-side (client checks are advisory only) and followed by a
  full `check:facts` run whose output is returned to the UI.
- Comments write only to the two fixed comment paths (no body-supplied path); `assetRef.source` is
  validated to resolve to a real file under the repo root before a pin persists; text is re-scanned
  server-side (422 unless override). Launch-grid/iframe `postMessage` is gated on the frame's own
  `contentWindow`.
- Launch-grid writes touch only the known keys of one post / one carousel slug; `[[placeholders]]`
  (which would brick the export pre-flight) and a literal `</script` in the island are hard-rejected,
  and all new copy is brand-scanned (422 unless override).
- All writes are atomic AND durable: a tmp file in the same directory is written, `fsync`ed so the
  bytes reach disk, then `rename`d into place — a crash mid-write can never leave a half-written file.
- Vendored client libraries are pinned with recorded SHA-256 hashes (see `vendor/README.md`);
  rendered markdown is sanitized with DOMPurify.
- `STUDIO_CONTENT_DIR`: the directory every `content-studio` data path is read from and written to
  (`status.json`, `FACTS.md`, `design-comments.json`, the generated `DESIGN_FEEDBACK.md`,
  `launch-grid.json`, `BRAND_CHEATSHEET.md`, `prompts/`, `drafts/`, and the `/content-studio/`
  static + docs surface). It defaults to `content-studio/` at the repo root; with it **unset every
  path and behavior is byte-identical** to serving from `content-studio/`. The test harness points
  it at a throwaway copy so a test run never touches live owner data. `design-system/` paths (the
  launch-grid HTML, EDITMODE targets) and the repo-wide static/manifest scan always stay rooted at
  the repo root regardless.
