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

   Wave 2 (I) additions, same file: STAT TICKER — three honest chips
   (#proveTicker in index.html) flip between their data-b/data-a values at
   the same pct<50 "handcrafted side is winning" threshold the pane already
   uses.

   REDESIGN (2026-07-20, owner-ratified): the liquid feTurbulence seam from
   the two waves after this one — an SVG displacement ribbon whose energy
   followed drag velocity plus an always-on idle rAF loop driving it — is
   gone. Direction: "the divider was doing too much; restraint on the
   mechanism, drama in the revealed content." Replaced with:
   · a plain straight bar (prove-it.css), idle-pulsing via a CSS @keyframes
     animation (no JS driving it frame-by-frame) — paused here only via a
     class toggle at drag start/end, not a rAF loop.
   · a "reveal ramp" — 0..1, computed inline inside the EXISTING setCut()
     call (which pointer/keyboard already invoke on every move; no new
     per-frame loop, no new allocations) — written to a CSS custom property
     that prove-it.css uses to ease in a brightness/saturation lift + a
     sheen sweep on the handbuilt pane as it crosses ~60% revealed.
   · release-settle: past ~85% revealed, easing the rest of the way to full
     reveal on release (a short, one-off CSS transition class, removed right
     after) instead of leaving it wherever the pointer let go.
   The WebGL hero engine itself is NOT touched by any of this — the site's
   own public API surface (createEngineCore/setPostMode/setActive/resize,
   createHeroDirector/currentTone — see fx/engine-hero.js) has no exposed
   continuous time-scale/intensity dial, and this section has stayed
   deliberately clear of the vendored engine since the createBeforeAfter
   evaluation above (the "text-mush lesson") — reaching into the engine's
   internals for an undocumented lever would be exactly the kind of fragile
   coupling that lesson was about. The "comes alive" drama lives entirely in
   this pane's own CSS instead.
*/

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function init() {
  const root = document.getElementById('proveSlider');
  if (!root) return;
  const pane = root.querySelector('.prove-pane-handbuilt');
  const handle = root.querySelector('.prove-handle');
  const ticker = document.getElementById('proveTicker');
  const tickerVals = ticker ? [].slice.call(ticker.querySelectorAll('.stat-v')) : [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEP = 4;

  // Reveal ramp: 0 until the handbuilt pane's visible share crosses ~60%,
  // then eases linearly to 1 at full reveal (pct 0). Written as a CSS custom
  // property so prove-it.css's filter/sheen do the actual animating — this
  // function only ever computes one number, no allocation.
  function revealRamp(pct) {
    const revealFraction = (100 - pct) / 100;
    return clamp((revealFraction - 0.6) / 0.4, 0, 1);
  }

  function setCut(pct) {
    pct = clamp(pct, 0, 100);
    pane.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
    handle.style.left = pct + '%';
    pane.style.setProperty('--reveal-ramp', revealRamp(pct).toFixed(3));
    root.setAttribute('aria-valuenow', String(Math.round(pct)));

    // The handcrafted pane's visible share grows as pct shrinks (see the
    // clip-path math above) — flip the ticker at the same midline the pane
    // already treats as "handcrafted is winning".
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

  // Release-settle: only when released past ~85% revealed (pct < 15) —
  // ease the rest of the way to full reveal (pct 0). Below that threshold,
  // stays exactly where dropped (today's existing behavior, untouched).
  // Reduced-motion: same end state, no eased transition — snaps straight to
  // 0 so the result is identical, just without the glide.
  function settleIfPastThreshold() {
    const current = parseFloat(root.getAttribute('aria-valuenow') || '50');
    if (current >= 15) return;
    if (reduce) { setCut(0); return; }
    root.classList.add('is-settling');
    setCut(0);
    setTimeout(function () { root.classList.remove('is-settling'); }, 420);
  }

  let dragging = false;
  root.addEventListener('pointerdown', function (e) {
    dragging = true;
    root.classList.add('is-dragging');
    try { root.setPointerCapture(e.pointerId); } catch (_) { /* unsupported pointer type — fine */ }
    setCut(xToPct(e.clientX));
  });
  root.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    setCut(xToPct(e.clientX));
  });
  ['pointerup', 'pointercancel'].forEach(function (t) {
    root.addEventListener(t, function (e) {
      if (dragging) setCut(xToPct(e.clientX));
      dragging = false;
      root.classList.remove('is-dragging');
      settleIfPastThreshold();
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
  //
  // is-sweeping mirrors is-dragging for the idle-pulse pause (prove-it.css)
  // — a moving bar shouldn't also be visibly breathing during the demo.
  if (!reduce && 'IntersectionObserver' in window) {
    let onScreen = false, userInteracted = false, attractRuns = 0;
    let idleTimer = null, sweepRaf = null;

    function stopAttract() {
      userInteracted = true;
      clearTimeout(idleTimer); idleTimer = null;
      if (sweepRaf) { cancelAnimationFrame(sweepRaf); sweepRaf = null; root.classList.remove('is-sweeping'); }
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
      root.classList.add('is-sweeping');
      const OUT_MS = 900, PAUSE_MS = 650, BACK_MS = 900;
      const t0 = performance.now();
      function frame(now) {
        if (userInteracted || !onScreen) { sweepRaf = null; root.classList.remove('is-sweeping'); return; } // interrupted — leave as-is
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
          root.classList.remove('is-sweeping');
          if (attractRuns < 2) scheduleIdleWatch();
          return;
        }
        setCut(pct);
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
          if (sweepRaf) { cancelAnimationFrame(sweepRaf); sweepRaf = null; root.classList.remove('is-sweeping'); setCut(50); }
        }
      });
    }, { threshold: 0.4 }).observe(root);
  }
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
