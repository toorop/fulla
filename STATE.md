# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Resume here: step 3, 3.1 and 3.2 (global tone matching) done and committed** (`3b7c47a`,
  `c2a05b3`, not pushed; push once at the end of the session, ask). Next: propose the next step-3
  sub-step (discuss first, one at a time, no code before he says): whole image as a scene
  reference, grain matching (now a real need for grainy photos), the tile offset (reproduce first).
- 3.1 Auto resolution: smallest tier covering the crop on both sides (never enlarged), up to 4K
  (`provider.autoMax || "4K"`; OpenAI direct 2K, above is experimental there); nothing shown before
  the run. Uploaded crop stays capped at 2048 px (`inputSize`): sending it larger is a research
  item. Real test (26 MP film-look portrait, Nano Banana 2.1): 4K is sharper but too clean (grain
  lost), $0.121 vs $0.058 at 2K.
- 3.2 tone matching (`src/tone.js`): per-channel gain + offset fitted in the ring around the
  selection (128 px grid, 3x3 blur, ring 4 % away, robust least squares, gain 0.8-1.25, offset
  ±60); none under 3 levels, none without a ring, none when the corrected ring still differs
  (median > 10 levels: not the same picture). Applied by `photoshop.js` as a Curves smart filter
  after the mask (reads with `layerID` ignore the mask but include smart filters; select the RGB
  channel first, the mask is the target); `showVariation` deletes Fulla's Curves and refits. B&W
  included. His real try: "just perfect". Kept as a separate filter (variations need the smart
  object; the user can hide, adjust or mask it). Sand slightly lighter: midtone point or local
  correction only if more cases show it.
- Prompts: naming the photo's style in the prompt ("keep the film grain") made things far worse;
  our wrapper's wording made no clear difference (A/B, reverted). Tip for docs and waiting tips:
  describe the change, not the photo's style.
- Whole image as a scene reference (models taking several images): Stéphane wants it tested
  (roadmap step 3). Ideas from a paid competitor plugin (prompt history and library, reference
  images, rerun keeping results, 16/32-bit, a Photoshop-like progress window) are in his notes,
  to discuss later.
- A note listing what sets Fulla apart from Photoshop's Generative Fill (resolution, cost, BYOK,
  free, models, local) lives in his notes, for the website step.
- Step 2 leftovers: panel captures moved to step 6 (website), his call; his full walk-through
  not done yet.
- Generate tab as of `1bd710d` (agreed with Stéphane on 2026-11-07): prompt box at the top with
  a resize grip (`prefs.promptHeight`), one row under it: model button (provider `badge` OR/G/OA
  + model name, searchable menu), settings button (icons/sliders.svg) opening one popup
  (Resolution only when the model offers sizes, Variations, Quality for OpenAI), Generate.
  Run card and hint under the box. No frames around boxes; buttons are `.obtn` (outline = outer
  background through a 1 px gap, since UXP drops some bottom borders); Providers buttons alike,
  icons only where they tell something. Resolution: Auto (see 3.1 above) or a
  forced size (`fitSize(..., { exact })`, providers' `resolutions(model)`).
- UXP layout lessons (keep): an element's measured size updates only after the handler returns
  (measure in a `setTimeout`, or keep computed values); flex children shrink unless told not to
  (pages use `flex: 1 1 0`, tabs and sheet rows don't shrink); a div that scrolls itself or whose
  row clips it can lose its bottom border; the native text field draws over any menu.
- Self-test with Stéphane's Google key: never run `geminiRaw` without asking (5 billed images);
  use an `only` list of the free scenarios (29/29 on 2026-11-08, `openaiRaw` left out: no key).
- **Tile offset to dig into later** (Stéphane's call; details and captures in his notes): pier
  photo, Nano Banana 2.1 via OpenRouter, a removal came out shifted up-right while the morning's
  one did not; after deleting every layer but the base, the same removal had no offset, so the
  earlier test layers (hidden) seem to matter. Nothing in the pixel path changed since `63384be`.
  Plan: reproduce, save sent/received images (dev only), measure; then fix the cause, or register
  the tile onto the original in the ring around the selection (roadmap step 3).
- **Push**: everything up to the end of 2026-11-07 is pushed (he pushes once per session to
  spare the CI; ask before pushing).
- The detailed roadmap with checkboxes lives in Stéphane's notes (not in the repo); tick it as
  sub-steps finish, and record decisions in his ideas note.
- Blocked by: —
- Working setup: Fulla runs from UXP Developer Tools on Photoshop (Beta) 28.0.1 (Load + Watch; a
  manifest change needs Unload + Load). Self-test folder and commands: `CLAUDE.md`; warn Stéphane
  before a run (nobody may touch Photoshop) and run it in the background. Stéphane's OpenRouter key
  is saved in the dev plugin (connected through the panel); no Google/OpenAI keys, so
  `geminiRaw`/`openaiRaw` fail (expected).

## Current step

Step 3 (resolution, tones, grain): 3.1 Auto resolution and 3.2 global tone matching done
(2026-11-08). Left in step 3: whole image as a scene reference, grain matching, the tile offset;
the B&W boat check (border gone?). Step 1 left to test some day, not blocking: sign-up with a
fresh OpenRouter account; a real OpenAI key.

## Roadmap (order agreed 2026-11-07, revised that evening; details and checkboxes in Stéphane's notes)

1. Onboarding. Done.
2. Prompt box. Done (README done; panel captures moved to step 6; his walk-through not done).
3. Automatic resolution (done), tone matching (global, done), grain matching, whole image as a
   scene reference, the tile offset seen with earlier test layers present.
4. Full code review.
5. Local models, **before the website and the public release** (his decision, 2026-11-07): with
   cost, privacy (nothing leaves the computer) is the big argument against Photoshop for many
   photographers. First check UXP allows `http://127.0.0.1`; ComfyUI managed by the plugin vs own
   server, decided by research.
6. Website (presentation + all user docs; SEO and GEO). Domain considered: fulla.photo.
7. First public release.
8. fal.ai provider (real masks), compared on real photos.

Outside the steps: measure direct providers against OpenRouter (Stéphane finds direct often
faster); if confirmed, the docs say OpenRouter is the simplest start and direct gives the best
results.

Each step and sub-step is discussed and validated by Stéphane, and starts only when he says so.

## Recently done

- 2026-11-08 — README "Using Fulla" (`7059fce`); Auto resolution up to 4K (`3b7c47a`); tone
  matching with a Curves smart filter (`c2a05b3`). Panel captures moved to the website step.
- 2026-11-07 — Roadmap 2.5 (`54f1c90`): one layer per run, thumbnails swap it, Done clears.
  Prompt wording (`16d37cc`): Photoshop's placeholder; add/change/remove/fill prompts. Help in the
  panel's ≡ menu (`1cf4bcf`, UXP needs a `show` hook), model-request template, 310 px minimum.
- 2026-11-07 — Roadmap 2.3 and 2.4 + Generate tab rework (`6e26e16`, `20dbb07`, `1bd710d`): model
  button and menu, no custom model IDs, key page button, settings popup with Auto size, prompt on
  top with one button row and a resize grip, lighter look; Cancel/no-selection fixes.
- 2026-11-07 — Steps 1 and 2.1-2.4 (onboarding, prompt box, run card, model button, settings
  popup): details in the git log and his notes.

## Decisions taken

- After Cancel no new request is sent (2026-11-07): each one may be billed; the one already out
  can't be recalled, its result is dropped.
- Stay as close as possible to Photoshop's built-in Generative Fill (2026-11-07), e.g. one
  variation → one layer, no group; several → thumbnails in the panel, click to try, validate to
  create the layer (roadmap step 2). Show clearly that a generation is running.
- First run: no provider → Providers opens with an explanation, "Connect with OpenRouter"
  (recommended), Google/OpenAI rows; the Generate tab stays clickable and explains (a greyed tab
  gives no reason). The first saved key switches to Generate; removing the last key goes back.
- OpenRouter connect uses headless OAuth PKCE (S256): nothing hosted by us, the user only sees
  openrouter.ai and pastes a code that is useless without the plugin's verifier (trust).
- A key is checked with a free request before it is saved; Remove then Add replaces a key.
- Only current Photoshop and the beta matter (2026-11-07): with the subscription everyone can
  update. Manifest `minVersion` 27.11.0; raise it as releases come.
- A website carries the user docs before the first public release (2026-11-07).
- Own project, not a fork to upstream; OpenFill's MIT copyright line stays in `LICENSE`.
- No modes and no Expand: to extend, enlarge the canvas in Photoshop and fill the new area.
- Vocabulary: a provider is who gets the request and bills; a model is what generates.
- First run is the adoption make-or-break (most users have no AI account): OpenRouter put forward,
  Google and OpenAI keys offered from day one to power users, fal.ai later. One account per
  provider type in v1.
- One model menu, a curated catalogue of tested models for configured providers; no custom model
  IDs (2026-11-07); never every model of an aggregator.
- Clean, efficient UI close to everyday AI chat apps, not a form with many selects.
- Colours: read and send sRGB, embed an sRGB profile in results. With policy Off Photoshop drops
  it; handling that (putPixels instead of placing a file) is a bigger change, ask first.
- Develop with UXP Developer Tools; never install with `install.ps1` at the same time.
- Commit as we go, push once at the end of a session (spares the CI).
- Tone matching as a separate Curves smart filter, not merged (2026-11-08): variations swap the
  smart object's content; the user can hide, adjust or mask it. No filter when not needed.

## Open questions / blockers

- Local models: where would Qwen run, which GPU/VRAM, ComfyUI or not? Only if fal.ai/OpenRouter
  trials call for it.
- Does UXP allow `http://` to a local address? Check before any local provider.
- JPEG/WebP results get no colour profile yet (OpenAI always PNG; Gemini/Qwen via OpenRouter: check
  the `media_type` of real replies).
- GitHub "Forked from" label (optional, Stéphane): leave the fork network or ask Support.
- Minor: `uninstall.ps1` always prints "Fulla", even with another `-Id`.
