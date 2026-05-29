/* ----------------------------------------------------------------------------
   pixel/breakout.js — "SMASH" mode: a Breakout-style game played against the
   site's own content. A no-gravity ball bounces around the viewport; flinging it
   into a content block (card / step / work-item / heading / CTA) knocks that block
   away. Self-contained; nested inside the companion easter egg (the launch button
   only appears when the companion is on), so clients never see it.

   Enter: the "smash" button (companion mode). Exit: ✕ / Esc / turning the
   companion off. Exit fully restores the page. prefers-reduced-motion: disabled.
   ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return; // game mode is motion-heavy

  // Smashable content blocks.
  var BRICK_SEL = '.card, .step, .work-item, .hero-title, .hero-sub, .btn-primary, .section-label, h2, p';
  var R = 13; // ball radius (px)

  var active = false, raf = 0;
  var ball = null, hud = null, launchBtn = null, countEl = null;
  var cx = 0, cy = 0, vx = 0, vy = 0;
  var bricks = [];           // { el, alive }
  var shards = [];           // transient shatter pieces
  var smashed = 0, total = 0;
  var dragging = false, dragId = null, lastPX = 0, lastPY = 0, dragVX = 0, dragVY = 0, moved = 0;

  function speed() { return Math.max(8, Math.min(14, window.innerWidth / 120)); } // faster + bouncier

  // ---- launch button (CSS shows it only in companion mode) -----------------
  function ensureLaunch() {
    if (launchBtn) return;
    launchBtn = document.createElement('button');
    launchBtn.type = 'button';
    launchBtn.className = 'breakout-launch';
    launchBtn.setAttribute('aria-label', 'Play smash mode');
    launchBtn.innerHTML = '<span class="bl-glyph" aria-hidden="true">◓</span> smash';
    launchBtn.addEventListener('click', enterGame);
    document.body.appendChild(launchBtn);
  }

  // ---- bricks --------------------------------------------------------------
  function gatherBricks() {
    bricks = [];
    var els = document.querySelectorAll(BRICK_SEL);
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.width > 8 && r.height > 8) bricks.push({ el: els[i], alive: true });
    }
    total = bricks.length;
  }
  function smashBrick(b) {
    b.alive = false;
    smashed++;
    shatter(b.el);
    b.el.classList.add('is-smashed');
    if (countEl) countEl.textContent = smashed + ' / ' + total;
  }
  // burst the block into small hard pixel shards (in its own colour)
  function shatter(el) {
    var r = el.getBoundingClientRect();
    var color = getComputedStyle(el).backgroundColor;
    if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
      color = getComputedStyle(el).color || '#b89968';
    }
    var n = Math.min(16, Math.max(7, Math.round(r.width * r.height / 2600)));
    for (var i = 0; i < n; i++) {
      var s = document.createElement('div');
      s.className = 'brick-shard';
      var sz = 6 + Math.random() * 8;
      var ang = Math.random() * Math.PI * 2;
      var dist = 40 + Math.random() * 130;
      s.style.left = (r.left + window.scrollX + Math.random() * r.width) + 'px';
      s.style.top = (r.top + window.scrollY + Math.random() * r.height) + 'px';
      s.style.width = sz + 'px';
      s.style.height = sz + 'px';
      s.style.background = color;
      s.style.setProperty('--dx', (Math.cos(ang) * dist) + 'px');
      s.style.setProperty('--dy', (Math.sin(ang) * dist + 70 + Math.random() * 130) + 'px'); // gravity bias
      s.style.setProperty('--r', (Math.random() * 600 - 300) + 'deg');
      document.body.appendChild(s);
      shards.push(s);
      (function (node) {
        setTimeout(function () {
          var k = shards.indexOf(node); if (k >= 0) shards.splice(k, 1);
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 760);
      })(s);
    }
  }
  function restoreBricks() {
    for (var i = 0; i < bricks.length; i++) bricks[i].el.classList.remove('is-smashed');
    bricks = [];
    for (var j = 0; j < shards.length; j++) if (shards[j].parentNode) shards[j].parentNode.removeChild(shards[j]);
    shards = [];
  }

  // ---- ball ----------------------------------------------------------------
  function place() { if (ball) ball.style.transform = 'translate(' + (cx - R) + 'px,' + (cy - R) + 'px)'; }
  function launch() {
    cx = window.innerWidth * 0.5;
    cy = window.innerHeight * 0.42;
    var ang = (0.18 + Math.random() * 0.14) * Math.PI;     // head downward at an angle
    var s = speed();
    vx = Math.cos(ang) * s * (Math.random() < 0.5 ? -1 : 1);
    vy = Math.sin(ang) * s;
    place();
  }
  function reflectOffRect(r) {
    var nx = Math.max(r.left, Math.min(cx, r.right));
    var ny = Math.max(r.top, Math.min(cy, r.bottom));
    var inside = cx > r.left && cx < r.right && cy > r.top && cy < r.bottom;
    if (inside) {
      var toL = cx - r.left, toR = r.right - cx, toT = cy - r.top, toB = r.bottom - cy;
      var m = Math.min(toL, toR, toT, toB);
      if (m === toL) { cx = r.left - R; vx = -Math.abs(vx); }
      else if (m === toR) { cx = r.right + R; vx = Math.abs(vx); }
      else if (m === toT) { cy = r.top - R; vy = -Math.abs(vy); }
      else { cy = r.bottom + R; vy = Math.abs(vy); }
    } else {
      var dx = cx - nx, dy = cy - ny;
      var d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      var ux = dx / d, uy = dy / d;
      cx = nx + ux * R; cy = ny + uy * R;
      var vn = vx * ux + vy * uy;
      vx -= 2 * vn * ux; vy -= 2 * vn * uy;                // perfect reflection
    }
  }
  function step() {
    if (!active || !ball) { raf = 0; return; }
    if (!dragging) {
      cx += vx; cy += vy;
      var W = window.innerWidth, H = window.innerHeight;
      if (cx < R) { cx = R; vx = Math.abs(vx); } else if (cx > W - R) { cx = W - R; vx = -Math.abs(vx); }
      if (cy < R) { cy = R; vy = Math.abs(vy); } else if (cy > H - R) { cy = H - R; vy = -Math.abs(vy); }
      for (var i = 0; i < bricks.length; i++) {
        var b = bricks[i];
        if (!b.alive) continue;
        var r = b.el.getBoundingClientRect();
        if (cx + R > r.left && cx - R < r.right && cy + R > r.top && cy - R < r.bottom) {
          reflectOffRect(r);
          smashBrick(b);
          break; // one hit per frame keeps the bounce clean
        }
      }
      var sp = Math.sqrt(vx * vx + vy * vy) || 0.0001, t = speed(); // keep speed constant
      vx = vx / sp * t; vy = vy / sp * t;
      place();
    }
    raf = requestAnimationFrame(step);
  }

  // ---- fling to redirect ---------------------------------------------------
  function onDown(e) {
    dragging = true; dragId = e.pointerId;
    try { ball.setPointerCapture(e.pointerId); } catch (_) {}
    lastPX = e.clientX; lastPY = e.clientY; dragVX = 0; dragVY = 0; moved = 0;
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging || e.pointerId !== dragId) return;
    moved += Math.abs(e.clientX - lastPX) + Math.abs(e.clientY - lastPY);
    dragVX = dragVX * 0.4 + (e.clientX - lastPX) * 0.6;
    dragVY = dragVY * 0.4 + (e.clientY - lastPY) * 0.6;
    lastPX = e.clientX; lastPY = e.clientY;
    cx = e.clientX; cy = e.clientY;
    place();
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    var s = speed();
    if (moved < 8) {
      // quick tap = bop it back UP (redirect on the way down)
      vy = -Math.abs(vy || s);
      vx += (Math.random() * 2 - 1) * s * 0.6;
      var mt = Math.sqrt(vx * vx + vy * vy) || 1; vx = vx / mt * s; vy = vy / mt * s;
    } else {
      // a drag = fling: aim by drag direction at constant speed
      var m = Math.sqrt(dragVX * dragVX + dragVY * dragVY);
      if (m > 1) { vx = dragVX / m * s; vy = dragVY / m * s; }
    }
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
  }

  // ---- HUD -----------------------------------------------------------------
  function ensureHud() {
    hud = document.createElement('div');
    hud.className = 'breakout-hud';
    var label = document.createElement('span'); label.className = 'bh-label'; label.textContent = 'SMASH';
    countEl = document.createElement('span'); countEl.className = 'bh-count'; countEl.textContent = '0 / ' + total;
    var tip = document.createElement('span'); tip.className = 'bh-tip'; tip.textContent = 'fling · scroll to roam';
    var exit = document.createElement('button');
    exit.type = 'button'; exit.className = 'bh-exit'; exit.setAttribute('aria-label', 'Exit smash mode');
    exit.innerHTML = '&times;';
    exit.addEventListener('click', exitGame);
    hud.appendChild(label); hud.appendChild(countEl); hud.appendChild(tip); hud.appendChild(exit);
    document.body.appendChild(hud);
  }

  // ---- enter / exit --------------------------------------------------------
  function enterGame() {
    if (active) return;
    active = true; smashed = 0;
    document.body.setAttribute('data-breakout', 'on');
    // Scroll stays UNLOCKED: one finger off the ball (or the wheel) roams the
    // sections; the ball is isolated (touch-action:none + pointer capture) so
    // flinging never scrolls. Lets you smash your way through the whole page.
    gatherBricks();
    ensureHud();
    if (countEl) countEl.textContent = '0 / ' + total;
    ball = document.createElement('div');
    ball.className = 'breakout-ball';
    ball.setAttribute('aria-hidden', 'true');
    ball.addEventListener('pointerdown', onDown);
    document.body.appendChild(ball);
    launch();
    window.addEventListener('keydown', onKey);
    if (!raf) raf = requestAnimationFrame(step);
  }
  function exitGame() {
    if (!active) return;
    active = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    document.body.removeAttribute('data-breakout');
    restoreBricks();
    if (ball) { ball.removeEventListener('pointerdown', onDown); ball.remove(); ball = null; }
    if (hud) { hud.remove(); hud = null; countEl = null; }
    window.removeEventListener('keydown', onKey);
    dragging = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
  }
  function onKey(e) { if (e.key === 'Escape') exitGame(); }

  // ---- wire to companion mode ----------------------------------------------
  function sync() {
    var on = document.body && document.body.getAttribute('data-pixel') === 'on';
    if (on) ensureLaunch();
    if (!on && active) exitGame(); // turning the companion off leaves the game
  }
  function init() {
    if (!document.body) return;
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['data-pixel'] });
    sync();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (active && !raf) { raf = requestAnimationFrame(step); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
