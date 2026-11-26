(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var top = document.querySelector('.top');
  function stuck() { top.classList.toggle('stuck', window.scrollY > 8); }
  window.addEventListener('scroll', stuck, { passive: true }); stuck();

  var toggle = document.querySelector('.menu-toggle'), menu = $('menu');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('open', open);
  }
  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
    if (open) menu.querySelector('a').focus();
  });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  document.addEventListener('click', function (e) { if (!top.contains(e.target)) setMenu(false); });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    all('.rail-body, .cut, .closing-card').forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  // colour
  var PREFIX = { sandstone: '', black: 'colorways/black/', white: 'colorways/white/' };
  var NAMES = { sandstone: 'Sand', black: 'Charcoal', white: 'Chalk' };
  var colour = 'sandstone';
  var swatches = all('.swatch');
  function swapImg(img, src) {
    if (img.getAttribute('src') === src) return;
    var next = new Image();
    img.classList.add('swap');
    next.onload = next.onerror = function () { setTimeout(function () { img.src = src; img.classList.remove('swap'); }, 120); };
    next.src = src;
  }
  function setColour(c, focus) {
    colour = c;
    swatches.forEach(function (s) {
      var on = s.dataset.colour === c;
      s.setAttribute('aria-checked', on ? 'true' : 'false'); s.tabIndex = on ? 0 : -1;
      if (on && focus) s.focus();
    });
    $('colourName').textContent = NAMES[c];
    swapImg($('heroImg'), PREFIX[c] + 'frames/box.webp?v=15');
    all('[data-box]').forEach(function (img) { swapImg(img, PREFIX[c] + 'frames/box.webp?v=15'); });
    if (built) paintLayers();
  }
  swatches.forEach(function (s, i) {
    s.addEventListener('click', function () { setColour(s.dataset.colour); });
    s.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      setColour(swatches[(i + d + swatches.length) % swatches.length].dataset.colour, true);
    });
  });

  // a day with Adam
  var DAY = [
    { img: 's2', bg: '#4d5b71', at: [0.70, 0.66], alt: 'A cutaway view of a family home in the morning', head: 'Kit day.', narr: 'Adam remembers what the family has told it, and says it at the moment it matters.', msg: 'Today is PE. Theo’s kit is by the dryer.', done: 'Reminding Theo.' },
    { img: 's4', bg: '#616e80', at: [0.155, 0.6889], alt: 'The home late morning, with someone at the front door', head: 'A knock at the door.', narr: 'Dan is in the garden and cannot hear the door. Adam hears the knock and tells him.', msg: 'Someone is knocking at the front door.', done: 'Telling Dan. He is on his way.' },
    { img: 's5', bg: '#616e80', at: [0.6849, 0.6946], alt: 'The home in the afternoon, with the kitchen in view', head: 'The smoke alarm.', narr: 'Adam always listens for smoke and CO alarms, day and night.', msg: 'The smoke alarm is sounding in the kitchen.', done: 'Dan has headphones on upstairs. Calling him now.' },
    { img: 's6', bg: '#282e3d', at: [0.3947, 0.7542], alt: 'The home in the early evening, with the living room in view', head: 'A fall.', narr: 'Adam listens for the sounds that mean something is wrong, and gets the right person there on time.', msg: 'I heard a fall in the living room. Gran is not answering.', done: 'Telling Maya and Dan. Calling 999 if they do not answer.' },
    { img: 's1', bg: '#0a0d15', at: [0.7388, 0.5153], alt: 'The home at night, with the nursery upstairs', head: 'June is awake.', narr: 'Maya and Dan are downstairs with the TV on. Adam hears June upstairs and tells them.', msg: 'June is crying in the nursery.', done: 'Telling Maya. It is her turn tonight.' }
  ];
  var frame = $('dayFrame'), spot = $('daySpot'), panel = $('dayPanel'), tabs = all('#dayTabs [role=tab]');
  var dayImgs = [frame.querySelector('img')], dayAt = 0;
  panel.setAttribute('data-head', DAY[0].head);
  function dayImg(i) {
    if (!dayImgs[i]) {
      var im = new Image(); im.className = 'day-img'; im.decoding = 'async'; im.alt = DAY[i].alt; im.width = 1800; im.height = 1152;
      im.src = 'day/story/sm/' + DAY[i].img + '.webp?v=13';
      frame.insertBefore(im, spot); dayImgs[i] = im; void im.offsetWidth;
    }
    return dayImgs[i];
  }
  function placeSpot(i) { spot.style.left = DAY[i].at[0] * 100 + '%'; spot.style.top = DAY[i].at[1] * 100 + '%'; }
  function setDay(i, focus) {
    i = Math.max(0, Math.min(DAY.length - 1, i));
    var d = DAY[i], im = dayImg(i);
    dayImgs.forEach(function (x) { if (x) x.classList.toggle('on', x === im); });
    frame.style.backgroundColor = d.bg; placeSpot(i);
    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
    if (focus) tabs[i].focus();
    if (tabs[i].scrollIntoView && tabs[i].parentNode.scrollWidth > tabs[i].parentNode.clientWidth) tabs[i].parentNode.scrollTo({ left: Math.max(0, tabs[i].offsetLeft - tabs[i].parentNode.offsetLeft - 20), behavior: 'smooth' });
    panel.setAttribute('aria-labelledby', tabs[i].id); panel.setAttribute('data-head', d.head);
    $('dayNarr').textContent = d.narr; $('dayMsg').textContent = '“' + d.msg + '”'; $('dayDone').textContent = d.done;
    if (i !== dayAt) { panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap'); }
    dayAt = i;
    $('dayPrev').disabled = i === 0; $('dayNext').disabled = i === DAY.length - 1;
    if (i + 1 < DAY.length) setTimeout(function () { dayImg(i + 1); }, 600);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { setDay(i); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (d) { e.preventDefault(); setDay((i + d + DAY.length) % DAY.length, true); }
    });
  });
  $('dayPrev').addEventListener('click', function () { setDay(dayAt - 1); });
  $('dayNext').addEventListener('click', function () { setDay(dayAt + 1); });
  var sx = null;
  frame.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  frame.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 44) setDay(dayAt + (dx < 0 ? 1 : -1));
  }, { passive: true });
  placeSpot(0); $('dayPrev').disabled = true;

  // inside
  var SETS = {
    speaker: [
      { k: 'panel', macro: 'panel', name: 'Top panel', rows: ['Frosted satin polymer', '4 digital MEMS microphones', 'The light shows listening, thinking and speaking'] },
      { k: 'shell', macro: 'shell', name: 'Fabric shell', rows: ['Tightly woven acoustic fabric', 'Hollow shell', 'Lets sound out and hides the electronics'] },
      { k: 'processor', macro: 'processor', name: 'Processor', rows: ['Quad-core Arm Cortex-A55', 'On-chip neural engine', 'Runs Adam and what it learns about your home'] },
      { k: 'memory', macro: 'memory', name: 'Memory', rows: ['2 GB LPDDR4', 'Holds your household’s memory on the device'] },
      { k: 'storage', name: 'Storage', rows: ['16 GB eMMC'] },
      { k: 'radio', macro: 'radio', name: 'Radio', rows: ['Wi-Fi 6, Bluetooth 5, Thread', 'Listens for smoke and CO alarms while the processor sleeps'] },
      { k: 'radar', macro: 'radar', name: 'Presence sensor', rows: ['Knows when someone is in the room', 'No camera, no image'] },
      { k: 'board', macro: 'board', name: 'Circuit board', rows: ['Temperature, humidity and light sensors', 'Carries the chips and power'] },
      { k: 'driver', macro: 'driver', name: 'Speaker driver', rows: ['3 inch full-range', 'Class-D amplifier', 'Adam’s voice'] },
      { k: 'base', macro: 'base', name: 'Base', rows: ['2 cm base in wood or metal, by finish', 'Power, mute switch and reset on the rear'] }
    ],
    plug: [
      { k: 'housing', macro: 'plug_housing', name: 'Front cover', rows: ['Sensor window, status light and vents', 'One microphone pinhole'] },
      { k: 'board', macro: 'plug_board', name: 'Sensor board', rows: ['Wi-Fi 6, Bluetooth 5, Thread', 'Presence sensor', 'Temperature, humidity and light'] },
      { k: 'module', macro: 'plug_module', name: 'Power module', rows: ['5 V, isolated AC to DC'] },
      { k: 'pins', macro: 'plug_pins', name: 'Back shell and pins', rows: ['UK three-pin', 'Fits a standard wall socket'] }
    ]
  };
  var stage = $('cutStage'), partsEl = $('parts'), macro = $('cutMacro'), built = false, set = 'speaker', sel = 0, layers = [];
  function layerSrc(p) { return PREFIX[colour] + 'inside/' + set + '_' + p.k + '.webp?v=6'; }
  function paintLayers() { SETS[set].forEach(function (p, i) { layers[i].src = layerSrc(p); }); showMacro(); }
  function showMacro() {
    var p = SETS[set][sel];
    macro.parentNode.classList.toggle('none', !p.macro);
    if (!p.macro) return;
    var src = PREFIX[colour] + 'inside/macro_' + p.macro + '.webp?v=3';
    macro.alt = p.name + ', close up';
    macro.onerror = function () { macro.onerror = null; macro.src = 'inside/macro_' + p.macro + '.webp?v=3'; };
    if (!macro.getAttribute('src')) macro.src = src; else swapImg(macro, src);
  }
  function select(i) {
    sel = i;
    var p = SETS[set][i];
    all('button', partsEl).forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    layers.forEach(function (im, k) { im.classList.toggle('dim', k !== i); });
    $('cutName').textContent = p.name;
    $('cutRows').innerHTML = '';
    p.rows.forEach(function (r) { var li = document.createElement('li'); li.textContent = r; $('cutRows').appendChild(li); });
    showMacro();
  }
  function build(which, intro) {
    set = which; sel = 0; built = true;
    stage.innerHTML = ''; partsEl.innerHTML = '';
    var n = SETS[set].length;
    layers = SETS[set].map(function (p, i) {
      var im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = layerSrc(p);
      if (intro) { im.className = 'pre'; im.style.setProperty('--dy', ((n - 1) / 2 - i) * 14 + 'px'); im.style.transitionDelay = i * 22 + 'ms'; }
      stage.insertBefore(im, stage.firstChild);
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.innerHTML = '<i aria-hidden="true"></i>'; b.appendChild(document.createTextNode(p.name));
      b.addEventListener('click', function () { select(i); });
      li.appendChild(b); partsEl.appendChild(li);
      return im;
    });
    select(0);
    if (intro) requestAnimationFrame(function () { requestAnimationFrame(function () {
      layers.forEach(function (im) { im.classList.remove('pre'); });
      setTimeout(function () { layers.forEach(function (im) { im.style.transitionDelay = ''; }); }, 900);
    }); });
  }
  all('.seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      all('.seg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      macro.removeAttribute('src');
      build(b.dataset.set, true);
    });
  });
  if ('IntersectionObserver' in window) {
    var cutIO = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { cutIO.disconnect(); build('speaker', true); }
    }, { rootMargin: '300px 0px' });
    cutIO.observe(stage);
  } else build('speaker', false);
})();
