# Premium Motion + Template Factory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, no-build "premium motion" template (the *template factory*), then apply the same patterns to the LGR Web Studio site (laurencerugley.github.io) as the first real client of the system — adding tasteful scroll-reveals, smooth scroll, a light/dark theme toggle, and a glass header, while preserving the atelier brand and the pixel companion easter egg.

**Architecture:** Progressive enhancement, three layers. (1) Baseline HTML is fully usable with no CSS animation and no JS — content is always visible. (2) CSS adds theme tokens, layout, a native scroll-progress bar (`animation-timeline: scroll()`), glass, and micro-interactions, all guarded by `@supports` / `prefers-reduced-motion`. (3) A small vanilla JS file adds IntersectionObserver scroll-reveals, the theme toggle with localStorage persistence, and Lenis smooth scroll (loaded from CDN, same as the existing Google Fonts dependency). Reveals use IntersectionObserver (universal, including Firefox) rather than scroll-timeline so content is only ever hidden when we know we can reveal it. Native `animation-timeline: scroll()` is reserved for the continuous scroll-progress indicator where it shines.

**Tech Stack:** Vanilla HTML / CSS / JS. No build step. Lenis 1.x via CDN with SRI. Hosted static (GitHub Pages staging → Cloudflare Workers production). Brand tokens: ink `#2A2218`, gold `#B89968`, limestone `#EDE7D9`, slate `#5A4F3E`, line `#E5DDD0`; fonts Cormorant Garamond + Inter.

**Why no unit tests:** This is a no-build static site with no test runner, and the deliverable is visual/interaction behavior. Introducing a test framework would be YAGNI. Each task's verification is a concrete, repeatable browser/console check (run via the Chrome MCP against the local file or the GitHub Pages URL). These checks are the "tests."

**Ships as TWO PRs:** Phase A (template factory) merges first; Phase B (studio site) forks from the updated `main` and reuses the patterns. Standard project workflow: branch from `origin/main` → commit → PR → squash-merge → delete branch → verify.

---

## File Structure

**Phase A — `template-factory/` (self-contained, copy-pasteable starter):**
- `template-factory/index.html` — demo page, generic placeholder brand ("Atelier"), semantic sections, inline brand tokens, links its own `motion.css` + `motion.js`, CDN Lenis tag, no-flash head script.
- `template-factory/motion.css` — the reusable stylesheet: design tokens + light/dark theme, section layout primitives, typography scale, reveal/glass/micro-interaction utilities, scroll-progress bar, full `prefers-reduced-motion` handling.
- `template-factory/motion.js` — reusable logic: reduced-motion guard, IntersectionObserver reveal observer, theme toggle + persistence, Lenis init.
- `template-factory/README.md` — how to use it: which tokens to change, the section recipe, the "avoid AI-slop" curation checklist, and the pre-ship QA gate.

**Phase B — studio site (`/`, the first real application):**
- `motion.css` (repo root) — studio build of the motion system, atelier dark palette. Mirrors the `pixel.css` pattern (a feature layer in its own file).
- `motion.js` (repo root) — studio build of the motion logic (same shape as factory's).
- `index.html` (repo root) — rebuilt into multi-section scroll experience; sticky glass nav with theme toggle; reveal hooks on sections; **preserves** the contact form + its JS, the footer pixel toggle, the `pixel/*` script tags, and the no-flash head script (extended to also set `data-theme`).
- `pixel/pixel.css` (repo root) — small edit: make the few hardcoded ink overlay colors theme-aware so the pixel companion stays visible in dark mode.

---

## PHASE A — Template Factory

### Task A1: Scaffold the factory folder + semantic HTML skeleton

**Files:**
- Create: `template-factory/index.html`

- [ ] **Step 1: Create the HTML skeleton with no-flash head script, semantic sections, and asset links**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>
  // No-flash: apply saved theme before first paint.
  try {
    var t = localStorage.getItem('lgr-theme');
    if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
</script>
<title>Atelier — Premium Motion Template</title>
<meta name="description" content="A no-build premium-motion starter template.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="motion.css">
</head>
<body>
  <div class="scroll-progress" aria-hidden="true"></div>

  <header class="nav glass">
    <a class="nav-mark" href="#top">Atelier</a>
    <button type="button" class="theme-toggle" aria-pressed="false" aria-label="Toggle dark mode" title="Toggle dark mode">
      <span class="theme-toggle-icon" aria-hidden="true"></span>
    </button>
  </header>

  <main id="top">
    <section class="hero">
      <p class="eyebrow reveal">Studio · City</p>
      <h1 class="hero-title reveal">A line about the<br><em>craft</em> you sell.</h1>
      <p class="hero-sub reveal">One sentence of positioning that earns the scroll.</p>
      <a class="scroll-cue reveal" href="#approach" aria-label="Scroll to learn more"></a>
    </section>

    <section class="band" id="approach">
      <p class="section-label reveal">Approach</p>
      <div class="cards">
        <article class="card reveal"><h3>First value</h3><p>Short supporting line.</p></article>
        <article class="card reveal"><h3>Second value</h3><p>Short supporting line.</p></article>
        <article class="card reveal"><h3>Third value</h3><p>Short supporting line.</p></article>
      </div>
    </section>

    <section class="band" id="process">
      <p class="section-label reveal">Process</p>
      <ol class="steps">
        <li class="step reveal"><span class="step-n">01</span><div><h3>Discovery</h3><p>What happens here.</p></div></li>
        <li class="step reveal"><span class="step-n">02</span><div><h3>Design</h3><p>What happens here.</p></div></li>
        <li class="step reveal"><span class="step-n">03</span><div><h3>Build</h3><p>What happens here.</p></div></li>
        <li class="step reveal"><span class="step-n">04</span><div><h3>Care</h3><p>What happens here.</p></div></li>
      </ol>
    </section>

    <section class="band cta" id="contact">
      <p class="section-label reveal">Start</p>
      <h2 class="cta-title reveal">A closing line.</h2>
      <a class="btn reveal" href="#top">Call to action</a>
    </section>
  </main>

  <footer class="footer">Atelier · City</footer>

  <script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer crossorigin="anonymous"></script>
  <script defer src="motion.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the page loads with content visible (no CSS yet)**

Run (Chrome MCP): navigate to `file://<repo>/template-factory/index.html`, then `get_page_text`.
Expected: all section text present and visible (baseline must be readable with no styling).

- [ ] **Step 3: Commit**

```bash
git add template-factory/index.html
git commit -m "template-factory: HTML skeleton (semantic sections, no-flash theme head)"
```

---

### Task A2: motion.css — tokens, light/dark theme, layout, typography

**Files:**
- Create: `template-factory/motion.css`

- [ ] **Step 1: Write tokens, theme overrides, base layout, and type scale**

```css
/* motion.css — premium-motion starter. Progressive enhancement; brand via tokens. */
:root {
  --ink: #2A2218;
  --gold: #B89968;
  --bg: #EDE7D9;
  --surface: #ffffff;
  --text: #2A2218;
  --muted: #5A4F3E;
  --line: #E5DDD0;
  --serif: 'Cormorant Garamond', serif;
  --sans: 'Inter', -apple-system, sans-serif;
  --maxw: 920px;
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
}
[data-theme="dark"] {
  --bg: #211B12;
  --surface: #2C2417;
  --text: #EDE7D9;
  --muted: #B7A98E;
  --line: #3A3022;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  font-weight: 300;
  line-height: 1.6;
  transition: background-color 0.5s var(--ease), color 0.5s var(--ease);
}
main { display: block; }
section { padding: 96px 24px; }
.band { max-width: var(--maxw); margin: 0 auto; }
h1, h2, h3 { font-family: var(--serif); font-weight: 500; line-height: 1.15; }
.section-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.32em;
  color: var(--gold); margin-bottom: 28px; text-align: center;
}
```

- [ ] **Step 2: Add hero, nav, cards, steps, cta, footer layout**

```css
/* HERO */
.hero { min-height: 92vh; display: flex; flex-direction: column; justify-content: center;
  align-items: center; text-align: center; max-width: var(--maxw); margin: 0 auto; }
.eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.32em; color: var(--gold); margin-bottom: 20px; }
.hero-title { font-size: clamp(40px, 8vw, 76px); margin-bottom: 20px; }
.hero-title em { color: var(--gold); font-style: italic; }
.hero-sub { font-family: var(--serif); font-size: clamp(18px, 3vw, 24px); color: var(--muted); max-width: 30ch; }
.scroll-cue { margin-top: 56px; width: 22px; height: 34px; border: 1px solid var(--muted); border-radius: 12px; position: relative; }
.scroll-cue::after { content: ""; position: absolute; top: 7px; left: 50%; width: 3px; height: 7px;
  background: var(--gold); border-radius: 2px; transform: translateX(-50%); animation: cue 1.6s var(--ease) infinite; }
@keyframes cue { 0% { opacity: 0; transform: translate(-50%, 0); } 40% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, 12px); } }

/* NAV */
.nav { position: sticky; top: 0; z-index: 50; display: flex; justify-content: space-between;
  align-items: center; padding: 14px 24px; }
.nav-mark { font-family: var(--serif); font-size: 20px; font-weight: 500; color: var(--text); text-decoration: none; }
.glass { background: color-mix(in srgb, var(--bg) 72%, transparent); backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
@supports not (backdrop-filter: blur(10px)) { .glass { background: var(--bg); } }

/* CARDS */
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.card { background: var(--surface); border: 1px solid var(--line); padding: 28px 24px;
  transition: transform 0.35s var(--ease), border-color 0.35s var(--ease); }
.card:hover { transform: translateY(-4px); border-color: var(--gold); }
.card h3 { font-size: 24px; margin-bottom: 10px; }
.card p { color: var(--muted); }
@media (max-width: 680px) { .cards { grid-template-columns: 1fr; } }

/* STEPS */
.steps { list-style: none; max-width: 620px; margin: 0 auto; }
.step { display: flex; gap: 20px; padding: 22px 4px; border-bottom: 1px solid var(--line); align-items: baseline; }
.step-n { font-family: var(--serif); font-style: italic; font-size: 22px; color: var(--gold); min-width: 40px; }
.step h3 { font-size: 22px; margin-bottom: 4px; }
.step p { color: var(--muted); }

/* CTA + FOOTER */
.cta { text-align: center; }
.cta-title { font-size: clamp(28px, 5vw, 44px); margin-bottom: 28px; }
.btn { display: inline-block; background: var(--ink); color: var(--bg); text-decoration: none;
  padding: 16px 36px; font-family: var(--sans); font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.28em; transition: background-color 0.25s var(--ease); }
[data-theme="dark"] .btn { background: var(--gold); color: var(--ink); }
.btn:hover { background: var(--gold); color: var(--ink); }
.footer { text-align: center; padding: 32px 24px 48px; font-size: 10px; text-transform: uppercase;
  letter-spacing: 0.28em; color: var(--muted); }
```

- [ ] **Step 3: Verify styling renders in both themes**

Run (Chrome MCP): reload the file; `screenshot`. Then `preview_eval`/`javascript_tool`: `document.documentElement.setAttribute('data-theme','dark')`; `screenshot`.
Expected: light theme = limestone bg / ink text / gold accents; dark theme = deep ink bg / limestone text / gold pops. Glass nav blurs content beneath. Cards in a 3-up grid (1-up under 680px).

- [ ] **Step 4: Commit**

```bash
git add template-factory/motion.css
git commit -m "template-factory: tokens, light/dark theme, layout + type scale"
```

---

### Task A3: motion.css — reveal utility, scroll-progress, reduced-motion

**Files:**
- Modify: `template-factory/motion.css` (append)

- [ ] **Step 1: Append reveal utility (JS-gated) + native scroll-progress + reduced-motion block**

```css
/* SCROLL REVEAL — only hide content when JS+motion are available to reveal it.
   .js-reveal is added to <html> by motion.js when motion is allowed. */
html.js-reveal .reveal { opacity: 0; transform: translateY(26px);
  transition: opacity 0.7s var(--ease), transform 0.7s var(--ease); }
html.js-reveal .reveal.is-visible { opacity: 1; transform: none; }

/* SCROLL PROGRESS — native scroll-driven animation where supported. */
.scroll-progress { position: fixed; top: 0; left: 0; height: 2px; width: 100%;
  background: var(--gold); transform-origin: 0 50%; transform: scaleX(0); z-index: 60; }
@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .scroll-progress { animation: progress linear both; animation-timeline: scroll(root); }
  }
}
@keyframes progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* REDUCED MOTION — show everything, kill continuous motion. */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  html.js-reveal .reveal { opacity: 1; transform: none; transition: none; }
  .scroll-cue::after { animation: none; }
  .scroll-progress { display: none; }
  body, .card, .btn { transition: none; }
}
```

- [ ] **Step 2: Verify reveals + progress + reduced-motion**

Run (Chrome MCP): with `motion.js` not yet present, confirm content is fully visible (no `.js-reveal` on `<html>` → `.reveal` not hidden). Then in DevTools emulate `prefers-reduced-motion: reduce` and confirm `.scroll-progress` is hidden.
Expected: no content is ever invisible without JS; progress bar hidden under reduced motion.

- [ ] **Step 3: Commit**

```bash
git add template-factory/motion.css
git commit -m "template-factory: scroll-reveal utility, scroll-progress, reduced-motion"
```

---

### Task A4: motion.js — reduced-motion guard, reveal observer, theme toggle, Lenis

**Files:**
- Create: `template-factory/motion.js`

- [ ] **Step 1: Write the full motion script**

```js
/* motion.js — premium-motion starter logic. Pure progressive enhancement. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* THEME TOGGLE */
  var toggle = document.querySelector('.theme-toggle');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (toggle) toggle.setAttribute('aria-pressed', String(t === 'dark'));
    try { localStorage.setItem('lgr-theme', t); } catch (e) {}
  }
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(root.getAttribute('data-theme') === 'dark'));
    toggle.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  if (reduce) return; // No scroll-reveals, no smooth scroll under reduced motion.

  /* SCROLL REVEALS via IntersectionObserver (universal). */
  root.classList.add('js-reveal');
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* LENIS smooth scroll (CDN; degrade to native if unavailable). */
  if (window.Lenis) {
    var lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }
})();
```

- [ ] **Step 2: Verify behavior end-to-end**

Run (Chrome MCP): reload the file. Check `read_console_messages` (pattern `error`) → expect none. Confirm `<html>` gains `class="js-reveal"`. Scroll down → sections fade/translate in once. Click `.theme-toggle` → theme flips and persists across reload (localStorage `lgr-theme`). Wheel-scroll feels eased (Lenis active).
Expected: no console errors; reveals fire once each; theme persists; smooth scroll active.

- [ ] **Step 3: Commit**

```bash
git add template-factory/motion.js
git commit -m "template-factory: motion.js — reveals, theme toggle, Lenis (reduced-motion safe)"
```

---

### Task A5: Theme-toggle icon + Lenis SRI hardening + final factory polish

**Files:**
- Modify: `template-factory/motion.css` (append toggle icon)
- Modify: `template-factory/index.html` (add SRI integrity to Lenis tag)

- [ ] **Step 1: Add a CSS-only sun/moon toggle icon**

```css
/* THEME TOGGLE BUTTON */
.theme-toggle { background: none; border: 1px solid var(--line); border-radius: 999px;
  width: 36px; height: 36px; cursor: pointer; display: inline-flex; align-items: center;
  justify-content: center; color: var(--text); transition: border-color 0.2s var(--ease); }
.theme-toggle:hover, .theme-toggle:focus-visible { border-color: var(--gold); outline: none; }
.theme-toggle-icon { width: 14px; height: 14px; border-radius: 50%;
  box-shadow: inset 0 0 0 2px currentColor; transition: box-shadow 0.3s var(--ease); }
[data-theme="dark"] .theme-toggle-icon { box-shadow: inset -4px -4px 0 0 currentColor; border-radius: 50%; }
```

- [ ] **Step 2: Add SRI + crossorigin to the Lenis CDN tag**

Modify the Lenis `<script>` in `template-factory/index.html` to include an `integrity` hash (fetch the current hash for `lenis@1.1.13/dist/lenis.min.js` from jsDelivr's SRI tool at build-of-plan time; if unavailable, document self-hosting in README instead). Example shape:

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" integrity="sha384-REPLACE_WITH_REAL_HASH" crossorigin="anonymous" defer></script>
```

If a verified hash cannot be obtained, OMIT `integrity` (a wrong hash blocks the script) and instead vendor `lenis.min.js` locally per the README hardening note.

- [ ] **Step 3: Verify icon + script integrity**

Run (Chrome MCP): reload; toggle theme → icon morphs sun↔moon; `read_network_requests` (pattern `lenis`) → 200, not blocked.
Expected: icon animates; Lenis loads successfully.

- [ ] **Step 4: Commit**

```bash
git add template-factory/index.html template-factory/motion.css
git commit -m "template-factory: theme-toggle icon + Lenis integrity"
```

---

### Task A6: README — usage, curation checklist, QA gate

**Files:**
- Create: `template-factory/README.md`

- [ ] **Step 1: Write the README**

Content must include, in full prose (no placeholders):
1. **What it is** — a no-build premium-motion starter; copy the folder, swap tokens + copy, ship.
2. **Customize** — the exact token list in `:root` and `[data-theme="dark"]` to change for brand; the two Google Fonts to swap; where to edit hero/section copy.
3. **Section recipe** — Hero → Approach (3 cards) → Process (steps) → CTA; add `class="reveal"` to anything that should animate in.
4. **Avoid AI-slop (curation rules)** — restrained palette (2–3 colors max), real copy not lorem, generous whitespace, one accent color, motion that supports content rather than distracts; cite the video's own line that AI output is generic without human input.
5. **Pre-ship QA gate (checklist)** — no console errors; works with JS disabled (content visible); `prefers-reduced-motion` respected; keyboard focus visible; color contrast AA in both themes; mobile layout at 375px; Lighthouse performance check; images compressed; theme persists.
6. **Hardening note** — how to self-host `lenis.min.js` (MIT) instead of CDN for zero third-party runtime.

- [ ] **Step 2: Commit**

```bash
git add template-factory/README.md
git commit -m "template-factory: README — usage, curation rules, QA gate"
```

---

### Task A7: PR + merge Phase A

- [ ] **Step 1: Push branch and open PR**

```bash
git push -u origin template-factory
gh pr create --title "Template factory: no-build premium-motion starter" --body "$(cat <<'EOF'
## Summary
- New reusable starter in template-factory/ (HTML + motion.css + motion.js + README)
- Light/dark theme toggle, IntersectionObserver scroll-reveals, native scroll-progress, glass nav, Lenis smooth scroll
- Fully progressive: content visible with no JS; prefers-reduced-motion fully respected

## Test plan
- [ ] Loads with content visible, no console errors
- [ ] Theme toggle flips + persists; no-flash on reload
- [ ] Reveals fire once each on scroll
- [ ] Reduced-motion: no reveals/progress/smooth-scroll, content visible
- [ ] Mobile 375px layout intact
EOF
)"
```

- [ ] **Step 2: Squash-merge, delete branch, confirm**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## PHASE B — Apply to the LGR Web Studio site

> Fork a fresh branch from the updated `main` after Phase A merges.

```bash
git checkout main && git pull && git checkout -b studio-premium
```

### Task B1: Add studio motion.css + motion.js (brand-adapted port)

**Files:**
- Create: `motion.css` (repo root)
- Create: `motion.js` (repo root)

- [ ] **Step 1: Create root `motion.css`** — copy `template-factory/motion.css`, then adapt: keep the existing studio tokens (`--ink/--gold/--limestone/--slate/--line`) AND add the new `--bg/--surface/--text/--muted` aliases so both the old inline rules and new sections work. Add the `[data-theme="dark"]` atelier palette (bg `#211B12`, surface `#2C2417`, text `#EDE7D9`, muted `#B7A98E`, line `#3A3022`). Keep all reveal/glass/scroll-progress/reduced-motion utilities verbatim from the factory.

- [ ] **Step 2: Create root `motion.js`** — identical logic to `template-factory/motion.js` (theme toggle, IO reveals, Lenis, reduced-motion guard). It must NOT touch pixel-mode state.

- [ ] **Step 3: Verify files parse**

Run: `node --check motion.js` (syntax only) → no error. (CSS has no checker; visual check happens in B5.)
Expected: `node --check` exits clean.

- [ ] **Step 4: Commit**

```bash
git add motion.css motion.js
git commit -m "studio: add brand-adapted motion system (css + js)"
```

---

### Task B2: Rebuild index.html into multi-section scroll experience

**Files:**
- Modify: `index.html` (repo root)

- [ ] **Step 1: Extend the no-flash head script to also set `data-theme`**

Keep the existing pixel-pending block; ADD theme handling (same as factory Step A1) so theme + pixel both apply before paint. Add `<link rel="stylesheet" href="motion.css">` after the pixel.css link.

- [ ] **Step 2: Replace the body with sticky glass nav + sections, writing REAL atelier copy (no lorem)**

Markup structure (sections get `class="reveal"` hooks):
- **Sticky glass nav** (`.nav.glass`): `LGR Web Studio` mark (left) + theme toggle button (right). Theme toggle button uses the same `.theme-toggle` markup/aria as the factory.
- **Hero** (`.hero`): eyebrow `Pasadena · California`; `h1` "Custom websites, built like <em>furniture</em>." (or similar atelier line — final copy chosen during execution from existing positioning); hero-sub from the current intro ("Designed and built in-house for product brands and service businesses."); `.scroll-cue` to `#work`.
- **Approach** (`.band#approach`, 3 `.card`): real value props derived from the brand — e.g. "In-house craft" (no outsourcing, Pasadena), "Built to last" (no-build static, fast, durable), "Cared for" (maintenance retainers). Use the README's actual positioning, not invented claims.
- **Process** (`.band#process`, `.steps` ol): Discovery → Design → Build → Care, one line each, reflecting the real intake→proposal→build→retainer pipeline.
- **Recent Work** (`.band#work`): the existing two links (`alsoknownas.la`, `savycolours.com`) rebuilt as `.work-item` rows with reveal; keep `target="_blank" rel="noopener"`.
- **Start a project** (`.band#start`): the EXISTING `<section class="form-section">` form, unchanged in behavior (same Formspree action, same field names, same `#success` block, same submit JS at the bottom). Wrap with a `.section-label`/reveal as appropriate.
- **Footer**: keep the existing footer EXACTLY — `LGR Web Studio · Pasadena, CA · [pixel-toggle button] · email`. Do not remove the pixel toggle.

- [ ] **Step 3: Keep the script tags intact at the end of body**

Order: existing form-submit `<script>` (unchanged) → Lenis CDN tag → `<script defer src="motion.js"></script>` → `<script defer src="pixel/sprite-frames.js"></script>` → `<script defer src="pixel/pixel.js"></script>`. The form success path must still call `window.PixelEngine.celebrate()`.

- [ ] **Step 4: Verify structure loads**

Run (Chrome MCP): navigate to the local `index.html`; `get_page_text` → all sections + form present; `read_console_messages` (pattern `error`) → none.
Expected: full multi-section page, form intact, no errors.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "studio: rebuild into multi-section scroll experience with glass nav + theme toggle"
```

---

### Task B3: Migrate existing inline styles into the themed system

**Files:**
- Modify: `index.html` (inline `<style>`)
- Modify: `motion.css` if shared rules belong there

- [ ] **Step 1: Update inline styles to use theme tokens**

Change the existing inline rules that hardcode brand colors so they read from the tokens that flip with theme: `.form-section { background: var(--surface); }`, inputs `background: var(--bg)` / focus `background: var(--surface)`, `.work-item` colors → `var(--text)`/`var(--muted)`, success/intro keep gold. Ensure the `body` no longer fights `motion.css` (remove the old fixed `flex` centering that assumed a single short screen; the page now scrolls).

- [ ] **Step 2: Verify both themes look right and form is legible**

Run (Chrome MCP): toggle dark; screenshot the form section.
Expected: form readable in dark (dark surface, light text, gold focus ring); light unchanged from before.

- [ ] **Step 3: Commit**

```bash
git add index.html motion.css
git commit -m "studio: theme-aware form + work styles"
```

---

### Task B4: Pixel companion dark-theme compatibility

**Files:**
- Modify: `pixel/pixel.css`

- [ ] **Step 1: Make hardcoded ink overlay colors theme-aware**

The pixel effects that hardcode `#2A2218` (e.g. `.pixel-z`, `.pixel-codec-dot` text) become invisible on the dark background. Replace those specific ink values with `var(--text)` (or a dedicated `--pixel-ink` token defaulting to ink) so the floating "Z", etc. stay visible in both themes. Do NOT change the sprite atlas colors (canvas-drawn, fine on both) or the shadow.

- [ ] **Step 2: Verify pixel mode in both themes**

Run (Chrome MCP): toggle pixel mode on; trigger idle long enough for sleep "Z" / use `window.PixelEngine` hooks; toggle dark theme; confirm the Z and codec dot are visible in both.
Expected: companion + its overlays visible in light and dark.

- [ ] **Step 3: Commit**

```bash
git add pixel/pixel.css
git commit -m "studio: pixel overlays use theme-aware ink so they show in dark mode"
```

---

### Task B5: Full verification pass

- [ ] **Step 1: Run the QA gate against the local file (Chrome MCP)**

Verify, recording results:
1. No console errors (`read_console_messages` pattern `error`).
2. JS-disabled safety: temporarily confirm `.reveal` elements are visible when `js-reveal` is absent (content never trapped invisible).
3. Reveals fire once on scroll; `<html>` has `js-reveal`.
4. Theme toggle flips + persists across reload; no flash (head script).
5. `prefers-reduced-motion: reduce` emulation → no reveals-hidden, no progress bar, no smooth scroll, content visible.
6. Mobile width 375px (`resize`) → nav, hero, cards (1-up), form all intact.
7. Pixel mode still works (toggle on, companion appears, walks, form success still celebrates) in both themes.
8. Lenis loads (network 200) and wheel scroll feels eased.
9. Keyboard: Tab reaches theme toggle + pixel toggle + form fields with visible focus.

- [ ] **Step 2: Fix any issues found, re-commit as needed.**

---

### Task B6: PR, merge, verify live

- [ ] **Step 1: Push + PR**

```bash
git push -u origin studio-premium
gh pr create --title "Studio site: premium motion redesign (multi-section, theme toggle, scroll-reveals)" --body "$(cat <<'EOF'
## Summary
- Rebuilt index.html into a multi-section scroll experience (hero, approach, process, work, contact)
- Added light/dark theme toggle (no-flash, persisted), IntersectionObserver scroll-reveals, native scroll-progress, glass sticky nav, Lenis smooth scroll
- Preserved the contact form, the pixel companion easter egg, and full reduced-motion support; pixel overlays now theme-aware

## Test plan
- [ ] No console errors; content visible with JS disabled
- [ ] Theme toggle persists + no flash; both themes pass contrast
- [ ] Reveals fire once; reduced-motion fully respected
- [ ] Pixel mode works in both themes; form success still celebrates
- [ ] Mobile 375px layout intact; Lenis loads
EOF
)"
```

- [ ] **Step 2: Squash-merge, delete branch, wait for GitHub Pages, verify live**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```
Then verify `https://laurencerugley.github.io` (allow ~1 min for Pages build): all sections, theme toggle, reveals, pixel mode.

- [ ] **Step 3: (Deferred, on user go-ahead) Promote to production** via `~/Desktop/lgr-web-template/sites/lgr-web-studio/promote.sh` after `cd ~/Desktop/laurencerugley.github.io && git pull`.

---

## Self-Review

**Spec coverage:**
- Template factory (reusable premium-motion starter) → Phase A (A1–A7). ✓
- Apply "everything proposed" to the studio site → Phase B: scroll-reveals (B2/B1), Lenis smooth scroll (B1), day/night toggle (B1/B2/B3), glass hero/nav (B2), section structure hero→capabilities→process (B2), micro-interactions (cards/work hover in motion.css). ✓
- Preserve brand + pixel companion → B2 keeps footer toggle + scripts; B4 makes overlays theme-aware. ✓
- Reduced-motion + accessibility + no-build constraints → enforced in every CSS/JS task and the B5 QA gate. ✓

**Placeholder scan:** The only intentional placeholder is the Lenis SRI hash (Task A5), explicitly flagged with a fallback (omit integrity / vendor locally). Hero/section copy is specified to be written from real brand positioning during execution (B2), not lorem. No "TODO/handle edge cases" hand-waving remains.

**Type/name consistency:** `--bg/--surface/--text/--muted/--line/--gold/--ink` tokens, `.reveal`/`.is-visible`/`js-reveal`, `.theme-toggle`/`aria-pressed`, `data-theme`, `lgr-theme` localStorage key — all used identically across Phase A and Phase B. ✓
