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
    var dots = document.getElementById('canDots');
    if (dots) {
      var cards = scroller.querySelectorAll('.can-card');
      Array.prototype.forEach.call(cards, function (card, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Card ' + (i + 1));
        if (!i) b.setAttribute('aria-current', 'true');
        b.addEventListener('click', function () {
          var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          scroller.scrollTo({ left: card.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
        });
        dots.appendChild(b);
      });
      function sync() {
        var list = scroller.querySelectorAll('.can-card'), best = 0, dist = 1e9, edge = scroller.getBoundingClientRect().left;
        Array.prototype.forEach.call(list, function (card, n) {
          var d = Math.abs(card.getBoundingClientRect().left - edge);
          if (d < dist) { dist = d; best = n; }
        });
        Array.prototype.forEach.call(dots.children, function (b, n) {
          if (n === best) b.setAttribute('aria-current', 'true');
          else b.removeAttribute('aria-current');
        });
      }
      scroller.addEventListener('scroll', sync, { passive: true });
      sync();
    }
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
