#!/usr/bin/env node
/* tools/verify-prove-it-polish.mjs — Polish wave: verify the liquid seam is
   now unmistakable (wide idle breathing, strong drag-velocity response,
   glow), and the auto-preview attract loop obeys every owner-specified rule.
   Same isolated Chrome/Playwright setup as tools/site-probe.mjs.

   Usage: node tools/verify-prove-it-polish.mjs <url>   (defaults to localhost:8743)
*/
import { chromium } from 'playwright-core';

const URL = process.argv[2] || 'http://localhost:8743/';
let failed = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  // ---------- PASS 1: seam idle breathing + drag response (normal motion) ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(URL, { waitUntil: 'load' });
    await page.locator('#prove-it').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    const idleScales = [];
    for (let i = 0; i < 5; i++) {
      idleScales.push(await page.locator('#proveSlider feDisplacementMap').getAttribute('scale').then(Number));
      await page.waitForTimeout(300);
    }
    const idleVaries = new Set(idleScales.map((n) => n.toFixed(0))).size > 1;
    const idleNonZero = idleScales.every((n) => n > 0);
    ok(idleNonZero && idleVaries, `seam breathes at rest (never 0, visibly varying) — samples: ${idleScales.map((n) => n.toFixed(1))}`);

    const box = await page.locator('#proveSlider').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2, { steps: 6 });
    const dragScale = await page.locator('#proveSlider feDisplacementMap').getAttribute('scale').then(Number);
    const glowDuringDrag = await page.locator('.prove-seam-glow').evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--seam-glow-a')) || parseFloat(el.style.getPropertyValue('--seam-glow-a')));
    await page.mouse.up();
    ok(dragScale > 40, `drag pushes displacement scale well above idle (${dragScale.toFixed(1)}, vs idle ~5-8) — "unmistakable"`);
    ok(glowDuringDrag > 0.3, `meniscus glow opacity rises during drag (--seam-glow-a=${glowDuringDrag})`);

    const seamWidthPx = await page.locator('.prove-seam').evaluate((el) => el.getBoundingClientRect().width);
    ok(seamWidthPx > 26 * 3 && seamWidthPx < 26 * 4.5, `seam band is ~3-4x the old 26px width (now ${seamWidthPx.toFixed(0)}px)`);

    ok(errors.length === 0, `0 console errors this pass` + (errors.length ? `  <- ${errors.slice(0, 3).join(' | ')}` : ''));
    await ctx.close();
  }

  // ---------- PASS 2: attract loop fires, sweeps, and returns (normal motion) ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.locator('#prove-it').scrollIntoViewIfNeeded();
    const startPct = await page.locator('#proveSlider').getAttribute('aria-valuenow');
    ok(startPct === '50', `starts at 50% (found ${startPct})`);

    await page.waitForTimeout(4300); // past the 4s idle threshold
    let sawMovement = false, trough = 50, sawFlip = false;
    for (let i = 0; i < 14; i++) {
      const v = Number(await page.locator('#proveSlider').getAttribute('aria-valuenow'));
      if (v !== 50) sawMovement = true;
      trough = Math.min(trough, v);
      const vals = await page.locator('#proveTicker .stat-v').allTextContents();
      if (vals[0] === '0.8 MB') sawFlip = true; // the "after" page-weight value
      await page.waitForTimeout(250);
    }
    ok(sawMovement, 'attract loop actually moved the slider after ~4s idle');
    ok(trough >= 25 && trough <= 35, `attract loop sweeps to ~30% (trough observed ${trough}) — must cross pct<50 or the ticker never flips`);
    ok(sawFlip, 'ticker actually flips during the sweep (the brief explicitly promises this)');

    await page.waitForTimeout(1500);
    const backAt = Number(await page.locator('#proveSlider').getAttribute('aria-valuenow'));
    ok(backAt === 50, `attract loop returns to 50% after the sweep (now ${backAt})`);
    await ctx.close();
  }

  // ---------- PASS 3: any interaction cancels the attract loop instantly + permanently ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.locator('#prove-it').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const box = await page.locator('#proveSlider').boundingBox();
    // A real interaction well before the 4s idle threshold.
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    const afterInteraction = await page.locator('#proveSlider').getAttribute('aria-valuenow');
    // Wait well past 2x the idle threshold + a full sweep — it must never fire.
    await page.waitForTimeout(9000);
    const stillThere = await page.locator('#proveSlider').getAttribute('aria-valuenow');
    ok(stillThere === afterInteraction, `attract loop never fires after a real interaction (value stayed at ${stillThere}, no autonomous drift)`);
    await ctx.close();
  }

  // ---------- PASS 4: reduced-motion — static seam, attract loop never runs ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.locator('#prove-it').scrollIntoViewIfNeeded();
    const scale0 = await page.locator('#proveSlider feDisplacementMap').getAttribute('scale').then(Number);
    await page.waitForTimeout(2500);
    const scale1 = await page.locator('#proveSlider feDisplacementMap').getAttribute('scale').then(Number);
    ok(scale0 === scale1, `reduced-motion: displacement scale never changes (${scale0} -> ${scale1}, static)`);
    const glowA = await page.locator('.prove-seam-glow').evaluate((el) => getComputedStyle(el).getPropertyValue('--seam-glow-a').trim());
    ok(glowA === '' || glowA === '0', `reduced-motion: glow never activated (--seam-glow-a: "${glowA}")`);

    await page.waitForTimeout(5500); // past the 4s idle threshold
    const pct = await page.locator('#proveSlider').getAttribute('aria-valuenow');
    ok(pct === '50', `reduced-motion: attract loop never fires (value stayed at ${pct})`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all prove-it polish checks passed.');
process.exit(failed ? 1 : 0);
