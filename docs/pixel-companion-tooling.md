# Pixel Companion — Tooling & Workflow Guide

*For upgrading the pixel-companion sprite from placeholder to a polished, you-looking character.*

---

## 1. TL;DR — Recommended Stack

Four tools. That's it. Read this section and start.

| Tool | Role | Cost |
|------|------|------|
| **Aseprite** | Your main authoring environment — drawing, animation, export | $19.99 one-time |
| **PixelLab** (pixellab.ai) | AI base sprite generation from text/concept; directional rotation | $12/mo (cancel after) |
| **Retro Diffusion** (Aseprite plugin) | AI generation *inside* Aseprite; palette-aware, real pixel art | $65 one-time |
| **Your phone camera** | Walk cycle reference — record yourself walking, trace key frames | Free |

**The flow in one sentence:** Use PixelLab to generate a 32x32 base sprite that captures the silhouette and palette, import it into Aseprite, hand-refine the likeness, animate using your phone video as reference with onion-skin, export a sprite sheet PNG.

If you only want to spend one dollar right now: buy Aseprite. Everything else can wait until you've proven you enjoy the process.

---

## 2. Photo to Pixel Art — The Likeness Problem

Getting your actual face into a 16x24 pixel character is the hardest part of this entire project. Be realistic: at 16 wide pixels, you get maybe 6–8 pixels of face. You're not fitting a portrait — you're fitting a silhouette and a color story. The goal is "recognizably Laurence" not "photorealistic Laurence."

### The honest scorecard on each tool

**PixelLab (pixellab.ai)**

The best general-purpose AI pixel art tool as of early 2026. It was purpose-built for game sprites — not a generic image generator with a pixel art filter slapped on top. The directional rotation feature (upload a concept, get 4- or 8-directional variants) is genuinely useful. The "style consistency" mode lets you upload a reference image to anchor the output style.

For your use case: generate a character at 32x32 (the tool goes up to 320x320 on the $12/mo Tier 1 plan), describe the character clearly — "Black man, medium-dark brown skin, gold bandana, tactical vest, boots, pixel art side-view character" — and use your own photo as a reference image. The output won't look exactly like you, but the proportions, skin color, and silhouette will give you a solid starting frame to refine manually in Aseprite.

Pricing: Free trial (40 fast generations, no credit card). Tier 1 "Pixel Apprentice" is $12/month, drops to $9/month after several consecutive months. Tier 3 "Pixel Architect" is $50/month — skip that unless you're generating hundreds of game assets. One month of Tier 1 is probably all you need for this project.

Verdict: **Use this to get your base sprite.** It genuinely understands pixel art grammar — clean grids, intentional palette reduction, proper edge-pixel behavior. Not slop.

---

**Retro Diffusion (retrodiffusion.ai)**

An AI pixel art model built by an actual pixel artist (Cody Claus / Astropulse), trained primarily on the creator's own work and opt-in contributions — ethically sourced, which matters. Available as a web tool (credit-based) or as a one-time-purchase Aseprite extension ($65 full, $20 Lite).

The model output is some of the most authentically pixel-art-looking AI output available. It handles palette rules, dithering style, and grid alignment better than most. The Aseprite plugin integration is the killer feature: you can generate inside your authoring tool, see results immediately, and iterate fast.

Honest limitation: it explicitly cannot generate multi-pose animations or maintain character consistency across poses. One reviewer said it bluntly — the model doesn't have the consistency to produce the same character in different stances. This means you use Retro Diffusion for the initial base sprite design, then do all animation frames by hand in Aseprite.

Pricing: Aseprite plugin $65 one-time (full), $20 (Lite). Lite is limited in resolution and features. If you buy one, buy the full version.

Verdict: **Best for initial base design iteration inside Aseprite.** Skip if you're price-sensitive; PixelLab's web tool gets you to the same starting point.

---

**PixelMe (pixel-me.tokyo / App Store)**

A photo-to-pixel-art converter. Upload a selfie, get a pixel art version. It's the fastest path from a photo to something that looks roughly like you. The web version is free. The iOS app is ~$5/month for the AI Magic mode (high-quality conversion + Aseprite export).

Honest quality assessment: the output is a faithful pixel-art reduction of your photo, not a *game sprite*. The proportions come from your actual head/face ratio, not from sprite design conventions. At 16x24 pixels you will need to heavily redraw it regardless. PixelMe gives you a color reference and a starting silhouette, but don't expect it to produce a walk-cycle-ready frame. Good for establishing the skin tone palette and face features. Bad for anything that needs stylization or motion poses.

Verdict: **Useful as a palette and color reference. Free web version is sufficient.** Don't pay for it — use the free tier, screenshot the result, use the colors as reference swatches in Aseprite.

---

**Scenario.com**

Scenario is a platform for game studios needing *consistent* AI-generated game assets at scale. Their approach: train a custom LoRA on 5–15 reference images of your character, then generate every animation pose from that trained model. The consistency across 80+ poses is genuinely impressive compared to raw generation.

The problem for your project: overkill for 30 frames. Training takes 30–60 minutes. The platform is designed for teams, not solo portfolio sites. Their pixel art pipeline is powerful, but the complexity-to-payoff ratio is wrong here. You'd spend more time setting it up than just hand-animating your frames in Aseprite.

They do host Retro Diffusion as a model you can use via their platform (listed at scenario.com/models/retro-diffusion-plus), which is one way to access Retro Diffusion without the Aseprite plugin purchase.

Verdict: **Skip for this project.** Come back if you ever need to generate 100+ consistent frames of a character.

---

**Stable Diffusion + pixel art LoRA**

This is the DIY route. The best models as of early 2026 for pixel art sprites on SDXL:
- `nerijs/pixel-art-xl` (Hugging Face) — widely used, genuinely produces real pixel art
- `Pixel Art Diffusion XL - Sprite Shaper` (CivitAI model 277680) — checkpoint fine-tuned specifically for sprites
- Retro Diffusion's own FLUX-based model is also accessible via their API

Running locally requires a GPU with 8GB+ VRAM, setting up ComfyUI or Automatic1111, and spending a day getting the stack working. The output quality ceiling is high but so is the setup cost.

Verdict: **Viable if you already run local SD, otherwise skip.** PixelLab gives you 80% of the result for 5% of the friction.

---

**Hand-pixeling from a photo reference (Aseprite)**

This is the most reliable method for getting actual likeness — and for a 16x24 frame, it's also genuinely fast once you know Aseprite. The workflow: put your photo in a reference window next to Aseprite, zoom in on the face, pick your skin tone colors, and place pixels deliberately. The whole character body at 16x24 is 384 pixels. A skilled pixel artist can rough out a base frame in under an hour.

You don't need to be skilled to do this. At 16x24, you have very few decisions to make per body part. The constraints work for you.

Verdict: **This is the endgame.** Use AI tools to get a starting frame and a palette, then refine pixel-by-pixel in Aseprite. Don't skip the manual pass.

---

## 3. Pixel Art Editor / Authoring

**The recommendation: Aseprite. Full stop.**

The rest of this section explains why you might consider the alternatives and why you should still pick Aseprite.

| Editor | Price | Platform | Animation | Notes |
|--------|-------|----------|-----------|-------|
| **Aseprite** | $19.99 | Win/Mac/Linux | Excellent | Industry standard |
| **Pyxel Edit** | $9 | Win/Mac | Good | Better for tilesets, uses Adobe AIR |
| **GraphicsGale** | Free | Windows only | Decent | Old, not actively developed |
| **Piskel** | Free | Web browser | Basic | Good for proof-of-concept only |
| **Procreate + Pixaki** | $10 / $24.99 | iPad only | Limited | Great for drawing, poor for sprite work |
| **Photoshop** | ~$22/mo | Win/Mac | Possible but painful | Not designed for this; timeline is clunky |

**Why Aseprite specifically:**

- The animation timeline was designed for frame-by-frame sprite animation. It's not a video editor trying to do sprites; it's a sprite tool that does animation.
- Onion-skinning is built-in and fast to toggle — you'll use it on every frame of every walk cycle.
- Sprite sheet export is one dialog. You define the layout (horizontal, vertical, packed), set the frame dimensions, and get a PNG + JSON/XML metadata file. For this project you'd use a simple horizontal strip.
- Layer-based workflow means you can animate limbs on separate layers and composite them — useful for the upper body staying consistent across walk frames.
- The Retro Diffusion plugin requires Aseprite. If you ever want AI generation integrated into your authoring loop, you need it.
- Lua scripting lets you automate frame exports or palette operations if the project grows.
- $19.99 one-time. No subscription.

Pyxel Edit is $9 and genuinely good for tileset work. But it relies on Adobe AIR (an extra runtime you have to install and maintain), receives slower updates, and lacks Aseprite's symmetry tools and scripting. For an animator-first workflow, it's the wrong call.

Procreate is a great drawing app. Pixaki (iPad pixel art app) is polished. Neither gives you the animation control you need for 15+ animation states. Skip both for this project.

---

## 4. Animation — How to Actually Do This

Your sprite has 15 named animation states and roughly 30 frames total. Here's the honest scope: for a non-animator doing this part-time, expect 8–15 hours of actual work to get walk, idle, and a few gesture states looking clean. The rest follows faster once you have those.

### The frame count question

The walk cycle in your current code uses 4 frames. That's playable. For a 16x24 character walking across a page, 4 frames is actually the right call — enough to read as a walk, not so many that each frame becomes a project. Don't animate 8 frames per state unless you have a specific reason.

Quick target table:
- Walk cycle: 4–6 frames
- Idle bob: 2–3 frames
- Idle quirk (yawn, look, sit): 2–4 frames each, one-shot
- Box hide: 3–4 frames (already at 4 in your code, looks good)
- Dash: 2 frames (already there)
- Jump: 3 frames (already there)

The placeholder already has good frame counts. Your job is to replace the pixel content of each frame, not redesign the state machine.

### The reference-tracing workflow

This is the most reliable way to make animation look natural when you have no formal training:

1. Record yourself doing the action on your iPhone. Walk normally in profile view. Stand against a plain wall with even lighting.
2. Import the video into QuickTime or iMovie, find the frames you want (a single walk cycle is typically 4–8 frames of real video), export them as a GIF or image sequence.
3. Open the video frame alongside Aseprite as a reference. You don't trace pixel-for-pixel — you're reading the body positions: where is the weight foot vs. the passing foot, where is the arm swing, what is the torso angle.
4. At 16x24, each limb is 1–2 pixels wide. You're not copying anatomy — you're interpreting the weight distribution into pixel positions.

Slynyrd's "Pixelblog 50 — Human Walk Cycle" (slynyrd.com) goes deep on exactly this process including the video-to-reference GIF workflow. Read it before you start animating.

### Onion-skin in Aseprite

Turn on onion-skin (View menu or shortcut Shift+F1). It shows the previous frame and next frame as ghost overlays. For walk cycles: animate frame 1 (contact pose), then with onion-skin on, do frame 2 (down pose), then frame 3 (passing pose), then frame 4 (up pose). The ghost shows you whether limb movements are consistent.

### Pose library concept

Rather than animating pose-by-pose in sequence, identify your anchor poses first:
- **Contact pose** (foot forward, opposite arm forward) — this is walk-right-0
- **Passing pose** (feet together, arms at sides) — walk-right-2
- **Down pose** and **up pose** fill between

Get the two anchor poses right, then the intermediate frames are mostly interpolation. Same principle applies to idle and jump — do the extreme poses first, then the in-betweens.

### Sprite sheet export from Aseprite

File > Export Sprite Sheet. Set:
- Sheet type: "By Rows" or "Horizontal Strip"
- Frame width: 16, Frame height: 24
- Leave padding at 0 (your runtime doesn't expect padding)
- Output: PNG + JSON Data

The JSON gives you an array of frame names, dimensions, and pixel offsets — useful if you switch to Option B below. For a flat horizontal strip with no gaps, the JSON is optional and you can calculate offsets yourself.

### Skeletal animation (Spine / DragonBones) — brief note

Skip these for this project. Spine ($69–$299) and DragonBones (free) are designed for game engines that can consume their runtime format — Unity, Godot, etc. They're not compatible with your canvas-based renderer without a significant runtime rewrite. The payoff is smooth interpolated animation without needing every frame; the cost is total integration complexity. For 30 frames on a portfolio site, frame-by-frame is the right call.

---

## 5. AI-Assisted Workflows in 2026

The honest state of the space: AI is genuinely useful for getting a starting frame, bad for consistency across animation poses, and completely dependent on the underlying model being trained on actual pixel art rather than downsampled photos.

**What models are actually trained on pixel art:**
- Retro Diffusion's FLUX-based model — trained specifically on real pixel art, opt-in artist contributions. This is the most "correct" output for this purpose.
- PixelLab's Pixflux and Bitforge models — purpose-built for game sprite generation.
- `nerijs/pixel-art-xl` on Hugging Face — open SDXL LoRA trained on real pixel art, widely used.

**What isn't actually pixel art AI:**
- Most "pixel art mode" toggles on generic image generators (Midjourney, DALL-E, etc.) — these produce low-resolution or stylized images that look like pixel art from a distance but have inconsistent grids, anti-aliased edges, and palette bleed. Don't use them.

**The productive AI loop:**

1. Write a tight text prompt: `"16-bit side-view character sprite, Black man, medium-dark brown skin (#7A4E2E), gold bandana, dark olive tactical vest, dark pants and boots, idle standing pose, pixel art, game sprite, transparent background, flat colors, no anti-aliasing"`
2. Add your skin tone hex colors to the prompt — models that support palette hinting will pick them up.
3. Generate 10–20 variants at 32x32, pick the best 2–3 silhouettes.
4. Downscale the winner to 16x24 in Aseprite (Image > Resize with "Nearest Neighbor" algorithm only — never bilinear or bicubic).
5. Manual pass: fix the head, face, hands, feet. These are the parts AI gets wrong most often at small sizes.
6. Lock in the palette (Aseprite's "Color Mode > Indexed" + choose your palette) and use that palette for every subsequent frame.

**PixelLab-specific workflow:**

PixelLab's "style reference" feature is worth using. Generate a base character that reads correctly. Then for each animation pose you need, upload that base character as the style reference and write a pose description: "walking, left foot forward, right arm raised." The consistency isn't perfect — you'll still do manual cleanup — but it cuts your from-scratch drawing time significantly.

**Retro Diffusion in Aseprite:**

Install the extension, open your Aseprite file with your base sprite, select a region (the whole 16x24 canvas or just the face area), and hit generate. The model will inpaint variations. Most useful for: refining face features, testing color variants, and generating prop/accessory alternatives. Not useful for animation poses — the consistency caveat applies here too.

---

## 6. Working With This Project's Format

The current runtime builds a canvas atlas at startup from the character-string arrays in `sprite-frames.js`. There are three paths forward.

### Option A — Edit the character-grid arrays directly

The arrays are already structured for this. Each frame is 16 characters wide by 24 rows. You'd update each frame string in `sprite-frames.js` to match your new sprite design. This is the path of least resistance for early iteration — save the file, reload the browser, see the result immediately.

The tedium: 30 frames × 24 rows = 720 strings to touch. In practice you'd update 5–10 frames, check them in the browser, then continue. It's workable for iteration but painful at scale.

### Option B — Replace the canvas atlas with a real PNG sprite sheet

This is the right final-form approach. Export a sprite sheet from Aseprite (one row of all frames, 16px wide each, 24px tall). Load it at runtime instead of building the atlas from character strings. Here's the refactor scope — roughly 15 lines changed in `pixel.js`:

```javascript
// In pixel.js, replace buildAtlas() with loadAtlas():

const FRAME_NAMES = ['idle-0', 'idle-1', 'walk-right-0', /* ...all keys... */];

function loadAtlas(src, callback) {
  const img = new Image();
  img.onload = function () {
    const frameMap = {};
    FRAME_NAMES.forEach((key, idx) => {
      frameMap[key] = idx * FRAME_W * SCALE; // x offset in screen px
    });
    callback({ img, frameMap });
  };
  img.src = src;
}

// Then replace buildAtlas() call in ensureSprite():
// atlas = buildAtlas();  ← remove this

loadAtlas('pixel/sprite-sheet.png', function (loadedAtlas) {
  atlas = loadedAtlas;
  // ... rest of ensureSprite() init ...
});

// Update setFrame() to use drawImage instead of backgroundPosition:
// This requires switching spriteEl from a <div> to a <canvas>,
// OR keep the <div> approach and use the img as a CSS background-image src.

// Simplest approach — keep the <div>, set background-image to the PNG URL:
spriteEl.style.backgroundImage = `url(pixel/sprite-sheet.png)`;
// setFrame() stays identical — it already uses backgroundPosition offsets.
```

The key point: `setFrame()` doesn't need to change at all if you keep the div/background-image approach. The only changes are (1) load a real PNG instead of building one from character data, and (2) predefine the frame order array (`FRAME_NAMES`) so the offset math works.

Important: the sprite sheet must be exported with frames in the exact same order as `FRAME_NAMES`. Export from Aseprite with "By Rows" and verify the frame order matches. Use `image-rendering: pixelated` on the div (already in pixel.css presumably) to prevent browser interpolation.

You can also remove `sprite-frames.js` entirely once you're on Option B — the PALETTE and FRAMES objects are no longer needed.

### Option C — Hybrid (recommended path)

Start with Option A. Edit the character-string arrays during early iteration — it gives instant browser feedback, no file loading, and lets you test the visual design fast. Once the final sprite is settled (you like the face, the palette, the proportions), switch to Option B: export the sprite sheet PNG from Aseprite and do the small refactor. This keeps your dev loop tight early and lands on the cleaner runtime for production.

**Recommendation: Option B for the final version, Option A to get there.**

---

## 7. Recommended Workflow End-to-End

1. **Take a reference photo.** Stand in profile (side view, facing right) against a plain wall. Good even lighting — no harsh shadows on your face. Take one straight-on face photo too, for color reference. Also record 5 seconds of yourself walking in profile.

2. **Run the face photo through PixelMe (free web tool).** Set the pixel size to 32×32. This gives you a color reference — specifically your skin tone range (highlight, midtone, shadow). Note the hex values. These become your 'S' and related palette entries.

3. **Open PixelLab, generate a base character.** Prompt: "Black man side-view 2D game character sprite, medium-dark brown skin, gold bandana, dark tactical vest, standing idle, pixel art, 32x32, transparent background, clean pixel grid." Upload your side-profile photo as a reference image. Generate 10–20 variants. Pick the one with the best silhouette — most readable head, torso, legs.

4. **Import the winner into Aseprite.** Resize to 16×24 with nearest-neighbor (Image > Resize > Algorithm: Nearest Neighbor). Switch to Indexed color mode, import your palette (create a Aseprite palette from your PixelMe reference colors). The downscaled frame will look rough. That is expected.

5. **Manual refinement pass.** This is the work. Fix the head shape — at 16 wide, the head should be about 5–6px wide, 5–6px tall. Place the eyes (W color, 1px each). Bandana (B color, 2px height at the top of the head). Vest (V color). Pants (P color). Boots (O color). Give yourself 1–2 hours for this first frame. This idle-0 frame is your master reference — every other frame will be a variation of this body.

6. **Animate the walk cycle.** Open the walk-right-0 frame. Enable onion-skin. Draw the contact pose: left leg forward, right leg back, arms swinging opposite. Frame 2 (passing pose): both legs under the body, arms near center. Frame 3: right leg forward, left back (mirror of frame 1 lower body). Frame 4: passing pose again. Record your phone video walk reference and reference it for leg angle and arm position. Use Slynyrd's Pixelblog 50 as a structural guide.

7. **Build out the other states.** Each state reuses the same upper body (torso, head, bandana) — only the legs, arms, and occasionally torso position change per state. Idle bob is just moving the whole body up 1px on frame 1 and down on frame 2. Yawn: open mouth (replace the closed-mouth row with a gap). These are small changes per frame.

8. **Update sprite-frames.js (Option A first).** For each refined frame, convert your Aseprite frame to the 16-character string format. The easiest method: in Aseprite, write a small Lua export script that reads each pixel's palette index and writes the corresponding character. Alternatively, hand-transcribe — at 384 pixels per frame, it takes about 5 minutes per frame once you're in the rhythm.

9. **Test in browser.** Open index.html, enable the pixel companion toggle. Check all states fire correctly. Tune durations in the STATES object in pixel.js if any animations feel off.

10. **When finalized, switch to PNG (Option B).** Export a sprite sheet from Aseprite (File > Export Sprite Sheet, horizontal strip, 16×24 per frame, no padding). Place at `pixel/sprite-sheet.png`. Do the small refactor in pixel.js described in Section 6. Remove sprite-frames.js. Done.

---

## 8. Cost Summary

| Item | Cost | Notes |
|------|------|-------|
| Aseprite | $19.99 | One-time. Buy it first. |
| PixelLab Tier 1 | ~$12 | One month subscription, cancel after. |
| Retro Diffusion (Aseprite plugin, full) | $65 | Optional. Skip if budget-conscious. |
| PixelMe | $0 | Free web version is enough. |
| Scenario.com | $0 | Don't use for this project. |
| Stable Diffusion local | $0–$0 | Skip unless you already have the setup. |

**Minimum viable spend: $19.99** (Aseprite only — use PixelLab's 40-generation free trial for the base sprite).

**Recommended spend: ~$32** (Aseprite + one month PixelLab).

**Full toolkit: ~$97** (add Retro Diffusion plugin for integrated AI iteration).

**Time investment:** 
- Getting a good base sprite and idle/walk frames: 4–8 hours
- All 15 animation states at a polished level: 15–25 hours total
- If you work 2 hours per session: realistically 2–3 weeks of evenings

---

## 9. References and Starter Tutorials

**Animation and technique:**
- [Slynyrd Pixelblog 50 — Human Walk Cycle](https://www.slynyrd.com/blog/2024/5/24/pixelblog-50-human-walk-cycle) — the best single reference for walk cycle animation using video reference tracing. Required reading before you animate the legs.
- [Slynyrd Pixelblog 25 — Motion Cycles](https://www.slynyrd.com/blog/2020/1/23/pixelblog-25-motion-cycles) — broader intro to all animation cycles in pixel art.
- [AdamCYounis on YouTube](https://www.youtube.com/@AdamCYounis) — the best pixel art YouTube channel. His character animation series covers everything from walk cycles to squash-and-stretch at sprite scale.
- [MortMort on YouTube](https://www.youtube.com/@MortMort) — Aseprite beginner content, very approachable.

**Aseprite-specific:**
- [An Aseprite Crash Course in 30 Minutes](https://www.youtube.com/watch?v=59Y6OTzNrhk) — watch this the day you install Aseprite. Gets you functional in one session.
- [Lospec Aseprite Tutorials](https://lospec.com/pixel-art-tutorials/tags/aseprite) — curated written tutorials, searchable by topic.

**Color palettes:**
- [Lospec Palette List](https://lospec.com/palette-list) — hundreds of community-made pixel art palettes. For skin tones specifically, search "skin" on Lospec — there are palettes specifically designed for dark and medium-dark skin tone ranges. Your existing palette (skin #7A4E2E, highlight #B89968 area, shadow near #2A2218) is solid — export it as a Aseprite palette file (.gpl) and use it across all frames for consistency.

**AI tools:**
- [PixelLab](https://www.pixellab.ai/) — start here for AI base generation
- [Retro Diffusion](https://retrodiffusion.ai/) — for the Aseprite plugin
- [PixelMe web](https://pixel-me.tokyo/) — free photo-to-pixel reference tool
- [nerijs/pixel-art-xl on Hugging Face](https://huggingface.co/nerijs/pixel-art-xl) — if you're running local SD

**Community:**
- [r/PixelArt](https://www.reddit.com/r/PixelArt/) — post WIPs, get critique. Pixel art community is genuinely helpful and not elitist about beginners.
- [Lospec community](https://lospec.com/) — the home base for serious pixel artists. Daily palette challenges, feedback threads.
- [Pixel Joint](http://pixeljoint.com/) — curated gallery, high-quality work to study. Good for reference browsing when designing poses.

---

*Last updated: May 2026. AI tool pricing and features change fast — verify on each tool's site before subscribing.*
