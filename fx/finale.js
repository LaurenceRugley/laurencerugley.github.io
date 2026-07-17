/* finale.js — the living marquee + magnetic finale button (2026-07-17,
   v2 "money" piece F).
   ------------------------------------------------------------------------
   MARQUEE CONFIG — edit this list, one line per item. That's the whole
   edit surface for "what's currently true" (availability, latest launch,
   etc). No other file needs to change; the track re-renders from this on
   every load. Plain text only — no logos.
*/
const MARQUEE_ITEMS = [
  'Now booking August 2026 · two project slots',
  'Just launched: Also Known As — LA streetwear',
  'Salon sites with booking built in',
  'Hand-built in Pasadena · no templates · no monthly fees',
  'Shopify Partner',
];

function initMarquee() {
  const track = document.querySelector('.marquee-track');
  if (!track) return;
  // Two identical copies back-to-back + a CSS animation that slides exactly
  // -50% (one copy's width, whatever that turns out to be) is what makes the
  // loop seamless — the standard marquee technique, no width math needed.
  // Trailing separator too, so the seam between the two copies reads the
  // same as every other gap.
  const sep = '   ·   ';
  const text = MARQUEE_ITEMS.join(sep) + sep;
  const html = '<span class="marquee-item">' + text + '</span>';
  track.innerHTML = html + html;
}

/* Magnetic finale button — the mockup's own hardened pointer handler
   (guarded capture logic doesn't apply here; there's no drag state, just a
   position readout), reused as-is for the lean math. Two guards it didn't
   need: prefers-reduced-motion (the lean is unsolicited motion) and
   pointerType (touch/pen fire pointermove too, and would fight scrolling
   or jump around on touch). */
function initMagnetic() {
  const btn = document.querySelector('.mag');
  if (!btn) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  btn.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    const r = btn.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) / r.width;
    const dy = (e.clientY - r.top - r.height / 2) / r.height;
    btn.style.transform = 'translate(' + (dx * 10).toFixed(2) + 'px, ' + (dy * 8).toFixed(2) + 'px)';
  });
  btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
}

function init() {
  initMarquee();
  initMagnetic();
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
