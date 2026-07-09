/* engine-hero.js — lazy-mount the 4-scene WebGL hero carousel after LCP.
   ------------------------------------------------------------------------
   The hero is a carousel of bespoke shader scenes (Dusk Silk · Constellation ·
   Aurora · Product Moment) driven by the engine's createHeroDirector, running on
   the slim-core one-file lib (lgr-engine-core.es.js, ~300 KB gz — no city).

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
  import('../vendor/lgr-engine-core.es.js')
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
    })
    .catch(function (err) {
      console.warn('[engine-hero] boot failed — gradient poster stays.', err);
    });
}

window.addEventListener('load', function () {
  const mount = document.getElementById('hero-3d-mount');
  if (!mount) return;

  // Lazy: only boot when the hero scrolls into view (it's above the fold, so this
  // fires right after load) — keeps the import off the critical path.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { io.disconnect(); boot(mount); return; }
      }
    }, { rootMargin: '200px' });
    io.observe(mount);
  } else {
    boot(mount);
  }
});
