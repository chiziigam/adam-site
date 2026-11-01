(function () {
  var scroller = document.getElementById('canScroll');
  var prev = document.getElementById('canPrev');
  var next = document.getElementById('canNext');
  if (scroller && prev && next) {
    function step() {
      var card = scroller.querySelector('.can-card');
      if (!card) return 320;
      var gap = parseFloat(getComputedStyle(scroller).columnGap || getComputedStyle(scroller).gap) || 20;
      return card.getBoundingClientRect().width + gap;
    }
    function go(dir) {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      scroller.scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' });
    }
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    scroller.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
  }
  var buttons = document.querySelectorAll('.ev-plus');
  if (!buttons.length || !window.HTMLDialogElement) return;
  Array.prototype.forEach.call(buttons, function (btn) {
    var dlg = document.getElementById(btn.getAttribute('aria-controls'));
    if (!dlg || typeof dlg.showModal !== 'function') return;
    btn.addEventListener('click', function () {
      if (dlg.open) return;
      dlg.showModal();
      btn.setAttribute('aria-expanded', 'true');
      var heading = dlg.querySelector('h3');
      if (heading) heading.focus();
    });
    dlg.addEventListener('close', function () {
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();
    });
    var closeBtn = dlg.querySelector('[data-close]');
    if (closeBtn) closeBtn.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('cancel', function () {
      // Escape. The close event still fires and returns focus.
    });
  });
})();
