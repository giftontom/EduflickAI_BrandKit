# Eduflick AI — Social Profile Images

PNG assets sized for direct upload to each platform. All renders use the canonical lockup and colour tokens from `Eduflick_Brand_Book_v4.html`.

## Profile avatars (square)

Use these as the profile picture / app icon. Mark-only — wordmarks read poorly under circular crops.

| File | Use |
| --- | --- |
| `avatar-indigo-1024.png` | Default. Apple/iOS, App Store, high-res uploads |
| `avatar-indigo-400.png` | Twitter/X, LinkedIn, Discord |
| `avatar-ink-1024.png` | Flat indigo-ink fill |
| `avatar-ink-400.png` | Same, smaller |
| `avatar-pf-av-1024.png` | **Instagram default** — exact `.pf-av` from Instagram Kit (`150deg` `i-700`→`i-ink` + glow) |
| `avatar-pf-av-400.png` | Same, upload size |
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

Profile avatar (`.pf-av`): `cd tools && npm run export:avatar` (Playwright screenshot from `instagram-kit.html`).

Other social PNGs were generated with cairosvg / Chrome headless (lockup renders).
