# Backdrop image sources

The photoreal poster backdrops are real photographs run through the Eduflick indigo
**duotone** treatment (`tools/treat-stock.mjs`). This file records the provenance of each
source. Raw sources live in `tools/stock-sources/` (gitignored); the committed
`*.png` here is the treated, on-brand derivative.

> `poster-seats.png` is **not** listed — it is an abstract procedural backdrop
> (`tools/gen-backdrops-proc.mjs`), not a photograph.

| Backdrop | Source | Author | License | Page |
| --- | --- | --- | --- | --- |
| `poster-program.png` | Wikimedia Commons | BalticServers.com | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:BalticServers_data_center.jpg |
| `poster-masterclass.png` | Wikimedia Commons | Anas Alshanti otenteko | CC0 | https://commons.wikimedia.org/wiki/File:Keyboard_(Unsplash).jpg |

*Pexels and the CC licenses on Wikimedia Commons permit commercial use. CC-BY / CC-BY-SA
sources require attribution — keep this file with the assets. Regenerate with
`npm run fetch:stock`.*
