#!/usr/bin/env node
/* tools/verify-meta.mjs — Outreach-readiness wave: parses the homepage's
   actual <head> tags programmatically (not eyeballed), confirms the
   og:image is a real, correctly-sized, fetchable asset, checks the
   favicon/touch-icon/manifest files actually exist and are valid, validates
   the JSON-LD, and does a full-page regression pass (console errors, hero
   canvas, all wave-2/polish markers still present). Same isolated Chrome/
   Playwright setup as tools/site-probe.mjs.

   Usage: node tools/verify-meta.mjs <baseUrl>
     (baseUrl defaults to http://localhost:8743 — pass https://lgrwebstudios.com
     to run the same checks against production post-promote)
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
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}/`, { waitUntil: 'load' });

  // ---------- 1: title + description ----------
  const title = await page.title();
  ok(title === 'LGR Web Studios — custom websites, made by hand · Pasadena', `title exact match: "${title}"`);
  ok(title.length <= 60, `title length OK for search display (${title.length} chars)`);
  const desc = await page.locator('meta[name="description"]').getAttribute('content');
  ok(!!desc && desc.length > 50 && desc.length <= 160, `meta description present, reasonable length (${desc ? desc.length : 0} chars)`);
  ok(!/\b(\w+)\b(?:.*\b\1\b){3,}/i.test(desc || ''), 'meta description has no obvious keyword-stuffing repetition');

  // ---------- 2: social cards ----------
  const tags = {};
  for (const prop of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:width', 'og:image:height', 'og:image:alt']) {
    tags[prop] = await page.locator(`meta[property="${prop}"]`).getAttribute('content');
  }
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    tags[name] = await page.locator(`meta[name="${name}"]`).getAttribute('content');
  }
  ok(tags['og:type'] === 'website', 'og:type = website');
  ok(tags['og:title'] === title, 'og:title matches <title>');
  ok(tags['og:url'] === 'https://lgrwebstudios.com/', `og:url is the canonical production URL (${tags['og:url']})`);
  ok(!!tags['og:image'] && !tags['og:image'].startsWith('data:'), `og:image is a real URL, not a data URI (${tags['og:image']})`);
  ok(tags['og:image:width'] === '1200' && tags['og:image:height'] === '630', 'og:image:width/height declared as 1200x630');
  ok(tags['twitter:card'] === 'summary_large_image', 'twitter:card = summary_large_image');
  ok(tags['twitter:image'] === tags['og:image'], 'twitter:image matches og:image');

  // Fetch the actual image bytes and confirm real dimensions match what's declared.
  const imgUrl = tags['og:image'].replace('https://lgrwebstudios.com', BASE);
  const imgResp = await page.request.get(imgUrl);
  ok(imgResp.ok(), `og:image URL fetches 200 (${imgUrl})`);
  const imgBuf = await imgResp.body();
  const dims = await page.evaluate(async (b64) => {
    const blob = await (await fetch(`data:image/jpeg;base64,${b64}`)).blob();
    const bmp = await createImageBitmap(blob);
    return { w: bmp.width, h: bmp.height };
  }, imgBuf.toString('base64'));
  ok(dims.w === 1200 && dims.h === 630, `og:image real dimensions are exactly 1200x630 (found ${dims.w}x${dims.h})`);
  ok(imgBuf.length < 500 * 1024, `og:image file size is reasonable for fast unfurling (${(imgBuf.length / 1024).toFixed(0)} KB)`);

  // ---------- 3: favicon / touch icons / manifest ----------
  const svgIcon = await page.locator('link[rel="icon"][href^="data:"]').count();
  ok(svgIcon === 1, 'inline SVG favicon still present');
  const pngIconHref = await page.locator('link[rel="icon"][type="image/png"]').getAttribute('href');
  const touchIconHref = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  for (const [label, href, expectSize] of [['32px PNG favicon', pngIconHref, 32], ['apple-touch-icon', touchIconHref, 180], ['manifest', manifestHref, null]]) {
    if (!href) { ok(false, `${label} link present`); continue; }
    const resp = await page.request.get(`${BASE}/${href}`);
    ok(resp.ok(), `${label} (${href}) fetches 200`);
    if (expectSize) {
      const buf = await resp.body();
      const d = await page.evaluate(async (b64) => {
        const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
        const bmp = await createImageBitmap(blob);
        return { w: bmp.width, h: bmp.height };
      }, buf.toString('base64'));
      ok(d.w === expectSize && d.h === expectSize, `${label} is exactly ${expectSize}x${expectSize} (found ${d.w}x${d.h})`);
    }
  }
  const manifestResp = await page.request.get(`${BASE}/${manifestHref}`);
  const manifestJson = JSON.parse(await manifestResp.text());
  ok(Array.isArray(manifestJson.icons) && manifestJson.icons.length > 0, 'site.webmanifest parses and declares at least one icon');

  // ---------- 4: LocalBusiness JSON-LD ----------
  const ldJsonText = await page.locator('script[type="application/ld+json"]').textContent();
  let ld;
  try { ld = JSON.parse(ldJsonText); } catch (e) { ok(false, `JSON-LD parses (${e.message})`); }
  if (ld) {
    ok(ld['@context'] === 'https://schema.org', 'JSON-LD @context is schema.org');
    ok(ld['@type'] === 'LocalBusiness', 'JSON-LD @type is LocalBusiness');
    ok(ld.name === 'LGR Web Studios', 'JSON-LD name matches');
    ok(ld.url === 'https://lgrwebstudios.com/', 'JSON-LD url matches canonical');
    ok(!('aggregateRating' in ld) && !('review' in ld), 'no invented aggregateRating/review fields');
    ok(!('openingHoursSpecification' in ld) && !('openingHours' in ld), 'no invented openingHours fields');
    ok(!('telephone' in ld) || typeof ld.telephone === 'string', 'no fabricated telephone shape issue');
    ok(!('priceRange' in ld), 'no invented priceRange field');
    ok(Array.isArray(ld.areaServed) && ld.areaServed.some((a) => /pasadena/i.test(a)) && ld.areaServed.some((a) => /los angeles/i.test(a)), `areaServed covers Pasadena + LA (${JSON.stringify(ld.areaServed)})`);
  }

  // ---------- 5: regression pass — wave-2/polish markers + hero still fine ----------
  await page.waitForSelector('#hero-3d-mount canvas', { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => {
    const m = document.getElementById('hero-3d-mount');
    const c = m && m.querySelector('canvas');
    return c && m.classList.contains('is-loaded') && parseFloat(getComputedStyle(c).opacity || '1') > 0.95;
  }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);
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
  ok(lum > 6, `hero canvas still renders non-black (luminance ${lum.toFixed(1)}/255)`);
  ok(await page.locator('.proof-sheet .conviction').count() === 3, 'G: proof-sheet still intact (3 convictions)');
  ok(await page.locator('.station').count() === 4, 'H: press-run stations still intact (4 stations)');
  ok(await page.locator('.prove-handle').count() === 1, 'I: prove-it straight-bar divider still intact');
  ok(await page.locator('.prove-seam').count() === 0, 'I: liquid seam confirmed removed (2026-07-20 redesign)');
  ok(errors.length === 0, `0 console/page errors across the whole pass` + (errors.length ? `  <- ${errors.slice(0, 5).join(' | ')}` : ''));

  await page.screenshot({ path: 'og-image-render-check.png', clip: { x: 0, y: 0, width: 1280, height: 900 } });
} finally {
  await browser.close();
}
console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all meta checks passed.');
process.exit(failed ? 1 : 0);
