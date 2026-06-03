# Snippet + component — <name>

> Adding a reusable element means three coordinated edits so it stays single-sourced.
> See `design-system/COMPONENTS.md`.

## 1. Token-based class → `design-system/components.css`

```css
.my-component {
  background: var(--bg-card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-xl);
  color: var(--fg1);
  /* no hardcoded hex/fonts — use var(--token) or a role var */
}
```

## 2. Paste-alone block → `design-system/recipes/snippets.src.md`

Use `{{token}}` placeholders for any brand value (resolved on `npm run snippets`):

```html
<div style="background:{{ink-2}};border:1px solid rgba(245,242,234,0.08);border-radius:18px;color:{{paper}}">
  …
</div>
```
Then: `cd tools && npm run snippets` (regenerates the inline `snippets.md`).

## 3. Row → `design-system/COMPONENTS.md`

| Component | Class(es) | Snippet | Key tokens | Notes |
| --- | --- | --- | --- | --- |
| **<name>** | `.my-component` | S<id> | `--bg-card`, `--hairline` | <do/don't> |

## Checklist

- [ ] No hardcoded brand values (token/var only)
- [ ] New design values added to `tokens/tokens.json` first (`npm run tokens`)
- [ ] `npm run snippets` run; `snippets.md` committed
- [ ] Inventory row added
