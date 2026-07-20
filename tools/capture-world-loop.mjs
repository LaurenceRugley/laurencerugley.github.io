#!/usr/bin/env node
/* tools/capture-world-loop.mjs — records a seamless-loop backdrop video from
   one real running engine scene, for the prove-it "world cycle" feature.
   Same isolated Chrome/Playwright setup as site-probe.mjs, boots
   tools/world-capture.html?scene=<name> (the real engine, no mock).

   A live procedural scene's own internal clock essentially never lines up
   into a clean loop point on its own, so this captures a short "unique"
   clip then builds a boomerang loop (forward + time-reversed) via ffmpeg —
   the loop seam is then two literally-identical frames (last-forward /
   first-reversed, and last-reversed / first-forward-next-cycle), which is
   as seamless as a loop can get. Ambient scenes like these (soft light/
   gradient/particle drift, no strong one-directional physics) read as
   natural in reverse — verified visually per scene, not assumed; see the
   report for which scenes this held for cleanly.

   Encodes both a muted webm (VP9) and an h264 mp4 fallback, escalating CRF
   (lower quality) up to 2 times if the first pass misses the 1.5MB budget.

   Usage: node tools/capture-world-loop.mjs <sceneKey> <outDir> [url]
     sceneKey: firstlight | letterpress | cathedrallight | dunes
     (url defaults to http://localhost:8743/tools/world-capture.html)
*/
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [, , sceneKey, outDir, urlArg] = process.argv;
if (!sceneKey || !outDir) {
  console.error('usage: node capture-world-loop.mjs <sceneKey> <outDir> [url]');
  process.exit(1);
}
const BASE_URL = urlArg || 'http://localhost:8743/tools/world-capture.html';
const BUDGET_BYTES = 1.5 * 1024 * 1024;
const UNIQUE_SECONDS = 4.5; // boomeranged to ~9s total, inside the 6-10s target

const work = mkdtempSync(join(tmpdir(), 'world-loop-'));

function ff(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
}

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
let rawPath;
try {
  const t0 = Date.now();
  const ctx = await browser.newContext({
    viewport: { width: 920, height: 384 },
    recordVideo: { dir: work, size: { width: 920, height: 384 } },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE_URL}?scene=${sceneKey}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__worldCaptureReady === true, null, { timeout: 20000 });
  await page.waitForTimeout(1800); // let the scene visually settle past any initial fade-in
  const tCleanStart = Date.now();
  await page.waitForTimeout(UNIQUE_SECONDS * 1000);
  const tCleanEnd = Date.now();

  if (errors.length) { console.error('FAIL — console errors during capture:', errors); process.exit(1); }

  const video = page.video();
  await ctx.close();
  rawPath = await video.path();
  await browser.close();

  const offset = ((tCleanStart - t0) / 1000).toFixed(2);
  const duration = ((tCleanEnd - tCleanStart) / 1000).toFixed(2);

  // Trim to the clean segment, normalize to a constant frame rate.
  const trimmed = join(work, 'trimmed.mp4');
  ff(['-ss', offset, '-i', rawPath, '-t', duration, '-an', '-r', '24', '-pix_fmt', 'yuv420p', trimmed]);

  // Boomerang: forward + time-reversed, concatenated.
  const reversed = join(work, 'reversed.mp4');
  ff(['-i', trimmed, '-vf', 'reverse', '-an', reversed]);
  const listFile = join(work, 'concat.txt');
  writeFileSync(listFile, `file '${trimmed}'\nfile '${reversed}'\n`);
  const boomerang = join(work, 'boomerang.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', boomerang]);

  // Encode both target formats, escalating CRF up to 2 times if oversized.
  function encode(codec, ext, crfLadder) {
    const outPath = join(outDir, `${sceneKey}.${ext}`);
    for (let i = 0; i < crfLadder.length; i++) {
      const crf = crfLadder[i];
      if (codec === 'vp9') {
        ff(['-i', boomerang, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-an', '-pix_fmt', 'yuv420p', outPath]);
      } else {
        ff(['-i', boomerang, '-c:v', 'libx264', '-crf', String(crf), '-preset', 'slow', '-an', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outPath]);
      }
      const size = statSync(outPath).size;
      console.log(`  ${sceneKey}.${ext} @ crf=${crf}: ${(size / 1024).toFixed(0)} KB`);
      if (size <= BUDGET_BYTES) return { outPath, size, crf };
      if (i === crfLadder.length - 1) return { outPath, size, crf, overBudget: true };
    }
  }

  const webmResult = encode('vp9', 'webm', [20, 26, 32]);
  const mp4Result = encode('h264', 'mp4', [20, 25, 30]);

  console.log(JSON.stringify({ sceneKey, offset, duration, webm: webmResult, mp4: mp4Result }));
} finally {
  try { rmSync(work, { recursive: true, force: true }); } catch (_) {}
}
