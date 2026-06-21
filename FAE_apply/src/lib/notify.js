/**
 * Out-of-band notification for a new application. Called inside ctx.waitUntil so
 * it never blocks or fails the applicant's response — errors are swallowed.
 *
 * Default: no webhook configured -> no-op. KV is the system of record, and
 * applicants are routed into the cohort WhatsApp group from /apply/thanks.
 *
 * If NOTIFY_WEBHOOK_URL is set (Slack / Discord / Google Apps Script), a compact
 * summary is POSTed. The body carries both `text` (Slack) and `content` (Discord)
 * so either platform renders it.
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
    `background: ${record.role} · experience: ${record.yearsCoding || '—'} · goal: ${record.primaryGoal}`;

  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: summary, content: summary }),
    });
  } catch (err) {
    console.error('notify failed (non-fatal)', err);
  }
}
