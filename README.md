# Fulla

Fulla brings generative fill to Photoshop 2026 (27.11 or newer), powered by your own account with an AI provider (OpenRouter, OpenAI or Google Gemini). It is a UXP plugin that talks to the provider directly: no server, no subscription, and it works without the Creative Cloud app. MIT licensed.

[Releases](../../releases) · [![CI](https://github.com/toorop/fulla/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/toorop/fulla/actions/workflows/ci.yml)

> [!NOTE]
> **Early days.** Fulla started in November 2026 from [OpenFill](https://github.com/damanjz/openfill) by Daman Reddy (MIT) and is moving in its own direction: a simpler panel, automatic resolution, models you configure from the panel, and local models such as Qwen Image. What follows describes the plugin as it is today.

## How it works

1. **Read.** Fulla reads your selection plus some surrounding context, at full resolution. Photoshop isn't changed.
2. **Generate.** It sends that crop and a mask to the provider you picked, using your key. Photoshop stays free to use meanwhile.
3. **Place.** The result is scaled back exactly onto the crop, placed as a smart object and clipped to your exact selection with a soft edge, all in one undo step. If anything fails, the document is left as it was.

Select an area and describe what goes there, or leave the prompt empty to remove what is selected. To extend a picture, enlarge the canvas in Photoshop, select the new area with a little overlap, and fill it. Ask for 1 to 4 variations and click a thumbnail to switch between them. The panel shows the estimated cost of each run.

### Colours

The providers work in sRGB. Fulla sends them your pixels converted to sRGB and embeds an sRGB profile in what comes back, so Photoshop converts the result into your document's profile (Adobe RGB, ProPhoto, Display P3…) and the colours match the surroundings.

This only works if Photoshop keeps embedded profiles. Check **Edit > Color Settings**: under **Color Management Policies**, **RGB** must be **Preserve Embedded Profiles** (or Convert to Working RGB), not **Off**. Presets such as **Monitor Color** turn it off: Photoshop then ignores every embedded profile, and results come back with a slight colour cast. With **Off**, your own photos lose their embedded profile when you open them too.

## Models

| Provider | Models | Get a key |
|---|---|---|
| OpenRouter (one key for every model, recommended) | Nano Banana 2.1 (default), Nano Banana Pro, Qwen Image 3, Qwen Image 2.1 Pro, GPT Image 2.6 and 2.5 Sunburst, or any model ID | [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) |
| OpenAI | GPT Image 2.5 Sunburst (default), GPT Image 2.5 Flare, GPT Image 2, or any model ID | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Google Gemini | Nano Banana 2.1 (default), Nano Banana Pro, Nano Banana 2 Lite, or any model ID | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

You pay the provider directly, per image. Each needs a funded account: OpenRouter needs credits (it shows the exact amount billed for each run), OpenAI needs credits, and Gemini's free tier allows 0 image generations, so billing must be on. OpenAI image models may also need your organization verified. When one of these blocks a run, Fulla names it and links the page that fixes it.

## Install

**With the Creative Cloud app:** download `fulla-<version>.ccx` from [Releases](../../releases) and double-click it.

**Without the Creative Cloud app (Windows):** download `fulla-<version>-windows.zip`, unzip it, close Photoshop and double-click **Install Fulla.bat**. No admin rights needed.

<details>
<summary>What the Windows installer changes</summary>

- Copies the plugin to `%APPDATA%\Adobe\UXP\Plugins\External\io.github.toorop.fulla`.
- Adds one entry to Photoshop's plugin list, `%APPDATA%\Adobe\UXP\PluginsInfo\v1\PS.json`, after saving a backup copy next to it. Other plugins are left untouched.
- **Uninstall Fulla.bat** removes both again.

</details>

Then start Photoshop and open **Plugins > Fulla**, open the **Providers** tab, paste your key and press **Save keys**. Keys stay on your computer, in Photoshop's secure storage.

## Develop

```bash
npm test          # unit tests, no dependencies
npm run package   # builds dist/fulla-<version>.ccx and -windows.zip
```

Load `plugin/manifest.json` in Adobe's UXP Developer Tools (turn on **Watch** to reload on every save), or install a dev copy with `installer/install.ps1 -Source plugin`; not both, they share the plugin id. UXP Developer Tools needs Photoshop's developer mode on (**Preferences > Plugins > Enable Developer Mode**), otherwise Load fails with "Failed to load the devtools plugin". To add a provider, write one file in `plugin/src/providers/` with the same shape as `openai.js` and list it in `providers/index.js`.

<details>
<summary>In-Photoshop self-test</summary>

Dev installs only; release packages leave it out. With the Fulla panel open, write `{}` to `selftest.json` in the plugin's data folder:

```
%APPDATA%\Adobe\UXP\PluginsStorage\<host>\<version>\<kind>\io.github.toorop.fulla\PluginData
```

`<host>` is `PHSP` (or `PHSPBETA` for the Photoshop beta) and `<kind>` is `Developer` when loaded from UXP Developer Tools, `External` when installed. It runs every scenario on throwaway documents with a stand-in AI provider and writes `selftest\result.json` plus PNG snapshots. Don't touch Photoshop while it runs. `{"only":["fill"]}` runs one scenario; `{"live":"openrouter"}` (or `openai`, `gemini`) runs two real, paid generations (a fill and a remove) with your saved key; add `"model":"qwen/qwen-image-3"` to try another model. The colour scenario (`adobeRgb`) fails if Photoshop's RGB colour policy is Off (see [Colours](#colours)).

</details>

```
plugin/
├── manifest.json        # UXP manifest (id io.github.toorop.fulla)
├── index.html, main.js  # the panel
├── styles.css
├── icons/
└── src/
    ├── pipeline.js      # read, generate, place; host-free, tested with fakes
    ├── photoshop.js     # every Photoshop call
    ├── providers/       # one file per provider: openrouter.js, openai.js, gemini.js
    ├── cost.js          # estimated cost from the tokens each reply reports
    ├── image.js, png.js, geometry.js, bytes.js
    ├── icc.js           # sRGB profile embedded in results
    └── selftest.js      # in-Photoshop self-test, left out of release packages
installer/               # Install / Uninstall Fulla.bat and their PowerShell scripts
scripts/package.js       # builds the .ccx and the Windows zip
test/                    # unit tests (Node's built-in runner)
docs/spec.md             # spec and test plan
```

## Limits

- The providers return at most about 4K pixels. Filling most of a large photo means upscaling, which looks softer; the panel tells you when that happens.
- The providers treat the mask as a guide, not a hard edge. Fulla clips their result to your selection.
- Cancel stops Fulla from using a result, but the provider may still bill the request it already received.
- Colours are right only when Photoshop keeps embedded profiles (see [Colours](#colours)). A result that comes back as JPEG or WebP instead of PNG gets no profile yet.
- The Windows installer is Windows only; on macOS use the `.ccx`.

## Contributing

Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Security problems: [SECURITY.md](SECURITY.md).

## Credits and licence

Fulla is built on [OpenFill](https://github.com/damanjz/openfill) by Daman Reddy. [MIT](LICENSE).
