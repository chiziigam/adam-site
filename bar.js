(function () {
  var hero = document.getElementById('make');
  var bar = document.getElementById('top');
  if (!hero || !bar || !bar.querySelector('.top-buy')) return;
  // The header is sticky. Once the hero has scrolled out from under it, show Adam, the price and the waitlist.
  var observer = new IntersectionObserver(function (entries) {
    bar.classList.toggle('buy', !entries[0].isIntersecting);
  }, { threshold: 0, rootMargin: '-72px 0px 0px 0px' });
  observer.observe(hero);
})();
