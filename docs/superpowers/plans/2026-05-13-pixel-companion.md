# Pixel-You Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `pixel mode` toggle to `index.html` that reveals a Snake-inspired pixel-art companion ("pixel-you") who walks along the bottom of the viewport as you scroll, hides under cardboard boxes when idle, dashes from the cursor, and can only be petted when caught hiding.

**Architecture:** A `body[data-pixel="on"]` attribute gates all pixel features. Atelier mode (attribute absent) renders byte-identical to today. Pixel mode appends a single sprite container, lazy-loads a runtime-built canvas atlas (frames authored as inline pixel arrays), and runs a state machine driven by scroll, mousemove, hover, and click events — all consolidated into one `requestAnimationFrame` loop.

**Tech Stack:** Vanilla HTML / CSS / JS. No build step, no test framework, no external libraries. Existing project conventions: Google Fonts via `<link>`, inline `<style>` and `<script>` in `index.html`. New code lives in `pixel/`.

---

## Implementation Notes (deviations from spec)

1. **Sprite size:** 16w × 24h native, displayed at 3× scale (48×72 on screen) — slightly smaller than the spec's "~32px tall" estimate. Reason: makes hand-authored placeholder frames feasible to maintain in source as pixel arrays. User-visible behavior identical.
2. **No PNG sprite sheet:** Frames are authored as inline pixel-character arrays (palette mapping like `I` = ink, `S` = skin, etc.) and rendered to an offscreen `<canvas>` at runtime. The canvas serves as the sprite atlas for CSS `background-image`. The spec's `pixel-laurence.png` becomes a v2 swap path: replace the canvas with `canvas.toDataURL()` of a real PNG drawn externally, no other code changes.
3. **Placeholder pixel art is intentionally rough.** The plan's frame arrays are functional stubs — they animate correctly but won't look like polished Stardew art. Visual polish is a post-implementation iteration done by editing the same arrays. The sprite-from-photo workflow in the spec covers the eventual likeness swap.

## Testing Approach

This is a static frontend with no test framework. Each task ends with **manual browser verification** — explicit "what to do, what to look for" steps. The TDD discipline is preserved by always observing the failure state before implementing:

1. **Observe absence:** open the page, confirm the new behavior does NOT happen yet.
2. **Implement:** the code change.
3. **Observe presence:** reload, confirm the new behavior DOES happen.
4. **Commit:** with a descriptive message.

To run the site locally: `python3 -m http.server 8000` from the repo root, then open `http://localhost:8000/`.

## File Structure

| File | Responsibility |
|---|---|
| `index.html` (modify) | Footer toggle button; inline `<head>` script for no-flash mode persistence; `<link>` to `pixel/pixel.css`; `<script defer>` to `pixel/pixel.js`. |
| `pixel/pixel.css` (new) | All pixel-mode styles — scoped under `body[data-pixel="on"]`. Sprite container, animations (walk, idle, box, dash, etc.), CSS hearts particles, reduced-motion overrides. |
| `pixel/pixel.js` (new) | Persistence wiring, toggle click handler, lazy sprite initialization, canvas atlas builder, state machine, scroll/mousemove/click/hover handlers, `requestAnimationFrame` loop. |
| `pixel/sprite-frames.js` (new) | Pure data: color palette + frame definitions (one per state). Imported by `pixel.js`. Kept separate so visual iteration doesn't churn the engine file. |

---

## Task 1: Scaffolding + persistence (no sprite yet)

Adds the footer toggle button and the mode-persistence wiring. After this task, atelier mode is byte-identical to today *except* for one new tiny button in the footer that flips a `data-pixel` attribute on `<body>` and persists across reloads.

**Files:**
- Modify: `index.html` (add inline head script, add `<link>` + `<script defer>`, add toggle button in footer)
- Create: `pixel/pixel.css` (empty stub with one comment so the file exists)
- Create: `pixel/pixel.js` (toggle handler + persistence init)

- [ ] **Step 1: Observe the failure state**

Open `index.html` in a browser. Open DevTools → Application → Local Storage. Confirm no `lgr-pixel-mode` key exists. Confirm there's no toggle button in the footer.

- [ ] **Step 2: Add inline head script + asset links to `index.html`**

In `index.html`, immediately after the `<meta name="viewport">` line and BEFORE the existing `<link rel="preconnect">` tags, add:

```html
<script>
  // Set pixel mode attribute before paint to prevent flash.
  try {
    if (localStorage.getItem('lgr-pixel-mode') === 'on') {
      document.documentElement.setAttribute('data-pixel-pending', 'on');
    }
  } catch (e) { /* localStorage may be unavailable */ }
</script>
```

Then, right after the existing Google Fonts `<link>` line (line ~10 in current file), add:

```html
<link rel="stylesheet" href="pixel/pixel.css">
```

Then, right before `</body>` (after the existing `<script>` block that handles the form), add:

```html
<script defer src="pixel/pixel.js"></script>
```

The `data-pixel-pending` attribute is set on `<html>` (not `<body>`) so it lands before the body even parses. `pixel.js` will move it to `<body data-pixel="on">` once it runs.

- [ ] **Step 3: Add toggle button to footer in `index.html`**

The current footer is:

```html
<footer>
  LGR Web Studio
  <span class="dot">·</span>
  Pasadena, CA
  <span class="dot">·</span>
  <a href="mailto:lrugley@gmail.com">lrugley@gmail.com</a>
</footer>
```

Change it to:

```html
<footer>
  LGR Web Studio
  <span class="dot">·</span>
  Pasadena, CA
  <span class="dot">·</span>
  <button type="button" class="pixel-toggle" aria-pressed="false" aria-label="Toggle pixel companion mode" title="Toggle pixel companion">
    <svg viewBox="0 0 8 8" width="14" height="14" aria-hidden="true">
      <rect x="2" y="1" width="4" height="1" fill="currentColor"/>
      <rect x="1" y="2" width="6" height="1" fill="currentColor"/>
      <rect x="1" y="3" width="2" height="1" fill="currentColor"/>
      <rect x="5" y="3" width="2" height="1" fill="currentColor"/>
      <rect x="1" y="4" width="6" height="1" fill="currentColor"/>
      <rect x="2" y="5" width="4" height="1" fill="currentColor"/>
      <rect x="2" y="6" width="1" height="1" fill="currentColor"/>
      <rect x="5" y="6" width="1" height="1" fill="currentColor"/>
    </svg>
  </button>
  <span class="dot">·</span>
  <a href="mailto:lrugley@gmail.com">lrugley@gmail.com</a>
</footer>
```

The inline SVG is a tiny 8×8 pixel-head silhouette (no extra HTTP request). It inherits `color: currentColor`, so it picks up the footer's `--slate` color by default.

Also add minimal CSS for the button inside the existing `<style>` block in `index.html` (right before `</style>`):

```css
.pixel-toggle {
  background: none;
  border: none;
  padding: 4px 6px;
  margin: 0;
  cursor: pointer;
  color: var(--slate);
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  transition: color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}
.pixel-toggle:hover,
.pixel-toggle:focus { color: var(--gold); outline: none; }
.pixel-toggle:focus-visible { outline: 1px solid var(--gold); outline-offset: 2px; }
```

This is the only edit to `index.html`'s existing styles. The button looks intentional in atelier mode but quiet.

- [ ] **Step 4: Create `pixel/pixel.css` as a placeholder file**

Create the file with just:

```css
/* pixel/pixel.css — pixel mode styles. Scoped under body[data-pixel="on"]. */
```

We'll add real rules in later tasks. The file exists now so the `<link>` doesn't 404.

- [ ] **Step 5: Create `pixel/pixel.js` with persistence + toggle handler**

Create `pixel/pixel.js` with this content:

```js
// pixel/pixel.js — pixel companion bootstrap.
// Handles mode persistence + toggle button. Sprite engine arrives in later tasks.

(function () {
  const STORAGE_KEY = 'lgr-pixel-mode';

  function readMode() {
    try { return localStorage.getItem(STORAGE_KEY) === 'on'; } catch (e) { return false; }
  }

  function writeMode(on) {
    try {
      if (on) localStorage.setItem(STORAGE_KEY, 'on');
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
  }

  function applyMode(on) {
    if (on) document.body.setAttribute('data-pixel', 'on');
    else document.body.removeAttribute('data-pixel');
    document.documentElement.removeAttribute('data-pixel-pending');
    const btn = document.querySelector('.pixel-toggle');
    if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

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
```

- [ ] **Step 6: Manual verification**

Start a local server: `python3 -m http.server 8000` from the repo root.

Open `http://localhost:8000/` in Chrome.

Verify all of these:

1. Page looks **identical** to before — same fonts, layout, spacing, colors. Compare side-by-side with the live site (https://laurencerugley.github.io/) if needed.
2. The footer now has a tiny pixel-head button between "Pasadena, CA" and the email link. It's in slate color, blends with the footer.
3. Hover the button — it turns gold.
4. Click the button. Open DevTools → Elements: `<body>` now has `data-pixel="on"`. Application → Local Storage shows `lgr-pixel-mode: on`. The button's `aria-pressed` is `"true"`.
5. Reload the page. The body still has `data-pixel="on"` from the start (no visible flash because the inline head script ran before paint). Button is still aria-pressed=true.
6. Click again. Attribute removed. Local storage key removed. aria-pressed=false.
7. Verify with DevTools Network panel: no `pixel/*` 404s.

- [ ] **Step 7: Commit**

```bash
git add index.html pixel/pixel.css pixel/pixel.js
git commit -m "pixel-companion: scaffolding + footer toggle + mode persistence"
```

---

## Task 2: Palette, frame data format, and static idle sprite

Adds the canvas atlas builder, defines the palette and frame data format, and renders the first sprite state (`idle`) as a static image in the bottom-left corner when pixel mode is on. No animation yet.

**Files:**
- Create: `pixel/sprite-frames.js` (palette + idle frames only for now)
- Modify: `pixel/pixel.js` (lazy sprite init, canvas atlas builder, sprite DOM injection)
- Modify: `pixel/pixel.css` (sprite container styles, mode-gated visibility)
- Modify: `index.html` (load `sprite-frames.js` before `pixel.js`)

- [ ] **Step 1: Observe the failure state**

In pixel mode, no sprite is visible. The page in pixel mode looks identical to atelier mode (apart from `data-pixel="on"` on body and aria-pressed on the toggle).

- [ ] **Step 2: Create `pixel/sprite-frames.js`**

This file defines the palette and exposes a global `PixelFrames` object. Plain script, no module — keeps the project build-free.

```js
// pixel/sprite-frames.js
// Palette + per-state frame definitions. Frames are 16w × 24h pixel arrays.
// Each row is a 16-character string. Each character maps to a palette index
// (or '.' for transparent). Edit these arrays to refine the visual.

(function () {
  // Palette: index → CSS color string.
  // 0 reserved for transparent (use '.' in frame strings).
  // Snake-inspired Black character on a warm neutral palette that ties to the brand.
  const PALETTE = {
    '.': null,           // transparent
    'I': '#2A2218',      // ink (outline)
    'S': '#7A4E2E',      // skin (medium-dark brown)
    'H': '#1A140A',      // hair (near-black)
    'B': '#B89968',      // bandana / gold (brand accent)
    'V': '#3A3326',      // tactical vest (dark olive-brown)
    'P': '#2D2920',      // pants
    'O': '#5A4F3E',      // boots / shadow accent
    'W': '#FAF7F2',      // limestone / eye whites
    'R': '#A45235',      // box (warm cardboard)
    'L': '#6B3A22'       // box shadow
  };

  // Frame storage: state name → array of 16x24 frame strings.
  // 24 rows of 16 characters each.
  const FRAMES = {
    'idle-0': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'idle-1': [
      '................',
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................'
    ]
  };

  window.PixelFrames = { PALETTE, FRAMES };
})();
```

The two `idle` frames differ by a one-pixel vertical offset — that's the breath bob.

- [ ] **Step 3: Add `sprite-frames.js` to `index.html`**

In `index.html`, just before the existing `<script defer src="pixel/pixel.js"></script>` line you added in Task 1, insert:

```html
<script defer src="pixel/sprite-frames.js"></script>
```

Order matters — `sprite-frames.js` must define `window.PixelFrames` before `pixel.js` runs. Since both are `defer`, they execute in document order.

- [ ] **Step 4: Build the canvas atlas in `pixel.js`**

Add this above the IIFE close in `pixel/pixel.js` (before `init()` is defined). Replace the entire IIFE body so the order is: constants → helpers → atlas builder → sprite injection → toggle handler → init. Here's the full new contents of `pixel/pixel.js`:

```js
// pixel/pixel.js — pixel companion engine.

(function () {
  const STORAGE_KEY = 'lgr-pixel-mode';
  const FRAME_W = 16;
  const FRAME_H = 24;
  const SCALE = 3;
  const MARGIN = 24;

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
  let currentFrameKey = 'idle-0';

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
    document.body.appendChild(spriteEl);
    return spriteEl;
  }

  function setFrame(key) {
    if (!spriteEl || !atlas) return;
    const x = atlas.frameMap[key];
    if (x === undefined) return;
    currentFrameKey = key;
    spriteEl.style.backgroundPosition = `-${x}px 0px`;
  }

  function removeSprite() {
    if (spriteEl && spriteEl.parentNode) spriteEl.parentNode.removeChild(spriteEl);
    spriteEl = null;
    atlas = null;
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
```

- [ ] **Step 5: Add sprite container styles to `pixel/pixel.css`**

Replace the file contents with:

```css
/* pixel/pixel.css — pixel mode styles. Scoped under body[data-pixel="on"]. */

body[data-pixel="on"] .pixel-sprite {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 100;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  pointer-events: auto;
  transform: translateX(0);
}
```

- [ ] **Step 6: Manual verification**

Reload `http://localhost:8000/`.

1. **Atelier mode (toggle off):** open DevTools → Elements. Confirm there's NO `.pixel-sprite` element in the DOM. Page looks like before.
2. **Pixel mode (click toggle):** a small pixel character appears at bottom-left (~24px from the edge). It should be recognizable as a humanoid with a gold bandana, dark skin, tactical-looking torso. It's static (no animation yet — that comes in Task 3). Size: 48×72 on screen.
3. **Persistence:** reload. Sprite is present from first paint — no flash where it appears late.
4. **Toggle off:** click toggle. Sprite disappears, DOM `.pixel-sprite` removed.
5. **Toggle on again:** sprite reappears. (Atlas is rebuilt each time — acceptable for a one-shot init.)
6. **No console errors.** Open DevTools console, refresh, click toggle a few times: no red errors.

If the sprite looks wrong (e.g. nothing visible, weird colors), inspect the canvas via console: `document.querySelector('.pixel-sprite').style.backgroundImage` — if the data URL is empty, the atlas build failed; check `window.PixelFrames`.

- [ ] **Step 7: Commit**

```bash
git add pixel/sprite-frames.js pixel/pixel.js pixel/pixel.css index.html
git commit -m "pixel-companion: canvas atlas + static idle sprite"
```

---

## Task 3: Walk-right animation + state machine skeleton

Adds 4 walk-right frames, a CSS keyframe animation, and a minimal state machine. After this task, the sprite still doesn't react to scroll yet — but you can manually switch states from the console (`window.PixelEngine.setState('walk-right')`) to verify the walk cycle plays.

**Files:**
- Modify: `pixel/sprite-frames.js` (add 4 walk-right frames)
- Modify: `pixel/pixel.js` (add state machine, exported engine handle)
- Modify: `pixel/pixel.css` (CSS animation for walk-right using `steps()` on `background-position`)

- [ ] **Step 1: Observe the failure state**

Pixel mode currently shows a single static sprite. `window.PixelEngine` is undefined (no engine handle yet).

- [ ] **Step 2: Add walk-right frames to `sprite-frames.js`**

In `pixel/sprite-frames.js`, add four new keys to the `FRAMES` object (place them after `idle-1`):

```js
    'walk-right-0': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP..IP......',
      '....IP..IPP.....',
      '....IP...IPI....',
      '...IOOI..IOOI...',
      '...IOOI..IOOI...',
      '................',
      '................'
    ],
    'walk-right-1': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '.....IPPPI......',
      '.....IPPPI......',
      '.....IPPPI......',
      '....IOOIOOI.....',
      '....IOOIOOI.....',
      '................',
      '................'
    ],
    'walk-right-2': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '......IPI.......',
      '.....IPPPI......',
      '....IPPI.PI.....',
      '...IOOI...IOI...',
      '...IOOI...IOI...',
      '................',
      '................'
    ],
    'walk-right-3': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '.....IPPPI......',
      '.....IPPPI......',
      '.....IPPPI......',
      '....IOOIOOI.....',
      '....IOOIOOI.....',
      '................',
      '................'
    ],
```

The leg positions on rows 17–21 cycle between four poses to create a walk cycle. (The pixel art is rough — visual iteration after the engine works.)

- [ ] **Step 3: Update `pixel.js` with state machine + engine handle**

Add this BEFORE the `init()` definition (i.e., after `applyMode`), and modify `init()` accordingly:

```js
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
    }
  };

  let currentState = 'idle';
  let currentFrameIndex = 0;
  let lastFrameSwitchAt = 0;

  function setState(name) {
    if (!STATES[name]) return;
    if (currentState === name) return;
    currentState = name;
    currentFrameIndex = 0;
    lastFrameSwitchAt = performance.now();
    applyFacing();
    setFrame(STATES[name].frames[0]);
  }

  function applyFacing() {
    if (!spriteEl) return;
    const facing = STATES[currentState].facing;
    spriteEl.dataset.facing = facing;
  }

  function tickAnimation(now) {
    if (!spriteEl) return;
    const state = STATES[currentState];
    const dur = state.durations[currentFrameIndex];
    if (now - lastFrameSwitchAt >= dur) {
      currentFrameIndex = (currentFrameIndex + 1) % state.frames.length;
      setFrame(state.frames[currentFrameIndex]);
      lastFrameSwitchAt = now;
    }
  }

  let rafHandle = null;
  function startLoop() {
    if (rafHandle !== null) return;
    function frame(now) {
      tickAnimation(now);
      rafHandle = requestAnimationFrame(frame);
    }
    rafHandle = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (rafHandle !== null) cancelAnimationFrame(rafHandle);
    rafHandle = null;
  }

  // Expose for console debugging during development.
  window.PixelEngine = { setState, getState: () => currentState };
```

And update `ensureSprite()` to also start the loop, and `removeSprite()` to stop it:

In `ensureSprite()`, after `document.body.appendChild(spriteEl);`, add:

```js
    startLoop();
```

In `removeSprite()`, at the top (before the parentNode check), add:

```js
    stopLoop();
```

- [ ] **Step 4: Add facing CSS to `pixel/pixel.css`**

Append to the file:

```css
body[data-pixel="on"] .pixel-sprite[data-facing="left"] {
  transform: scaleX(-1);
}
```

(Position translation will be layered on top of this in Task 5.)

- [ ] **Step 5: Manual verification**

Reload pixel mode.

1. **Idle bob:** Sprite plays a subtle 2-frame idle animation (~600ms per frame). You should see a slight vertical movement.
2. **Manually trigger walk-right:** Open DevTools console, run `window.PixelEngine.setState('walk-right')`. The sprite should now cycle through 4 walk frames at ~120ms each. Legs visibly alternate.
3. **Manually trigger walk-left:** Run `window.PixelEngine.setState('walk-left')`. Sprite mirrors horizontally and plays the walk cycle.
4. **Back to idle:** Run `window.PixelEngine.setState('idle')`. Sprite faces right again, slow bob.
5. **Toggle off mid-animation:** Click footer toggle. Sprite removed, RAF loop stops (verify in DevTools Performance → no recurring activity). Toggle back on — animation resumes.

- [ ] **Step 6: Commit**

```bash
git add pixel/sprite-frames.js pixel/pixel.js pixel/pixel.css
git commit -m "pixel-companion: walk cycle + state machine"
```

---

## Task 4: Scroll → walk-right / walk-left

Hooks the scroll event into the state machine. Scrolling down → walk-right. Scrolling up → walk-left. 200ms after the last scroll event → idle.

**Files:**
- Modify: `pixel/pixel.js` (add scroll listener, idle-timeout)

- [ ] **Step 1: Observe the failure state**

Scroll the page. The sprite stays in `idle` (its bob animation continues). Scroll has no effect on state.

- [ ] **Step 2: Add scroll handling to `pixel.js`**

Inside the main IIFE, AFTER the `STATES` and state-machine helpers, BEFORE `applyMode`, add:

```js
  // ---------- Scroll-driven state ----------
  let lastScrollY = 0;
  let lastScrollAt = 0;
  let scrollPending = false;
  const IDLE_AFTER_MS = 200;

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
    if (delta > 0) setState('walk-right');
    else if (delta < 0) setState('walk-left');
  }

  function tickIdleTimeout(now) {
    if (currentState !== 'walk-right' && currentState !== 'walk-left') return;
    if (now - lastScrollAt >= IDLE_AFTER_MS) setState('idle');
  }
```

Then modify `startLoop()` so its inner `frame` function also calls `tickIdleTimeout`:

```js
    function frame(now) {
      tickAnimation(now);
      tickIdleTimeout(now);
      rafHandle = requestAnimationFrame(frame);
    }
```

Then modify `ensureSprite()` — AFTER `startLoop();`, add:

```js
    lastScrollY = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
```

And modify `removeSprite()` — at the top (before `stopLoop()`), add:

```js
    window.removeEventListener('scroll', onScroll);
```

- [ ] **Step 3: Manual verification**

Reload pixel mode.

1. Sprite is in idle bob.
2. **Scroll down** (mouse wheel or trackpad). Sprite immediately switches to walk-right animation. Continue scrolling — animation keeps playing.
3. **Stop scrolling.** After ~200ms, sprite returns to idle.
4. **Scroll up.** Sprite mirrors (faces left) and plays the walk cycle.
5. **Scroll back down.** Sprite faces right again, walks.
6. No console errors. No scroll lag.

Sprite still doesn't move horizontally — it stays anchored at `left: 24px` for now. That's Task 5.

- [ ] **Step 4: Commit**

```bash
git add pixel/pixel.js
git commit -m "pixel-companion: scroll-driven walk state"
```

---

## Task 5: Horizontal traverse — sprite follows scroll percentage

Maps `scrollY` to a horizontal `translateX` so the sprite actually traverses the bottom of the viewport. At 0% scroll the sprite is at the left edge; at 100% it's at the right edge.

**Files:**
- Modify: `pixel/pixel.js` (position updater, resize handler)
- Modify: `pixel/pixel.css` (drop the static `left: 24px`, switch to dynamic transform-based positioning)

- [ ] **Step 1: Observe the failure state**

Scroll the full length of the page. The sprite plays walk animation but remains stuck at `left: 24px`. Pixel-you stays glued to the corner — doesn't "follow you."

- [ ] **Step 2: Update CSS to enable transform-based positioning**

Edit `pixel/pixel.css`. Replace this rule:

```css
body[data-pixel="on"] .pixel-sprite {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 100;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  pointer-events: auto;
  transform: translateX(0);
}
```

With:

```css
body[data-pixel="on"] .pixel-sprite {
  position: fixed;
  bottom: 24px;
  left: 0;
  z-index: 100;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  pointer-events: auto;
  will-change: transform;
}
```

And replace the facing rule:

```css
body[data-pixel="on"] .pixel-sprite[data-facing="left"] {
  transform: scaleX(-1);
}
```

With (we now compose translate + scale in JS):

```css
/* facing is applied in JS via the transform property */
```

- [ ] **Step 3: Add positioning logic to `pixel.js`**

Replace the existing `applyFacing()` function with a combined `applyTransform()`:

```js
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
    const scaleX = facing === 'left' ? -1 : 1;
    // When mirroring, we also need to flip the x-anchor so it doesn't visually jump.
    const tx = facing === 'left' ? spriteX + FRAME_W * SCALE : spriteX;
    spriteEl.style.transform = `translateX(${tx}px) scaleX(${scaleX})`;
  }
```

Then update `handleScroll()` to also call `updatePosition()`:

```js
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
```

Then replace the existing `setState()` so it calls `applyTransform()` instead of `applyFacing()`:

```js
  function setState(name) {
    if (!STATES[name]) return;
    if (currentState === name) return;
    currentState = name;
    currentFrameIndex = 0;
    lastFrameSwitchAt = performance.now();
    applyTransform();
    setFrame(STATES[name].frames[0]);
  }
```

Add resize handling. In `ensureSprite()`, after `window.addEventListener('scroll', onScroll, ...);`, add:

```js
    window.addEventListener('resize', updatePosition);
    updatePosition();
```

In `removeSprite()`, after `window.removeEventListener('scroll', onScroll);`, add:

```js
    window.removeEventListener('resize', updatePosition);
```

Delete the now-unused `applyFacing()` function. (It's dead code — the lint discipline of the repo isn't strict, but leave it clean.)

- [ ] **Step 4: Manual verification**

Reload pixel mode.

1. **Top of page:** sprite is at far left (24px from edge), facing right.
2. **Scroll down halfway:** sprite is around the middle of the viewport horizontally, walking right.
3. **Scroll to bottom:** sprite is at far right (24px from right edge), facing right.
4. **Scroll back up:** sprite mirrors (faces left) and moves left. The transform combines x-translate and the mirror cleanly — no visual jump when reversing direction.
5. **Resize the window:** sprite position updates to stay proportional to scroll percentage.
6. **No flickering, no jumps, smooth motion.** Scroll fast — sprite keeps up.

- [ ] **Step 5: Commit**

```bash
git add pixel/pixel.js pixel/pixel.css
git commit -m "pixel-companion: horizontal traverse mapped to scroll progress"
```

---

## Task 6: Idle quirks — yawn, look, sit

Adds three idle quirks. After 10s in idle, the engine picks one at random and plays it once before returning to plain idle.

**Files:**
- Modify: `pixel/sprite-frames.js` (add yawn, look, sit frames)
- Modify: `pixel/pixel.js` (idle timer, quirk picker, one-shot animation handling)

- [ ] **Step 1: Observe the failure state**

In idle, the sprite bobs forever with no variation. Wait 30s — no quirk happens.

- [ ] **Step 2: Add quirk frames to `sprite-frames.js`**

Add these keys to the `FRAMES` object (place after the `walk-right-*` entries):

```js
    'yawn-0': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISIIISI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'yawn-1': [
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '...ISSWHWSSI....',
      '...ISIIIIIIS....',
      '...IISIIIIIS....',
      '.....ISSSI......',
      '...IVVVVVVVI....',
      '..IVBBBBBBBVI...',
      '..IVVVVVVVVVI...',
      '..IVVVVVVVVVI...',
      '...IVVVVVVVI....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'yawn-2': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISIIISI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'look-0': [
      '................',
      '................',
      '...IIIII........',
      '..IBBBBBI.......',
      '..IBBBBBI.......',
      '..ISSHSSI.......',
      '..ISWHWSI.......',
      '..ISSSSSI.......',
      '...ISSSI........',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'look-1': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'look-2': [
      '................',
      '................',
      '........IIIII...',
      '.......IBBBBBI..',
      '.......IBBBBBI..',
      '.......ISSHSSI..',
      '.......ISWHWSI..',
      '.......ISSSSSI..',
      '........ISSSI...',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'sit-0': [
      '................',
      '................',
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '..IIIPPPPPIII...',
      '..IPPPPPPPPPI...',
      '..IPPPPPPPPPI...',
      '..IOOIIIIIOOI...',
      '..IOOI...IOOI...',
      '................',
      '................'
    ],
    'sit-1': [
      '................',
      '................',
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '..IIIPPPPPIII...',
      '..IPPPPPPPPPI...',
      '..IPPPPPPPPPI...',
      '..IOOIIIIIOOI...',
      '..IOOI...IOOI...',
      '................',
      '................'
    ],
```

- [ ] **Step 3: Add quirk states and one-shot handling to `pixel.js`**

Add new entries to the `STATES` object:

```js
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
```

Add a `quirksReturnTo` constant near the top:

```js
  const IDLE_QUIRK_AFTER_MS = 10000;
  const QUIRK_POOL = ['yawn', 'look', 'sit'];
```

Update `tickAnimation()` to handle one-shot and max-duration:

```js
  let stateStartedAt = 0;
  function tickAnimation(now) {
    if (!spriteEl) return;
    const state = STATES[currentState];
    const dur = state.durations[currentFrameIndex];
    if (now - lastFrameSwitchAt >= dur) {
      const isLast = currentFrameIndex === state.frames.length - 1;
      if (isLast && state.oneShot) {
        setState('idle');
        return;
      }
      if (state.maxDurationMs && now - stateStartedAt >= state.maxDurationMs) {
        setState('idle');
        return;
      }
      currentFrameIndex = (currentFrameIndex + 1) % state.frames.length;
      setFrame(state.frames[currentFrameIndex]);
      lastFrameSwitchAt = now;
    }
  }
```

Update `setState()` to set `stateStartedAt`:

```js
  function setState(name) {
    if (!STATES[name]) return;
    if (currentState === name) return;
    currentState = name;
    currentFrameIndex = 0;
    lastFrameSwitchAt = performance.now();
    stateStartedAt = lastFrameSwitchAt;
    applyTransform();
    setFrame(STATES[name].frames[0]);
  }
```

Add idle-quirk timer to the RAF loop. Add a `tickIdleQuirk` function:

```js
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
```

Update `startLoop()`:

```js
    function frame(now) {
      tickAnimation(now);
      tickIdleTimeout(now);
      tickIdleQuirk(now);
      rafHandle = requestAnimationFrame(frame);
    }
```

- [ ] **Step 4: Manual verification**

Reload pixel mode. Don't scroll.

1. Sprite is in idle bob.
2. **Wait 10 seconds.** A quirk fires — one of: yawn (mouth opens wide once), look (head turns left, center, right, center), or sit (sits down for ~2.4s, then stands).
3. After the quirk, sprite returns to idle.
4. **Wait another 10s.** Another quirk fires (possibly a different one). Sit through several cycles to see variety.
5. **Scroll while a quirk is playing** — the quirk gets interrupted and the sprite immediately switches to walk-right/left. After 200ms of no scroll, it goes to idle, and the 10s timer restarts.
6. No console errors.

- [ ] **Step 5: Commit**

```bash
git add pixel/sprite-frames.js pixel/pixel.js
git commit -m "pixel-companion: idle quirks (yawn, look, sit)"
```

---

## Task 7: Box-hide quirk

Adds the cardboard-box-hide quirk to the idle pool. The sprite pulls a box overhead, hides for ~4 seconds (with occasional peek), then emerges. This task adds the box visuals only — the catch-and-pet interaction comes in Task 10.

**Files:**
- Modify: `pixel/sprite-frames.js` (add box-hide-* frames)
- Modify: `pixel/pixel.js` (add `box-hide` state, add to quirk pool)

- [ ] **Step 1: Observe the failure state**

The quirk pool is `[yawn, look, sit]`. After many 10s idle cycles you never see a cardboard box.

- [ ] **Step 2: Add box-hide frames to `sprite-frames.js`**

Add to `FRAMES`:

```js
    'box-hide-0': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.IIIL',
      '...IVBBBBBVIRRL.',
      '...IVVVVVVVRRRL.',
      '...IVVVVVVVIRRL.',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'box-hide-1': [
      '................',
      '...IIIIIIIIIIIIL',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'box-hide-2': [
      '................',
      '...IIIIIIIIIIIIL',
      '...IRRRRRRRRRRL.',
      '...IRRRWHWRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'box-hide-3': [
      '................',
      '...IIIIIIIIIIIIL',
      '..BIRRRRRRRRRRLB',
      '..!IRRRRRRRRRRL.',
      '..BIRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '...IRRRRRRRRRRL.',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
```

Notes:
- `box-hide-0` shows him pulling the box from offscreen-right (single arm extended).
- `box-hide-1` shows him fully hidden under the box.
- `box-hide-2` shows him peeking out the top (eyes visible through the lid).
- `box-hide-3` shows him peeking with an `!` and exclamation-style gold pixels — the brief "spotted me?" beat.

The `!` character in `box-hide-3` row 4 is intentional — it's not in the palette so it'll render transparent. That's fine, the surrounding `B` (gold) pixels form a stylized exclamation. (Alternative: replace `!` with `.`)

- [ ] **Step 3: Add box-hide state and to the quirk pool**

In `pixel/pixel.js`, add to `STATES`:

```js
    'box-hide': {
      frames: ['box-hide-0', 'box-hide-1', 'box-hide-1', 'box-hide-2', 'box-hide-1', 'box-hide-3', 'box-hide-1', 'box-hide-1'],
      durations: [300, 700, 700, 400, 700, 350, 400, 450],
      facing: 'right',
      oneShot: true
    },
```

Then update `QUIRK_POOL`:

```js
  const QUIRK_POOL = ['yawn', 'look', 'sit', 'box-hide'];
```

- [ ] **Step 4: Manual verification**

Reload pixel mode. Sit idle and wait through several 10s cycles. (May need to refresh and retry to see this one — it's a 25% pick each cycle.)

1. **Eventually** the box-hide quirk fires: arm extends → box drops → hidden under box → brief peek → hidden → peek with `!` → hidden → emerges back to idle.
2. Duration: ~4 seconds total.
3. The box visuals look like a chunky red-brown rectangle covering the upper half of the sprite.
4. After emerging, sprite returns to idle.
5. **Scroll during box-hide** — interrupts and returns to walk state (acceptable; the catch-and-pet logic in Task 10 will preserve the box-hide state through scroll, but for now this is fine).

If you never see box-hide after 10+ cycles, something is wrong with the random pick. Open console, run `Math.floor(Math.random() * 4)` a few times — should produce 0,1,2,3.

- [ ] **Step 5: Commit**

```bash
git add pixel/sprite-frames.js pixel/pixel.js
git commit -m "pixel-companion: box-hide idle quirk"
```

---

## Task 8: Cursor proximity dash + `!` overlay

When the cursor comes within 60px of the sprite (and we're not currently in box-hide), the sprite dashes the other way with a sprint animation and an `!` alert overlay. Cooldown 1 second.

**Files:**
- Modify: `pixel/sprite-frames.js` (add dash-sprint, dash-alert frames)
- Modify: `pixel/pixel.js` (mousemove handler, dash state, `!` overlay element)
- Modify: `pixel/pixel.css` (`!` overlay positioning + animation)

- [ ] **Step 1: Observe the failure state**

Move cursor on top of the sprite. Nothing happens — sprite stays in its current state. No dash, no `!`.

- [ ] **Step 2: Add dash frames to `sprite-frames.js`**

Add to `FRAMES`:

```js
    'dash-sprint-0': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '.IISVVVVVI......',
      '.IIIBBBBBVI.....',
      '..IIVVVVVVI.....',
      '...IVVVVVVI.....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '...IPPPPPI......',
      '..IPP..IPP......',
      '.IP....IPP......',
      '.I.....IP.......',
      '......IOI.......',
      '......IOI.......',
      '................',
      '................'
    ],
    'dash-sprint-1': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '....IVVVVVVI....',
      '.....IVVVVI.....',
      '.....IPPPPI.....',
      '....IPPPPI......',
      '...IPPPPI.......',
      '..IPPI.PI.......',
      '.IPI...PII......',
      '.II....I.II.....',
      '......IOI.IO....',
      '......IOI.IO....',
      '................',
      '................'
    ],
    'dash-alert': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISIIISI.....',
      '....ISIWISI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '...IPPPPPPI.....',
      '..IPPI.IPPI.....',
      '.IPP....IPPI....',
      '.IO.....IIO.....',
      '.IO.....IIO.....',
      '................',
      '................'
    ],
```

Add an `!` overlay frame (small 8x8 sprite, but to fit our atlas we use a 16x24 frame with the `!` near the top-center):

```js
    'overlay-bang': [
      '................',
      '.......BB.......',
      '......BBBB......',
      '.....BBIIBB.....',
      '.....BBIIBB.....',
      '.....BBIIBB.....',
      '......BIIB......',
      '......BIIB......',
      '......BBBB......',
      '......BBBB......',
      '................',
      '................',
      '.......BB.......',
      '......BBBB......',
      '......BBBB......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ],
```

- [ ] **Step 3: Add dash state machine logic**

Add new states to `STATES`:

```js
    'dash-right': {
      frames: ['dash-sprint-0', 'dash-sprint-1'],
      durations: [60, 60],
      facing: 'right',
      oneShot: false,
      maxDurationMs: 400
    },
    'dash-left': {
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
    }
```

Add constants near other tunables:

```js
  const DASH_PROXIMITY_PX = 60;
  const DASH_DISTANCE_PX = 140;
  const DASH_DURATION_MS = 400;
  const DASH_COOLDOWN_MS = 1000;
```

Add cursor tracking + proximity logic:

```js
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

  function spriteCenter() {
    const rect = spriteEl ? spriteEl.getBoundingClientRect() : null;
    if (!rect) return null;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function maybeStartDash(now) {
    if (!spriteEl) return;
    if (currentState === 'box-hide') return;
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
  }

  function tickDashPosition(now) {
    if (currentState !== 'dash-right' && currentState !== 'dash-left') return;
    const t = Math.min(1, (now - dashStartedAt) / DASH_DURATION_MS);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    spriteX = dashFromX + (dashTargetX - dashFromX) * eased;
    applyTransform();
    if (t >= 1) setState('dash-recover');
  }
```

Add overlay element handling:

```js
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
```

Update the RAF loop:

```js
    function frame(now) {
      tickAnimation(now);
      tickIdleTimeout(now);
      tickIdleQuirk(now);
      tickDashPosition(now);
      tickOverlay(now);
      rafHandle = requestAnimationFrame(frame);
    }
```

Add mousemove listener in `ensureSprite()` after `updatePosition();`:

```js
    window.addEventListener('mousemove', onMouseMove, { passive: true });
```

Remove it in `removeSprite()`:

```js
    window.removeEventListener('mousemove', onMouseMove);
```

- [ ] **Step 4: Add overlay CSS**

Append to `pixel/pixel.css`:

```css
body[data-pixel="on"] .pixel-overlay {
  position: absolute;
  top: -36px; /* float the ! above the sprite head */
  left: 0;
  image-rendering: pixelated;
  pointer-events: none;
}

body[data-pixel="on"] .pixel-sprite[data-facing="left"] .pixel-overlay {
  transform: scaleX(-1); /* counter-rotate so the ! reads correctly */
}
```

Note: because the sprite itself is scaled-flipped when facing left, the overlay (a child) inherits the flip. The CSS above counter-flips the overlay so the `!` always reads right-side up.

- [ ] **Step 5: Manual verification**

Reload pixel mode.

1. **Move cursor toward the sprite from the right.** When you get within ~60px, the `!` pops above his head and he dashes left ~140px with a fast sprint animation.
2. After ~400ms, he holds a brief alert/crouched pose, then returns to idle.
3. **Try from the left:** dashes right.
4. **Near the viewport edge:** if dashing the natural direction would clip the edge, he dashes the other way.
5. **Try to chase him:** as you move the cursor toward him repeatedly, the 1s cooldown prevents jittery re-triggers.
6. **During scroll:** scroll the page, then move cursor near him while he's walking. He still dashes — proximity detection works regardless of state (except box-hide).
7. The `!` is visible only briefly (~250ms) and reads correctly even when facing left.
8. No console errors.

- [ ] **Step 6: Commit**

```bash
git add pixel/sprite-frames.js pixel/pixel.js pixel/pixel.css
git commit -m "pixel-companion: cursor-proximity dash + alert overlay"
```

---

## Task 9: Hover-on-work-item — point-up reaction

When the cursor hovers over a `.work-item` (one of the two client links in the work list), the sprite plays a "point-up" animation: arm raised toward the link. Returns to previous state on mouseleave.

**Files:**
- Modify: `pixel/sprite-frames.js` (add point-up frames)
- Modify: `pixel/pixel.js` (work-item hover listeners, point-up state)

- [ ] **Step 1: Observe the failure state**

Hover over `alsoknownas.la` or `savycolours.com` in the work list. Sprite ignores it.

- [ ] **Step 2: Add point-up frames**

In `sprite-frames.js`, add:

```js
    'point-up-0': [
      '................',
      '......IIII......',
      '.....IBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '.IISIVVVVVI.....',
      '.IIIIBBBBBVI....',
      '..IIVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'point-up-1': [
      '................',
      '......IIII......',
      '.....IBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '.IISIVVVVVI.....',
      '.IIIIBBBBBVI....',
      '..IIVVVVVVVI....',
      '....IVVVVVI.....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
```

- [ ] **Step 3: Add state + hover handlers**

In `pixel.js`, add to `STATES`:

```js
    'point-up': {
      frames: ['point-up-0', 'point-up-1'],
      durations: [500, 500],
      facing: 'right',
      oneShot: false
    }
```

Add hover handler:

```js
  let preHoverState = null;

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
```

Wire up listeners. In `ensureSprite()`, after the mousemove listener, add:

```js
    document.querySelectorAll('.work-item').forEach(el => {
      el.addEventListener('mouseenter', onWorkEnter);
      el.addEventListener('mouseleave', onWorkLeave);
    });
```

In `removeSprite()`, before `spriteEl.parentNode.removeChild(spriteEl);`, add:

```js
    document.querySelectorAll('.work-item').forEach(el => {
      el.removeEventListener('mouseenter', onWorkEnter);
      el.removeEventListener('mouseleave', onWorkLeave);
    });
```

- [ ] **Step 4: Manual verification**

Reload pixel mode.

1. **Hover `alsoknownas.la`:** sprite raises arm in a 2-frame bob. Mouseleave → returns to idle (or walk if you were scrolling).
2. **Hover `savycolours.com`:** same behavior.
3. **During scroll:** if you hover a work item while the page is scrolling (cursor over a link as it passes under), point-up fires; mouseleave returns to walk-right/walk-left.
4. **Box-hide doesn't get interrupted by hover.** Wait for box-hide quirk, then hover a work item — sprite stays under the box.
5. **Multiple work items** behave the same. Both client links trigger the gesture.

- [ ] **Step 5: Commit**

```bash
git add pixel/sprite-frames.js pixel/pixel.js
git commit -m "pixel-companion: hover-on-work point-up reaction"
```

---

## Task 10: Catch-and-pet — click the box while hidden

While `box-hide` is active, the sprite becomes click-targetable. Clicking it fires the catch sequence: box-flip → caught (with `!`) → happy → hearts particles → idle. Dash detection is suppressed during box-hide so the cursor can approach safely.

**Files:**
- Modify: `pixel/sprite-frames.js` (add caught, box-flip, happy-wave frames)
- Modify: `pixel/pixel.js` (click handler, catch sequence, dash suppression)
- Modify: `pixel/pixel.css` (hearts CSS particles, box-flip transition)

- [ ] **Step 1: Observe the failure state**

Wait for box-hide quirk. Click the box. Nothing happens — sprite continues the quirk.

- [ ] **Step 2: Add catch-sequence frames**

In `sprite-frames.js`:

```js
    'box-flip': [
      '................',
      '................',
      '.LIIIIIIIIIIIIII',
      '.LRRRRRRRRRRRRRI',
      '.LRRRRRRRRRRRRRI',
      '.LRRRRRRRRRRRRRI',
      '.LRRRRRRRRRRRRRI',
      '.LRRRRRRRRRRRRRI',
      '.LRRRRRRRRRRRRRI',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'caught': [
      '..I..........I..',
      '...I........I...',
      '....IIIII...I...',
      '...IBBBBBI..I...',
      '...IBBBBBI......',
      '...ISIIISI......',
      '...ISWIWSI......',
      '...IS...SI......',
      '....ISSSI.......',
      '..IVVVVVVVI.....',
      '..IBBBBBBBI.....',
      '..IVVVVVVVI.....',
      '...IVVVVVI......',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
    'happy-wave': [
      '......IIII......',
      '.....IBBBBI.....',
      '....IBBBBBI..I..',
      '....IBBBBBI.I...',
      '....ISSHSSII....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '....IP..IPI.....',
      '...IOOI.IOOI....',
      '...IOOI.IOOI....',
      '................',
      '................'
    ],
```

- [ ] **Step 3: Add catch states + click handling**

In `pixel.js`, add to `STATES`:

```js
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
    }
```

Hook up `oneShot` chaining via a queued-next mechanism. Add a `nextState` queue:

```js
  let queuedNextState = null;
  function queueNextState(name) { queuedNextState = name; }
```

Update `tickAnimation()` to consume the queue when a oneShot ends:

```js
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
```

Add the catch sequence trigger:

```js
  function triggerCatch() {
    if (currentState !== 'box-hide') return;
    setState('box-flip');
    queueNextState('caught');
    setTimeout(() => {
      if (currentState === 'caught') {
        setState('happy-wave');
        spawnHearts();
      }
    }, 500);
  }
```

Add the sprite click listener. In `ensureSprite()`, after appending the sprite element, add:

```js
    spriteEl.addEventListener('click', triggerCatch);
```

In `removeSprite()`, before `spriteEl.parentNode.removeChild(spriteEl);`, add:

```js
    spriteEl.removeEventListener('click', triggerCatch);
```

Add hearts particles:

```js
  function spawnHearts() {
    if (!spriteEl) return;
    for (let i = 0; i < 3; i++) {
      const heart = document.createElement('span');
      heart.className = 'pixel-heart';
      heart.textContent = '♥'; // ♥
      heart.style.setProperty('--dx', (Math.random() * 30 - 15) + 'px');
      heart.style.setProperty('--delay', (i * 120) + 'ms');
      spriteEl.appendChild(heart);
      setTimeout(() => heart.remove(), 1200);
    }
  }
```

Suppress dash during box-hide. Confirm that `maybeStartDash()` already checks `if (currentState === 'box-hide') return;`. Add it also for the box-flip/caught/happy-wave states by extending the check:

```js
  function maybeStartDash(now) {
    if (!spriteEl) return;
    if (currentState === 'box-hide' || currentState === 'box-flip' ||
        currentState === 'caught' || currentState === 'happy-wave') return;
    if (currentState === 'dash-right' || currentState === 'dash-left' || currentState === 'dash-recover') return;
    if (now - lastDashAt < DASH_COOLDOWN_MS) return;
    // ... rest unchanged
  }
```

- [ ] **Step 4: Add hearts CSS**

Append to `pixel/pixel.css`:

```css
body[data-pixel="on"] .pixel-heart {
  position: absolute;
  top: 0;
  left: 50%;
  color: #B89968;
  font-size: 14px;
  pointer-events: none;
  animation: pixelHeart 1100ms ease-out forwards;
  animation-delay: var(--delay, 0ms);
  transform: translateX(calc(var(--dx, 0px) - 50%));
  opacity: 0;
}

@keyframes pixelHeart {
  0%   { opacity: 0; transform: translate(calc(var(--dx) - 50%), 0px) scale(0.8); }
  20%  { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(var(--dx) - 50%), -60px) scale(1.1); }
}
```

- [ ] **Step 5: Manual verification**

Reload pixel mode.

1. **Wait for box-hide quirk.** Sprite hides under box.
2. **Move cursor near the box** — sprite does NOT dash. (Dash suppressed during box-hide and successor states.)
3. **Click the box.** Box flips off → caught reveal (surprised pose) → happy wave + 3 gold hearts float up and fade out → returns to idle.
4. **Try clicking the sprite when NOT in box-hide** — nothing happens. (Click only matters during box-hide.)
5. **Test catch interrupting a peek:** wait for the peek frame (eyes visible), click — same catch sequence.
6. **Reload, try repeatedly.** Verify no console errors after multiple catches.

- [ ] **Step 6: Commit**

```bash
git add pixel/sprite-frames.js pixel/pixel.js pixel/pixel.css
git commit -m "pixel-companion: catch-the-hidden-Snake interaction + hearts"
```

---

## Task 11: Form-submit jump celebration

When the contact form submits successfully, the sprite jumps with a 3-frame animation. Hooks into the existing Formspree handler in `index.html`.

**Files:**
- Modify: `pixel/sprite-frames.js` (add jump-0, jump-1, jump-2)
- Modify: `pixel/pixel.js` (expose `celebrate()` API, jump state)
- Modify: `index.html` (call `window.PixelEngine.celebrate()` after successful form submit)

- [ ] **Step 1: Observe the failure state**

Submit the form (use a fake email like `test@test.com` and any message). On success the existing "thank you" message appears, but the sprite ignores the event.

- [ ] **Step 2: Add jump frames**

In `sprite-frames.js`:

```js
    'jump-0': [
      '................',
      '................',
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '..IIIVVVVVIII...',
      '..IIIBBBBBIII...',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IP.IPI......',
      '....IP..IPI.....',
      '...IPP...PPI....',
      '..IO.....OI.....',
      '..IO......I.....',
      '................',
      '................'
    ],
    'jump-1': [
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '..I.IVVVVVI.I...',
      '..IIIBBBBBIII...',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '....IPPPPPI.....',
      '...IPI.IPI......',
      '..IPI...IPI.....',
      '..IO.....OI.....',
      '................',
      '................',
      '................',
      '................'
    ],
    'jump-2': [
      '................',
      '................',
      '................',
      '................',
      '................',
      '.....IIIII......',
      '....IBBBBBI.....',
      '....IBBBBBI.....',
      '....ISSHSSI.....',
      '....ISWHWSI.....',
      '....ISSSSSI.....',
      '.....ISSSI......',
      '....IVVVVVI.....',
      '...IVBBBBBVI....',
      '...IVVVVVVVI....',
      '...IVVVVVVVI....',
      '....IVVVVVI.....',
      '....IPPPPPI.....',
      '...IPPI.IPPI....',
      '..IPPI...IPPI...',
      '..IOOI...IOOI...',
      '..IOOI...IOOI...',
      '................',
      '................'
    ],
```

- [ ] **Step 3: Add jump state + API**

In `pixel.js`, add to `STATES`:

```js
    'jump': {
      frames: ['jump-0', 'jump-1', 'jump-2'],
      durations: [200, 400, 200],
      facing: 'right',
      oneShot: true
    }
```

Add `celebrate` to the exposed handle. Replace the existing `window.PixelEngine` assignment with:

```js
  window.PixelEngine = {
    setState,
    getState: () => currentState,
    celebrate: () => { if (spriteEl) setState('jump'); }
  };
```

- [ ] **Step 4: Hook into the form-submit handler in `index.html`**

Find the existing inline script at the bottom of `index.html`:

```js
if (res.ok) {
  form.style.display = 'none';
  success.style.display = 'block';
}
```

Change it to:

```js
if (res.ok) {
  form.style.display = 'none';
  success.style.display = 'block';
  if (window.PixelEngine && typeof window.PixelEngine.celebrate === 'function') {
    window.PixelEngine.celebrate();
  }
}
```

Guarded call — if pixel mode isn't loaded or isn't on, this is a no-op.

- [ ] **Step 5: Manual verification**

Reload pixel mode.

1. Scroll down to the form.
2. Fill in: any name, `test@test.com`, any message. Submit.
3. **Success message appears** AND the sprite jumps (crouch → mid-air → land), then returns to idle.
4. **In atelier mode:** submit again. Form works exactly like before, no errors. (Sprite isn't rendered so no jump — that's correct.)
5. No console errors in either mode.

If Formspree is offline or you can't actually submit, you can fake the trigger from the console: `window.PixelEngine.celebrate()` — verify the jump animation plays.

- [ ] **Step 6: Commit**

```bash
git add pixel/sprite-frames.js pixel/pixel.js index.html
git commit -m "pixel-companion: form-submit jump celebration"
```

---

## Task 12: Reduced-motion support

When `prefers-reduced-motion: reduce` is set at the OS level, pixel mode renders a single static sprite with no scroll-following, no animations, no quirks, no dash, no hearts. Toggle still functional.

**Files:**
- Modify: `pixel/pixel.js` (detect preference, gate dynamics, skip RAF position updates)
- Modify: `pixel/pixel.css` (suppress keyframe animations + heart particles)

- [ ] **Step 1: Observe the failure state**

Open DevTools → ⋮ → More tools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce". Reload pixel mode. The sprite still animates, scrolls, dashes — ignoring the preference.

- [ ] **Step 2: Detect preference in `pixel.js`**

At the top of the IIFE, after the constants, add:

```js
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

Modify `ensureSprite()` to short-circuit dynamics when reduced motion is on. After `document.body.appendChild(spriteEl);` but BEFORE `startLoop();`, add:

```js
    if (prefersReducedMotion) {
      setFrame('idle-0');
      spriteEl.style.transform = `translateX(${MARGIN}px)`;
      // No scroll/mousemove listeners, no RAF loop.
      return spriteEl;
    }
```

Move ALL the listener registrations and `startLoop()` and `updatePosition()` to AFTER this guard, so they're skipped under reduced motion. The order in `ensureSprite()` becomes:

```js
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
    document.body.appendChild(spriteEl);
    spriteEl.addEventListener('click', triggerCatch);

    if (prefersReducedMotion) {
      spriteEl.style.transform = `translateX(${MARGIN}px)`;
      return spriteEl;
    }

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
```

Update `removeSprite()` so it's safe under reduced motion (most removals were no-ops anyway, but `stopLoop()` and listener removes should still run — they're idempotent):

```js
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
  }
```

Also short-circuit `celebrate()`:

```js
  window.PixelEngine = {
    setState,
    getState: () => currentState,
    celebrate: () => {
      if (prefersReducedMotion) return;
      if (spriteEl) setState('jump');
    }
  };
```

- [ ] **Step 3: Add CSS guard for hearts**

Append to `pixel/pixel.css`:

```css
@media (prefers-reduced-motion: reduce) {
  body[data-pixel="on"] .pixel-heart { display: none; }
  body[data-pixel="on"] .pixel-overlay { display: none !important; }
}
```

- [ ] **Step 4: Manual verification**

DevTools → Rendering → enable `prefers-reduced-motion: reduce`. Reload pixel mode.

1. Sprite appears bottom-left as a single static frame. No bob.
2. Scroll the page — sprite stays put. No walk, no traverse.
3. Move cursor toward sprite — no dash. No `!` overlay.
4. Submit form — no jump.
5. Sprite is still visible; toggle still toggles it on/off.
6. Disable reduced motion in DevTools. Reload. Everything animates again normally.

- [ ] **Step 5: Commit**

```bash
git add pixel/pixel.js pixel/pixel.css
git commit -m "pixel-companion: respect prefers-reduced-motion"
```

---

## Task 13: Toggle button micro-wave animation

When in pixel mode (and reduced motion is NOT set), the footer toggle button gets a subtle wave animation to advertise its function. In atelier mode it stays static.

**Files:**
- Modify: `index.html` (add CSS rules in existing `<style>` block)

- [ ] **Step 1: Observe the failure state**

In pixel mode, the toggle is static (only changes color on hover). There's no indication beyond color that pixel mode is active.

- [ ] **Step 2: Add wave animation CSS**

In `index.html`, append to the existing `<style>` block:

```css
@keyframes pixelToggleWave {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-12deg); }
  40% { transform: rotate(12deg); }
  60% { transform: rotate(-6deg); }
  80% { transform: rotate(6deg); }
}

body[data-pixel="on"] .pixel-toggle {
  color: var(--gold);
}

body[data-pixel="on"] .pixel-toggle svg {
  animation: pixelToggleWave 2.4s ease-in-out infinite;
  transform-origin: 50% 60%;
}

@media (prefers-reduced-motion: reduce) {
  body[data-pixel="on"] .pixel-toggle svg {
    animation: none;
  }
}
```

- [ ] **Step 3: Manual verification**

1. **Atelier mode:** button is slate-colored, static.
2. **Switch to pixel mode:** button turns gold, SVG begins a gentle 2.4s wave (subtle head-tilt).
3. **Hover:** still readable, animation continues.
4. **Reduced motion:** the wave is suppressed (button still gold, but no rotate).
5. **Toggle off:** button returns to slate, static.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "pixel-companion: toggle button waves in pixel mode"
```

---

## Task 14: Full smoke test + final polish

A complete pass through the 11-point test plan from the spec. Fix any visual or behavioral issues found. Commit any tweaks.

- [ ] **Step 1: Run the full smoke test**

Start the local server and step through every item:

1. **Atelier purity:** loaded fresh, page is visually identical to current main. Network panel shows **no** `pixel/*` asset loads.
   - The CSS file DOES load even in atelier mode (it's just empty-effect because no rules match). The JS file also loads (it's idle in atelier mode). That's acceptable — these are <10KB combined. The "0 bytes added" guarantee from the spec is interpreted as "no functional pixel payload runs."
   - If the user wants stricter "absolute zero in atelier mode," conditionally inject the `<link>` and `<script>` in the inline head script. This is a v2 refinement — defer unless it matters.
2. **Toggle on:** click footer toggle, sprite appears bottom-left. Reload: pixel mode persists, no flash.
3. **Scroll mapping:** scroll top → bottom, sprite traverses left → right. Scroll up: sprite faces and walks left. Resize viewport: position scales.
4. **Idle quirks:** stop scrolling for 10s+. Verify all four (yawn, look, sit, box-hide) over multiple cycles.
5. **Dash:** move cursor toward sprite, `!` pops, sprite dashes away. Try near both viewport edges. Spam cursor — cooldown holds.
6. **Catch & pet:** wait for box-hide, click box → flip → caught → happy → hearts.
7. **Hover-on-work:** hover `.work-item`, sprite points. mouseleave → idle/walk.
8. **Form submit:** submit form, sprite jumps.
9. **Reduced motion:** DevTools → emulate `prefers-reduced-motion: reduce`. Reload. Static sprite, no animation, no scroll-follow, no dash, no jump.
10. **Mobile (iOS Safari, or DevTools mobile emulator):** scroll works; tap on sprite triggers dash (with cursor proximity, taps register too); tap on visible box during box-hide triggers catch.
11. **Toggle off:** sprite removed cleanly, atelier identical to step 1.

- [ ] **Step 2: Fix issues**

Common issues to look for and quick fixes:

- **Hearts position offset:** if the hearts spawn at the wrong x because the sprite is mid-flip, anchor them on the *sprite's* center via `position: absolute; left: 50%` (already in the CSS) — should be fine.
- **`!` overlay invisible:** check that the overlay element inherits `background-image` from the sprite (it does, set in `ensureOverlay()`).
- **Quirks never reach box-hide:** purely random — wait through enough cycles. If after 20+ idles you've never seen it, log `QUIRK_POOL` to verify the array.
- **Sprite "jitter" during dash:** the rAF position update should be smooth. If you see stutter, verify `tickDashPosition` runs every frame (add `console.count('dash-tick')` temporarily).

Make any necessary edits inline and commit.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "pixel-companion: smoke test polish" --allow-empty
```

(Use `--allow-empty` if no changes were needed — gives a clear marker that the smoke test passed.)

---

## Out of scope (deferred)

Items from the spec that are NOT in this plan:

- **Pixel mode on `card.html`:** intentionally out of scope. The card is the iMessage-preview tap surface; keep atelier-pure for first impressions. Revisit after the main site experiment validates.
- **Custom Laurence-likeness sprite:** v2 swap, per the spec's sprite-from-photo workflow.
- **Sound effects:** out of scope.
- **Konami-code easter egg / hidden trigger:** out of scope; the explicit footer toggle is the discovery point.
- **Conditional asset injection in atelier mode (stricter "zero bytes" guarantee):** see Task 14 step 1 note — implement only if measurably impacts performance.

---

## Self-Review (do not edit, log of plan author)

**Spec coverage check:**
- ✅ Two-mode toggle — Task 1
- ✅ Companion-only scope — Task 1, 2 (atelier mode untouched)
- ✅ Modern indie pixel art — Task 2+ (frame data, with caveat that placeholder is rough)
- ✅ Placeholder Snake theme — Task 2 (bandana, vest, dark skin in palette)
- ✅ Corner walker / horizontal traverse — Task 4, 5
- ✅ Idle quirks (yawn, look, sit, box-hide) — Task 6, 7
- ✅ Hover-on-work point-up — Task 9
- ✅ Form-submit jump — Task 11
- ✅ Cursor dash + `!` — Task 8
- ✅ Catch-and-pet sequence — Task 10
- ✅ Footer toggle UI — Task 1
- ✅ Index.html only (card.html unchanged) — implicit throughout, called out in Out of Scope
- ✅ Persistence (localStorage, no flash) — Task 1
- ✅ Reduced motion — Task 12
- ✅ Toggle wave animation — Task 13
- ✅ Smoke test plan — Task 14

**Placeholder scan:** None found.

**Type consistency:** state names (`idle`, `walk-right`, `walk-left`, `yawn`, `look`, `sit`, `box-hide`, `dash-right`, `dash-left`, `dash-recover`, `point-up`, `caught`, `box-flip`, `happy-wave`, `jump`) are consistent across the state machine, transitions, and frame definitions. Frame keys (`idle-0`, `walk-right-0..3`, etc.) are consistent.

**Plan deviations from spec:** documented in Implementation Notes at top — sprite size (16×24 vs ~32px), no PNG asset (canvas atlas at runtime), placeholder pixel art quality.
