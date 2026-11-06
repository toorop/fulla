# Fulla

Photoshop UXP plugin: generative fill with the user's own AI service (OpenAI, Gemini; local models planned). MIT, open source. Maintainer: Stéphane (toorop). Started on 2026-11-06 from OpenFill by Daman Reddy (MIT, github.com/damanjz/openfill); no upstream tracking, the projects have parted. Spec: `docs/spec.md`.

## Working with Stéphane
- Talk to him in French, one question at a time, with a recommendation.
- Ideas and decisions live in his own notes, outside this repo (ask him where if you don't know). Read the ideas note before starting work; record decisions there.
- Ask first: git commit/push, anything on GitHub, releases, installing into Photoshop, anything outside this folder.

## Commands
- `npm test`: all unit tests (Node built-in runner, no dependencies).
- `npm run package`: builds `dist/fulla-<version>.ccx` and `fulla-<version>-windows.zip` (self-test left out). Keep `version` equal in `package.json` and `plugin/manifest.json`.
- `node scripts/icons.js`: regenerates panel icons.

## In-Photoshop self-test (dev builds only; release packages leave out `src/selftest.js`)
- Install the dev build: `installer/install.ps1 -Source plugin` (Stéphane runs it). Open the Fulla panel in Photoshop.
- Write `{}` (or `{"only":["fill"]}`, or `{"live":"openai"}` for one paid real generation) to `%APPDATA%\Adobe\UXP\PluginsStorage\PHSP\<n>\External\io.github.toorop.fulla\PluginData\selftest.json` (`<n>` depends on the Photoshop version; look for the folder).
- Results: `PluginData\selftest\result.json`, `status.txt` and PNG snapshots. Nobody may touch Photoshop while it runs.
- Photoshop on Stéphane's PC: `C:\Program Files\Adobe\Adobe Photoshop 2026` and `Adobe Photoshop (Beta)` (28.0.1, the one he uses).

## Photoshop facts learned the hard way (27.10, 2026-10-12)
- PS.json path must use backslashes: `$localPlugins\External\<id>`.
- UXP `require` does not resolve a folder to `index.js`.
- batchPlay returns `{_obj:"error"}` instead of throwing; errors thrown inside executeAsModal lose their message.
- Imaging reads: scaled reads (`targetSize` smaller than source) come back shifted; selection reads that miss the selection fail with "Invalid Source Bounds". Fulla reads full resolution in strips (max 4 MP each) and scales itself.
- sp-picker locks if its menu is rebuilt while closing: pickers are replaced, never edited (`main.js`).

## Rules
- Zero runtime dependencies. Plugin code is CommonJS and must run in UXP on Photoshop v24 to v28: no `btoa`, `TextEncoder`, `FormData`, canvas or ES modules.
- All Photoshop calls live in `plugin/src/photoshop.js`; `pipeline.js` stays host-free and tested with fakes.
- One file per AI service in `plugin/src/providers/`, same interface as `openai.js`.

## Done means
- `npm test` green, `npm run package` builds, and the in-Photoshop self-test passes.
