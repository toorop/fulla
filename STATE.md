# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Resume here (2026-11-10): reference images done, paid tests over (1.58 $).** Next, his
  call: the luminance seam under added objects (below), or step 6 (website: tech and hosting,
  content, SEO and GEO). Depth of field: a docs tip (asking for it in the prompt works). Later:
  bigger reference thumbnails (his note).
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
- **His hand Generate on the mug table (2026-11-10)**: asking in the prompt to respect the depth
  of field makes the mug blurred like the table. **His call: not in the built-in text, a docs
  tip.** Colours fine (the Curves filter is slight, on or off changes nothing); the seam is
  local luminance: the wood the model redrew under the mug is darker and stops at the
  selection's bottom and left edges. A global Curves can't fix that; he sees a model flaw.
  Leads to discuss (his ideas note): docs tip (room for the shadow), wider mask feather, a local
  low-frequency correction near the edges. Tone matching runs (layer differs from the raw reply
  in 8 of 9 Nano Banana runs) and is skipped by design when the ring is redrawn or bordered
  (Qwen). Small self-test idea: `abInput` could record `tone` and save Photoshop's composite.
- Self-test `abInput`: an arm with `refs: false` leaves the references out; `minSide` is a
  pipeline option for A/B tests (default none). Runs report `refs` (numbers sent).
- Everything pushed on 2026-11-10 (up to the STATE commit after `350a857`); he pushes once
  per session, at the end (spares the CI; ask first). Hand check of Details on an error: later
  (his call).
- Reference images as built (`2d2416d`): `references.js` (names "ref N — file", fixed numbers,
  send size 2048, max 8, limit line); `photoshop.js` `listReferences` / `addReference` /
  `removeReference` / `readReference` (embedded smart object in a hidden "Fulla references"
  group at the top; a result placed while a reference is the active layer goes out of the
  group); providers' `maxReferences(model)` and `req.refs` (after picture, mask, scene; Qwen drops
  the scene; Gemini 2 Lite's limit is assumed, not documented); `prompts.js` `refsNote` and the
  empty-prompt task; pipeline reads them in its read scope. Panel: button right of the model with
  the count (`refsChip`), popup "Reference images" (numbered thumbnails read from the document,
  cross, limit line, "Choose images"; `main.js` polls the active document every 1.5 s; scroll bar
  only when needed). Manifest `localFileSystem: "request"` (file picker; needs Unload + Load in
  UDT). Self-tests `references`, `panelRefs`.
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
2026-11-10). New lead to discuss: depth-of-field blur. Then step 6. Step 5 (local models) on hold. Step 1 left to test some day, not blocking: sign-up with a fresh
OpenRouter account; a real OpenAI key.

## Roadmap (order agreed 2026-11-07, revised that evening; details and checkboxes in Stéphane's notes)

1. Onboarding. Done.
2. Prompt box. Done (README done; panel captures moved to step 6; his walk-through not done).
3. Automatic resolution, tone matching (global), whole image as a scene reference (all done);
   the tile offset seen with earlier test layers present; grain later (not in the public release).
4. Full code review: done 2026-11-08 (no serious flaw; 18 items fixed, see his notes).
5. Local models: **on hold since 2026-11-08** (his call after tests: needs a high-end GPU; owners
   of one don't mind API prices; only privacy remains). Not put forward on the website.
   Before the site (2026-11-09): context margin 5 %, reference images (both done).
6. Website (presentation + all user docs; SEO and GEO). Domain: a subdomain of his own domain.
7. First public release.
8. fal.ai provider (real masks), compared on real photos.

Outside the steps: measure direct providers against OpenRouter (Stéphane finds direct often
faster); if confirmed, the docs say OpenRouter is the simplest start and direct gives the best
results.

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
