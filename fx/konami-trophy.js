/* ----------------------------------------------------------------------------
   fx/konami-trophy.js — the Konami-code reward: a real-3D gold trophy.

   Owned end-to-end (no dependency): a single full-screen fragment shader
   raymarches the trophy as a signed-distance field — same hand-rolled WebGL
   pattern as fx/hero-gradient.js. It's LAZY: nothing runs and no GL context is
   created until window.LGRTrophy.show() is called (from the companion's Konami
   handler). Normal visitors pay nothing.

   Dismiss: click / tap / Esc, or auto after ~7s. prefers-reduced-motion: skipped
   (the companion's celebrateKonami already guards this; double-guarded here).
   ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var active = false;

  var VERT =
    'attribute vec2 position;' +
    'void main(){ gl_Position = vec4(position, 0.0, 1.0); }';

  var FRAG = [
    'precision highp float;',
    'uniform vec2  u_res;',
    'uniform float u_time;',   // seconds since reveal
    'uniform float u_scale;',  // intro scale (with a little pop)
    'uniform float u_alpha;',  // intro/outro opacity 0..1',

    // ---- SDF primitives (Inigo Quilez) ----
    'float sdCappedCone(vec3 p, float h, float r1, float r2){',
    '  vec2 q = vec2(length(p.xz), p.y);',
    '  vec2 k1 = vec2(r2, h);',
    '  vec2 k2 = vec2(r2 - r1, 2.0*h);',
    '  vec2 ca = vec2(q.x - min(q.x, (q.y < 0.0) ? r1 : r2), abs(q.y) - h);',
    '  vec2 cb = q - k1 + k2*clamp(dot(k1 - q, k2)/dot(k2, k2), 0.0, 1.0);',
    '  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;',
    '  return s*sqrt(min(dot(ca, ca), dot(cb, cb)));',
    '}',
    'float sdCapsule(vec3 p, vec3 a, vec3 b, float r){',
    '  vec3 pa = p - a, ba = b - a;',
    '  float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0);',
    '  return length(pa - ba*h) - r;',
    '}',
    'float sdTorus(vec3 p, vec2 t){',
    '  vec2 q = vec2(length(p.xz) - t.x, p.y);',
    '  return length(q) - t.y;',
    '}',
    'float smin(float a, float b, float k){',
    '  float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0);',
    '  return mix(b, a, h) - k*h*(1.0 - h);',
    '}',
    'mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c); }',

    // ---- the trophy (Y up, roughly centred at origin) ----
    'float mapTrophy(vec3 p){',
    '  vec3 pb = p - vec3(0.0, 0.40, 0.0);',                 // bowl: narrow bottom -> wide top
    '  float bowl = sdCappedCone(pb, 0.24, 0.17, 0.40);',
    '  float stem = sdCapsule(p, vec3(0.0,-0.02,0.0), vec3(0.0,0.18,0.0), 0.055);',
    '  float base = sdCappedCone(p - vec3(0.0,-0.20,0.0), 0.06, 0.32, 0.18);', // wide short foot
    '  vec3 ph = p - vec3(0.0, 0.48, 0.0);',
    '  ph.x = abs(ph.x) - 0.44;',                            // mirror -> two handles
    '  float handle = sdTorus(vec3(ph.x, ph.z, ph.y), vec2(0.13, 0.032));', // rings in XY plane
    '  float d = smin(bowl, stem, 0.05);',
    '  d = smin(d, base, 0.05);',
    '  d = min(d, handle);',
    '  return d;',
    '}',
    'float map(vec3 p){',
    '  p = rotY(u_time*1.1) * p;',                           // spin
    '  p /= u_scale;',                                       // intro pop
    '  return mapTrophy(p) * u_scale;',
    '}',
    'vec3 calcNormal(vec3 p){',
    '  vec2 e = vec2(0.0015, 0.0);',
    '  return normalize(vec3(',
    '    map(p+e.xyy) - map(p-e.xyy),',
    '    map(p+e.yxy) - map(p-e.yxy),',
    '    map(p+e.yyx) - map(p-e.yyx)));',
    '}',

    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy - 0.5*u_res) / u_res.y;',
    '  vec3 ro = vec3(0.0, 0.16, 3.1);',                     // camera (further back = smaller trophy)
    '  vec3 rd = normalize(vec3(uv, -1.6));',
    '  float t = 0.0; bool hit = false;',
    '  for(int i = 0; i < 90; i++){',
    '    vec3 p = ro + rd*t;',
    '    float d = map(p);',
    '    if(d < 0.001){ hit = true; break; }',
    '    t += d;',
    '    if(t > 6.0) break;',
    '  }',
    '  vec3 col = vec3(0.0); float a = 0.0;',
    '  if(hit){',
    '    vec3 p = ro + rd*t;',
    '    vec3 n = calcNormal(p);',
    '    vec3 lightDir = normalize(vec3(0.55, 0.95, 0.7));',
    '    float diff = clamp(dot(n, lightDir), 0.0, 1.0);',
    '    vec3 viewDir = -rd;',
    '    float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 2.5);',
    '    vec3 hh = normalize(lightDir + viewDir);',
    '    float spec = pow(clamp(dot(n, hh), 0.0, 1.0), 48.0);',
    '    vec3 gold     = vec3(1.0, 0.80, 0.36);',
    '    vec3 goldDark = vec3(0.40, 0.26, 0.08);',
    '    col = mix(goldDark, gold, diff) + 0.14*gold;',      // diffuse + ambient
    '    col += fres * vec3(1.0, 0.93, 0.72) * 0.55;',       // gold rim
    '    col += spec * vec3(1.0);',                          // highlight
    '    a = 1.0;',
    '  }',
    '  gl_FragColor = vec4(col * u_alpha, a * u_alpha);',    // straight alpha (premultiplied:false)
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      // surface compile errors to the console, then bail gracefully
      try { console.warn('[konami-trophy] shader:', gl.getShaderInfoLog(sh)); } catch (_) {}
      return null;
    }
    return sh;
  }

  function show() {
    if (prefersReduced || active) return;
    active = true;

    // --- overlay scaffold ---
    var overlay = document.createElement('div');
    overlay.className = 'konami-trophy';
    overlay.setAttribute('aria-hidden', 'true');
    var canvas = document.createElement('canvas');
    canvas.className = 'konami-trophy-canvas';
    var cap = document.createElement('div');
    cap.className = 'konami-trophy-caption';
    cap.innerHTML = '<span class="ktt-title">SECRET UNLOCKED</span>' +
                    '<span class="ktt-sub">nice — thanks for poking around</span>';
    overlay.appendChild(canvas);
    overlay.appendChild(cap);
    document.body.appendChild(overlay);

    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true })
          || canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) { teardown(); return; } // no WebGL: confetti already fired, bow out quietly

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { teardown(); return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { teardown(); return; }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'u_res');
    var uTime = gl.getUniformLocation(prog, 'u_time');
    var uScale = gl.getUniformLocation(prog, 'u_scale');
    var uAlpha = gl.getUniformLocation(prog, 'u_alpha');

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      var w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    gl.clearColor(0, 0, 0, 0);

    var raf = 0, start = performance.now(), closing = 0;
    function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }

    function render(now) {
      var t = (now - start) / 1000;
      var introT = Math.min(1, t / 0.5);                 // 0..1 over 0.5s
      var scale = 0.4 + (1.0 - 0.4) * easeOutBack(introT);
      var alpha = Math.min(1, t / 0.35);
      if (closing) {                                     // fade out
        var ct = (now - closing) / 0.32 / 1000;
        alpha *= Math.max(0, 1 - ct);
        if (ct >= 1) { teardown(); return; }
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uScale, scale);
      gl.uniform1f(uAlpha, alpha);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);

    // reveal the caption shortly after the trophy pops in
    setTimeout(function () { overlay.classList.add('is-captioned'); }, 450);

    function beginClose() { if (!closing) closing = performance.now(); }
    overlay.addEventListener('click', beginClose);
    function onKey(e) { if (e.key === 'Escape') beginClose(); }
    window.addEventListener('keydown', onKey);
    var autoClose = setTimeout(beginClose, 7000);

    function teardown() {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(autoClose);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      try {
        var ext = gl && gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (_) {}
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      active = false;
    }
  }

  window.LGRTrophy = { show: show };
})();
