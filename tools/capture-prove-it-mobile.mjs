#!/usr/bin/env node
/* tools/capture-prove-it-mobile.mjs — one-off isolated capture for the
   prove-it mobile-label-clipping fix re-verification. Same isolated
   Chrome/Playwright setup as tools/site-probe.mjs (own profile, no
   extensions) — NOT the owner's live browser (DESIGN doctrine). */
import { chromium } from 'playwright-core';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: node capture-prove-it-mobile.mjs <outfile>'); process.exit(1); }

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8743/', { waitUntil: 'load' });
  await page.locator('#prove-it').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500); // let the reveal cascade finish
  await page.screenshot({ path: OUT });
  console.log('saved', OUT);
} finally {
  await browser.close();
}
