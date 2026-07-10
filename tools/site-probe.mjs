#!/usr/bin/env node
/* ============================================================
   tools/site-probe.mjs — the live real-Chrome guard for lgrwebstudios.com.
   ------------------------------------------------------------
   Statically serves the site repo and drives it in headless real Chrome
   (playwright-core, channel:chrome — SwiftShader for WebGL). Asserts the
   things a broken promote would silently ship:

   • HERO renders — the WebGL hero canvas is non-black once SETTLED. We wait for
     the fade to finish and read pixels AFTER it, never at attach: an at-attach
     read is black because the canvas is mid-fade-in (the fade-in false-fail
     lesson). Sampled by drawing the GL canvas into a 2D context and taking mean
     luminance.
   • EGG chain works THROUGH the lazy loader — localStorage lgr-pixel-mode=on
     before load → the companion mounts → Konami → .codec-call visible at settled
     opacity 1 → one Esc removes the codec THEN chains the trophy → a second Esc
     closes the trophy.
   • 0 console / page errors on a CLEAN profile (no extensions → no extension
     noise by construction; every error here is the site's).
   • META stays de-leaked — zero github.io or googleapis in the og:/twitter:/link
     tags of index, card, AND start.
   • The 3 Work images carry loading="lazy".

   NEGATIVE CONTROL (permanent — "a check that can't fail is not a check"):
   NEG=1 force-hides the hero canvas before the settle read, so the hero
   assertion MUST go red. Exit code is inverted in NEG mode: a NEG run that comes
   back green means the hero check has gone blind and the probe is worthless.
   Precedent: the lab's tools/egg-probe.mjs.

   Usage:  node tools/site-probe.mjs           (must PASS, exit 0)
           NEG=1 node tools/site-probe.mjs       (negative control; must be RED → exit 0 only if it failed)
   ============================================================ */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NEG = !!process.env.NEG;

// playwright-core: prefer the site's own install, else fall back to the lab's
// (this is a local promote-precondition tool; the lab is guaranteed present on
// the owner's machine). Documented coupling, not a surprise.
const require = createRequire(import.meta.url);
function resolvePlaywright() {
  for (const paths of [undefined, [ROOT], ['/Users/lencho/dev/lgr-webgl-lab']]) {
    try { return require.resolve('playwright-core', paths ? { paths } : undefined); }
    catch { /* try next */ }
  }
  return null;
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};
function startServer(root) {
  const srv = createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p.endsWith('/')) p += 'index.html';
    const fp = join(root, p);
    if (!fp.startsWith(root) || !existsSync(fp) || statSync(fp).isDirectory()) {
      res.statusCode = 404; return res.end('404');
    }
    res.setHeader('content-type', MIME[extname(fp)] || 'application/octet-stream');
    res.end(readFileSync(fp));
  });
  return new Promise((r) => srv.listen(0, () =>
    r({ url: `http://localhost:${srv.address().port}`, close: () => srv.close() })));
}

let failed = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };

// --- meta / lazy checks are pure file reads (no browser needed) ---
function metaSanity() {
  for (const page of ['index.html', 'card.html', 'start.html']) {
    const html = readFileSync(join(ROOT, page), 'utf8');
    const tags = (html.match(/<(meta|link)\b[^>]*>/gi) || [])
      .filter((t) => /og:|twitter:|rel=["']?(canonical|stylesheet|preload|icon)/i.test(t));
    const leak = tags.find((t) => /laurencerugley\.github\.io|fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(t));
    ok(!leak, `${page}: no github.io / googleapis leak in og/twitter/link tags` + (leak ? `  ← ${leak.trim()}` : ''));
  }
  const idx = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const workImgs = idx.match(/<img[^>]*src="work\/[^>]*>/gi) || [];
  ok(workImgs.length === 3, `index: found ${workImgs.length}/3 Work <img>`);
  ok(workImgs.every((t) => /loading="lazy"/.test(t)), 'index: all 3 Work imgs are loading="lazy"');
}

async function run() {
  console.log(`\n▶ site-probe${NEG ? '  [NEGATIVE CONTROL: hero canvas force-hidden, expecting RED]' : ''}`);
  metaSanity();

  const pwPath = resolvePlaywright();
  if (!pwPath) {
    console.log('  FAIL  playwright-core not resolvable (site node_modules or lab). `npm i` in the site repo.');
    failed++; return;
  }
  const pw = require(pwPath);            // playwright-core is CommonJS
  const chromium = pw.chromium || (pw.default && pw.default.chromium);
  const server = await startServer(ROOT);
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

    // Pixel mode ON before first load so the companion mounts via the lazy loader.
    await ctx.addInitScript(() => { try { localStorage.setItem('lgr-pixel-mode', 'on'); } catch (e) {} });
    await page.goto(`${server.url}/`, { waitUntil: 'load' });

    // ---- HERO: wait for the fade to finish, THEN read pixels ----
    await page.waitForSelector('#hero-3d-mount canvas', { timeout: 20000 }).catch(() => {});
    if (NEG) await page.evaluate(() => {
      const c = document.querySelector('#hero-3d-mount canvas'); if (c) c.style.display = 'none';
    });
    // settle: mount is-loaded AND canvas opacity ~1 (never sample at attach)
    await page.waitForFunction(() => {
      const m = document.getElementById('hero-3d-mount');
      const c = m && m.querySelector('canvas');
      if (!c) return false;
      const op = parseFloat(getComputedStyle(c).opacity || '1');
      return m.classList.contains('is-loaded') && op > 0.95;
    }, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200); // a few frames past the fade
    const lum = await page.evaluate(() => {
      const c = document.querySelector('#hero-3d-mount canvas');
      if (!c || c.style.display === 'none' || !c.width) return -1;
      const o = document.createElement('canvas'); o.width = 64; o.height = 36;
      const g = o.getContext('2d');
      try { g.drawImage(c, 0, 0, 64, 36); } catch (e) { return -2; }
      const d = g.getImageData(0, 0, 64, 36).data;
      let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return s / (d.length / 4);
    });
    ok(lum > 6, `hero canvas non-black once settled (mean luminance ${lum < 0 ? 'unreadable/hidden' : lum.toFixed(1)}/255, need >6)`);

    // ---- EGG chain through the lazy loader ----
    await page.waitForSelector('.pixel-sprite', { timeout: 8000 }).catch(() => {});
    const spriteMounted = await page.evaluate(() => !!document.querySelector('.pixel-sprite'));
    ok(spriteMounted, 'companion mounts via the lazy loader (pixel-mode=on at boot)');

    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) {
      await page.keyboard.press(k);
    }
    // Wait for the codec's fade-in to SETTLE before reading opacity — never at
    // attach (the same fade-in false-fail lesson as the hero: ccFade is 0.3s).
    await page.waitForFunction(() => {
      const o = document.querySelector('.codec-call');
      return o && parseFloat(getComputedStyle(o).opacity || '0') > 0.99;
    }, null, { timeout: 3000 }).catch(() => {});
    const codecUp = await page.evaluate(() => {
      const o = document.querySelector('.codec-call');
      if (!o) return { open: false };
      return { open: true, opacity: parseFloat(getComputedStyle(o).opacity || '0'),
               panelFocus: document.activeElement === document.querySelector('.codec-call-panel') };
    });
    ok(codecUp.open && codecUp.opacity > 0.95, `codec appears at settled opacity 1 (opacity ${codecUp.opacity ?? 'n/a'})`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400); // past the 280ms close
    const afterEsc1 = await page.evaluate(() => ({
      codec: !!document.querySelector('.codec-call'), trophy: !!document.querySelector('.konami-trophy'),
    }));
    ok(!afterEsc1.codec && afterEsc1.trophy, `one Esc removes codec THEN chains trophy (codec:${afterEsc1.codec} trophy:${afterEsc1.trophy})`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500); // past the trophy's fade-out
    const afterEsc2 = await page.evaluate(() => !!document.querySelector('.konami-trophy'));
    ok(!afterEsc2, 'second Esc closes the trophy');

    ok(errors.length === 0, `0 console/page errors on a clean profile` + (errors.length ? `  ← ${errors.slice(0, 3).join(' | ')}` : ''));
  } finally {
    await browser.close();
    server.close();
  }
}

run().then(() => {
  const red = failed > 0;
  if (NEG) {
    // Negative control: the run MUST be red. Green here means the hero check went blind.
    console.log(red
      ? `\n✓ NEG control correct — probe went RED with the hero hidden (${failed} fail).`
      : `\n✗ NEG control BROKEN — probe passed with the hero hidden. The hero check is blind.`);
    process.exit(red ? 0 : 1);
  }
  console.log(red ? `\n✗ site-probe RED — ${failed} assertion(s) failed.` : `\n✓ site-probe GREEN — all assertions passed.`);
  process.exit(red ? 1 : 0);
}).catch((e) => { console.error('site-probe crashed:', e); process.exit(1); });
