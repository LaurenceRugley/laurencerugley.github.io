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

   Polish wave (2026-07-18) additions, same file:
   · LIQUID SEAM, FOR REAL — the settle-timer approach above read as too
     subtle live. Replaced with one continuous per-frame energy model (see
     the single rAF loop near the bottom of init()): a decaying "velocity
     energy" value that pointer/keyboard moves bump up and that drains a
     little every frame, added on top of an always-on idle "breathing"
     floor so the seam is never perfectly still even at rest. The same
     energy value drives the glow's opacity. Design reference: the engine's
     shader melt (image-transition.frag in the lab — its uMeltAmp band/drag/
     wet-edge-glow model) and the savycolours createBeforeAfter usage,
     mined for visual language only — nothing here touches the vendored
     engine or the panels' text, per the standing text-mush lesson.
   · AUTO-PREVIEW ("attract loop") — after ~4s idle and in-viewport, a
     gentle scripted sweep to 70% and back, so a visitor who hasn't found
     the drag affordance yet sees it demonstrated. Cancels permanently on
     the first real interaction, runs at most twice, never under reduced-
     motion, never while off-screen (see the block after the keydown
     handler for the exact rules).
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

  // Liquid seam: a single decaying "velocity energy" value (0..1-ish, no
  // ceiling enforced here — the per-frame loop below clamps what it does
  // with it) that pointer/keyboard moves bump up; the loop drains it a
  // little every frame and adds it on top of an always-on idle floor, so
  // the seam is never perfectly flat even when nobody's touching it.
  // Skipped entirely under reduced-motion — velEnergy is written but
  // nothing ever reads it, since the loop that would is never started.
  let lastX = null, velEnergy = 0;
  function pumpSeam(clientX) {
    if (reduce || !disp) return;
    if (lastX !== null) {
      velEnergy = Math.max(velEnergy, Math.min(1, Math.abs(clientX - lastX) / 34));
    }
    lastX = clientX;
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
      lastX = null; // next drag starts fresh, no stale-position velocity spike
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
    velEnergy = Math.max(velEnergy, 0.4); // a gentle pulse so keyboard moves ripple too
  });

  // Liquid seam energy loop: one continuous rAF, only while the slider is
  // actually on-screen, only when motion is allowed. Every frame: drain
  // velEnergy a little, add it on top of a slow idle "breathing" floor
  // (never zero — this is the fix for "too subtle to read as liquid at
  // rest"), push the result into the displacement scale + the turbulence
  // frequency + the glow's opacity. Reduced-motion: this whole block never
  // runs, so disp/turb/glow stay at their static HTML defaults (scale 4,
  // no glow) — a fixed, non-animating seam.
  if (!reduce && disp && 'IntersectionObserver' in window) {
    const glow = seam && seam.querySelector('.prove-seam-glow');
    let raf = null, t = 0;
    function tick() {
      t += 0.008;
      velEnergy *= 0.90; // decays every frame — no settle-timer needed
      const idle = 5 + Math.sin(t) * 3;         // 2–8: always some motion
      const scale = idle + velEnergy * 90;      // drag/keyboard adds up to +90
      disp.setAttribute('scale', scale.toFixed(1));
      if (turb) turb.setAttribute('baseFrequency', (0.012 + Math.sin(t * 0.7) * 0.006).toFixed(4) + ' 0.045');
      if (glow) glow.style.setProperty('--seam-glow-a', Math.min(0.7, 0.1 + velEnergy * 0.75).toFixed(2));
      raf = requestAnimationFrame(tick);
    }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && raf === null) tick();
        else if (!en.isIntersecting && raf !== null) { cancelAnimationFrame(raf); raf = null; }
      });
    }, { threshold: 0 }).observe(root);
  }

  // Auto-preview ("attract loop"): after ~4s idle + in-viewport, a gentle
  // scripted sweep toward the handbuilt side and back so a visitor who
  // hasn't found the drag affordance yet sees it demonstrated — including
  // the ticker flip, which the brief explicitly promises. That means the
  // sweep must land on pct < 50: setCut's own flip condition ("after = pct
  // < 50", above) is what "handcrafted is winning" means in THIS
  // component's clip-path math (lower pct clips away less of the
  // handbuilt pane). Sweeping to 70 (tried first) never crosses that
  // threshold — the ticker stayed on its template values the whole time,
  // caught by watching it live, not assumed. 30 is the same 20-point
  // excursion from center, just signed the other way, so it still reads as
  // "~70%" of a sweep — just toward the reveal, not away from it. Rules
  // (all owner-specified):
  // cancels INSTANTLY and PERMANENTLY (per page view) on the first real
  // pointer/touch/keyboard interaction; runs at most twice; never under
  // reduced-motion; never while off-screen. By construction this can only
  // ever start from pct 50 — any real interaction sets userInteracted and
  // that's permanent, so the slider's position is still untouched whenever
  // an attract run is still eligible to fire.
  if (!reduce && 'IntersectionObserver' in window) {
    let onScreen = false, userInteracted = false, attractRuns = 0;
    let idleTimer = null, sweepRaf = null;

    function stopAttract() {
      userInteracted = true;
      clearTimeout(idleTimer); idleTimer = null;
      if (sweepRaf) { cancelAnimationFrame(sweepRaf); sweepRaf = null; }
    }
    ['pointerdown', 'keydown'].forEach(function (t) { root.addEventListener(t, stopAttract); });

    function easeInOutQuad(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

    function scheduleIdleWatch() {
      if (userInteracted || attractRuns >= 2) return;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        if (!userInteracted && onScreen && !dragging && attractRuns < 2) runSweep();
      }, 4000);
    }

    function runSweep() {
      attractRuns++;
      const OUT_MS = 900, PAUSE_MS = 650, BACK_MS = 900;
      const r = root.getBoundingClientRect();
      const t0 = performance.now();
      function frame(now) {
        if (userInteracted || !onScreen) { sweepRaf = null; return; } // interrupted — leave as-is
        const el = now - t0;
        let pct;
        if (el < OUT_MS) {
          pct = 50 - 20 * easeInOutQuad(el / OUT_MS);
        } else if (el < OUT_MS + PAUSE_MS) {
          pct = 30;
        } else if (el < OUT_MS + PAUSE_MS + BACK_MS) {
          pct = 30 + 20 * easeInOutQuad((el - OUT_MS - PAUSE_MS) / BACK_MS);
        } else {
          setCut(50);
          sweepRaf = null;
          if (attractRuns < 2) scheduleIdleWatch();
          return;
        }
        setCut(pct);
        pumpSeam(r.left + (pct / 100) * r.width); // ripples the seam gently along the sweep
        sweepRaf = requestAnimationFrame(frame);
      }
      sweepRaf = requestAnimationFrame(frame);
    }

    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        onScreen = en.isIntersecting;
        if (onScreen) {
          scheduleIdleWatch();
        } else {
          // never while off-screen: abort any in-flight sweep and snap back
          clearTimeout(idleTimer); idleTimer = null;
          if (sweepRaf) { cancelAnimationFrame(sweepRaf); sweepRaf = null; setCut(50); }
        }
      });
    }, { threshold: 0.4 }).observe(root);
  }
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
