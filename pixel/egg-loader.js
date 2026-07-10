/* pixel/egg-loader.js — the ~1KB eager gateway for the pixel-companion easter egg.

   WHY: the full egg (sprite-frames + pixel + ball + breakout + codec + trophy)
   is ~100KB of JS (~27KB gz) that the overwhelming majority of prospects never
   trigger. Loading it eagerly taxes every first visit for a hidden feature. This
   tiny loader owns ONLY the entry triggers and dynamic-injects the chain on first
   activation — so a cold prospect downloads ~1KB, not ~27KB gz, of egg.

   CHAIN ORDER matters: sprite-frames (PixelFrames data) must precede pixel.js
   (buildAtlas reads it); codec + trophy expose window.LGRCodec / window.LGRTrophy
   that pixel.js's celebrateKonami calls. ball/breakout self-wire to the
   body[data-pixel] MutationObserver, so their order is free. We inject
   sequentially (await each) to guarantee the ordering.

   TRIGGERS (matches how the egg is actually reachable in the code):
   - pixel-mode ON at boot  -> load IMMEDIATELY (returning users see the companion
     mount exactly as before — no behaviour change).
   - .pixel-toggle click     -> the sole cold gateway: enable pixel mode + load, so
     pixel.js mounts the companion (same result as the old eager toggle).
   - Konami key sequence     -> a real cold discovery path: enable + load + replay
     the sequence so the full egg (companion + codec + trophy) fires. NOTE: the
     7-tap trigger lives ON the sprite, which only exists once the companion is
     mounted, so it cannot be a pre-load trigger — pixel.js owns it post-mount.

   Once the chain is in, pixel.js owns the toggle / Konami / 7-tap for good; this
   loader removes its own listeners on first activation so nothing double-fires. */
(function () {
  'use strict';
  var STORAGE_KEY = 'lgr-pixel-mode';
  var KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown',
                'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  // Same URLs (incl. ?v=) the eager tags used, so returning visitors reuse cache.
  var CHAIN = [
    'pixel/sprite-frames.js',
    'pixel/pixel.js?v=2',
    'pixel/ball.js?v=2',
    'pixel/breakout.js?v=3',
    'fx/codec-call.js?v=1',
    'fx/konami-trophy.js'
  ];

  function readMode() {
    try { return localStorage.getItem(STORAGE_KEY) === 'on'; } catch (e) { return false; }
  }
  function writeOn() {
    try { localStorage.setItem(STORAGE_KEY, 'on'); } catch (e) {}
  }

  var loading = false, loaded = false;
  function injectNext(i, done) {
    if (i >= CHAIN.length) { loaded = true; done(); return; }
    var s = document.createElement('script');
    s.src = CHAIN[i];
    s.async = false;
    s.onload = function () { injectNext(i + 1, done); };
    s.onerror = function () { injectNext(i + 1, done); }; // degrade, don't wedge
    document.head.appendChild(s);
  }
  function loadChain(done) {
    if (loaded) { done && done(); return; }
    if (loading) return;            // a second trigger mid-load: ignore, first wins
    loading = true;
    injectNext(0, function () { done && done(); });
  }

  // Boot: returning pixel-mode users mount the companion immediately, as before.
  if (readMode()) { loadChain(); return; }

  // Cold visitor: own the two reachable cold triggers until first activation.
  var konami = [];

  function detach() {
    document.removeEventListener('click', onClick, true);
    window.removeEventListener('keydown', onKey, true);
  }

  function onClick(e) {
    var t = e.target && e.target.closest && e.target.closest('.pixel-toggle');
    if (!t) return;
    detach();
    writeOn();                      // pixel.js init() will read this and mount
    loadChain();                    // its own toggle handler takes over hereafter
  }

  function onKey(e) {
    konami.push((e.key || '').toLowerCase());
    if (konami.length > KONAMI.length) konami.shift();
    for (var i = 0; i < KONAMI.length; i++) {
      if (konami[i] !== KONAMI[i]) return;
    }
    if (konami.length < KONAMI.length) return;
    detach();
    writeOn();
    loadChain(function () {
      // Replay the sequence so pixel.js's now-attached handler fires the full egg.
      // (pixel.js lowercases e.key, so exact casing is not load-bearing.)
      var keys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
      keys.forEach(function (k) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
      });
    });
  }

  document.addEventListener('click', onClick, true);
  window.addEventListener('keydown', onKey, true);
})();
