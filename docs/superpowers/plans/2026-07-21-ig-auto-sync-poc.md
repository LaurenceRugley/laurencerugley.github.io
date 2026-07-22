# Instagram Auto-Sync Proof of Concept Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove "post to Instagram, your site updates itself" on lgrwebstudios.com itself — a house-styled "Latest from @lgrwebstudios" grid section rendering real, live Instagram posts on production, backed by a scheduled Graph API fetch → KV cache → JSON API route on the real production Worker, plus a gated two-step publish tool. **Revised mid-plan (owner completed Meta setup + put the `IG_TOKEN` secret live) — this now ships to production in this same session, not as dormant/undeployed scaffold.**

**Architecture — CORRECTED from the original plan.** The original plan assumed lgrwebstudios.com was served by `laurencerugley.github.io`'s own dormant Worker scaffold (`wrangler.toml` + `src/worker.js`, never deployed). That's wrong: **production is a separate Cloudflare Worker project**, `~/Desktop/lgr-web-template/sites/lgr-web-studio` (Worker name `lgr-web-studio`, routes `lgrwebstudios.com`/`www.lgrwebstudios.com`), currently **assets-only** (no `main`, no custom fetch/scheduled handler — just static files). `laurencerugley.github.io` is the **staging** repo; `sites/lgr-web-studio/promote.sh` is the only path from staging to production — it rsyncs static web files from the GitHub repo into `public/`, **explicitly excluding** `wrangler.toml`/`src/`/`tests/`/`tools/` from ever being copied, then runs `wrangler deploy` from `lgr-web-studio`'s own (locally-maintained, not synced) `wrangler.toml`/`src/`. This also explains the earlier hero-build-in session's "stale Cloudflare cache" mystery: it wasn't a CDN cache lag, `promote.sh` was simply never run after that push.

Given the owner already put `IG_TOKEN` on the real `lgr-web-studio` Worker (confirmed via `wrangler secret list` — name only, no value read), the backend now gets built **directly inside `lgr-web-studio`** (owner-chosen option, converting it from assets-only to a full Worker with `main` + KV + cron alongside its existing static serving — same "custom fetch handler that falls through to `env.ASSETS.fetch()`" shape the dormant staging scaffold already established, just deployed for real this time).

The site section fetches a single versioned JSON URL (`fx/ig-feed-source.js`'s `IG_FEED_URL` constant, mirroring `fx/vendor-engine-url.js`'s single-source-of-truth pattern) — now pointed directly at the live `https://lgrwebstudios.com/api/ig-feed` route (no mock-mode default; the client-side `.catch()` fallback to a committed sample JSON stays as a resilience net, not the default path). `GET /api/ig-feed`: serve KV if fresh; **on a KV miss, fetch Instagram live, cache it, and return it inline** (not just cron-populated) — this is what makes the very first request to the route *be* "the first real fetch" the owner asked to trigger/verify, and it makes the cache self-healing if a cron run ever fails. The `scheduled()` cron (every 3h, inside the CDN media_url expiry window) keeps it warm in the background regardless of traffic.

**Tech Stack:** Vanilla ES modules (site), Cloudflare Workers + KV (backend — deployed live to `lgr-web-studio` in this plan), `node --test` with a stubbed global `fetch` (Worker tests), Playwright via `playwright-core` (site verification, matching existing `tools/verify-*.mjs`).

## Global Constraints

- **No new npm dependencies.** The Worker's Instagram calls use the runtime-global `fetch` (no SDK). The publish tool and verify script use only `node --test`/`playwright-core`, already devDependencies.
- **Secrets never in code, logs, or config.** The Graph API token is `env.IG_TOKEN`, a Worker secret the owner sets via `wrangler secret put IG_TOKEN` — never referenced as a literal, never printed. `.gitignore` gets a `.dev.vars` entry even though no `.dev.vars` file is committed (local-dev secret file, so a future one is never accidentally tracked).
- **Token-absent must be silent and graceful.** `scheduled()` no-ops with a `console.log` (not an error) when `env.IG_TOKEN` is unset. `GET /api/ig-feed` falls back to the committed sample via `env.ASSETS.fetch()` when KV has nothing cached — the site must never show a broken section.
- **IG media CDN URL expiry — decided:** re-fetch on a schedule well inside the (undocumented, but real per the owner's DESIGN research) expiry window, NOT re-host media bytes. A 3-hour cron (`0 */3 * * *`) is the chosen cadence — conservative enough that even a same-day expiry window is covered several times over, and it avoids introducing a byte-storage binding (R2) that isn't needed for a POC. Document this tradeoff verbatim in `src/worker.js`'s header comment and in the report: if 3-hourly turns out insufficient once live, the next step up is re-hosting rendition bytes in R2, not shortening the cron further (Instagram's own rate limits make very-frequent polling the wrong lever).
- **API endpoint facts — verified against Meta's current developer docs during planning** (not assumed): container create is `POST https://graph.facebook.com/v21.0/<IG_ID>/media` (params `access_token`, `image_url`), publish is `POST https://graph.facebook.com/v21.0/<IG_ID>/media_publish` (params `access_token`, `creation_id`), container status is `GET /<CONTAINER_ID>?fields=status_code` (poll ~once/minute, up to 5 minutes; values `EXPIRED|ERROR|FINISHED|IN_PROGRESS|PUBLISHED`), and the account is rate-limited to 100 published posts per rolling 24h (checkable via `GET /<IG_ID>/content_publishing_limit`). The `v21.0` API version string is a placeholder — note in the report that the owner should confirm the current stable version in the Meta dashboard at setup time, since Graph API versions roll forward.
- **Never execute a real Instagram publish.** `tools/ig-publish-test.mjs` defaults to a dry run (prints the exact requests it would make, makes zero network calls) and requires both an explicit `--live` flag AND typing a literal confirmation phrase to make a real call. No implementer, reviewer, or the controller runs it with `--live` during this plan — that is the owner's deliberate, first click.
- **Existing suites stay green.** `npm run probe`, `npm run budget`, `npm test`, and all `tools/verify-*.mjs` scripts must still pass after this change, run against a server confirmed to be serving the current worktree.
- **Cache-busting** follows the existing `?v=N` convention (`fx/vendor-engine-url.js`, `motion.js?v=4`, etc.) for every new/changed static asset reference.
- **Storage-key / secret-key naming**: `IG_TOKEN` (Worker secret name, uppercase per Workers convention, distinct from the site's `lgr-`-prefixed client-storage convention which doesn't apply server-side).

---

### Task 1: Sample data + the single-source feed URL

**Files:**
- Create: `data/ig-sample.json`
- Create: `fx/ig-feed-source.js`

**Interfaces:**
- Produces: `IG_FEED_URL` (exported string constant from `fx/ig-feed-source.js`) — the only place any consumer may reference the feed's URL, per the `fx/vendor-engine-url.js` precedent. Produces the JSON shape `{ live: boolean, updatedAt: string (ISO), items: [{ id, media_type, media_url, permalink, caption, timestamp }] }` — `media_type` is one of the real Graph API values (`IMAGE`, `CAROUSEL_ALBUM`, `VIDEO`); `media_url`/`permalink`/`timestamp` field names match the Graph API exactly so the Worker's later normalization needs no field renaming.

- [ ] **Step 1: Write `data/ig-sample.json`**

```json
{
  "live": false,
  "updatedAt": "2026-07-21T00:00:00Z",
  "items": [
    { "id": "sample-1", "media_type": "IMAGE", "media_url": "../work/lgrwebstudio.jpg", "permalink": "https://www.instagram.com/lgrwebstudios/", "caption": "Behind the scenes: a new build taking shape.", "timestamp": "2026-07-18T18:32:00+0000" },
    { "id": "sample-2", "media_type": "IMAGE", "media_url": "../work/alsoknownas.jpg", "permalink": "https://www.instagram.com/lgrwebstudios/", "caption": "Also Known As, live and selling.", "timestamp": "2026-07-15T21:10:00+0000" },
    { "id": "sample-3", "media_type": "IMAGE", "media_url": "../work/savycolours.jpg", "permalink": "https://www.instagram.com/lgrwebstudios/", "caption": "Savy Colours — booking without the middleman.", "timestamp": "2026-07-12T16:45:00+0000" },
    { "id": "sample-4", "media_type": "IMAGE", "media_url": "../work/reel/alsoknownas.jpg", "permalink": "https://www.instagram.com/lgrwebstudios/", "caption": "Drop-day details, up close.", "timestamp": "2026-07-09T14:20:00+0000" },
    { "id": "sample-5", "media_type": "IMAGE", "media_url": "../work/reel/savycolours.jpg", "permalink": "https://www.instagram.com/lgrwebstudios/", "caption": "A booking flow built for one stylist, not a franchise.", "timestamp": "2026-07-06T19:05:00+0000" },
    { "id": "sample-6", "media_type": "IMAGE", "media_url": "../work/lgrwebstudio.jpg", "permalink": "https://www.instagram.com/lgrwebstudios/", "caption": "One engineer, every line by hand.", "timestamp": "2026-07-03T15:50:00+0000" },
    { "id": "sample-7", "media_type": "IMAGE", "media_url": "../work/alsoknownas.jpg", "permalink": "https://www.instagram.com/lgrwebstudios/", "caption": "Shipped: streetwear, sized for launch day traffic.", "timestamp": "2026-06-29T20:15:00+0000" },
    { "id": "sample-8", "media_type": "IMAGE", "media_url": "../work/savycolours.jpg", "permalink": "https://www.instagram.com/lgrwebstudios/", "caption": "Zero monthly tool fees, every request routes straight to her.", "timestamp": "2026-06-25T17:30:00+0000" },
    { "id": "sample-9", "media_type": "IMAGE", "media_url": "../work/lgrwebstudio.jpg", "permalink": "https://www.instagram.com/lgrwebstudios/", "caption": "Care plan, in practice: same-day answers.", "timestamp": "2026-06-20T13:00:00+0000" }
  ]
}
```

Note the `media_url` paths are relative to `data/` (`../work/...`) — Step 2 of Task 2 resolves them the same way `fx/ig-feed-source.js` resolves its own URL (via `import.meta.url`), so this file is portable and doesn't hardcode a site root.

- [ ] **Step 2: Write `fx/ig-feed-source.js`**

```js
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
```

- [ ] **Step 3: Commit**

```bash
git add data/ig-sample.json fx/ig-feed-source.js
git commit -m "feat(ig-feed): add sample data + single-source feed URL constant"
```

---

### Task 2: Site section — markup, styles, lazy-load module

**Files:**
- Modify: `index.html` (new section after `#human`, line ~439; new `<link>` + `<script type="module">` tags near the existing `fx/*` includes, lines ~648-652)
- Modify: `motion.css` (new `.ig-grid`/`.ig-tile` rules near `.cards`/`.offer-cards`, motion.css:444-453/126-162; new reveal-stagger `nth-child` entries near motion.css:617-619)
- Create: `fx/ig-feed.css`
- Create: `fx/ig-feed.js`

**Interfaces:**
- Consumes: `IG_FEED_URL` from `fx/ig-feed-source.js` (Task 1).
- Produces: mount point `#ig-feed-grid` inside `<section id="ig-feed">`, populated at runtime by `fx/ig-feed.js`.

- [ ] **Step 1: Add the section markup to `index.html`**

Insert immediately after the closing `</section>` of `#human` (after `index.html:439`, before `<section class="section" id="prove-it">`):

```html
  <section class="section" id="ig-feed">
    <div class="band reveal">
      <h2 class="section-label">Latest from @lgrwebstudios</h2>
      <h3 class="index-title">Post to Instagram. <em>The site updates itself.</em></h3>
      <p class="index-dek" id="ig-feed-caption">Sample preview — live sync flips on soon.</p>
      <div class="ig-grid" id="ig-feed-grid" aria-live="polite">
        <!-- fx/ig-feed.js populates this from IG_FEED_URL. Static fallback
             (also the no-JS state): a link straight to the profile. -->
        <a class="ig-grid-fallback" href="https://www.instagram.com/lgrwebstudios/" target="_blank" rel="noopener">See @lgrwebstudios on Instagram ↗</a>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Wire the `<link>` and `<script>` tags**

Add near the other `fx/*` stylesheet links (alongside `fx/look-reel.css` at `index.html:88`):
```html
<link rel="stylesheet" href="fx/ig-feed.css">
```

Add near the other `fx/*` module scripts (after `index.html:649`'s `fx/look-reel.js?v=3` line):
```html
<script type="module" src="fx/ig-feed.js?v=1"></script>
```

- [ ] **Step 3: Write `fx/ig-feed.css`**

```css
/* fx/ig-feed.css — "Latest from @lgrwebstudios" grid.
   Reuses the site's .cards grid rhythm (motion.css) at tile scale: square
   thumbnails, house border/hover treatment, no new visual language. */

.ig-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 30px;
}

.ig-tile {
  position: relative;
  display: block;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--surface);
  transition: transform 0.35s var(--ease), border-color 0.35s var(--ease);
}
.ig-tile:hover { transform: translateY(-3px); border-color: var(--gold); }
.ig-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }

.ig-grid-fallback {
  grid-column: 1 / -1;
  text-align: center;
  padding: 24px;
  color: var(--muted);
  text-decoration: underline;
}

@media (max-width: 680px) {
  .ig-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  .ig-tile { transition: none; }
}
```

- [ ] **Step 4: Add grid reveal-stagger + content-sized section override to `motion.css`**

Add to the `nth-child` stagger block (`motion.css:617-619`):
```css
html.js-reveal .ig-grid .ig-tile:nth-child(2) { transition-delay: 60ms; }
html.js-reveal .ig-grid .ig-tile:nth-child(3) { transition-delay: 120ms; }
html.js-reveal .ig-grid .ig-tile:nth-child(4) { transition-delay: 180ms; }
html.js-reveal .ig-grid .ig-tile:nth-child(5) { transition-delay: 240ms; }
html.js-reveal .ig-grid .ig-tile:nth-child(6) { transition-delay: 300ms; }
```
(Tiles 7-9 intentionally uncapped — beyond a ~300ms stagger the extra delay reads as sluggish, not polished; they land with tile 6's delay.)

Add `#ig-feed` to the content-sized (`min-height: auto`) selector list alongside `#human, .finale` (motion.css:388) — this is a content-sized section like its neighbors, not a full-viewport one.

- [ ] **Step 5: Write `fx/ig-feed.js`**

```js
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
    img.src = item.media_url;
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
```

- [ ] **Step 6: Manual smoke check**

```bash
lsof -i :8743 -sTCP:LISTEN -t | xargs -r kill 2>/dev/null
npx --yes serve -l 8743 . &
sleep 2
curl -s http://localhost:8743/data/ig-sample.json | head -c 200
```

Expected: valid JSON starting with `{"live":false,...`. Then open `http://localhost:8743/#ig-feed` in a real browser and confirm 9 tiles render with the sample caption note visible. Kill the server after.

- [ ] **Step 7: Commit**

```bash
git add index.html motion.css fx/ig-feed.css fx/ig-feed.js
git commit -m "feat(ig-feed): add the Latest-from-Instagram grid section (renders sample data)"
```

---

### Task 3: Worker backend — cron fetch, self-healing KV cache, API route

**PROJECT ROOT FOR THIS TASK IS DIFFERENT FROM TASKS 1/2/4/5:** `~/Desktop/lgr-web-template/sites/lgr-web-studio` — the real production Worker (`lgr-web-studio`, routes `lgrwebstudios.com`/`www.lgrwebstudios.com`), currently assets-only. This is a **separate git repository** from `laurencerugley.github.io`. The `IG_TOKEN` secret already exists there (owner-set, confirmed via `wrangler secret list` — name only, value never read). `IG_USER_ID` (`17841446051605300`) is not secret — a plain `[vars]` entry.

**Files (all in `~/Desktop/lgr-web-template/sites/lgr-web-studio/`):**
- Modify: `wrangler.toml`
- Create: `src/worker.js`
- Create: `package.json`
- Create: `tests/worker.test.mjs`

**Interfaces:**
- Consumes: `env.IG_TOKEN` (Worker secret, already set live), `env.IG_USER_ID` (plain var, `17841446051605300`), `env.IG_CACHE` (new KV binding), `env.ASSETS` (existing binding — needs an explicit `binding = "ASSETS"` added now that a custom `main` script wants to call it, per Cloudflare's Workers-with-Static-Assets contract).
- Produces: `scheduled(event, env, ctx)` export; `GET /api/ig-feed` route. **Self-healing design:** on a KV miss, the route does a LIVE fetch-and-cache inline (not just cron-populated) — this is what makes the very first hit to the route *be* "the first real fetch" the owner asked to trigger, and it makes the cache recover on its own if a cron run ever fails.

- [ ] **Step 1: Update `wrangler.toml`**

Replace the file's contents with (adds `main`, `[assets] binding`, KV, cron, and the plain `IG_USER_ID` var; keeps everything else identical):
```toml
# LGR Web Studios — landing site (migrated from laurencerugley.github.io)
# Worker serving the studio landing page + card + start pages (static, via
# ASSETS), plus the IG auto-sync backend (2026-07-21): a scheduled Graph API
# fetch, a KV cache, and a self-healing GET /api/ig-feed route. See
# src/worker.js's header for the full design writeup (this file only holds
# config).
# Source of truth for the STATIC files is copied from
# ~/Desktop/laurencerugley.github.io via ../promote.sh. src/worker.js is
# NOT synced from anywhere — it's maintained directly in this project.
name = "lgr-web-studio"
compatibility_date = "2025-05-01"
account_id = "3e6a5178767608f702543452c281e3e6"
workers_dev = true
main = "src/worker.js"

# Apex + www on the active lgrwebstudios.com zone (this account, 3e6a…e3e6)
routes = [
  { pattern = "lgrwebstudios.com", custom_domain = true },
  { pattern = "www.lgrwebstudios.com", custom_domain = true }
]

[assets]
directory = "./public"
binding = "ASSETS"

[vars]
IG_USER_ID = "17841446051605300"

# IG_TOKEN is a secret, already set live via `wrangler secret put IG_TOKEN`
# (owner, 2026-07-21) — never appears here.

[[kv_namespaces]]
binding = "IG_CACHE"
id = "PLACEHOLDER-run-wrangler-kv-namespace-create-first"

# Cron cadence is 3h, deliberately conservative relative to Instagram's
# undocumented media_url CDN expiry — see src/worker.js's header for the
# full tradeoff writeup (re-fetch often vs. re-host bytes in R2; re-fetch
# chosen for this POC). The /api/ig-feed route is also self-healing on a
# cache miss, so this cron is a background-freshness guarantee, not the
# only path that ever populates the cache.
[triggers]
crons = ["0 */3 * * *"]
```

- [ ] **Step 2: Write `src/worker.js`**

```js
/* src/worker.js — lgr-web-studio production Worker.
   ------------------------------------------------------------------------
   Two jobs: (1) serve the static site via ASSETS (unchanged behavior —
   every request that isn't handled below falls through to it, exactly as
   before this file existed), and (2) the Instagram auto-sync backend
   (2026-07-21): a scheduled Graph API fetch into KV, and a GET /api/ig-feed
   route the static site's fx/ig-feed.js fetches at runtime.

   SELF-HEALING CACHE: /api/ig-feed does a LIVE fetch-and-cache on a KV miss
   (not just wait for the next cron tick) — first real traffic after deploy
   IS the first real fetch, and a failed cron run heals itself on the next
   visit rather than staying stale until the next scheduled tick.

   CDN-URL-EXPIRY TRADEOFF (decided, not assumed): Instagram's media_url
   values are signed CDN URLs that expire on an undocumented but real
   schedule (per the owner's own DESIGN research). Two ways to survive that:
   (a) re-fetch on a schedule comfortably inside the expiry window, or
   (b) re-host media bytes ourselves (e.g. in R2) so we're immune to their
   expiry entirely. This POC takes (a): a 3h cron, plus the self-healing
   route above as a second freshness path. (b) is the upgrade if 3h turns
   out insufficient once live traffic patterns are known — re-hosting bytes
   is real added complexity (a new storage binding, a byte-size budget, a
   copy step) that isn't justified until (a) is proven inadequate.

   SECRETS: IG_TOKEN is a Worker secret (wrangler secret put IG_TOKEN) — it
   is read from env.IG_TOKEN only, at request/cron time, and is NEVER
   logged, echoed, or written into any response body. IG_USER_ID is not
   secret (it's a public account identifier) — a plain wrangler.toml var.
*/
const IG_GRAPH_VERSION = 'v21.0'; // confirm current stable version in the Meta dashboard periodically
const IG_CACHE_KEY = 'ig-feed-cache';
const IG_MAX_ITEMS = 9;
const IG_FIELDS = 'id,caption,media_type,media_url,permalink,timestamp';

async function fetchInstagramMedia(igUserId, token) {
  const url = `https://graph.facebook.com/${IG_GRAPH_VERSION}/${igUserId}/media?fields=${IG_FIELDS}&access_token=${token}`;
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    // Never log the token; the error body itself is Meta's own message and
    // is safe to surface (it echoes params like the field list, not the token).
    throw new Error(`Instagram media fetch failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return Array.isArray(body.data) ? body.data : [];
}

async function refreshCache(env) {
  if (!env.IG_TOKEN || !env.IG_USER_ID) {
    throw new Error('IG_TOKEN/IG_USER_ID not configured');
  }
  const items = await fetchInstagramMedia(env.IG_USER_ID, env.IG_TOKEN);
  const payload = { live: true, updatedAt: new Date().toISOString(), items: items.slice(0, IG_MAX_ITEMS) };
  await env.IG_CACHE.put(IG_CACHE_KEY, JSON.stringify(payload));
  return payload;
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;

    if (request.method === 'GET' && path === '/api/ig-feed') {
      const cached = env.IG_CACHE ? await env.IG_CACHE.get(IG_CACHE_KEY) : null;
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' },
        });
      }
      // KV miss — self-heal with a live fetch before falling back to sample.
      try {
        const payload = await refreshCache(env);
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' },
        });
      } catch (err) {
        console.warn('[ig-sync] live fetch-on-miss failed, serving sample:', err.message);
        return env.ASSETS.fetch(new Request(new URL('/data/ig-sample.json', request.url)));
      }
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    try {
      const payload = await refreshCache(env);
      console.log(`[ig-sync] cron refreshed cache: ${payload.items.length} items.`);
    } catch (err) {
      console.warn('[ig-sync] cron refresh failed — existing cache (or sample fallback) stays live.', err.message);
    }
  },
};
```

- [ ] **Step 3: Write `package.json`**

```json
{
  "name": "lgr-web-studio",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "deploy": "wrangler deploy"
  }
}
```

- [ ] **Step 4: Write the mocked-fetch tests in `tests/worker.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

function makeEnv() {
  const kvStore = new Map();
  return {
    IG_USER_ID: '17841446051605300',
    IG_CACHE: {
      async get(key) { return kvStore.has(key) ? kvStore.get(key) : null; },
      async put(key, value) { kvStore.set(key, value); },
    },
    ASSETS: {
      fetch: async (req) => {
        const url = typeof req === 'string' ? req : req.url;
        if (url.includes('/data/ig-sample.json')) {
          return new Response(JSON.stringify({ live: false, updatedAt: 't', items: [{ id: 'sample-1' }] }), { status: 200 });
        }
        return new Response('asset', { status: 200 });
      },
    },
    _kvStore: kvStore,
  };
}

function stubFetch(t, impl) {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = impl;
}

test('scheduled() fetches, normalizes, and caches IG media when IG_TOKEN is set', async (t) => {
  const env = makeEnv();
  env.IG_TOKEN = 'test-token';
  stubFetch(t, async (url) => {
    assert.ok(String(url).includes('graph.facebook.com'), 'must call the Graph API host');
    assert.ok(String(url).includes('access_token=test-token'), 'must pass the token');
    assert.ok(!String(url).includes('IG_TOKEN'), 'must never leak the literal env var name as the token value');
    return new Response(JSON.stringify({ data: [
      { id: '1', media_type: 'IMAGE', media_url: 'https://example.com/1.jpg', permalink: 'https://instagram.com/p/1', caption: 'a', timestamp: '2026-07-01T00:00:00+0000' },
    ] }), { status: 200 });
  });
  await worker.scheduled({}, env, {});
  const cached = JSON.parse(env._kvStore.get('ig-feed-cache'));
  assert.equal(cached.live, true);
  assert.equal(cached.items.length, 1);
  assert.equal(cached.items[0].id, '1');
});

test('scheduled() fails soft (warns, does not throw) when the Graph API call errors', async (t) => {
  const env = makeEnv();
  env.IG_TOKEN = 'test-token';
  stubFetch(t, async () => new Response(JSON.stringify({ error: { message: 'Invalid OAuth access token' } }), { status: 401 }));
  await assert.doesNotReject(() => worker.scheduled({}, env, {}));
  assert.equal(env._kvStore.size, 0, 'nothing should be cached on a failed fetch');
});

test('scheduled() skips cleanly when IG_TOKEN is absent', async () => {
  const env = makeEnv();
  await assert.doesNotReject(() => worker.scheduled({}, env, {}));
  assert.equal(env._kvStore.size, 0);
});

test('GET /api/ig-feed serves the KV cache when present, without calling the network', async (t) => {
  const env = makeEnv();
  env._kvStore.set('ig-feed-cache', JSON.stringify({ live: true, updatedAt: 't', items: [{ id: 'live-1' }] }));
  stubFetch(t, async () => { throw new Error('must not fetch when KV has data'); });
  const req = new Request('https://lgrwebstudios.com/api/ig-feed', { method: 'GET' });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.live, true);
  assert.equal(body.items[0].id, 'live-1');
});

test('GET /api/ig-feed self-heals with a live fetch on a KV miss (the "first real fetch" path)', async (t) => {
  const env = makeEnv();
  env.IG_TOKEN = 'test-token';
  stubFetch(t, async () => new Response(JSON.stringify({ data: [
    { id: 'fresh-1', media_type: 'IMAGE', media_url: 'https://example.com/1.jpg', permalink: 'https://instagram.com/p/1', caption: 'a', timestamp: '2026-07-01T00:00:00+0000' },
  ] }), { status: 200 }));
  const req = new Request('https://lgrwebstudios.com/api/ig-feed', { method: 'GET' });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.live, true);
  assert.equal(body.items[0].id, 'fresh-1');
  assert.ok(env._kvStore.has('ig-feed-cache'), 'the self-heal must also populate KV for next time');
});

test('GET /api/ig-feed falls back to the committed sample JSON when KV is empty AND the live fetch also fails', async (t) => {
  const env = makeEnv();
  env.IG_TOKEN = 'test-token';
  stubFetch(t, async () => new Response(JSON.stringify({ error: { message: 'Invalid OAuth access token' } }), { status: 401 }));
  const req = new Request('https://lgrwebstudios.com/api/ig-feed', { method: 'GET' });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.live, false);
});

test('non-matching routes fall through to static assets, unchanged', async () => {
  const env = makeEnv();
  const req = new Request('https://lgrwebstudios.com/', { method: 'GET' });
  const res = await worker.fetch(req, env);
  assert.equal(await res.text(), 'asset');
});
```

- [ ] **Step 5: Run the tests**

```bash
cd ~/Desktop/lgr-web-template/sites/lgr-web-studio
node --test
```

Expected: 7/7 pass, 0 failures.

- [ ] **Step 6: Commit (in the `lgr-web-template` repo, not the staging repo)**

```bash
cd ~/Desktop/lgr-web-template
git add sites/lgr-web-studio/wrangler.toml sites/lgr-web-studio/src/worker.js sites/lgr-web-studio/package.json sites/lgr-web-studio/tests/worker.test.mjs
git commit -m "feat(lgr-web-studio): IG auto-sync — cron + self-healing KV cache + /api/ig-feed"
```

**Deploy is NOT part of this task's steps** — it happens in Task 5 alongside `promote.sh`, after the checkpoint, because deploying converts a currently-assets-only production Worker (serving live traffic right now) into one with custom request-handling logic, and that's exactly the class of action needing the explicit go-ahead this plan already gates `git push`/`--live` behind.

---

### Task 4: Gated publish tool

**Files:**
- Create: `tools/ig-publish-test.mjs`

**Interfaces:**
- Consumes: `IG_TOKEN`, `IG_USER_ID` from `process.env` (never hardcoded); CLI args `--image-url=<url>` (required), `--caption=<text>` (optional), `--live` (opt-in to real network calls), `--confirm=PUBLISH` (required alongside `--live`, a literal typed phrase, not just a boolean flag — a second, deliberate gate).

- [ ] **Step 1: Write `tools/ig-publish-test.mjs`**

```js
#!/usr/bin/env node
/* tools/ig-publish-test.mjs — the two-step Instagram container->publish
   flow (POST /{ig-user-id}/media, then POST /{ig-user-id}/media_publish),
   for the owner to run manually against the real @lgrwebstudios account.

   SAFE BY DEFAULT: with no --live flag this is a DRY RUN — it prints the
   exact requests it would make and makes ZERO network calls. To actually
   publish, both --live AND --confirm=PUBLISH must be passed (a typed
   phrase, not just a boolean, so it can't be triggered by an accidental
   flag). This script must never be run with --live by an agent or in CI —
   only the owner, deliberately, against his own account.

   Usage:
     node tools/ig-publish-test.mjs --image-url=<url> [--caption="..."]                 (dry run — default)
     node tools/ig-publish-test.mjs --image-url=<url> --live --confirm=PUBLISH          (real publish)

   Reads IG_TOKEN and IG_USER_ID from the environment — never hardcode a
   token here, never pass one as a CLI arg (shell history would leak it).
*/
const IG_GRAPH_VERSION = 'v21.0'; // confirm current stable version in the Meta dashboard before real use

function parseArgs(argv) {
  const out = { live: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--live') { out.live = true; continue; }
    const m = arg.match(/^--([a-z-]+)=(.*)$/);
    if (m) out[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = m[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.imageUrl) {
    console.error('Usage: node tools/ig-publish-test.mjs --image-url=<url> [--caption="..."] [--live --confirm=PUBLISH]');
    process.exit(1);
  }

  const token = process.env.IG_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  if (args.live && (!token || !igUserId)) {
    console.error('--live requires IG_TOKEN and IG_USER_ID in the environment.');
    process.exit(1);
  }

  const containerUrl = `https://graph.facebook.com/${IG_GRAPH_VERSION}/${igUserId || '<IG_USER_ID>'}/media`;
  const containerParams = { image_url: args.imageUrl, ...(args.caption ? { caption: args.caption } : {}) };
  const publishUrl = `https://graph.facebook.com/${IG_GRAPH_VERSION}/${igUserId || '<IG_USER_ID>'}/media_publish`;

  if (!args.live || args.confirm !== 'PUBLISH') {
    console.log('DRY RUN — no network calls made. To publish for real: --live --confirm=PUBLISH\n');
    console.log('Step 1 — create container:');
    console.log(`  POST ${containerUrl}`);
    console.log('  body:', JSON.stringify({ ...containerParams, access_token: '<IG_TOKEN, redacted>' }, null, 2));
    console.log('\nStep 2 — publish (after polling GET /<container-id>?fields=status_code until FINISHED, ~1x/min for up to 5 min):');
    console.log(`  POST ${publishUrl}`);
    console.log('  body:', JSON.stringify({ creation_id: '<container-id-from-step-1>', access_token: '<IG_TOKEN, redacted>' }, null, 2));
    return;
  }

  console.log('LIVE MODE — publishing for real to the account tied to IG_USER_ID.');
  const containerRes = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...containerParams, access_token: token }),
  });
  const containerBody = await containerRes.json();
  if (!containerRes.ok) { console.error('Container creation failed:', containerBody); process.exit(1); }
  const creationId = containerBody.id;
  console.log('Container created:', creationId);

  console.log('Polling container status (up to 5 minutes)...');
  let status = 'IN_PROGRESS';
  for (let i = 0; i < 5 && status === 'IN_PROGRESS'; i++) {
    await new Promise((r) => setTimeout(r, 60_000));
    const statusRes = await fetch(`https://graph.facebook.com/${IG_GRAPH_VERSION}/${creationId}?fields=status_code&access_token=${token}`);
    const statusBody = await statusRes.json();
    status = statusBody.status_code;
    console.log(`  status: ${status}`);
  }
  if (status !== 'FINISHED') { console.error('Container did not reach FINISHED in time:', status); process.exit(1); }

  const publishRes = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: creationId, access_token: token }),
  });
  const publishBody = await publishRes.json();
  if (!publishRes.ok) { console.error('Publish failed:', publishBody); process.exit(1); }
  console.log('Published:', publishBody.id);
}

main();
```

- [ ] **Step 2: Verify the dry-run path only (never `--live`)**

```bash
node tools/ig-publish-test.mjs --image-url=https://example.com/test.jpg --caption="test"
```

Expected: prints the two-step DRY RUN plan, makes no network calls, exits 0. **Do not run with `--live` at any point in this task.**

- [ ] **Step 3: Commit**

```bash
git add tools/ig-publish-test.mjs
git commit -m "feat(tools): add gated two-step Instagram publish script (dry-run by default)"
```

---

### Task 5: Verification, full regression sweep, evidence, report

**Files:**
- Create: `tools/verify-ig-feed.mjs`

**Interfaces:**
- Consumes: `#ig-feed-grid`, `.ig-tile`, `#ig-feed-caption` (Task 2's DOM contract).

- [ ] **Step 1: Write `tools/verify-ig-feed.mjs`**

```js
#!/usr/bin/env node
/* tools/verify-ig-feed.mjs — confirms the Latest-from-Instagram section
   renders the sample grid, at both desktop and a true 375px mobile
   viewport (Playwright sets this directly — no OS window-resize floor to
   fight, unlike interactive browser control), with zero console errors.

   Usage: node tools/verify-ig-feed.mjs <url>   (defaults to localhost:8743)
*/
import { chromium } from 'playwright-core';

const URL = process.argv[2] || 'http://localhost:8743/';
let failed = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile-375', { width: 375, height: 812 }]]) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(URL, { waitUntil: 'load' });
    await page.locator('#ig-feed-grid').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelectorAll('#ig-feed-grid .ig-tile').length > 0, null, { timeout: 10000 });

    const tileCount = await page.locator('#ig-feed-grid .ig-tile').count();
    ok(tileCount >= 6 && tileCount <= 9, `[${label}] renders 6-9 tiles (found ${tileCount})`);

    // The feed is expected to be LIVE once Task 3's Worker is deployed (this
    // script also runs pre-deploy, where sample is the correct/expected
    // state) — accept either, but always report which one was found so a
    // human catches an unexpected mode at a glance.
    const captionText = await page.locator('#ig-feed-caption').textContent();
    const isLive = /live/i.test(captionText || '');
    const isSample = /sample/i.test(captionText || '');
    ok(isLive || isSample, `[${label}] caption discloses feed mode — "${captionText}"`);
    console.log(`  INFO  [${label}] feed mode: ${isLive ? 'LIVE' : isSample ? 'sample' : 'unknown'}`);

    const firstHref = await page.locator('#ig-feed-grid .ig-tile').first().getAttribute('href');
    ok(!!firstHref && firstHref.includes('instagram.com'), `[${label}] tiles link out to Instagram (found ${firstHref})`);

    ok(errors.length === 0, `[${label}] 0 console/page errors` + (errors.length ? `  <- ${errors.slice(0, 5).join(' | ')}` : ''));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n✗ RED — ${failed} check(s) failed.` : '\n✓ GREEN — all ig-feed checks passed.');
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Full local regression sweep**

```bash
lsof -i :8743 -sTCP:LISTEN -t | xargs -r kill 2>/dev/null
npx --yes serve -l 8743 . &
sleep 2
npm run probe
npm run budget
node tools/verify-hero-scenes.mjs
node tools/verify-build-in.mjs
node tools/verify-ig-feed.mjs
node tools/verify-world-cycle.mjs
node tools/verify-prove-it-v2.mjs
npm test
kill %1
```

Expected: every check green, 0 failures — including the pre-existing suites, confirming nothing regressed.

- [ ] **Step 3: Commit the verify script**

```bash
git add tools/verify-ig-feed.mjs
git commit -m "test(ig-feed): verify the sample grid renders at desktop + true 375px mobile"
```

- [ ] **Step 4: Create the real KV namespace (in the `lgr-web-studio` project)**

```bash
cd ~/Desktop/lgr-web-template/sites/lgr-web-studio
npx wrangler kv namespace create IG_CACHE
```

Paste the returned `id` into that project's `wrangler.toml`, replacing `PLACEHOLDER-run-wrangler-kv-namespace-create-first`. Commit that one-line change in the `lgr-web-template` repo:
```bash
cd ~/Desktop/lgr-web-template
git add sites/lgr-web-studio/wrangler.toml
git commit -m "chore(lgr-web-studio): wire the real IG_CACHE KV namespace id"
```

- [ ] **Step 5: Checkpoint with the user before deploying anything**

This step deploys to two real, live-traffic destinations: `git push origin main` (staging repo → `laurencerugley.github.io`) and `./promote.sh` (→ the production `lgr-web-studio` Worker, which is being converted from assets-only to a full Worker as part of this deploy — the highest-stakes single step in this whole plan). Show the user: `git log --oneline` in both repos, `git diff origin/main --stat` in the staging repo, confirm every check from Step 2 is green, and get **explicit go-ahead naming both deploys separately** — this is not the same low-stakes class of push as a pure static-site change.

- [ ] **Step 6: Push staging, then promote to production**

```bash
cd ~/Desktop/laurencerugley.github.io
git push origin main
```

Poll for GitHub Pages to rebuild (`gh api repos/LaurenceRugley/laurencerugley.github.io/pages/builds/latest`), confirm `laurencerugley.github.io` serves the new section (sample data still, since the live Worker isn't deployed yet at this exact point) — this is the same staging checkpoint the hero build-in ship used.

Then promote to real production:
```bash
cd ~/Desktop/lgr-web-template/sites/lgr-web-studio
./promote.sh --dry     # review exactly what will copy first
./promote.sh            # runs the pre-promote guard (size-budget + site-probe against staging), rsyncs static files, then `wrangler deploy` — this is what actually ships src/worker.js's cron+KV+/api/ig-feed to lgrwebstudios.com
```

If `promote.sh` aborts on the pre-promote guard, stop and re-diagnose — do not bypass it.

- [ ] **Step 7: Trigger and verify the first real fetch on production**

```bash
curl -s https://lgrwebstudios.com/api/ig-feed | head -c 2000
```

This request itself IS the first real fetch (the self-healing KV-miss path in `src/worker.js`). Expected: `{"live":true,"updatedAt":"...","items":[...]}` with real post data (real `media_url`/`permalink`/`caption` values, not the `sample-N` ids from `data/ig-sample.json`).

**If this instead returns an error** (e.g. a Graph API error body, a 401, a missing-scope message): the response is the fallback sample JSON (`"live":false`) and `wrangler tail` (or the Cloudflare dashboard's Worker logs) will show the `console.warn('[ig-sync] live fetch-on-miss failed...')` line with Meta's own error message. **Report the exact error body verbatim** (it's Meta's own message, safe to show — request params like the field list may appear in it, the token itself never does, since it's never logged). Do not attempt to work around a scope/token error by guessing at fixes — surface it and stop; that's a Meta-side configuration issue, not a code bug to patch around blind.

Once confirmed live, re-run the verify suite against production and confirm the caption now reads "Live from Instagram":
```bash
node tools/verify-ig-feed.mjs https://laurencerugley.github.io/  # staging still — sample, expected
node tools/verify-ig-feed.mjs https://lgrwebstudios.com/          # production — should report LIVE mode
node tools/verify-hero-scenes.mjs https://lgrwebstudios.com/      # cheap regression check the hero is undisturbed
```

- [ ] **Step 8: Confirm the cron trigger is registered**

```bash
cd ~/Desktop/lgr-web-template/sites/lgr-web-studio
npx wrangler deployments list
```

Cloudflare's deploy output / dashboard confirms the `[triggers] crons` entry from `wrangler.toml` is active on the deployed version — cite this in the report rather than asserting it from the config file alone (the config only proves intent; the deployment confirms it took effect).

- [ ] **Step 9: Capture evidence**

Into `/Users/lencho/lgr-business/showcase-review/ig-sync/`: desktop + true-375px mobile screenshots of the LIVE grid (real Playwright viewports — no OS window-resize floor to fight, unlike the interactive-browser captures from the hero build-in session), zero-console-errors confirmation, and the `curl https://lgrwebstudios.com/api/ig-feed` response (redact nothing — it contains no secret, only public post data).

- [ ] **Step 10: Write the report**

Include, verbatim and complete (no placeholders):
1. What's live now: real @lgrwebstudios posts rendering in "Latest from @lgrwebstudios" on `lgrwebstudios.com`, cron active, self-healing cache confirmed.
2. The corrected architecture finding (production = separate `lgr-web-studio` Worker, not the staging repo's dormant scaffold) and what it retroactively explains about the earlier hero-build-in session's "stale Cloudflare cache."
3. The CDN-expiry-vs-byte-caching tradeoff, stated plainly (3h cron chosen; R2 byte-hosting is the upgrade path if that proves insufficient).
4. Full verification results (numbers, not vibes) for local, staging, and production.
5. Confirmation the publish-direction tool (`tools/ig-publish-test.mjs`) was written, dry-run tested, and **never run with `--live`** — remains the owner's deliberate first click: `node tools/ig-publish-test.mjs --image-url=<url> --live --confirm=PUBLISH`, run from a machine with `IG_TOKEN`/`IG_USER_ID` in its environment (the Worker secret isn't readable back out via `wrangler`, so this needs the token value from wherever the owner originally generated it).

## Self-Review

**Spec coverage:**
- Worker scheduled cron fetch → self-healing KV cache, normalized JSON → Task 3. ✓
- CDN-URL-expiry tradeoff decided + documented → Global Constraints + Task 3's `src/worker.js` header. ✓
- Token in Worker secret, never in code/logs/config → Task 3 (`env.IG_TOKEN` only, error bodies never include it), Global Constraints. ✓
- Graceful fallback (KV miss → live self-heal → sample JSON, site never breaks) → Task 3 Step 2 (`/api/ig-feed`'s two-tier fallback), Task 2 (`fx/ig-feed.js`'s two-tier `.catch()`). ✓
- Site section, 6-9 tiles, house-styled, links out, lazy-loaded, LCP untouched, mobile-perfect → Task 2. ✓
- Gated publish tool, two-step flow, not run for real → Task 4. ✓
- Owner architecture correction + setup-so-far documented → Task 5 Step 10. ✓
- No new deps, secrets never echoed, cache-bust, existing suites stay green → Global Constraints + Task 5 Step 2. ✓
- Wire IG_USER_ID + read IG_TOKEN from env in the fetch path → Task 3 Steps 1-2. ✓
- Flip feed section from mock to live → Task 2 Step 5 (`IG_FEED_URL` now points at the live route directly) + Task 5 Step 7 (verified live). ✓
- Trigger/verify the first real fetch on production → Task 5 Step 7 (the self-healing KV-miss path makes the first `curl` request itself the trigger). ✓
- Confirm cron schedule active → Task 5 Step 8. ✓
- Verify cache strategy handles URL-expiry plan → Task 3 tests (self-heal-on-miss test) + Task 5 Step 7 (live confirmation). ✓
- Report exact API error body if it errors, never log the token → Task 5 Step 7, `src/worker.js`'s `fetchInstagramMedia`. ✓
- Publish-direction script stays unrun → Task 4 Step 2, Global Constraints, Task 5 Step 10 item 5. ✓
- Evidence to showcase-review/ig-sync/ → Task 5 Step 9. ✓

**Placeholder scan:** no TBD/TODO; every code block is complete, runnable code with real values (the `v21.0` API version is explicitly flagged as a placeholder the owner should periodically confirm, and the KV namespace id is created for real in Task 5 Step 4 before deploy — not left as a placeholder at ship time).

**Type/name consistency:** `IG_FEED_URL`/`IG_FEED_SAMPLE_URL` (Task 1) are the only symbols Task 2's `fx/ig-feed.js` imports — matches. `IG_CACHE_KEY`/`IG_MAX_ITEMS`/`IG_FIELDS`/`fetchInstagramMedia`/`refreshCache` (Task 3) are consistent between the implementation step and the test step. The JSON shape (`live`, `updatedAt`, `items[]` with Graph API field names) is identical across `data/ig-sample.json` (Task 1), the Worker's cached payload (Task 3), and what `fx/ig-feed.js` reads (Task 2) — no field-name drift.
