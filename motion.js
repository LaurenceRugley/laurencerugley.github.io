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
      // lerp (not duration) is the right knob for wheel feel: higher = snappier,
      // less trailing glide. 0.12 reads tactile/responsive without losing smoothness.
      var lenis = new Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1.1, syncTouch: false });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);

      // Smooth-scroll in-page anchor links (nav + scroll cue) instead of jumping.
      document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        if (id.length < 2) return; // ignore bare "#"
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -64 }); // clear the sticky nav
      });
      return;
    }
    if (tries++ < 20) setTimeout(initLenis, 50);
  })();
})();
