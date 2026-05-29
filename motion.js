/* ============================================================
   motion.js — LGR Web Studio site motion logic.
   Pure progressive enhancement. Does NOT touch pixel-mode state;
   the pixel companion runs independently in pixel/pixel.js.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- THEME TOGGLE ---------- */
  var toggle = document.querySelector('.theme-toggle');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (toggle) toggle.setAttribute('aria-pressed', String(t === 'dark'));
    try { localStorage.setItem('lgr-theme', t); } catch (e) {}
  }
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(root.getAttribute('data-theme') === 'dark'));
    toggle.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  // Everything below is motion — skip entirely under reduced-motion.
  if (reduce) return;

  /* ---------- SCROLL REVEALS (IntersectionObserver) ---------- */
  root.classList.add('js-reveal');
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- LENIS SMOOTH SCROLL (gentle) ---------- */
  // Loaded from CDN with `defer`; poll briefly, then fall back to native.
  var tries = 0;
  (function initLenis() {
    if (window.Lenis) {
      // Slightly snappier than default so the glide tail is short (less "lag").
      var lenis = new Lenis({ lerp: 0.14, smoothWheel: true, syncTouch: false });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);

      var navEl = document.querySelector('.nav');
      function navH() { return navEl ? Math.round(navEl.getBoundingClientRect().height) : 0; }

      // Smooth-scroll in-page anchor links (nav + scroll cue) instead of jumping.
      document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        if (id.length < 2) return; // ignore bare "#"
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -navH() }); // clear the sticky nav
      });

      /* ---------- HYBRID PROXIMITY SECTION-SNAP ----------
         Free smooth scrolling stays free. When you STOP near a section, it
         eases that section fully into frame (below the nav). It never fires
         mid-scroll (130ms settle debounce), never traps you (only engages
         within ~45% of a viewport of a section), and the snap itself is a
         quick Lenis scrollTo (~0.55s) so it's part of the smooth motion, not
         a fight with it. Hand-rolled = fully ours to tune; no extra deps. */
      var sections = [].slice.call(document.querySelectorAll('main section'));
      if (sections.length) {
        var snapping = false, snapTimer = null, safety = null;

        // offsetTop is the LAYOUT position — immune to the reveal animation's
        // transform — so the snap lands aligned on the first try (no drift-
        // then-correct). getBoundingClientRect() includes the transform, which
        // caused the "snaps unaligned, then snaps back" double-adjust.
        function absTop(el) { var t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; }
        function snapTargets() {
          var nh = navH();
          return sections.map(function (s, i) {
            return i === 0 ? 0 : Math.max(0, Math.round(absTop(s) - nh)); // top of page for hero
          });
        }

        function settle() {
          if (snapping) return;
          var y = window.scrollY || window.pageYOffset || 0;
          var vh = window.innerHeight;
          var pts = snapTargets(), best = null, bestD = Infinity;
          for (var i = 0; i < pts.length; i++) {
            var d = Math.abs(pts[i] - y);
            if (d < bestD) { bestD = d; best = pts[i]; }
          }
          if (best == null || bestD < 4) return;     // nothing near, or already framed
          if (bestD > vh * 0.5) return;              // proximity gate: keep free scroll free
          snapping = true;
          lenis.scrollTo(best, {
            duration: 0.4,                                            // quick, not laggy
            easing: function (t) { return 1 - Math.pow(1 - t, 3); },  // easeOutCubic
            onComplete: function () { snapping = false; }
          });
          clearTimeout(safety);
          safety = setTimeout(function () { snapping = false; }, 700); // backup unlock
        }

        lenis.on('scroll', function () {
          if (snapping) return;
          clearTimeout(snapTimer);
          snapTimer = setTimeout(settle, 80); // engage soon after scrolling stops
        });
      }
      return;
    }
    if (tries++ < 20) setTimeout(initLenis, 50);
  })();
})();
