/* fx/ig-feed.js — lazy-loads and renders the "Latest from @lgrwebstudios"
   grid. Mirrors fx/look-reel.js's lazy-boot shape: IntersectionObserver with
   a generous rootMargin to pre-fetch before the section is visible, a
   fallback timer in case IO never fires (see fx/engine-hero.js's 2026-07-09
   note — this exact failure mode has happened before on this site). Never
   blocks LCP: waits for window 'load' first, same as every other fx
   lazy-loader on this page.

   TWO-TIER FETCH: IG_FEED_URL (the live Worker route) is the primary source;
   if that fails for any reason, retry against IG_FEED_SAMPLE_URL (the
   committed local file) before giving up — the site shows real data when
   the Worker is healthy, sample data if it's ever briefly not, and only
   falls through to the static profile link if BOTH fail.
*/
import { IG_FEED_URL, IG_FEED_SAMPLE_URL } from './ig-feed-source.js';

const MAX_TILES = 9;

function renderTiles(grid, items) {
  const frag = document.createDocumentFragment();
  items.slice(0, MAX_TILES).forEach((item) => {
    const a = document.createElement('a');
    a.className = 'ig-tile';
    a.href = item.permalink;
    a.target = '_blank';
    a.rel = 'noopener';
    const img = document.createElement('img');
    // VIDEO/REELS items' media_url points at the raw video file, which an
    // <img> tag can't render -- thumbnail_url is the still image Instagram
    // generates for this. IMAGE items have no thumbnail_url; media_url is
    // already a displayable image for those.
    img.src = item.thumbnail_url || item.media_url;
    img.alt = item.caption || 'Instagram post from @lgrwebstudios';
    img.loading = 'lazy';
    img.decoding = 'async';
    a.appendChild(img);
    frag.appendChild(a);
  });
  grid.replaceChildren(frag);
}

function fetchFeed(url) {
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error('ig-feed: ' + res.status + ' from ' + url);
    return res.json();
  }).then(function (data) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) throw new Error('ig-feed: empty payload from ' + url);
    return data;
  });
}

function boot(grid, caption) {
  fetchFeed(IG_FEED_URL)
    .catch(function (err) {
      console.warn('[ig-feed] live fetch failed, trying the committed sample.', err);
      return fetchFeed(IG_FEED_SAMPLE_URL);
    })
    .then(function (data) {
      renderTiles(grid, data.items);
      if (caption) caption.textContent = data.live ? 'Live from Instagram' : 'Sample preview — live sync flips on soon.';
    })
    .catch(function (err) {
      console.warn('[ig-feed] load failed entirely — profile link stays.', err);
    });
}

function init() {
  const grid = document.getElementById('ig-feed-grid');
  if (!grid) return;
  const caption = document.getElementById('ig-feed-caption');

  let booted = false;
  function bootOnce() { if (booted) return; booted = true; boot(grid, caption); }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { io.disconnect(); bootOnce(); return; }
      }
    }, { rootMargin: '400px' });
    io.observe(grid);
    setTimeout(function () { io.disconnect(); bootOnce(); }, 1200);
  } else {
    bootOnce();
  }
}

if (document.readyState === 'complete') { init(); }
else { window.addEventListener('load', init); }
