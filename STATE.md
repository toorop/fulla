# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- Start Plan step 3 (panel redesign) with its first piece: **automatic resolution**. Pick the
  smallest tier where the tile needs no upscaling (`computeCrop` softness ≤ 1), capped by what the
  model supports; show it as "Auto · 2K · ≈ $0.04", user can override. Reason: on a real B&W photo
  (Qwen, 1K) the pasted tile was softer than the photo and the feathered edge showed a texture
  border; a tile at native detail should remove it. Agree the exact rule with Stéphane first, then
  code + tests + self-test.
- Then the rest of step 3 (see Plan), designing each piece with Stéphane before coding.
- Blocked by: —
- Working setup: Fulla runs from UXP Developer Tools on Photoshop (Beta) 28.0.1 (Load + Watch; a
  manifest change needs Unload + Load). Self-test folder and commands: `CLAUDE.md`. Stéphane's
  OpenRouter key is saved in the dev plugin; no Google/OpenAI keys (so `geminiRaw`/`openaiRaw` fail).

## Current step

Nothing in progress. Session of 2026-11-06 ended with everything committed and pushed.

## Plan (revised 2026-11-06; design each piece with Stéphane before coding)

1. Base: rename to Fulla, merge the cost estimate. Done.
2. Remove the modes and Expand. Done (`1350c2d`). Colour fix done (`ebd5829`).
3. Panel redesign in the style of AI chat apps:
   - automatic resolution (Next action);
   - Generate and Providers tabs; "Service" becomes "provider" everywhere;
   - first-run onboarding: no provider → Providers tab opens; big "Connect with OpenRouter" button
     (OAuth PKCE headless: the user copies a code, no key to create or paste) with a plain
     explanation and the price per image; a link naming the alternatives ("I already have a Google
     or OpenAI key, fal.ai and others later"); Generate shows "add a provider" instead of a dead form;
   - prompt box with a model chip (one searchable menu, grouped by provider, "model · provider",
     Nano Banana 2.1 marked recommended; UXP has no such control: build it, check early that a
     popover fits inside the panel) and an options chip ("Auto 2K · ×1": resolution, variations,
     quality when the model has one); send button that turns into Cancel;
   - results and cost above the prompt; panel scrolls; prompt placeholder bug;
   - "Another model or provider? Open an issue" link to a new `model-request.yml` issue template
     (`launchProcess` https permission in the manifest).
   Mock-ups were proposed in the session, not formally agreed.
4. OpenRouter provider. Done (this session), see Recently done. Next for it: OAuth connect (step 3).
5. fal.ai provider (real masks) and/or local Qwen Image, decided after more real-photo trials.

Also pending: a full code review (security, bugs, useful refactors); possible grain matching for
the pasted tile (after automatic resolution); GPT Image 2.6 `markup` (mask-like overlay) to try.

## Recently done

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
- Local folder is still named `openfill`; Stéphane renames it to `fulla` later.
- Minor: `uninstall.ps1` always prints "Fulla", even with another `-Id`.
