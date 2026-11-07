# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Roadmap 2.3 (model chip) coded, not committed.** `#modelChip` in the prompt box opens the
  floating menu built by `modelMenuItems` (`src/menu.js`): providers with a key, registry order,
  ✓ on the model in use, Enter picks the first match. Catalogue labels lost their "(...)"; a
  `note` field carries "Recommended" (Nano Banana 2.1 via OpenRouter) or "Fast". Old Provider /
  Model pickers, custom model row, `CUSTOM` and `prefs.customModel` removed (a saved custom ID
  falls back to the default). Self-test: `panelPickers` drives the chip; `panelLayout` uses a
  40-item list through the `openMenu` hook. 61/61, package builds, self-test 26/28 (only
  `geminiRaw`/`openaiRaw`). Stéphane checked it (works); he is adding a Google key to see a
  model offered by two providers. Careful: with a working Google key, a full self-test's
  `geminiRaw` sends 5 real 1K generations (billed): run with `only` lists, or ask first.
  Checked by him with OpenRouter + Google keys: fine. Left: commit (ask). Then (agreed 2026-11-07): in the Providers tab's
  "Add a key" form, a button that opens the provider's key page (`keyHelp`; today plain text).
- Roadmap 2.2 done and committed (`c133b51`).
- Remaining step 2 sub-steps, in order: options chip; results like Adobe's (open
  point: Adobe creates the layer at once and a thumbnail click swaps its content, no "validate";
  recommended); prompt placeholder bug + wording and `prompts.js` (must cover add, modify, e.g. a
  face's expression, remove, and with no prompt fill an empty area); "Open an issue" link +
  `model-request.yml`. Principle: look at how Adobe's Generative Fill does it first.
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

Step 1 (onboarding) done on 2026-11-07. Left to test some day, not blocking: sign-up with a fresh
OpenRouter account (does OpenRouter return to the Authorize page? fallback "Open the page again"
is in the README); adding real Google and OpenAI keys in the panel.

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

- 2026-11-07 — Roadmap 2.2: run card above the prompt box (provider; "Generating with <model>",
  seconds, looping bar; done: prompt, model · tier · time, run and session cost; errors red),
  idle hint, prompt and pickers locked while running, Generate ↔ Cancel. Cancel now stops any
  further request (retries were billed). Self-test `panelRun` (fake network, free). 60/60, 26/28.
- 2026-11-07 — Roadmap 2.1 (`678ef19`): prompt box pinned at the bottom, scrolling area above
  (Providers scrolls too), hand-built floating menu with search (`src/menu.js`); self-test
  `panelLayout`, 25/27; checked by Stéphane.
- 2026-11-07 — Step 2 overall mock-up of the Generate tab agreed (details in Stéphane's notes).
- 2026-11-07 — Roadmap 1.4 (`4d6963a`): first run. No key → Providers opens on a welcome screen
  ("Connect with OpenRouter", Google/OpenAI rows under "Already have a key?"); Generate shows
  "Connect a provider to start". Guided OpenRouter connect (`connect.js`, `sha256.js`): headless
  OAuth PKCE, session reused 9 min, waits out a new key's 401s, then checks the balance and offers
  "Add credits". The provider picked in Generate follows the saved keys. Manifest `launchProcess`
  (https). README "First run". 58/58 tests, self-test 24/26; Stéphane's real connect worked.
- 2026-11-07 — Roadmap 1.3 (`01da23f`): Providers tab, one row per provider (state as text,
  Test/Remove or Add a key; regular-weight action buttons; Spectrum dividers, the only lines that
  follow the theme). The key form is built on Add and removed on close (a hidden element kept its
  height in UXP) and has no placeholder (UXP masks it, its length showed). `checkKey` per provider
  (one free GET, no retry): a refused key is not saved, offline saves with a warning. OpenRouter
  answers 401 "User not found." for a wrong key and a brand-new one alike. Remove also clears an
  old localStorage copy.
- 2026-11-07 — Roadmap 1.2 (`41881e4`): Generate and Providers tabs (underlined labels, UXP has no
  tab widget); "service" → "provider" in 18 files; self-test `panelTabs`.
- 2026-11-07 — Target narrowed to current Photoshop + beta (`5b39a69`): manifest `minVersion`
  27.11.0, docs and `CLAUDE.md` aligned.
- 2026-11-07 — Roadmap 1.1: OpenRouter headless OAuth PKCE tested outside the plugin and in UXP.
  Learned: Photoshop's consent dialog for opening the browser shows only the URL's end (our text
  names openrouter.ai) and went behind its window when launched from the DevTools console (fine
  from a panel button); a new key answers 401 for 1 to 33 s; a code from an earlier attempt gives
  403; OpenRouter's page says "terminal".
- 2026-11-07 — Tone shift seen with GPT Image 2.6 via OpenRouter (B&W pier, boat removed): visible
  border and darker tile; Nano Banana seamless. Tone matching added to roadmap step 3.
- 2026-11-06 — OpenRouter provider (`providers/openrouter.js`): `POST /api/v1/images`, picture +
  mask as `input_references` (no mask parameter exists); catalogue Nano Banana 2.1 (default),
  Nano Banana Pro, Qwen Image 3, Qwen Image 2.1 Pro, GPT Image 2.6 and 2.5 Sunburst; the run's cost
  is OpenRouter's billed `usage.cost`. On a real B&W photo Qwen 3 removed a boat behind posts best.
- 2026-11-06 — Colour fix (`ebd5829`): result PNGs get an embedded sRGB ICC profile. Needs
  Photoshop's RGB colour policy to keep embedded profiles (README "Colours").
- 2026-11-06 — Modes and Expand removed (`1350c2d`); renamed OpenFill to Fulla (`db4ce3d`).

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
