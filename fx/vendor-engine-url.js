/* fx/vendor-engine-url.js — single source of truth for the vendor hero-engine
   lib's import specifier. Every dynamic import() of the engine MUST import
   VENDOR_ENGINE_URL from here instead of hardcoding "../vendor/lgr-engine-
   hero.es.js?v=N" — two call sites hardcoding the same file at two different
   query strings are two different ES module instances to the browser (the
   module map is keyed by the resolved specifier, query string included), so
   the whole ~241KB-gz engine gets fetched AND executed TWICE on one page
   load, once per distinct specifier.

   This is exactly what happened (caught via Lighthouse + a direct network-
   request capture on production, not assumed from reading the code):
   fx/engine-hero.js was bumped to ?v=4 during the hero-carousel re-vendor,
   fx/look-reel.js was never updated to match and stayed on ?v=3 — despite
   its own header comment claiming "the same ?v=" as a load-bearing
   assumption. Importing this constant from both call sites means there is
   only ever ONE version number to bump, in ONE place, so the two call sites
   can't drift apart again.

   import.meta.url here resolves relative to THIS file's own location
   (fx/vendor-engine-url.js), not the importing module's — so every
   consumer gets the identical resolved absolute URL regardless of where
   IT lives, which is what actually matters for the browser to dedupe the
   module. */
export const VENDOR_ENGINE_URL = new URL('../vendor/lgr-engine-hero.es.js?v=5', import.meta.url).href;
