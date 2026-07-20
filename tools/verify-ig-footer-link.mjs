#!/usr/bin/env node
/* tools/verify-ig-footer-link.mjs — one-off check for the Instagram footer
   link added to index.html/card.html/start.html: confirms the href/target/
   rel are correct and visible, and that each page still loads with 0
   console errors. Same isolated Chrome/Playwright setup as site-probe.mjs.

   Usage: node tools/verify-ig-footer-link.mjs <baseUrl>
*/
import { chromium } from 'playwright-core';

const BASE = (process.argv[2] || 'http://localhost:8743').replace(/\/$/, '');
const PAGES = ['/', '/card', '/start'];
let failed = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    // Known, pre-existing, out-of-scope gap (flagged in the brand-continuity
    // report): neither card.html nor start.html declare a favicon link, so a
    // real browser's automatic /favicon.ico probe 404s once per process —
    // unrelated to the IG link this script checks, and explicitly out of this
    // task's scope ("nothing else changes on those files" beyond the footer).
    // Filtered here so a known issue doesn't masquerade as a new regression.
    const errors = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      if (/favicon\.ico/.test(m.location()?.url || '')) return;
      errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
    await page.waitForTimeout(path === '/' ? 1500 : 300);

    const link = page.locator('footer a[href*="instagram.com/lgrwebstudios"]');
    const count = await link.count();
    ok(count === 1, `${path}: exactly one IG footer link (found ${count})`);
    if (count === 1) {
      const href = await link.getAttribute('href');
      const target = await link.getAttribute('target');
      const rel = await link.getAttribute('rel');
      const text = (await link.textContent()).trim();
      ok(href === 'https://www.instagram.com/lgrwebstudios/', `${path}: href correct (${href})`);
      ok(target === '_blank', `${path}: target="_blank" (found "${target}")`);
      ok((rel || '').includes('noopener'), `${path}: rel includes noopener (found "${rel}")`);
      ok(text.length > 0, `${path}: visible link text present ("${text}")`);
      const visible = await link.isVisible();
      ok(visible, `${path}: link is visible (not display:none/hidden)`);
    }
    ok(errors.length === 0, `${path}: 0 console/page errors` + (errors.length ? `  <- ${errors.join(' | ')}` : ''));
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all IG-footer-link checks passed.');
process.exit(failed ? 1 : 0);
