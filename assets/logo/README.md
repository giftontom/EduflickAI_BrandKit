# Eduflick AI — Logo Assets

> **⚠️ Mirror directory.** The canonical source is `../design-system/assets/logo/`.
> This directory is kept for backward compatibility with `index.html` and external
> references. If you update a logo file, update it in **both** locations.
> `../design-system/assets/partners/` is the canonical partner-logos location.

Canonical logo assets extracted from `Eduflick_Brand_Book_v4.html`. All files are vector SVG.

## Mark

The mark is a single closed path on a 180×180 viewBox — a rectangle with a triangular notch on the right edge (the flick).

| File | Fill | Use |
| --- | --- | --- |
| `mark.svg` | `currentColor` | Embedded in HTML/CSS where colour is inherited from text |
| `mark-indigo.svg` | `#5B5BF0` | Default on neutral surfaces |
| `mark-paper.svg` | `#F5F2EA` | On indigo, indigo-ink, or photographic backgrounds |
| `mark-ink.svg` | `#0B0822` | On paper or light backgrounds |
| `mark-outline.svg` | stroke `currentColor` | On busy or photographic surfaces |

Minimum sizes: app icon ≥ 40px · tab/profile ≥ 24px · favicon ≥ 16px · never below 10px.

## Lockups

Horizontal lockup at 1080×220. Stacked at 600×600. Manrope 800 is loaded via Google Fonts inside the SVG — convert text to outlines before sending to print or partners who can’t load remote fonts.

| File | Brand Book ID | Surface |
| --- | --- | --- |
| `lockup-primary.svg` | L.01 primary | Indigo-ink — canonical. Web, app, splash |
| `lockup-paper.svg` | L.02 paper | Paper — documents, decks, business cards, packaging |
| `lockup-indigo.svg` | L.03 indigo | Indigo — merch, hero spreads, brand stunts |
| `lockup-mono.svg` | L.04 mono | Editorial, partner co-brand, when colour competes |
| `lockup-stacked.svg` | L.05 stacked | Avatars, square crops, tall sidebars, mobile splash |

## Favicon

`favicon.svg` — 180×180 rounded indigo tile with paper mark inset. Link as:

```html
<link rel="icon" type="image/svg+xml" href="/assets/logo/favicon.svg">
```

## Colour reference

| Token | Hex |
| --- | --- |
| indigo-500 | `#5B5BF0` |
| indigo-300 (AI accent) | `#8B97FF` |
| indigo-ink | `#0B0822` |
| ink | `#0A0B10` |
| paper | `#F5F2EA` |
