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

   Wave 2 (I) additions, same file (both bind to the position this module
   already computes — no new coupling, no vendored-engine involvement):
   · LIQUID SEAM — an SVG feTurbulence ribbon overlaying the flat handle
     line (markup/CSS in index.html / prove-it.css). Ripple energy follows
     drag velocity and settles at rest; a subtle idle shimmer runs only
     while the slider is on-screen. Entirely skipped under reduced-motion —
     the filter's displacement scale simply stays 0, i.e. visually a flat
     line, same as what reduced-motion users already saw before this wave.
   · STAT TICKER — three honest chips (#proveTicker in index.html) flip
     between their data-b/data-a values at the same pct<50 "handcrafted
     side is winning" threshold the seam and pane already use.
*/

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function init() {
  const root = document.getElementById('proveSlider');
  if (!root) return;
  const pane = root.querySelector('.prove-pane-handbuilt');
  const handle = root.querySelector('.prove-handle');
  const seam = root.querySelector('.prove-seam');
  const turb = seam && seam.querySelector('feTurbulence');
  const disp = seam && seam.querySelector('feDisplacementMap');
  const ticker = document.getElementById('proveTicker');
  const tickerVals = ticker ? [].slice.call(ticker.querySelectorAll('.stat-v')) : [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEP = 4;

  function setCut(pct) {
    pct = clamp(pct, 0, 100);
    pane.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
    handle.style.left = pct + '%';
    if (seam) seam.style.left = pct + '%';
    root.setAttribute('aria-valuenow', String(Math.round(pct)));

    // The handcrafted pane's visible share grows as pct shrinks (see the
    // clip-path math above) — flip the ticker at the same midline the pane
    // and seam already treat as "handcrafted is winning".
    if (tickerVals.length) {
      const after = pct < 50;
      tickerVals.forEach(function (el) {
        const want = after ? el.dataset.a : el.dataset.b;
        if (el.textContent !== want) {
          el.textContent = want;
          el.classList.toggle('flip', after);
        }
      });
    }
  }
  setCut(parseFloat(root.dataset.progress || '50'));

  function xToPct(clientX) {
    const r = root.getBoundingClientRect();
    return ((clientX - r.left) / Math.max(r.width, 1)) * 100;
  }

  // Liquid seam: displacement scale rises with drag speed, then settles back
  // to 0 a beat after the pointer stops moving. Skipped entirely under
  // reduced-motion — disp stays undefined-unused and the filter never
  // changes from its resting (flat) state.
  let lastX = null, settleTimer = null;
  function pumpSeam(clientX) {
    if (reduce || !disp) return;
    if (lastX !== null) {
      const v = Math.min(30, Math.abs(clientX - lastX) * 1.6);
      disp.setAttribute('scale', String(6 + v));
    }
    lastX = clientX;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () { disp.setAttribute('scale', '0'); lastX = null; }, 420);
  }

  let dragging = false;
  root.addEventListener('pointerdown', function (e) {
    dragging = true;
    try { root.setPointerCapture(e.pointerId); } catch (_) { /* unsupported pointer type — fine */ }
    setCut(xToPct(e.clientX));
    pumpSeam(e.clientX);
  });
  root.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    setCut(xToPct(e.clientX));
    pumpSeam(e.clientX);
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

  // Ambient shimmer: a faint idle ripple so the seam never reads as static
  // art, only while the slider is actually on-screen. Skipped under
  // reduced-motion (no continuous rAF loop is ever started for those users).
  if (!reduce && turb && 'IntersectionObserver' in window) {
    let raf = null, t = 0;
    function tick() {
      t += 0.008;
      turb.setAttribute('baseFrequency', (0.012 + Math.sin(t) * 0.004).toFixed(4) + ' 0.09');
      raf = requestAnimationFrame(tick);
    }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && raf === null) tick();
        else if (!en.isIntersecting && raf !== null) { cancelAnimationFrame(raf); raf = null; }
      });
    }, { threshold: 0 }).observe(root);
  }
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
