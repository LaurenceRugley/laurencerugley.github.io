# Pixel-You — Design Spec

**Date:** 2026-05-13
**Author:** Laurence A. Rugley (brainstormed with Claude)
**Repo:** `laurencerugley.github.io`
**Scope:** `index.html` only — `card.html` unchanged

---

## Purpose

Add a discoverable "pixel mode" toggle to the LGR Web Studio landing page that reveals a 32px modern-indie pixel-art companion ("pixel-you"). Atelier mode (default) renders byte-identical to today; pixel mode adds the companion only — no other visual changes to the site.

## Brand context

The current site is a refined editorial "digital atelier": Cormorant Garamond serif, limestone/gold/ink palette, deliberately quiet. Pixel mode is the personality flip — a Snake-inspired companion that walks along the bottom of the viewport as you scroll, hides under a cardboard box when idle, dashes away from the cursor, and only lets you pet him when you catch him hiding.

## Decisions

| Decision | Choice |
|---|---|
| Direction | Two-mode toggle (atelier default + pixel mode) |
| Pixel-mode scope | Companion only — atelier visuals untouched |
| Sprite style | Modern indie pixel art (~32px tall), Stardew/Celeste influence |
| Likeness (v1) | Placeholder Snake-themed character — Black, medium-dark complexion, bandana, tactical vest |
| Likeness (v2) | Swap-the-PNG operation later, after sprite-from-photo workflow |
| Scroll behavior | Horizontal traversal across viewport bottom, mapped to scroll progress |
| Reactions | Idle quirks (yawn / look / sit / box-hide), point-on-hover-work, jump-on-form-submit, dash-on-cursor-proximity, catch-and-pet when hiding under box |
| Toggle UI | Small 16px pixel-head icon in footer |
| Pages affected | `index.html` only |
| Sprite production (v1) | Placeholder generated/drawn upfront; engineering work decoupled from likeness |

## File structure

```
laurencerugley.github.io/
├── index.html              modified: footer toggle button, <link> + <script> tags, body data attribute
├── card.html               unchanged
└── pixel/
    ├── pixel.css           mode visibility, sprite styles, animations, particles
    ├── pixel.js            state machine, scroll listener, reactions, persistence, lazy asset load
    ├── pixel-laurence.png  sprite sheet (~32 frames, single horizontal row, ~1024px wide)
    └── pixel-toggle.svg    16px footer toggle icon (inline SVG preferred to avoid extra request)
```

## Mode model

- A `data-pixel="on"` attribute on `<body>` controls visibility of all pixel features.
- The attribute is set **synchronously** in an inline `<head>` script that reads `localStorage['lgr-pixel-mode']`, so first paint already reflects the user's saved mode (no flash).
- All pixel CSS rules are scoped under `body[data-pixel="on"]`. Atelier mode = attribute absent = zero pixel rules apply = page renders identically to today.
- `pixel.js` is loaded with `defer`. On load, if mode is "on" it appends the sprite container and starts the state machine. If mode is "off" it just wires up the toggle button.

## Sprite sheet

Single PNG, 32×32 frames, one horizontal row, ~32 frames, ~1024px wide. Total file ~15–20 KB.

| State | Frames | Notes |
|---|---|---|
| `walk-right` | 4 | classic walk cycle, ~120ms/frame |
| `walk-left` | (mirrored via CSS `transform: scaleX(-1)`) | reuses `walk-right` frames |
| `idle` | 2 | gentle breath bob, ~600ms/frame |
| `idle-yawn` | 3 | stretch + open mouth |
| `idle-look` | 3 | head turn left → center → right |
| `idle-sit` | 2 | sit + small bob |
| `idle-box-hide` | 4 | pull box from offscreen, drop overhead, hidden, occasional peek |
| `box-flip` | 1 frame + CSS rotate | box tumbles off when caught |
| `caught` | 1 | surprised pose, arms up |
| `happy-wave` | 1 + reuses `jump` | celebration after catch |
| `point-up` | 2 | arm raised for `.work-item` hover |
| `jump` | 3 | crouch / mid-air / land — used for form submit + happy |
| `dash-sprint` | 2 | fast walk frames, played at ~60ms/frame |
| `dash-alert` | 1 | crouched alert pose held briefly after a dash |
| `!` icon | 1 (~8×8) | overlay sprite, used for catch reveal + dash spotting |

Rendering: CSS `background-image` + `background-position` + `animation` with `steps()` for frame-based playback. `image-rendering: pixelated;` to preserve hard edges. Displayed at 2× scale (64×64 on screen). Single shared DOM node for the sprite; the `!` icon is a separate child element shown only during the alert/catch beats.

## State machine

```
                         scroll ──► walk-right / walk-left
                                          │
                                          ▼  (200ms no scroll)
        hover .work ─────────────────► idle ──── 10s no input ──► random quirk
        mouseleave ◄────────────────────                              │
                                                       ┌──────────────┼──────────────┐
                                                       ▼              ▼              ▼
                                                     yawn           look           sit
                                                       │              │              │
                                                       └──────────────┴──────────────┘
                                                                      ▼
                                                                  box-hide
                                                                      │
                                              clicked in time ◄───────┤
                                                       │              └─ 4s ──► emerge ──► idle
                                                       ▼
                                                  box-flip ──► caught ──► happy ──► idle

        cursor proximity (≤ 60px, not in box-hide) ─► dash ─► alert ─► idle/walk
        form-submit success ───────────────────────► jump ──────────► idle
```

**Transition rules:**

- `scroll` event → `walk-right` or `walk-left` depending on `sign(scrollY − lastScrollY)`.
- 200ms of no scroll → `idle`.
- 10s in `idle` → randomly pick from `{ yawn, look, sit, box-hide }` (uniform 25% each).
- Quirks return to `idle` after their own duration (yawn ~1.2s, look ~1.8s, sit ~2.4s, box-hide up to 4s).
- `mouseenter` on a `.work-item` (when currently in `idle` or `walk-*`) → `point-up`. `mouseleave` → previous walk/idle state.
- Cursor distance to sprite ≤ 60px AND not currently in `box-hide` AND dash cooldown elapsed (1s) → `dash`. Dashes opposite the cursor direction. If it would clip the viewport edge, dashes the other way instead.
- Click on sprite (only valid in `idle-box-hide`) → `box-flip` → `caught` → `happy` → `idle`. Total ~1.6s.
- Form submit success (hooked into existing Formspree handler in `index.html`) → `jump` → `idle`.

## Scroll → position mapping

```js
const margin = 24;
const spriteW = 64; // 32px native × 2× scale
const max = window.innerWidth - spriteW - margin * 2;
const percent = window.scrollY / (document.scrollHeight - window.innerHeight);
const x = margin + percent * max;
sprite.style.transform = `translateX(${x}px)${facingLeft ? ' scaleX(-1)' : ''}`;
```

- At 0% scroll → far left, 24px from edge.
- At 100% scroll → far right, 24px from edge.
- Updated inside a `requestAnimationFrame` callback; scroll and mousemove handlers do not write to the DOM directly.
- Recomputed on `resize`.

## Toggle UI

Footer markup gains:

```html
<button class="pixel-toggle" type="button" aria-pressed="false" aria-label="Toggle pixel companion">
  <!-- inline SVG: 16px pixel-head silhouette -->
</button>
```

Placement: between the existing "Pasadena, CA" text and the email link in the footer of `index.html`. Sized to ~16×16, ink color in atelier mode, gold-tinted in pixel mode. In pixel mode it gets a subtle micro-wave animation (suppressed under reduced motion). The button is the only persistent visible pixel element when atelier mode is loaded — it's the discovery point.

Click handler:

1. Read current `body[data-pixel]` attribute.
2. Flip it (`"on"` ↔ remove).
3. Write `localStorage['lgr-pixel-mode']` to match.
4. Update `aria-pressed`.
5. If now "on" and assets not yet loaded → fetch sprite sheet and initialize state machine.
6. If now "off" → remove sprite DOM node, stop rAF loop.

## Persistence

- Key: `localStorage['lgr-pixel-mode']` — value `"on"` or absent.
- Read in an inline `<head>` script, BEFORE the existing stylesheet `<link>`, so the `body[data-pixel="on"]` attribute is present at first paint and CSS rules apply without flash.
- Inline script is ~8 lines, no external dependency.
- `pixel.js` is deferred and only initializes the state machine if attribute is "on".

## Accessibility

- Sprite container: `aria-hidden="true"` — purely decorative.
- Toggle: real `<button>` with `aria-pressed` and `aria-label`. Keyboard activatable. Visible focus ring (gold outline matching brand).
- `prefers-reduced-motion: reduce` handling: pixel mode renders a single static standing sprite in the bottom-left corner. **No scroll-following, walk cycle, quirks, dash, or particles.** Toggle still works; click-on-sprite has no reaction. This respects the OS-level preference while still letting the user know the feature exists.
- The footer toggle's micro-wave animation is also suppressed under reduced motion.

## Performance

- Atelier mode network payload: **0 bytes added** (sprite assets lazy-loaded on first toggle-on).
- Pixel mode payload: ~20 KB PNG + ~6 KB JS + ~3 KB CSS ≈ **~30 KB total**.
- Scroll and mousemove handlers consolidated into one `requestAnimationFrame` loop — one paint cycle per update.
- One added DOM node (sprite container) + one child for the `!` overlay + the footer toggle button.
- No external dependencies, no extra font weights, no third-party scripts.

## Sprite-from-photo workflow (v2 likeness)

For replacing the placeholder with Laurence's actual likeness after the scaffolding ships:

**Recommended primary tool:** [Aseprite](https://www.aseprite.org/) — $20 one-time, the industry standard for pixel art (used on Stardew Valley, Celeste). Native sprite-sheet export, onion-skinning for walk cycles, palette management. Same 32×32 grid as the placeholder, drop the exported PNG into `pixel/pixel-laurence.png` — no code changes required.

**Optional AI starting point:**
- **PixelMe** (web, paid) — fastest photo-to-pixel-art converter.
- **Retro Diffusion** — Stable Diffusion model trained specifically on pixel art.
- **PixelLab** (pixellab.ai) — designed for game sprites, can generate walk-cycle frames.

**Practical workflow:** PixelMe to generate a base 32×32 portrait from a clear photo → import into Aseprite → redraw / clean up / extend to all required animation frames using onion-skinning → export as single horizontal sprite sheet → swap the file.

## Testing plan

Manual smoke tests, no automated suite (everything is interactive and visual):

1. **Atelier purity:** loaded fresh, page is visually identical to current main; network panel shows no `pixel/*` asset loads.
2. **Toggle on:** click footer toggle, sprite appears bottom-left. Reload: pixel mode persists, no flash.
3. **Scroll mapping:** scroll top → bottom, sprite traverses left → right with walk cycle. Scroll up: sprite faces and walks left. Resize viewport: position scales smoothly.
4. **Idle quirks:** stop scrolling for 10s+, observe yawn / look / sit / box-hide cycling over multiple idle periods.
5. **Dash:** move cursor toward sprite, `!` pops, sprite dashes away. Test near both viewport edges — dashes the other direction. Spam cursor to verify cooldown.
6. **Catch & pet:** wait for box-hide quirk, click the box, verify flip → caught → happy → CSS hearts → idle.
7. **Hover-on-work:** hover `.work-item`, sprite points. mouseleave → returns to walk/idle.
8. **Form submit:** submit form (Formspree responds), sprite jumps once.
9. **Reduced motion:** DevTools → Rendering → emulate `prefers-reduced-motion: reduce`. Reload in pixel mode: static sprite only, no animation, no scroll-follow, no dash.
10. **Mobile (iOS Safari):** scroll behavior works; tap on sprite triggers dash; tap on visible box during hide triggers catch.
11. **Toggle off:** click toggle while in pixel mode, sprite removed cleanly, atelier identical to step 1.

## Out of scope (deferred)

- Pixel mode on `card.html` (revisit after main site experiment validates).
- Sound effects.
- Multiple costume options.
- "Konami code" easter eggs.
- Custom Laurence-likeness sprite (handled by v2 workflow above).
