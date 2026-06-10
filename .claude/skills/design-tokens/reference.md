# design-tokens — reference

## Why Style Dictionary (not a hand-written CSS file)

One source (`tokens.json`), many outputs, zero drift. CSS for surfaces, flat JSON for tooling
and snippet resolution, a JS module for exporters that need the brand color / logo path / fonts
link. Change a value once; every consumer updates on rebuild.

## Token groups → outputs

| Group in tokens.json | Goes to CSS? | Notes |
| --- | --- | --- |
| `color.*` | yes | the palette: accent ramp + aliases, neutrals, lines, semantic |
| `font.*` `type.*` `weight.*` `track.*` | yes | type system |
| `space.*` `radius.*` `shadow.*` `motion.*` | yes | layout + feel |
| `meta.*` | **no** (filtered) | `logo-path`, `fonts-link`, `version` — non-color; read from `tokens.mjs` |

The CSS var name is the **leaf key** (`color.accent-500` → `--accent-500`), set by the
`name/leaf` transform in `tokens.config.mjs`. This keeps names short and predictable so other
skills can hardcode `var(--accent)` etc.

## Configuration (env)

| Var | Default | Meaning |
| --- | --- | --- |
| `TOKENS_SRC` | `./tokens.json` | the brand profile to compile |
| `OUT_DIR` | `./build` | where `tokens.css` / `tokens.flat.json` / `tokens.mjs` land |
| `FLAT` | `./build/tokens.flat.json` | (snippets) the resolved map to read |
| `SRC` / `OUT` | `./snippets.src.md` / `./snippets.md` | (snippets) placeholder source / output |

## Snippet drift guard — the pattern

Copy-paste snippet bins (for small models, or docs) must carry literal hex/values **inline**,
because each block is pasted alone and `var()` wouldn't resolve. That risks the literals drifting
from `tokens.json`. The fix: write `snippets.src.md` with `{{accent}}`, `{{paper}}`, … placeholders;
`build-snippets.mjs` resolves them from `tokens.flat.json` into `snippets.md`. Only `snippets.src.md`
is hand-edited; `snippets.md` is generated.

## CI drift guard — GitHub Actions step

```yaml
- name: tokens & snippets are not stale
  run: |
    npm ci
    node scripts/build-tokens.mjs
    node scripts/build-snippets.mjs   # omit if you don't use a snippet bin
    git diff --exit-code -- build/ snippets.md \
      || (echo "::error::tokens/snippets out of date — run the builds and commit" && exit 1)
```

## Adapting an existing brand

Map the brand's real palette into `color.*`, set the four `accent-*` aliases to the ramp stops
you want halos/gradients to use, paste the font stacks, then rebuild. The Eduflick brand in this
repo is exactly this pattern: its `design-system/tokens/tokens.json` is one concrete brand-profile
instance (indigo `#5B5BF0`), compiled by the same Style Dictionary approach.

## Gotchas

- **Add tints, not hues.** A third hue breaks brand cohesion faster than anything else.
- **Commit the generated files** and guard them in CI, or they silently rot.
- **Keep the aliases in sync** with the ramp — downstream skills read `--accent*`, not `--accent-500`.
- Style Dictionary v4 needs Node ≥ 18 and `"type": "module"`.
