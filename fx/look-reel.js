/* look-reel.js — lazy-mount the "recent work" moment (hero-adjacent, 2026-07-17):
   real site screenshots melting into each other via
   createLookReel(transition:'crossfade') — the calm, no-streak option for this
   light, editorial page (see the lab's Lesson Z).

   Lazy: only imports the vendor lib once the mount nears the viewport. Always
   via VENDOR_ENGINE_URL (fx/vendor-engine-url.js) — NEVER a hardcoded
   "../vendor/lgr-engine-hero.es.js?v=N" here. This file used to hardcode its
   own ?v=3 on the (stated, but unenforced) assumption that it'd always match
   engine-hero.js's own hardcoded version; it silently drifted to ?v=3 while
   engine-hero.js moved to ?v=4 during the hero-carousel re-vendor, so the
   browser fetched and ran the whole ~241KB-gz engine TWICE on every load —
   found live via Lighthouse (elevated mobile TTI/main-thread time) and
   confirmed with a direct network-request capture, not assumed from the
   code. Importing the shared constant instead of hardcoding it here is what
   actually prevents the drift, not just fixing today's number. Off-screen
   pause, reduced-motion (static first image, no auto-advance), and the
   never-blank <img> fallback are all createLookReel's own job (engine-core)
   — this file only wires the mount and reveals the canvas once it is ready.
*/
import { VENDOR_ENGINE_URL } from './vendor-engine-url.js';

function boot(mount) {
  // Collect data-img1, data-img2, ... in order — however many are present.
  // Not hardcoded to a fixed count, so removing/adding a slide is a markup-
  // only edit; this file doesn't need to change again for that.
  const images = [];
  for (let i = 1; mount.dataset['img' + i]; i++) images.push(mount.dataset['img' + i]);

  import(VENDOR_ENGINE_URL)
    .then(function (lib) {
      return lib.createLookReel(mount, {
        images: images,
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
