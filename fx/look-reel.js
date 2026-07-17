/* look-reel.js — lazy-mount the "recent work" moment (hero-adjacent, 2026-07-17):
   three real site screenshots (Also Known As, Savy Colours, Chignon) melting into
   each other via createLookReel(transition:'crossfade') — the calm, no-streak
   option for this light, editorial page (see the lab's Lesson Z).

   Lazy: only imports the vendor lib (already fetched + cached by the hero at the
   same ?v=) once the mount nears the viewport, same convention as engine-hero.js
   and before-after.js. Off-screen pause, reduced-motion (static first image, no
   auto-advance), and the never-blank <img> fallback are all createLookReel's own
   job (engine-core) — this file only wires the mount and reveals the canvas once
   it is ready.
*/

function boot(mount) {
  import('../vendor/lgr-engine-hero.es.js?v=3')
    .then(function (lib) {
      return lib.createLookReel(mount, {
        images: [mount.dataset.img1, mount.dataset.img2, mount.dataset.img3],
        holdMs: 2400,
        meltMs: 1400,
        transition: 'crossfade',
        alt: mount.getAttribute('aria-label') || 'Recent work',
      });
    })
    .then(function () {
      requestAnimationFrame(function () { mount.classList.add('is-loaded'); });
    })
    .catch(function (err) {
      console.warn('[look-reel] mount failed — the poster photo stays.', err);
    });
}

function init() {
  const mount = document.getElementById('lookReel');
  if (!mount) return;

  let booted = false;
  function bootOnce() { if (booted) return; booted = true; boot(mount); }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { io.disconnect(); bootOnce(); return; }
      }
    }, { rootMargin: '400px' });
    io.observe(mount);
  } else {
    bootOnce();
  }
}

if (document.readyState === 'complete') { init(); }
else { window.addEventListener('load', init); }
