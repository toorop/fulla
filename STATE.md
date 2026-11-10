# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Resume here (2026-11-10, afternoon): Auto rule changed, not committed.** Auto now asks at
  least about twice the area: 1K when 1K covers twice the area (up to ~512 px), else at least 2K
  as before (`pipeline.js` floor, panel hint, README, sizes test). npm test 87/87, package built,
  free self-test 32/32. Ask him before committing. Then his call: the luminance
  seam under added objects, or step 6 (website: tech and hosting, content, SEO and GEO). Later:
  bigger reference thumbnails (his note). Paid tests today: 1.58 $ + 0.53 $.
- **Grainy result, settled 2026-11-10**: his hand Generate (mug, 2K) showed a fine hatch in the
  blurred wood. His 2K export: the grain is in the model's reply; Photoshop's bicubic shrink
  (`layer.scale` in `placeFitted`, Image Interpolation preference) makes it ~2x more visible
  than an area average. His call: get a better image from the model rather than fix it after.
  Paid A/B (Google direct, his prompt, 3 runs each, 0.53 $): 2K as today / `resolution: "1K"` /
  `upload: "target"` (area upscaled by Fulla before sending). Grain in none of the 9 (high-pass
  residual 0.5-0.8 vs 10.6 for the hand draw): a one-off of that draw, not the upscale. Gemini
  returns nearly the same image for the same request (2K and 1K arms send the same area: same
  composition each run). 1K looks as good for this 271 px area, 25 % cheaper (0.048 vs
  0.063 $); `upload: "target"` brings nothing. Wood under the mug often redrawn sharper, all
  arms (seam topic). Black border again, once (Gemini). Results in his test photos folder.
  **His call: Auto = at least ~2x the area** (the 2K floor of 2026-11-08 was for oversampling),
  so 1K for areas up to ~512 px; done the same day (above).
  Unused lead, free: a softer interpolation in `layer.scale` (check UXP has the option).
- Docs tips found on 2026-11-10 (his calls: none in the built-in text): ask to respect the depth
  of field when the area is blurred; ask to respect the lighting (much better shadows).
- Paid tests of 2026-11-10 (Google direct, his call: more credits there; `abInput` with
  `provider: "gemini"`, model `gemini-nano-banana-2.1`, 2K, 3 runs; results kept for the website
  in his test photos folder; detail and docs tips in his ideas note, section 8): face swap from a
  three-quarter portrait 3/3; a passerby removed with a reference shot from another angle brings
  back the real tiled heron 2/3, a plausible invented one without it (`refs: false`); a mug from
  a reference faithful but overflowing the small selection 3/3, fixed by dropping the 512 px
  minimum area side (`350a857`, fits 2/3, 3/3 with a hand cut-out: no "Object" option, his
  call); Qwen Image 3 redraws the area's background (visible square), one black border, slow,
  one 504: not for references. No tile offset with the hidden references group. Not checked: a
  removal on a tiny selection now that the minimum is gone.
- **Luminance seam** (his hand Generate, 2026-11-10): colours fine (the Curves filter is slight),
  but the wood the model redrew under the mug is darker and stops at the selection's edges; a
  global Curves can't fix it. Leads (his ideas note): docs tip (room for the shadow), wider mask
  feather, a local low-frequency correction near the edges. Tone matching runs (layer differs
  from the raw reply in 8 of 9 runs), skipped by design when the ring is redrawn or bordered.
- Self-test `abInput`: an arm with `refs: false` leaves the references out; `minSide` is a
  pipeline option for A/B tests (default none). Runs report `refs` (numbers sent).
- Pushed on 2026-11-10 up to `f9d435c` (CI green); this STATE update comes after it (ask before
  committing). He pushes once per session, at the end (spares the CI; ask first). Hand check
  of Details on an error: later (his call).
- Reference images as built (`2d2416d`): `references.js`; `photoshop.js` `listReferences` /
  `addReference` / `removeReference` / `readReference` (embedded smart objects in a hidden
  "Fulla references" group; transparency sent on mid grey); providers' `maxReferences(model)`,
  `req.refs`; `prompts.js` `refsNote`; panel `refsChip` and popup (`main.js` polls the document
  every 1.5 s); manifest `localFileSystem: "request"`. Self-tests `references`, `panelRefs`.
- Margin (`953c2b3`): 5 % instead of 35 % (`geometry.js`); tone-matching ring gap = half of it.
  `abInput` self-test: `variants`, `runs`, `active: true` (a selection is used as its bounding
  rectangle), saves each reply and an outlined PNG (judge on the PNGs, `spill` is coarse).
- Step 6 (website): discussion only, no code until he validates, one sub-step at a time. Domain
  decided (2026-11-09): a subdomain of his own domain (recorded in his notes), never to change
  after the release. Next sub-steps: tech and hosting, content, SEO and GEO.
- **Step 5 (local models) on hold, his call (2026-11-08)**: needs a high-end GPU; not on the
  website. Tests and key facts in his vault ("essais en local (novembre 2026)"); UXP reaches a
  local server only through `http://localhost` (no port) in the manifest.
- Step 3 (done 2026-11-08): Auto resolution (2K floor, up to 4K, crop sent at its own size, max
  2048 px), tone matching (Curves smart filter), whole photo at 1024 px as a scene reference when
  the area is < 50 % of it; replies > 15 % off the target aspect dropped. The B&W border was
  seen again on 2026-11-10 (Qwen Image 3, outside the selection); the tile offset not seen in
  the paid tests (below). Grain out of the public release.
- Docs and waiting tips (website step): select generously; describe the change, not the photo's
  style ("keep the film grain" made things far worse); our wrapper's wording made no clear
  difference (A/B, reverted). What sets Fulla apart from Adobe's fill: a note in his vault.
- UXP layout lessons (keep): an element's measured size updates only after the handler returns
  (measure in a `setTimeout`, or keep computed values); flex children shrink unless told not to
  (pages use `flex: 1 1 0`, tabs and sheet rows don't shrink); a div that scrolls itself or whose
  row clips it can lose its bottom border; the native text field draws over any menu.
- Self-test with Stéphane's Google key: never run `geminiRaw` without asking (5 billed images);
  use an `only` list of the free scenarios (32 on 2026-11-09; `geminiRaw`, `openaiRaw` left out).
- **Tile offset to dig into later** (details in his notes): a removal on the pier came out shifted
  up-right only while earlier hidden test layers existed. None in the 2026-11-10 paid tests with
  the hidden references group. Plan: reproduce, save sent/received images, measure; fix the
  cause or register the tile in the ring.
- The detailed roadmap with checkboxes lives in Stéphane's notes (not in the repo); tick it as
  sub-steps finish, and record decisions in his ideas note.
- Blocked by: —
- Working setup: Fulla runs from UXP Developer Tools on Photoshop (Beta) 28.0.1 (Load + Watch; a
  manifest change needs Unload + Load). Self-test folder and commands: `CLAUDE.md`; warn Stéphane
  before a run (nobody may touch Photoshop) and run it in the background. Stéphane's OpenRouter key
  and his Google key are saved in the dev plugin; no OpenAI key (`openaiRaw` fails, expected).

## Current step

Before the site (added 2026-11-09): context margin and reference images, both done (paid tests
2026-11-10). Grainy result settled (one-off draw). Open: the luminance seam. Then step 6. Step 5 on hold. Step 1 left
to test some day, not blocking: sign-up with a fresh OpenRouter account; a real OpenAI key.

## Roadmap (order agreed 2026-11-07, revised that evening; details and checkboxes in Stéphane's notes)

1. Onboarding. Done.
2. Prompt box. Done (README done; panel captures moved to step 6; his walk-through not done).
3. Automatic resolution, tone matching, whole image as a scene reference (done).
4. Full code review: done 2026-11-08 (no serious flaw; 18 items fixed, see his notes).
5. Local models: **on hold since 2026-11-08**. Before the site: margin 5 %, reference images (done).
6. Website (presentation + all user docs; SEO and GEO). Domain: a subdomain of his own domain.
7. First public release.
8. fal.ai provider (real masks), compared on real photos.

Outside the steps: measure direct providers against OpenRouter (he finds direct often faster).

Each step and sub-step is discussed and validated by Stéphane, and starts only when he says so.

## Recently done

- 2026-11-10 — Reference images: paid tests (1.58 $); no minimum area side (`350a857`);
  `refs: false` A/B arms (`3ac1608`).
- 2026-11-09 — Reference images (`2d2416d`): discussed with him point by point, then built
  (hidden group in the document, ref 1 / ref 2 in the prompt, popup like Adobe's).
- 2026-11-09 — Context margin 5 % (was 35 %) after his A/B: added objects stay in the
  selection; tone-matching ring gap tied to the margin; A/B self-test mode generalised.
- 2026-11-08 — Step 4: code review and its fixes (`c41e68d` to `5a920cf`), JPEG colour profile.
- 2026-11-08 — Step 5 researched and put on hold; scene reference always on (`634c9d9`);
  README "Using Fulla", Auto up to 4K, tone matching. 2026-11-07 — steps 1 and 2.

## Decisions taken

- Context margin 5 % around the selection (2026-11-09): models compose additions in the whole
  image sent; more room let them spill out of the selection. Removal as good. Prompt lines and
  widening the mask ruled out (his call: unreliable, or changes what should stay).
- Reference images before the site and the release (2026-11-09, his call).
- The user's prompt says what to do with reference images (2026-11-09, his call, true for the
  whole plugin): the built-in text only says what each image is ("Images 4 and 5 are reference
  images supplied by the user, called ref 1 and ref 2 in the request."), never what to do; an
  empty prompt with references: "Edit the area to change using the reference images." plus the
  blending line.
- Reference images (2026-11-09, his calls): from files only (Photoshop beta 28 dropped layers);
  a popup like Adobe's "Reference image" without its "Object" and "Mode" options (the prompt says
  it; no cut-out option: a hand cut-out gained little, 2026-11-10); kept in the document, in a hidden group,
  one embedded smart object each, and the panel mirrors that group (fixed numbers, the cross
  deletes the layer, they stay until removed); the whole photo still goes along, except with
  Qwen (no room: Qwen Image 3 takes 3 images in all); at most the model's room left, capped at 8.
- After Cancel no new request is sent (2026-11-07): each one may be billed; the one already out
  can't be recalled, its result is dropped.
- Stay as close as possible to Photoshop's built-in Generative Fill (2026-11-07), e.g. one
  variation → one layer, no group; several → thumbnails in the panel, click to try, validate to
  create the layer (roadmap step 2). Show clearly that a generation is running.
- First run: no provider → Providers opens with "Connect with OpenRouter" (recommended; headless
  OAuth PKCE, nothing hosted by us) and Google/OpenAI rows; the first saved key switches to
  Generate. A key is checked with a free request before it is saved.
- Only current Photoshop and the beta matter (2026-11-07): with the subscription everyone can
  update. Manifest `minVersion` 27.11.0; raise it as releases come.
- A website carries the user docs before the first public release (2026-11-07).
- Own project, not a fork to upstream; OpenFill's MIT copyright line stays in `LICENSE`.
- No modes and no Expand: to extend, enlarge the canvas in Photoshop and fill the new area.
- Vocabulary: a provider is who gets the request and bills; a model is what generates.
- First run is the adoption make-or-break: OpenRouter put forward, Google and OpenAI keys for
  power users, fal.ai later. One model menu, a curated catalogue of tested models, no custom IDs.
  Clean UI close to everyday AI chat apps.
- Colours: read and send sRGB, embed an sRGB profile in results. With policy Off Photoshop drops
  it; handling that (putPixels instead of placing a file) is a bigger change, ask first.
- Commit as we go, push once at the end of a session (spares the CI).
- Whole photo as a scene reference, always on, no setting (2026-11-08): nearly free, never seen
  to hurt; A/B showed no measurable effect (model randomness dominates).
- Local models on hold (2026-11-08): good results need a high-end GPU, whose owners don't mind
  ~0.04 €/image through an API; Qwen 2.1 licence is research-only; heavy for a solo maintainer.
- Tone matching as a separate Curves smart filter, not merged (2026-11-08): variations swap the
  smart object's content; the user can hide, adjust or mask it. No filter when not needed.

## Open questions / blockers

- WebP results get no colour profile (JPEG and PNG do since 2026-11-08); none seen so far.
- GitHub "Forked from" label (optional, Stéphane): leave the fork network or ask Support.
