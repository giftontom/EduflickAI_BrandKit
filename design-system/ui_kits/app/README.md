# Eduflick AI — App UI Kit (consumer mobile)

A high-fidelity, interactive recreation of the **Eduflick learning app** — the
consumer "feed for thinking." Dark theme by default. Open `index.html` and tap a
flick card to enter the player; use the bottom nav to move between screens.

## Screens
- **Feed** (`for you` / `trending` / `saved`) — vertical list of flick cards, with a
  "continue learning" lead card showing per-flick progress.
- **Flick player** — the signature full-screen 60-second lesson: segment progress,
  lowercase title, serif-italic concept line, body, play/prev/next + save/share.
- **Search** — search field, trending chips, subject tiles (letter-in-mark), results.
- **Saved** — flagged flicks.
- **Profile** — avatar, streak **Spark**, stats, earned subject badges.

## Files
| File | What |
| --- | --- |
| `index.html` | Mounts the app inside the iOS device frame; auto-scales to fit. |
| `components.jsx` | Tokens (`T`), `Mark`, `Wordmark`, `Icon`, `Em`, `Mono`, `Button`, `Tag`, `Spark`, `TopBar`, `BottomNav`. |
| `screens-feed.jsx` | `LESSONS` data, `FeedCard`, `FeedScreen`, `FlickPlayer`. |
| `screens-more.jsx` | `SubjectTile`, `SearchScreen`, `SavedScreen`, `ProfileScreen`. |
| `app.jsx` | Screen state + flick overlay. |
| `../ios-frame.jsx` | Device bezel (starter component, used `dark`, no nav bar). |
| `../../assets/icons/sprite.js` | Injects the icon + mark-companion sprites for `<use href="#ic-…">`. |

## Conventions
- Icons come from the injected house sprite: `<Icon name="play" />`.
- The mark is `<Mark size fill />`; the wordmark is built in HTML via `<Wordmark />`.
- All color/type pulls from `T` in `components.jsx`, mirroring `colors_and_type.css`.
- Components export to `window` (separate Babel scopes don't share lexical scope).

These are cosmetic recreations for prototyping — not production logic.
