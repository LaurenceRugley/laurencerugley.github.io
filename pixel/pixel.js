// pixel/pixel.js — pixel companion engine.

(function () {
  const STORAGE_KEY = 'lgr-pixel-mode';
  const FRAME_W = 16;
  const FRAME_H = 24;
  const SCALE = 3;
  const MARGIN = 24;
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Persistence ----------
  function readMode() {
    try { return localStorage.getItem(STORAGE_KEY) === 'on'; } catch (e) { return false; }
  }
  function writeMode(on) {
    try {
      if (on) localStorage.setItem(STORAGE_KEY, 'on');
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  // ---------- Canvas atlas ----------
  // Builds a single offscreen canvas with all frames laid out horizontally.
  // Returns { dataUrl, frameMap } where frameMap: stateFrameKey -> xOffset (in screen px after scale).
  function buildAtlas() {
    const { PALETTE, FRAMES } = window.PixelFrames;
    const frameKeys = Object.keys(FRAMES);
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_W * SCALE * frameKeys.length;
    canvas.height = FRAME_H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const frameMap = {};
    frameKeys.forEach((key, idx) => {
      const rows = FRAMES[key];
      const baseX = idx * FRAME_W * SCALE;
      frameMap[key] = baseX;
      for (let y = 0; y < FRAME_H; y++) {
        const row = rows[y] || '';
        for (let x = 0; x < FRAME_W; x++) {
          const ch = row[x] || '.';
          const color = PALETTE[ch];
          if (!color) continue;
          ctx.fillStyle = color;
          ctx.fillRect(baseX + x * SCALE, y * SCALE, SCALE, SCALE);
        }
      }
    });

    return { dataUrl: canvas.toDataURL('image/png'), frameMap, atlasWidth: canvas.width };
  }

  // ---------- Sprite container ----------
  let spriteEl = null;
  let atlas = null;

  function ensureSprite() {
    if (spriteEl) return spriteEl;
    if (!window.PixelFrames) return null;
    atlas = buildAtlas();
    spriteEl = document.createElement('div');
    spriteEl.className = 'pixel-sprite';
    spriteEl.setAttribute('aria-hidden', 'true');
    spriteEl.style.width = (FRAME_W * SCALE) + 'px';
    spriteEl.style.height = (FRAME_H * SCALE) + 'px';
    spriteEl.style.backgroundImage = `url(${atlas.dataUrl})`;
    spriteEl.style.backgroundRepeat = 'no-repeat';
    setFrame('idle-0');
    const shadowEl = document.createElement('div');
    shadowEl.className = 'pixel-shadow';
    shadowEl.setAttribute('aria-hidden', 'true');
    spriteEl.appendChild(shadowEl);
    document.body.appendChild(spriteEl);
    spriteEl.addEventListener('click', triggerCatch);

    if (prefersReducedMotion) {
      spriteEl.style.transform = `translateX(${MARGIN}px)`;
      return spriteEl;
    }

    currentState = 'idle';
    currentFrameIndex = 0;
    idleSince = performance.now();
    lastScrollAt = performance.now();
    startLoop();
    lastScrollY = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updatePosition);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.querySelectorAll('.work-item').forEach(el => {
      el.addEventListener('mouseenter', onWorkEnter);
      el.addEventListener('mouseleave', onWorkLeave);
    });
    updatePosition();
    return spriteEl;
  }

  function setFrame(key) {
    if (!spriteEl || !atlas) return;
    const x = atlas.frameMap[key];
    if (x === undefined) return;
    spriteEl.style.backgroundPosition = `-${x}px 0px`;
  }

  function removeSprite() {
    if (!spriteEl) return;
    stopLoop();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', updatePosition);
    window.removeEventListener('mousemove', onMouseMove);
    document.querySelectorAll('.work-item').forEach(el => {
      el.removeEventListener('mouseenter', onWorkEnter);
      el.removeEventListener('mouseleave', onWorkLeave);
    });
    spriteEl.removeEventListener('click', triggerCatch);
    if (spriteEl.parentNode) spriteEl.parentNode.removeChild(spriteEl);
    spriteEl = null;
    atlas = null;
    overlayEl = null;
    zEl = null;
    queuedNextState = null;
    if (catchTimeout !== null) { clearTimeout(catchTimeout); catchTimeout = null; }
    preHoverState = null;
    lastDashAt = 0;
    cursorX = -9999;
    cursorY = -9999;
  }

  // ---------- Mode application ----------
  function applyMode(on) {
    if (on) {
      document.body.setAttribute('data-pixel', 'on');
      ensureSprite();
    } else {
      document.body.removeAttribute('data-pixel');
      removeSprite();
    }
    document.documentElement.removeAttribute('data-pixel-pending');
    const btn = document.querySelector('.pixel-toggle');
    if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  // ---------- Horizontal position ----------
  let spriteX = 0;

  function computeMaxX() {
    return Math.max(0, window.innerWidth - FRAME_W * SCALE - MARGIN * 2);
  }

  function updatePosition() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
    spriteX = MARGIN + pct * computeMaxX();
    applyTransform();
  }

  function applyTransform() {
    if (!spriteEl) return;
    const facing = STATES[currentState].facing;
    spriteEl.dataset.facing = facing;
    const scaleX = facing === 'left' ? -1 : 1;
    // When mirroring, we also need to flip the x-anchor so it doesn't visually jump.
    const tx = facing === 'left' ? spriteX + FRAME_W * SCALE : spriteX;
    spriteEl.style.transform = `translateX(${tx}px) scaleX(${scaleX})`;
  }

  // ---------- State machine ----------
  // States that loop (animated): walk-right, walk-left, idle.
  // Each state has a list of frame keys + per-frame ms.
  const STATES = {
    'idle': {
      frames: ['idle-0', 'idle-1'],
      durations: [600, 600],
      facing: 'right'
    },
    'walk-right': {
      frames: ['walk-right-0', 'walk-right-1', 'walk-right-2', 'walk-right-3'],
      durations: [120, 120, 120, 120],
      facing: 'right'
    },
    'walk-left': {
      // Reuses walk-right frames, mirrored via CSS scaleX(-1) on the container.
      frames: ['walk-right-0', 'walk-right-1', 'walk-right-2', 'walk-right-3'],
      durations: [120, 120, 120, 120],
      facing: 'left'
    },
    'yawn': {
      frames: ['yawn-0', 'yawn-1', 'yawn-2'],
      durations: [200, 800, 200],
      facing: 'right',
      oneShot: true
    },
    'look': {
      frames: ['look-0', 'look-1', 'look-2', 'look-1'],
      durations: [400, 400, 400, 400],
      facing: 'right',
      oneShot: true
    },
    'sit': {
      frames: ['sit-0', 'sit-1'],
      durations: [1200, 1200],
      facing: 'right',
      oneShot: false, // sit loops gently
      maxDurationMs: 2400
    },
    'box-hide': {
      frames: ['box-hide-0', 'box-hide-1', 'box-hide-1', 'box-hide-2', 'box-hide-1', 'box-hide-3', 'box-hide-1', 'box-hide-1'],
      durations: [300, 700, 700, 400, 700, 350, 400, 450],
      facing: 'right',
      oneShot: true
    },
    'dash-right': {
      frames: ['dash-sprint-0', 'dash-sprint-1'],
      durations: [60, 60],
      facing: 'right',
      oneShot: false,
      maxDurationMs: 400
    },
    'dash-left': {
      // Reuses dash-sprint frames, mirrored via CSS scaleX(-1) on the container.
      frames: ['dash-sprint-0', 'dash-sprint-1'],
      durations: [60, 60],
      facing: 'left',
      oneShot: false,
      maxDurationMs: 400
    },
    'dash-recover': {
      frames: ['dash-alert'],
      durations: [400],
      facing: 'right',
      oneShot: true
    },
    'point-up': {
      frames: ['point-up-0', 'point-up-1'],
      durations: [500, 500],
      facing: 'right',
      oneShot: false
    },
    'caught': {
      frames: ['caught'],
      durations: [500],
      facing: 'right',
      oneShot: true
    },
    'box-flip': {
      frames: ['box-flip'],
      durations: [250],
      facing: 'right',
      oneShot: true
    },
    'happy-wave': {
      frames: ['happy-wave', 'caught'],
      durations: [300, 300],
      facing: 'right',
      oneShot: true,
      maxDurationMs: 800
    },
    'jump': {
      frames: ['jump-0', 'jump-1', 'jump-2'],
      durations: [200, 400, 200],
      facing: 'right',
      oneShot: true
    }
  };

  let currentState = 'idle';
  let currentFrameIndex = 0;
  let lastFrameSwitchAt = 0;
  let stateStartedAt = 0;
  let preHoverState = null;
  let queuedNextState = null;
  let zEl = null;
  function queueNextState(name) { queuedNextState = name; }

  function setState(name) {
    if (!STATES[name]) return;
    if (currentState === name) return;
    const prevState = currentState;
    currentState = name;
    currentFrameIndex = 0;
    lastFrameSwitchAt = performance.now();
    stateStartedAt = lastFrameSwitchAt;
    applyTransform();
    setFrame(STATES[name].frames[0]);
    if (prevState === 'sit' && zEl) { zEl.remove(); zEl = null; }
    if (name === 'sit' && spriteEl && !zEl && !prefersReducedMotion) {
      zEl = document.createElement('div');
      zEl.className = 'pixel-z';
      zEl.setAttribute('aria-hidden', 'true');
      zEl.textContent = 'z';
      spriteEl.appendChild(zEl);
    }
  }

  function tickAnimation(now) {
    if (!spriteEl) return;
    const state = STATES[currentState];
    const dur = state.durations[currentFrameIndex];
    if (now - lastFrameSwitchAt >= dur) {
      const isLast = currentFrameIndex === state.frames.length - 1;
      if (isLast && state.oneShot) {
        const next = queuedNextState || 'idle';
        queuedNextState = null;
        setState(next);
        return;
      }
      if (state.maxDurationMs && now - stateStartedAt >= state.maxDurationMs) {
        const next = queuedNextState || 'idle';
        queuedNextState = null;
        setState(next);
        return;
      }
      currentFrameIndex = (currentFrameIndex + 1) % state.frames.length;
      setFrame(state.frames[currentFrameIndex]);
      lastFrameSwitchAt = now;
    }
  }

  // ---------- Cursor proximity + dash ----------
  let cursorX = -9999;
  let cursorY = -9999;
  let mouseMovePending = false;
  let lastDashAt = 0;
  let dashStartedAt = 0;
  let dashFromX = 0;
  let dashTargetX = 0;
  let dashTargetFacing = 'right';

  function onMouseMove(e) {
    cursorX = e.clientX;
    cursorY = e.clientY;
    if (mouseMovePending) return;
    mouseMovePending = true;
    requestAnimationFrame(handleMouseMove);
  }

  function handleMouseMove() {
    mouseMovePending = false;
    maybeStartDash(performance.now());
  }

  function onWorkEnter() {
    if (currentState === 'box-hide') return;
    if (currentState === 'dash-right' || currentState === 'dash-left' || currentState === 'dash-recover') return;
    if (currentState === 'point-up') return;
    preHoverState = currentState;
    setState('point-up');
  }

  function onWorkLeave() {
    if (currentState !== 'point-up') return;
    setState(preHoverState || 'idle');
    preHoverState = null;
  }

  let catchTimeout = null;
  function triggerCatch() {
    if (prefersReducedMotion) return;
    if (currentState !== 'box-hide') return;
    setState('box-flip');
    queueNextState('caught');
    if (catchTimeout !== null) clearTimeout(catchTimeout);
    catchTimeout = setTimeout(() => {
      catchTimeout = null;
      if (currentState === 'caught') {
        setState('happy-wave');
        spawnHearts();
      }
    }, 500);
  }

  function spawnHearts() {
    if (!spriteEl) return;
    for (let i = 0; i < 3; i++) {
      const heart = document.createElement('span');
      heart.className = 'pixel-heart';
      heart.textContent = '♥';
      heart.style.setProperty('--dx', (Math.random() * 30 - 15) + 'px');
      heart.style.setProperty('--delay', (i * 120) + 'ms');
      spriteEl.appendChild(heart);
      setTimeout(() => heart.remove(), 1200);
    }
  }

  function spriteCenter() {
    const rect = spriteEl ? spriteEl.getBoundingClientRect() : null;
    if (!rect) return null;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function maybeStartDash(now) {
    if (!spriteEl) return;
    if (currentState === 'box-hide' || currentState === 'box-flip' ||
        currentState === 'caught' || currentState === 'happy-wave') return;
    if (currentState === 'dash-right' || currentState === 'dash-left' || currentState === 'dash-recover') return;
    if (now - lastDashAt < DASH_COOLDOWN_MS) return;
    const c = spriteCenter();
    if (!c) return;
    const dx = cursorX - c.x;
    const dy = cursorY - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > DASH_PROXIMITY_PX) return;

    // Dash away from cursor.
    const dir = dx >= 0 ? -1 : 1; // cursor right of sprite -> dash left
    dashFromX = spriteX;
    dashTargetX = Math.max(MARGIN, Math.min(MARGIN + computeMaxX(), spriteX + dir * DASH_DISTANCE_PX));
    // If would clip against viewport edge, dash the other way instead.
    if (dashTargetX === spriteX) {
      dashTargetX = spriteX - dir * DASH_DISTANCE_PX;
      dashTargetX = Math.max(MARGIN, Math.min(MARGIN + computeMaxX(), dashTargetX));
    }
    dashTargetFacing = (dashTargetX >= dashFromX) ? 'right' : 'left';
    dashStartedAt = now;
    lastDashAt = now;
    setState(dashTargetFacing === 'right' ? 'dash-right' : 'dash-left');
    showOverlay('overlay-bang', 250);
    spawnDust(dashFromX, -dir);
  }

  function spawnDust(fromX, driftDir) {
    if (prefersReducedMotion) return;
    const dust = document.createElement('div');
    dust.className = 'pixel-dust';
    dust.setAttribute('aria-hidden', 'true');
    dust.style.left = (fromX + (FRAME_W * SCALE) / 2 - 12) + 'px';
    dust.style.setProperty('--dir', String(driftDir));
    document.body.appendChild(dust);
    setTimeout(() => dust.remove(), 600);
  }

  function tickDashPosition(now) {
    if (currentState !== 'dash-right' && currentState !== 'dash-left') return;
    const t = Math.min(1, (now - dashStartedAt) / DASH_DURATION_MS);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    spriteX = dashFromX + (dashTargetX - dashFromX) * eased;
    applyTransform();
    if (t >= 1) setState('dash-recover');
  }

  // ---------- Overlay element (! badge) ----------
  let overlayEl = null;
  let overlayHideAt = 0;

  function ensureOverlay() {
    if (overlayEl || !spriteEl) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.className = 'pixel-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');
    overlayEl.style.width = (FRAME_W * SCALE) + 'px';
    overlayEl.style.height = (FRAME_H * SCALE) + 'px';
    overlayEl.style.backgroundImage = spriteEl.style.backgroundImage;
    overlayEl.style.backgroundRepeat = 'no-repeat';
    overlayEl.style.display = 'none';
    spriteEl.appendChild(overlayEl);
    return overlayEl;
  }

  function showOverlay(frameKey, durationMs) {
    ensureOverlay();
    if (!overlayEl || !atlas) return;
    const x = atlas.frameMap[frameKey];
    if (x === undefined) return;
    overlayEl.style.backgroundPosition = `-${x}px 0px`;
    overlayEl.style.display = 'block';
    overlayHideAt = performance.now() + durationMs;
  }

  function tickOverlay(now) {
    if (overlayEl && overlayHideAt > 0 && now >= overlayHideAt) {
      overlayEl.style.display = 'none';
      overlayHideAt = 0;
    }
  }

  let rafHandle = null;
  function startLoop() {
    if (rafHandle !== null) return;
    function frame(now) {
      tickAnimation(now);
      tickIdleTimeout(now);
      tickIdleQuirk(now);
      tickDashPosition(now);
      tickOverlay(now);
      rafHandle = requestAnimationFrame(frame);
    }
    rafHandle = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (rafHandle !== null) cancelAnimationFrame(rafHandle);
    rafHandle = null;
  }

  // Expose for console debugging during development.
  window.PixelEngine = {
    setState,
    getState: () => currentState,
    celebrate: () => {
      if (prefersReducedMotion) return;
      if (spriteEl) setState('jump');
    }
  };

  // ---------- Scroll-driven state ----------
  let lastScrollY = 0;
  let lastScrollAt = 0;
  let scrollPending = false;
  const IDLE_AFTER_MS = 200;
  const IDLE_QUIRK_AFTER_MS = 10000;
  const QUIRK_POOL = ['yawn', 'look', 'sit', 'box-hide', 'box-hide'];
  const DASH_PROXIMITY_PX = 60;
  const DASH_DISTANCE_PX = 140;
  const DASH_DURATION_MS = 400;
  const DASH_COOLDOWN_MS = 1000;

  function onScroll() {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(handleScroll);
  }

  function handleScroll() {
    scrollPending = false;
    const y = window.scrollY;
    const delta = y - lastScrollY;
    lastScrollY = y;
    lastScrollAt = performance.now();
    updatePosition();
    if (delta > 0) setState('walk-right');
    else if (delta < 0) setState('walk-left');
  }

  function tickIdleTimeout(now) {
    if (currentState !== 'walk-right' && currentState !== 'walk-left') return;
    if (now - lastScrollAt >= IDLE_AFTER_MS) setState('idle');
  }

  let idleSince = 0;
  function tickIdleQuirk(now) {
    if (currentState !== 'idle') {
      idleSince = now;
      return;
    }
    if (now - idleSince >= IDLE_QUIRK_AFTER_MS) {
      const pick = QUIRK_POOL[Math.floor(Math.random() * QUIRK_POOL.length)];
      setState(pick);
      idleSince = now; // reset; will resume tracking once back in idle
    }
  }

  // ---------- Init ----------
  function init() {
    applyMode(readMode());
    const btn = document.querySelector('.pixel-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = document.body.getAttribute('data-pixel') !== 'on';
      writeMode(next);
      applyMode(next);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
