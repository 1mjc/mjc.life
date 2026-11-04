/* MJC CO. — site.js: reveal on scroll, graceful missing images, mailto inquiry */
(function () {
  var d = document;

  // Subtle reveal on scroll (skipped when the visitor prefers reduced motion)
  var els = [].slice.call(d.querySelectorAll('.reveal'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  // If an image file is missing, hide its tile instead of showing a broken icon
  function missing(img) {
    var t = img.closest('[data-hide-missing]');
    if (t) { t.hidden = true; } else { img.style.visibility = 'hidden'; }
  }
  [].forEach.call(d.images, function (img) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) { missing(img); }
    else { img.addEventListener('error', function () { missing(img); }, { once: true }); }
  });

  // Inquiry form: builds a pre-written email (no backend needed)
  var form = d.querySelector('[data-inquiry]');
  if (form) {
    var note = d.getElementById('form-note');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var name = (f.get('name') || '').toString().trim();
      var company = (f.get('company') || '').toString().trim();
      var type = (f.get('type') || '').toString();
      var timing = (f.get('timing') || '').toString();
      var msg = (f.get('message') || '').toString().trim();
      var subject = 'Project inquiry' + (company ? ' - ' + company : (name ? ' - ' + name : ''));
      var body = [
        'Name: ' + name,
        'Brand / company: ' + company,
        'Project type: ' + type,
        'Timing: ' + timing,
        '',
        msg
      ].join('\n');
      window.location.href = 'mailto:' + form.getAttribute('data-to') +
        '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      if (note) { note.hidden = false; }
    });
  }
})();
