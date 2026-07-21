/**
 * Meta (Facebook) Conversions API — server-side "Lead" event.
 *
 * Fires ONE server->server event to the Graph API for each real application, so ad
 * attribution + Lead-optimization work even when the browser Pixel is blocked, and
 * so iOS/ad-blockers can't drop the signal. It is deduplicated against the browser
 * Pixel's Lead by a shared `eventId` (the Pixel fires the same id on /apply/thanks).
 *
 * DORMANT until configured — like notify.js, a missing PIXEL_ID/TOKEN is a no-op, so
 * nothing is sent (and no PII is hashed) until the operator sets:
 *   env.META_PIXEL_ID        (public — the dataset/pixel id)
 *   env.META_CAPI_TOKEN      (secret — `wrangler secret put META_CAPI_TOKEN`)
 *   env.META_TEST_EVENT_CODE (optional — Events Manager "Test events" code)
 *
 * PRIVACY: every user identifier (email/phone/name/city/country) is SHA-256 hashed
 * before it leaves the Worker. IP, User-Agent and the fbp/fbc browser cookies are the
 * only non-hashed fields — that is exactly what Meta's spec requires and expects.
 */

// Bump when Meta deprecates a Graph API version (they support each for ~2 years).
const GRAPH_API_VERSION = 'v21.0';
const CAPI_TIMEOUT_MS = 6000;

/** SHA-256 -> lowercase hex. crypto.subtle exists in both Workers and Node >=18. */
async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---- Meta normalization rules (applied BEFORE hashing) --------------------------
export function normEmail(v) {
  return String(v || '').trim().toLowerCase();
}
// digits only, keep country code, drop leading zeros; assume +91 for a bare 10-digit
// Indian mobile so the hash matches Meta's E.164-style expectation.
export function normPhone(v) {
  let d = String(v || '').replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10) d = '91' + d;
  return d;
}
export function normName(v) {
  return String(v || '').trim().toLowerCase();
}
// city/name field for `ct`: lowercase, strip everything but a-z0-9
export function normCity(v) {
  return String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
export function normCountry(v) {
  return String(v || '').trim().toLowerCase().slice(0, 2);
}

/** Hash a value with its normalizer, returning a 1-element array or undefined. */
async function hashedField(value, normalizer) {
  const normalized = normalizer(value);
  if (!normalized) return undefined;
  return [await sha256Hex(normalized)];
}

/**
 * Build the Conversions API request body for a single Lead. Pure + async (only the
 * hashing is async) so it can be unit-tested without a live token. `access_token`
 * rides in the body (not the URL) so the secret is never in a logged query string.
 */
export async function buildLeadPayload(record, env, sig) {
  const nameParts = String(record.fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const user_data = {
    em: await hashedField(record.email, normEmail),
    ph: await hashedField(record.phone, normPhone),
    fn: await hashedField(firstName, normName),
    ln: await hashedField(lastName, normName),
    ct: await hashedField(record.city, normCity),
    country: await hashedField(record.country, normCountry),
  };
  // non-hashed browser/context signals (exactly what Meta expects in the clear)
  if (sig.clientIp) user_data.client_ip_address = sig.clientIp;
  if (sig.userAgent) user_data.client_user_agent = sig.userAgent;
  if (sig.fbp) user_data.fbp = sig.fbp;
  if (sig.fbc) user_data.fbc = sig.fbc;
  for (const k of Object.keys(user_data)) if (user_data[k] === undefined) delete user_data[k];

  // categorical, non-PII qualifiers — safe in custom_data + useful for optimization
  const custom_data = {
    content_name: 'Full-Stack AI Engineer Program',
    content_category: record.cohort || 'Cohort 01',
  };
  if (record.background) custom_data.background = record.background;
  if (record.experience) custom_data.experience = record.experience;
  if (record.goal) custom_data.goal = record.goal;

  const event = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    event_id: sig.eventId,
    action_source: 'website',
    user_data,
    custom_data,
  };
  if (sig.sourceUrl) event.event_source_url = sig.sourceUrl;

  const body = { data: [event], access_token: env.META_CAPI_TOKEN };
  if (env.META_TEST_EVENT_CODE) body.test_event_code = env.META_TEST_EVENT_CODE;
  return body;
}

/**
 * Send the Lead to Meta. Best-effort: time-boxed, retried once, errors swallowed —
 * KV is the system of record, so a Meta outage must never fail the applicant. Runs
 * concurrently with notify() in the Worker.
 */
export async function sendLead(record, env, sig) {
  if (!env || !env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return; // dormant until configured

  let payload;
  try {
    payload = await buildLeadPayload(record, env, sig);
  } catch (err) {
    console.error('capi build failed', (err && err.name) || err);
    return;
  }

  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.META_PIXEL_ID}/events`;
  const body = JSON.stringify(payload);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(CAPI_TIMEOUT_MS),
      });
      if (res.ok) {
        console.log('capi lead delivered', res.status);
        return;
      }
      // 4xx (bad token / payload) won't fix on retry — log and stop.
      let detail = '';
      try {
        detail = JSON.stringify((await res.json()).error || {});
      } catch { /* non-JSON error body */ }
      console.error('capi not delivered', res.status, detail);
      if (res.status >= 400 && res.status < 500) return;
    } catch (err) {
      console.error('capi attempt failed', attempt, (err && err.name) || err);
    }
  }
}
