(function () {
  var hero = document.getElementById('make');
  var bar = document.getElementById('top');
  if (!hero || !bar || !bar.querySelector('.top-buy')) return;
  // The header is sticky. Once the hero has scrolled out from under it, show Adam, the price and the waitlist.
  function place() {
    bar.classList.toggle('buy', hero.getBoundingClientRect().bottom <= bar.offsetHeight);
  }
  var observer = new IntersectionObserver(place, { threshold: [0, 1] });
  observer.observe(hero);
  window.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', place);
  place();
})();
