#!/usr/bin/env node
/* tools/verify-hero-scenes.mjs — Polish wave: confirm every scene in the
   7-scene hero ring actually renders (non-black canvas) after the re-vendor
   + createLetterpress/createCathedralLight/createFirstLight wiring. Same
   isolated Chrome/Playwright setup as tools/site-probe.mjs. Uses the
   director's own goTo(i) (exposed as window.__heroDirector for exactly this
   kind of check) to step through the ring without waiting out real dwell
   times, samples canvas luminance per scene, and watches console errors
   for the whole run.

   Usage: node tools/verify-hero-scenes.mjs <url>   (defaults to localhost:8743)
*/
import { chromium } from 'playwright-core';

const URL = process.argv[2] || 'http://localhost:8743/';
let failed = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__heroDirector, null, { timeout: 20000 });
  await page.waitForSelector('#hero-3d-mount canvas', { timeout: 20000 });
  await page.waitForFunction(() => {
    const m = document.getElementById('hero-3d-mount');
    const c = m && m.querySelector('canvas');
    return c && m.classList.contains('is-loaded') && parseFloat(getComputedStyle(c).opacity || '1') > 0.95;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(800);

  const sceneCount = await page.evaluate(() => {
    // currentIndex/goTo are on the director; scene count isn't exposed directly,
    // so probe goTo's own RangeError to find the ring length once.
    let n = 0;
    while (true) {
      try { window.__heroDirector.goTo(n); n++; } catch (e) { break; }
      if (n > 20) break; // safety backstop
    }
    return n;
  });
  ok(sceneCount === 7, `hero ring reports 7 scenes (found ${sceneCount})`);

  // Average luminance alone (the site-probe.mjs test) miscalls sparse-content
  // scenes as black — createConstellation's backdrop is 0x05040a by design (a
  // few glowing nodes on deep ink), so its frame-average sits near 2/255 even
  // though it's rendering correctly. Sample both average AND max-channel
  // brightness; a scene passes if EITHER shows real content (avg catches
  // fuller scenes, max catches sparse-bright-points-on-black ones).
  async function sampleLuminance() {
    await page.waitForTimeout(1500); // past the 1200ms crossfade + settle
    return page.evaluate(() => {
      const c = document.querySelector('#hero-3d-mount canvas');
      if (!c || !c.width) return { avg: -1, max: -1 };
      const o = document.createElement('canvas'); o.width = 64; o.height = 36;
      const g = o.getContext('2d');
      try { g.drawImage(c, 0, 0, 64, 36); } catch (e) { return { avg: -2, max: -2 }; }
      const d = g.getImageData(0, 0, 64, 36).data;
      let s = 0, mx = 0;
      for (let i = 0; i < d.length; i += 4) {
        s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        mx = Math.max(mx, d[i], d[i + 1], d[i + 2]);
      }
      return { avg: s / (d.length / 4), max: mx };
    });
  }

  const names = ['createFirstLight', 'createLetterpress', 'createDuskSilk', 'createConstellation', 'createProductMoment', 'createAurora', 'createCathedralLight'];
  for (let i = 0; i < sceneCount; i++) {
    await page.evaluate((idx) => window.__heroDirector.goTo(idx), i);
    const tone = await page.evaluate(() => window.__heroDirector.currentTone);
    const { avg, max } = await sampleLuminance();
    ok(avg > 6 || max > 40, `scene ${i} (${names[i] || '?'}, tone:${tone}) renders — avg ${avg.toFixed(1)}/255, max ${max.toFixed(0)}/255`);
  }

  ok(errors.length === 0, `0 console/page errors across the full ring` + (errors.length ? `  <- ${errors.slice(0, 5).join(' | ')}` : ''));
} finally {
  await browser.close();
}
console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all hero-scene checks passed.');
process.exit(failed ? 1 : 0);
