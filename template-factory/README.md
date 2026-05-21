# Premium-Motion Starter (LGR Web Studio)

A no-build, copy-and-ship website starter with tasteful scroll motion, a
light/dark theme toggle, a glass sticky nav, and a native scroll-progress bar.
Plain HTML/CSS/JS — drops straight onto GitHub Pages, Cloudflare Workers
(assets-only), or any static host. No bundler, no framework.

> **Design philosophy.** The fancy-AI-website tutorials are right about one
> thing: *"AI will generate a very generic result. You need human input here."*
> This starter is the human input — a restrained, reusable shell you brand and
> fill with real copy, so the result reads as *crafted*, not auto-generated.

---

## Files

| File | Responsibility |
|------|----------------|
| `index.html` | Markup + the no-flash theme `<head>` script + CDN/script tags |
| `motion.css` | Brand tokens, light/dark theme, layout, reveal/glass/progress utilities, reduced-motion |
| `motion.js` | Theme toggle + persistence, IntersectionObserver reveals, Lenis smooth scroll |

---

## Use it

1. **Copy the folder** into a new project and rename.
2. **Rebrand via tokens** — edit `:root` (and `[data-theme="dark"]`) in `motion.css`:
   - `--ink` darkest brand color · `--gold` the single accent · `--bg` page background
   - `--surface` cards · `--text` body · `--muted` secondary text · `--line` hairlines
   - Swap the two Google Fonts in `index.html` (`--serif`, `--sans`).
3. **Write real copy** in `index.html` — replace the hero line, the three Approach
   cards, the Process steps, and the CTA. Keep it short and specific.
4. **Add motion to anything** by giving it `class="reveal"` — it fades/rises in once
   when scrolled into view.
5. **Ship.** No build command. Just upload the folder.

### Section recipe
`Hero` → `Approach` (3 cards) → `Process` (numbered steps) → `CTA`.
Add or remove sections freely; the grid and steps are responsive (cards stack at
680px, the nav links hide at 560px).

---

## Avoid the "AI-slop" look (curation rules)

The difference between a $500 page and a $5,000-feeling page is restraint:

- **2–3 colors, one accent.** This starter uses exactly one (`--gold`). Resist adding more.
- **Real copy, never lorem.** Specific beats clever. Say what you actually do.
- **Generous whitespace.** Sections breathe (`96px` vertical). Don't crowd.
- **Motion supports content, never distracts.** Reveals are subtle (26px rise, one time).
  No spinning, no parallax pile-ups, no autoplay noise.
- **Type does the heavy lifting.** A serif display + a clean sans is enough.
- **One idea per section.** If a section needs a scrollbar of its own, split it.

---

## Pre-ship QA gate

Run every box before handing a client a link:

- [ ] **No console errors** (open DevTools console, reload).
- [ ] **Works with JavaScript disabled** — all content visible (nothing trapped invisible).
- [ ] **`prefers-reduced-motion` respected** — emulate it; reveals show instantly, no
      progress bar, no smooth-scroll hijack.
- [ ] **Keyboard** — Tab reaches the theme toggle, nav links, and any form fields, each
      with a visible focus ring.
- [ ] **Contrast AA in both themes** — text vs. background passes (check the muted text).
- [ ] **Mobile at 375px** — nav, hero, stacked cards, and CTA all intact.
- [ ] **Theme persists** across reload and shows no flash of the wrong theme.
- [ ] **Performance** — run Lighthouse; compress any images you add (this shell ships none).

---

## Hardening: self-host Lenis (optional)

`index.html` loads Lenis from jsDelivr. For zero third-party runtime requests
(better privacy, no CDN dependency), vendor it locally:

1. Download `lenis.min.js` (MIT license) from the same version pinned in `index.html`.
2. Commit it into the folder.
3. Change the script tag to `<script defer src="lenis.min.js"></script>` (drop
   `crossorigin`). For the CDN version, you may add a Subresource Integrity
   (`integrity="sha384-…"`) hash from jsDelivr's SRI tool.

Either way, smooth scroll is a progressive enhancement — if Lenis is missing,
the site falls back to native scrolling with no errors.
