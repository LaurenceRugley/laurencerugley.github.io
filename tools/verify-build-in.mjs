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

async function sampleFrame(page) {
  return page.evaluate(() => {
    const c = document.querySelector('#hero-3d-mount canvas');
    if (!c || !c.width) return null;
    const o = document.createElement('canvas'); o.width = 48; o.height = 27;
    const g = o.getContext('2d');
    try { g.drawImage(c, 0, 0, 48, 27); } catch (e) { return null; }
    return Array.from(g.getImageData(0, 0, 48, 27).data);
  });
}

function frameDiff(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let sum = 0, n = 0;
  for (let i = 0; i < a.length; i += 4) {
    const la = 0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2];
    const lb = 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2];
    sum += Math.abs(la - lb); n++;
  }
  return sum / n;
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

    const early = await sampleFrame(page);
    await page.waitForTimeout(1900); // past the 1700ms press + settle
    const late = await sampleFrame(page);
    ok(!!early && !!late, 'canvas produced readable pixels during the build-in window');
    const delta = frameDiff(early, late);
    ok(delta > 0.35, `frame changed measurably during the press window (mean abs per-pixel luminance delta ${delta.toFixed(2)}) — evidence of animation, not a static frame`);
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
    const a = await sampleFrame(page);
    await page.waitForTimeout(1900);
    const b = await sampleFrame(page);
    ok(!!a && !!b, 'reduced-motion canvas produced readable pixels');
    const delta = frameDiff(a, b);
    ok(delta < 0.15, `reduced-motion frame stayed static (no press animation) — mean abs per-pixel luminance delta ${delta.toFixed(2)}`);
    ok(errors.length === 0, `0 console/page errors under reduced-motion` + (errors.length ? `  <- ${errors.slice(0, 5).join(' | ')}` : ''));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all build-in checks passed.');
process.exit(failed ? 1 : 0);
