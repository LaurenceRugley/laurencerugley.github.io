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
    const cigarEl = document.createElement('div');
    cigarEl.className = 'pixel-cigar';
    cigarEl.setAttribute('aria-hidden', 'true');
    cigarEl.innerHTML = '<span class="pixel-cigar-tip"></span>';
    spriteEl.appendChild(cigarEl);
    document.body.appendChild(spriteEl);
    spriteEl.addEventListener('click', triggerCatch);

    if (prefersReducedMotion) {
      spriteEl.style.transform = `translateX(${MARGIN}px)`;
      return spriteEl;
    }

    currentState = 'idle';
    currentFrameIndex = 0;
    const startNow = performance.now();
    idleSince = startNow;
    nextQuirkAfterMs = QUIRK_MIN_MS + Math.random() * (QUIRK_MAX_MS - QUIRK_MIN_MS);
    lastScrollAt = startNow;
    lastInteractionAt = startNow; // mechanic 3: wander clock starts now
    // Reset dash/tired/wander tracking on each (re)mount.
    recentDashCount = 0;
    dashWindowStart = startNow;
    tiredUntil = 0;
    isWandering = false;
    wanderNextActionAt = startNow + WANDER_AFTER_MS;
    konamiBuffer = [];
    wordBuffer = '';
    formGreeted = false;
    // Schedule first ambient effects.
    nextCigarAt = startNow + 2000 + Math.random() * 2000;
    nextCodecAt = startNow + 10000 + Math.random() * 20000;
    startLoop();
    lastScrollY = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updatePosition);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('keydown', onKonamiKey);
    document.querySelectorAll('.work-item').forEach(el => {
      el.addEventListener('mouseenter', onWorkEnter);
      el.addEventListener('mouseleave', onWorkLeave);
    });
    setupFormObserver();
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
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('keydown', onKonamiKey);
    document.querySelectorAll('.work-item').forEach(el => {
      el.removeEventListener('mouseenter', onWorkEnter);
      el.removeEventListener('mouseleave', onWorkLeave);
      el.classList.remove('pixel-spotlight');
    });
    spriteEl.removeEventListener('click', triggerCatch);
    if (formObserver) { formObserver.disconnect(); formObserver = null; }
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
    nextCigarAt = 0;
    nextCodecAt = 0;
    recentDashCount = 0;
    tiredUntil = 0;
    isWandering = false;
    dashHitEdge = false;
    konamiBuffer = [];
    wordBuffer = '';
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
    // Sync every pixel toggle (footer + nav) so all entry points stay in sync.
    document.querySelectorAll('.pixel-toggle').forEach((b) => b.setAttribute('aria-pressed', on ? 'true' : 'false'));
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
    let facing = STATES[currentState].facing;
    // Phase 2 (alive): when calmly idle, turn to WATCH the cursor — curious.
    // (He still flees via maybeStartDash if it gets close — curious but shy.)
    if (currentState === 'idle' && cursorX > -9000) {
      const center = spriteX + (FRAME_W * SCALE) / 2;
      facing = cursorX < center ? 'left' : 'right';
    }
    spriteEl.dataset.facing = facing;
    const scaleX = facing === 'left' ? -1 : 1;
    // When mirroring, we also need to flip the x-anchor so it doesn't visually jump.
    const tx = facing === 'left' ? spriteX + FRAME_W * SCALE : spriteX;
    let rotateDeg = 0;
    if (currentState === 'roll-right' || currentState === 'roll-left') {
      const t = Math.min(1, (performance.now() - dashStartedAt) / DASH_DURATION_MS);
      rotateDeg = (currentState === 'roll-left' ? -1 : 1) * t * 540; // 1.5 tumbles
    }
    spriteEl.style.transform = `translateX(${tx}px) scaleX(${scaleX}) rotate(${rotateDeg}deg)`;
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
      durations: [400, 1600, 400],
      facing: 'right',
      oneShot: true
    },
    'look': {
      frames: ['look-0', 'look-1', 'look-2', 'look-1'],
      durations: [800, 800, 800, 800],
      facing: 'right',
      oneShot: true
    },
    'sit': {
      frames: ['sit-0', 'sit-1'],
      durations: [2400, 2400],
      facing: 'right',
      oneShot: false, // sit loops gently
      maxDurationMs: 4800
    },
    'box-hide': {
      frames: ['box-hide-0', 'box-hide-1', 'box-hide-1', 'box-hide-2', 'box-hide-1', 'box-hide-3', 'box-hide-1', 'box-hide-1'],
      durations: [600, 1400, 1400, 800, 1400, 700, 800, 900],
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
    'roll-right': {
      frames: ['roll-ball', 'roll-ball-squashed'],
      durations: [120, 80],
      facing: 'right',
      oneShot: false,
      maxDurationMs: 500
    },
    'roll-left': {
      frames: ['roll-ball', 'roll-ball-squashed'],
      durations: [120, 80],
      facing: 'left',
      oneShot: false,
      maxDurationMs: 500
    },
    'smoke': {
      // Reuses idle frames — cigar + smoke puffs are layered on top via CSS
      // (data-state="smoke" reveals the .pixel-cigar element and gates
      // tickCigarPuff). Lasts ~4s before returning to idle.
      frames: ['idle-0', 'idle-1'],
      durations: [600, 600],
      facing: 'right',
      oneShot: false,
      maxDurationMs: 4000
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
    },
    'tired': {
      // Slow breathing — reuses idle frames at half speed. Catchable here.
      frames: ['idle-0', 'idle-1'],
      durations: [1100, 1100],
      facing: 'right'
    },
    'sleep': {
      // Tab is hidden — reuses sit frames very slow, Z-trail layered on top.
      frames: ['sit-0', 'sit-1'],
      durations: [2000, 2000],
      facing: 'right'
    },
    'dash-bonk': {
      // Brief wall-impact squash when a dash hits the viewport edge.
      frames: ['roll-ball-squashed'],
      durations: [160],
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

  // --- Mechanic 1: tired state after repeated dashes ---
  let recentDashCount = 0;
  let dashWindowStart = 0;
  let tiredUntil = 0;
  const DASH_TIRE_THRESHOLD = 3;     // dashes within the window to get tired
  const DASH_TIRE_WINDOW_MS = 10000; // rolling window for counting dashes
  const TIRED_DURATION_MS = 5000;    // how long the catchable tired state lasts
  // --- Mechanic 3: autonomous wander after long idle ---
  let lastInteractionAt = 0;
  let isWandering = false;
  let wanderTargetX = 0;
  let wanderNextActionAt = 0;
  const WANDER_AFTER_MS = 90000;     // user-idle time before he wanders on his own
  const WANDER_SPEED_PXMS = 0.018;   // autonomous walk speed
  // --- Mechanic 4: edge bonk ---
  let dashHitEdge = false;

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
    if (spriteEl) spriteEl.dataset.state = name;
    // First puff fires near-immediately when entering the smoke quirk.
    if (name === 'smoke') nextCigarAt = performance.now();
    // Z-trail shows during 'sit' (quirk) and 'sleep' (tab hidden).
    const zPrev = prevState === 'sit' || prevState === 'sleep';
    const zNext = name === 'sit' || name === 'sleep';
    if (zPrev && zEl) {
      zEl.forEach(z => z.remove());
      zEl = null;
    }
    if (zNext && spriteEl && !zEl && !prefersReducedMotion) {
      zEl = [];
      const sizes = [28, 22, 18];
      for (let i = 0; i < sizes.length; i++) {
        const z = document.createElement('div');
        z.className = 'pixel-z';
        z.setAttribute('aria-hidden', 'true');
        z.textContent = 'z';
        z.style.fontSize = sizes[i] + 'px';
        z.style.animationDelay = (i * 800) + 'ms';
        spriteEl.appendChild(z);
        zEl.push(z);
      }
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
    lastInteractionAt = performance.now(); // mechanic 3: cursor movement cancels wander
    if (mouseMovePending) return;
    mouseMovePending = true;
    requestAnimationFrame(handleMouseMove);
  }

  function handleMouseMove() {
    mouseMovePending = false;
    maybeStartDash(performance.now());
    if (currentState === 'idle') applyTransform(); // Phase 2: track the cursor while idle
  }

  function onWorkEnter(e) {
    if (currentState === 'box-hide') return;
    if (currentState === 'dash-right' || currentState === 'dash-left' || currentState === 'dash-recover') return;
    if (currentState === 'roll-right' || currentState === 'roll-left') return;
    if (currentState === 'point-up') return;
    preHoverState = currentState;
    if (e && e.currentTarget) e.currentTarget.classList.add('pixel-spotlight');
    setState('point-up');
  }

  function onWorkLeave(e) {
    if (e && e.currentTarget) e.currentTarget.classList.remove('pixel-spotlight');
    if (currentState !== 'point-up') return;
    setState(preHoverState || 'idle');
    preHoverState = null;
  }

  let catchTimeout = null;
  function triggerCatch() {
    if (prefersReducedMotion) return;
    // Catchable two ways: hiding under the box, or worn-out after too many dashes.
    if (currentState === 'box-hide') {
      setState('box-flip');
      queueNextState('caught');
    } else if (currentState === 'tired') {
      // No box to flip — caught directly because he's too tired to flee.
      tiredUntil = 0;
      recentDashCount = 0;
      setState('caught');
    } else {
      return;
    }
    if (catchTimeout !== null) clearTimeout(catchTimeout);
    catchTimeout = setTimeout(() => {
      catchTimeout = null;
      if (currentState === 'caught') {
        setState('happy-wave');
        // Easter egg: persistent catch counter — every 5th catch is a big burst.
        let catches = 0;
        try {
          catches = (parseInt(localStorage.getItem('lgr-pixel-catches') || '0', 10) || 0) + 1;
          localStorage.setItem('lgr-pixel-catches', String(catches));
        } catch (e) {}
        if (catches > 0 && catches % 5 === 0) spawnHeartBurst();
        else spawnHearts();
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
    if (currentState === 'dash-right' || currentState === 'dash-left' ||
        currentState === 'dash-recover' || currentState === 'dash-bonk') return;
    if (currentState === 'roll-right' || currentState === 'roll-left') return;
    if (currentState === 'tired' || currentState === 'sleep') return;
    if (now < tiredUntil) return; // too tired to dash
    if (now - lastDashAt < DASH_COOLDOWN_MS) return;
    const c = spriteCenter();
    if (!c) return;
    const dx = cursorX - c.x;
    const dy = cursorY - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > DASH_PROXIMITY_PX) return;

    // Dash away from cursor.
    const dir = dx >= 0 ? -1 : 1; // cursor right of sprite -> dash left
    const maxX = MARGIN + computeMaxX();
    dashFromX = spriteX;
    dashTargetX = Math.max(MARGIN, Math.min(maxX, spriteX + dir * DASH_DISTANCE_PX));
    // If would clip against viewport edge, dash the other way instead.
    if (dashTargetX === spriteX) {
      dashTargetX = spriteX - dir * DASH_DISTANCE_PX;
      dashTargetX = Math.max(MARGIN, Math.min(maxX, dashTargetX));
    }
    // Mechanic 4: did this dash land hard against an edge?
    dashHitEdge = dashTargetX <= MARGIN + 1 || dashTargetX >= maxX - 1;
    dashTargetFacing = (dashTargetX >= dashFromX) ? 'right' : 'left';
    dashStartedAt = now;
    lastDashAt = now;

    // Mechanic 1: count dashes in a rolling window; get tired after the threshold.
    if (now - dashWindowStart > DASH_TIRE_WINDOW_MS) {
      dashWindowStart = now;
      recentDashCount = 0;
    }
    recentDashCount++;
    if (recentDashCount >= DASH_TIRE_THRESHOLD) {
      tiredUntil = now + TIRED_DURATION_MS;
    }

    // ~35% chance to roll instead of sprint — unless reduced motion (no spin).
    const useRoll = !prefersReducedMotion && Math.random() < 0.35;
    if (useRoll) {
      setState(dashTargetFacing === 'right' ? 'roll-right' : 'roll-left');
    } else {
      setState(dashTargetFacing === 'right' ? 'dash-right' : 'dash-left');
    }
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
    const isDashing = currentState === 'dash-right' || currentState === 'dash-left' ||
                      currentState === 'roll-right' || currentState === 'roll-left';
    if (!isDashing) return;
    const t = Math.min(1, (now - dashStartedAt) / DASH_DURATION_MS);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    spriteX = dashFromX + (dashTargetX - dashFromX) * eased;
    applyTransform();
    if (t >= 1) {
      // Mechanic 4: a dash that ended hard against an edge gets a squash bonk.
      setState(dashHitEdge ? 'dash-bonk' : 'dash-recover');
      dashHitEdge = false;
    }
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

  // ---------- Ambient flavour: cigar smoke + codec blink ----------
  let nextCigarAt = 0;
  let nextCodecAt = 0;

  function tickCigarPuff(now) {
    if (prefersReducedMotion) return;
    // Smoke only fires during the smoke quirk now (cigar appears, puffs
    // emit, then he goes back to idle).
    if (currentState !== 'smoke') return;
    if (now < nextCigarAt) return;
    nextCigarAt = now + 1300 + Math.random() * 900;
    spawnCigarPuff();
  }

  function spawnCigarPuff() {
    if (!spriteEl) return;
    // Three staggered puffs per spawn, like the Z trail — reads as a rolling
    // column of smoke instead of one isolated wisp.
    const sizes = [20, 16, 12];
    for (let i = 0; i < sizes.length; i++) {
      const puff = document.createElement('div');
      puff.className = 'pixel-cigar-puff';
      puff.setAttribute('aria-hidden', 'true');
      puff.style.width = sizes[i] + 'px';
      puff.style.height = (sizes[i] * 0.7) + 'px';
      puff.style.setProperty('--drift', (Math.random() * 14 - 7) + 'px');
      puff.style.animationDelay = (i * 250) + 'ms';
      spriteEl.appendChild(puff);
      setTimeout(() => puff.remove(), 2000 + i * 250);
    }
  }

  function tickCodec(now) {
    if (prefersReducedMotion) return;
    if (currentState !== 'idle') return;
    if (now < nextCodecAt) return;
    nextCodecAt = now + 30000 + Math.random() * 30000; // 30-60s
    spawnCodec();
  }

  function spawnCodec() {
    if (!spriteEl) return;
    const dot = document.createElement('div');
    dot.className = 'pixel-codec-dot';
    dot.setAttribute('aria-hidden', 'true');
    spriteEl.appendChild(dot);
    setTimeout(() => dot.remove(), 1500);
  }

  // ---------- Mechanic 1: tired state ----------
  function tickTired(now) {
    if (currentState === 'idle' && now < tiredUntil) {
      setState('tired');
    } else if (currentState === 'tired' && now >= tiredUntil) {
      recentDashCount = 0;
      setState('idle');
    }
  }

  // ---------- Mechanic 3: autonomous wander after long idle ----------
  let lastWanderMoveAt = 0;
  function tickWander(now) {
    // Any recent interaction cancels wandering and hands control back to scroll.
    if (now - lastInteractionAt < WANDER_AFTER_MS) {
      if (isWandering) {
        isWandering = false;
        if (currentState === 'walk-right' || currentState === 'walk-left') setState('idle');
      }
      return;
    }
    // Don't interrupt reactions/quirks — only wander out of plain idle/walk.
    const canWander = currentState === 'idle' || currentState === 'walk-right' || currentState === 'walk-left';
    if (!canWander) { isWandering = false; return; }

    if (!isWandering) {
      // Begin a wander leg: pick a fresh target and start walking toward it.
      if (currentState !== 'idle') return;
      if (now < wanderNextActionAt) return;
      const maxX = MARGIN + computeMaxX();
      wanderTargetX = MARGIN + Math.random() * Math.max(1, maxX - MARGIN);
      isWandering = true;
      lastWanderMoveAt = now;
      setState(wanderTargetX >= spriteX ? 'walk-right' : 'walk-left');
      return;
    }

    // Advancing toward the wander target.
    const dt = Math.min(64, now - lastWanderMoveAt);
    lastWanderMoveAt = now;
    const dir = wanderTargetX >= spriteX ? 1 : -1;
    spriteX += dir * WANDER_SPEED_PXMS * dt;
    if ((dir === 1 && spriteX >= wanderTargetX) || (dir === -1 && spriteX <= wanderTargetX)) {
      spriteX = wanderTargetX;
      isWandering = false;
      wanderNextActionAt = now + 1500 + Math.random() * 3000; // pause before next leg
      setState('idle');
    }
    applyTransform();
  }

  // ---------- Mechanic 2: sleep when the tab is hidden ----------
  function onVisibilityChange() {
    if (!spriteEl) return;
    if (document.hidden) {
      setState('sleep');
    } else if (currentState === 'sleep') {
      setState('yawn'); // wake with a yawn — oneShot, returns to idle
    }
  }

  // ---------- Easter egg: point at the contact form when it scrolls in ----------
  let formObserver = null;
  let formGreeted = false;
  function setupFormObserver() {
    if (formObserver || !('IntersectionObserver' in window)) return;
    const form = document.querySelector('.form-section') || document.getElementById('start');
    if (!form) return;
    formObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || formGreeted || !spriteEl || prefersReducedMotion) return;
        // Only react from a calm state; don't interrupt a dash/quirk/catch.
        if (currentState !== 'idle' && currentState !== 'walk-right' && currentState !== 'walk-left') return;
        formGreeted = true; // once per visit
        preHoverState = 'idle';
        setState('point-up');
        setTimeout(function () {
          if (currentState === 'point-up') setState('idle');
        }, 2200);
      });
    }, { threshold: 0.55 });
    formObserver.observe(form);
  }

  // ---------- Mechanic 5 + word easter eggs: keyboard ----------
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown',
                  'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let konamiBuffer = [];
  let wordBuffer = '';
  function onKonamiKey(e) {
    if (!spriteEl) return;
    // Konami sequence -> celebration.
    konamiBuffer.push((e.key || '').toLowerCase());
    if (konamiBuffer.length > KONAMI.length) konamiBuffer.shift();
    if (konamiBuffer.length === KONAMI.length &&
        konamiBuffer.every(function (k, i) { return k === KONAMI[i]; })) {
      konamiBuffer = [];
      celebrateKonami();
    }
    // Typed-word easter egg: "snake" -> dives under the box (MGS).
    if (e.key && e.key.length === 1) {
      wordBuffer = (wordBuffer + e.key.toLowerCase()).slice(-6);
      if (wordBuffer.indexOf('snake') !== -1) {
        wordBuffer = '';
        if (!prefersReducedMotion && currentState !== 'box-hide') setState('box-hide');
      }
    }
  }
  function spawnHeartBurst() {
    if (!spriteEl) return;
    for (let i = 0; i < 12; i++) {
      const heart = document.createElement('span');
      heart.className = 'pixel-heart';
      heart.textContent = (i % 3 === 0) ? '★' : '♥';
      heart.style.setProperty('--dx', (Math.random() * 84 - 42) + 'px');
      heart.style.setProperty('--delay', (i * 55) + 'ms');
      spriteEl.appendChild(heart);
      setTimeout(function () { heart.remove(); }, 1400);
    }
  }

  // ---------- Konami payoff: confetti shower + rainbow shimmer + triple jump ----------
  const CONFETTI_COLORS = ['#B89968', '#E63946', '#3D6B5C', '#2A4359',
                           '#D9B978', '#F4F1EA', '#7E5AA8', '#E0533B', '#9FC8E8'];
  function spawnConfetti() {
    if (prefersReducedMotion) return;
    const vw = window.innerWidth;
    const fall = (window.innerHeight + 40) + 'px';
    for (let i = 0; i < 24; i++) {
      const c = document.createElement('div');
      c.className = 'pixel-confetti';
      c.style.left = (Math.random() * vw) + 'px';
      c.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      c.style.setProperty('--dx', (Math.random() * 140 - 70) + 'px');
      c.style.setProperty('--spin', (360 + Math.random() * 720) + 'deg');
      c.style.setProperty('--delay', (Math.random() * 500) + 'ms');
      c.style.setProperty('--dur', (2000 + Math.random() * 1400) + 'ms');
      c.style.setProperty('--fall', fall);
      document.body.appendChild(c);
      setTimeout(function () { c.remove(); }, 4200);
    }
  }

  function celebrateKonami() {
    if (prefersReducedMotion || !spriteEl) return;
    spriteEl.classList.add('pixel-celebrating');
    spawnConfetti();
    spawnHeartBurst();
    setState('jump');
    // Two more jumps, staggered so each fires after the previous one returns
    // to idle (~800ms jump), plus a second confetti wave for sustained rain.
    setTimeout(function () { if (spriteEl) setState('jump'); }, 850);
    setTimeout(function () { if (spriteEl) { setState('jump'); spawnConfetti(); } }, 1700);
    setTimeout(function () { if (spriteEl) spriteEl.classList.remove('pixel-celebrating'); }, 5000);
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
      tickCigarPuff(now);
      tickCodec(now);
      tickTired(now);
      tickWander(now);
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
  const QUIRK_MIN_MS = 3000;
  const QUIRK_MAX_MS = 5000;
  let nextQuirkAfterMs = QUIRK_MIN_MS + Math.random() * (QUIRK_MAX_MS - QUIRK_MIN_MS);
  const QUIRK_POOL = ['yawn', 'look', 'sit', 'box-hide', 'box-hide', 'smoke'];
  const DASH_PROXIMITY_PX = 60;
  const DASH_DISTANCE_PX = 140;
  const DASH_DURATION_MS = 400;
  const DASH_COOLDOWN_MS = 1000;
  // Easter egg: fast-scroll "whoa".
  const WHOA_VELOCITY = 2.4;     // px per ms (~2400px/s)
  const WHOA_COOLDOWN_MS = 1500;
  let lastWhoaAt = 0;

  function onScroll() {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(handleScroll);
  }

  function handleScroll() {
    scrollPending = false;
    const now = performance.now();
    const y = window.scrollY;
    const delta = y - lastScrollY;
    const dt = now - lastScrollAt;
    lastScrollY = y;
    lastScrollAt = now;
    lastInteractionAt = now; // mechanic 3: scrolling cancels autonomous wander
    updatePosition();
    // Fast-scroll "whoa": a ! pops above his head when you fling the page.
    if (dt > 0 && Math.abs(delta) / dt > WHOA_VELOCITY && now - lastWhoaAt > WHOA_COOLDOWN_MS) {
      lastWhoaAt = now;
      showOverlay('overlay-bang', 280);
    }
    if (delta > 0) setState('walk-right');
    else if (delta < 0) setState('walk-left');
  }

  function tickIdleTimeout(now) {
    if (isWandering) return; // wander owns the walk state; don't cancel it
    if (currentState !== 'walk-right' && currentState !== 'walk-left') return;
    if (now - lastScrollAt >= IDLE_AFTER_MS) setState('idle');
  }

  let idleSince = 0;
  function tickIdleQuirk(now) {
    if (currentState !== 'idle') {
      idleSince = now;
      return;
    }
    if (now - idleSince >= nextQuirkAfterMs) {
      const pick = QUIRK_POOL[Math.floor(Math.random() * QUIRK_POOL.length)];
      setState(pick);
      idleSince = now;
      // Re-randomize the next idle window so cadence feels organic.
      nextQuirkAfterMs = QUIRK_MIN_MS + Math.random() * (QUIRK_MAX_MS - QUIRK_MIN_MS);
    }
  }

  // ---------- Init ----------
  function init() {
    applyMode(readMode());
    // Wire every pixel toggle (footer + nav) — more ways to find the easter egg.
    document.querySelectorAll('.pixel-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = document.body.getAttribute('data-pixel') !== 'on';
        writeMode(next);
        applyMode(next);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
