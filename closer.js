(function () {
  var stage = document.getElementById('closerStage');
  if (!stage) return;
  var items = Array.prototype.slice.call(stage.querySelectorAll('.cl-item'));
  var visEls = Array.prototype.slice.call(stage.querySelectorAll('.cl-vis'));
  var closeBtn = document.getElementById('closerClose');
  var pillsEl = document.getElementById('closerPills');
  var COLOURS = { chalk: 'Chalk', sand: 'Sand', charcoal: 'Charcoal' };
  var open = null;
  var colour = 'chalk';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  items.forEach(function (item) {
    var cap = item.querySelector('.cl-cap');
    if (cap) cap.inert = true;
  });

  function showVis(name) {
    visEls.forEach(function (v) {
      v.classList.toggle('is-on', v.getAttribute('data-vis') === name);
    });
  }

  function setOpen(item, focus) {
    if (open === item) item = null;
    items.forEach(function (i) {
      var isOpen = i === item;
      i.classList.toggle('is-open', isOpen);
      i.querySelector('.cl-pill').setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      var cap = i.querySelector('.cl-cap');
      if (cap) cap.inert = !isOpen;
    });
    open = item;
    stage.classList.toggle('is-open', !!item);
    closeBtn.tabIndex = item ? 0 : -1;
    showVis(item ? item.getAttribute('data-vis') : 'product');
    if (item && window.matchMedia('(max-width: 860px)').matches) {
      setTimeout(function () {
        var x = item.offsetLeft - 20;
        pillsEl.scrollTo({ left: x, behavior: reduce ? 'auto' : 'smooth' });
      }, 30);
    }
    if (focus && item) item.querySelector('.cl-pill').focus();
  }

  items.forEach(function (item) {
    item.querySelector('.cl-pill').addEventListener('click', function () { setOpen(item); });
  });
  closeBtn.addEventListener('click', function () {
    var was = open;
    setOpen(null);
    if (was) was.querySelector('.cl-pill').focus();
  });
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) {
      var was = open;
      setOpen(null);
      was.querySelector('.cl-pill').focus();
    }
  });

  var sws = Array.prototype.slice.call(stage.querySelectorAll('.cl-sw'));
  function setColour(c, focus) {
    if (!COLOURS[c]) return;
    colour = c;
    sws.forEach(function (s) {
      var on = s.getAttribute('data-c') === c;
      s.setAttribute('aria-checked', on ? 'true' : 'false');
      s.tabIndex = on ? 0 : -1;
      if (on && focus) s.focus();
    });
    stage.querySelectorAll('.cl-product img').forEach(function (im) {
      im.classList.toggle('is-on', im.getAttribute('data-c') === c);
    });
    var swname = document.getElementById('closerSwname');
    var tag = document.getElementById('closerTag');
    if (swname) swname.textContent = COLOURS[c];
    if (tag) tag.innerHTML = 'Adam in <b>' + COLOURS[c] + '</b>';
  }
  sws.forEach(function (s, idx) {
    s.addEventListener('click', function () { setColour(s.getAttribute('data-c')); });
    s.addEventListener('keydown', function (e) {
      var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      setColour(sws[(idx + d + sws.length) % sws.length].getAttribute('data-c'), true);
    });
  });

  var hash = location.hash.slice(1);
  if (hash) {
    var parts = hash.split('-');
    var key = parts[0];
    var col = parts[1];
    var match = null;
    items.forEach(function (i) { if (i.getAttribute('data-key') === key) match = i; });
    if (col && COLOURS[col]) setColour(col);
    if (match) {
      setOpen(match);
      var sec = document.getElementById('closer');
      if (sec && sec.scrollIntoView) sec.scrollIntoView();
    }
  }
})();
