/* mjc — sheet.js: projects open full-screen in place, no page change */
(function () {
  var d = document;
  var sheet = d.getElementById('sheet');
  if (!sheet) return;
  var body = sheet.querySelector('.sheet-body');
  var closeBtn = sheet.querySelector('.sheet-close');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = d.documentElement;
  var current = null;
  var returnFocus = null;
  var busy = false;
  var behind = [].slice.call(d.querySelectorAll('header.hero, main, footer'));

  function tpl(id) { return d.getElementById('p-' + id); }
  function cardFor(id) { return d.querySelector('.web [data-open="' + id + '"]'); }

  function fill(id) {
    var t = tpl(id);
    body.innerHTML = '';
    body.appendChild(t.content.cloneNode(true));
    sheet.className = 'sheet t-' + t.getAttribute('data-theme');
    var h1 = body.querySelector('h1');
    if (h1) { h1.id = 'sheet-title'; sheet.setAttribute('aria-labelledby', 'sheet-title'); }
    [].forEach.call(body.querySelectorAll('img'), function (img) {
      img.addEventListener('error', function () {
        var holder = img.closest('[data-hide-missing]');
        if (holder) holder.hidden = true; else img.style.visibility = 'hidden';
      }, { once: true });
    });
    sheet.scrollTop = 0;
    current = id;
  }

  function lock(on) {
    root.classList.toggle('sheet-open', on);
    behind.forEach(function (el) { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
  }

  function clipFor(el) {
    var r = el.getBoundingClientRect();
    var rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24;
    return 'inset(' + Math.max(0, r.top) + 'px ' + Math.max(0, innerWidth - r.right) + 'px ' +
      Math.max(0, innerHeight - r.bottom) + 'px ' + Math.max(0, r.left) + 'px round ' + Math.min(rad, 120) + 'px)';
  }

  function open(id, fromEl, push) {
    if (!tpl(id) || busy) return;
    var wasOpen = !sheet.hidden;
    if (wasOpen) { swap(id, push); return; }
    returnFocus = fromEl || d.activeElement;
    fill(id);
    sheet.hidden = false;
    lock(true);
    if (push) { try { history.pushState({ sheet: id }, '', '#' + id); } catch (e) {} }
    if (reduce || !fromEl) { closeBtn.focus({ preventScroll: true }); return; }
    busy = true;
    sheet.style.transition = 'none';
    sheet.style.clipPath = clipFor(fromEl);
    body.style.opacity = 0; closeBtn.style.opacity = 0;
    void sheet.offsetWidth;
    sheet.style.transition = 'clip-path .65s cubic-bezier(.7, 0, .2, 1)';
    sheet.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
    setTimeout(function () {
      body.style.transition = closeBtn.style.transition = 'opacity .45s ease';
      body.style.opacity = 1; closeBtn.style.opacity = 1;
    }, 320);
    setTimeout(function () {
      sheet.style.clipPath = ''; sheet.style.transition = '';
      body.style.transition = closeBtn.style.transition = '';
      busy = false;
      closeBtn.focus({ preventScroll: true });
    }, 720);
  }

  function swap(id, push) {
    if (id === current) return;
    busy = true;
    body.style.transition = 'opacity .25s ease';
    body.style.opacity = 0;
    setTimeout(function () {
      fill(id);
      var c = cardFor(id); if (c) returnFocus = c;
      body.style.opacity = 1;
      if (history.state && history.state.sheet) { try { history.replaceState({ sheet: id }, '', '#' + id); } catch (e) {} }
      else if (push) { try { history.pushState({ sheet: id }, '', '#' + id); } catch (e) {} }
      setTimeout(function () { body.style.transition = ''; busy = false; }, 260);
    }, reduce ? 0 : 260);
  }

  function shut(fromHistory) {
    if (sheet.hidden || busy) return;
    if (!fromHistory && history.state && history.state.sheet) { history.back(); return; }
    var target = cardFor(current);
    if (!fromHistory && !(history.state && history.state.sheet)) {
      try { if (location.hash && location.hash !== '#main') history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    }
    var done = function () {
      sheet.hidden = true;
      sheet.style.clipPath = ''; sheet.style.transition = '';
      body.style.opacity = ''; body.style.transition = ''; closeBtn.style.opacity = '';
      body.innerHTML = '';
      lock(false);
      busy = false; current = null;
      var f = target || returnFocus;
      if (f && f.focus) f.focus({ preventScroll: true });
    };
    if (reduce || !target) { done(); return; }
    busy = true;
    if (target.scrollIntoView) {
      var r = target.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) { target.scrollIntoView({ block: 'center', inline: 'center' }); }
    }
    body.style.transition = closeBtn.style.transition = 'opacity .2s ease';
    body.style.opacity = 0; closeBtn.style.opacity = 0;
    setTimeout(function () {
      sheet.style.transition = 'clip-path .55s cubic-bezier(.7, 0, .2, 1)';
      sheet.style.clipPath = clipFor(target);
      setTimeout(done, 580);
    }, 160);
  }

  /* clicks on map cards and on "next" inside the sheet */
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var closer = e.target.closest && e.target.closest('[data-close]');
    if (closer && sheet.contains(closer)) { e.preventDefault(); shut(); return; }
    var a = e.target.closest && e.target.closest('[data-open]');
    if (!a) return;
    var id = a.getAttribute('data-open');
    if (!tpl(id)) return;
    e.preventDefault();
    open(id, a.classList.contains('card') ? a : null, true);
  });
  closeBtn.addEventListener('click', function () { shut(); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) { e.preventDefault(); shut(); } });

  /* back/forward buttons and shared links */
  addEventListener('popstate', function (e) {
    var id = e.state && e.state.sheet;
    if (id && tpl(id)) { if (sheet.hidden) open(id, cardFor(id), false); else swap(id, false); }
    else if (!sheet.hidden) shut(true);
  });
  var hash = (location.hash || '').slice(1);
  if (hash && tpl(hash)) {
    try { history.replaceState({ sheet: hash }, '', '#' + hash); } catch (e) {}
    fill(hash);
    sheet.hidden = false; lock(true);
  }
})();
