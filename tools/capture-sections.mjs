#!/usr/bin/env node
/* tools/capture-sections.mjs — Polish wave pixel-QA pass: screenshot every
   top-level section individually (plus the seams between them) at a given
   width, so section rhythm/spacing/gutters can actually be reviewed at a
   readable resolution instead of one unreadable full-page strip. Same
   isolated Chrome/Playwright setup as tools/site-probe.mjs.
   Usage: node tools/capture-sections.mjs <width> <outDir> [url]
*/
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const [, , widthArg, outDir, urlArg] = process.argv;
const width = Number(widthArg);
if (!width || !outDir) { console.error('usage: node capture-sections.mjs <width> <outDir> [url]'); process.exit(1); }
const URL = urlArg || 'http://localhost:8743/';
mkdirSync(outDir, { recursive: true });

// NOTE: #top is the <main> wrapper around the WHOLE page, not the hero —
// use the .hero class for the actual hero section.
const SELECTORS = ['.hero', '#recent-work', '#approach', '#process', '#work', '#services', '#human', '#prove-it', '#start', '#finale'];

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
try {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: width < 500 ? 2 : 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible')));
  await page.waitForTimeout(300);

  for (const sel of SELECTORS) {
    const loc = page.locator(sel).first();
    if (await loc.count() === 0) { console.log('  skip (not found):', sel); continue; }
    await loc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const name = sel.replace(/^[.#]/, '');
    const file = `${outDir}/${width}-${name}.png`;
    await loc.screenshot({ path: file });
    console.log('saved', file);
  }

  // Also grab two full-viewport "seam" shots per boundary already captured
  // above via natural document flow — plus the footer, which has no id.
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.locator('footer').screenshot({ path: `${outDir}/${width}-footer.png` });
  console.log('saved', `${outDir}/${width}-footer.png`);
} finally {
  await browser.close();
}
