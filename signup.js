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
  document.querySelectorAll('[data-signup]').forEach(function (form) {
    var placement = form.dataset.signup;
    var input = form.querySelector('[type="email"]');
    var button = form.querySelector('button');
    var message = document.getElementById(placement === 'hero' ? 'heroMsg' : 'signupMsg');
    var started = false, busy = false;
    function start() { if (!started) { started = true; track('waitlist_start', placement); } }
    input.addEventListener('input', start);
    input.addEventListener('input', function () { input.removeAttribute('aria-invalid'); });
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) { track('waitlist_view', placement); observer.disconnect(); } }, { threshold: .5 });
      observer.observe(form);
    } else track('waitlist_view', placement);
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (busy) return;
      start();
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
        input.setAttribute('aria-invalid', 'true');
        message.className = 'signup-msg err'; message.textContent = 'Enter a valid email address and try again.'; input.focus(); return;
      }
      busy = true; button.disabled = true; form.setAttribute('aria-busy', 'true');
      message.className = 'signup-msg'; message.textContent = 'Adding you to the list…';
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 15000);
      try {
        var response = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ email: email, company: form.querySelector('[name="company"]').value, placement: placement, tracking: allowed, attribution: attribution }) });
        var data = await response.json();
        if (!response.ok || !data.ok) throw new Error(response.status === 429 ? 'rate' : 'save');
        message.textContent = 'You’re on the list. We’ll email you before launch and let you know about test homes.';
        button.textContent = 'You’re on the list'; input.value = ''; input.disabled = true;
      } catch (error) {
        busy = false; button.disabled = false; message.className = 'signup-msg err';
        message.textContent = error.message === 'rate' ? 'Too many attempts. Try again in an hour, or email support@heyintuitive.com.' : 'We couldn’t confirm your signup. Please try again, or email support@heyintuitive.com.';
        track('signup_error', placement);
      } finally { clearTimeout(timeout); form.removeAttribute('aria-busy'); }
    });
  });
})();
