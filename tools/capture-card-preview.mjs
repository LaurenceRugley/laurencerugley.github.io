#!/usr/bin/env node
/* tools/capture-card-preview.mjs — renders tools/card-preview-capture.html
   (a static, fixed 1200x630 reproduction of card.html's own card markup) and
   saves a PNG. No WebGL/boot sequence involved, so unlike capture-og-image.mjs
   there's nothing to wait on beyond fonts settling. Same isolated Chrome/
   Playwright setup as tools/site-probe.mjs. Requires a local server at the
   repo root (the page loads fonts via root-relative paths).

   Usage: node tools/capture-card-preview.mjs <outfile> [url]
     (url defaults to http://localhost:8743/tools/card-preview-capture.html)
*/
import { chromium } from 'playwright-core';

const [, , outFile, urlArg] = process.argv;
if (!outFile) { console.error('usage: node capture-card-preview.mjs <outfile> [url]'); process.exit(1); }
const URL = urlArg || 'http://localhost:8743/tools/card-preview-capture.html';

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
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);

  if (errors.length) { console.error('FAIL — console errors during capture:', errors); process.exit(1); }

  await page.screenshot({ path: outFile });
  console.log(`saved ${outFile} (0 console errors)`);
} finally {
  await browser.close();
}
