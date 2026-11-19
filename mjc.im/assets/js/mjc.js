/* mjc — mjc.js: reveal on scroll, graceful missing images, hello form (mailto) */
(function () {
  var d = document;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var els = [].slice.call(d.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  function missing(img) {
    var t = img.closest('[data-hide-missing]');
    if (t) { t.hidden = true; } else { img.style.visibility = 'hidden'; }
  }
  [].forEach.call(d.images, function (img) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) { missing(img); }
    else { img.addEventListener('error', function () { missing(img); }, { once: true }); }
  });

  var form = d.querySelector('[data-hello]');
  if (form) {
    var note = d.getElementById('form-note');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var get = function (k) { return (f.get(k) || '').toString().trim(); };
      var name = get('name'), brand = get('brand'), msg = get('message');
      var subject = 'Hello' + (brand ? ' - ' + brand : (name ? ' - ' + name : ''));
      var lines = [];
      if (name) lines.push('Name: ' + name);
      if (brand) lines.push('Brand / company: ' + brand);
      if (lines.length) lines.push('');
      lines.push(msg);
      window.location.href = 'mailto:' + form.getAttribute('data-to') +
        '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      if (note) { note.hidden = false; }
    });
  }
})();
