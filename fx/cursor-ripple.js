/* ============================================================
   fx/cursor-ripple.js — water-ripple cursor wake (companion mode only).

   A transparent full-viewport WebGL overlay. Moving the pointer lays down a
   TRAIL of expanding ripples behind it (like a finger dragged across shallow
   water); clicking drops a stronger POOL splash. Light crests + dark troughs
   read as light on water; the page stays fully visible underneath.

   Honest scope: a ripple SURFACE drawn over the page (transparent caustics),
   not true refraction of the live text (that needs a build-step DOM-to-texture).

   Gated to the easter egg: only runs while the pixel companion is on
   (body[data-pixel="on"]). Zero cost otherwise. Never inits under
   prefers-reduced-motion, on touch (no fine pointer), or without WebGL;
   pointer-events:none; rAF only while enabled + ripples alive; pauses on hide.
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

  var SCALE = 0.7;   // render below CSS res (ripples are soft) — cheaper
  var MAX = 20;      // recent ripple sources contributing (trail length)
  var STEP = 14;     // px between trail points (interpolated for smooth wake)

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FRAG = [
    'precision highp float;',
    '#define MAX ' + MAX,
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform vec4 u_pts[MAX];', // x, y (backing px, y-up), spawnTime, amplitude
    'uniform int u_count;',
    'void main(){',
    '  vec2 f = gl_FragCoord.xy;',
    '  float h = 0.0;',
    '  for (int i = 0; i < MAX; i++) {',
    '    if (i >= u_count) break;',
    '    vec4 pt = u_pts[i];',
    '    float age = u_time - pt.z;',
    '    if (age <= 0.0 || age > 1.6) continue;',
    '    float d = distance(f, pt.xy);',
    '    float r = age * 175.0;',                          // ring expansion speed (backing px/s)
    '    float ring = exp(-pow((d - r) / 16.0, 2.0));',    // soft expanding band
    '    float life = 1.0 - age / 1.6;',                   // fade with age
    '    h += sin((d - r) * 0.16) * ring * life * pt.w;',  // pt.w = amplitude (move vs pool)
    '  }',
    '  float a = clamp(abs(h), 0.0, 1.0) * 0.42;',         // transparent — page shows through
    '  vec3 col = h > 0.0 ? vec3(1.0) : vec3(0.04);',      // crest light, trough dark
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
  var uPts = gl.getUniformLocation(prog, 'u_pts');
  var uCount = gl.getUniformLocation(prog, 'u_count');

  function size() {
    canvas.width = Math.max(1, Math.round(window.innerWidth * SCALE));
    canvas.height = Math.max(1, Math.round(window.innerHeight * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  size(); window.addEventListener('resize', size);

  var pts = [];            // {x, y, t, amp} in backing px (y-up)
  var data = new Float32Array(MAX * 4);
  var rafId = null, t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  var lastX = null, lastY = null;
  function nowSec() { return (((window.performance && performance.now) ? performance.now() : Date.now()) - t0) / 1000; }
  function enabled() { return document.body.getAttribute('data-pixel') === 'on'; }

  function push(x, y, amp) {
    pts.push({ x: x, y: y, t: nowSec(), amp: amp });
    if (pts.length > MAX) pts.shift();
    if (rafId == null) rafId = requestAnimationFrame(frame);
  }

  window.addEventListener('pointermove', function (e) {
    if (!enabled() || (e.pointerType && e.pointerType !== 'mouse')) return;
    var x = e.clientX * SCALE, y = canvas.height - e.clientY * SCALE;
    if (lastX == null) { lastX = x; lastY = y; }
    // interpolate along the move so the trail stays continuous on fast flicks
    var dx = x - lastX, dy = y - lastY, dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.min(MAX, Math.floor(dist / STEP));
    for (var s = 1; s <= steps; s++) { push(lastX + dx * (s / (steps + 1)), lastY + dy * (s / (steps + 1)), 0.45); }
    push(x, y, 0.45);
    lastX = x; lastY = y;
  }, { passive: true });

  // Click -> a stronger, longer "pool" drop.
  window.addEventListener('pointerdown', function (e) {
    if (!enabled() || (e.pointerType && e.pointerType !== 'mouse')) return;
    push(e.clientX * SCALE, canvas.height - e.clientY * SCALE, 2.2);
  }, { passive: true });

  function frame() {
    rafId = null;
    var now = nowSec();
    while (pts.length && now - pts[0].t > 1.6) pts.shift();
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (pts.length && enabled()) {
      for (var i = 0; i < pts.length; i++) {
        data[i * 4] = pts[i].x; data[i * 4 + 1] = pts[i].y; data[i * 4 + 2] = pts[i].t; data[i * 4 + 3] = pts[i].amp;
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now);
      gl.uniform1i(uCount, pts.length);
      gl.uniform4fv(uPts, data);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafId = requestAnimationFrame(frame);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { pts = []; lastX = lastY = null; if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } gl.clear(gl.COLOR_BUFFER_BIT); }
  });
})();
