# Backdrop image sources

The photoreal poster backdrops are real photographs run through the Eduflick indigo
**duotone** treatment (`tools/treat-stock.mjs`). This file records the provenance of each
source. Raw sources live in `tools/stock-sources/` (gitignored); the committed
`*.png` here is the treated, on-brand derivative.

> `poster-seats.png`, `poster-build.png`, `poster-why.png`, `poster-proof.png`, `poster-enquiry.png`,
> and `poster-whatsapp.png` are **not** listed — they are abstract procedural backdrops
> (`tools/_backdrop-art.mjs` → `gen-backdrops-proc.mjs`), not photographs.

| Backdrop | Source | Author | License | Page |
| --- | --- | --- | --- | --- |
| `poster-program.png` | Procedural (`tools/gen-backdrops-proc.mjs`) — no external source | — | — | — |
| `poster-masterclass.png` *(retired — tile removed from posters.html; asset now unused)* | Wikimedia Commons | Anas Alshanti otenteko | CC0 | <https://commons.wikimedia.org/wiki/File:Keyboard_(Unsplash).jpg> |

*Pexels and the CC licenses on Wikimedia Commons permit commercial use. CC-BY / CC-BY-SA
sources require attribution — keep this file with the assets. Regenerate with
`npm run fetch:stock`.*
