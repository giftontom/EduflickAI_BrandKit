# Setup — first run

> Get the three runnable things working: the **build/export toolchain**, the **brand studio**,
> and the **live apply site** locally. The one-line install is also in
> [`../CONTRIBUTING.md` § Setup](../CONTRIBUTING.md); this is the fuller version. The daily
> commands live in [`WORKFLOW.md`](WORKFLOW.md).

**Prereqs:** Node ≥ 18 (see `.nvmrc`) and git. macOS/Linux shells assumed.

## 1 · The toolchain (tokens, snippets, exporters, studio)

```bash
cd tools
npm install          # installs deps; postinstall runs `playwright install chromium`
npm run check:facts  # smoke test — should print "✓ No retired brand strings"
```

This is all you need to build tokens (`npm run tokens`), render visuals (`npm run export:*`), and
run the studio. The committed lockfile means CI uses `npm ci`.

**Optional — image providers.** The `gen:backdrops` / `gen:recraft` / `gen:gemini` scripts read keys
from `../.env.local` (gitignored). Create it only if you generate AI backdrops:

```bash
# .env.local at the repo root
RECRAFT_API_KEY=...      # paid; best for subjects / vector / icons
GEMINI_API_KEY=...       # free tier rate-limits image models — fall back to gen:backdrops:proc
```

Without keys, `npm run gen:backdrops:proc` (procedural) always works with no network.

## 2 · The brand studio (local view/manage/evaluate)

```bash
cd tools && npm run studio
# open http://127.0.0.1:8090/tools/studio/
```

Zero extra dependencies — it serves the repo and composes a live manifest from your artifacts. A
different port: `PORT=8097 npm run studio`. Run the test suite with `npm test`.

## 3 · The live apply site (Cloudflare Worker)

```bash
cd FAE_apply
npm install
cp .dev.vars.example .dev.vars     # then fill in the local secret values
npx wrangler dev                   # serves the apply form + /thanks locally
```

- Production is **eduflickai.com/apply** (Cloudflare Worker + KV). Deploying is a **gated**,
  outward-facing step — `npx wrangler deploy` only after confirming.
- `wrangler` needs Cloudflare auth (`wrangler login`, or an API token in the environment) on the
  account that owns the KV namespace.
- See [`../FAE_apply/README.md`](../FAE_apply/README.md) for the worker, KV, and env-var details.

## Verify your setup

```bash
cd tools
npm run tokens && npm run snippets   # regenerate (should leave no git diff on a clean tree)
npm run export:posters               # renders to ../exports/ — open one and look
npm test                             # the studio/server suite passes
```

If all three succeed you can build, render, evaluate, and ship. Next: [`WORKFLOW.md`](WORKFLOW.md).
