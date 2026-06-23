/**
 * Out-of-band notification for a new application. Called inside ctx.waitUntil so
 * it never blocks or fails the applicant's response — errors are swallowed.
 *
 * Default: no webhook configured -> no-op. KV is the system of record, and
 * applicants are routed into the cohort WhatsApp group from /apply/thanks.
 *
 * If NOTIFY_WEBHOOK_URL is set, the payload is sent so it works for ALL targets:
 *   - Google Apps Script -> reads `record` and appends a Sheet row
 *   - Slack              -> renders `text`
 *   - Discord            -> renders `content`
 * The shared-key auth for the Apps Script lives in the URL (…/exec?key=…), so the
 * whole signed URL is the NOTIFY_WEBHOOK_URL secret.
 *
 * NOTE: posting directly INTO a WhatsApp group per submission is not supported by
 * official APIs/Cloudflare and would require an unofficial bridge — out of scope.
 */
export async function notify(record, env) {
  const hook = env && env.NOTIFY_WEBHOOK_URL;
  if (!hook) return;

  // record fields are already formula-injection-sanitized in validate.js, so this
  // interpolation can't forge Slack/Discord lines.
  const summary =
    `🎓 New Full-Stack AI Engineer application\n` +
    `${record.fullName} · ${record.email} · ${record.phone}\n` +
    `background: ${record.background} · goal: ${record.goal}`;
  const body = JSON.stringify({ type: 'application', record, text: summary, content: summary });

  // Runs inside ctx.waitUntil — never blocks the applicant. Try twice; Apps Script
  // returns HTTP 200 even on failure, so inspect the {ok} body, not just the status.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(hook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(8000),
      });
      let payload = null;
      try {
        payload = await res.json();
      } catch {
        /* non-JSON (e.g. Slack/Discord) — status alone is the signal */
      }
      const delivered = res.ok && (!payload || payload.ok !== false);
      if (delivered) {
        console.log('notify delivered', res.status);
        return;
      }
      console.error('notify not delivered', res.status, payload && payload.error);
    } catch (err) {
      console.error('notify attempt failed', attempt, (err && err.name) || err);
    }
  }
}
