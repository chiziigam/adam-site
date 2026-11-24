(function () {
  'use strict';
  var allowed = navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl;
  var query = new URLSearchParams(location.search);
  function tag(value) { return /^[a-z0-9._-]{1,64}$/i.test(value || '') ? value : ''; }
  var referrer = '';
  try { var ref = new URL(document.referrer); if (ref.hostname !== location.hostname) referrer = ref.hostname; } catch (_) {}
  // This ID lives only in memory: no analytics cookies or localStorage.
  var attribution = {
    visit: crypto.randomUUID(),
    source: tag(query.get('utm_source')) || referrer || 'direct',
    medium: tag(query.get('utm_medium')),
    campaign: tag(query.get('utm_campaign')),
    device: matchMedia('(max-width: 720px)').matches ? 'mobile' : 'desktop',
    version: 'waitlist-v1'
  };
  function track(event, placement) {
    if (!allowed) return;
    var body = JSON.stringify(Object.assign({ event: event, placement: placement }, attribution));
    // Tracking is best effort and can never prevent a signup.
    try { fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {}); } catch (_) {}
  }
  track('page_view', 'page');
  document.querySelectorAll('a[href="#who"]').forEach(function (link) {
    link.addEventListener('click', function () { track('cta_click', link.closest('header') ? 'nav' : 'body'); });
  });
  var SUPPORT = 'support@heyintuitive.com';
  var MESSAGES = {
    invalid: 'Enter a full email address, like name@example.com.',
    rate: 'Too many attempts from this connection. Try again in an hour, or email ',
    offline: 'You seem to be offline. Check your connection and try again, or email ',
    timeout: 'This is taking too long. Please try again in a moment, or email ',
    save: 'We couldn’t add you just now. Please try again, or email '
  };
  function failure(status) {
    if (status === 400) return 'invalid';
    if (status === 429) return 'rate';
    return 'save';
  }
  document.querySelectorAll('[data-signup]').forEach(function (form) {
    var placement = form.dataset.signup;
    var input = form.querySelector('[type="email"]');
    var button = form.querySelector('button');
    var message = document.getElementById(placement === 'hero' ? 'heroMsg' : 'signupMsg');
    var started = false, busy = false;
    function start() { if (!started) { started = true; track('waitlist_start', placement); } }
    function say(text, error, contact) {
      message.className = error ? 'signup-msg err' : 'signup-msg';
      message.textContent = text;
      if (contact) {
        var link = document.createElement('a');
        link.href = 'mailto:' + SUPPORT + '?subject=Adam%20waitlist';
        link.textContent = SUPPORT;
        message.appendChild(link);
        message.appendChild(document.createTextNode('.'));
      }
    }
    function fail(kind) {
      say(MESSAGES[kind], true, kind !== 'invalid');
      if (kind === 'invalid') input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
    input.addEventListener('input', start);
    input.addEventListener('input', function () {
      if (input.hasAttribute('aria-invalid') || message.classList.contains('err')) { input.removeAttribute('aria-invalid'); say('', false); }
    });
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) { track('waitlist_view', placement); observer.disconnect(); } }, { threshold: .5 });
      observer.observe(form);
    } else track('waitlist_view', placement);
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (busy) return;
      start();
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return fail('invalid');
      // aria-disabled rather than disabled, so keyboard focus stays on the button while saving
      busy = true; button.setAttribute('aria-disabled', 'true'); form.setAttribute('aria-busy', 'true');
      say('Adding you to the list…', false);
      var controller = new AbortController();
      var timedOut = false;
      var timeout = setTimeout(function () { timedOut = true; controller.abort(); }, 15000);
      var kind = '';
      try {
        var response = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ email: email, company: form.querySelector('[name="company"]').value, placement: placement, tracking: allowed, attribution: attribution }) });
        var data = null;
        try { data = await response.json(); } catch (error) { if (timedOut) throw error; }
        if (!response.ok || !data || !data.ok) kind = failure(response.status);
      } catch (_) {
        kind = timedOut ? 'timeout' : navigator.onLine === false ? 'offline' : 'save';
      } finally { clearTimeout(timeout); form.removeAttribute('aria-busy'); busy = false; button.removeAttribute('aria-disabled'); }
      if (kind) { fail(kind); track('signup_error', placement); return; }
      say('You’re on the list. We’ll email you before launch and let you know about test homes.', false);
      button.textContent = 'You’re on the list'; button.setAttribute('aria-disabled', 'true'); busy = true;
      input.value = ''; input.readOnly = true;
      message.focus();
    });
  });
})();
