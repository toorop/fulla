# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- Roadmap sub-step 1.2 (Generate and Providers tabs), once Stéphane says to start: **discuss**
  the mock-up first (what goes where, what tabs look like in UXP on current Photoshop and the
  beta). No code before he agrees.
- The detailed roadmap with checkboxes lives in Stéphane's notes (not in the repo); tick it as
  sub-steps finish.
- Blocked by: —
- Working setup: Fulla runs from UXP Developer Tools on Photoshop (Beta) 28.0.1 (Load + Watch; a
  manifest change needs Unload + Load). Self-test folder and commands: `CLAUDE.md`. Stéphane's
  OpenRouter key is saved in the dev plugin; no Google/OpenAI keys (so `geminiRaw`/`openaiRaw` fail).

## Current step

Sub-steps 1.0 and 1.1 done (2026-11-07). Nothing coded in Fulla yet; the working tree only has
STATE.md changes. Waiting for Stéphane to start 1.2.

## Roadmap (order agreed 2026-11-07; details and checkboxes in Stéphane's notes)

1. Onboarding: 1.0 remove the saved key; 1.1 OpenRouter OAuth return path and trust (discussion,
   then a throwaway UXP feasibility test); 1.2 Generate and Providers tabs, "service" → "provider";
   1.3 Providers tab (state, Remove, Test, Google/OpenAI keys); 1.4 first-run path (Providers opens,
   "Connect with OpenRouter", link naming the alternatives, Generate says "Add a provider to start");
   1.5 self-test, README, Stéphane runs the whole path from zero keys.
2. Chat-style prompt box: model chip (searchable menu built by hand), options chip, Send → Cancel,
   results above the prompt, scrolling, placeholder bug, "Open an issue" link + issue template.
3. Automatic resolution (rule to agree first), then grain matching only if still needed.
4. Full code review, then a first public release.
5. fal.ai provider (real masks), compared on real photos.
6. Local models: check UXP allows `http://127.0.0.1` first; ComfyUI managed by the plugin vs own
   server, decided by research.

Each step and sub-step is discussed and validated by Stéphane, and starts only when he says so.

## Recently done

- 2026-11-07 — Target narrowed to current Photoshop + beta: manifest `minVersion` 24.4.0 → 27.11.0,
  `ensureSupported` message, `CLAUDE.md`, `CONTRIBUTING.md`, README, spec. 51/51 tests, package
  builds. Not yet checked: the plugin still loads in UXP Developer Tools (Unload + Load).
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
