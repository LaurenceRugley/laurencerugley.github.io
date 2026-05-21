/* ============================================================
   motion.js — premium-motion starter logic.
   Pure progressive enhancement: if this file (or Lenis) fails
   to load, the page still works with native scroll + a theme
   that was already applied by the no-flash <head> script.
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
  // Adding this class is what lets motion.css hide .reveal elements;
  // we only do it once we know we can reveal them again.
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
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    // No IO support: just show everything.
    els.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- LENIS SMOOTH SCROLL ---------- */
  // Lenis is loaded from a CDN with `defer`, so it may not be ready when
  // this runs. Poll briefly, then give up gracefully (native scroll remains).
  var tries = 0;
  (function initLenis() {
    if (window.Lenis) {
      var lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      return;
    }
    if (tries++ < 20) setTimeout(initLenis, 50);
  })();
})();
