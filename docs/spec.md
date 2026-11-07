# Fulla: spec

Fulla started on 2026-11-06 from OpenFill v0.1.0 by Daman Reddy (MIT). This spec is inherited from OpenFill; sections change as Fulla diverges.

Date: 2026-10-12. Status: v0.1.0 beta. Verified in Photoshop 27.10 by the in-Photoshop self-test (23 scenarios); a paid end-to-end generation is still pending.

## Goal
Free, open-source (MIT) Photoshop plugin: generative fill (a prompt paints the selection, an empty prompt removes what is selected) and variations, using the user's own OpenAI or Google Gemini API key. No server, no Creative Cloud app required.

## Decisions inherited from Fulla (2026-10-12)
| Topic | Decision |
|---|---|
| Audience | Public, open source, MIT |
| Models | OpenAI GPT Image and Google Gemini (Nano Banana) only |
| v1 features | Fill, Remove, Expand, Variations (1-4). Fulla (2026-11-06): one prompt, no modes; Expand dropped (enlarge the canvas in Photoshop, then fill) |
| Billing | Bring your own key; no backend |
| Photoshop | The current release and the beta only (27.11+ on 2026-11-07), one build. With the subscription everyone can update, so older versions are not supported |
| Install | .ccx for Creative Cloud users; `-windows.zip` with Install Fulla.bat (per-user `%APPDATA%\Adobe\UXP`, PS.json merged and backed up) for installs without the Creative Cloud app |
| Store | GitHub releases |

## How a generation works
Three phases, so Photoshop is never locked during the network call:
1. **Read** (short modal scope, no document change): selection bounds; crop = selection + 35% context, at least 512px a side, grown to the model's output aspect, clamped to the document; composite pixels and selection at upload size (long edge max 2048), read at full resolution in strips of at most 4 MP and shrunk in JS (Photoshop's own scaled reads come back shifted); a full-resolution copy of the selection.
2. **Generate** (no modal scope): image + mask (grown about 1% so the model can blend) to the provider. With a prompt the model paints it in the selection; with an empty prompt it removes what is selected and rebuilds the background (`prompts.js`). Cancel discards the result.
3. **Commit** (one modal scope, one undo step, rolled back on error): deselect, place the first result as a smart object fitted to the crop and named after the prompt, restore the exact selection (Imaging `putSelection`), make it the layer's mask, feather. No group. A click on another variation replaces the smart object's content (one undo step), like Adobe's Generative Fill.

## Providers
| | OpenAI | Gemini |
|---|---|---|
| Endpoint | `POST /v1/images/edits` (JSON body) | `POST /v1beta/models/{model}:generateContent` |
| Default model | `gpt-image-2.5-sunburst` | `gemini-nano-banana-2.1` |
| Mask | PNG alpha mask, transparent = edit | Second image, white = edit (a hint only) |
| Output size | Any WxH, multiples of 16, ratio 1:3-3:1, capped by the Resolution setting | 14 fixed ratios x 1K/2K/4K via `imageConfig` |
| Variations | `n` in one call | Parallel calls |
| Custom model ID | Yes | Yes |

Neither provider follows the mask pixel-exactly, so the Photoshop layer mask does the final clipping.

## Code map
| File | Job |
|---|---|
| `plugin/manifest.json` | UXP manifest v5, host PS min 27.11.0, network domains |
| `plugin/main.js` | Panel UI and wiring |
| `plugin/src/pipeline.js` | One generation end to end (host-independent) |
| `plugin/src/photoshop.js` | All Photoshop calls (imaging API, batchPlay, DOM) |
| `plugin/src/providers/*.js` | One file per AI provider, same interface |
| `plugin/src/geometry.js` | Crop maths |
| `plugin/src/png.js`, `image.js`, `bytes.js` | PNG encoder, resize/mask helpers, base64 |
| `plugin/src/settings.js` | Keys in UXP secure storage, prefs in localStorage |
| `plugin/src/connect.js`, `sha256.js` | OpenRouter connect: OAuth PKCE in headless mode (no callback, nothing hosted) |
| `plugin/src/selftest.js` | In-Photoshop self-test (dev only, left out of releases) |
| `scripts/package.js` | Builds `dist/fulla-<ver>.ccx` and `-windows.zip` |
| `installer/` | Manual install without Creative Cloud |
| `test/` | Node tests (`npm test`), fake Photoshop and fake APIs |

## Known limits
- The providers return at most about 4K. Filling a large part of a big image is upscaled and looks softer; the panel says so.
- Cancel cannot recall a request already sent; the provider may still bill it.
- Colour: pixels are read and sent as sRGB; result PNGs get an embedded sRGB profile so Photoshop converts them into the document's profile. Photoshop discards that profile when its RGB colour policy is Off, and JPEG/WebP results are not tagged yet.
- Manual installer is Windows only; macOS users use the .ccx.
- Verified live against both APIs: requests reach them and their error replies are mapped (Gemini accepts `imageConfig`; `responseFormat.image` wants enum values). Not yet verified: a paid image coming back.

## Test plan
- `npm test` (49 tests): geometry, PNG encoder (checked against zlib), base64, strip downsampling, provider requests and error mapping (with real captured error bodies), pipeline and Photoshop layer with fakes, require paths.
- In-Photoshop self-test (dev only): fill, variations + switching, ellipse, remove, corner, select-all, 24 MP photo, transparent area, 300 ppi, 16-bit, odd output sizes, Adobe RGB document colours, rollback, cancel, no selection, panel pickers, live network checks. 23/23 on Photoshop 27.10 before the Expand scenarios were removed (21 now).
- Still to do: a paid generation per provider.
