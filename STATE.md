# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- Roadmap sub-step 1.5 (end of step 1): the remaining box is checking the sign-up path with a
  fresh OpenRouter account (Stéphane, private window, other e-mail); the fallback "Open the page
  again" is in the README. Then step 2 (chat-style prompt box), starting with a discussion, once
  Stéphane says to start.
- The detailed roadmap with checkboxes lives in Stéphane's notes (not in the repo); tick it as
  sub-steps finish.
- Blocked by: —
- Working setup: Fulla runs from UXP Developer Tools on Photoshop (Beta) 28.0.1 (Load + Watch; a
  manifest change needs Unload + Load). Self-test folder and commands: `CLAUDE.md`. Stéphane's
  OpenRouter key is saved in the dev plugin; no Google/OpenAI keys (so `geminiRaw`/`openaiRaw` fail).

## Current step

Sub-steps 1.0 to 1.4 done (2026-11-07); Stéphane connected OpenRouter for real through the panel.

## Roadmap (order agreed 2026-11-07; details and checkboxes in Stéphane's notes)

1. Onboarding: 1.0 remove the saved key; 1.1 OpenRouter OAuth return path and trust (discussion,
   then a throwaway UXP feasibility test); 1.2 Generate and Providers tabs, "service" → "provider";
   1.3 Providers tab (state, Remove, Test, Google/OpenAI keys); 1.4 first-run path (Providers opens,
   "Connect with OpenRouter", link naming the alternatives, Generate says "Add a provider to start");
   1.5 self-test, README, Stéphane runs the whole path from zero keys.
2. Chat-style prompt box: model chip (searchable menu built by hand), options chip, Send → Cancel,
   results above the prompt, scrolling, placeholder bug, "Open an issue" link + issue template.
3. Automatic resolution (rule to agree first), then grain matching only if still needed.
4. Full code review.
5. Website before the first public release (presentation + all user docs; GitHub docs suit
   developers only). SEO and GEO worked hard. Domain considered: fulla.photo.
6. First public release.
7. fal.ai provider (real masks), compared on real photos.
8. Local models: check UXP allows `http://127.0.0.1` first; ComfyUI managed by the plugin vs own
   server, decided by research.

Each step and sub-step is discussed and validated by Stéphane, and starts only when he says so.

## Recently done

- 2026-11-07 — Roadmap 1.4: first run. No key → Providers opens on a welcome screen ("Connect with
  OpenRouter", Google/OpenAI rows under "Already have a key?"); Generate shows "Connect a provider
  to start". Guided OpenRouter connect (`connect.js`, `sha256.js`): headless OAuth PKCE, session
  reused 9 min, waits out a new key's 401s, then checks the balance and offers "Add credits". The
  provider picked in Generate follows the saved keys. Manifest `launchProcess` (https). README
  "First run". 58/58 tests, self-test 24/26; real connect by Stéphane worked first time.

- 2026-11-07 — Roadmap 1.3: Providers tab, one row per provider (state as text, Test/Remove or Add
  a key; regular-weight action buttons; Spectrum dividers, the only lines that follow the theme).
  The key form is built on Add and removed on close (a hidden element kept its height in UXP) and
  has no placeholder. `checkKey` per provider (one free GET, no retry): a refused key is not
  saved, offline saves with a warning. OpenRouter answers 401 "User not found." for a wrong key and
  for a brand-new one, so its message covers both. Remove also clears an old localStorage copy.
  53/53 tests, self-test 24/26 (`geminiRaw`/`openaiRaw` need keys).

- 2026-11-07 — Roadmap 1.2: Generate and Providers tabs (plain underlined labels, UXP has no tab
  widget; current content moved, not redesigned); Generate without a key opens Providers;
  "service" → "provider" in 18 files, stale texts fixed (bug template modes, OpenRouter missing in
  `SECURITY.md`). Self-test `panelTabs`; `panelPickers` now restores OpenRouter. 51/51 tests,
  self-test 23/25 on Photoshop Beta 28 (`geminiRaw`/`openaiRaw` need keys).
- 2026-11-07 — Target narrowed to current Photoshop + beta: manifest `minVersion` 24.4.0 → 27.11.0,
  `ensureSupported` message, `CLAUDE.md`, `CONTRIBUTING.md`, README, spec. 51/51 tests, package
  builds. Stéphane checked the panel still loads in UXP Developer Tools (`5b39a69`).
- 2026-11-07 — Roadmap 1.1: OpenRouter **headless** OAuth PKCE tested end to end, outside the
  plugin (Node) and in UXP (console snippet on Photoshop Beta 28.0.1): `crypto.getRandomValues`
  exists, a pure-JS SHA-256 gives a challenge OpenRouter accepts, `shell.openExternal` opens the
  browser (needs `launchProcess` https; Photoshop asks the user first), the code exchange returns
  the key. Findings for 1.4: Photoshop's consent dialog went behind its window (launched from the
  DevTools console; recheck from a panel button) and shows only the URL's end, so the developer
  text must name openrouter.ai; a new key answers 401 "User not found." for 1 to 33 s, so poll
  `GET /api/v1/key` and word that 401 as "still activating"; keep the same verifier for 10 min when
  the page is reopened (a code from an earlier attempt gives 403); OpenRouter's page says
  "terminal". The `launchProcess` permission was removed again after the test.
- 2026-11-07 — Detailed roadmap with checkboxes written in Stéphane's notes, plus a reference note on
  local models (not the current work). Found: the panel cannot remove a saved key ("Save keys"
  skips empty fields, `main.js`); fixed by the Providers tab's Remove button in roadmap 1.3.
  Also: UXP masks the placeholder of password fields, so each key field shows a different number
  of dots and "Saved (...xxxx)" was never readable. Roadmap 1.3: same dots everywhere, state shown
  as readable text beside the field (Stéphane's request).
- 2026-11-06 — OpenRouter provider (`providers/openrouter.js`): `POST /api/v1/images`, picture +
  mask as `input_references` (no mask parameter exists), catalogue Nano Banana 2.1 (default,
  recommended), Nano Banana Pro, Qwen Image 3, Qwen Image 2.1 Pro, GPT Image 2.6 and 2.5 Sunburst;
  the run's cost is OpenRouter's billed `usage.cost`. First in the provider list and default.
  Paid trials (synthetic doc, 1K): Nano Banana and GPT Image 2.6 clean; Qwen 3 fill ignored the
  surroundings there, but on a real B&W photo Qwen 3 removed a boat behind posts perfectly (best of
  all per Stéphane). The billed `usd` in the live report is not yet seen on a real reply.
- 2026-11-06 — Colour fix (`ebd5829`): result PNGs get an embedded sRGB ICC profile (`icc.js`,
  `png.tagSrgb`), so Photoshop converts them into the document's profile. Self-test `adobeRgb`.
  Needs Photoshop's RGB colour policy to keep embedded profiles (README "Colours").
- 2026-11-06 — Modes and Expand removed (`1350c2d`): one prompt, empty = remove what is selected.
- 2026-11-06 — Development moved to UXP Developer Tools; the `install.ps1` copy was uninstalled.
- 2026-11-06 — Renamed OpenFill to Fulla (`db4ce3d`), new logo and icons, CI on `toorop/fulla`.

## Decisions taken

- First run (roadmap 1.4): at launch, no provider configured → open Providers with an explanation,
  "Create an OpenRouter key" (recommended), "Add a Google key", "Add an OpenAI key"; the Generate
  tab stays clickable and explains ("Connect a provider to start" + button), not greyed out (a
  greyed tab gives no reason). A saved key switches to Generate; removing the last key goes back.
- Stay as close as possible to Photoshop's built-in Generative Fill (2026-11-07), e.g. one
  variation → one layer, no group; several → thumbnails in the panel, click to try, validate to
  create the layer (roadmap step 2). Show clearly that a generation is running.
- Only current Photoshop and the beta matter (2026-11-07): with the subscription everyone can
  update. Manifest `minVersion` 27.11.0 (Photoshop 2026 on Stéphane's PC); raise it as releases come.
- OpenRouter connect uses headless OAuth PKCE (S256): nothing hosted by us, the user only sees
  openrouter.ai and pastes a code that is useless without the plugin's verifier (trust).
- Own project, not a fork to upstream; OpenFill's MIT copyright line stays in `LICENSE`.
- No modes and no Expand: to extend, enlarge the canvas in Photoshop and fill the new area.
- Vocabulary: a provider is who gets the request and bills; a model is what generates.
- First run is the adoption make-or-break (most users have no AI account): OpenRouter put forward
  (one account, every model, card payment, OAuth connect), Google and OpenAI keys offered from day
  one to power users, fal.ai later, no questionnaire. One account per provider type in v1.
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
