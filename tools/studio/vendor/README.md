# vendor — studio's two client libraries

Committed, pinned, offline-capable. Classic scripts (UMD), loaded via `<script src>` before the
studio's module script; the app uses the globals `marked` and `DOMPurify`. No CDN at runtime.

| File            | Package     | Version | Global      | License               |
| --------------- | ----------- | ------- | ----------- | --------------------- |
| `marked.min.js` | `marked`    | 12.0.2  | `marked`    | MIT                   |
| `purify.min.js` | `dompurify` | 3.4.9   | `DOMPurify` | Apache-2.0 OR MPL-2.0 |

## Provenance

Each file was downloaded twice from jsDelivr (npm mirror) and the two copies compared by SHA-256
before committing.

- `marked.min.js` — <https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js>
  SHA-256: `15fabce5b65898b32b03f5ed25e9f891a729ad4c0d6d877110a7744aa847a894`
- `purify.min.js` — <https://cdn.jsdelivr.net/npm/dompurify@3.4.9/dist/purify.min.js>
  SHA-256: `3c16cc90eb152b823b71b8585cd79e7fb7cd7a380157a800dfbd9459aad5f726`

Verify locally:

```bash
shasum -a 256 tools/studio/vendor/*.js
```

To upgrade: replace the file with a newer pinned build from the same URLs, update the table and
hashes here, and re-run `node tools/check-facts.mjs` (these bundles are inside the guard's scan
scope).
