# Pixel Companion: Genre Research Brief

**Purpose:** Inform new mechanic development for the pixel-companion feature on laurencerugley.github.io.  
**Scope:** Interaction design and mechanics only. Art is handled separately.  
**Date:** May 2026

---

## 1. Genre Overview and Lineage

### What Is This Genre Called?

There is no single industry-standard name. The umbrella term is **desktop pet** (or **desktop mascot**), used interchangeably with "screenmate" in older Windows shareware communities. Web-native variants are more often called **cursor companions**, **web mascots**, or just "interactive sprites." The evasion sub-type—characters that flee rather than follow—has no established name; it is an inversion of the more common cursor-follower pattern.

### Desktop Pets (Native OS, 1980s–2000s)

**Neko** (1989 Macintosh, Kenji Gotoh; earlier NEC PC-9801 CLI version by Naoshi Watanabe)  
The canonical ancestor. A cat that chases the mouse cursor across the screen. When the cursor stops, Neko runs to where it was last seen, then enters idle: it stares for a few seconds, scratches itself, yawns, and falls asleep. Clicking it wakes it up. Interaction model: **pure chase + rich idle**. The pixel art was declared public domain by Gotoh, which is why every derivative looks the same. A web port (`oneko.js` by adryd325) brings an almost identical state machine to browser pages—it is widely embedded on personal sites today. Source: [Neko: History of a Software Pet](https://eliotakira.com/neko/), [Wikipedia](https://en.wikipedia.org/wiki/Neko_(software)), [oneko.js](https://github.com/adryd325/oneko.js/).

**eSheep** (1995, Tatsutoshi Nomura)  
A sheep that walks along the bottom taskbar, falls off windows, climbs back up, bounces around. No direct cursor interaction—it is autonomous. Interaction model: **ambient wanderer**, physics-aware (detects window edges). A 64-bit revival exists for modern Windows. Source: [eSheep 64bit](https://adrianotiger.github.io/desktopPet/).

**Shimeji** (2000s, Japanese freeware; modern ee fork by Kilkakon)  
Characters that climb window edges, sit on title bars, grab windows and drag them off screen. Highly configurable via XML. Interaction model: **environment-aware wanderer + grabbable**. The user can pick up and throw the character. A browser extension version ([shimejis.xyz](https://shimejis.xyz/)) runs inside Chrome, walking across web page elements. This is the closest existing analog to a scroll-based web companion. Source: [Shimeji FAQ](https://www.deviantart.com/charm-box/journal/Shimeji-FAQ-223918597), [chrome-stats](https://chrome-stats.com/d/gohjpllcolmccldfdggmamodembldgpc).

**Bonzi Buddy** (1999–2004, Bonzi Software)  
A purple gorilla using Microsoft Agent technology. Told jokes, read email, managed downloads. Interaction model: **proactive assistant**—it initiated contact, offered help unprompted, covered content. Became spyware: collected personal data, reset browser homepages, served fake Windows-error ad dialogs. FTC fined the company $75,000 in 2004 for COPPA violations. Discontinued. Source: [Wikipedia](https://en.wikipedia.org/wiki/BonziBuddy), [HowToGeek](https://www.howtogeek.com/321720/a-brief-history-of-bonzibuddy-the-internets-most-friendly-malware/).

**Clippy / Office Assistant** (Microsoft Office 97–2003)  
Not a pet—a productivity assistant—but the dominant cautionary tale for this design space. Appeared uninvited ("It looks like you're writing a letter..."), covered content, offered generic help based on superficial pattern matching, could not be easily dismissed. Turned off by default in Office XP; removed in Office 2007. The lesson cited universally: user control is non-negotiable, and personality without usefulness is actively annoying. Source: [Wikipedia](https://en.wikipedia.org/wiki/Office_Assistant), [The New Stack](https://thenewstack.io/humanity-vs-clippy-lessons-from-microsofts-failed-virtual-assistant/).

**Desktop Goose** (2019, samperson; [itch.io](https://samperson.itch.io/desktop-goose))  
A goose that steals your cursor, drags meme images onto screen, tracks mud, honks, and drops notes. Interaction model: **antagonist chaos agent**—it is designed to be annoying in a deliberate, funny way. Highly viral. Users grant permission knowingly; that consent is what makes it delightful rather than malicious. The key mechanic: the goose is aggression-configurable, and its pranks feel earned because you installed it.

### Tamagotchi and Virtual Pet Games (Reference)

**Tamagotchi** (1996, Bandai)  
Three-button input: feed, clean, play. The pet's stats decay over time; neglect leads to illness or death. Interaction model: **need-based relationship**—the user must actively return to maintain the pet. Emotional investment comes from consequence. Not directly translatable to a portfolio site companion (consequence/death would be annoying), but the idea of **state that persists across visits** is directly relevant. Source: [Wikipedia](https://en.wikipedia.org/wiki/Tamagotchi).

**Nintendogs** (2005, Nintendo DS)  
Petting detected via touch-screen stroke direction and location on the dog's body. Different body zones produce different reactions. Interaction model: **gesture-based affection**. The lesson: spatial input mapping—where on the character you interact matters—creates richness without complexity.

**Pokemon HeartGold / SoulSilver** (2009, Nintendo DS)  
The first Pokemon in your party follows you in the overworld. You can face and talk to it; it reports its mood (a hidden -127 to 127 value). Mood shifts based on context: fire-types are unhappy near water, grass-types dislike ice caves. Large Pokemon re-enter their Pokeball indoors. Interaction model: **contextual companion + mood state**. The companion notices where you are and reacts appropriately. Source: [Serebii](https://www.serebii.net/heartgoldsoulsilver/partner.shtml), [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Walking_Pok%C3%A9mon).

**Chao Garden** (Sonic Adventure, 1998; Sonic Adventure 2, 2001, Sega)  
A garden you visit to raise Chao creatures. Feeding, raising, and alignment (hero vs. dark characters interact differently). Chao eventually die and reincarnate if well-cared-for. Interaction model: **persistent nurture system + alignment consequence**. Source: [Chao Garden Wikipedia](https://en.wikipedia.org/wiki/Chao_Garden).

**Animal Crossing villagers**  
NPCs with daily schedules, hobby-based activities (reading, exercising, singing), and mood states. Occasionally "ping" the player—run up excitedly—to initiate special dialogue. Idle animations include wobbling heads. Interaction model: **scheduled ambient life + attention-seeking ping**. Source: [Nookipedia](https://nookipedia.com/wiki/Conversation).

### Web-Native Cursor Effects (GeoCities Era and Modern)

The GeoCities / Angelfire era (mid-1990s to early 2000s) popularized cursor trail scripts: colored squares, dancing stars, text flags, and animated emoji that spawned at the cursor position. These were purely visual, not interactive. The character `tholman/cursor-effects` library documents 12 such effect types still in use today, including trailing dots, rainbow smears, fairy dust, and ghost cursors. Source: [tholman.com](https://tholman.com/cursor-effects/), [Hacker News discussion](https://news.ycombinator.com/item?id=11049439).

Modern web equivalents tend toward eased "following dot" cursors (a lagging blob that trails the real cursor) rather than characters with their own agency.

### Website Easter Eggs with Living Characters

A handful of verified examples exist of sites using animated characters as easter eggs:

- Viget's 2013 intern Tumblr: Mario runs as you scroll and jumps when you press "j." Source: [Viget](https://www.viget.com/articles/breaking-the-konami-code-adding-an-easter-egg-to-your-site/).
- British Vogue: a hat-wearing velociraptor triggered by the Konami code.
- OFF+BRAND website: a colorful orb that follows the user through the homepage; the browser tab changes to "We miss you" when the user switches away.

These are rare and memorable precisely because the category is thin.

---

## 2. The "Flees from Cursor" Mechanic Specifically

Cursor evasion is substantially rarer than cursor chasing. Most of the documented genre chases, follows, or ignores the cursor; fleeing is an inversion that creates a fundamentally different relationship: the user becomes the aggressor, and the character becomes a fugitive.

### Verified Examples of Cursor Evasion

**Desktop Goose** (cursor theft variant): the goose does not flee the cursor—it *steals* the cursor and drags it around. Evasion from the user's perspective, but implemented as cursor capture. The user experiences loss of control rather than a chase.

**Web minigames** (cursor-as-obstacle): the game genre "mouse avoider" frames the cursor as the threat and the on-screen character as the thing to protect. Examples include "Just Avoid It" and "Cursor Thief" on Flash game portals. Source: [funny-games.biz](https://www.funny-games.biz/just-avoid-it.html), [Addicting Games](https://www.addictinggames.com/funny/cursor-thief).

**Dreader** (itch.io, Donitz): a short horror mouse-maze game where you must avoid something with the cursor. Not an ambient companion.

No verified examples of a portfolio-site or ambient-web-companion that specifically uses cursor *evasion* as its primary mode were found. This appears to be genuinely novel territory, which is a competitive advantage for the pixel-companion feature.

### What Makes Evasion Playful vs. Annoying

The difference comes down to **catchability** and **stakes**.

**Annoying evasion:** the character is always faster than the cursor; catching it is impossible; the user eventually gives up. The chase feels like being mocked.

**Playful evasion:** the character has a realistic but beatable speed advantage; it tires or hides (giving the user a window); catching it triggers a satisfying reward. The chase feels like a game the user can win.

Key design levers:
- **Cooldown on the flee trigger.** If every cursor approach triggers a dash, the character never settles. A minimum time between dashes (e.g., 2-3 seconds) prevents infinite jitter.
- **Tired state / hiding.** After N dashes within a short window, the character should enter a slow walk, a panting idle, or hide—becoming catchable. This is the core loop that prevents annoyance.
- **The hiding spot as catch mechanic.** The pixel-companion already implements this well (cardboard box). The box is the most satisfying catch state because it is spatially fixed—the user can mouse to it deliberately, not just chase a moving target.
- **Dash destination legibility.** The character should dash toward a clear destination (the opposite wall, a fixed margin), not jerk randomly. Predictable escape routes let users plan interception.
- **The alert signal.** The MGS "!" is a good example: it telegraphs the state change before the dash begins. The user knows what triggered it and what is about to happen. Unexplained dashes read as bugs.

---

## 3. Catalogue of Micro-Mechanics

The following is a reference list of mechanics seen across the genre, annotated for portfolio-site fit.

| Mechanic | What it is | Portfolio fit |
|---|---|---|
| **Cursor proximity alert** | Character notices cursor and signals before reacting (already implemented: "!" flash). | Excellent—already done. |
| **Evasion dash** | Character runs away from cursor when within threshold distance. | Excellent—already done. |
| **Tired / catchable state** | After N dashes, character slows or hides, becoming catchable for a window. | Excellent—high priority addition (see Section 5). |
| **Idle quirk queue** | Random behaviors fire while standing still: yawn, sit, look around, hide (already implemented). | Excellent—already done. |
| **Idle quirk diversity** | More rare / longer quirks to reward extended watching: stretching, counting fingers, writing in a tiny notebook, making a phone call. | Good—Laurence can spec new sprite states. |
| **Sleep when tab hidden** | Character lies down and plays sleep animation when `document.visibilityState === 'hidden'`; wakes when tab returns to foreground. | Excellent—pure code, no new art needed if sleep frame exists. |
| **"We missed you" return** | On tab refocus after >60s, character does a stretch-and-wave rather than immediately returning to idle. | Good—requires one new sprite state or repurposes existing frames. |
| **Scroll-speed reaction** | Character notices fast scrolling and does a "whoa" or stumble animation; slow scroll results in a relaxed walk. | Good—velocity is computable from scroll event delta/time. |
| **Time-of-day behavior** | After 10pm local time, character appears drowsy (slower animations, more yawns, earlier sleep onset). | Good—`new Date().getHours()` requires no API. |
| **Scroll-position context** | Character does something different at page top (waves hello) vs. at the bottom (waves goodbye, points up). | Good—scroll percentage already computed for positioning. |
| **Contextual page-event reactions** | React to: form submit (jump), work item hover (point/salute), external link hover (wave goodbye). | Excellent—already partially implemented. Extend to more events. |
| **Click-anywhere reaction** | A nearby click (within Xpx) startles the character briefly. | Moderate—could feel noisy if every click triggers it. |
| **Fast-click / spam reaction** | Rapid repeated clicks cause the character to cover its ears or look annoyed. | Niche—funny easter egg, low implementation cost. |
| **Konami code unlock** | Entering ↑↑↓↓←→←→BA triggers a special animation or costume. | Great easter egg for developers visiting the portfolio. |
| **Petting / catch interaction** | Catching the character (via click during hiding state) triggers a happy animation. | Excellent—already implemented for box state. |
| **Catch counter persistence** | Store catch count in localStorage; after N catches, character does a special "you got me again" animation. | Good—pure code, high delight ceiling, no art needed beyond a new text overlay. |
| **Visit number awareness** | First visit: character waves hello. Return visits: character briefly acknowledges you. | Good—localStorage visit count, one new sprite state or a wave gesture. |
| **Point-at-content** | Character points at hovered links or sections (already implemented for `.work-item`). | Excellent—already done. |
| **Trail effect** | Character leaves small prints or particles on the page as it moves. | Moderate—CSS/canvas, no new sprite art, but can look cluttered at scale. |
| **Z-trail on sleep** | Floating "Z" characters drift upward while sleeping (already implemented). | Excellent—already done. |
| **Multiple characters** | A second character appears occasionally (friend, rival). | Complex—requires a second sprite engine instance; high art cost. |
| **Character wanders freely** | During extended user idle (3+ minutes with no scroll or mouse), character walks autonomously across the viewport. | Good—easy to implement: if idle time > threshold, begin autonomous walk loop. |
| **Weather-aware behavior** | Check real weather via API; character carries an umbrella on rainy days. | Low—requires geolocation + API call; privacy friction + dependency risk outweigh the delight. Skip. |
| **Day/night costume** | Different color palette at night vs. day using `new Date().getHours()`. | Moderate—requires palette-swap mechanism; art work for Laurence. |
| **Unlockable costumes** | Performing N catches or the Konami code reveals a new color scheme. | Moderate—nice reward loop, low code cost if palette system exists. |
| **Stat display** | A tiny HUD shows "caught: 7 times" visible only while hiding. | Niche—adds a game layer that may feel out of place on a professional portfolio. |
| **Drag interaction** | User can click-and-drag the character to a new position. | Moderate—Shimeji does this well; adds physicality, moderate code complexity. |
| **Bounce off viewport edge** | When dashing, character bounces off the wall rather than stopping. | Good—adds physicality, one additional edge-detection check. |

---

## 4. Good vs. Annoying: Design Principles

### The Bonzi Buddy / Clippy Failure Mode

Both Bonzi Buddy and Clippy failed for the same structural reason: they initiated contact without consent, covered content the user was trying to read, and could not be easily dismissed. Their interactivity was in service of the character's agenda (sell software, offer "help") rather than the user's.

The core failure conditions to avoid:

1. **Covering readable content.** The companion must stay in the bottom strip of the viewport, below the content layer. It must never occlude text, images, or interactive elements.
2. **Initiating interaction unprompted at a bad moment.** A dash triggered while the user is reading an article paragraph is annoying. The current implementation has a minimum cooldown between dashes—this is correct.
3. **Irreversibility.** The user must always be able to turn the companion off in one click, and that state must persist. The pixel-companion already handles this via localStorage.
4. **Breaking focus.** Any state change that draws the eye competes with the content. Animations should be peripheral (bottom edge) and brief. Long ambient animations (the Z-sleep trail, the smoke) are fine precisely because they are slow and in a non-focal zone.
5. **Motion without opt-out.** Users with vestibular disorders can experience nausea from peripheral motion. The pixel-companion already checks `prefers-reduced-motion` and freezes in place—this is the right implementation.

### What Makes Them Work

- **Opt-in gate.** The "pixel mode" toggle is the correct pattern. The user invites the character; it does not appear uninvited.
- **Legible signals before state changes.** The "!" before a dash is a good example. Users feel smarter when they can predict the character's reaction.
- **Reward for attention.** The rarest behaviors (box-hide, cigar) reward users who watch long enough. This is the correct scarcity gradient.
- **Character consistency.** The character should feel like it has a coherent personality. The current implementation (skittish, slightly reckless, fond of hiding) is already coherent—new mechanics should fit that personality, not contradict it.
- **Quick recovery.** After any quirk or reaction, the character should return to idle promptly. Long one-shot animations that play to completion before the system can respond feel sluggish.

### The Line Between Charming and In the Way

The rule of thumb: if the user would notice the character's *absence* after a few minutes, it is charming. If the user would notice its *presence* and wish it were gone, it is in the way. This is a function of animation frequency, zone of activity (peripheral vs. central), and whether the companion ever initiates at a bad moment.

---

## 5. Top 10 Mechanic Recommendations for This Project

Ranked by delight-per-effort and annoyance risk. The existing engine is a vanilla JS canvas-atlas sprite system using a state machine with named states, frame arrays, and durations.

---

### Rank 1: Tired State After Repeated Dashes (Catchable Window)

**What it is:** After 3 consecutive dashes within a 10-second window, the character enters a brief `tired` state—slower walk, no more dashes—for 4–6 seconds. During this window, it is catchable with a click anywhere on it, not just when hiding.

**Implementation sketch:** Track `recentDashCount` and `lastDashResetAt`. If `recentDashCount >= 3`, set state to `walk-slow` (halved duration values on existing walk frames) and set a `tiredUntil` timestamp. Suppress dash logic while `performance.now() < tiredUntil`. Click on the sprite during this window calls `triggerCatch()`.

**Why it fits:** Solves the only real gap in the current evasion loop. Without a tired state, a persistent user can chase the character indefinitely with no payoff. The tired state creates a satisfying catch condition without requiring new hiding-spot infrastructure. Requires one new sprite frame ("panting" or "hunched") for maximum expressiveness—but works at reduced delight even with reused idle frames.

**New art needed:** One optional "exhausted" idle frame. The mechanic functions without it.

---

### Rank 2: Sleep When Tab Is Hidden

**What it is:** When `document.visibilityState === 'hidden'`, the character plays a sleep animation (already exists: Z-trail state). When the tab comes back to foreground, it wakes with a stretch.

**Implementation sketch:** Add `document.addEventListener('visibilitychange', onVisibilityChange)`. In the handler: if hidden, `enterState('sleep')` and suppress the main loop's dash/quirk logic. If visible again, clear sleep state and play a one-shot `wake` sequence (yawn → idle).

**Why it fits:** Zero annoyance risk. The character does something charming when the user cannot even see it. The "wake" moment when returning to the tab is a small surprise that rewards users who tab back. Pure code—no new art required if the existing yawn frame is repurposed as the wake animation.

**New art needed:** None if yawn frames are reused.

---

### Rank 3: Scroll-Speed Reaction ("Whoa" on Fast Scroll)

**What it is:** When the user scrolls faster than a velocity threshold (e.g., >1500px/s), the character briefly plays a "startled" or "windswept" frame before returning to the walk.

**Implementation sketch:** In the `onScroll` handler, compute `scrollVelocity = Math.abs(window.scrollY - lastScrollY) / (now - lastScrollAt)`. If above threshold and character is in `walk-right` or `walk-left`, queue a one-shot `startled` state (200ms) then resume walk. Reset `lastScrollAt` each frame.

**Why it fits:** Acknowledges the user's action in a way that feels responsive and alive. Fast-scrolling users—who are more likely to be impatient—get a funny reaction instead of feeling ignored. Requires one new "windswept" or "startled" sprite frame; reusing `dash-alert` (the "!" frame) is acceptable as a placeholder.

**New art needed:** One "startled" frame recommended; `dash-alert` works as a temporary substitute.

---

### Rank 4: Scroll-Position Greetings (Top Wave / Bottom Wave)

**What it is:** When the character reaches the leftmost position (scroll position ~0%), it plays a brief wave. When it reaches the rightmost position (~100% scroll), it plays a wave-goodbye and points upward.

**Implementation sketch:** In `updatePosition()`, compare the new scroll percentage to the previous one. If crossing below 2%, trigger a one-shot `wave-hello` state. If crossing above 98%, trigger `wave-goodbye`. Use a boolean flag to prevent re-triggering on the same crossing.

**Why it fits:** The character already moves based on scroll position—this makes that movement feel intentional rather than mechanical. A "hello" at the top of the page and "goodbye" at the bottom is a tiny narrative arc. Requires two new sprite frames (wave gesture in two directions) or one frame used in both states.

**New art needed:** One or two wave frames.

---

### Rank 5: Autonomous Wander During User Idle

**What it is:** If there has been no scroll or mouse movement for 90 seconds, the character starts walking autonomously (left and right, randomly) until the user returns.

**Implementation sketch:** Track `lastInteractionAt = performance.now()` on scroll and mousemove events. In the main loop, if `performance.now() - lastInteractionAt > 90000` and current state is `idle` or a neutral state, begin a short autonomous walk: pick a random direction, walk for 1–3 seconds, stop, idle-quirk, repeat. Resume normal behavior on any user input.

**Why it fits:** The character feels alive even when the user is not interacting. This is the eSheep / Shimeji "ambient creature" model. No new art—uses existing walk frames.

**New art needed:** None.

---

### Rank 6: Visit Counter with Acknowledgment on Return

**What it is:** On each page load, increment a localStorage visit counter. If `visitCount >= 2`, after 3–4 seconds of idle, the character does a brief "recognition" gesture (a nod, a wave, or a salute—the salute frame already exists) rather than immediately starting quirks.

**Implementation sketch:** On `ensureSprite()`, read `localStorage.getItem('lgr-visit-count')`, parse as int, increment, write back. If `>= 2`, set a one-time flag `sawReturnVisit = true`. In the idle-quirk scheduler, if `sawReturnVisit` and not yet triggered, fire `salute` state as the first quirk (the salute state already exists in the engine).

**Why it fits:** Rewards repeat visitors—the people most likely to be recruiters or collaborators who came back to re-examine the work. The salute frame is already implemented; this costs nearly nothing.

**New art needed:** None. Salute frame already exists.

---

### Rank 7: Catch Counter with "Again?" Reaction

**What it is:** Track how many times the user has caught the character (via localStorage). After 3 catches, the character does a brief "really?" shrug animation when caught, instead of the standard happy response.

**Implementation sketch:** On `triggerCatch()`, increment `localStorage.getItem('lgr-catch-count')`. If `>= 3`, play an alternate `shrug` one-shot state before returning to idle instead of the standard catch animation.

**Why it fits:** Creates a meta-layer for users who actively play with the companion. The character "remembers" you, which deepens the personality. Requires one new `shrug` or `defeated` frame.

**New art needed:** One "shrug" or "exasperated" frame.

---

### Rank 8: Konami Code Unlock

**What it is:** Entering ↑↑↓↓←→←→BA triggers a special one-shot animation (a tiny fireworks burst, the character doing a victory dance, or a palette swap to an alternate costume).

**Implementation sketch:** Listen for `keydown` events and compare against the Konami sequence using a sliding buffer. On match, fire a `celebrate` one-shot state or toggle an `altPalette` flag that swaps the color lookup in the atlas builder. Because the atlas is built once at init, a palette swap would require rebuilding the atlas (call `buildAtlas()` again with a modified palette).

**Why it fits:** The Konami code is the canonical developer easter egg. Portfolio visitors who know it are the exact audience Laurence wants to impress. Atlas rebuild is a one-time operation, not a per-frame cost.

**New art needed:** One `celebrate` frame, or zero if a simple color palette swap is the reward.

---

### Rank 9: Bounce Off Viewport Edges During Dash

**What it is:** When the character dashes and would reach the viewport edge, it bounces (reverses direction) with a brief wall-impact animation rather than stopping dead.

**Implementation sketch:** In the dash destination computation, if the computed destination X exceeds `computeMaxX()` or falls below `MARGIN`, clamp and flip direction: play `bump-wall` one-shot (a squash frame), then continue the dash in the opposite direction. `roll-ball-squashed` could serve as the squash frame.

**Why it fits:** Adds physicality to the evasion without new art (the existing roll-squash frame works). Makes the dash feel less like a state machine firing and more like a living creature hitting a wall.

**New art needed:** None if `roll-ball-squashed` is repurposed.

---

### Rank 10: "Fast Clicks" Annoyance Reaction

**What it is:** If the user clicks near the character more than 4 times in 3 seconds (poking / spamming), the character stops, turns to face the cursor, and plays a brief "stop it" or "annoyed" animation.

**Implementation sketch:** Track a `recentClickCount` and `lastClickResetAt`. On each click within 80px of the sprite, increment `recentClickCount`. If it crosses 4 in 3 seconds, enter a one-shot `annoyed` state. This is the same cooldown pattern as the tired-state mechanic.

**Why it fits:** Turns an empty interaction (spam-clicking) into a comedic exchange. Requires one new "annoyed" frame (crossed arms, scowl)—or the existing `dash-alert` frame can stand in with a subtitle overlay.

**New art needed:** One "annoyed" frame recommended.

---

## 6. Accessibility and Performance Notes

### Accessibility

**prefers-reduced-motion:** Already implemented correctly—the engine reads the media query at init and freezes the character in place if true. The character remains visible as a static sprite but does not animate. This is the correct approach: do not hide the character entirely (that would break the visual design), but do eliminate all motion. Source: [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion), [WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

**aria-hidden:** The sprite element already has `aria-hidden="true"`. This is correct—a decorative animated element must be hidden from the accessibility tree. Never add alt text or ARIA labels to a purely decorative companion.

**Focus management:** The toggle button for pixel mode must be keyboard-reachable and clearly labeled. The `aria-pressed` attribute is already being set correctly. Ensure the button is in the natural tab order and has a visible focus ring.

**Content occlusion:** The character sits at the bottom of the viewport with a fixed bottom offset. Ensure this strip is never over interactive or readable content on any viewport width, especially on mobile if pixel mode is ever enabled on smaller screens.

### Performance

**requestAnimationFrame loop:** The engine uses a single `requestAnimationFrame` loop (the "main loop"). This is the correct architecture. Never add a second `rAF` loop or a `setInterval` for secondary effects—merge everything into the one loop. Source: [web.dev canvas performance](https://web.dev/articles/canvas-performance).

**Atlas canvas built once at init:** The sprite atlas is built once and converted to a data URL. All subsequent rendering is CSS `background-position` shifts on a single `div`. This is extremely cheap—no per-frame canvas operations during normal animation.

**Browser tab throttling:** Modern browsers throttle `requestAnimationFrame` in background tabs (target 1fps or pause entirely). This is desirable for the companion—less CPU when the user is not looking. The sleep-when-tab-hidden mechanic (Rank 2) should use the `visibilitychange` event to explicitly pause the loop rather than relying on browser throttling, because throttling behavior is inconsistent across browsers and the character state should be deterministic. Source: [aboutfrontend.blog](https://aboutfrontend.blog/tab-throttling-in-browsers/).

**localStorage writes:** Keep localStorage writes infrequent. Write the visit counter once per page load, not on every interaction. Write the catch counter only on actual catch events. localStorage writes are synchronous and block the main thread.

**Event listeners:** The scroll and mousemove listeners are already passive (`{ passive: true }`). Maintain this on any new event listeners to avoid blocking the compositor thread. Source: [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

**Mobile:** If pixel mode is ever extended to touch devices, replace `mousemove` distance checks with `touchmove` events. The dash-away-from-cursor mechanic does not translate to touch without a deliberate redesign (there is no persistent cursor position on touch).

---

*Research compiled May 2026. Sources verified via web search. Example sites and GitHub repositories were live at time of research.*
