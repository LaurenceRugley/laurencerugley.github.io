#!/usr/bin/env node
/* ============================================================
   tools/size-budget.mjs — eager-payload + vendor-core gz budgets, and a
   vendor-hash drift check. A promote precondition (see promote.sh).

   BUDGETS (gzipped, the wire cost):
   • EAGER total ≤ 80 KB — everything index.html pulls pre-interaction: the HTML
     itself + every <link> stylesheet + every <script src>. The engine core is
     NOT here (it is dynamic-imported by engine-hero, not a tag) — it has its own
     line below. The lazy egg chain is behind egg-loader, so it is not counted
     either: that is the point of the lazy loader.
   • vendor/lgr-engine-hero.es.js ≤ 380 KB — 2026-07-22 (the Lenis swap): this is
     now the lab's lgr-engine-core build (~352 KB gz), not the old hero-only trim
     (~245 KB) — the hero trim never included createSmoothScroll (motion.js's
     first-party Lenis replacement), createCameraDirector, or
     createBeautyPresenter, only -core has all three. Budget raised from 300 KB
     to 380 KB to fit with headroom, a deliberate, reported tradeoff (not a
     silent creep) for deleting vendor/lenis.min.js (~3.8 KB gz) entirely — net
     site-wide vendor weight is up appreciably, in exchange for zero third-party
     scroll-smoothing code.

   Numbers print either way (green or red) so drift is visible before it bites.

   VENDOR-HASH DRIFT (WARN, not fail): md5 the site's engine lib against the lab's
   current dist-lib build. A mismatch means the site is running a different build
   than the lab ships — which must be a deliberate re-vendor, never a silent
   drift. WARN + both hashes so the owner decides.
   ============================================================ */
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// 2026-07-22: the site now vendors the lab's -core build (createSmoothScroll
// lives there, not in the old hero-only trim) — drift check follows suit.
const LAB_CORE = '/Users/lencho/dev/lgr-webgl-lab/packages/engine-core/dist-lib/lgr-engine-core.es.js';
const EAGER_BUDGET = 80 * 1024;
const VENDOR_BUDGET = 380 * 1024;

const gz = (p) => gzipSync(readFileSync(p)).length;
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
let failed = 0;

// ---- eager set: parse index.html's link/script tags ----
const idx = readFileSync(join(ROOT, 'index.html'), 'utf8');
const refs = new Set();
for (const m of idx.matchAll(/<(?:link|script)\b[^>]*\b(?:href|src)="([^"]+)"/gi)) {
  let u = m[1];
  if (/^https?:|^data:|^\/\//i.test(u)) continue;         // external/data — not our bytes
  u = u.split('?')[0].replace(/^\//, '');
  if (/\.(css|js|mjs)$/i.test(u)) refs.add(u);
}

console.log('\n▶ size-budget\n');
console.log('  EAGER payload (index.html + its <link>/<script> assets, gzipped):');
let eager = gz(join(ROOT, 'index.html'));
console.log(`    ${kb(eager).padStart(9)}  index.html`);
for (const r of [...refs].sort()) {
  const fp = join(ROOT, r);
  if (!existsSync(fp)) { console.log(`    ${'MISSING'.padStart(9)}  ${r}`); failed++; continue; }
  const s = gz(fp); eager += s;
  console.log(`    ${kb(s).padStart(9)}  ${r}`);
}
const eagerOk = eager <= EAGER_BUDGET;
console.log(`    ${'—'.padStart(9)}`);
console.log(`    ${kb(eager).padStart(9)}  EAGER TOTAL   [budget ${kb(EAGER_BUDGET)}]  ${eagerOk ? 'OK' : 'OVER ✗'}`);
if (!eagerOk) failed++;

// ---- vendor hero-lib budget ----
const vendorPath = join(ROOT, 'vendor/lgr-engine-hero.es.js');
console.log('\n  VENDOR engine hero-lib:');
if (existsSync(vendorPath)) {
  const vgz = gz(vendorPath);
  const vOk = vgz <= VENDOR_BUDGET;
  console.log(`    ${kb(vgz).padStart(9)}  vendor/lgr-engine-hero.es.js   [budget ${kb(VENDOR_BUDGET)}]  ${vOk ? 'OK' : 'OVER ✗'}`);
  if (!vOk) failed++;
} else {
  console.log('    MISSING  vendor/lgr-engine-hero.es.js'); failed++;
}

// ---- vendor-hash drift (WARN only) ----
console.log('\n  VENDOR-hash drift vs lab dist-lib:');
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
if (existsSync(vendorPath) && existsSync(LAB_CORE)) {
  const a = md5(vendorPath), b = md5(LAB_CORE);
  if (a === b) console.log(`    MATCH  ${a}`);
  else {
    console.log('    ⚠ WARN  drift — site core differs from the lab\'s current build:');
    console.log(`             site: ${a}`);
    console.log(`             lab : ${b}`);
    console.log('             (re-vendor from the lab, or confirm this drift is deliberate.)');
  }
} else {
  console.log(`    (skipped — lab dist-lib not found at ${LAB_CORE})`);
}

console.log(failed ? `\n✗ size-budget RED — ${failed} budget(s) exceeded.` : '\n✓ size-budget GREEN — within budget.');
process.exit(failed ? 1 : 0);
