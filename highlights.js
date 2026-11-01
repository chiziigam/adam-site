(function () {
  var root = document.getElementById('highlights');
  if (!root) return;
  var track = document.getElementById('hlTrack');
  var slides = Array.prototype.slice.call(track.querySelectorAll('.hl-slide'));
  var dots = Array.prototype.slice.call(root.querySelectorAll('.hl-dot'));
  var play = document.getElementById('hlPlay');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var n = slides.length;
  var index = 0;
  var timer = null;
  var userPaused = !!reduce;
  var hoverPaused = false;
  var inView = true;
  var INTERVAL = 6500;

  function setPlayButton() {
    var playing = !userPaused && !reduce;
    play.setAttribute('aria-pressed', playing ? 'true' : 'false');
    play.setAttribute('aria-label', playing ? 'Pause highlights' : 'Play highlights');
    play.classList.toggle('is-paused', !playing);
  }

  function slideLeft(slide) {
    return slide.offsetLeft - slides[0].offsetLeft;
  }

  function currentFromScroll() {
    var x = track.scrollLeft;
    var best = 0;
    var bestD = Infinity;
    slides.forEach(function (slide, i) {
      var d = Math.abs(slideLeft(slide) - x);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function paint(i) {
    index = (i + n) % n;
    dots.forEach(function (dot, k) {
      var on = k === index;
      dot.setAttribute('aria-selected', on ? 'true' : 'false');
      dot.tabIndex = on ? 0 : -1;
    });
  }

  function go(i, smooth) {
    var next = (i + n) % n;
    var behavior = (smooth && !reduce) ? 'smooth' : 'auto';
    track.scrollTo({ left: slideLeft(slides[next]), behavior: behavior });
    paint(next);
  }

  function tick() {
    if (userPaused || hoverPaused || !inView || document.hidden || document.querySelector('dialog[open]')) return;
    go(index + 1, true);
  }

  function start() {
    if (timer) clearInterval(timer);
    if (userPaused || reduce) return;
    timer = setInterval(tick, INTERVAL);
  }

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { go(i, true); });
  });
  play.addEventListener('click', function () {
    userPaused = !userPaused;
    setPlayButton();
    start();
  });
  track.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    go(index + (e.key === 'ArrowRight' ? 1 : -1), true);
  });
  // Keep the dot in sync when someone swipes. Ignore the scroll events our own go() causes.
  var scrollTimer = null;
  track.addEventListener('scroll', function () {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () { paint(currentFromScroll()); }, 80);
  }, { passive: true });
  track.addEventListener('mouseenter', function () { hoverPaused = true; });
  track.addEventListener('mouseleave', function () { hoverPaused = false; });
  track.addEventListener('focusin', function () { hoverPaused = true; });
  track.addEventListener('focusout', function () { hoverPaused = false; });
  track.addEventListener('pointerdown', function () { hoverPaused = true; });
  track.addEventListener('pointerup', function () { hoverPaused = false; });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { threshold: 0.35 }).observe(root);
  }
  setPlayButton();
  paint(0);
  start();
})();
