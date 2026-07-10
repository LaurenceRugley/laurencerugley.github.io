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

  /* ---------- NAV: active-section indicator + condense on scroll ----------
     Runs regardless of motion preference (it's state, not motion). The sticky
     nav already follows the scroll (position:sticky); this highlights the
     section you're in and tightens the bar once you leave the hero. */
  (function () {
    var nav = document.querySelector('.nav');
    var links = [].slice.call(document.querySelectorAll('.nav-links a'));
    var byHref = {};
    links.forEach(function (a) { byHref[a.getAttribute('href')] = a; });

    if ('IntersectionObserver' in window && links.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var a = byHref['#' + en.target.id];
          if (!a) return;
          links.forEach(function (l) { l.removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      ['approach', 'process', 'work', 'start'].forEach(function (id) {
        var s = document.getElementById(id); if (s) spy.observe(s);
      });
    }
    if (nav) {
      var onNavScroll = function () { nav.classList.toggle('is-condensed', (window.scrollY || window.pageYOffset || 0) > 24); };
      onNavScroll();
      window.addEventListener('scroll', onNavScroll, { passive: true });
    }
  })();

  // Everything below is motion — skip entirely under reduced-motion.
  if (reduce) return;

  /* ---------- LETTER-BY-LETTER REVEAL (accessible) ----------
     Split a few display headings into per-letter spans that cascade in when
     their section reveals/snaps (Lusion-style). ACCESSIBLE: the element keeps
     an aria-label with the full text and every letter span is aria-hidden, so
     screen readers + copy/paste get the real words, not "C-u-s-t-o-m". Done
     before the reveal observer runs so the spans exist when .is-visible lands.
     Skipped under reduced-motion (we already returned above). */
  function splitNode(node, counter) {
    [].slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) { // text node -> one span per character
        var frag = document.createDocumentFragment();
        child.textContent.split('').forEach(function (ch) {
          if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
          var s = document.createElement('span');
          s.className = 'char'; s.textContent = ch;
          s.setAttribute('aria-hidden', 'true');
          s.style.setProperty('--i', counter.i++);
          frag.appendChild(s);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        child.setAttribute('aria-hidden', 'true'); // e.g. <em> — recurse, keep it
        splitNode(child, counter);
      }
    });
  }
  [].slice.call(document.querySelectorAll('.hero-title, .section-label')).forEach(function (el) {
    if (el.dataset.split) return;
    // innerText respects the <br> as a break so screen readers don't run
    // "websites,made" together; fall back to textContent if unavailable.
    el.setAttribute('aria-label', (el.innerText || el.textContent).replace(/\s+/g, ' ').trim());
    splitNode(el, { i: 0 });
    el.classList.add('split');
    el.dataset.split = '1';
  });

  /* ---------- SCROLL REVEALS (IntersectionObserver) ---------- */
  root.classList.add('js-reveal');
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');  // lets the split cascade play normally
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });

    // SAFETY NET (real-Chrome fix, 2026-07-09): the reveal observer is flaky in
    // real Chrome for above-the-fold content — sometimes `is-visible` never
    // lands, sometimes the split char-cascade stalls mid-transition. Either way
    // the HERO HEADLINE stays invisible (headless never reproduced it; caught by
    // driving the live site in a real browser). After the intended cascade
    // window, force-complete any reveal element already in the viewport. Below-
    // the-fold sections are out of view here, so their scroll reveal is untouched.
    setTimeout(function () {
      [].slice.call(els).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < (window.innerHeight || document.documentElement.clientHeight) && r.bottom > 0) {
          el.classList.add('is-visible');
          if (el.classList.contains('split')) el.classList.add('reveal-done');
        }
      });
    }, 1200);
  } else {
    els.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- LENIS SMOOTH SCROLL ---------- */
  // Self-hosted Lenis (vendor/lenis.min.js, defer): poll briefly until the
  // global is ready, then fall back to native scrolling if it never loads.
  var tries = 0;
  (function initLenis() {
    if (window.Lenis) {
      // Slightly snappier than default so the glide tail is short (less "lag").
      var lenis = new Lenis({ lerp: 0.14, smoothWheel: true, syncTouch: false });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);

      var navEl = document.querySelector('.nav');
      function navH() { return navEl ? Math.round(navEl.getBoundingClientRect().height) : 0; }
      function scrollY() { return typeof lenis.scroll === 'number' ? lenis.scroll : (window.scrollY || window.pageYOffset || 0); }

      // Smooth-scroll in-page anchor links (nav + scroll cue) instead of jumping.
      document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        if (id.length < 2) return; // ignore bare "#"
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -navH(), lock: true, duration: 0.6 }); // clear the sticky nav
      });

      /* ---------- DIRECTIONAL COMMIT-SNAP ----------
         Free smooth scrolling stays free. The snap NEVER pulls you backward:
         it only moves toward the direction you were travelling, and only once
         Lenis has actually stopped (not mid-glide). It engages only after you
         coast close to the next section (commit zone), is locked so live input
         can't fight it, and never re-fires while one is in flight. Hand-rolled
         on Lenis's own scrollTo — fully ours, no extra deps. */
      var sections = [].slice.call(document.querySelectorAll('main section'));
      if (sections.length) {
        var snapping = false, snapTimer = null, safety = null;
        var lastY = scrollY(), dir = 0; // dir: 1 = down, -1 = up

        // offsetTop is the LAYOUT position — immune to the reveal transform — so
        // the snap lands aligned (getBoundingClientRect would include it).
        function absTop(el) { var t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; }
        function snapTargets() {
          var nh = navH(), vh = window.innerHeight;
          var maxY = Math.max(0, (document.documentElement.scrollHeight || document.body.scrollHeight) - vh);
          var raw = sections.map(function (s, i) {
            var t = i === 0 ? 0 : Math.max(0, Math.round(absTop(s) - nh)); // top of page for hero
            return Math.min(t, maxY); // never past the bottom — keep the footer reachable
          });
          if (raw.length && raw[raw.length - 1] < maxY - 4) raw.push(maxY); // bottom = footer framed
          // Always keep the top (0) and the bottom; drop near-duplicates between.
          var pts = [raw[0]];
          for (var i = 1; i < raw.length; i++) {
            if (raw[i] - pts[pts.length - 1] > vh * 0.5) pts.push(raw[i]);
          }
          var bottom = raw[raw.length - 1];
          if (pts[pts.length - 1] !== bottom) pts.push(bottom);
          return pts;
        }

        function settle() {
          if (snapping) return;
          if (lenis.isScrolling) { snapTimer = setTimeout(settle, 60); return; } // wait for a real stop
          var y = scrollY(), vh = window.innerHeight;
          var pts = snapTargets(), best = null, bestD = Infinity;
          for (var i = 0; i < pts.length; i++) {
            var delta = pts[i] - y;
            if (dir > 0 && delta < -4) continue;   // going down: ignore targets above — no backward snap
            if (dir < 0 && delta >  4) continue;   // going up:   ignore targets below
            var d = Math.abs(delta);
            if (d < bestD) { bestD = d; best = pts[i]; }
          }
          if (best == null) return;
          if (bestD < 24) return;            // already framed — leave it (dead-zone, no micro-snaps)
          if (bestD > vh * 0.4) return;      // not committed yet — free scroll stays free
          snapping = true;
          lenis.scrollTo(best, {
            duration: 0.45,
            lock: true,                                              // don't let momentum fight the snap
            easing: function (t) { return 1 - Math.pow(1 - t, 3); }, // easeOutCubic
            onComplete: function () { clearTimeout(safety); snapping = false; }
          });
          clearTimeout(safety);
          safety = setTimeout(function () { snapping = false; }, 1400); // > max duration; backup unlock
        }

        lenis.on('scroll', function () {
          var y = scrollY();
          if (y > lastY + 1) dir = 1; else if (y < lastY - 1) dir = -1;
          lastY = y;
          if (snapping) return;
          clearTimeout(snapTimer);
          snapTimer = setTimeout(settle, 140); // wait out the glide tail, then settle
        });
      }
      return;
    }
    if (tries++ < 20) setTimeout(initLenis, 50);
  })();
})();
