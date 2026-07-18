#!/usr/bin/env node
/* tools/verify-production-wave2.mjs — one-off isolated post-promote check
   against LIVE https://lgrwebstudios.com. Same isolated Chrome/Playwright
   setup as tools/site-probe.mjs (own profile, no extensions) — NOT the
   owner's live browser (DESIGN doctrine). Checks:
   - zero console/page errors on a clean profile
   - hero canvas renders (non-black, settled)
   - G proof-sheet, H rail (+ actually fills on scroll), I seam + ticker
     (+ actually flips on drag) are present and functional
   - 390px mobile screenshot of the prove-it slider (the label-wrap fix)
   Screenshots saved to the paths given on argv.
*/
import { chromium } from 'playwright-core';

const [, , desktopOut, mobileOut] = process.argv;
if (!desktopOut || !mobileOut) {
  console.error('usage: node verify-production-wave2.mjs <desktopOut> <mobileOut>');
  process.exit(1);
}

const URL = 'https://lgrwebstudios.com/';
let failed = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});

try {
  // ---------- DESKTOP PASS ----------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(URL, { waitUntil: 'load' });

  // Hero canvas, settled (same pattern as site-probe.mjs)
  await page.waitForSelector('#hero-3d-mount canvas', { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => {
    const m = document.getElementById('hero-3d-mount');
    const c = m && m.querySelector('canvas');
    if (!c) return false;
    const op = parseFloat(getComputedStyle(c).opacity || '1');
    return m.classList.contains('is-loaded') && op > 0.95;
  }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const lum = await page.evaluate(() => {
    const c = document.querySelector('#hero-3d-mount canvas');
    if (!c || !c.width) return -1;
    const o = document.createElement('canvas'); o.width = 64; o.height = 36;
    const g = o.getContext('2d');
    try { g.drawImage(c, 0, 0, 64, 36); } catch (e) { return -2; }
    const d = g.getImageData(0, 0, 64, 36).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return s / (d.length / 4);
  });
  ok(lum > 6, `engine hero canvas non-black once settled (luminance ${lum.toFixed(1)}/255)`);

  // G — proof sheet present
  const gCount = await page.locator('.proof-sheet .conviction').count();
  ok(gCount === 3, `G: 3 .conviction blocks present in .proof-sheet (found ${gCount})`);
  const stampVisible = await page.locator('.proof-stamp').isVisible();
  ok(stampVisible, 'G: "Approved to press" stamp visible');

  // H — rail exists and ACTUALLY fills as it scrolls into view
  await page.locator('#process').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const fillAtTop = await page.locator('#processRailFill').evaluate(el => parseFloat(getComputedStyle(el).height));
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(500);
  const fillAfterScroll = await page.locator('#processRailFill').evaluate(el => parseFloat(getComputedStyle(el).height));
  ok(fillAfterScroll > fillAtTop, `H: rail fill grows on scroll (${fillAtTop.toFixed(0)}px -> ${fillAfterScroll.toFixed(0)}px)`);
  const stationCount = await page.locator('.station').count();
  ok(stationCount === 4, `H: 4 .station blocks present (found ${stationCount})`);

  // I — seam + ticker present and ticker actually flips on drag
  await page.locator('#prove-it').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const seamPresent = await page.locator('.prove-seam svg feDisplacementMap').count();
  ok(seamPresent === 1, 'I: liquid seam SVG (feDisplacementMap) present');
  const beforeVals = await page.locator('#proveTicker .stat-v').allTextContents();
  const box = await page.locator('#proveSlider').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const afterVals = await page.locator('#proveTicker .stat-v').allTextContents();
  ok(JSON.stringify(beforeVals) !== JSON.stringify(afterVals), `I: ticker flips on drag (${beforeVals.join(' | ')} -> ${afterVals.join(' | ')})`);

  await page.screenshot({ path: desktopOut, fullPage: false });
  ok(errors.length === 0, `0 console/page errors on a clean profile` + (errors.length ? `  <- ${errors.slice(0, 3).join(' | ')}` : ''));
  await ctx.close();

  // ---------- MOBILE 390px PASS (label-wrap fix spot check) ----------
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mpage = await mctx.newPage();
  await mpage.goto(URL, { waitUntil: 'load' });
  await mpage.locator('#prove-it').scrollIntoViewIfNeeded();
  await mpage.waitForTimeout(1500);
  await mpage.screenshot({ path: mobileOut });
  const labelBox = await mpage.locator('.prove-lab').boundingBox();
  const handleX = await mpage.locator('.prove-handle').evaluate(el => el.getBoundingClientRect().left);
  ok(labelBox.x >= handleX, `mobile 390px: ".prove-lab" left edge (${labelBox.x.toFixed(0)}px) clear of the handle (${handleX.toFixed(0)}px) — no clipping`);
  await mctx.close();
} finally {
  await browser.close();
}

console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all live checks passed.');
process.exit(failed ? 1 : 0);
