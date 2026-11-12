# Fulla

Fulla brings generative fill to Photoshop 2026 (27.11 or newer), powered by your own account with an AI provider (OpenRouter, OpenAI or Google). It is a UXP plugin that talks to the provider directly: no server, no subscription, and it works without the Creative Cloud app. MIT licensed.

[Releases](../../releases) · [![CI](https://github.com/toorop/fulla/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/toorop/fulla/actions/workflows/ci.yml)

> [!WARNING]
> **Work in progress, not ready for use yet.** Fulla is under active development and has had no public release. Building it from this repository gives you an unfinished plugin that may change or break from one day to the next. Please wait for the first release; it will be announced on [fulla.dppst.com](https://fulla.dppst.com) and in [Releases](../../releases).

> [!NOTE]
> **Early days.** Fulla started in November 2026 from [OpenFill](https://github.com/damanjz/openfill) by Daman Reddy (MIT) and is moving in its own direction: a simpler panel, automatic resolution, and models you configure from the panel. What follows describes the plugin as it is today.

## How it works

1. **Read.** Fulla reads your selection plus some surrounding context, at full resolution. Photoshop isn't changed.
2. **Generate.** It sends that crop and a mask to the provider you picked, using your key, plus the whole photo, reduced, when the crop is a small part of it, so the model can judge scale and light. Photoshop stays free to use meanwhile.
3. **Place.** The result is scaled back exactly onto the crop, placed as a smart object and clipped to your exact selection with a soft edge, all in one undo step. Models often shift the colours of what they return; Fulla compares the result with your photo around the selection and, when needed, adds a **Curves** smart filter that brings the tones back (hide it or adjust it like any filter). If anything fails, the document is left as it was.

## Using Fulla

Open **Plugins > Fulla**. The **Generate** tab works like Photoshop's own Generative Fill:

1. **Select** an area in your image.
2. **Describe** in the box at the top what to add or change there ("a small boat tied to the pier", "make her smile"). Leave it empty to remove what is selected, or to fill an empty area from its surroundings. Drag the grip under the box to make it taller.
3. **Pick a model** with the button under the box. It shows the provider (OR for OpenRouter, G for Google, OA for OpenAI) and the model, and opens a searchable list of the models of every provider you connected. Nano Banana 2.1 is the recommended one.
4. **Settings**, if you need them: the sliders button opens a popup with what the current model lets you choose. **Resolution**: Auto (about twice the selection's size, which looks as sharp as your photo: 1K for a small selection, 2K, and more for a large one so the result is never stretched; up to 4K, 2K for OpenAI models) or a size of your choice; **Variations**: 1 to 4; **Quality**, for OpenAI models. A setting the model doesn't offer isn't shown.
5. Click **Generate**. A card under the box shows the run with a moving bar and the seconds; Photoshop stays free to use, and the button turns into **Cancel**.

Each run makes one layer, named after your prompt and masked by your selection. With several variations, thumbnails appear in the card: click one to put it in the layer (one undo step). The card also shows the model, size and time, and the cost of the run and of the session (since the panel was opened). Click **Done** once you have chosen: the card, thumbnails and prompt are cleared, the layer stays.

To extend a picture, enlarge the canvas in Photoshop, select the new area with a little overlap, and generate with an empty prompt.

The **≡** menu at the top right of the panel opens this documentation, a bug report, a request for a model or provider, and the version (About Fulla).

### Colours

The providers work in sRGB. Fulla sends them your pixels converted to sRGB and embeds an sRGB profile in what comes back, so Photoshop converts the result into your document's profile (Adobe RGB, ProPhoto, Display P3…) and the colours match the surroundings.

This only works if Photoshop keeps embedded profiles. Check **Edit > Color Settings**: under **Color Management Policies**, **RGB** must be **Preserve Embedded Profiles** (or Convert to Working RGB), not **Off**. Presets such as **Monitor Color** turn it off: Photoshop then ignores every embedded profile, and results come back with a slight colour cast. With **Off**, your own photos lose their embedded profile when you open them too.

## Models

| Provider | Models | Get a key |
|---|---|---|
| OpenRouter (one account for every model, recommended) | Nano Banana 2.1 (default), Nano Banana Pro, Qwen Image 3, Qwen Image 2.1 Pro, GPT Image 2.6 and 2.5 Sunburst | No key to create: **Connect with OpenRouter** in the panel |
| OpenAI | GPT Image 2.5 Sunburst (default), GPT Image 2.5 Flare, GPT Image 2 | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Google (Gemini API) | Nano Banana 2.1 (default), Nano Banana Pro, Nano Banana 2 Lite | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

For OpenAI and Google, **Add a key** in the Providers tab has a button that opens the page where the key is created. Fulla offers a tested catalogue of models; to ask for another one, use **Request a model or provider** in the panel's menu (≡, top right), which also links this documentation and a bug report.

You pay the provider directly, per image. Each needs a funded account: OpenRouter needs credits (it shows the exact amount billed for each run), OpenAI needs credits, and Gemini's free tier allows 0 image generations, so billing must be on. OpenAI image models may also need your organization verified. When one of these blocks a run, Fulla names it and links the page that fixes it.

## Install

**With the Creative Cloud app (Windows and macOS):** download `fulla-<version>.ccx` from [Releases](../../releases) and double-click it.

**Without the Creative Cloud app (Windows):** download `fulla-<version>-windows.zip`, unzip it, close Photoshop and double-click **Install Fulla.bat**. No admin rights needed.

<details>
<summary>What the Windows installer changes</summary>

- Copies the plugin to `%APPDATA%\Adobe\UXP\Plugins\External\io.github.toorop.fulla`.
- Adds one entry to Photoshop's plugin list, `%APPDATA%\Adobe\UXP\PluginsInfo\v1\PS.json`, after saving a backup copy next to it. Other plugins are left untouched.
- **Uninstall Fulla.bat** removes both again.

</details>

## First run

Start Photoshop and open **Plugins > Fulla**. With no provider yet, the panel opens on its **Providers** tab:

- **Connect with OpenRouter** (recommended): Photoshop asks for permission to open openrouter.ai: click **Allow** (the browser window may open behind Photoshop). On openrouter.ai, sign in or create an account; you can set a spending limit and an expiry for the key there. Click **Authorize**, then paste the code it shows into the panel. OpenRouter's page says "terminal": it means the panel. A new account needs credits before its first image; the panel says so and links the page. If, after creating your OpenRouter account, you don't land on the page with the **Authorize** button, go back to the panel and click **Open the page again**: you are signed in by then, so it goes straight there.
- **Already have a key?** Add a Google (Gemini API) or OpenAI key. Fulla checks it with a free request before saving it.

Keys stay on your computer, in Photoshop's secure storage, and go only to their provider. **Test** checks a saved key again; **Remove** deletes it.

**Is connecting safe?** Fulla hosts nothing: you only deal with openrouter.ai. It uses OAuth with PKCE: Fulla makes up a secret that never leaves your computer, and the code OpenRouter shows you is useless without it. OpenRouter hands the key straight to the panel. The code is in `plugin/src/connect.js`.

## Develop

```bash
npm test          # unit tests, no dependencies
npm run package   # builds dist/fulla-<version>.ccx and -windows.zip
```

Load `plugin/manifest.json` in Adobe's UXP Developer Tools (turn on **Watch** to reload on every save), or install a dev copy with `installer/install.ps1 -Source plugin`; not both, they share the plugin id. UXP Developer Tools needs Photoshop's developer mode on (**Preferences > Plugins > Enable Developer Mode**), otherwise Load fails with "Failed to load the devtools plugin". To add a provider, write one file in `plugin/src/providers/` with the same shape as `openai.js` and list it in `providers/index.js`.

### Release

1. Set the same `version` in `package.json` and `plugin/manifest.json`.
2. Add a `## X.Y.Z` section, written for users, at the top of the website's Changelog page (`site/src/content/docs/docs/changelog.md`). It becomes the release notes; links such as `/docs/...` are turned into links to the website.
3. Commit and push, then push the tag:
   ```bash
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```
4. `.github/workflows/release.yml` runs the whole CI, checks that the tag matches both versions and that the Changelog section exists, builds the `.ccx` and the Windows zip, adds `SHA256SUMS.txt`, and creates a **draft** release. Nothing is public yet.
5. On GitHub, read the draft, tick **Set as a pre-release** if wanted, and click **Publish release**.

If a step fails, no release is created. Fix the cause, move the tag (`git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`, then step 3 again), or re-run the workflow if nothing needed fixing in the repository.

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
    ├── prompts.js       # the instruction sent to the model, with or without a prompt
    ├── settings.js      # keys (secure storage) and panel settings
    ├── menu.js, help.js # search in the floating menus; the ≡ menu's links
    ├── providers/       # one file per provider: openrouter.js, openai.js, gemini.js
    ├── connect.js       # OpenRouter connect (OAuth PKCE, headless), with sha256.js
    ├── cost.js          # estimated cost from the tokens each reply reports
    ├── image.js, png.js, geometry.js, bytes.js
    ├── icc.js           # sRGB profile embedded in results
    └── selftest.js      # in-Photoshop self-test, left out of release packages
installer/               # Install / Uninstall Fulla.bat and their PowerShell scripts
scripts/package.js       # builds the .ccx and the Windows zip
scripts/release-notes.js # release.yml: checks the tag, takes the notes from the Changelog page
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
