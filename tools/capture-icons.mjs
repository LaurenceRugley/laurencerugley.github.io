#!/usr/bin/env node
/* tools/capture-icons.mjs — renders tools/icon-capture.html at 32/180/512px
   and saves the favicon/touch-icon raster set. Same isolated Chrome/
   Playwright setup as tools/site-probe.mjs. Requires a local server at the
   repo root (needs http://, not file://, for the query-string sizing).

   Usage: node tools/capture-icons.mjs [baseUrl]
     (baseUrl defaults to http://localhost:8743)
*/
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:8743';
const TARGETS = [
  { px: 32, out: 'favicon-32.png' },
  { px: 180, out: 'apple-touch-icon.png' },
  { px: 512, out: 'icon-512.png' },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const { px, out } of TARGETS) {
    const ctx = await browser.newContext({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/tools/icon-capture.html?px=${px}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__iconReady === true);
    await page.locator('svg').screenshot({ path: out });
    console.log(`saved ${out} (${px}x${px})`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
