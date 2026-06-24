# Workflow — the everyday loops

> The repeatable jobs, each as **edit → regenerate → render → look → gate**. Run all `npm`
> commands from `tools/` unless noted. First-time setup: [`SETUP.md`](SETUP.md). The why +
> the rules: [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

The golden loop for anything visual is **never trust the markup — render it and look** before
calling it done, then run the fact gate.

## Change a brand token (color / type / spacing)

```bash
# 1. edit the source
$EDITOR design-system/tokens/tokens.json
# 2. regenerate the outputs (never hand-edit tokens.css / tokens.flat.json / brand.tokens.mjs)
cd tools && npm run tokens
# 3. bump brand.version in tokens.json + add a CHANGELOG entry, then re-export any touched visuals
```

## Produce or change a visual (poster, story, brochure page, tile)

```bash
# 1. follow the recipe in design-system/recipes/<kind>.md; assemble in the artifact HTML
#    (design-system/collateral/*.html, brochures/*.html, design-system/slides/*.html)
# 2. pull every live number from content-studio/FACTS.md — never from memory
# 3. render to exact pixels and LOOK at the output
cd tools && npm run export:posters      # or export:stories / export:wa / export:share / export:slides / export:ig
# 4. for a downloadable brochure PDF: npm run export:pdf  (or the in-page Download PDF button)
# 5. gate it
npm run check:facts
```

Mark each exportable element with `data-export="name"`; the exporter screenshots each at true
pixels. Re-export whenever the canvas changes.

## Produce copy (caption, carousel, reel, ad, WhatsApp, LinkedIn)

```text
1. open the matching prompt in content-studio/prompts/<channel>.md
2. fill its FACTS block from content-studio/FACTS.md (missing value → [[NEEDS: …]], never guess)
3. generate; drafts land in content-studio/drafts/
4. QA with content-studio/QA_CHECKLIST.md (voice, no emoji, numbers-as-proof)
```

Small/cheap models are fine — the FACTS block is what keeps them accurate. See
`content-studio/SMALL_MODELS_GUIDE.md`.

## Generate an image backdrop (for posters / stories)

```bash
cd tools
npm run gen:backdrops          # default provider (reads ../.env.local for keys)
npm run gen:recraft            # PROVIDER=recraft   (subjects / vector / icons)
npm run gen:gemini             # PROVIDER=gemini
npm run gen:backdrops:proc     # procedural fallback — no API key, always works
npm run gen:story-backdrop     # the 9:16 story backdrops (story-fae, story-program)
```

Backdrops are mood-only **behind** crisp HTML/SVG type; the brand rule + provider trade-offs are
in `design-system/AI_IMAGERY_GUIDE.md` and `tools/README.md`.

## Evaluate in the brand studio

```bash
cd tools && npm run studio     # → http://127.0.0.1:8090/tools/studio/
```

Browse the galleries + document library, open the **program room** to review every current FAE
artifact, set status / leave annotations, edit `FACTS.md`, manage the launch grid. The studio reads
a live manifest, so anything you export shows up on refresh.

## The fact gate (run before every commit)

```bash
cd tools && npm run check:facts        # retired strings, [[placeholders]], invented dates, "3 deployed"
npm run tokens && npm run snippets      # regenerate; CI fails if generated files drift
npm test                                # studio + server test suite (node --test)
```

## Update + deploy the live apply site

```bash
cd FAE_apply
npm install
cp .dev.vars.example .dev.vars         # fill local secrets
npx wrangler dev                       # walk the apply + thanks flow locally
# deploy is GATED — outward-facing, confirm first:
npx wrangler deploy
```

Keep the form's copy in step with `FACTS.md` (`scripts/sync-brand.mjs` pulls brand values). Details:
[`../FAE_apply/README.md`](../FAE_apply/README.md).
