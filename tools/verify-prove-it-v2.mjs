#!/usr/bin/env node
/* tools/verify-prove-it-v2.mjs — the prove-it liquid-seam-removal redesign
   (2026-07-20): straight-bar divider + idle pulse that stops on drag, reveal
   drama (motion ramp / tonal contrast / edge glow) on the handbuilt pane,
   release-settle past ~85% revealed. Same isolated Chrome/Playwright setup
   as site-probe.mjs.

   Drag is tested two ways: real mouse pointer events (the functional path —
   proves the drag math/threshold logic actually works), and a directly
   dispatched PointerEvent with pointerType:'touch' (the code listens on
   generic Pointer Events and never branches on pointerType, so this
   genuinely exercises the same touch-originated code path a real phone
   would use — it is not a substitute for testing on an actual touchscreen,
   which no headless tool can do, but it is an honest test of what's
   actually testable here).

   Usage: node tools/verify-prove-it-v2.mjs <baseUrl>
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
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.locator('#prove-it').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // ---------- liquid removed, straight bar present ----------
  ok(await page.locator('.prove-seam').count() === 0, 'liquid seam element (.prove-seam) fully removed from markup');
  ok(await page.locator('.prove-handle').count() === 1, 'straight-bar divider (.prove-handle) present');
  const handleWidth = await page.locator('.prove-handle').evaluate((el) => parseFloat(getComputedStyle(el).width));
  ok(handleWidth > 0 && handleWidth <= 4, `divider is a thin bar (found ${handleWidth}px wide)`);
  const handleHeightPct = await page.locator('.prove-handle').evaluate((el) => {
    const r = el.getBoundingClientRect(), pr = el.closest('.prove-slider').getBoundingClientRect();
    return r.height / pr.height;
  });
  ok(handleHeightPct > 0.95, `divider spans full height of the slider (${(handleHeightPct * 100).toFixed(1)}%)`);

  // ---------- idle pulse: visible (animating), then stops on grab ----------
  const animBefore = await page.locator('.prove-handle').evaluate((el) => getComputedStyle(el).animationName);
  ok(animBefore === 'proveHandlePulse', `idle pulse animation running before interaction (found "${animBefore}")`);

  const root = page.locator('#proveSlider');
  const box = await root.boundingBox();
  const midY = box.y + box.height / 2;
  const startX = box.x + box.width * 0.5;
  await page.mouse.move(startX, midY);
  await page.mouse.down();
  // animation: none (not animation-play-state: paused) is the actual
  // mechanism — see prove-it.css's comment on .is-dragging/.is-sweeping for
  // why a merely-paused animation would freeze at whatever opacity the
  // keyframe was mid-breath and win over a plain opacity:1 override.
  const animNameDuringDrag = await page.locator('.prove-handle').evaluate((el) => getComputedStyle(el).animationName);
  const opacityDuringDrag = await page.locator('.prove-handle').evaluate((el) => parseFloat(getComputedStyle(el).opacity));
  ok(animNameDuringDrag === 'none', `pulse animation fully disabled (not just paused) while dragging (found "${animNameDuringDrag}")`);
  ok(opacityDuringDrag >= 0.99, `divider forced fully opaque while dragging (found ${opacityDuringDrag})`);

  // ---------- motion ramp: drag past 0.6 reveal fraction (pct < 40) ----------
  const rampTargetX = box.x + box.width * 0.25; // pct ~25 -> revealFraction 0.75, past the 0.6 threshold
  await page.mouse.move(rampTargetX, midY, { steps: 8 });
  const rampValue = await page.locator('.prove-pane-handbuilt').evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--reveal-ramp')));
  const pctNow = await root.getAttribute('aria-valuenow');
  ok(rampValue > 0, `motion ramp fires past 0.6 reveal fraction (pct=${pctNow}, --reveal-ramp=${rampValue})`);

  // release mid-range (not past the 85% settle threshold) — should stay put
  await page.mouse.up();
  await page.locator('#proveSlider').dispatchEvent('pointerup', { clientX: rampTargetX, clientY: midY, pointerId: 1 });
  await page.waitForTimeout(100);
  const playStateAfter = await page.locator('.prove-handle').evaluate((el) => getComputedStyle(el).animationPlayState);
  ok(playStateAfter === 'running', `pulse resumes after release (found "${playStateAfter}")`);
  const pctAfterMidRelease = parseFloat(await root.getAttribute('aria-valuenow'));
  ok(pctAfterMidRelease > 15 && Math.abs(pctAfterMidRelease - 25) < 5, `released mid-range (not past settle threshold) stays where dropped (pct=${pctAfterMidRelease})`);

  // ---------- release-settle: drag past ~85% revealed (pct < 15), release ----------
  await page.mouse.move(startX, midY);
  await page.mouse.down();
  const settleTargetX = box.x + box.width * 0.08; // pct ~8, past the 15 threshold
  await page.mouse.move(settleTargetX, midY, { steps: 8 });
  await page.mouse.up();
  await page.locator('#proveSlider').dispatchEvent('pointerup', { clientX: settleTargetX, clientY: midY, pointerId: 1 });
  await page.waitForTimeout(600); // past the 420ms settle timeout
  const pctAfterSettle = parseFloat(await root.getAttribute('aria-valuenow'));
  ok(pctAfterSettle === 0, `release past ~85% revealed eases to full reveal (pct=${pctAfterSettle})`);
  const isSettlingLeftover = await root.evaluate((el) => el.classList.contains('is-settling'));
  ok(!isSettlingLeftover, 'is-settling class cleaned up after the transition');

  // reset to center for the next checks
  await root.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })));
  await page.waitForTimeout(50);

  // ---------- touch-originated pointer events drive the same code path ----------
  const touchTargetX = box.x + box.width * 0.3;
  await root.evaluate((el, x) => {
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: r.top + r.height / 2, pointerId: 99, pointerType: 'touch', bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: r.top + r.height / 2, pointerId: 99, pointerType: 'touch', bubbles: true }));
  }, touchTargetX);
  await page.waitForTimeout(50);
  const pctAfterTouch = parseFloat(await root.getAttribute('aria-valuenow'));
  ok(Math.abs(pctAfterTouch - 30) < 5, `touch-originated (pointerType:'touch') pointer events move the slider (pct=${pctAfterTouch})`);
  await root.evaluate((el, x) => {
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: r.top + r.height / 2, pointerId: 99, pointerType: 'touch', bubbles: true }));
  }, touchTargetX);
  const touchActionCss = await root.evaluate((el) => getComputedStyle(el).touchAction);
  ok(touchActionCss === 'pan-y', `touch-action: pan-y intact (vertical page scroll still passes through), found "${touchActionCss}"`);

  ok(errors.length === 0, `0 console/page errors across the whole pass` + (errors.length ? `  <- ${errors.slice(0, 5).join(' | ')}` : ''));

  await page.screenshot({ path: 'prove-it-v2-render-check.png', clip: { x: 0, y: 0, width: 1280, height: 900 } });
} finally {
  await browser.close();
}
console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all prove-it-v2 checks passed.');
process.exit(failed ? 1 : 0);
