# Hero Build-In Entrance (letterpress shader-press) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a genuinely first/cold page load this visit, the WebGL hero opens on the Letterpress scene and plays the lab's new `createBuildIn` "press" choreography (the brand ampersand stamping into the paper) before settling into the existing 7-scene tonal-alternation ring — sourced from a freshly re-vendored engine bundle.

**Architecture:** Re-vendor `vendor/lgr-engine-hero.es.js` from the lab's `packages/engine-core/dist-lib/lgr-engine-core.es.js` (the same bundle already vendored today, now rebuilt with `createBuildIn` + the letterpress shader-press). In `fx/engine-hero.js`, gate a one-time `sessionStorage` flag to detect a cold load; on a cold load only, rotate the scene-ring array so Letterpress is index 0, wrap its `update()` to also drive a `createBuildIn` instance, and call `.play('press', …)` in the same `requestAnimationFrame` callback that reveals the canvas. Every other load (including the reduced-motion path, which `createBuildIn` snaps to the assembled frame internally) is byte-identical to today.

**Tech Stack:** Vanilla ES modules, Three.js (via the vendored engine bundle), Playwright (`playwright-core`) for the existing verify-*.mjs regression suite.

## Global Constraints

- Vendor swap must come from `packages/engine-core/dist-lib/lgr-engine-core.es.js` in the lab repo (confirmed by content signature + `tools/size-budget.mjs`'s own `LAB_CORE` path — NOT `lgr-engine-hero.es.js`, despite the site-side filename).
- **Provenance correction (surfaced, not silently fixed):** the brief cites lab commit `64c075b` as "provenance-anchored BYTE-CURRENT, batch CI-green" — that commit predates `createBuildIn` entirely (it was added 8 commits later, at `7a4e73b`). The actual dist-lib content to vendor was last changed at `b608159` ("feat(letterpress): shader-press build-in"), shipped in the pushed + CI-green commit `a1d8f89` (`gh run list` confirms success), and is byte-identical through the lab's current local HEAD `02b1fe4b` (confirmed via `git diff --stat a1d8f89 HEAD -- packages/engine-core/dist-lib/` → empty). Cite `b608159` / `a1d8f89` in the re-vendor commit message, not `64c075b`.
- sha256 of the source bundle at vendor time: `805c7364261948dd0fc66ab2201046a52228b698be4c7f760c80cd8a7141adc0` (`packages/engine-core/dist-lib/lgr-engine-core.es.js`). Re-verify this hash if any more time passes before Task 1 executes — the lab is an active repo.
- Design decision (owner-ratified): letterpress leads via a **one-time cold-load array rotation**, not a permanent reorder and not a separate splash screen. Every load that isn't a qualifying cold load keeps the existing "always opens on First Light" order untouched.
- `createBuildIn`'s reduced-motion handling is internal (snaps to `t=1`, no animated frames, resolves immediately) — do not add a separate reduced-motion branch in site code; let it pass through.
- Storage-key convention in this repo (see `motion.js:17`): kebab-case, `lgr-` prefixed, wrapped in `try { } catch (e) {}`.
- Never hardcode the vendor path+version outside `fx/vendor-engine-url.js` (existing ONE-THREE / double-fetch-bug rule, `fx/vendor-engine-url.js:1-38`).
- Local verify scripts assume a static server already running at `http://localhost:8743/` (see any `tools/verify-*.mjs` usage comment).

---

### Task 1: Re-vendor the engine bundle

**Files:**
- Modify: `vendor/lgr-engine-hero.es.js` (binary/text overwrite, full replace)
- Modify: `fx/vendor-engine-url.js:39` (bump `?v=6` → `?v=7`, add re-vendor header note)
- Modify: `fx/engine-hero.js:1-49` (header comment: add a dated re-vendor note, matching the file's existing convention)

**Interfaces:**
- Produces: `VENDOR_ENGINE_URL` continues to resolve to `vendor/lgr-engine-hero.es.js?v=7`, whose export set now includes `createBuildIn` (new) alongside the existing `createEngineCore`, `createFirstLight`, `createLetterpress`, `createDuskSilk`, `createConstellation`, `createProductMoment`, `createAurora`, `createCathedralLight`, `createHeroDirector`, `createSmoothScroll`, `createCameraDirector`, `createBeautyPresenter`.

- [ ] **Step 1: Copy the bundle**

```bash
cp /Users/lencho/dev/lgr-webgl-lab/packages/engine-core/dist-lib/lgr-engine-core.es.js \
   /Users/lencho/Desktop/laurencerugley.github.io/vendor/lgr-engine-hero.es.js
```

- [ ] **Step 2: Verify the export landed and the hash matches**

```bash
grep -c "createBuildIn" vendor/lgr-engine-hero.es.js   # expect: 4 (matches lab's own count)
shasum -a 256 vendor/lgr-engine-hero.es.js             # expect: 805c7364261948dd0fc66ab2201046a52228b698be4c7f760c80cd8a7141adc0
```

Expected: both match. If the hash doesn't match, the lab repo changed since this plan was written — re-read `packages/engine-core/dist-lib/lgr-engine-core.es.js`'s current hash and note the discrepancy before continuing (Rule 0 — don't silently proceed on a stale assumption).

- [ ] **Step 3: Bump the version and note provenance in `fx/vendor-engine-url.js`**

Edit line 39 and append a new paragraph to the header comment (after the existing 2026-07-22 Lenis-swap paragraph, before the `export`):

```js
   2026-07-22 (the build-in swap): re-vendored again from the lab's lgr-engine-core
   dist-lib build (sha256 805c7364261948dd0fc66ab2201046a52228b698be4c7f760c80cd8a7141adc0)
   for the new createBuildIn export (entrance/assembly choreography) and the
   letterpress shader-press (pack.setBuild). Source: lab commit b608159
   ("feat(letterpress): shader-press build-in"), shipped in the pushed +
   CI-green commit a1d8f89 — NOT the 64c075b "provenance anchor" commit, which
   predates createBuildIn entirely (see docs/superpowers/plans/2026-07-21-hero-
   buildin-entrance.md for the full discrepancy note). dist-lib content is
   byte-identical from b608159 through the lab's HEAD at vendor time. */
export const VENDOR_ENGINE_URL = new URL('../vendor/lgr-engine-hero.es.js?v=7', import.meta.url).href;
```

- [ ] **Step 4: Run the automated drift + budget check**

```bash
npm run budget
```

Expected: `VENDOR-hash drift vs lab dist-lib:` prints `MATCH  <hash>`, and `vendor/lgr-engine-hero.es.js` stays under the 380 KB gzip budget. If it prints a mismatch, Step 1 didn't copy the file you think it did — stop and re-check the source path.

- [ ] **Step 5: Commit**

```bash
git add vendor/lgr-engine-hero.es.js fx/vendor-engine-url.js
git commit -m "$(cat <<'EOF'
chore(vendor): re-vendor engine bundle for createBuildIn + letterpress shader-press

sha256 805c7364261948dd0fc66ab2201046a52228b698be4c7f760c80cd8a7141adc0,
sourced from lab commit b608159 (shipped in pushed+CI-green a1d8f89) — not
64c075b, which predates createBuildIn. ?v bumped 6 -> 7.
EOF
)"
```

---

### Task 2: Wire the cold-load build-in into `fx/engine-hero.js`

**Files:**
- Modify: `fx/engine-hero.js:52-92` (the `boot(mount)` function)

**Interfaces:**
- Consumes: `lib.createBuildIn(pack)` → `{ play(choreo, opts), update(dt), … }` (Task 1's re-vendored bundle); `lib.createLetterpress(core)` → pack with `.update(dt, elapsed)` and `.setBuild(t)`.
- Produces: no new exports — this is a leaf module. `window.__heroDirector` keeps its existing shape.

- [ ] **Step 1: Replace the scene-array construction and add the cold-load gate**

In `fx/engine-hero.js`, replace lines 61–74 (the `const scenes = [...]` block) with:

```js
      // COLD-LOAD GATE: "once per visit" per the design brief — sessionStorage
      // (not localStorage) so it resets per new session/tab but persists across
      // page navigations within one visit, matching this multi-page static site.
      var COLD_LOAD_KEY = 'lgr-hero-build-in';
      var isColdLoad = false;
      try { isColdLoad = !sessionStorage.getItem(COLD_LOAD_KEY); } catch (e) {}
      if (isColdLoad) { try { sessionStorage.setItem(COLD_LOAD_KEY, '1'); } catch (e) {} }

      // The 7 bespoke scenes — see the header comment above for the tonal-
      // alternation reasoning behind the default order.
      var firstLight = lib.createFirstLight(core, { starBrightness: 1.05 }); // dark, dawn
      var letterpress = lib.createLetterpress(core);     // bright
      var duskSilk = lib.createDuskSilk(core);            // dark
      var constellation = lib.createConstellation(core);  // dark
      var productMoment = lib.createProductMoment(core);  // bright
      var aurora = lib.createAurora(core);                // dark
      var cathedralLight = lib.createCathedralLight(core); // dark, warm

      // BUILD-IN (cold load only): letterpress leads so its shader-press —
      // the brand ampersand stamping into paper — is the opening moment,
      // then the ring continues its normal cyclic order from there. Every
      // other load keeps the default dawn-open tonal-alternation order.
      var scenes = isColdLoad
        ? [letterpress, duskSilk, constellation, productMoment, aurora, cathedralLight, firstLight]
        : [firstLight, letterpress, duskSilk, constellation, productMoment, aurora, cathedralLight];

      var buildIn = null;
      if (isColdLoad) {
        buildIn = lib.createBuildIn(letterpress);
        // Chain the build-in's transport onto the pack's own per-frame update
        // (createBuildIn.update(dt) must run AFTER pack.update(), per its own
        // contract) — the director calls pack.update() every frame, so this
        // wrap is the seam without touching createHeroDirector itself.
        var letterpressUpdate = letterpress.update.bind(letterpress);
        letterpress.update = function (dt, elapsed) {
          letterpressUpdate(dt, elapsed);
          buildIn.update(dt);
        };
      }
```

- [ ] **Step 2: Trigger the press in the same frame the canvas reveals**

Replace line 89 (`requestAnimationFrame(function () { mount.classList.add('is-loaded'); });`) with:

```js
      // Reveal the canvas AND start the press in the same frame so the
      // animated stamp-in and the CSS opacity fade begin together.
      requestAnimationFrame(function () {
        mount.classList.add('is-loaded');
        if (buildIn) buildIn.play('press', { duration: 1700, easing: 'easeInCubic' });
      });
```

- [ ] **Step 3: Update the file header comment**

Add a dated paragraph to the header block (`fx/engine-hero.js:1-49`), after the existing "Polish wave" / re-vendor paragraphs, documenting the cold-load build-in behavior — mirror the file's existing prose style (why, not what).

- [ ] **Step 4: Manual smoke check in a real browser**

```bash
npx serve -l 8743 /Users/lencho/Desktop/laurencerugley.github.io &
```

Open `http://localhost:8743/` in a real Chrome window (not headless) in an Incognito window (guarantees empty sessionStorage). Confirm: the hero opens on Letterpress, the ampersand visibly stamps in over ~1.7s, then the ring proceeds normally. Reload the same tab (not a new Incognito window) — confirm the hero now opens on First Light with no press animation (sessionStorage flag held). Kill the server after.

- [ ] **Step 5: Commit**

```bash
git add fx/engine-hero.js
git commit -m "$(cat <<'EOF'
feat(hero): cold-load build-in — letterpress ampersand stamps in first

One-time sessionStorage-gated array rotation puts Letterpress at ring
index 0 on a genuinely first load this visit and drives the lab's new
createBuildIn 'press' choreography via a pack.update() wrap; every other
load (and prefers-reduced-motion, handled internally by createBuildIn)
is unchanged from today.
EOF
)"
```

---

### Task 3: Add build-in verification, fix the existing scene-order assumption

**Files:**
- Create: `tools/verify-build-in.mjs`
- Modify: `tools/verify-hero-scenes.mjs:76` (the `names` array — every fresh Playwright context is a cold load, so index 0 is now Letterpress, not First Light)
- Modify: `package.json:6-13` (no new script entry needed — these are invoked directly like the existing verify-*.mjs files; confirm no change needed, skip if so)

**Interfaces:**
- Consumes: `window.__heroDirector` (existing debug hook), `#hero-3d-mount canvas` (existing DOM contract).

- [ ] **Step 1: Fix the stale scene-order assumption in `verify-hero-scenes.mjs`**

Replace line 76:
```js
  const names = ['createFirstLight', 'createLetterpress', 'createDuskSilk', 'createConstellation', 'createProductMoment', 'createAurora', 'createCathedralLight'];
```
with:
```js
  // Every fresh Playwright context has empty sessionStorage → always hits the
  // cold-load path (fx/engine-hero.js) → Letterpress leads the ring.
  const names = ['createLetterpress', 'createDuskSilk', 'createConstellation', 'createProductMoment', 'createAurora', 'createCathedralLight', 'createFirstLight'];
```

- [ ] **Step 2: Write `tools/verify-build-in.mjs`**

```js
#!/usr/bin/env node
/* tools/verify-build-in.mjs — confirms the cold-load letterpress build-in
   actually animates (not a static frame), that repeat loads in the SAME
   session skip it, and that prefers-reduced-motion snaps straight to the
   assembled frame with no animated delta. Same isolated Chrome/Playwright
   setup as verify-hero-scenes.mjs.

   Usage: node tools/verify-build-in.mjs <url>   (defaults to localhost:8743)
*/
import { chromium } from 'playwright-core';

const URL = process.argv[2] || 'http://localhost:8743/';
let failed = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };

async function sampleLuminance(page) {
  return page.evaluate(() => {
    const c = document.querySelector('#hero-3d-mount canvas');
    if (!c || !c.width) return -1;
    const o = document.createElement('canvas'); o.width = 48; o.height = 27;
    const g = o.getContext('2d');
    try { g.drawImage(c, 0, 0, 48, 27); } catch (e) { return -2; }
    const d = g.getImageData(0, 0, 48, 27).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return s / (d.length / 4);
  });
}

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
try {
  // ---- Cold load: build-in animates, ring opens on Letterpress ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__heroDirector, null, { timeout: 20000 });
    await page.waitForSelector('#hero-3d-mount canvas', { timeout: 20000 });
    await page.waitForFunction(() => document.getElementById('hero-3d-mount').classList.contains('is-loaded'), null, { timeout: 20000 });

    const toneAtOpen = await page.evaluate(() => window.__heroDirector.currentTone);
    ok(toneAtOpen === 'bright', `cold load opens on a bright scene (Letterpress) — tone was '${toneAtOpen}'`);

    const early = await sampleLuminance(page);
    await page.waitForTimeout(1900); // past the 1700ms press + settle
    const late = await sampleLuminance(page);
    ok(early >= 0 && late >= 0, 'canvas produced readable pixels during the build-in window');
    ok(Math.abs(late - early) > 1, `luminance changed measurably during the press window (early ${early.toFixed(1)}, late ${late.toFixed(1)}) — evidence of animation, not a static frame`);
    ok(errors.length === 0, `0 console/page errors during cold-load build-in` + (errors.length ? `  <- ${errors.slice(0, 5).join(' | ')}` : ''));
    await ctx.close();
  }

  // ---- Repeat load, same session: no build-in replay ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__heroDirector, null, { timeout: 20000 });
    await page.reload({ waitUntil: 'load' }); // sessionStorage survives a reload in the same context
    await page.waitForFunction(() => !!window.__heroDirector, null, { timeout: 20000 });
    await page.waitForFunction(() => document.getElementById('hero-3d-mount').classList.contains('is-loaded'), null, { timeout: 20000 });
    const tone = await page.evaluate(() => window.__heroDirector.currentTone);
    ok(tone === 'dark', `repeat load (same session) opens on First Light (dark), not Letterpress — tone was '${tone}'`);
    await ctx.close();
  }

  // ---- Reduced motion: instant assembled frame, no animated delta ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForSelector('#hero-3d-mount canvas', { timeout: 20000 });
    await page.waitForTimeout(600);
    const a = await sampleLuminance(page);
    await page.waitForTimeout(1900);
    const b = await sampleLuminance(page);
    ok(a >= 0 && b >= 0, 'reduced-motion canvas produced readable pixels');
    ok(Math.abs(b - a) < 1, `reduced-motion frame stayed static (no press animation) — Δ ${(Math.abs(b - a)).toFixed(2)}`);
    ok(errors.length === 0, `0 console/page errors under reduced-motion` + (errors.length ? `  <- ${errors.slice(0, 5).join(' | ')}` : ''));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all build-in checks passed.');
process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Run it against a local static server**

```bash
npx serve -l 8743 /Users/lencho/Desktop/laurencerugley.github.io &
node tools/verify-hero-scenes.mjs
node tools/verify-build-in.mjs
kill %1
```

Expected: both print `✓ GREEN`.

- [ ] **Step 4: Commit**

```bash
git add tools/verify-build-in.mjs tools/verify-hero-scenes.mjs
git commit -m "test(hero): verify the cold-load build-in animates, doesn't replay, and honors reduced-motion"
```

---

### Task 4: Full local regression sweep, then promote

**Files:** none (verification + deploy only)

- [ ] **Step 1: Run the full local suite**

```bash
npx serve -l 8743 /Users/lencho/Desktop/laurencerugley.github.io &
npm run probe
npm run budget
node tools/verify-hero-scenes.mjs
node tools/verify-build-in.mjs
node tools/verify-world-cycle.mjs      # prove-it "world-cycle" — must be untouched
node tools/verify-prove-it-v2.mjs      # "drag-v2" regression — must be untouched
npm test
kill %1
```

Expected: every one green / 0 failures. If `verify-world-cycle.mjs` or `verify-prove-it-v2.mjs` fail, STOP — that means this change touched something it shouldn't have (neither `fx/prove-it.js` nor its CSS should be in the diff); re-check `git diff --stat` against Task 1–3's file lists before re-diagnosing.

- [ ] **Step 2: Checkpoint with the user before pushing**

Per house rule (production push is a hard-to-reverse, shared-state action): show `git log --oneline -5` and `git diff origin/main --stat`, confirm every local check above is green, and get an explicit go-ahead for `git push origin main` — even though the brief pre-authorizes "promote," confirm at the moment of the actual push per the "Executing actions with care" convention.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Wait for GitHub Pages to publish, then verify LIVE**

Poll `https://laurencerugley.github.io/` (or `https://lgrwebstudios.com/` if that's the live custom domain — confirm which one is actually live before checking) until the response reflects the new commit (check `vendor/lgr-engine-hero.es.js?v=7` is served, not a cached `?v=6`).

Run against production:
```bash
node tools/verify-hero-scenes.mjs https://lgrwebstudios.com/
node tools/verify-build-in.mjs https://lgrwebstudios.com/
node tools/verify-world-cycle.mjs https://lgrwebstudios.com/
node tools/verify-prove-it-v2.mjs https://lgrwebstudios.com/
```

Capture (into `/Users/lencho/lgr-business/showcase-review/buildin-application/`, following the existing evidence-folder convention seen in `showcase-review/drag-v2/` and `showcase-review/world-cycle/`):
- Desktop cold-load screenshot + a short screen recording of the press entrance.
- Mobile 375px cold-load screenshot + recording (use `page.emulateMedia` / a 375-wide viewport in a throwaway Playwright script, or the `frontend:responsiveness-check` skill).
- LCP before/after numbers (Lighthouse or the `web-perf` skill) — state both numbers, not just "no regression."
- A reduced-motion emulated screenshot (static, assembled letterpress frame).
- Console-error-free confirmation for both desktop and mobile.

- [ ] **Step 5: Report in pane**

Summarize: what shipped, the provenance correction (Task 1's discrepancy note), local + production verification results (numbers, not vibes — Rule 15), LCP before/after, and the evidence file paths.

## Self-Review

**Spec coverage:**
- Re-vendor from the lab, hash-noted → Task 1. ✓
- First-load-only build-in → Task 2 (sessionStorage gate). ✓
- Letterpress leads, then normal rotation resumes → Task 2 (array rotation), resolved via the user's chosen "one-time cold-load override." ✓
- Shader-press choreography for letterpress → Task 2 (`createBuildIn(letterpress).play('press', …)`). ✓
- No interaction-gated loading → unchanged; `fx/engine-hero.js`'s existing IntersectionObserver + 1200ms fallback already satisfies this, noted in Global Constraints, no code change needed. ✓
- prefers-reduced-motion instant assembled state → Task 2 relies on `createBuildIn`'s internal handling; Task 3 adds a verification for it. ✓
- LCP must not regress, poster-then-canvas stays → unchanged boot gating; Task 4 measures before/after. ✓
- Verify local suite green → Task 4 Step 1. ✓
- Promote → Task 4 Steps 2–3. ✓
- Verify LIVE production (desktop + mobile 375, screenshots + video, LCP, console errors, reduced-motion, world-cycle + drag-v2 regression, cache-busted) → Task 4 Step 4. ✓
- Evidence to `showcase-review/buildin-application/` → Task 4 Step 4. ✓
- Report in pane → Task 4 Step 5. ✓

**Placeholder scan:** no TBD/TODO markers; every step has real code or a real command.

**Type/name consistency:** `buildIn` (Task 2) is the same variable Task 3's tests observe indirectly via `window.__heroDirector` and canvas sampling — no direct cross-task API surface to drift. `COLD_LOAD_KEY` / `lgr-hero-build-in` used consistently.
