/* Interactive multi-step application wizard.
   Progressive enhancement: without JS the form is one scrolling page that posts
   natively. With JS it becomes a 4-step flow with tap-to-advance chips, per-step
   validation, a live review, and an async submit.
   Note: in production the Turnstile widget needs JS; the <noscript> notice covers
   the no-JS case. */
(function () {
  'use strict';

  var form = document.getElementById('apply-form');
  if (!form) return;

  // ---- Turnstile: mount only if a site key is configured (else honeypot-only) ----
  (function mountTurnstile() {
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

  document.body.classList.add('js');

  var steps = Array.prototype.slice.call(form.querySelectorAll('.step'));
  var TOTAL = steps.length;
  var current = 1;

  var btnBack = document.getElementById('btn-back');
  var btnNext = document.getElementById('btn-next');
  var btnSubmit = document.getElementById('btn-submit');
  var fill = document.getElementById('progress-fill');
  var progress = document.getElementById('progress');
  var counter = document.getElementById('step-count');
  var statusEl = document.getElementById('form-status');

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // which step each field lives on (for jumping to a server error)
  var FIELD_STEP = { fullName: 1, phone: 1, email: 1, background: 2, goal: 3, consent: 4 };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function show(el) { if (el) el.classList.add('is-on'); }
  function hide(el) { if (el) el.classList.remove('is-on'); }

  function render() {
    steps.forEach(function (s) { s.classList.toggle('active', Number(s.dataset.step) === current); });
    if (fill) fill.style.width = (current / TOTAL) * 100 + '%';
    if (progress) progress.setAttribute('aria-valuenow', String(current));
    if (counter) counter.innerHTML = pad(current) + '&thinsp;/&thinsp;' + pad(TOTAL);

    current > 1 ? show(btnBack) : hide(btnBack);
    if (current < TOTAL) { show(btnNext); hide(btnSubmit); }
    else { hide(btnNext); show(btnSubmit); populateReview(); }

    // focus the step heading for screen readers (no keyboard pop on mobile)
    var title = steps[current - 1].querySelector('.step-title');
    if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: false }); }
    setStatus('', false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goto(step) {
    current = Math.min(TOTAL, Math.max(1, step));
    render();
  }

  // ---- validation ----
  function setError(name, msg) {
    var box = document.getElementById('err-' + name);
    if (box) box.textContent = msg || '';
    var input = form.querySelector('[name="' + name + '"]');
    if (input) { input.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
  }
  function clearErrors() {
    ['fullName', 'phone', 'email', 'background', 'goal', 'consent'].forEach(function (n) { setError(n, ''); });
  }
  function val(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }
  function checkedVal(name) {
    var el = form.querySelector('[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function validateStep(step) {
    var ok = true;
    if (step === 1) {
      if (!val('fullName')) { setError('fullName', 'Please tell us your name.'); ok = false; }
      var ph = val('phone').replace(/\D/g, '');
      if (ph.length < 7) { setError('phone', 'Enter a valid WhatsApp number.'); ok = false; }
      if (!EMAIL_RE.test(val('email'))) { setError('email', 'Enter a valid email address.'); ok = false; }
    } else if (step === 2) {
      if (!checkedVal('background')) { setError('background', 'Pick the closest one.'); ok = false; }
    } else if (step === 3) {
      if (!checkedVal('goal')) { setError('goal', 'Pick the closest one.'); ok = false; }
    } else if (step === 4) {
      var c = form.querySelector('[name="consent"]');
      if (!c || !c.checked) { setError('consent', 'Please confirm to apply.'); ok = false; }
    }
    return ok;
  }

  function firstInvalidStep() {
    for (var s = 1; s <= TOTAL; s++) { if (!validateStep(s)) return s; }
    return 0;
  }

  // ---- review (step 4) ----
  function chipLabel(name) {
    var el = form.querySelector('[name="' + name + '"]:checked');
    if (!el) return '—';
    var span = el.closest('.chip') && el.closest('.chip').querySelector('span');
    return span ? span.textContent : el.value;
  }
  function populateReview() {
    setReview('fullName', val('fullName') || '—');
    setReview('phone', val('phone') || '—');
    setReview('email', val('email') || '—');
    setReview('background', chipLabel('background'));
    setReview('goal', chipLabel('goal'));
  }
  function setReview(name, text) {
    var dd = form.querySelector('[data-review="' + name + '"]');
    if (dd) dd.textContent = text;
  }

  function setStatus(text, ok) {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.classList.toggle('ok', !!ok);
  }

  // ---- navigation events ----
  btnNext.addEventListener('click', function () {
    clearErrors();
    if (validateStep(current)) goto(current + 1);
  });
  btnBack.addEventListener('click', function () { goto(current - 1); });

  // tap-to-advance on single-choice steps (2 & 3)
  form.addEventListener('change', function (e) {
    if (e.target && e.target.type === 'radio' && (current === 2 || current === 3)) {
      setError(e.target.name, '');
      window.setTimeout(function () {
        if ((current === 2 || current === 3) && validateStep(current)) goto(current + 1);
      }, 280);
    }
  });

  // Enter in a text field advances instead of submitting
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') {
      if (current < TOTAL) { e.preventDefault(); btnNext.click(); }
    }
  });

  // clear a field's error as the user corrects it
  form.addEventListener('input', function (e) {
    if (e.target && e.target.name) setError(e.target.name, '');
  });

  // ---- submit ----
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    var bad = firstInvalidStep();
    if (bad) { goto(bad); window.setTimeout(function () { validateStep(bad); }, 50); return; }

    var label = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'submitting…';

    var fd = new FormData(form);
    var payload = {};
    fd.forEach(function (v, k) { payload[k] = v; });

    fetch('/apply/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
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
          var names = Object.keys(r.data.errors);
          names.forEach(function (n) { setError(n, r.data.errors[n]); });
          var jump = names.map(function (n) { return FIELD_STEP[n] || 4; }).sort()[0];
          goto(jump || 4);
          setStatus('Please fix the highlighted field.', false);
        } else if (r.status === 403) {
          setStatus('Verification failed — please try again.', false);
          if (window.turnstile) window.turnstile.reset();
        } else {
          setStatus('Something went wrong. Please try again, or email info@eduflickai.com.', false);
        }
      })
      .catch(function () { restore(); setStatus('Network error. Please try again.', false); });

    function restore() { btnSubmit.disabled = false; btnSubmit.textContent = label || 'submit application →'; }
  });

  render();
})();
