/* ============================================================
   fx/cursor-ripple.js — water-ripple cursor wake (companion mode only).

   A transparent full-viewport WebGL overlay. As the pointer moves it spawns
   expanding ripple rings (bright crests + dark troughs, like light on shallow
   water) that trail behind and fade — the page stays fully visible underneath.

   Honest scope: this is a ripple SURFACE drawn over the page, not true
   refraction of the live text (that needs a build-step DOM-to-texture step).

   Gated to the easter egg: only runs while the pixel companion is on
   (body[data-pixel="on"]). Zero cost otherwise.

   Safe by construction: never inits under prefers-reduced-motion, on touch
   (no fine pointer), or without WebGL; pointer-events:none; rAF only runs while
   enabled AND ripples are alive; pauses on tab hide. Self-contained + deletable.
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
  var MAX = 14;      // recent cursor points contributing ripples

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FRAG = [
    'precision highp float;',
    '#define MAX ' + MAX,
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform vec3 u_pts[MAX];', // x, y (backing px, y-up), spawnTime
    'uniform int u_count;',
    'void main(){',
    '  vec2 f = gl_FragCoord.xy;',
    '  float h = 0.0;',
    '  for (int i = 0; i < MAX; i++) {',
    '    if (i >= u_count) break;',
    '    vec3 pt = u_pts[i];',
    '    float age = u_time - pt.z;',
    '    if (age <= 0.0 || age > 1.5) continue;',
    '    float d = distance(f, pt.xy);',
    '    float r = age * 175.0;',                         // ring expansion speed (backing px/s)
    '    float ring = exp(-pow((d - r) / 15.0, 2.0));',   // soft expanding band
    '    float life = 1.0 - age / 1.5;',                  // fade with age
    '    h += sin((d - r) * 0.16) * ring * life;',
    '  }',
    '  float a = clamp(abs(h), 0.0, 1.0) * 0.42;',        // transparent — page shows through
    '  vec3 col = h > 0.0 ? vec3(1.0) : vec3(0.04);',     // crest light, trough dark
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

  var pts = [];            // {x, y, t} in backing px (y-up)
  var data = new Float32Array(MAX * 3);
  var rafId = null, t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  function nowSec() { return (((window.performance && performance.now) ? performance.now() : Date.now()) - t0) / 1000; }
  function enabled() { return document.body.getAttribute('data-pixel') === 'on'; }

  window.addEventListener('pointermove', function (e) {
    if (!enabled()) return;
    if (e.pointerType && e.pointerType !== 'mouse') return;
    pts.push({ x: e.clientX * SCALE, y: canvas.height - e.clientY * SCALE, t: nowSec() });
    if (pts.length > MAX) pts.shift();
    if (rafId == null) rafId = requestAnimationFrame(frame);
  }, { passive: true });

  function frame() {
    rafId = null;
    var now = nowSec();
    // drop fully-faded points
    while (pts.length && now - pts[0].t > 1.5) pts.shift();
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (pts.length && enabled()) {
      for (var i = 0; i < pts.length; i++) { data[i*3] = pts[i].x; data[i*3+1] = pts[i].y; data[i*3+2] = pts[i].t; }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now);
      gl.uniform1i(uCount, pts.length);
      gl.uniform3fv(uPts, data);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafId = requestAnimationFrame(frame); // keep animating while ripples live
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { pts = []; if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } gl.clear(gl.COLOR_BUFFER_BIT); }
  });
})();
