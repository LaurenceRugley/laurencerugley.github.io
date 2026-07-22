#!/usr/bin/env node
/* tools/verify-ig-feed.mjs — confirms the Latest-from-Instagram section
   renders the sample grid, at both desktop and a true 375px mobile
   viewport (Playwright sets this directly — no OS window-resize floor to
   fight, unlike interactive browser control), with zero console errors.

   Usage: node tools/verify-ig-feed.mjs <url>   (defaults to localhost:8743)
*/
import { chromium } from 'playwright-core';

const URL = process.argv[2] || 'http://localhost:8743/';
let failed = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile-375', { width: 375, height: 812 }]]) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(URL, { waitUntil: 'load' });
    await page.locator('#ig-feed-grid').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelectorAll('#ig-feed-grid .ig-tile').length > 0, null, { timeout: 10000 });

    // 1-9: the committed sample is always a fixed 9, but a real live feed
    // can legitimately have anywhere from 1 up to MAX_TILES (fx/ig-feed.js)
    // real posts -- an empty feed never reaches this state at all (the
    // client's own fetchFeed() treats 0 items as a failure and falls back
    // to sample), so 1 is the true floor, not an arbitrary loosening.
    const tileCount = await page.locator('#ig-feed-grid .ig-tile').count();
    ok(tileCount >= 1 && tileCount <= 9, `[${label}] renders 1-9 tiles (found ${tileCount})`);

    // The feed is expected to be LIVE once Task 3's Worker is deployed (this
    // script also runs pre-deploy, where sample is the correct/expected
    // state) — accept either, but always report which one was found so a
    // human catches an unexpected mode at a glance.
    const captionText = await page.locator('#ig-feed-caption').textContent();
    const isLive = /live/i.test(captionText || '');
    const isSample = /sample/i.test(captionText || '');
    ok(isLive || isSample, `[${label}] caption discloses feed mode — "${captionText}"`);
    console.log(`  INFO  [${label}] feed mode: ${isLive ? 'LIVE' : isSample ? 'sample' : 'unknown'}`);

    const firstHref = await page.locator('#ig-feed-grid .ig-tile').first().getAttribute('href');
    ok(!!firstHref && firstHref.includes('instagram.com'), `[${label}] tiles link out to Instagram (found ${firstHref})`);

    ok(errors.length === 0, `[${label}] 0 console/page errors` + (errors.length ? `  <- ${errors.slice(0, 5).join(' | ')}` : ''));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all ig-feed checks passed.');
process.exit(failed ? 1 : 0);
