/* mjc — art.js: artwork windows (open from their tile, click outside to close) and click-to-play video */
(function () {
  var d = document;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var win = d.getElementById('awin');
  var card = win && win.querySelector('.awin-card');
  var body = win && win.querySelector('.awin-body');
  var lastFocus = null, closing = false, inerted = [];

  function tpl(slug) { return d.getElementById('a-' + slug); }
  function clipFor(from) {
    var f = from.getBoundingClientRect(), c = card.getBoundingClientRect();
    return 'inset(' + Math.max(0, f.top - c.top) + 'px ' + Math.max(0, c.right - f.right) + 'px ' +
      Math.max(0, c.bottom - f.bottom) + 'px ' + Math.max(0, f.left - c.left) + 'px round 8px)';
  }
  function lock(on) {
    if (on) {
      var s = d.getElementById('sheet');
      inerted = (s && !s.hidden) ? [s] : [].slice.call(d.querySelectorAll('main, header.site-header, footer'));
      inerted.forEach(function (el) { el.setAttribute('inert', ''); });
    } else {
      inerted.forEach(function (el) { el.removeAttribute('inert'); });
      inerted = [];
    }
  }

  function openWin(slug, from) {
    var t = tpl(slug);
    if (!win || !t || !win.hidden) return;
    lastFocus = from;
    body.innerHTML = '';
    body.appendChild(t.content.cloneNode(true));
    [].forEach.call(body.querySelectorAll('img'), function (img) {
      img.addEventListener('error', function () { var f = img.closest('figure'); if (f) f.hidden = true; }, { once: true });
    });
    card.scrollTop = 0;
    win.hidden = false;
    lock(true);
    if (!reduce && from) {
      card.style.transition = 'none';
      card.style.clipPath = clipFor(from);
      body.style.opacity = 0;
      void card.offsetWidth;
      card.style.transition = 'clip-path .5s cubic-bezier(.7, 0, .2, 1)';
      card.style.clipPath = 'inset(0px 0px 0px 0px round 24px)';
      setTimeout(function () { body.style.transition = 'opacity .35s ease'; body.style.opacity = 1; }, 180);
      setTimeout(function () { card.style.clipPath = ''; card.style.transition = ''; body.style.transition = ''; }, 580);
    }
    card.querySelector('.awin-x').focus({ preventScroll: true });
  }

  function closeWin(now) {
    if (!win || win.hidden || closing) return;
    closing = true;
    var from = lastFocus && d.contains(lastFocus) ? lastFocus : null;
    var done = function () {
      win.hidden = true;
      card.style.clipPath = ''; card.style.transition = '';
      body.innerHTML = ''; body.style.opacity = ''; body.style.transition = '';
      lock(false);
      closing = false;
      if (from && from.focus) from.focus({ preventScroll: true });
    };
    if (now || reduce || !from) { done(); return; }
    body.style.transition = 'opacity .15s ease';
    body.style.opacity = 0;
    card.style.transition = 'clip-path .42s cubic-bezier(.7, 0, .2, 1)';
    card.style.clipPath = clipFor(from);
    setTimeout(done, 450);
  }

  d.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-embed]');
    if (el) {
      e.preventDefault();
      var f = d.createElement('iframe');
      f.src = el.getAttribute('data-embed');
      f.title = el.getAttribute('aria-label') || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.setAttribute('allowfullscreen', '');
      el.replaceWith(f);
      return;
    }
    if (!win) return;
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var closer = e.target.closest && e.target.closest('[data-aclose]');
    if (closer && win.contains(closer)) { e.preventDefault(); closeWin(); return; }
    var tile = e.target.closest && e.target.closest('[data-art]');
    if (tile && tpl(tile.getAttribute('data-art'))) { e.preventDefault(); openWin(tile.getAttribute('data-art'), tile); }
  });

  /* Escape closes just the window, never the project behind it */
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && win && !win.hidden) { e.preventDefault(); e.stopImmediatePropagation(); closeWin(); }
  }, true);
  addEventListener('popstate', function () { closeWin(true); });
})();
