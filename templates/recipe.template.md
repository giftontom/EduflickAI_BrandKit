# Recipe — <artifact name>

> Copy this into `design-system/recipes/<name>.md`. Recipes produce **HTML artifacts** a
> model assembles from `snippets.md` — they don't invent design. See `recipes/README.md`.

**Produces:** <what> · **Canvas:** <e.g. 1080×1350> · **Export via:** <kit / `tools` / print>

## FACTS (fill before generating — pull from `content-studio/FACTS.md`)

```text
PROGRAM      = [[…]]
DATE         = [[NOT SET]]
PRICE        = [[…]]
SEATS        = [[… of …]]
LINK         = [[…]]
```

> If a value isn't in FACTS.md, leave the `[[PLACEHOLDER]]` — never invent.

## Inputs

- Headline (lowercase; one serif accent word): …
- Eyebrow (mono, UPPERCASE): …
- Proof / body: …
- CTA or scarcity flag: …

## Assembly (use snippets / components — change text, not the palette/fonts/mark)

1. Frame — `S14` / canvas size above.
2. Background — `.hero-indigo` or `S11`; cinematic? `.cine-*` + `.surface` + `.halo`.
3. Eyebrow `S4` → headline `S5` → proof `S6` → CTA `.btn`/`.tag-scarcity` → footer `.brand-footer`.

## Output rules

- Indigo + neutral only (coral = scarcity/CTA only). No emoji. Mark unaltered.
- Use `var(--token)` / component classes — no hardcoded hex.

## Done when

- [ ] Rendered and **looked at** (not assumed)
- [ ] `design-system/QA_CHECKLIST.md` passes
- [ ] Exported at the correct size
