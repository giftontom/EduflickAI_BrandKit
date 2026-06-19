# Eduflick AI — Web UI Kit (educator / institution + marketing)

High-fidelity recreation of the **Eduflick web product**: a dark educator/institution
**dashboard** wrapped in browser chrome, plus the public **marketing site**. Open
`index.html`; use the sidebar to move between dashboard sections, "view site ↗" to jump
to the marketing page, and "try free" / "log in" there to return to the app.

## Views

- **Dashboard › Overview** — stat cards, a 14-day completion bar chart, top subjects,
  a content-review queue.
- **Dashboard › Library** — searchable, filterable grid of lessons (subject mark-tiles,
  flick counts, live/review/draft status).
- **Dashboard › Analytics** — concept-retention donut, retention-by-subject bars, and a
  learner cohort table with progress + streak Sparks.
- **Dashboard › Settings** — white-label toggles, brand palette.
- **Marketing site** — "a feed for thinking" hero with a live feed mock, how-it-works,
  and a closing CTA. Dark indigo, the public face.

## Files

| File | What |
| --- | --- |
| `index.html` | Mounts the app in the browser-window frame; auto-scales to fit. |
| `components-web.jsx` | Tokens (`T`), `Mark`, `Wordmark`, `Icon`, `Em`, `Mono`, `Button`, `Tag`, `Panel`, `StatCard`, `TopNav`, `Sidebar`, `BarChart`. |
| `dashboard.jsx` | `CONTENT` / `LEARNERS` data, `Overview`, `Library`, `Analytics`, table + badges. |
| `marketing.jsx` | `Marketing` landing page + `MiniFlick`. |
| `app-web.jsx` | Shell: app ⇄ site toggle, sidebar section state, `SettingsScreen`. |
| `../browser-window.jsx` | macOS browser chrome (starter component). |
| `../../assets/icons/sprite.js` | Injects the icon + mark-companion sprites. |

## Conventions

- Charts are pure CSS/SVG (no chart library) — bars, conic-gradient donut, progress fills.
- Subject tiles clip a serif letter into the mark silhouette (`clipPath`).
- All color/type pulls from `T`, mirroring `colors_and_type.css`.
- Components export to `window` (Babel files don't share lexical scope).

Cosmetic recreations for prototyping — not production logic.
