#!/usr/bin/env node
/* tools/verify-new-pages.mjs — one-off content probe for the two new IG-bio-link
   pages (/contact, /atelier): confirms each renders with zero console errors,
   correct <title>/og tags, and the specific content the brief called for
   (mailto CTA + plain selectable email on /contact; 5 steps + closing CTA on
   /atelier). Same isolated Chrome/Playwright setup as tools/site-probe.mjs.

   Usage: node tools/verify-new-pages.mjs <baseUrl>
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  // ---------- /contact ----------
  {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    const resp = await page.goto(`${BASE}/contact`, { waitUntil: 'load' });
    ok(resp.status() === 200, `/contact responds 200 (got ${resp.status()})`);
    ok((await page.title()) === 'Book a free website consult — LGR Web Studios, Pasadena', `/contact title exact match: "${await page.title()}"`);
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    ok(ogUrl === 'https://lgrwebstudios.com/contact', `og:url is clean canonical (${ogUrl})`);
    const mailHref = await page.locator('a.cta').first().getAttribute('href');
    ok(mailHref === 'mailto:hello@lgrwebstudios.com?subject=Free%2015-min%20consult', `primary CTA is the correct mailto (${mailHref})`);
    const plainMail = await page.locator('.mail-plain').textContent();
    ok(plainMail.trim() === 'hello@lgrwebstudios.com', `plain selectable email text present (not just inside the mailto link): "${plainMail.trim()}"`);
    const userSelect = await page.locator('.mail-plain').evaluate((el) => getComputedStyle(el).userSelect);
    ok(userSelect === 'all', `plain email has user-select: all for one-tap copy (found "${userSelect}")`);
    const igHref = await page.locator('a.cta-secondary').getAttribute('href');
    ok(igHref === 'https://www.instagram.com/lgrwebstudios', `Instagram secondary link correct (${igHref})`);
    ok(errors.length === 0, `0 console/page errors on /contact` + (errors.length ? `  <- ${errors.join(' | ')}` : ''));
    await page.screenshot({ path: 'contact-render-check.png' });
    await page.close();
  }

  // ---------- /atelier ----------
  {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    const resp = await page.goto(`${BASE}/atelier`, { waitUntil: 'load' });
    ok(resp.status() === 200, `/atelier responds 200 (got ${resp.status()})`);
    ok((await page.title()) === 'How we build — no templates | LGR Web Studios', `/atelier title exact match: "${await page.title()}"`);
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    ok(ogUrl === 'https://lgrwebstudios.com/atelier', `og:url is clean canonical (${ogUrl})`);
    const stepCount = await page.locator('.step').count();
    ok(stepCount === 5, `exactly 5 steps rendered (found ${stepCount})`);
    const closingHref = await page.locator('.closing a.cta').getAttribute('href');
    ok(closingHref === '/contact', `closing CTA points to /contact (${closingHref})`);
    ok(errors.length === 0, `0 console/page errors on /atelier` + (errors.length ? `  <- ${errors.join(' | ')}` : ''));
    await page.screenshot({ path: 'atelier-render-check.png' });
    await page.close();
  }

  // ---------- card-preview.png (shared og:image for card/start/contact/atelier) ----------
  {
    const page = await ctx.newPage();
    const resp = await page.request.get(`${BASE}/card-preview.png?v=2`);
    ok(resp.ok(), `card-preview.png?v=2 fetches 200 (${BASE}/card-preview.png?v=2)`);
    const buf = await resp.body();
    const dims = await page.evaluate(async (b64) => {
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob);
      return { w: bmp.width, h: bmp.height };
    }, buf.toString('base64'));
    ok(dims.w === 1200 && dims.h === 630, `card-preview.png is exactly 1200x630 (found ${dims.w}x${dims.h})`);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all new-page checks passed.');
process.exit(failed ? 1 : 0);
