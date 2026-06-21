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

  const summary =
    `🎓 New Full-Stack AI Engineer application\n` +
    `${record.fullName} · ${record.email} · ${record.phone}\n` +
    `background: ${record.background} · goal: ${record.goal}`;

  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'application', record, text: summary, content: summary }),
    });
  } catch (err) {
    console.error('notify failed (non-fatal)', err);
  }
}
