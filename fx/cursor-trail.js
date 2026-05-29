/* ============================================================
   fx/cursor-trail.js — a quiet gold cursor shimmer (Lusion-inspired).

   A full-viewport 2D <canvas> overlay that draws a soft, low-opacity gold
   trail following the pointer and fading behind it. Self-contained, zero deps,
   no build. Restrained by design — faint, short, fades when the cursor rests.

   Safe by construction:
   - prefers-reduced-motion  -> never inits.
   - no fine pointer (touch)  -> never inits (a trail needs a cursor).
   - pointer-events: none      -> never blocks clicks/scroll.
   - rAF pauses when the trail is empty (cursor idle) and when the tab hides.

   Remove the feature entirely by deleting this file, cursor-trail.css, and the
   two tags in index.html. Nothing else depends on it.
   ============================================================ */
(function () {
  'use strict';

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(pointer: fine)').matches) return; // desktop mouse only

  var canvas = document.createElement('canvas');
  canvas.className = 'cursor-trail';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  document.body.appendChild(canvas);

  var GOLD = '184,153,104'; // --gold; the trail stays gold in both themes
  var MAX = 18;             // trail length (short = restrained)
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var pts = [], rafId = null, lastMove = 0;

  function size() {
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener('resize', size);

  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    pts.push({ x: e.clientX, y: e.clientY });
    if (pts.length > MAX) pts.shift();
    lastMove = now();
    if (rafId == null) rafId = requestAnimationFrame(frame);
  }, { passive: true });

  function frame() {
    rafId = null;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    // 'lighter' makes the gold add up into a soft glow on the dark theme;
    // normal compositing keeps it subtle on the light theme.
    ctx.globalCompositeOperation = isDark() ? 'lighter' : 'source-over';
    var peak = isDark() ? 0.22 : 0.14;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var t = i / (pts.length - 1 || 1);      // 0 = oldest tail, 1 = newest (at cursor)
      var radius = (2 + t * 7) * 2.0;
      var alpha = peak * t;                    // faint, brightest at the head
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      g.addColorStop(0, 'rgba(' + GOLD + ',' + alpha + ')');
      g.addColorStop(1, 'rgba(' + GOLD + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // When the cursor rests, retire the tail point-by-point so the trail
    // gently fades away (and the rAF loop stops once empty).
    if (now() - lastMove > 55 && pts.length) pts.shift();
    if (pts.length) rafId = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      pts = [];
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  });
})();
