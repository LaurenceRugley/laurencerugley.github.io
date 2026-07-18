/* fx/process-rail.js — Wave 2 (H): fills the Process rail's gold line as you
   scroll the press-run stations into view. Pure progressive enhancement —
   prefers-reduced-motion never runs this; motion.css's reduced-motion block
   renders the rail full and static instead (see .rail-fill there). */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var rail = document.getElementById('processRail');
  if (!rail) return;
  var fill = document.getElementById('processRailFill');
  if (!fill) return;

  function update() {
    var r = rail.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var p = Math.max(0, Math.min(1, (vh * 0.75 - r.top) / r.height));
    fill.style.height = (p * 100) + '%';
  }
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
})();
