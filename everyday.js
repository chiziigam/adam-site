(function () {
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
