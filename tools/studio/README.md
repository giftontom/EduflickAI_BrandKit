# eduflick brand studio

One local platform to view and manage every brand asset: PNG galleries for the social surfaces
(with staleness + launch-pipeline status), iframe panels for brochures / deck / brand book / kits,
a markdown reader for every doc (FACTS.md pinned first), brand swatches and logos, a guarded
FACTS.md editor, and run buttons for the export/build pipeline with live streamed logs.

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
| `#/deck`            | program deck slides                                                 |
| `#/brochures`       | brochures, deck, brand book, kits as iframe panels                  |
| `#/brand`           | token swatches, type specimens, logo wall                           |
| `#/docs/*`          | markdown tree + rendered view                                       |
| `#/facts`           | guarded FACTS.md editor                                             |
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

Action whitelist: `export`, `export:ig`, `export:posters`, `export:stories`, `export:slides`,
`export:pdf`, `gen:backdrops:proc`, `check:facts`, `tokens`, `snippets`. Each runs as
`npm run <name>` in `tools/` — constant argv, no shell.

## Write surface

The studio can write exactly three things, nothing else:

1. `content-studio/status.json` — launch-pipeline status entries (`/api/status`)
2. `content-studio/FACTS.md` — only after a server-side retired-string re-check, or with an
   explicit override (`/api/facts/save`)
3. the `/*EDITMODE-BEGIN*/ … /*EDITMODE-END*/` JSON blocks inside `design-system/**/*.html`
   (`/api/editmode`) — never any other byte of those files

All three writes are atomic (tmp file + rename). There is no generic write endpoint.

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
- Vendored client libraries are pinned with recorded SHA-256 hashes (see `vendor/README.md`);
  rendered markdown is sanitized with DOMPurify.
