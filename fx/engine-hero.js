/* engine-hero.js — lazy-mount the 7-scene WebGL hero carousel after LCP.
   ------------------------------------------------------------------------
   The hero is a carousel of bespoke shader scenes driven by the engine's
   createHeroDirector, running on the hero-only one-file lib
   (lgr-engine-hero.es.js, ~241 KB gz — no city, no editor/pilot/cockpit/
   terrain/catalog/audio/tracer; same createEngineCore + the 7 scene packs +
   createHeroDirector exports as the slim core).

   Polish wave (2026-07-18): re-vendored from the lab's certified dist-lib
   build and added the three new scenes — Letterpress (bright), Cathedral
   Light (dark, warm), First Light (dark, the "minute before sunrise" dawn
   tone) — into the ring below, alongside the original four (Dusk Silk ·
   Constellation · Aurora · Product Moment).

   Re-vendored again 2026-07-21 (sha256 758eafe5775da76058eddd4a1702d04c1bb5e27904591fb1f9eea99c3ec18169,
   md5-matched against the lab's current dist-lib — see tools/size-budget.mjs's
   own drift check; the lab rebuilt mid-session, so this was re-copied a
   second time to stay current) for the new createFirstLight starBrightness
   pack option.

   SEQUENCE (tonal alternation — see each scene's own tone: field, sourced
   from the engine's own pack contract, not eyeballed here): only 2 of the
   7 scenes are 'bright' (Letterpress, Product Moment), so a perfect
   alternation isn't possible — spread the two bright beats as evenly as
   the ring allows instead of clumping them, and open on First Light
   (dawn) rather than mid-cycle so the ring reads as one loose day-cycle:
   dawn -> bright morning -> dusk -> night -> a bright product beat ->
   night (aurora) -> a warm dark close, looping back to dawn.

   Rules:
   - Never blocks LCP: waits for window 'load', then an IntersectionObserver so the
     ~300 KB import only fires when the hero is actually in view. The existing
     hero-gradient (fx/hero-gradient.*) is the instant poster until the canvas fades in.
   - prefers-reduced-motion: still mounts — createHeroDirector shows a STATIC first
     scene with no auto-advance and no RAF (the director handles the policy itself).
   - ONE-THREE rule: everything (incl. THREE) comes from the lib, never a CDN copy.
   - Silent failure: any error leaves the gradient poster in place; console.warn only.
   - VENDOR IMPORT: always via VENDOR_ENGINE_URL (fx/vendor-engine-url.js), never a
     hardcoded path+version here — see that file for why (a real double-fetch bug,
     found live via Lighthouse, was exactly this file and fx/look-reel.js drifting
     to two different query strings for the same engine file).
*/
import { VENDOR_ENGINE_URL } from './vendor-engine-url.js';

function boot(mount) {
  import(VENDOR_ENGINE_URL)
    .then(async function (lib) {
      // createEngineCore may be sync or async — await handles both.
      const core = await lib.createEngineCore({ container: mount });

      // Beauty mode (2): full filmic pipeline — HDR beautyRT, bloom, ACES, dither.
      core.setPostMode(2);

      // The 7 bespoke scenes, in ring order — see the header comment above
      // for the tonal-alternation reasoning behind this sequence.
      const scenes = [
        // starBrightness: 1.05 (engine default 0.85) — owner wants the
        // night-sky stars a touch more prominent on our site specifically,
        // "nothing crazy." Re-vendored 2026-07-21 for this pack option.
        lib.createFirstLight(core, { starBrightness: 1.05 }), // dark, dawn
        lib.createLetterpress(core),     // bright
        lib.createDuskSilk(core),        // dark
        lib.createConstellation(core),   // dark
        lib.createProductMoment(core),   // bright
        lib.createAurora(core),          // dark
        lib.createCathedralLight(core),  // dark, warm
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
