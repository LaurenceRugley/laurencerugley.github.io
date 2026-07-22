/* fx/ig-feed-source.js — single source of truth for the Instagram feed's data
   URL, mirroring fx/vendor-engine-url.js's pattern (one constant, one place
   to bump the cache-busting version, so no consumer can drift to a stale
   query string).

   LIVE (2026-07-21): points at the production Worker's /api/ig-feed route
   (see ~/Desktop/lgr-web-template/sites/lgr-web-studio — a SEPARATE project
   from this staging repo; promote.sh deploys it). That route serves real
   cached Instagram data (and self-heals via a live fetch on a cache miss —
   see that project's src/worker.js). fx/ig-feed.js's own .catch() still
   falls back to the committed data/ig-sample.json on any fetch failure
   (network blip, Worker down, token revoked) — the site never breaks even
   though this constant now points at a live external route rather than the
   local sample file directly.
*/
export const IG_FEED_URL = 'https://lgrwebstudios.com/api/ig-feed';

// Client-side resilience net (see fx/ig-feed.js's boot()): if the live route
// is ever unreachable (network blip, Worker down, DNS hiccup), fall back to
// this committed local file so the section never shows broken/empty.
export const IG_FEED_SAMPLE_URL = new URL('../data/ig-sample.json?v=1', import.meta.url).href;
