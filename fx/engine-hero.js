/* engine-hero.js — lazy-mount the 7-scene WebGL hero carousel after LCP.
   ------------------------------------------------------------------------
   The hero is a carousel of bespoke shader scenes driven by the engine's
   createHeroDirector, from the vendored engine lib (vendor/lgr-engine-
   hero.es.js — the SITE-side filename is now a bit stale: as of the
   2026-07-22 Lenis swap this is the lab's -core build, ~352 KB gz, not the
   old hero-only ~241 KB trim, since motion.js's createSmoothScroll only
   lives in -core — see fx/vendor-engine-url.js for the full re-vendor note).
   Same createEngineCore + the 7 scene packs + createHeroDirector exports
   this file has always used; the extra weight is createSmoothScroll +
   createCameraDirector + createBeautyPresenter, unused by this file but
   sharing the one dynamic-imported module with motion.js and fx/look-reel.js.

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

   Re-vendored 2026-07-22 for createBuildIn export and letterpress shader-press
   (sha256 805c7364261948dd0fc66ab2201046a52228b698be4c7f760c80cd8a7141adc0,
   from lab commit b608159, shipped in a1d8f89 — see fx/vendor-engine-url.js
   for full provenance).

   Cold-load build-in (2026-07-22): on a genuine first visit this session
   (sessionStorage-gated), the hero opens on Letterpress and plays the brand
   ampersand stamping into paper — the "press" choreography — then continues
   the ring's normal rotation. Subsequent page navigations stay on the default
   dawn-first sequence with no animation. This is a one-time visual lead that
   reinforces brand identity on cold load without repeating on repeat visits,
   matching the design brief's "once per visit" intent and the multi-page static
   site's need for visit-scoped (not page-scoped) sessionStorage.

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
     ~352 KB import only fires when the hero is actually in view (motion.js may
     trigger the same shared import earlier for smooth-scroll — the module cache
     means only one of the two ever actually causes the fetch). The existing
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

      // COLD-LOAD GATE: "once per visit" per the design brief — sessionStorage
      // (not localStorage) so it resets per new session/tab but persists across
      // page navigations within one visit, matching this multi-page static site.
      var COLD_LOAD_KEY = 'lgr-hero-build-in';
      var isColdLoad = false;
      try { isColdLoad = !sessionStorage.getItem(COLD_LOAD_KEY); } catch (e) {}
      if (isColdLoad) { try { sessionStorage.setItem(COLD_LOAD_KEY, '1'); } catch (e) {} }

      // The 7 bespoke scenes — see the header comment above for the tonal-
      // alternation reasoning behind the default order.
      var firstLight = lib.createFirstLight(core, { starBrightness: 1.05 }); // dark, dawn
      var letterpress = lib.createLetterpress(core);     // bright
      var duskSilk = lib.createDuskSilk(core);            // dark
      var constellation = lib.createConstellation(core);  // dark
      var productMoment = lib.createProductMoment(core);  // bright
      var aurora = lib.createAurora(core);                // dark
      var cathedralLight = lib.createCathedralLight(core); // dark, warm

      // BUILD-IN (cold load only): letterpress leads so its shader-press —
      // the brand ampersand stamping into paper — is the opening moment,
      // then the ring continues its normal cyclic order from there. Every
      // other load keeps the default dawn-open tonal-alternation order.
      var scenes = isColdLoad
        ? [letterpress, duskSilk, constellation, productMoment, aurora, cathedralLight, firstLight]
        : [firstLight, letterpress, duskSilk, constellation, productMoment, aurora, cathedralLight];

      var buildIn = null;
      if (isColdLoad) {
        buildIn = lib.createBuildIn(letterpress);
        // Chain the build-in's transport onto the pack's own per-frame update
        // (createBuildIn.update(dt) must run AFTER pack.update(), per its own
        // contract) — the director calls pack.update() every frame, so this
        // wrap is the seam without touching createHeroDirector itself.
        var letterpressUpdate = letterpress.update.bind(letterpress);
        letterpress.update = function (dt, elapsed) {
          letterpressUpdate(dt, elapsed);
          buildIn.update(dt);
        };
      }

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

      // Reveal the canvas AND start the press in the same frame so the
      // animated stamp-in and the CSS opacity fade begin together.
      requestAnimationFrame(function () {
        mount.classList.add('is-loaded');
        if (buildIn) buildIn.play('press', { duration: 1700, easing: 'easeInCubic' });
      });

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
      // IntersectionObserver — IO wasn't reliable enough here in practice (the
      // same reason the boot needed a fallback below); polling sidesteps
      // whatever the cause was rather than chasing it further.
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
  // callback in 1.5s — cause unclear; an environment interplay was suspected at the
  // time, unconfirmed, and moot now regardless of cause). An optimization
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
