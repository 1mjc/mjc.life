/* mjc — web.js: the interactive map on the home page, and the title that shies away from your cursor */
(function () {
  var d = document;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----- Title letters lean away from the pointer ----- */
  var title = d.querySelector('.title');
  if (title && !reduce && window.matchMedia && matchMedia('(pointer: fine)').matches) {
    var letters = [].slice.call(title.querySelectorAll('.ltr'));
    var reset = function () { letters.forEach(function (l) { l.style.transform = ''; }); };
    addEventListener('pointermove', function (e) {
      if (e.clientY > innerHeight * 0.95) return;
      letters.forEach(function (l) {
        var r = l.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        var dist = Math.hypot(dx, dy) || 1;
        var pull = Math.max(0, 1 - dist / 620);
        l.style.transform = 'translate(' + (-dx / dist * pull * 28).toFixed(1) + 'px,' + (-dy / dist * pull * 18).toFixed(1) +
          'px) rotate(' + (dx / dist * pull * -5).toFixed(2) + 'deg)';
      });
    }, { passive: true });
    d.addEventListener('mouseleave', reset);
  }

  /* ----- The web ----- */
  var web = d.querySelector('[data-web]');
  if (!web) return;
  var svg = web.querySelector('.web-svg');
  var NS = 'http://www.w3.org/2000/svg';
  var nodes = {};
  [].forEach.call(web.querySelectorAll('[data-id]'), function (el) {
    nodes[el.getAttribute('data-id')] = {
      el: el,
      parent: el.getAttribute('data-parent'),
      chain: el.getAttribute('data-chain') || el.getAttribute('data-parent')
    };
  });


  var edges = [];
  Object.keys(nodes).forEach(function (id) {
    var n = nodes[id];
    if (!n.chain) return;
    var p = d.createElementNS(NS, 'path');
    p.setAttribute('class', 'edge');
    svg.appendChild(p);
    edges.push({ to: id, from: n.chain, path: p });
  });
  var crosses = (web.getAttribute('data-cross') || '').split(',').filter(Boolean).map(function (s) {
    var ab = s.split(':');
    var p = d.createElementNS(NS, 'path');
    p.setAttribute('class', 'edge cross');
    svg.appendChild(p);
    return { a: ab[0], b: ab[1], path: p };
  });

  function box(id) {
    var r = nodes[id].el.getBoundingClientRect();
    var w = web.getBoundingClientRect();
    return { cx: r.left - w.left + r.width / 2, top: r.top - w.top, bottom: r.bottom - w.top, left: r.left - w.left, mid: r.top - w.top + r.height / 2 };
  }

  function draw() {
    if (getComputedStyle(svg).display === 'none') return;
    var w = web.getBoundingClientRect();
    svg.setAttribute('width', w.width);
    svg.setAttribute('height', w.height);
    edges.forEach(function (e) {
      var a = box(e.from), b = box(e.to);
      var up = b.mid < a.mid;
      var sy = up ? a.top : a.bottom, ey = up ? b.bottom : b.top;
      var dy = (ey - sy) * 0.5;
      e.path.setAttribute('d', 'M' + a.cx + ' ' + sy + ' C' + a.cx + ' ' + (sy + dy) + ',' + b.cx + ' ' + (ey - dy) + ',' + b.cx + ' ' + ey);
    });
    crosses.forEach(function (c) {
      var a = box(c.a), b = box(c.b);
      var w2 = web.getBoundingClientRect().width;
      var near = Math.abs(a.cx - b.cx) < 80;
      var bulge = near ? (a.cx < w2 / 2 ? -120 : 120) : 0;
      var dy2 = (b.mid - a.mid) * 0.35;
      c.path.setAttribute('d', 'M' + a.cx + ' ' + a.mid + ' C' + (a.cx + bulge) + ' ' + (a.mid + dy2) + ',' + (b.cx + bulge) + ' ' + (b.mid - dy2) + ',' + b.cx + ' ' + b.mid);
    });
  }

  /* ----- Focus a branch: node, its ancestors, its descendants ----- */
  var pinned = null;
  function lineage(id) {
    var set = {};
    var cur = id;
    while (cur) { set[cur] = true; cur = nodes[cur] && nodes[cur].chain; }
    Object.keys(nodes).forEach(function (k) {
      var c = k;
      while (c) { if (c === id) { set[k] = true; break; } c = nodes[c] && nodes[c].parent; }
    });
    return set;
  }
  function focus(id) {
    var set = lineage(id);
    web.classList.add('has-focus');
    Object.keys(nodes).forEach(function (k) { nodes[k].el.classList.toggle('on', !!set[k]); });
    edges.forEach(function (e) { e.path.classList.toggle('on', !!set[e.to]); });
    crosses.forEach(function (c) { c.path.classList.toggle('on', !!set[c.a] || !!set[c.b]); });
  }
  function clear() {
    if (pinned) { focus(pinned); return; }
    web.classList.remove('has-focus');
    Object.keys(nodes).forEach(function (k) { nodes[k].el.classList.remove('on'); });
    edges.concat(crosses).forEach(function (e) { e.path.classList.remove('on'); });
  }
  Object.keys(nodes).forEach(function (id) {
    if (id === 'root') return;
    var el = nodes[id].el;
    el.addEventListener('mouseenter', function () { focus(id); });
    el.addEventListener('mouseleave', clear);
    el.addEventListener('focusin', function () { focus(id); });
    el.addEventListener('focusout', clear);
  });
  [].forEach.call(web.querySelectorAll('button.hub'), function (b) {
    var id = b.closest('[data-id]').getAttribute('data-id');
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      var was = pinned === id;
      pinned = was ? null : id;
      [].forEach.call(web.querySelectorAll('button.hub'), function (o) { o.setAttribute('aria-pressed', 'false'); });
      if (!was) { b.setAttribute('aria-pressed', 'true'); focus(id); } else { clear(); }
    });
  });

  /* ----- Keep the lines glued to the drifting nodes ----- */
  var raf = null;
  function loop() { draw(); raf = requestAnimationFrame(loop); }
  function start() { if (!reduce && !raf) loop(); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
  draw();
  addEventListener('resize', draw);
  addEventListener('load', draw);
  [].forEach.call(web.querySelectorAll('img'), function (i) { i.addEventListener('load', draw); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(draw);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }, { rootMargin: '120px' }).observe(web);
  } else { start(); }
})();
