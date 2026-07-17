/* engine-hero.js — lazy-mount the 4-scene WebGL hero carousel after LCP.
   ------------------------------------------------------------------------
   The hero is a carousel of bespoke shader scenes (Dusk Silk · Constellation ·
   Aurora · Product Moment) driven by the engine's createHeroDirector, running on
   the hero-only one-file lib (lgr-engine-hero.es.js, ~216 KB gz — no city, no
   editor/pilot/cockpit/terrain/catalog/audio/tracer; same createEngineCore + the
   4 scene packs + createHeroDirector exports as the slim core, 76 KB lighter).

   Rules:
   - Never blocks LCP: waits for window 'load', then an IntersectionObserver so the
     ~300 KB import only fires when the hero is actually in view. The existing
     hero-gradient (fx/hero-gradient.*) is the instant poster until the canvas fades in.
   - prefers-reduced-motion: still mounts — createHeroDirector shows a STATIC first
     scene with no auto-advance and no RAF (the director handles the policy itself).
   - ONE-THREE rule: everything (incl. THREE) comes from the lib, never a CDN copy.
   - Silent failure: any error leaves the gradient poster in place; console.warn only.
*/

function boot(mount) {
  import('../vendor/lgr-engine-hero.es.js?v=3')
    .then(async function (lib) {
      // createEngineCore may be sync or async — await handles both.
      const core = await lib.createEngineCore({ container: mount });

      // Beauty mode (2): full filmic pipeline — HDR beautyRT, bloom, ACES, dither.
      core.setPostMode(2);

      // The 4 bespoke scenes, in ring order.
      const scenes = [
        lib.createDuskSilk(core),
        lib.createConstellation(core),
        lib.createAurora(core),
        lib.createProductMoment(core),
      ];

      // The director owns the RAF loop, crossfades, dwell timer, visibilitychange
      // pause, and the prefers-reduced-motion static-frame path. We just hand it
      // the scenes — no hand-rolled tick loop.
      const director = lib.createHeroDirector(core, {
        scenes: scenes,
        dwell: 15000,        // ms a scene shows before the calm crossfade
        transitionMs: 1200,  // crossfade duration
      });

      // One resize call cascades to the director's transition RTs + pack cameras.
      window.addEventListener('resize', function () { core.resize(); }, { passive: true });

      // Reveal the canvas once the first frame has a chance to render.
      requestAnimationFrame(function () { mount.classList.add('is-loaded'); });

      // Expose for debugging / a future codec egg; harmless if unused.
      window.__heroDirector = director;

      // PER-SCENE TEXT THEMING: each scene declares its own tone in the N-pack
      // director contract (director.currentTone -> 'dark' | 'bright'), so a re-skin
      // that changes which scenes are dark/bright stays correct with no edit here
      // (this used to hard-code the scene indices). Cream copy over a soft ink scrim
      // on dark scenes; dark copy on bright ones. engine-hero.css does the visual
      // flip with a smooth color transition so it rides the crossfade. Read in the
      // pause poll below — no separate always-on RAF loop.
      var hero = mount.closest('.hero');
      var lastTone = '';

      // OFFSCREEN PAUSE + TONE POLL: stop the hero's RAF work while it's scrolled
      // out of view (e.g. reading the Work section) — the director's tick early-
      // returns on core.paused; keeps us from rendering two WebGL scenes at once —
      // and refresh the text tone from the director. Poll the rect rather than an
      // IntersectionObserver — IO doesn't track Lenis's transform-based scroll
      // reliably here (the same reason the boot needed a fallback).
      (function pausePoll() {
        var r = mount.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        core.setActive(r.top < vh && r.bottom > 0);
        if (hero) {
          var tone = director.currentTone;
          if (tone && tone !== lastTone) { lastTone = tone; hero.setAttribute('data-hero-tone', tone); }
        }
        setTimeout(pausePoll, 400);
      })();
    })
    .catch(function (err) {
      console.warn('[engine-hero] boot failed — gradient poster stays.', err);
    });
}

function init() {
  const mount = document.getElementById('hero-3d-mount');
  if (!mount) return;

  // Boot exactly once, whoever gets there first.
  let booted = false;
  function bootOnce() { if (booted) return; booted = true; boot(mount); }

  // Lazy: prefer booting when the hero is in view (it's above the fold, so this
  // normally fires right after load) — keeps the import off the critical path.
  // FALLBACK TIMER (2026-07-09): IntersectionObserver was observed NEVER FIRING on a
  // real Chrome despite the mount being visible and in-viewport (fresh observer, no
  // callback in 1.5s — cause unclear; Lenis/environment interplay suspected). An optimization
  // must never gate the feature: if IO hasn't fired shortly after init, boot anyway.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { io.disconnect(); bootOnce(); return; }
      }
    }, { rootMargin: '200px' });
    io.observe(mount);
    setTimeout(function () { io.disconnect(); bootOnce(); }, 1200);
  } else {
    bootOnce();
  }
}

// LOAD-RACE FIX (caught on the owner's real Chrome, 2026-07-09): this module can finish
// loading AFTER window 'load' has already fired (fast/cached page + async module graph) —
// a bare 'load' listener then waits forever and the hero never mounts (headless was slower
// and won the race, which is why the probe missed it). If load already happened, boot now.
if (document.readyState === 'complete') { init(); }
else { window.addEventListener('load', init); }
