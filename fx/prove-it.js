/* prove-it.js — the prove-it slider (2026-07-17 v2, DESIGN veto on the first
   cut). SITE-LOCAL clip-path slider — deliberately NOT createBeforeAfter.
   ------------------------------------------------------------------------
   Why not the engine component: the liquid melt shader's boundary is driven
   by a noise field (image-transition.frag) that is NOT gated by the melt or
   width params. Tried melt:0 (kills the sideways drag) + width near-zero
   (minimizes the blend band) — the seam was still visibly jagged/wobbly
   through UI text, and the "after" panel read too dark to be legible. Not a
   config mistake: uMeltAmp, the shader's actual master "how liquid at all"
   switch (0 = flat crossfade, no wobble, no drag — exactly what a UI-vs-UI
   comparison needs), is hardcoded to 1.0 INSIDE createBeforeAfter and never
   exposed as a constructor option. createLookReel has the equivalent escape
   hatch (transition:'crossfade'); createBeforeAfter doesn't. ENGINE GAP,
   reported for the lab: expose melt-mode/edgeSharpness (or just uMeltAmp)
   as a createBeforeAfter option.

   This hand-rolled version reuses the v2 mockup's own hardened pointer
   handler (guarded capture, works for click-only and move-less drags) for
   the drag math, but adds real accessibility the mockup didn't have:
   role="slider", full keyboard support (Arrow keys/Home/End), live
   aria-valuenow. Both panes are real DOM/CSS, not photos — a clip-path
   edge through live text is crisp by construction, no shader involved.
*/

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function init() {
  const root = document.getElementById('proveSlider');
  if (!root) return;
  const pane = root.querySelector('.prove-pane-handbuilt');
  const handle = root.querySelector('.prove-handle');
  const STEP = 4;

  function setCut(pct) {
    pct = clamp(pct, 0, 100);
    pane.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
    handle.style.left = pct + '%';
    root.setAttribute('aria-valuenow', String(Math.round(pct)));
  }
  setCut(parseFloat(root.dataset.progress || '50'));

  function xToPct(clientX) {
    const r = root.getBoundingClientRect();
    return ((clientX - r.left) / Math.max(r.width, 1)) * 100;
  }

  let dragging = false;
  root.addEventListener('pointerdown', function (e) {
    dragging = true;
    try { root.setPointerCapture(e.pointerId); } catch (_) { /* unsupported pointer type — fine */ }
    setCut(xToPct(e.clientX));
  });
  root.addEventListener('pointermove', function (e) {
    if (dragging) setCut(xToPct(e.clientX));
  });
  ['pointerup', 'pointercancel'].forEach(function (t) {
    root.addEventListener(t, function (e) {
      if (dragging) setCut(xToPct(e.clientX));
      dragging = false;
    });
  });

  root.addEventListener('keydown', function (e) {
    const current = parseFloat(root.getAttribute('aria-valuenow') || '50');
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = current + STEP;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = current - STEP;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = 100;
    if (next === null) return;
    e.preventDefault();
    setCut(next);
  });
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
