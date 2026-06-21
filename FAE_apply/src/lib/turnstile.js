/**
 * Cloudflare Turnstile server-side verification.
 *
 * The secret lives ONLY here (a Worker secret), never in the client. Tokens are
 * single-use and valid ~300s — verify exactly once per submission.
 *
 * Behavior:
 *   - Secret configured -> verify; FAIL CLOSED if the check fails or is unreachable.
 *   - No secret + REQUIRE_TURNSTILE set (production) -> FAIL CLOSED (so a misconfigured
 *     production never silently disables spam protection).
 *   - No secret + REQUIRE_TURNSTILE unset (local dev / staging) -> allow through.
 */
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token, ip, env) {
  if (!env || !env.TURNSTILE_SECRET_KEY) {
    if (env && env.REQUIRE_TURNSTILE) {
      console.error('TURNSTILE_SECRET_KEY missing while REQUIRE_TURNSTILE set — failing closed');
      return { success: false, 'error-codes': ['secret-missing'] };
    }
    return { success: true, skipped: true };
  }
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY);
  body.append('response', token || '');
  if (ip) body.append('remoteip', ip);
  body.append('idempotency_key', crypto.randomUUID());

  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body });
    return await res.json();
  } catch (err) {
    console.error('turnstile verify unreachable', err);
    return { success: false, 'error-codes': ['verify-unreachable'] };
  }
}
