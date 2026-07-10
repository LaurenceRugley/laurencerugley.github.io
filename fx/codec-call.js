/* ----------------------------------------------------------------------------
   fx/codec-call.js — egg v2: the MGS CODEC CALL overlay.

   Chained from the companion's Konami / 7-tap reward (pixel/pixel.js):
   codec call -> dismiss -> the 3D trophy. Lazy, exactly like fx/konami-trophy.js:
   nothing runs until window.LGRCodec.show() is called. Normal visitors pay nothing.

   The LEFT portrait is painted from the companion's OWN sprite data
   (window.PixelFrames.FRAMES['idle-0'] + PALETTE), so the bandana and vest
   colors — which sprite-frames.js randomizes per page load — automatically
   match whatever companion the visitor is actually looking at. Never hardcode
   those two colors here; that's the whole point.

   Dismiss: click / tap / Esc, or auto after ~8s.
   prefers-reduced-motion: nothing renders (double-guarded: the module returns
   early AND the CSS sets display:none; the caller pixel.js:895 also guards).
   ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var active = false;

  var FREQ = '140.85';
  var LINE = '— the atelier is live. nice work getting in.';
  var TYPE_MS = 30;         // per character
  var AUTO_CLOSE_MS = 8000;
  var FACE_TOP = 2;         // idle-0 rows 2..9 = bandana -> shoulders
  var FACE_BOTTOM = 9;

  /* Paint the companion's face onto a canvas at 1 sprite-pixel = 1 canvas-pixel,
     then let CSS scale it up with image-rendering:pixelated. Drawing filled
     rects would be equivalent; a 1:1 buffer keeps the upscale honestly nearest-
     neighbor at any DPR. Returns null if the sprite data isn't there. */
  function paintPortrait() {
    var pf = window.PixelFrames;
    if (!pf || !pf.FRAMES || !pf.PALETTE) return null;
    var frame = pf.FRAMES['idle-0'];
    if (!frame || !frame.length) return null;

    var rows = frame.slice(FACE_TOP, FACE_BOTTOM + 1);

    // Horizontal bounding box of the opaque pixels, so the face is centered
    // even if the sprite art shifts later.
    var minX = Infinity, maxX = -Infinity;
    rows.forEach(function (row) {
      for (var x = 0; x < row.length; x++) {
        if (row[x] !== '.' ) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    });
    if (minX > maxX) return null;

    var w = maxX - minX + 1, h = rows.length;
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.className = 'codec-call-portrait';
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    for (var y = 0; y < h; y++) {
      var row = rows[y];
      for (var x = minX; x <= maxX; x++) {
        var color = pf.PALETTE[row[x]];
        if (!color) continue;                 // '.' -> transparent
        ctx.fillStyle = color;
        ctx.fillRect(x - minX, y, 1, 1);
      }
    }
    return canvas;
  }

  function show(onDismiss) {
    function chain() { if (typeof onDismiss === 'function') onDismiss(); }

    // Reduced motion: render nothing. The chained trophy guards itself, so
    // forwarding the chain is a no-op visually and keeps the seam composable.
    if (prefersReduced) { chain(); return; }

    // Re-trigger while a call is already up: swallow it, chain included. Unlike the
    // reduced-motion branch above we deliberately do NOT forward the chain — the
    // open codec still owns one, and the trophy's own `active` guard would drop a
    // second trophy anyway. Debounce, not a dropped reward.
    if (active) return;
    active = true;

    // Remember what had focus so we can hand it back on teardown (focus must not
    // silently jump to <body> when the modal closes).
    var prevFocus = document.activeElement;

    var overlay = document.createElement('div');
    overlay.className = 'codec-call';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Codec call');

    var panel = document.createElement('div');
    panel.className = 'codec-call-panel';
    panel.tabIndex = -1;   // focusable target for the modal, not a tab stop

    var freq = document.createElement('span');
    freq.className = 'codec-call-freq';
    freq.textContent = FREQ;

    var screens = document.createElement('div');
    screens.className = 'codec-call-screens';

    var left = document.createElement('div');
    left.className = 'codec-call-screen';
    var portrait = paintPortrait();
    if (portrait) left.appendChild(portrait);

    var right = document.createElement('div');
    right.className = 'codec-call-screen';
    var mono = document.createElement('span');
    mono.className = 'codec-call-monogram';
    mono.textContent = 'LGR';
    right.appendChild(mono);

    screens.appendChild(left);
    screens.appendChild(right);

    var line = document.createElement('p');
    line.className = 'codec-call-line';
    // The visible line types character-by-character; hide it from assistive tech so
    // it isn't read out one letter at a time. The full line is announced once via
    // the offscreen live region below.
    line.setAttribute('aria-hidden', 'true');
    var text = document.createElement('span');
    var caret = document.createElement('span');
    caret.className = 'codec-call-caret';
    caret.textContent = '▍';
    line.appendChild(text);
    line.appendChild(caret);

    var hint = document.createElement('span');
    hint.className = 'codec-call-hint';
    hint.textContent = 'click or press esc';

    // Offscreen polite live region: announces the whole line once (not per keystroke).
    var live = document.createElement('div');
    live.setAttribute('aria-live', 'polite');
    live.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;' +
      'padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);' +
      'clip-path:inset(50%);white-space:nowrap;';

    panel.appendChild(freq);
    panel.appendChild(screens);
    panel.appendChild(line);
    panel.appendChild(hint);
    panel.appendChild(live);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Move focus into the dialog, then announce the line once (set after the node is
    // in the a11y tree so the polite region actually fires).
    panel.focus();
    live.textContent = LINE;

    // ---- typing ----
    var i = 0;
    var typeTimer = setInterval(function () {
      text.textContent = LINE.slice(0, ++i);
      if (i >= LINE.length) { clearInterval(typeTimer); typeTimer = null; }
    }, TYPE_MS);

    // ---- dismiss ----
    var closing = false;
    var closeTimer = null;
    var autoClose = setTimeout(beginClose, AUTO_CLOSE_MS);

    function beginClose() {
      if (closing) return;
      closing = true;
      overlay.classList.add('is-closing');
      closeTimer = setTimeout(teardown, 280);   // matches ccOut
    }

    function onKey(e) { if (e.key === 'Escape') beginClose(); }
    overlay.addEventListener('click', beginClose);
    window.addEventListener('keydown', onKey);

    function teardown() {
      if (typeTimer) clearInterval(typeTimer);
      clearTimeout(autoClose);
      clearTimeout(closeTimer);

      // Drop OUR listeners before handing off. The trophy installs its own Esc
      // and click handlers; if ours were still bound, one Esc would close both.
      overlay.removeEventListener('click', beginClose);
      window.removeEventListener('keydown', onKey);

      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);

      // Hand focus back to wherever it was before the modal opened (the chained
      // trophy is a decorative canvas that never takes focus, so this is safe on
      // both the plain-dismiss and chain paths).
      if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (_) {} }

      active = false;
      chain();
    }
  }

  window.LGRCodec = { show: show };
})();
