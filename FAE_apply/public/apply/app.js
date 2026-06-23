/* One <form>, one step-by-step wizard for EVERY breakpoint:
 *   • Mobile (<960px): focused full-screen steps.
 *   • Desktop (>=960px): split layout — brand + step tracker (left), the active step (right).
 * Same stepping logic everywhere; only the CSS differs. The form works with ZERO JS
 * (native required + native POST -> Worker 303). Init is fully guarded; any failure
 * degrades to the plain native form. Submit is a native in-form POST. Honeypot is
 * hp_token (Chrome autofill can't fill it).
 */
(function () {
  'use strict';
  var form = document.getElementById('apply-form');
  if (!form) return;
  var btnSubmit = document.getElementById('btn-submit');

  // optional Turnstile mount
  try {
    var meta = document.querySelector('meta[name="turnstile-sitekey"]');
    var key = meta && meta.getAttribute('content');
    if (key) {
      var slot = document.getElementById('turnstile-slot');
      if (slot) { slot.className = 'cf-turnstile'; slot.setAttribute('data-sitekey', key); slot.setAttribute('data-theme', 'dark'); }
      var sc = document.createElement('script');
      sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; sc.async = true; sc.defer = true;
      document.head.appendChild(sc);
    }
  } catch (e) { /* non-fatal */ }

  var submitting = false;
  window.addEventListener('pageshow', function () {
    if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.classList.remove('is-busy'); btnSubmit.textContent = 'submit application →'; }
    submitting = false;
  });
  try {
    if (/[?&]e=/.test(location.search)) {
      var st0 = document.getElementById('form-status');
      if (st0) st0.textContent = 'Sorry — please double-check your details and submit again.';
    }
  } catch (e) { /* ignore */ }

  try {
    var steps = Array.prototype.slice.call(form.querySelectorAll('.step'));
    var TOTAL = steps.length;
    var current = 1;
    var advanceTimer = null;
    var btnBack = document.getElementById('btn-back');
    var btnNext = document.getElementById('btn-next');
    var fill = document.getElementById('progress-fill');
    var progress = document.getElementById('progress');
    var counter = document.getElementById('step-count');
    var statusEl = document.getElementById('form-status');
    var slItems = Array.prototype.slice.call(form.querySelectorAll('.steplist li'));
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function show(el) { if (el) el.classList.add('is-on'); }
    function hide(el) { if (el) el.classList.remove('is-on'); }
    function focusSafe(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} } }
    function scrollTop() { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { try { window.scrollTo(0, 0); } catch (e2) {} } }

    function render() {
      for (var i = 0; i < steps.length; i++) steps[i].classList.toggle('active', Number(steps[i].dataset.step) === current);
      if (fill) fill.style.width = (current / TOTAL) * 100 + '%';
      if (progress) progress.setAttribute('aria-valuenow', String(current));
      if (counter) counter.innerHTML = pad(current) + '&thinsp;/&thinsp;' + pad(TOTAL);
      // desktop step tracker (left rail) — light up done/active
      for (var k = 0; k < slItems.length; k++) {
        var n = Number(slItems[k].getAttribute('data-sl'));
        slItems[k].classList.toggle('is-active', n === current);
        slItems[k].classList.toggle('is-done', n < current);
      }
      current > 1 ? show(btnBack) : hide(btnBack);
      if (current < TOTAL) { show(btnNext); hide(btnSubmit); } else { hide(btnNext); show(btnSubmit); populateReview(); }
      var title = steps[current - 1].querySelector('.step-title');
      if (title) { title.setAttribute('tabindex', '-1'); focusSafe(title); }
      setStatus('', false);
      scrollTop();
    }
    function goto(step) { current = Math.min(TOTAL, Math.max(1, step)); render(); }

    function setError(name, msg) {
      var box = document.getElementById('err-' + name);
      if (box) box.textContent = msg || '';
      var input = form.querySelector('[name="' + name + '"]');
      if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    function clearErrors() { ['fullName', 'phone', 'email', 'background', 'goal', 'consent'].forEach(function (n) { setError(n, ''); }); }
    function val(name) { var el = form.querySelector('[name="' + name + '"]'); return el ? el.value.replace(/^\s+|\s+$/g, '') : ''; }
    function checkedVal(name) { var el = form.querySelector('[name="' + name + '"]:checked'); return el ? el.value : ''; }

    function validateStep(step) {
      var ok = true;
      if (step === 1) {
        if (!val('fullName')) { setError('fullName', 'Please tell us your name.'); ok = false; }
        var ph = val('phone').replace(/\D/g, '');
        if (ph.length < 7 || ph.length > 15) { setError('phone', 'Enter a valid WhatsApp number.'); ok = false; }
        if (!EMAIL_RE.test(val('email'))) { setError('email', 'Enter a valid email address.'); ok = false; }
      } else if (step === 2) { if (!checkedVal('background')) { setError('background', 'Pick the closest one.'); ok = false; } }
      else if (step === 3) { if (!checkedVal('goal')) { setError('goal', 'Pick the closest one.'); ok = false; } }
      else if (step === 4) { var c = form.querySelector('[name="consent"]'); if (!c || !c.checked) { setError('consent', 'Please confirm to apply.'); ok = false; } }
      return ok;
    }
    function firstInvalidStep() { for (var s = 1; s <= TOTAL; s++) { if (!validateStep(s)) return s; } return 0; }

    function chipLabel(name) {
      var el = form.querySelector('[name="' + name + '"]:checked');
      if (!el) return '—';
      var span = el.closest && el.closest('.chip') && el.closest('.chip').querySelector('span');
      return span ? span.textContent : el.value;
    }
    function setReview(name, text) { var dd = form.querySelector('[data-review="' + name + '"]'); if (dd) dd.textContent = text; }
    function populateReview() {
      setReview('fullName', val('fullName') || '—'); setReview('phone', val('phone') || '—'); setReview('email', val('email') || '—');
      setReview('background', chipLabel('background')); setReview('goal', chipLabel('goal'));
    }
    function setStatus(text, ok) { if (!statusEl) return; statusEl.textContent = text || ''; statusEl.classList.toggle('ok', !!ok); }

    // brand-rail stat count-up (desktop)
    function countUp() {
      var nums = document.querySelectorAll('.bstat b[data-count]');
      for (var i = 0; i < nums.length; i++) {
        (function (el) {
          var target = parseInt(el.getAttribute('data-count'), 10) || 0, startT = null;
          el.textContent = '0';
          function tick(ts) { if (!startT) startT = ts; var p = Math.min((ts - startT) / 900, 1); el.textContent = String(Math.round(p * target)); if (p < 1) requestAnimationFrame(tick); else el.textContent = String(target); }
          requestAnimationFrame(tick);
        })(nums[i]);
      }
    }

    // ---- navigation ----
    if (btnNext) btnNext.addEventListener('click', function () { clearErrors(); if (validateStep(current)) goto(current + 1); });
    if (btnBack) btnBack.addEventListener('click', function () { goto(current - 1); });

    // tap-to-advance for the single-choice steps (background / goal)
    form.addEventListener('change', function (e) {
      if (e.target && e.target.type === 'radio' && (current === 2 || current === 3)) {
        setError(e.target.name, '');
        var s = current;
        if (advanceTimer) clearTimeout(advanceTimer);
        advanceTimer = window.setTimeout(function () { if (current === s && validateStep(current)) goto(current + 1); }, 320);
      }
    });
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') {
        if (current < TOTAL) { e.preventDefault(); if (btnNext) btnNext.click(); }
      }
    });
    form.addEventListener('input', function (e) { if (e.target && e.target.name) setError(e.target.name, ''); });

    // ---- submit (native in-form POST) ----
    form.addEventListener('submit', function (e) {
      if (submitting) { e.preventDefault(); return; }
      clearErrors();
      var bad = firstInvalidStep();
      if (bad) {
        e.preventDefault();
        goto(bad);
        window.setTimeout(function () { validateStep(bad); }, 50);
        return;
      }
      submitting = true;
      if (btnSubmit) { btnSubmit.textContent = 'submitting…'; btnSubmit.classList.add('is-busy'); }
    });

    // ---- init ----
    document.body.classList.add('js');
    render();
    countUp();

    // drop native required (JS validates) so it can't abort a submit on a hidden step
    var reqd = form.querySelectorAll('[required]');
    for (var r = 0; r < reqd.length; r++) { reqd[r].removeAttribute('required'); reqd[r].removeAttribute('aria-required'); }
  } catch (err) {
    try { document.body.classList.remove('js'); } catch (e) {}
    if (window && window.console) console.error('init failed; using no-JS form', err);
  }
})();
