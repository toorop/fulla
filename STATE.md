# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- Start step 2, the panel redesign, with its first piece: remove the Fill / Remove / Expand modes.
  One prompt field; an empty prompt means "erase and blend" (today's Remove / empty Fill). Delete
  Expand and all its code: `readExpand`, `borderBounds` (`pipeline.js`), `planExpand`
  (`geometry.js`), `borderMask` (`image.js`), the `"expand"` path of `commit` (`photoshop.js`),
  the expand prefs (`settings.js`), panel controls (`index.html`, `main.js`), and their tests and
  self-test scenarios. Then `prompts.js` needs one task text for "with prompt" and one for "empty".
- Blocked by: —

## Current step

Nothing in progress. Step 1 (base) is done apart from the GitHub items under open questions.

## Plan

1. Base: rename to Fulla, merge the cost estimate. Done.
2. Panel redesign: no modes (above); Generate and Settings tabs (API keys move to Settings); automatic
   resolution picked from the selection size, shown as "Auto · 2K · ≈ $0.04", user can override;
   panel scrolls when smaller than its content; fix the prompt placeholder that sometimes stays
   visible while typing.
3. Models configurable from the Settings tab: provider type, server address, model ID, key, price.
   Providers (one per API protocol) stay code in `plugin/src/providers/`.
4. Local provider for Qwen Image 2.1, then its own features: subject extraction as RGBA turned into
   a selection or layer mask, reference images (up to 10).

Also pending: a full code review (security, bugs, useful refactors).

## Recently done

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
