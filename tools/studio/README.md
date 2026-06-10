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
| `/api/editmode`           | POST       | `{file, edits}` — rewrites one EDITMODE block inside `design-system/*.html`            |
| `/api/facts/check`        | POST       | `{content}` → `{violations}` (retired-string scan, in process)                         |
| `/api/facts/save`         | POST       | `{content, override?}` → 422 with violations unless override; then runs the full guard |
| `/api/comments`           | GET / POST | read store / upsert `{comment, override?}`; text guarded; regenerates the digest       |
| `/api/comments/:id`       | DELETE     | remove a comment; regenerates the digest                                               |

Action whitelist: `export`, `export:ig`, `export:posters`, `export:stories`, `export:slides`,
`export:pdf`, `gen:backdrops:proc`, `gen:feedback`, `check:facts`, `tokens`, `snippets`. Each runs
as `npm run <name>` in `tools/` — constant argv, no shell.

## Write surface

The studio can write exactly four things, nothing else:

1. `content-studio/status.json` — launch-pipeline status entries (`/api/status`)
2. `content-studio/FACTS.md` — only after a server-side retired-string re-check, or with an
   explicit override (`/api/facts/save`)
3. the `/*EDITMODE-BEGIN*/ … /*EDITMODE-END*/` JSON blocks inside `design-system/**/*.html`
   (`/api/editmode`) — never any other byte of those files
4. `content-studio/design-comments.json` + its generated `content-studio/DESIGN_FEEDBACK.md`
   digest (`/api/comments`) — both are fixed paths, never client-supplied

All writes are atomic (tmp file + rename). There is no generic write endpoint.

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

- Binds `127.0.0.1` only — never exposed to the network.
- Static handler rejects path traversal (decode → normalize → must stay under the repo root)
  and NUL bytes.
- Actions: body must name an own key of the frozen whitelist; spawned without a shell;
  single-flight.
- Editmode: path must resolve inside `design-system/`, end in `.html`, exist, and contain an
  EDITMODE block; the edit must match exactly one block; the rewritten block is guard-scanned
  (retired strings, unresolved placeholders) before any write.
- FACTS saves are re-scanned server-side (client checks are advisory only) and followed by a
  full `check:facts` run whose output is returned to the UI.
- Comments write only to the two fixed comment paths (no body-supplied path); `assetRef.source` is
  validated to resolve to a real file under the repo root before a pin persists; text is re-scanned
  server-side (422 unless override). Launch-grid/iframe `postMessage` is gated on the frame's own
  `contentWindow`.
- Vendored client libraries are pinned with recorded SHA-256 hashes (see `vendor/README.md`);
  rendered markdown is sanitized with DOMPurify.
