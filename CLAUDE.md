# Fulla

Photoshop UXP plugin: generative fill with the user's own AI provider (OpenRouter, OpenAI, Gemini; local models on hold since 2026-11-08). MIT, open source. Maintainer: Stéphane (toorop). Started on 2026-11-06 from OpenFill by Daman Reddy (MIT, github.com/damanjz/openfill); no upstream tracking, the projects have parted. Spec: `docs/spec.md`.

## Working with Stéphane
- Start every session by reading `STATE.md` and resume from its `## Next action`.
- Talk to him in French, one question at a time, with a recommendation. Repository files stay in English.
- Ideas and decisions live in his own notes, outside this repo (ask him where if you don't know). Read the ideas note before starting work; record decisions there.
- Ask first: git commit/push, anything on GitHub, releases, installing into Photoshop, anything outside this folder.

## Commands
- `npm test`: all unit tests (Node built-in runner, no dependencies).
- `npm run package`: builds `dist/fulla-<version>.ccx` and `fulla-<version>-windows.zip` (self-test left out). Keep `version` equal in `package.json` and `plugin/manifest.json`.
- Release: set `version` in both files, add a `## X.Y.Z` section to the site's Changelog page (`site/src/content/docs/docs/changelog.md`), commit, push a `vX.Y.Z` tag. `.github/workflows/release.yml` runs the CI, checks the tag (`scripts/release-notes.js`), builds, and creates a **draft** release with the files, `SHA256SUMS.txt` and that section as notes; Stéphane publishes it by hand.
- `node scripts/icons.js`: regenerates panel icons.
- Website (`site/`, Astro + Starlight, own `package.json`): `cd site && npm run dev` serves it at http://localhost:4321, `npm run build` builds `site/dist`. Home and marketing pages in `site/src/pages`, docs in `site/src/content/docs/docs/`; every docs page also exists as Markdown (`/docs/<page>.md`), with `llms.txt` and `llms-full.txt`.

## In-Photoshop self-test (dev builds only; release packages leave out `src/selftest.js`)
- Development runs through UXP Developer Tools: Stéphane loads `plugin/manifest.json` (Load, then Watch to reload on save). Photoshop's own developer mode (Preferences > Plugins) must be on, or Load fails with "Failed to load the devtools plugin". Never install with `installer/install.ps1` at the same time (same plugin id).
- Write `{}` (or `{"only":["fill"]}`, or `{"live":"openai"}` for one paid real generation) to `%APPDATA%\Adobe\UXP\PluginsStorage\<host>\<n>\Developer\io.github.toorop.fulla\PluginData\selftest.json`. Photoshop Beta 28 is `PHSPBETA\28`; release builds use `PHSP\<n>`, and `External` instead of `Developer` when installed with `install.ps1`. Look for the folder.
- Results: `PluginData\selftest\result.json`, `status.txt` and PNG snapshots. Nobody may touch Photoshop while it runs.
- Photoshop on Stéphane's PC: `C:\Program Files\Adobe\Adobe Photoshop 2026` and `Adobe Photoshop (Beta)` (28.0.1, the one he uses).

## Photoshop facts learned the hard way (27.10, 2026-10-12)
- PS.json path must use backslashes: `$localPlugins\External\<id>`.
- UXP `require` does not resolve a folder to `index.js`.
- batchPlay returns `{_obj:"error"}` instead of throwing; errors thrown inside executeAsModal lose their message.
- Imaging reads: scaled reads (`targetSize` smaller than source) come back shifted; selection reads that miss the selection fail with "Invalid Source Bounds". Fulla reads full resolution in strips (max 4 MP each) and scales itself.
- Network to the local machine (28.0.1, 2026-11-08): only `http://localhost` (no port) in `network.domains` works, for any port, IPv4 or IPv6 server; `127.0.0.1` is refused with or without port ("Manifest entry not found"). A fetch to a port where nothing listens hangs: use a timeout.
- sp-picker locks if its menu is rebuilt while closing: pickers are replaced, never edited (`main.js`).
- Placed results shrink with Photoshop's Image Interpolation preference (`layer.scale`). A layer's pixel reads go through its user mask once the mask holds soft values (switch `userMaskEnabled` off to read the whole layer). Photoshop's mask feather also fades the canvas edge. The greyscale composite channel is `gray`.
- A batchPlay `set` with a layer's name and blend mode set the name only (28.0.1): set the mode through the DOM (`layer.blendMode`).
- UXP layout: measured sizes update after the handler returns (use `setTimeout`); flex children shrink unless told not to; a self-scrolling div can lose its bottom border; the native text field draws over any menu; a hidden element can leave pixels behind until a repaint.

## Rules
- Zero runtime dependencies. Plugin code is CommonJS for UXP. Target: the current Photoshop release and the beta only (manifest `minVersion`, 27.11 as of 2026-11-07; with the subscription everyone can update, so no work for older versions). Keep avoiding `btoa`, `TextEncoder`, `FormData`, canvas and ES modules until checked in UXP.
- All Photoshop calls live in `plugin/src/photoshop.js`; `pipeline.js` stays host-free and tested with fakes.
- One file per AI provider in `plugin/src/providers/`, same interface as `openai.js`.

## Tests
- Every feature or fix ships with its tests, in the same change.
- Their main job is to catch regressions when the code changes later, more than to prove the feature works once. Test what other code or the user relies on (inputs and outputs, error messages, the Photoshop calls seen through the fakes), not internals that a refactor may change.
- Keep the suite lean: one test per behaviour, not per function; no test that only restates the code; merge or delete tests a change made redundant. The whole suite stays fast (under a few seconds).
- Photoshop behaviour the fakes can't reproduce gets a self-test scenario in `plugin/src/selftest.js` instead.

## STATE.md
- `STATE.md` (repo root) is the hand-off, not a log: a new session must be able to resume from its first ~60 lines alone. Sections in this order: `## Next action` (always first), `## Current step`, `## Recently done` (dated one-liners), `## Decisions taken` (one line of rationale each), `## Open questions / blockers`. Under ~150 lines; older history goes to the git log.
- Update it after every significant action, not only at the end of a task (a crash or power cut must not lose the thread), and never end a response without updating it if anything changed.
- No private paths or personal data in it: the repo is public.

## Done means
- Tests written, `npm test` green, `npm run package` builds, the in-Photoshop self-test passes, and `STATE.md` is up to date.
