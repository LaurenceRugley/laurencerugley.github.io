/* ============================================================
   fx/cursor-ripple.js — water-ripple cursor wake (companion mode only).

   A transparent full-viewport WebGL overlay:
     - MOVING lays down a thin, spindly, CURVY filament along your actual path;
       ripples emanate from that drag-line and spread/soften as they age — like
       dragging a pencil across shallow water.
     - CLICKING drops a POOL: many soft concentric rings expanding outward with
       bleeding, mushy edges.
   Light crests + dark troughs read as light on water; the page stays visible.

   Honest scope: a ripple SURFACE over the page (transparent caustics), not true
   refraction of the live text (that needs a build-step rasterize-and-displace).

   Gated to the easter egg: only runs while the pixel companion is on
   (body[data-pixel="on"]). Never inits under prefers-reduced-motion, on touch,
   or without WebGL; pointer-events:none; rAF only while alive; pauses on hide.
   ============================================================ */
(function () {
  'use strict';

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(pointer: fine)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'cursor-ripple';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false })
        || canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
  if (!gl) return;
  document.body.appendChild(canvas);

  var SCALE = 0.7;     // render below CSS res (ripples are soft) — cheaper
  var MAX = 24;        // trail points (the curvy path)
  var ND = 6;          // simultaneous click pools
  var STEP = 9;        // px between interpolated trail points (smooth curve)
  var TLIFE = 1.6;     // trail ripple life (s)
  var DLIFE = 2.4;     // pool life (s)

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FRAG = [
    'precision highp float;',
    '#define MAX ' + MAX,
    '#define ND ' + ND,
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform vec3 u_trail[MAX];', // x, y (backing px, y-up), spawnTime — ordered path
    'uniform int u_tn;',
    'uniform vec3 u_drop[ND];',   // x, y, spawnTime — clicks
    'uniform int u_dn;',
    // distance from point p to the segment a->b
    'float segDist(vec2 p, vec2 a, vec2 b){',
    '  vec2 pa = p - a, ba = b - a;',
    '  float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);',
    '  return length(pa - ba * t);',
    '}',
    'void main(){',
    '  vec2 f = gl_FragCoord.xy;',
    '  float h = 0.0;',
    // ---- spindly curvy trail: ripples emanate from the drag-line, spread w/ age
    '  for (int i = 1; i < MAX; i++) {',
    '    if (i >= u_tn) break;',
    '    vec3 a = u_trail[i - 1], b = u_trail[i];',
    '    float age = u_time - b.z;',
    '    if (age < 0.0 || age > ' + TLIFE.toFixed(1) + ') continue;',
    '    float d = segDist(f, a.xy, b.xy);',
    '    float life = 1.0 - age / ' + TLIFE.toFixed(1) + ';',
    '    float spread = 8.0 + age * 42.0;',                  // thin near the line, bleeds wider w/ age
    '    h += sin(d * 0.18 - u_time * 4.0) * exp(-d / spread) * life * 0.6;',
    '  }',
    // ---- click pools: many soft concentric rings expanding out, mushy edges
    '  for (int j = 0; j < ND; j++) {',
    '    if (j >= u_dn) break;',
    '    vec3 dp = u_drop[j];',
    '    float age = u_time - dp.z;',
    '    if (age < 0.0 || age > ' + DLIFE.toFixed(1) + ') continue;',
    '    float d = distance(f, dp.xy);',
    '    float life = 1.0 - age / ' + DLIFE.toFixed(1) + ';',
    '    float spread = 22.0 + age * 170.0;',                // rings reach further as they age (bleed)
    '    h += sin(d * 0.13 - u_time * 5.0) * exp(-d / spread) * life * 1.1;',
    '  }',
    '  float a = clamp(abs(h), 0.0, 1.0) * 0.4;',            // transparent — page shows through
    '  vec3 col = h > 0.0 ? vec3(1.0) : vec3(0.04);',        // crest light, trough dark
    '  gl_FragColor = vec4(col, a);',
    '}'
  ].join('\n');

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; } return s; }
  var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.remove(); return; }
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  var uRes = gl.getUniformLocation(prog, 'u_res');
  var uTime = gl.getUniformLocation(prog, 'u_time');
  var uTrail = gl.getUniformLocation(prog, 'u_trail');
  var uTn = gl.getUniformLocation(prog, 'u_tn');
  var uDrop = gl.getUniformLocation(prog, 'u_drop');
  var uDn = gl.getUniformLocation(prog, 'u_dn');

  function size() {
    canvas.width = Math.max(1, Math.round(window.innerWidth * SCALE));
    canvas.height = Math.max(1, Math.round(window.innerHeight * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  size(); window.addEventListener('resize', size);

  var trail = [];          // ordered {x, y, t} path points (backing px, y-up)
  var drops = [];          // {x, y, t} clicks
  var trailData = new Float32Array(MAX * 3);
  var dropData = new Float32Array(ND * 3);
  var rafId = null, t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  var lastX = null, lastY = null;
  function nowSec() { return (((window.performance && performance.now) ? performance.now() : Date.now()) - t0) / 1000; }
  function enabled() { return document.body.getAttribute('data-pixel') === 'on'; }
  function wake() { if (rafId == null) rafId = requestAnimationFrame(frame); }

  window.addEventListener('pointermove', function (e) {
    if (!enabled() || (e.pointerType && e.pointerType !== 'mouse')) return;
    var x = e.clientX * SCALE, y = canvas.height - e.clientY * SCALE;
    if (lastX == null) { lastX = x; lastY = y; }
    var dx = x - lastX, dy = y - lastY, dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.min(MAX, Math.floor(dist / STEP));
    for (var s = 1; s <= steps; s++) { trail.push({ x: lastX + dx * (s / (steps + 1)), y: lastY + dy * (s / (steps + 1)), t: nowSec() }); }
    trail.push({ x: x, y: y, t: nowSec() });
    while (trail.length > MAX) trail.shift();
    lastX = x; lastY = y; wake();
  }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    if (!enabled() || (e.pointerType && e.pointerType !== 'mouse')) return;
    drops.push({ x: e.clientX * SCALE, y: canvas.height - e.clientY * SCALE, t: nowSec() });
    while (drops.length > ND) drops.shift();
    wake();
  }, { passive: true });

  function frame() {
    rafId = null;
    var now = nowSec();
    while (trail.length && now - trail[0].t > TLIFE) trail.shift();
    while (drops.length && now - drops[0].t > DLIFE) drops.shift();
    gl.clear(gl.COLOR_BUFFER_BIT);
    if ((trail.length || drops.length) && enabled()) {
      for (var i = 0; i < trail.length; i++) { trailData[i*3] = trail[i].x; trailData[i*3+1] = trail[i].y; trailData[i*3+2] = trail[i].t; }
      for (var j = 0; j < drops.length; j++) { dropData[j*3] = drops[j].x; dropData[j*3+1] = drops[j].y; dropData[j*3+2] = drops[j].t; }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now);
      gl.uniform1i(uTn, trail.length);
      gl.uniform1i(uDn, drops.length);
      gl.uniform3fv(uTrail, trailData);
      gl.uniform3fv(uDrop, dropData);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafId = requestAnimationFrame(frame);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { trail = []; drops = []; lastX = lastY = null; if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } gl.clear(gl.COLOR_BUFFER_BIT); }
  });
})();
