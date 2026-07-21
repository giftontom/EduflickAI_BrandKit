/* Meta Pixel bootstrap — loaded on /apply and /apply/thanks.
 *
 * Loaded as an EXTERNAL script (not inline) so it passes the site CSP, which is
 * script-src 'self' … (no 'unsafe-inline'). It in turn injects Meta's fbevents.js
 * from connect.facebook.net — allowed because the CSP whitelists that host.
 *
 * DORMANT unless <meta name="meta-pixel-id" content="…"> has a value, so the repo
 * ships with tracking OFF and drops NO cookies until the operator sets the id.
 *
 * The Pixel fires PageView everywhere. On the thank-you page it ALSO fires a Lead
 * carrying the eventID from ?ev=… — the SAME id the server sent via the Conversions
 * API — so Meta deduplicates the two into one Lead. The server event is the source
 * of truth; this browser event adds reach + powers retargeting audiences.
 */
(function () {
  'use strict';
  try {
    var meta = document.querySelector('meta[name="meta-pixel-id"]');
    var id = meta && meta.getAttribute('content');
    if (!id) return; // not configured → no Pixel, no cookies

    // Standard Meta Pixel loader (injects connect.facebook.net/en_US/fbevents.js).
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', id);
    window.fbq('track', 'PageView');

    // Thank-you page: fire the deduplicated Lead using the server-provided event id.
    var ev = new URLSearchParams(window.location.search).get('ev');
    if (ev) {
      window.fbq(
        'track',
        'Lead',
        { content_name: 'Full-Stack AI Engineer Program', content_category: 'Cohort 01' },
        { eventID: ev }
      );
    }
  } catch (e) {
    if (window && window.console) window.console.error('meta pixel init skipped', e);
  }
})();
