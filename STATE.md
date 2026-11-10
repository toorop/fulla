# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **2026-11-10: test (1) done through Google direct** (his call: more credits there; same
  `abInput` but `provider: "gemini"`, model `gemini-nano-banana-2.1`): 0.182 $, toothy smile
  3/3, face and hair kept (run 2 closest to the reference, 1 and 3 overdo it a little), no tile
  offset with the hidden references group (spill 0.002). **His verdict: not telling** (a plain
  "make her smile" would do the same; no run without the reference to compare). Test (2) as
  planned is moot too (reference with the very same framing never happens). **Re-planning the
  tests**, new plan agreed (details and prompts in his ideas note, section 8): (1) face swap,
  terrace A + a face-only portrait reference; (2) bakery facade, passerby removed, reference shot
  from another angle, A/B with vs without the reference; (3), (3b), (4) as before.
- **2026-11-10: test (1) face swap done: success 3/3** (0.187 $): the portrait's features
  (freckles, mole, eyebrows, green eyes) on her face, turned frontal to fit the pose, her hair and
  the terrace light kept, no offset. In his ideas note.
- **`abInput` arm option `refs: false`** (uncommitted, `selftest.js`): leaves the document's
  references out of that arm; each run now reports `refs` (the numbers sent). Next: test (2)
  with `variants: [{resolution: "2K"}, {resolution: "2K", refs: false}]`, prompt "Remove the man
  in the red jacket".
- **2026-11-10: test (2) done** (0.359 $; `refs: false` checked in the report): passerby gone
  6/6; with the reference, runs 1 and 3 restore the real tiled heron (legs, mound, horizon), run
  2 draws a second head under the neck left outside the selection; without it, a plausible but
  invented heron. Website tip: a reference matters to bring back what was really there. Results
  of tests 1 and 2 kept for the website in his test photos folder.
- **2026-11-10: test (3) mug done** (0.203 $): the mug is faithful (fox, speckles, chips) but
  overflows the selection 3/3 (handle, base or half of it cut by the mask; spill 0.25-0.47).
  Likely cause: small selection (228 x 239) and `minSide` 512 in `geometry.js`, so the selection
  is ~21 % of the area sent, like the old 35 % margin. **`minSide` now a pipeline option**
  (uncommitted, `pipeline.js` + test, 87/87, package OK). **Mug A/B done** (0.384 $): with the
  512 minimum the mug overflows 3/3 (spill 0.25-0.29); with `minSide: 0` (area 271 px, selection
  74 % of it) it fits whole 2/3, the 3rd has the handle tip clipped (spill 0.03-0.06). **His
  call: no minimum by default** (`geometry.js` `minSide = 0`, the option kept for A/B tests;
  tests 87/87, package OK, free self-test 32/32; uncommitted). Not checked: a removal on a tiny
  selection. Next: commit (ask him), then test (3b) (mug cut out by hand, ~0.20 $).
- **Resume here: reference images, paid tests (2026-11-09).** Feature built and committed
  (`2d2416d`, not pushed); tests 86/86, package OK, free self-test 32/32, his hand try of
  "Choose images" OK. Next, with him, one test at a time (tell the cost, get his OK, warn him not
  to touch Photoshop): OpenRouter, Nano Banana 2.1 unless said, `abInput` with `active: true`,
  `variants: [{ "resolution": "2K" }]`, `runs: 3`, on the document he opened, with its
  selection and the references he added through the panel. Test photos: his folder (names in his
  ideas note, section 8). (1) terrace: the 2nd woman's face, reference = the shot where she
  laughs with teeth showing, prompt proposed "Give her the big smile from the reference, with her
  teeth showing, keeping her face and hair the same" (~0.18 $); (2) square: the man in red,
  reference = the same square without him, **empty prompt** (~0.18 $); (3) empty kitchen table +
  fox mug reference (~0.18 $); (3b) same with the mug cut out (background removed by hand in
  Photoshop for now, to decide on an "Object" option, ~0.18 $); (4) test 3 with Qwen Image 3
  (scene dropped, ~0.10 $). Judge on the saved PNGs; record results in his ideas note. Then: a
  docs tip on references (for the website step), and later bigger thumbnails (his note).
- Uncommitted: this STATE.md update (ask before committing). Not pushed: `e8cb434`, `953c2b3`,
  `2d2416d`; he pushes once per session, at the end (spares the CI; ask first; last push
  `5a188d2`, its CI green). Hand check of Details on an error:
  later (his call).
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
- Margin (`953c2b3`): context margin 5 % instead of 35 % (`geometry.js`) after his A/B (land
  yacht: 35 % cut the sail 3/3, 5 % never; removal as clean). Tone-matching ring gap = half the
  margin (`tone.js`). `abInput` self-test: `variants`, `runs`, `active: true`, saves each reply
  and an outlined PNG (its `spill` number is too coarse: judge on the PNGs).
- Step 6 (website): discussion only, no code until he validates, one sub-step at a time. Domain
  decided (2026-11-09): a subdomain of his own domain (recorded in his notes), never to change
  after the release. Next sub-steps: tech and hosting, content, SEO and GEO.
- Step 4 done (2026-11-08, pushed up to `5a188d2`): 18 review items fixed (his vault, "relecture
  du code (novembre 2026)") plus sRGB profiles on JPEG results.
- **Step 5 (local models) on hold, his call (2026-11-08)**: needs a high-end GPU; not on the
  website. Tests and key facts in his vault ("essais en local (novembre 2026)"); UXP reaches a
  local server only through `http://localhost` (no port) in the manifest.
- Step 3 (done 2026-11-08): Auto resolution (2K floor, up to 4K, crop sent at its own size, max
  2048 px), tone matching (Curves smart filter), whole photo at 1024 px as a scene reference when
  the area is < 50 % of it; replies > 15 % off the target aspect dropped. On hold until seen
  again: the B&W border, the tile offset (below). Grain out of the public release.
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
  up-right only while earlier hidden test layers existed. The hidden references group is such a
  layer: watch for an offset in the paid tests. Plan: reproduce, save sent/received images,
  measure; fix the cause or register the tile in the ring.
- The detailed roadmap with checkboxes lives in Stéphane's notes (not in the repo); tick it as
  sub-steps finish, and record decisions in his ideas note.
- Blocked by: —
- Working setup: Fulla runs from UXP Developer Tools on Photoshop (Beta) 28.0.1 (Load + Watch; a
  manifest change needs Unload + Load). Self-test folder and commands: `CLAUDE.md`; warn Stéphane
  before a run (nobody may touch Photoshop) and run it in the background. Stéphane's OpenRouter key
  and his Google key are saved in the dev plugin; no OpenAI key (`openaiRaw` fails, expected).

## Current step

Before the site (added 2026-11-09): context margin (done), reference images (built; paid tests
next). Step 5
(local models) on hold. Step 1 left to test some day, not blocking: sign-up with a fresh
OpenRouter account; a real OpenAI key.

## Roadmap (order agreed 2026-11-07, revised that evening; details and checkboxes in Stéphane's notes)

1. Onboarding. Done.
2. Prompt box. Done (README done; panel captures moved to step 6; his walk-through not done).
3. Automatic resolution, tone matching (global), whole image as a scene reference (all done);
   the tile offset seen with earlier test layers present; grain later (not in the public release).
4. Full code review: done 2026-11-08 (no serious flaw; 18 items fixed, see his notes).
5. Local models: **on hold since 2026-11-08** (his call after tests: needs a high-end GPU; owners
   of one don't mind API prices; only privacy remains). Not put forward on the website.
   Before the site (2026-11-09): context margin 5 % (done), reference images (built, testing).
6. Website (presentation + all user docs; SEO and GEO). Domain: a subdomain of his own domain.
7. First public release.
8. fal.ai provider (real masks), compared on real photos.

Outside the steps: measure direct providers against OpenRouter (Stéphane finds direct often
faster); if confirmed, the docs say OpenRouter is the simplest start and direct gives the best
results.

Each step and sub-step is discussed and validated by Stéphane, and starts only when he says so.

## Recently done

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
  it; a cut-out option only if the tests show a gain); kept in the document, in a hidden group,
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
