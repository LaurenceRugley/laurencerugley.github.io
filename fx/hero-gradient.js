/* ============================================================
   fx/hero-gradient.js — owned WebGL hero backdrop.

   Self-contained, zero dependencies, no network, no eval, no user
   input. Renders a slow, low-contrast brand-colored gradient that
   drifts over time and reacts gently to scroll, behind the hero.

   Safe by construction:
   - prefers-reduced-motion  -> never inits; static CSS fallback shows.
   - no WebGL / shader error  -> bails out; static CSS fallback shows.
   - pauses when hero is offscreen or the tab is hidden (battery/perf).
   - capped devicePixelRatio for mobile GPUs.
   - theme-aware: lerps colors when the light/dark toggle flips.

   To remove the feature entirely: delete this file, hero-gradient.css,
   and the <canvas class="hero-fx"> tag. Nothing else depends on it.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.querySelector('canvas.hero-fx');
  if (!canvas) return;

  // 1. Respect reduced motion — leave the static CSS gradient as the final look.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 2. Feature-detect WebGL.
  var gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false })
        || canvas.getContext('experimental-webgl', { antialias: false, alpha: false, depth: false });
  if (!gl) return; // CSS fallback shows.

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  var FRAG = [
    'precision mediump float;',
    'uniform float u_time;',
    'uniform vec2  u_res;',
    'uniform float u_scroll;',
    'uniform vec3  u_c1;', // base
    'uniform vec3  u_c2;', // accent (gold)
    'uniform vec3  u_c3;', // highlight
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));',
    '  vec2 u = f*f*(3.0-2.0*f);',
    '  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.0; a *= 0.5; }',
    '  return v;',
    '}',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  vec2 p = uv * 2.5;',
    '  float t = u_time * 0.04 + u_scroll * 0.0015;',
    '  float n = fbm(p + vec2(t, t*0.6) + fbm(p - t*0.5));',
    '  vec3 col = mix(u_c1, u_c2, smoothstep(0.35, 0.85, n) * 0.55);',     // subtle gold blooms
    '  float bloom = smoothstep(0.9, 0.2, distance(uv, vec2(0.72, 0.82)));',
    '  col = mix(col, u_c3, bloom * 0.12);',                               // soft highlight
    '  col = mix(col, u_c1, smoothstep(0.4, 0.0, uv.y) * 0.25);',          // settle to base low (text legibility)
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return; // CSS fallback shows.

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  // Fullscreen triangle.
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uTime   = gl.getUniformLocation(prog, 'u_time');
  var uRes    = gl.getUniformLocation(prog, 'u_res');
  var uScroll = gl.getUniformLocation(prog, 'u_scroll');
  var uC1     = gl.getUniformLocation(prog, 'u_c1');
  var uC2     = gl.getUniformLocation(prog, 'u_c2');
  var uC3     = gl.getUniformLocation(prog, 'u_c3');

  // Theme palettes (sRGB 0..1): [base, accent(gold), highlight].
  var PALETTES = {
    light: [[0.929, 0.906, 0.851], [0.722, 0.600, 0.408], [0.972, 0.952, 0.902]],
    dark:  [[0.129, 0.106, 0.071], [0.722, 0.600, 0.408], [0.200, 0.160, 0.110]]
  };
  function targetPalette() {
    return PALETTES[document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'];
  }
  // Current (animated) colors, lerped toward the live target each frame so a
  // light/dark theme flip fades the gradient smoothly (target read in frame()).
  var tp = targetPalette();
  var cur = [tp[0].slice(), tp[1].slice(), tp[2].slice()];

  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  function size() {
    var w = Math.max(1, canvas.clientWidth);
    var h = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  if (window.ResizeObserver) { new ResizeObserver(size).observe(canvas); }
  else { window.addEventListener('resize', size); }
  size();

  // Pause when offscreen or tab hidden.
  var onScreen = true, visible = !document.hidden, rafId = null;

  function frame(ts) {
    rafId = null;
    // Ease current colors toward the (live) target palette.
    var t = targetPalette();
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) { cur[i][j] += (t[i][j] - cur[i][j]) * 0.06; }
    }
    gl.uniform1f(uTime, ts * 0.001);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uScroll, window.scrollY || window.pageYOffset || 0);
    gl.uniform3fv(uC1, cur[0]);
    gl.uniform3fv(uC2, cur[1]);
    gl.uniform3fv(uC3, cur[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    schedule();
  }
  function schedule() {
    if (rafId == null && onScreen && visible) { rafId = requestAnimationFrame(frame); }
  }

  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    schedule();
  });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      schedule();
    }, { threshold: 0 }).observe(canvas);
  }

  canvas.classList.add('hero-fx-live'); // one-time fade-in (CSS)
  schedule();
})();
