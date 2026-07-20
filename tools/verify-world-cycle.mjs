#!/usr/bin/env node
/* tools/verify-world-cycle.mjs — the prove-it "world cycle" feature: the
   handbuilt pane's backdrop cycling through recorded real-engine-scene
   loops. Same isolated Chrome/Playwright setup as site-probe.mjs.

   Usage: node tools/verify-world-cycle.mjs <baseUrl>
*/
import { chromium } from 'playwright-core';

const BASE = (process.argv[2] || 'http://localhost:8743').replace(/\/$/, '');
let failed = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
try {
  // ---------- 1: lazy-load gate — nothing loads before scroll ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    const worldReqs = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => { if (r.url().includes('world-loops')) worldReqs.push(r.url()); });

    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    ok(worldReqs.length === 0, `zero world-loop requests before scrolling to #prove-it (found ${worldReqs.length})`);

    await page.locator('#prove-it').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
    ok(worldReqs.length > 0, `world-loop request fires once section is in view + past reveal threshold (found ${worldReqs.length})`);
    ok(worldReqs.some((u) => u.includes('firstlight')), `first world loaded is firstlight (${worldReqs[0]})`);

    const video = page.locator('.prove-world-video');
    const isVisible = await video.evaluate((el) => el.classList.contains('is-visible'));
    const paused = await video.evaluate((el) => el.paused);
    ok(isVisible, 'video faded in (is-visible class present)');
    ok(!paused, 'video is playing (not paused)');

    // ---------- 2: cycle advances after ~8s ----------
    await page.waitForTimeout(7000); // total ~9s since scroll — past one 8s tick
    const src2 = await video.evaluate((el) => el.currentSrc);
    ok(/letterpress/.test(src2), `cycles to the 2nd world (letterpress) after ~8s (found ${src2})`);

    ok(errors.length === 0, `0 console/page errors across the whole pass` + (errors.length ? `  <- ${errors.slice(0, 5).join(' | ')}` : ''));
    await ctx.close();
  }

  // ---------- 3: drag pauses cycling ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.locator('#prove-it').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000); // gate fires, firstlight loads

    const root = page.locator('#proveSlider');
    const box = await root.boundingBox();
    const midY = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.5, midY);
    await page.mouse.down();
    // hold the drag past what would have been the 8s cycle tick
    await page.waitForTimeout(9000);
    const srcDuringHold = await page.locator('.prove-world-video').evaluate((el) => el.currentSrc);
    ok(/firstlight/.test(srcDuringHold), `world does NOT advance while actively dragging, even past 8s (found ${srcDuringHold})`);
    await page.mouse.up();
    await root.dispatchEvent('pointerup', { clientX: box.x + box.width * 0.5, clientY: midY, pointerId: 1 });

    // after release, a FRESH ~8s wait starts — should still be firstlight immediately after release
    await page.waitForTimeout(500);
    const srcRightAfterRelease = await page.locator('.prove-world-video').evaluate((el) => el.currentSrc);
    ok(/firstlight/.test(srcRightAfterRelease), `world unchanged immediately after release (fresh cycle wait starts, found ${srcRightAfterRelease})`);
    await ctx.close();
  }

  // ---------- 4: reduced-motion — static poster, zero video bytes, no cycling ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const worldReqs = [];
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('request', (r) => { if (r.url().includes('world-loops')) worldReqs.push(r.url()); });
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.locator('#prove-it').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    const video = page.locator('.prove-world-video');
    const hasSourceEls = await video.evaluate((el) => el.querySelectorAll('source').length);
    const poster = await video.getAttribute('poster');
    const isVisible = await video.evaluate((el) => el.classList.contains('is-visible'));
    ok(hasSourceEls === 0, `reduced-motion: zero <source> elements ever added (found ${hasSourceEls})`);
    ok(!!poster && poster.includes('firstlight-poster'), `reduced-motion: static poster set (${poster})`);
    ok(isVisible, 'reduced-motion: poster frame visible');
    ok(!worldReqs.some((u) => /\.(webm|mp4)$/.test(u)), `reduced-motion: zero video byte requests (found ${worldReqs.filter((u) => /\.(webm|mp4)$/.test(u)).length})`);

    await page.waitForTimeout(9000); // past what would be a cycle tick
    const srcAfterWait = await video.evaluate((el) => el.currentSrc);
    ok(srcAfterWait === '', `reduced-motion: never cycles (currentSrc still empty, found "${srcAfterWait}")`);
    ok(errors.length === 0, `reduced-motion: 0 console errors` + (errors.length ? `  <- ${errors.join(' | ')}` : ''));
    await ctx.close();
  }

  // ---------- 5: existing drag-v2 behavior unchanged ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.locator('#prove-it').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    ok(await page.locator('.prove-handle').count() === 1, 'straight-bar divider still present');
    ok(await page.locator('.prove-seam').count() === 0, 'liquid seam still absent');
    const animName = await page.locator('.prove-handle').evaluate((el) => getComputedStyle(el).animationName);
    ok(animName === 'proveHandlePulse', `idle pulse still animating (found "${animName}")`);

    const root = page.locator('#proveSlider');
    const box = await root.boundingBox();
    const midY = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.5, midY);
    await page.mouse.down();
    const animDuringDrag = await page.locator('.prove-handle').evaluate((el) => getComputedStyle(el).animationName);
    ok(animDuringDrag === 'none', `pulse still disabled during drag (found "${animDuringDrag}")`);
    await page.mouse.move(box.x + box.width * 0.08, midY, { steps: 8 });
    await page.mouse.up();
    await root.dispatchEvent('pointerup', { clientX: box.x + box.width * 0.08, clientY: midY, pointerId: 1 });
    await page.waitForTimeout(600);
    const pct = await root.getAttribute('aria-valuenow');
    ok(pct === '0', `release-settle still works (pct=${pct})`);
    ok(errors.length === 0, `0 console errors during drag-v2 regression check` + (errors.length ? `  <- ${errors.join(' | ')}` : ''));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all world-cycle checks passed.');
process.exit(failed ? 1 : 0);
