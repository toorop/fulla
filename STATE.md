# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Resume here: step 3, 3.3 (whole photo as a scene reference) done, kept always on (his call,
  2026-11-08), not committed yet**: free self-test 29/29 passed; next, commit 3.3 + the paste fix
  (ask), then push the session's commits (ask).
  Grain matching is out of scope for the public release (random grain, too complex). Left in
  step 3: the tile offset (reproduce first), the B&W boat check, and maybe the clipped-addition
  prompt line below.
- 3.1 Auto resolution: smallest tier covering the crop on both sides, never below 2K (his call
  after a 1K/2K test: generated pixels hold less detail than camera pixels, ~2x oversampling is as
  sharp as the photo and needs less tone correction), up to 4K (`provider.autoMax || "4K"`;
  OpenAI direct 2K). Uploaded crop capped at 2048 px (`inputSize`; larger is a research item).
  Done is hidden for a single variation. Committed `3b7c47a`, `1c25833`.
- **3.3 scene reference (2026-11-08)**: when the area sent covers < 50 % of the photo, the
  pipeline reads the whole photo at 1024 px (`read`, `sceneRef` option, `main.js` always passes
  true) and providers send it as one more image (OpenRouter 3rd `input_references`, Gemini 3rd
  `inline_data`, OpenAI 2nd `images` entry; `prompts.sceneNote` names it). Guard: a reply whose
  aspect differs from the target by > 15 % (log) is dropped; none left = "wrong shape" error.
  His A/B (pier, then a 4K beach with a man as scale, "add a person", 2 with, 2 without): no
  measurable effect, the model's own randomness (~20 % in size) dominates; slight edge on the
  pier. Kept: nearly free, never seen to hurt. README Generate step says it. 69/69, package.
- Clipped additions (beach test): the model put the person at the top edge of the area and the
  layer mask cut the head; models don't keep strictly inside the mask. Ideas: a prompt line
  "anything added fits wholly inside the white area" (paid A/B), a docs tip to select generously.
- Paste bug (his report, 2026-11-08): a pasted prompt left the placeholder drawn over it. Fixed in
  `main.js` (`bindPromptHint`: placeholder removed while there is text, restored when empty; also
  after Done); check added to self-test `panelLayout` (passed); he should confirm by pasting a
  prompt.
- 3.2 tone matching (`src/tone.js`, `c2a05b3`): per-channel gain + offset fitted in a ring around
  the selection; none when negligible, without a ring, or when the ring is not the same picture.
  Applied by `photoshop.js` as a Curves smart filter after the mask (select the RGB channel first;
  `layerID` reads ignore the mask), refitted per variation. His real try: "just perfect".
- Prompts: naming the photo's style in the prompt ("keep the film grain") made things far worse;
  our wrapper's wording made no clear difference (A/B, reverted). Tip for docs and waiting tips:
  describe the change, not the photo's style.
- Ideas from a paid competitor plugin (prompt history and library, reference images, rerun
  keeping results, 16/32-bit, a Photoshop-like progress window) are in his notes, for later.
- A note listing what sets Fulla apart from Photoshop's Generative Fill (resolution, cost, BYOK,
  free, models, local) lives in his notes, for the website step.
- Step 2 leftovers: panel captures moved to step 6 (website), his call; his full walk-through
  not done yet.
- Generate tab as of `1bd710d`: prompt box with resize grip, then model button (badge + name,
  searchable menu), settings popup (Resolution, Variations, Quality), Generate; run card and hint
  below. Buttons are `.obtn` (outline through a 1 px gap: UXP drops some bottom borders).
- UXP layout lessons (keep): an element's measured size updates only after the handler returns
  (measure in a `setTimeout`, or keep computed values); flex children shrink unless told not to
  (pages use `flex: 1 1 0`, tabs and sheet rows don't shrink); a div that scrolls itself or whose
  row clips it can lose its bottom border; the native text field draws over any menu.
- Self-test with Stéphane's Google key: never run `geminiRaw` without asking (5 billed images);
  use an `only` list of the free scenarios (29/29 on 2026-11-08, `openaiRaw` left out: no key).
- **Tile offset to dig into later** (details in his notes): a removal on the pier came out shifted
  up-right only while earlier (hidden) test layers existed. Plan: reproduce, save sent/received
  images (dev only), measure; fix the cause or register the tile in the ring (roadmap step 3).
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

Step 3 (resolution, tones, grain): 3.1 Auto resolution, 3.2 global tone matching and 3.3 scene
reference done (2026-11-08). Left: the tile offset, the B&W boat check (border gone?); grain is
out of the public release. Step 1 left to test some day, not blocking: sign-up with a fresh
OpenRouter account; a real OpenAI key.

## Roadmap (order agreed 2026-11-07, revised that evening; details and checkboxes in Stéphane's notes)

1. Onboarding. Done.
2. Prompt box. Done (README done; panel captures moved to step 6; his walk-through not done).
3. Automatic resolution, tone matching (global), whole image as a scene reference (all done);
   the tile offset seen with earlier test layers present; grain later (not in the public release).
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

- 2026-11-08 — Scene reference kept always on (3.3) and pasted-prompt placeholder fix (not
  committed yet).
- 2026-11-08 — README "Using Fulla" (`7059fce`); Auto resolution up to 4K (`3b7c47a`); tone
  matching with a Curves smart filter (`c2a05b3`). Panel captures moved to the website step.
- 2026-11-07 — Steps 1 and 2 (onboarding, prompt box, model button, settings popup, one layer
  per run, help menu): details in the git log and his notes.

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
- Whole photo as a scene reference, always on, no setting (2026-11-08): nearly free, never seen
  to hurt; A/B showed no measurable effect (model randomness dominates).
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
