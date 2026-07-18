#!/usr/bin/env node
/* tools/capture-og-image.mjs — renders tools/og-image-capture.html (the real
   hero engine, First Light scene, same boot sequence as fx/engine-hero.js)
   at exactly 1200x630 and saves a PNG. Same isolated Chrome/Playwright setup
   as tools/site-probe.mjs. Requires a local server at the repo root (the
   page uses ES module imports, so it can't run from file://).

   Usage: node tools/capture-og-image.mjs <outfile> [url]
     (url defaults to http://localhost:8743/tools/og-image-capture.html)
*/
import { chromium } from 'playwright-core';

const [, , outFile, urlArg] = process.argv;
if (!outFile) { console.error('usage: node capture-og-image.mjs <outfile> [url]'); process.exit(1); }
const URL = urlArg || 'http://localhost:8743/tools/og-image-capture.html';

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
try {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ogCaptureReady === true, null, { timeout: 20000 });
  await page.waitForTimeout(1800); // let the scene settle past its fade-in

  const lum = await page.evaluate(() => {
    const c = document.querySelector('#mount canvas');
    if (!c || !c.width) return -1;
    const o = document.createElement('canvas'); o.width = 64; o.height = 36;
    const g = o.getContext('2d');
    try { g.drawImage(c, 0, 0, 64, 36); } catch (e) { return -2; }
    const d = g.getImageData(0, 0, 64, 36).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return s / (d.length / 4);
  });
  if (lum <= 6) { console.error(`FAIL — canvas reads black (luminance ${lum}), refusing to save a broken og:image`); process.exit(1); }
  if (errors.length) { console.error('FAIL — console errors during capture:', errors); process.exit(1); }

  await page.screenshot({ path: outFile });
  console.log(`saved ${outFile} (canvas luminance ${lum.toFixed(1)}/255, 0 console errors)`);
} finally {
  await browser.close();
}
