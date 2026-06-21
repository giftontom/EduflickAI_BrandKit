/**
 * Worker "apply" — eduflickai.com
 *
 * Serves the on-brand application site from ./public via Static Assets (the
 * ASSETS binding) and handles the application POST itself. Replaces the broken
 * auto-generated placeholder that infinite-redirect-looped.
 *
 * Routing (the Worker runs first for every request — run_worker_first: true — so
 * routing is authored here, deterministically, never by asset-layer magic):
 *   POST /apply/submit      -> handleSubmit (honeypot -> Turnstile -> validate -> KV -> notify)
 *   GET  /                  -> single 308 to /apply  (kills the old scheme-less loop)
 *   GET  /apply             -> public/apply/index.html  (200, no trailing-slash bounce)
 *   GET  /apply/thanks      -> public/apply/thanks.html  (200)
 *   *                       -> env.ASSETS.fetch (static files, or 404.html on a miss)
 */
import { validate } from './lib/validate.js';
import { verifyTurnstile } from './lib/turnstile.js';
import { notify } from './lib/notify.js';

const KV_TTL_SECONDS = 60 * 60 * 24 * 180; // 180-day retention (DPDP-friendly)
const MAX_BODY_BYTES = 64 * 1024; // reject oversized POSTs before parsing

// Clean URL -> the asset file the Worker should serve for it.
const PAGES = {
  '/apply': '/apply/index.html',
  '/apply/thanks': '/apply/thanks.html',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Normalize: strip trailing slash(es) so /apply and /apply/ are one route.
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const isRead = request.method === 'GET' || request.method === 'HEAD';
    try {
      if (request.method === 'POST' && path === '/apply/submit') {
        return await handleSubmit(request, env, ctx, url);
      }
      if (isRead) {
        // Bare root -> /apply. Absolute, single-hop, 308 (preserves method) so it
        // can never reproduce the old scheme-less redirect loop.
        if (path === '/') {
          return Response.redirect(new URL('/apply', url.origin).toString(), 308);
        }
        // Pretty page URLs -> their asset file (served 200, no extra redirect).
        if (PAGES[path]) {
          return env.ASSETS.fetch(new Request(new URL(PAGES[path], url.origin), request));
        }
      }
      // Everything else is a static asset (or the 404 page on a miss).
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error('worker error', path, (err && err.stack) || err);
      return jsonResponse({ ok: false, error: 'server_error' }, 500);
    }
  },
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function readBody(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return await request.json();
  }
  // urlencoded / multipart (no-JS native form post). Collapse multi-values to arrays.
  const form = await request.formData();
  const obj = {};
  for (const key of new Set(form.keys())) {
    const all = form.getAll(key);
    obj[key] = all.length > 1 ? all : all[0];
  }
  return obj;
}

async function handleSubmit(request, env, ctx, url) {
  const wantsJson =
    (request.headers.get('accept') || '').includes('application/json') ||
    (request.headers.get('content-type') || '').includes('application/json');
  const thanks = new URL('/apply/thanks', url.origin).toString();
  const ok = (extra) =>
    wantsJson ? jsonResponse({ ok: true, redirect: '/apply/thanks', ...extra }) : Response.redirect(thanks, 303);

  // Reject oversized bodies before parsing (KV-quota / abuse guard).
  const declaredLen = Number(request.headers.get('content-length') || 0);
  if (declaredLen > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, error: 'too_large' }, 413);
  }

  let data;
  try {
    data = await readBody(request);
  } catch {
    return jsonResponse({ ok: false, error: 'bad_request' }, 400);
  }

  // 1) Honeypot. A filled hidden field = bot: pretend success, store nothing.
  if (typeof data.company === 'string' && data.company.trim() !== '') {
    return ok({ dropped: true });
  }

  // 2) Turnstile (fails CLOSED when a secret is configured).
  const ts = await verifyTurnstile(
    data['cf-turnstile-response'],
    request.headers.get('CF-Connecting-IP'),
    env,
  );
  if (!ts.success) {
    return jsonResponse({ ok: false, error: 'captcha', detail: ts['error-codes'] || null }, 403);
  }

  // 3) Validate + normalize (server-side; a crafted POST cannot bypass this).
  const result = validate(data);
  if (!result.ok) {
    return jsonResponse({ ok: false, error: 'validation', errors: result.errors }, 400);
  }

  // 4) Persist one KV key per submission.
  const nowIso = new Date().toISOString();
  const record = {
    ...result.clean,
    cohort: 'Pioneer Cohort 01',
    consentTs: nowIso,
    ts: nowIso,
    ip: request.headers.get('CF-Connecting-IP') || null,
    ua: request.headers.get('User-Agent') || null,
    country: (request.cf && request.cf.country) || null,
    ray: request.headers.get('CF-Ray') || null,
  };
  const key = `app:${nowIso}:${crypto.randomUUID()}`;
  await env.APPLICATIONS.put(key, JSON.stringify(record), {
    expirationTtl: KV_TTL_SECONDS,
    // Keep PII (email/name/phone) OUT of metadata — `kv key list` returns metadata.
    metadata: { background: record.background, goal: record.goal, ts: nowIso },
  });

  // 5) Notify out-of-band — never blocks or fails the applicant's response.
  ctx.waitUntil(notify(record, env));

  return ok();
}
