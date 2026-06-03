# Asset add/update checklist

Brand binaries (logo, icons, partner, social) live in **one canonical place** and are
mirrored to the public root. Follow this so they don't drift.

## Where it goes (canonical: `design-system/assets/`)

| Asset kind | Path |
| --- | --- |
| Logo mark / lockup / favicon (SVG) | `design-system/assets/logo/` |
| Icon sprites | `design-system/assets/icons/` (`eduflick-icons.svg`, `mark-companions.svg`, `sprite.js`) |
| Partner / parent logos | `design-system/assets/partners/` |
| Social avatars / banners / OG (PNG) | `design-system/assets/logo/social/` |

`assets/` at the repo root is the **public mirror** for `index.html` + external links — keep it
in sync when you change a canonical file referenced publicly (favicon, og-card, banners).

## Checklist

- [ ] Added/updated in **`design-system/assets/`** (canonical), not a kit-local copy.
- [ ] SVG: uses the mark geometry from `tokens.json` (`brand.mark-path`) — square + one notch,
      ~3px corner; no third hue, no glow/bevel, not rotated.
- [ ] Referenced via a **relative path** to canonical (or `var()`-driven where it's CSS).
- [ ] If public-facing, mirrored to root `assets/` (and the mirror README still accurate).
- [ ] Partner logos (e.g. Tomatrix) kept in their own form — never recolored to indigo.
- [ ] Re-exported any PNG that's generated (`cd tools && npm run export:avatar`).
- [ ] No new duplicate tree — reuse canonical; don't create a `kit/assets/` copy.
