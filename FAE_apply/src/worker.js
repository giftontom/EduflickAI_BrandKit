/**
 * Worker "apply" — eduflickai.com
 *
 * Serves the on-brand application site from ./public via Static Assets (ASSETS)
 * and handles the application POST. run_worker_first: true, so EVERY response is
 * authored here — which lets us add security headers + cache control to all of them.
 *
 *   POST /apply/submit  -> handleSubmit (honeypot -> rate-limit -> Turnstile -> validate -> KV -> notify + Meta CAPI)
 *   GET  /              -> 308 -> /apply
 *   GET  /apply         -> public/apply/index.html
 *   GET  /apply/thanks  -> public/apply/thanks.html
 *   *                   -> env.ASSETS.fetch (static, or 404.html)
 */
import { validate, sanitizeCell } from './lib/validate.js';
import { verifyTurnstile } from './lib/turnstile.js';
import { notify } from './lib/notify.js';
import { sendLead } from './lib/meta-capi.js';

const KV_TTL_SECONDS = 60 * 60 * 24 * 180; // 180-day retention (DPDP-friendly)
const MAX_BODY_BYTES = 64 * 1024;
const RATE_PER_MIN = 6; // max submits per IP per minute (best-effort layer)

const PAGES = { '/apply': '/apply/index.html', '/apply/thanks': '/apply/thanks.html' };

const SECURITY_HEADERS = {
  'content-security-policy':
    "default-src 'self'; " +
    // connect.facebook.net serves the Meta Pixel loader (fbevents.js).
    "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://connect.facebook.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    // www.facebook.com receives Pixel event beacons (image GETs).
    "img-src 'self' data: https://www.facebook.com; " +
    "connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com https://www.facebook.com; " +
    "frame-src https://challenges.cloudflare.com; " +
    "frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
};

// Add security headers to every response; force no-store on the page + its JS so a
// backgrounded/cached tab can never keep running stale logic.
function decorate(resp) {
  const r = new Response(resp.body, resp);
  for (const k in SECURITY_HEADERS) r.headers.set(k, SECURITY_HEADERS[k]);
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('text/html') || ct.includes('javascript')) r.headers.set('cache-control', 'no-store');
  return r;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const isRead = request.method === 'GET' || request.method === 'HEAD';
    try {
      if (request.method === 'POST' && path === '/apply/submit') {
        return decorate(await handleSubmit(request, env, ctx, url));
      }
      if (isRead) {
        if (path === '/') {
          return decorate(Response.redirect(new URL('/apply', url.origin).toString(), 308));
        }
        if (PAGES[path]) {
          return decorate(await env.ASSETS.fetch(new Request(new URL(PAGES[path], url.origin), request)));
        }
      }
      return decorate(await env.ASSETS.fetch(request));
    } catch (err) {
      console.error('worker error', path, (err && err.stack) || err);
      return decorate(jsonResponse({ ok: false, error: 'server_error' }, 500));
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
  if (ct.includes('application/json')) return await request.json();
  const form = await request.formData();
  const obj = {};
  for (const key of new Set(form.keys())) {
    const all = form.getAll(key);
    obj[key] = all.length > 1 ? all : all[0];
  }
  return obj;
}

// Per-IP / per-minute counter in KV. Best-effort: never blocks legit users if KV
// hiccups; catches sustained scripted floods.
async function rateLimited(ip, env) {
  if (!ip || !env.APPLICATIONS) return false;
  const key = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
  try {
    const n = Number((await env.APPLICATIONS.get(key)) || '0') + 1;
    await env.APPLICATIONS.put(key, String(n), { expirationTtl: 120 });
    return n > RATE_PER_MIN;
  } catch {
    return false;
  }
}

async function handleSubmit(request, env, ctx, url) {
  const wantsJson =
    (request.headers.get('accept') || '').includes('application/json') ||
    (request.headers.get('content-type') || '').includes('application/json');
  // A real submission carries eventId -> /apply/thanks?ev=… so the browser Pixel can
  // fire a Lead with the SAME id the Conversions API used (Meta dedupes the pair).
  const ok = (extra) => {
    const ev = extra && extra.eventId;
    const dest = ev ? `/apply/thanks?ev=${encodeURIComponent(ev)}` : '/apply/thanks';
    return wantsJson
      ? jsonResponse({ ok: true, redirect: dest, ...extra })
      : Response.redirect(new URL(dest, url.origin).toString(), 303);
  };
  // Native (non-JSON) form posts must never see raw JSON — bounce back to the form.
  const fail = (status, code) =>
    wantsJson
      ? jsonResponse({ ok: false, error: code }, status)
      : Response.redirect(new URL('/apply?e=1', url.origin).toString(), 303);

  const declaredLen = Number(request.headers.get('content-length') || 0);
  if (declaredLen > MAX_BODY_BYTES) return fail(413, 'too_large');

  let data;
  try {
    data = await readBody(request);
  } catch {
    return fail(400, 'bad_request');
  }

  // 1) Honeypot — filled hidden field = bot. Pretend success, store nothing.
  //    Named hp_token (NOT company/email) so Chrome autofill can't trip it.
  if (typeof data.hp_token === 'string' && data.hp_token.trim() !== '') return ok({ dropped: true });

  // 2) Rate limit (cheap, before Turnstile/validate/KV).
  const ip = request.headers.get('CF-Connecting-IP');
  if (await rateLimited(ip, env)) return fail(429, 'rate_limited');

  // 3) Turnstile (fails CLOSED when a secret is configured).
  const ts = await verifyTurnstile(data['cf-turnstile-response'], ip, env);
  if (!ts.success) return fail(403, 'captcha');

  // 4) Validate + normalize. clean fields are formula-injection sanitized in validate.js.
  const result = validate(data);
  if (!result.ok) return fail(400, 'validation');

  // 5) Persist one KV key per submission (KV is the system of record).
  const nowIso = new Date().toISOString();
  const record = {
    ...result.clean,
    cohort: 'Cohort 01',
    consentTs: nowIso,
    ts: nowIso,
    ip: ip || null,
    ua: sanitizeCell(request.headers.get('User-Agent')) || null,
    country: (request.cf && request.cf.country) || null,
    ray: request.headers.get('CF-Ray') || null,
  };
  const key = `app:${nowIso}:${crypto.randomUUID()}`;
  await env.APPLICATIONS.put(key, JSON.stringify(record), {
    expirationTtl: KV_TTL_SECONDS,
    // PII (email/name/phone) stays OUT of metadata — `kv key list` returns metadata.
    metadata: { background: record.background, goal: record.goal, ts: nowIso },
  });

  // 6) Out-of-band delivery, run CONCURRENTLY so the applicant's redirect isn't
  //    delayed by the sum of both calls:
  //      • notify()   -> Google Sheet row
  //      • sendLead() -> Meta Conversions API "Lead" (dormant unless configured)
  //    Both are time-boxed, retry internally, and swallow errors (KV is the record),
  //    so neither can fail or hang the applicant. AWAITED (not ctx.waitUntil) because
  //    fire-and-forget was not reliably running the Sheet write.
  const eventId = crypto.randomUUID();
  const fbp = getCookie(request, '_fbp');
  let fbc = getCookie(request, '_fbc');
  // If the Pixel never set _fbc (blocked/first visit), rebuild it from the ad click id.
  if (!fbc && typeof data.fbclid === 'string' && data.fbclid) {
    fbc = `fb.1.${Date.now()}.${data.fbclid.replace(/[^\w.-]/g, '').slice(0, 400)}`;
  }
  await Promise.allSettled([
    notify(record, env),
    sendLead(record, env, {
      eventId,
      clientIp: ip || undefined,
      userAgent: record.ua || undefined,
      fbp: fbp || undefined,
      fbc: fbc || undefined,
      sourceUrl: new URL('/apply', url.origin).toString(),
    }),
  ]);

  return ok({ eventId });
}

// Read a single cookie value from the request's Cookie header (for _fbp / _fbc).
function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = raw.match(new RegExp('(?:^|;\\s*)' + safe + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}
