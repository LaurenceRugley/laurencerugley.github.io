# LGR Web Studio — Roadmap & Idea Backlog

> Living doc of what's shipped and what we want for later upgrades.
> Last updated: 2026-05-29. `*.md` is excluded from `promote.sh`, so this stays
> internal (staging/source only, never shipped to production).

---

## ✅ Shipped to production (lgrwebstudios.com)

- **Lenis scroll correctness fix** — removed the global `scroll-behavior: smooth`
  that was fighting Lenis; added Lenis's official recommended CSS (the `.lenis`
  runtime classes). Kept our hand-rolled directional commit-snap (the official
  `lenis/snap` module isn't direction-aware → would regress "never yank back").
  Still on vendored Lenis v1.1.13 (upgrade to 1.3.x optional; would need
  re-testing the snap against `lenis.isScrolling`/`lenis.scroll`).
- **Companion "alive" core** — idle **watch** (turns to face the cursor) +
  **spring-lean** (≤6° eased tilt toward cursor) + **breathing** (procedural
  scaleY squash/stretch) + **uneven idle timing** + **walk bob** + **dash
  anticipation/squash**. All procedural on existing frames (no new art).
- **Battable physics ball** (`pixel/ball.js`) — fling it; gravity, floor/wall
  bounce, friction; bounces off the companion, who bats it as he walks. Fully
  decoupled from the engine (reads `.pixel-sprite` rect; gates on `data-pixel`).
- **Konami → real-3D gold trophy** (`fx/konami-trophy.js`) — owned, zero-dep
  raymarched SDF trophy (same pattern as `fx/hero-gradient.js`); lazy-loaded
  only when the code fires; spins + pops in; dismiss click/Esc/~7s.

All gated to `prefers-reduced-motion` and the companion easter-egg mode.

---

## 🔜 Next up (decided direction: **1 → 4, skip 3**)

### Option 4 — Pixi / shaders companion in the WebGL lab  ← the innovative path
- Render our **true-pixel** sprite in WebGL and wrap it in GPU effects: custom
  GLSL (dissolve / CRT / pixel-safe glow), particle trails, cursor-chase physics.
- Innovative **and** keeps the pixel soul. Free, fully owned, doubles as lab
  learning. Lives in the separate **`lgr-webgl-lab`** repo (Vite + Three.js +
  GLSL), worked in its own chat.
- When an effect is great, **port just the shader back** as an isolated `fx/`
  module on the static site (exactly how `fx/hero-gradient.js` was done).

### MGS action frames (after we have better art tooling)
- Add: **wall-press + peek**, **prone crawl**, an **amber "?" caution** pop
  (cousin of the red "!"), and a static **codec-call pose** (cheap "wow").
- These need *hand-authored pixel frames* → do them with the pipeline below, not
  by hand now (hand-typing char-strings now = throwaway once tooling exists).

### Art pipeline (no-pay path)
- Author frames in **LibreSprite** or **Piskel** (both free; Aseprite ~$20 is
  only a convenience).
- AI as *first draft only*: Flux dev / Retro Diffusion → **downscale +
  palettize** (the OP's open tools: Pixel Detector, Palettize) → **hand-clean to
  our grid** → export PNG sheet + JSON (frames + durations) → swap our ~40-line
  vanilla loader. The existing per-state frame-list **state machine is reusable**;
  only the frame *source* changes (char-arrays → atlas rects).

---

## 🎛️ Tuning notes
- **Trophy** (`fx/konami-trophy.js`): camera at `ro.z = 3.1` (raise = smaller).
  Shape lives in `mapTrophy()` (bowl/stem/base/handles SDFs). Spin speed
  `u_time*1.1`. Caption at `bottom: 9%`. All easy to nudge — eyeball live.
- **Animation magnitudes** (`pixel/pixel.js` → `applyTransform`): breathing
  `±0.025`, walk bob `2.5px`, dash squash `0.12`. Idle timing `[520, 880]`.

---

## 🧠 Pixel-art rules (from the r/StableDiffusion pro — keep as constraints)
- Pixel art = deliberate **limitation**: consistent grid, tight palette,
  perfect lines, intentional dithering, sparing anti-aliasing.
- **Avoid:** partial transparency/blending, glow, blur, random noise / over-detail.
- **Reuse colors** across the whole sprite; reserve **one** unique accent color
  for the focal point (the bandana / an eye glint — the "raven's green eye" trick).
- **Consistent outline** — outline the whole silhouette or none of it.
- **AI is a first draft, never the final** — always downscale + palettize + clean.
- Our advantage: the companion is **already true pixel art** (fixed grid +
  palette) — the one thing AI/vector can't fake. Build from that strength.

---

## 🅿️ Parked / backlog
- **Rive** — great for a future **client** mascot (smooth vector/skeletal), NOT
  the pixel companion (it'd bend pixels off-grid). Free editor tier + MIT runtime.
- **Phase 3** — type accent (mono) + tasteful kinetic type.
- **Phase 4** — client module library in the template factory.
- **Full 3D mascot (Three.js)** — future client module.

---

## 🚀 Deploy notes (so we don't re-discover this)
- **Staging / source of truth:** this repo → `https://laurencerugley.github.io`
  (GitHub Pages, auto-deploys on push to `main`).
- **Production:** `lgrwebstudios.com` (Cloudflare Worker, apex + www).
  Promote with:
  ```bash
  cd ~/Desktop/laurencerugley.github.io && git pull
  ~/Desktop/lgr-web-template/sites/lgr-web-studio/promote.sh        # or --dry first
  ```
  The script rsyncs web files into the Worker's `public/` (excludes `.git`,
  `.claude`, `*.md`, `CNAME`) and runs `npx wrangler deploy`.

---

## 🏠 Homage / IP line
Keep it an **original gruff-operative homage** — bandana + dark sneaking suit +
box + "!"/"?" are fair genre-stealth tropes. Do **not** use the names
"Snake / Solid Snake / Metal Gear", FOXHOUND/Konami logos, the infinity-bandana
mark, codec likenesses, or verbatim quotes.
