#!/usr/bin/env node
/* tools/capture-full-page.mjs — Polish wave pixel-QA pass: full-page
   screenshots at a given width against the local dev server. Same isolated
   Chrome/Playwright setup as tools/site-probe.mjs.
   Usage: node tools/capture-full-page.mjs <width> <outfile> [url]
*/
import { chromium } from 'playwright-core';

const [, , widthArg, outFile, urlArg] = process.argv;
const width = Number(widthArg);
if (!width || !outFile) { console.error('usage: node capture-full-page.mjs <width> <outfile> [url]'); process.exit(1); }
const URL = urlArg || 'http://localhost:8743/';

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
try {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width < 500 ? 2 : 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  // Let every reveal + the hero settle before the full-page capture.
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    // Force every .reveal visible so the full-page shot shows the settled
    // state throughout, not whatever happened to be mid-fade at capture time.
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: outFile, fullPage: true });
  console.log('saved', outFile);
} finally {
  await browser.close();
}
