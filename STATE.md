# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- Step 2 (modes and Expand removed) is done: `npm test` green (48), package builds, self-test 20/22
  on Photoshop Beta 28.0.1 (the 2 failures need API keys, none saved on purpose). Not committed:
  ask Stéphane.
- Then: colour-profile check. Fulla reads pixels converted to sRGB, but the result PNG carries no
  profile: in a non-sRGB document (Adobe RGB, or a monitor profile), Photoshop may place it as if it
  were in the document's space, shifting colours. Stéphane has seen a slight red/orange cast on
  black-and-white images. Add a self-test scenario with an Adobe RGB document, then fix (e.g. embed
  an sRGB profile in the PNG, or convert on placement).
- Blocked by: —
- Then: finish agreeing the panel design with Stéphane (Plan step 3; model menu and catalogue
  agreed; still open: the Providers tab and the rest of the Generate tab). He keeps the API keys
  out on purpose, to test the first-run flow.

## Current step

Step 2, removing the modes: done, awaiting commit. The self-test now assigns sRGB to its test
documents (they took the user's working RGB, so pure colours shifted on read and 12 scenarios failed).

## Plan (revised 2026-11-06, design still being agreed with Stéphane: code nothing before)

1. Base: rename to Fulla, merge the cost estimate. Done.
2. Remove the modes and Expand. Done (uncommitted). Then the colour-profile check (Next action).
3. Panel redesign in the style of AI chat apps: Generate and Providers tabs; first-run onboarding
   (no provider configured → open Providers, explain, add one with a key test; Generate shows
   "add a provider" instead of a dead form); one model menu inside the prompt box, grouped by
   provider, with a search field (UXP has no such control: build it); automatic resolution
   ("Auto · 2K · ≈ $0.04", overridable); panel scrolls; prompt placeholder bug. "Service" becomes
   "provider" everywhere. Absorbs the old "models configurable" step.
4. OpenRouter provider, to try Qwen Image and others cheaply. Check first: which image models it
   has, and whether its API takes a separate mask. fal.ai later.
5. Local Qwen Image only if the OpenRouter trial is convincing (RGBA subject extraction, reference
   images).

Also pending: a full code review (security, bugs, useful refactors).

## Recently done

- 2026-11-06 — Fulla loaded in UXP Developer Tools (Photoshop Beta 28); `CLAUDE.md` now gives the
  UDT workflow and the self-test folder (`PHSPBETA\28\Developer\…`).

- 2026-11-06 — Modes and Expand removed (uncommitted): `pipeline.js` has one `read`, `taskFor(prompt)`
  and `layerName(prompt)`; `planExpand`, `borderMask`, `borderBounds` and the expand commit path
  are gone; spec and README updated.

- 2026-11-06 — Development now goes through UXP Developer Tools (developer mode was already on):
  the `install.ps1` copy of Fulla was uninstalled so only the UDT-loaded one runs.

- 2026-11-06 — OpenFill uninstalled from Photoshop; Fulla dev build installed (`install.ps1 -Source
  plugin`, from `5465a2b`). Not opened in Photoshop yet. Minor: `uninstall.ps1` always prints
  "Fulla" in its messages, even with another `-Id`.
- 2026-11-06 — CI runs on `toorop/fulla` (green on `34bb16c`) after Stéphane unlocked Actions.
- 2026-11-06 — New logo (`docs/brand/logo.png`, 1024 px original) and icons redrawn from it in
  `scripts/icons.js`: dashed marquee filling up like a glass, plus a sparkle.
- 2026-11-06 — `CLAUDE.md`: tests rule (regression-oriented, lean) and this `STATE.md`.
- 2026-11-06 — CI enabled through the API; GitHub description updated; `main` pushed.
- 2026-11-06 — GitHub repo renamed `toorop/fulla`; `upstream` remote removed.
- 2026-11-06 — Renamed OpenFill to Fulla (`db4ce3d`), cost estimate merged into `main` (`138b9c4`).

## Decisions taken

- Own project, not a fork to upstream: the changes are too deep for pull requests to OpenFill.
  OpenFill's MIT copyright line stays in `LICENSE`; the README credits it.
- Name Fulla (Norse goddess of plenty; sounds like "fill"). Plugin id `io.github.toorop.fulla`, so
  it can sit next to OpenFill in Photoshop; storage keys `fulla.*` (keys must be entered again).
- Keep the OpenFill code and history, no rewrite: clean layering, tested, and full of hard-won
  Photoshop workarounds.
- No modes and no Expand: to extend a picture, the user enlarges the canvas in Photoshop, selects
  the new area plus a margin, and fills. This already works.
- Vocabulary: a provider is who gets the request and bills (OpenAI, Google, OpenRouter, fal.ai,
  local server); a model is what generates. One model can come from several providers.
- One model menu (entries "model · provider"), searchable, in the prompt box, like AI chat apps;
  Stéphane wants a clean, efficient UI, not a form with many selects.
- The menu lists a catalogue of models Fulla knows and has tested (how to call them, price, what
  they can do), only for configured providers, plus "custom model ID" on a known provider. Not every
  model: fal.ai models each have their own API, and few OpenRouter models can edit images.
- A "Want another model or provider? Open an issue" link to a dedicated GitHub issue template
  (`model-request.yml`); opening a browser needs the `launchProcess` https permission.
- Develop with UXP Developer Tools (Load + Watch, no Photoshop restart); `install.ps1` is for
  release-like installs only, never both at once (same plugin id).
- Models are data (Settings tab), API protocols are code. Each provider declares what it can do,
  and the panel shows only what the chosen model supports.

## Open questions / blockers

- Local models: where does Qwen Image run (same PC in dual boot, Windows, WSL, another machine)?
  Which GPU and how much VRAM? ComfyUI or another server? Decides step 4's design.
- Does UXP allow `http://` to a local address, and a user-chosen address in the manifest? To
  check before step 3.
- GitHub (Stéphane): "Forked from" label, optional: leave the fork network in Settings, or ask
  GitHub Support to detach.
- New icons not yet seen inside Photoshop (panel tab and plugin list): check at the next install.
- Local folder is still named `openfill`; Stéphane renames it to `fulla` later.
