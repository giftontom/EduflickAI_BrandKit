/* Progressive enhancement for the application form.
   With JS: submit via fetch, render inline field errors, reset Turnstile on
   failure, and redirect on success.
   Note: the native (no-JS) POST still routes correctly (-> 303 /apply/thanks),
   but in production the Turnstile widget needs JS, so a no-JS submit will be
   rejected (403). The <noscript> notice in index.html tells users to enable JS. */
(function () {
  'use strict';

  // Optionally mount Cloudflare Turnstile — only if a site key is configured in
  // <head>. Empty = honeypot-only (no widget loaded).
  (function bootstrapTurnstile() {
    var meta = document.querySelector('meta[name="turnstile-sitekey"]');
    var key = meta && meta.getAttribute('content');
    if (!key) return;
    var slot = document.getElementById('turnstile-slot');
    if (slot) {
      slot.className = 'cf-turnstile';
      slot.setAttribute('data-sitekey', key);
      slot.setAttribute('data-theme', 'dark');
    }
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  })();

  var form = document.getElementById('apply-form');
  if (!form) return;
  var statusEl = document.getElementById('form-status');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    setStatus('', false);

    var btn = form.querySelector('[type="submit"]');
    var label = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'submitting…';
    }

    fetch('/apply/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(serialize(form)),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { status: res.status, ok: res.ok, data: data };
        });
      })
      .then(function (r) {
        if (r.ok && r.data && r.data.ok) {
          window.location.href = (r.data && r.data.redirect) || '/apply/thanks';
          return;
        }
        restore();
        if (r.status === 400 && r.data && r.data.errors) {
          showErrors(r.data.errors);
          setStatus('Please fix the highlighted fields.', false);
          focusFirstError(r.data.errors);
        } else if (r.status === 403) {
          setStatus('Verification failed — please complete the challenge and try again.', false);
          if (window.turnstile) window.turnstile.reset();
        } else {
          setStatus('Something went wrong. Please try again, or email info@eduflickai.com.', false);
        }
      })
      .catch(function () {
        restore();
        setStatus('Network error. Please check your connection and try again.', false);
      });

    function restore() {
      if (btn) {
        btn.disabled = false;
        btn.textContent = label || 'submit application →';
      }
    }
  });

  function serialize(f) {
    var fd = new FormData(f);
    var obj = {};
    var keys = {};
    fd.forEach(function (_v, k) { keys[k] = true; });
    Object.keys(keys).forEach(function (k) {
      var all = fd.getAll(k);
      obj[k] = all.length > 1 ? all : all[0];
    });
    return obj;
  }

  function clearErrors() {
    var nodes = form.querySelectorAll('.field-error');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = '';
    var invalid = form.querySelectorAll('[aria-invalid="true"]');
    for (var j = 0; j < invalid.length; j++) invalid[j].removeAttribute('aria-invalid');
  }

  function showErrors(errors) {
    Object.keys(errors).forEach(function (name) {
      var msg = document.getElementById('err-' + name);
      if (msg) msg.textContent = errors[name];
      var input = form.querySelector('[name="' + name + '"]');
      if (input) input.setAttribute('aria-invalid', 'true');
    });
  }

  function focusFirstError(errors) {
    var first = Object.keys(errors)[0];
    if (!first) return;
    var input = form.querySelector('[name="' + first + '"]');
    if (input && typeof input.focus === 'function') input.focus();
  }

  function setStatus(text, ok) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('ok', !!ok);
  }
})();
