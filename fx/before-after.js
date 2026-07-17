/* before-after.js — lazy-mount every createBeforeAfter drag-to-reveal demo on the
   page (queried generically by [data-before][data-after], not a single hardcoded
   id — reused for the prove-it slider (2026-07-17); a prospect drags a real
   before/after instead of reading about "engine-driven before/afters").

   Lazy per mount: only imports the vendor lib (already fetched + cached by the
   hero at the same ?v=) once EACH mount nears the viewport — a below-the-fold
   demo must not compete with the hero's own boot on page load.

   Fallback, a11y (role="slider", keyboard, WCAG-correct reduced-motion), sRGB
   colour, and off-screen pause are all owned by createBeforeAfter itself
   (engine-core) — this file only wires each mount and reveals its canvas once
   ready.
*/

function boot(mount) {
  import('../vendor/lgr-engine-hero.es.js?v=3')
    .then(function (lib) {
      return lib.createBeforeAfter(mount, {
        before: mount.dataset.before,
        after: mount.dataset.after,
        progress: mount.dataset.progress ? parseFloat(mount.dataset.progress) : 0.35,
        label: mount.getAttribute('aria-label') || 'Before and after — drag to reveal',
        alt: mount.dataset.alt || 'Before and after',
      });
    })
    .then(function () {
      requestAnimationFrame(function () { mount.classList.add('is-loaded'); });
    })
    .catch(function (err) {
      console.warn('[before-after] mount failed — the poster photo stays.', err);
    });
}

function initOne(mount) {
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

function init() {
  const mounts = document.querySelectorAll('[data-before][data-after]');
  mounts.forEach(initOne);
}

if (document.readyState === 'complete') { init(); }
else { window.addEventListener('load', init); }
