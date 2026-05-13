// pixel/pixel.js — pixel companion bootstrap.
// Handles mode persistence + toggle button. Sprite engine arrives in later tasks.

(function () {
  const STORAGE_KEY = 'lgr-pixel-mode';

  function readMode() {
    try { return localStorage.getItem(STORAGE_KEY) === 'on'; } catch (e) { return false; }
  }

  function writeMode(on) {
    try {
      if (on) localStorage.setItem(STORAGE_KEY, 'on');
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
  }

  function applyMode(on) {
    if (on) document.body.setAttribute('data-pixel', 'on');
    else document.body.removeAttribute('data-pixel');
    document.documentElement.removeAttribute('data-pixel-pending');
    const btn = document.querySelector('.pixel-toggle');
    if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function init() {
    applyMode(readMode());
    const btn = document.querySelector('.pixel-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = document.body.getAttribute('data-pixel') !== 'on';
      writeMode(next);
      applyMode(next);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
