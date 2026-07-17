/* before-after.js — lazy-mount the ONE createBeforeAfter drag-to-reveal demo, in the
   Savannah case (Work section): a prospect drags a real colour transformation instead
   of reading about "engine-driven before/afters".

   Lazy: only imports the vendor lib (already fetched + cached by the hero at the same
   ?v=) once the mount nears the viewport — a below-the-fold demo must not compete with
   the hero's own boot on page load.

   Fallback, a11y (role="slider", keyboard, WCAG-correct reduced-motion), sRGB colour,
   and off-screen pause are all owned by createBeforeAfter itself (engine-core) — this
   file only wires the mount and reveals the canvas once it is ready.
*/

function boot(mount) {
  import('../vendor/lgr-engine-hero.es.js?v=3')
    .then(function (lib) {
      return lib.createBeforeAfter(mount, {
        before: mount.dataset.before,
        after: mount.dataset.after,
        progress: 0.35,
        label: mount.getAttribute('aria-label') || 'Before and after — drag to reveal',
        alt: 'A colour transformation by Savannah',
      });
    })
    .then(function () {
      requestAnimationFrame(function () { mount.classList.add('is-loaded'); });
    })
    .catch(function (err) {
      console.warn('[before-after] mount failed — the poster photo stays.', err);
    });
}

function init() {
  const mount = document.getElementById('savannah-reveal');
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
