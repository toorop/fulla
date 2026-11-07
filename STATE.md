# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Roadmap 2.5 (results like Adobe's) agreed and coded, not committed.** `ps.commit` places only
  the first result: one top-level smart object named after the prompt, the selection as its own
  mask, no group; returns `{ docId, layerId, crop }`. `ps.showVariation(placed, result)` selects
  that layer and runs `placedLayerReplaceContents` (one undo step "Fulla: variation"); a deleted
  layer or closed document gives a plain message. Thumbnails (up to 4 a row) in the run card;
  the chosen one framed by a blue background gap. Fake tests and self-test (`fill`, `variations`
  checks one new layer, swaps, mask kept, content still fitted; `adobeRgb`) updated. 62/62,
  package builds. Self-test 25/26 free scenarios (only `openaiRaw`, no key): the replace keeps
  mask, place and colours. His real 2-variation run: fine; requests already go out in parallel
  (Nano Banana: one per variation via `Promise.allSettled`; Qwen/GPT: one request with n). His
  changes, coded: card head = "model · size · time" (no prompt recap: it is in the box) with a
  Done button on the right (`finishRun`: clears card, thumbnails and prompt; the layer stays).
  `panelRun` now also drives an answered run offline (fake replies readable by every provider):
  2 thumbnails, one layer, click swaps, Done clears. 62/62, package builds, panel scenarios +
  `fill`/`variations` pass. Left: his look, commit (ask).
  Later: Adobe's "generate more" into the same layer.
- Generate tab as of `1bd710d` (agreed with Stéphane on 2026-11-07): prompt box at the top with
  a resize grip (`prefs.promptHeight`), one row under it: model button (provider `badge` OR/G/OA
  + model name, searchable menu), settings button (icons/sliders.svg) opening one popup
  (Resolution only when the model offers sizes, Variations, Quality for OpenAI), Generate.
  Run card and hint under the box. No frames around boxes; buttons are `.obtn` (outline = outer
  background through a 1 px gap, since UXP drops some bottom borders); Providers buttons alike,
  icons only where they tell something. Resolution: Auto (smallest covering size up to 2K) or a
  forced size (`fitSize(..., { exact })`, providers' `resolutions(model)`).
- UXP layout lessons (keep): an element's measured size updates only after the handler returns
  (measure in a `setTimeout`, or keep computed values); flex children shrink unless told not to
  (pages use `flex: 1 1 0`, tabs and sheet rows don't shrink); a div that scrolls itself or whose
  row clips it can lose its bottom border; the native text field draws over any menu.
- Self-test with Stéphane's Google key: never run `geminiRaw` without asking (5 billed images);
  use an `only` list (every free scenario passes, 25/26 with `openaiRaw` failing for lack of key).
- **Tile offset to dig into later** (Stéphane's call; details and captures in his notes): pier
  photo, Nano Banana 2.1 via OpenRouter, a removal came out shifted up-right while the morning's
  one did not; after deleting every layer but the base, the same removal had no offset, so the
  earlier test layers (hidden) seem to matter. Nothing in the pixel path changed since `63384be`.
  Plan: reproduce, save sent/received images (dev only), measure; then fix the cause, or register
  the tile onto the original in the ring around the selection (roadmap step 3).
- **Push**: every commit after `63384be` is local only. Ask Stéphane before
  pushing (he pushes once per session to spare the CI).
- The detailed roadmap with checkboxes lives in Stéphane's notes (not in the repo); tick it as
  sub-steps finish, and record decisions in his ideas note.
- Blocked by: —
- Working setup: Fulla runs from UXP Developer Tools on Photoshop (Beta) 28.0.1 (Load + Watch; a
  manifest change needs Unload + Load). Self-test folder and commands: `CLAUDE.md`; warn Stéphane
  before a run (nobody may touch Photoshop) and run it in the background. Stéphane's OpenRouter key
  is saved in the dev plugin (connected through the panel); no Google/OpenAI keys, so
  `geminiRaw`/`openaiRaw` fail (expected).

## Current step

Step 2 (chat-style prompt box) in progress: 2.1 to 2.4 done (layout, run card, model button,
settings popup); next 2.5 (results like Adobe's). Step 1 left to test some day, not blocking:
sign-up with a fresh OpenRouter account; a real OpenAI key (a Google key works since 2026-11-07).

## Roadmap (order agreed 2026-11-07; details and checkboxes in Stéphane's notes)

1. Onboarding. Done.
2. Chat-style prompt box: model chip (searchable menu built by hand), options chip, Send → Cancel,
   results above the prompt, Adobe-like results and "generation running" feedback, scrolling,
   placeholder bug, "Open an issue" link + issue template.
3. Automatic resolution (rule to agree first), then tone matching (GPT Image 2.6 shifts tones: visible
   border and darker tile on a B&W photo, Nano Banana seamless; fit a correction on the ring around
   the selection where the model had to keep the original), grain matching only if still needed.
4. Full code review.
5. Website before the first public release (presentation + all user docs; GitHub docs suit
   developers only). SEO and GEO worked hard. Domain considered: fulla.photo.
6. First public release.
7. fal.ai provider (real masks), compared on real photos.
8. Local models: check UXP allows `http://127.0.0.1` first; ComfyUI managed by the plugin vs own
   server, decided by research.

Outside the steps: measure direct providers against OpenRouter (Stéphane finds direct often
faster); if confirmed, the docs say OpenRouter is the simplest start and direct gives the best
results.

Each step and sub-step is discussed and validated by Stéphane, and starts only when he says so.

## Recently done

- 2026-11-07 — Roadmap 2.3 and 2.4 + Generate tab rework (`6e26e16`, `20dbb07`, `1bd710d`): model
  button and menu, no custom model IDs, key page button, settings popup with Auto size, prompt on
  top with one button row and a resize grip, lighter look; Cancel/no-selection fixes.
- 2026-11-07 — Roadmap 2.2: run card above the prompt box (provider; "Generating with <model>",
  seconds, looping bar; done: prompt, model · tier · time, run and session cost; errors red),
  idle hint, prompt and pickers locked while running, Generate ↔ Cancel. Cancel now stops any
  further request (retries were billed). Self-test `panelRun` (fake network, free). 60/60, 26/28.
- 2026-11-07 — Roadmap 2.1 (`678ef19`): prompt box pinned at the bottom, scrolling area above
  (Providers scrolls too), hand-built floating menu with search (`src/menu.js`); self-test
  `panelLayout`, 25/27; checked by Stéphane.
- 2026-11-07 — Step 1 (onboarding, roadmap 1.1-1.4: tabs, Providers tab, guided OpenRouter
  connect with headless OAuth PKCE, first-run screens) done; details in the git log and his notes.
- 2026-11-07 — Tone shift seen with GPT Image 2.6 via OpenRouter (B&W pier, boat removed): visible
  border and darker tile; Nano Banana seamless. Tone matching added to roadmap step 3.
- 2026-11-06 — OpenRouter provider (`providers/openrouter.js`): `POST /api/v1/images`, picture +
  mask as `input_references` (no mask parameter exists); catalogue Nano Banana 2.1 (default),
  Nano Banana Pro, Qwen Image 3, Qwen Image 2.1 Pro, GPT Image 2.6 and 2.5 Sunburst; the run's cost
  is OpenRouter's billed `usage.cost`. On a real B&W photo Qwen 3 removed a boat behind posts best.
- 2026-11-06 — Colour fix (`ebd5829`, sRGB profile in results), modes and Expand removed, renamed to Fulla.

## Decisions taken

- After Cancel no new request is sent (2026-11-07): each one may be billed; the one already out
  can't be recalled, its result is dropped.
- Generate tab layout (2026-11-07): prompt box pinned at the bottom (model chip showing the
  model name only, options chip "2K · ×1", a "Generate" button, Adobe's word, that becomes
  "Cancel"); above it a scrolling card for the last run only (prompt, thumbnails when > 1,
  model · resolution · time, run and session cost); while running, an animated bar without
  percent, stage and seconds, prompt and chips locked. No chat history: past runs are layers.
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
- One model menu in the prompt box, listing a curated catalogue of tested models for configured
  providers, plus "custom model ID"; never every model of an aggregator.
- Clean, efficient UI close to everyday AI chat apps, not a form with many selects.
- Colours: read and send sRGB, embed an sRGB profile in results. With policy Off Photoshop drops
  it; handling that (putPixels instead of placing a file) is a bigger change, ask first.
- Develop with UXP Developer Tools; never install with `install.ps1` at the same time.
- Commit as we go, push once at the end of a session (spares the CI).

## Open questions / blockers

- Local models: where would Qwen run, which GPU/VRAM, ComfyUI or not? Only if fal.ai/OpenRouter
  trials call for it.
- Does UXP allow `http://` to a local address? Check before any local provider.
- JPEG/WebP results get no colour profile yet (OpenAI always PNG; Gemini/Qwen via OpenRouter: check
  the `media_type` of real replies).
- GitHub "Forked from" label (optional, Stéphane): leave the fork network or ask Support.
- Minor: `uninstall.ps1` always prints "Fulla", even with another `-Id`.
