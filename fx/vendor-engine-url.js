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
   module.

   2026-07-22 (the Lenis swap): re-vendored from the lab's lgr-engine-core
   dist-lib build (sha256 7c9aa1f6f624263f6b856470c7d7d461ccc6b4bee644cb638c8da8b01da5c705,
   md5-matched against the lab's current build) instead of the old
   lgr-engine-hero trim — the hero-only bundle never included
   createSmoothScroll (motion.js's new Lenis replacement), createCameraDirector,
   or createBeautyPresenter, only the -core build does. Kept the SITE-SIDE
   filename (vendor/lgr-engine-hero.es.js) unchanged to keep this swap a
   content + version-bump diff, not a rename-and-chase-every-reference one —
   the name is a little stale now (this is genuinely the core bundle, not a
   hero-only trim) but every consumer already resolves through this one
   constant, so a future rename is a single-file edit whenever it's worth it.
   THIRD consumer as of this swap: motion.js dynamically imports this same
   constant for createSmoothScroll — same dedupe guarantee applies, now
   across three call sites instead of two.

   2026-07-22 (the build-in swap): re-vendored again from the lab's lgr-engine-core
   dist-lib build (sha256 805c7364261948dd0fc66ab2201046a52228b698be4c7f760c80cd8a7141adc0)
   for the new createBuildIn export (entrance/assembly choreography) and the
   letterpress shader-press (pack.setBuild). Source: lab commit b608159
   ("feat(letterpress): shader-press build-in"), shipped in the pushed +
   CI-green commit a1d8f89 — NOT the 64c075b "provenance anchor" commit, which
   predates createBuildIn entirely (see docs/superpowers/plans/2026-07-21-hero-
   buildin-entrance.md for the full discrepancy note). dist-lib content is
   byte-identical from b608159 through the lab's HEAD at vendor time. */
export const VENDOR_ENGINE_URL = new URL('../vendor/lgr-engine-hero.es.js?v=7', import.meta.url).href;
