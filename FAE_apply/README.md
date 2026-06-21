# FAE Apply — Full-Stack AI Engineer application site

The application site served at **`eduflickai.com/apply`**. A single Cloudflare
Worker serves an on-brand static landing + application form (Workers Static
Assets) and captures each submission in **Workers KV**, gated by **Turnstile**
and a honeypot. Applicants are routed into the cohort WhatsApp group on the
thank-you page; KV is the durable system of record.

It **replaces** the previous auto-generated `apply` worker, which was a broken
infinite redirect loop.

## Architecture

```
GET  /              -> 308 redirect to /apply          (Worker)
GET  /apply         -> public/apply/index.html         (Static Assets)
POST /apply/submit  -> honeypot -> Turnstile -> validate -> KV put -> notify   (Worker)
GET  /apply/thanks  -> public/apply/thanks.html        (Static Assets)
*                   -> public/404.html                 (Static Assets)
```

- **No DNS changes** — the routes `eduflickai.com/*` and `eduflickai.com/apply`
  already exist and point at the script named `apply`. Deploying overwrites that
  script and keeps the routes.
- **No D1** — applications live in KV (`APPLICATIONS` binding), one key per
  submission: `app:<ISO-timestamp>:<uuid>`, 180-day TTL.

## Layout

```
src/worker.js          entrypoint (routing + submit handler)
src/lib/fields.js      declarative form-field contract (server source of truth)
src/lib/validate.js    server-side validation/normalization
src/lib/turnstile.js   Turnstile siteverify (fail-closed)
src/lib/notify.js      optional webhook ping (Slack/Discord/Apps Script)
public/apply/          index.html · apply.css · app.js · thanks.html
public/404.html        on-brand 404 (required by not_found_handling)
public/assets/         brand CSS + logos — SYNCED, do not hand-edit
scripts/sync-brand.mjs copies design-system CSS + logos into public/assets
wrangler.jsonc         Worker config (assets + KV + routes + staging env)
```

> `public/assets/` is generated from the repo's `design-system/` and `assets/`
> by `npm run sync:brand`. Edit the brand in `design-system/`, then re-sync —
> never hand-edit the copies.

## Prerequisites

- Node 18+ (`.nvmrc` = 18).
- A Cloudflare API token with **Workers Scripts: Edit**, **Workers KV Storage:
  Edit**, **Turnstile: Edit** (account `f98755464d55e77891153daabbd9f850`), or
  `wrangler login`.

## One-time setup

```sh
npm install
npm run sync:brand

# Auth (token route)
export CLOUDFLARE_API_TOKEN=********              # rotate the one shared in chat first
export CLOUDFLARE_ACCOUNT_ID=f98755464d55e77891153daabbd9f850

# Create the KV namespaces, then paste the printed ids into wrangler.jsonc
npx wrangler kv namespace create APPLICATIONS              # -> kv_namespaces[0].id
npx wrangler kv namespace create APPLICATIONS --env staging   # -> env.staging.kv_namespaces[0].id

# optional notifier:
npx wrangler secret put NOTIFY_WEBHOOK_URL
```

### Spam protection

Production currently runs **honeypot-only** (the hidden `company` field + server
validation + a 64 KB body cap). To ALSO enable **Cloudflare Turnstile**:

1. Create a Turnstile widget for `eduflickai.com` in the dashboard → SITE_KEY + SECRET_KEY.
2. Put the SITE_KEY in `public/apply/index.html` → `<meta name="turnstile-sitekey" content="…">` (app.js then loads the widget).
3. `npx wrangler secret put TURNSTILE_SECRET_KEY` (use the real secret; test secret `1x0000000000000000000000000000000AA` always passes for local/staging).
4. In `wrangler.jsonc`, re-add `"vars": { "REQUIRE_TURNSTILE": "true" }` so a missing secret fails closed.
5. Redeploy.

## Local dev

```sh
cp .dev.vars.example .dev.vars     # set TURNSTILE_SECRET_KEY (test key ok)
npm run dev                        # wrangler dev -> http://localhost:8787
```

## Deploy

```sh
# 1) Stage on workers.dev (no production routes) and verify everything:
npm run deploy:staging             # -> https://apply-staging.<subdomain>.workers.dev

# 2) Promote to eduflickai.com (overwrites the broken loop script):
npm run deploy
```

## Verify (after deploy)

```sh
curl -sI https://eduflickai.com/            # one 308 -> https://eduflickai.com/apply (no loop)
curl -sI https://eduflickai.com/apply       # 200 text/html, no Location
curl -sI https://eduflickai.com/nope        # 404 (public/404.html)
npm run kv:list                             # see app:<ISO>:<uuid> keys after a test submit
npx wrangler tail apply                     # live logs
```

From the repo root, before shipping: `node tools/check-facts.mjs`.

## Reading / exporting applications

KV is the store (no admin UI by default):

```sh
npx wrangler kv key list --binding=APPLICATIONS
npx wrangler kv key get  --binding=APPLICATIONS "app:<ISO>:<uuid>"
```

## Secret rotation

The deploy token must never be committed (only shell env / CI secrets). The
token shared during setup should be **rotated** (Cloudflare dashboard → API
Tokens → Roll), ideally to one scoped to exactly Workers Scripts Edit + Workers
KV Storage Edit + Turnstile. Worker secrets rotate independently with
`wrangler secret put <NAME>`.

## Notes

- The cohort **start date** and any extra copy must come from
  `content-studio/FACTS.md`; nothing unset is typeset here.
- Posting per-submission **into** a WhatsApp group isn't supported by official
  APIs — applicants self-join from `/apply/thanks`, and KV holds the record.
