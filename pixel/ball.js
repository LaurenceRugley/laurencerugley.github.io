/* ----------------------------------------------------------------------------
   pixel/ball.js — a battable physics ball for the pixel companion.

   Self-contained: it reads the companion sprite's on-screen rect (.pixel-sprite)
   for collision and gates entirely on body[data-pixel="on"]. No edits to the
   companion engine (pixel.js) — fully decoupled.

   Behaviour:
   - Fling it with the mouse/touch (drag + release imparts velocity).
   - Gravity, floor + wall bounce with damping, friction; settles to rest.
   - Bounces off the companion's bounding box, and he "bats" it when he walks
     into it (his horizontal motion is imparted to the ball).
   - Only exists while companion mode is on; removed when off.
   - prefers-reduced-motion: disabled entirely (it's a motion toy).
   - rAF loop runs only while companion mode is on (paused when tab hidden).
   ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return; // motion toy — skip for reduced-motion users

  // Runs on touch AND mouse. The old tap-hazard (ball resting over the footer /
  // Start CTA and eating taps) is solved by the click-through "passthrough" mode
  // below: whenever the ball is over an interactive element it goes transparent +
  // pointer-events:none, so the link/field underneath receives the tap.

  // --- tuning ---------------------------------------------------------------
  var R = 12;               // ball radius (px) — diameter 24, ~proportionate to the 48x72 sprite
  var G = 0.55;             // gravity per frame
  var REST = 0.72;          // restitution (bounciness) 0..1
  var AIR = 0.992;          // horizontal air drag per frame
  var FLOOR_FRICTION = 0.86;// horizontal damping while touching the floor
  var REST_EPS = 0.4;       // velocity below which we treat the ball as settled
  var FLING_MAX = 36;       // clamp on fling speed (px/frame)
  var FLOOR_OFFSET = 24;    // matches .pixel-sprite { bottom: 24px } — shared ground

  // --- state ----------------------------------------------------------------
  var ball = null, raf = 0;
  var cx = 0, cy = 0, vx = 0, vy = 0;            // centre position + velocity
  var dragging = false, dragId = null;
  var lastPX = 0, lastPY = 0, dragVX = 0, dragVY = 0;
  var prevSpriteLeft = null;                      // for estimating the companion's vx
  // Click-through ("passthrough"): cached rects of interactive elements; when the
  // ball overlaps one it turns transparent + pointer-events:none so taps go through.
  var interactiveRects = [];
  var wasPassthrough = false;
  var frame = 0;

  function floorY() { return window.innerHeight - FLOOR_OFFSET; }
  function maxX() { return window.innerWidth - R; }

  // --- click-through near interactive elements ------------------------------
  var INTERACTIVE_SEL = 'a[href], button, input, textarea, select, label, [role="button"]';
  function refreshInteractiveRects() {
    interactiveRects = [];
    var els = document.querySelectorAll(INTERACTIVE_SEL);
    for (var i = 0; i < els.length; i++) {
      if (els[i] === ball) continue;
      // Don't treat our OWN easter-egg controls as click-through targets — else the
      // ball goes transparent + ungrabbable resting over them (e.g. the smash button
      // in the bottom-right corner: "stuck behind the button").
      if (els[i].matches && els[i].matches('.breakout-launch, .pixel-toggle, .theme-toggle')) continue;
      var r = els[i].getBoundingClientRect();
      if (r.width && r.height && r.bottom > 0 && r.top < window.innerHeight) interactiveRects.push(r);
    }
  }
  function overInteractive() {
    var m = 2; // tight: only go click-through when actually over a link/field (grab stays responsive)
    for (var i = 0; i < interactiveRects.length; i++) {
      var r = interactiveRects[i];
      if (cx + R > r.left - m && cx - R < r.right + m &&
          cy + R > r.top - m && cy - R < r.bottom + m) return true;
    }
    return false;
  }
  function setPassthrough(on) {
    if (on === wasPassthrough || !ball) return;
    wasPassthrough = on;
    ball.classList.toggle('is-passthrough', on);
  }
  // Recompute on scroll/resize too: a resting ball can have a link scrolled UNDER
  // it, and the rAF loop may be throttled/paused — so don't rely on the loop alone.
  function onScrollResize() {
    if (!ball) return;
    refreshInteractiveRects();
    if (!dragging) setPassthrough(overInteractive());
  }

  // --- lifecycle ------------------------------------------------------------
  function makeBall() {
    if (ball) return;
    ball = document.createElement('div');
    ball.className = 'pixel-ball';
    ball.setAttribute('aria-hidden', 'true');
    ball.addEventListener('pointerdown', onDown);
    document.body.appendChild(ball);
    // entrance: drop in from above, ~62% across, so it's noticed
    cx = Math.max(R, Math.min(maxX(), window.innerWidth * 0.62));
    cy = floorY() - R - Math.min(170, window.innerHeight * 0.3);
    vx = 0; vy = 0; prevSpriteLeft = null; wasPassthrough = false; frame = 0;
    refreshInteractiveRects();
    place();
    start();
    window.addEventListener('scroll', onScrollResize, { passive: true });
    window.addEventListener('resize', onScrollResize);
  }

  function destroyBall() {
    stop();
    window.removeEventListener('scroll', onScrollResize);
    window.removeEventListener('resize', onScrollResize);
    if (ball) {
      ball.removeEventListener('pointerdown', onDown);
      ball.remove();
      ball = null;
    }
  }

  function place() {
    if (ball) ball.style.transform = 'translate(' + (cx - R) + 'px,' + (cy - R) + 'px)';
  }

  // --- drag to fling --------------------------------------------------------
  function onDown(e) {
    dragging = true; dragId = e.pointerId;
    try { ball.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ }
    ball.classList.add('is-grabbed');
    lastPX = e.clientX; lastPY = e.clientY; dragVX = 0; dragVY = 0;
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    start();
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging || e.pointerId !== dragId) return;
    // light smoothing so a single spike doesn't dominate the fling
    dragVX = dragVX * 0.4 + (e.clientX - lastPX) * 0.6;
    dragVY = dragVY * 0.4 + (e.clientY - lastPY) * 0.6;
    lastPX = e.clientX; lastPY = e.clientY;
    cx = e.clientX; cy = e.clientY;
    clampInside();
    place();
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    if (ball) ball.classList.remove('is-grabbed');
    vx = Math.max(-FLING_MAX, Math.min(FLING_MAX, dragVX));
    vy = Math.max(-FLING_MAX, Math.min(FLING_MAX, dragVY));
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
  }

  function clampInside() {
    if (cx < R) cx = R; else if (cx > maxX()) cx = maxX();
    if (cy < R) cy = R; else if (cy > floorY() - R) cy = floorY() - R;
  }

  // --- collide with the companion (treat his box as an obstacle/paddle) -----
  function collideSprite() {
    var s = document.querySelector('.pixel-sprite');
    if (!s) { prevSpriteLeft = null; return; }
    var r = s.getBoundingClientRect();
    if (!r.width) { prevSpriteLeft = null; return; }
    var spriteVX = prevSpriteLeft == null ? 0 : (r.left - prevSpriteLeft);
    prevSpriteLeft = r.left;

    // nearest point on the sprite's AABB to the ball centre
    var nx = Math.max(r.left, Math.min(cx, r.right));
    var ny = Math.max(r.top, Math.min(cy, r.bottom));
    var dx = cx - nx, dy = cy - ny;
    var d2 = dx * dx + dy * dy;
    if (d2 > R * R) return; // no contact

    var inside = cx > r.left && cx < r.right && cy > r.top && cy < r.bottom;
    if (inside || d2 === 0) {
      // centre is inside the box — eject along the nearest edge
      var toLeft = cx - r.left, toRight = r.right - cx;
      var toTop = cy - r.top, toBottom = r.bottom - cy;
      var m = Math.min(toLeft, toRight, toTop, toBottom);
      if (m === toLeft) { cx = r.left - R; vx = -Math.abs(vx) - 1.5; }
      else if (m === toRight) { cx = r.right + R; vx = Math.abs(vx) + 1.5; }
      else if (m === toTop) { cy = r.top - R; vy = -Math.abs(vy) * REST - 1.5; }
      else { cy = r.bottom + R; vy = Math.abs(vy); }
    } else {
      var d = Math.sqrt(d2) || 0.0001;
      var ux = dx / d, uy = dy / d;
      cx = nx + ux * R; cy = ny + uy * R;     // push to the surface
      var vn = vx * ux + vy * uy;             // velocity along the contact normal
      if (vn < 0) { vx -= (1 + REST) * vn * ux; vy -= (1 + REST) * vn * uy; }
    }
    vx += spriteVX * 0.6; // he bats it as he moves
  }

  // --- integration loop -----------------------------------------------------
  function step() {
    if (!ball) { raf = 0; return; }
    if (!dragging) {
      vy += G;
      vx *= AIR;
      cx += vx; cy += vy;

      if (cx < R) { cx = R; vx = -vx * REST; }
      else if (cx > maxX()) { cx = maxX(); vx = -vx * REST; }
      if (cy < R) { cy = R; vy = -vy * REST; }

      var fy = floorY() - R;
      if (cy > fy) {
        cy = fy;
        vy = -vy * REST;
        vx *= FLOOR_FRICTION;
        if (Math.abs(vy) < 1.2) vy = 0;        // stop micro-bouncing
      }
      collideSprite();

      // settle: kill jitter once it's resting on the floor
      if (cy >= fy - 0.5 && Math.abs(vy) < REST_EPS && Math.abs(vx) < REST_EPS) {
        vx = 0; vy = 0;
      }
      place();
      // click-through: refresh the interactive rects periodically (cheap), then
      // dim + pass taps through whenever the ball is over a link/field.
      if (++frame % 8 === 0) refreshInteractiveRects();
      setPassthrough(overInteractive());
    } else {
      collideSprite(); // while held, still let the companion nudge it
      setPassthrough(false); // solid + grabbable while actively dragging
    }
    raf = requestAnimationFrame(step);
  }

  function start() { if (!raf) raf = requestAnimationFrame(step); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  // --- wire to companion mode ----------------------------------------------
  function sync() {
    var on = document.body && document.body.getAttribute('data-pixel') === 'on';
    if (on && !ball) makeBall();
    else if (!on && ball) destroyBall();
  }

  function init() {
    if (!document.body) return;
    new MutationObserver(sync).observe(document.body, {
      attributes: true, attributeFilter: ['data-pixel']
    });
    sync(); // handles the persisted "already on" case
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (ball) start();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
