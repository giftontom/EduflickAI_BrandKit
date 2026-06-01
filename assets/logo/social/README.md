# Eduflick AI — Social Profile Images

PNG assets sized for direct upload to each platform. All renders use the canonical lockup and colour tokens from `Eduflick_Brand_Book_v4.html`.

## Profile avatars (square)

Use these as the profile picture / app icon. Mark-only — wordmarks read poorly under circular crops.

| File | Use |
| --- | --- |
| `avatar-indigo-1024.png` | Default. Apple/iOS, App Store, high-res uploads |
| `avatar-indigo-400.png` | Twitter/X, LinkedIn, Instagram, Discord |
| `avatar-ink-1024.png` | Dark-mode alt where indigo competes with surrounding UI |
| `avatar-ink-400.png` | Same, smaller |
| `avatar-paper-1024.png` | Light-mode / printed contexts |
| `avatar-paper-400.png` | Same, smaller |

## Cover banners

| File | Platform | Spec |
| --- | --- | --- |
| `twitter-banner-1500x500.png` | Twitter / X | 1500×500. Profile pic overlays lower-left ~200×200; layout keeps lockup central. |
| `linkedin-banner-1584x396.png` | LinkedIn (Company + Personal) | 1584×396. Profile pic overlays lower-left circle; lockup centered. |
| `youtube-banner-2560x1440.png` | YouTube channel art | 2560×1440. Lockup positioned inside the 1546×423 all-device safe area. |

## Open Graph share card

| File | Use |
| --- | --- |
| `og-card-1200x630.png` | Link previews on Twitter/X, LinkedIn, Slack, Facebook, iMessage. Reference as `og:image` and `twitter:image`. |

```html
<meta property="og:image" content="https://eduflick.ai/og-card-1200x630.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://eduflick.ai/og-card-1200x630.png">
```

## Regenerating

The generator script is at `/tmp/gen_social.py` (not committed). It uses cairosvg for mark-only renders and Chrome headless for the lockup/tagline renders (so Manrope and Instrument Serif load from Google Fonts). Re-run with `python3 /tmp/gen_social.py`.
