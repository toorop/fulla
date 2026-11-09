# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Resume here (2026-11-09): margin work done, waiting for his OK to commit; next, with him:
  reference images (discussion first; his call: before the site and the release), then step 6
  (website).** Margin (his lead, A/B on his beach photo, 0.88 $ in all): default context margin
  5 % instead of 35 % (`geometry.js`). Adding a land yacht: at 35 % the sail came out of the
  selection 3/3 (the mask cut it), at 10 % the mast tip 3/3, at 5 % never. Removing a man: 5 %
  as clean as 35 %, 3/3 each (once the model moved him outside the selection: masked, harmless).
  Tone matching kept: its ring's gap is now half the margin, at most 4 % of the grid
  (`tone.js` `gap`). Dev tools: pipeline option `context`, `ps.readLayer`, self-test
  `abInput` with `variants`, `runs`, `active: true` (open document; `selection` optional),
  saves each reply and an outlined PNG; its `spill` number is too coarse to see a mast tip, judge
  on the PNGs. Tests 80/80, package OK, free self-test 29/29 (toneMatch at the 5 % default).
- Step 6 (website): discussion only, no code until he validates, one sub-step at a time. Domain
  decided (2026-11-09): a subdomain of his own domain (recorded in his notes), never to change
  after the release. Next sub-steps: tech and hosting, content, SEO and GEO. CI of `5a188d2`
  green (checked 2026-11-09).
- Step 4 done (2026-11-08), pushed up to `5a188d2`: 18 review items fixed (list and outcome in
  his vault, "relecture du code (novembre 2026)") plus sRGB profiles on JPEG results. Hand checks
  (2026-11-09): pasting a prompt OK, selection kept after a run OK; Details on an error not done.
- **Step 5 (local models) on hold, his call (2026-11-08)**: good results need a high-end GPU
  (RTX 5080: ~20 s per edit at 1.5K, Qwen Image 2.1 Turbo), whose owners don't mind ~0.04 €/image
  through an API; Qwen 2.1's licence is research-only. Not put forward on the website. Tests,
  numbers and lessons in his vault ("essais en local (novembre 2026)"); key facts if it resumes:
  UXP needs `http://localhost` (no port) in the manifest; stable-diffusion.cpp `sd-server` has an
  OpenAI-style `/v1/images/edits`; send tile + prompt only (a mask image makes Qwen cut out);
  int8 convrot text encoder (GGUF Q4_K crashes on RTX 50). Test files are in the Recycle Bin.
- Step 3 closed for now (2026-11-08): 3.1, 3.2, 3.3 committed (`634c9d9` last, self-test 29/29).
  On hold until they show up again (he will report): the B&W border (barely visible since tone
  matching) and the tile offset. Grain out of the public release. The clipped-addition prompt
  line is not urgent (seen once).
- Step 3 as built (details in the git log): 3.1 Auto resolution, smallest tier covering the
  crop, never below 2K, up to 4K (`provider.autoMax`), uploaded crop capped at 2048 px; 3.2 tone
  matching (`src/tone.js`, Curves smart filter after the mask, refitted per variation); 3.3 the
  whole photo at 1024 px as a scene reference when the area is < 50 % of it (no measurable
  effect in his A/B, kept: nearly free), replies > 15 % off the target aspect dropped.
- Clipped additions: settled by the 5 % margin (2026-11-09, above); a docs tip to select
  generously is still worth having.
- Prompts: naming the photo's style in the prompt ("keep the film grain") made things far worse;
  our wrapper's wording made no clear difference (A/B, reverted). Tip for docs and waiting tips:
  describe the change, not the photo's style.
- A note listing what sets Fulla apart from Photoshop's Generative Fill (resolution, cost, BYOK,
  free, models; local now on hold) lives in his notes, for the website step.
- Step 2 leftovers: panel captures moved to step 6 (website); his walk-through not done yet.
- UXP layout lessons (keep): an element's measured size updates only after the handler returns
  (measure in a `setTimeout`, or keep computed values); flex children shrink unless told not to
  (pages use `flex: 1 1 0`, tabs and sheet rows don't shrink); a div that scrolls itself or whose
  row clips it can lose its bottom border; the native text field draws over any menu.
- Self-test with Stéphane's Google key: never run `geminiRaw` without asking (5 billed images);
  use an `only` list of the free scenarios (29/29 on 2026-11-08, `openaiRaw` left out: no key).
- **Tile offset to dig into later** (details in his notes): a removal on the pier came out shifted
  up-right only while earlier (hidden) test layers existed. Plan: reproduce, save sent/received
  images (dev only), measure; fix the cause or register the tile in the ring (roadmap step 3).
- **Push**: pushed up to `5a188d2` on 2026-11-08, end of step 4 (he pushes once per session to
  spare the CI; ask before pushing). Check that run's CI result next session.
- The detailed roadmap with checkboxes lives in Stéphane's notes (not in the repo); tick it as
  sub-steps finish, and record decisions in his ideas note.
- Blocked by: —
- Working setup: Fulla runs from UXP Developer Tools on Photoshop (Beta) 28.0.1 (Load + Watch; a
  manifest change needs Unload + Load). Self-test folder and commands: `CLAUDE.md`; warn Stéphane
  before a run (nobody may touch Photoshop) and run it in the background. Stéphane's OpenRouter key
  is saved in the dev plugin (connected through the panel); no Google/OpenAI keys, so
  `geminiRaw`/`openaiRaw` fail (expected).

## Current step

Before the site (added 2026-11-09): context margin (done) and reference images (next). Step 5
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
   Before the site (2026-11-09): context margin 5 % (done), reference images.
6. Website (presentation + all user docs; SEO and GEO). Domain: a subdomain of his own domain.
7. First public release.
8. fal.ai provider (real masks), compared on real photos.

Outside the steps: measure direct providers against OpenRouter (Stéphane finds direct often
faster); if confirmed, the docs say OpenRouter is the simplest start and direct gives the best
results.

Each step and sub-step is discussed and validated by Stéphane, and starts only when he says so.

## Recently done

- 2026-11-09 — Context margin 5 % (was 35 %) after his A/B: added objects stay in the
  selection; tone-matching ring gap tied to the margin; A/B self-test mode generalised.
- 2026-11-08 — Step 4: code review and its fixes (`c41e68d` to `5a920cf`), JPEG colour profile.
- 2026-11-08 — Step 5 researched and tested (UXP loopback, stable-diffusion.cpp vs ComfyUI,
  Qwen Image 2.1 on an RTX 5080), then put on hold.
- 2026-11-08 — Scene reference kept always on (3.3) and pasted-prompt placeholder fix
  (`634c9d9`).
- 2026-11-08 — README "Using Fulla" (`7059fce`); Auto resolution up to 4K (`3b7c47a`); tone
  matching with a Curves smart filter (`c2a05b3`). Panel captures moved to the website step.
- 2026-11-07 — Steps 1 and 2 (onboarding, prompt box, model button, settings popup, one layer
  per run, help menu): details in the git log and his notes.

## Decisions taken

- Context margin 5 % around the selection (2026-11-09): models compose additions in the whole
  image sent; more room let them spill out of the selection. Removal as good. Prompt lines and
  widening the mask ruled out (his call: unreliable, or changes what should stay).
- Reference images before the site and the release (2026-11-09, his call).
- After Cancel no new request is sent (2026-11-07): each one may be billed; the one already out
  can't be recalled, its result is dropped.
- Stay as close as possible to Photoshop's built-in Generative Fill (2026-11-07), e.g. one
  variation → one layer, no group; several → thumbnails in the panel, click to try, validate to
  create the layer (roadmap step 2). Show clearly that a generation is running.
- First run: no provider → Providers opens with an explanation, "Connect with OpenRouter"
  (recommended), Google/OpenAI rows; the Generate tab stays clickable and explains (a greyed tab
  gives no reason). The first saved key switches to Generate; removing the last key goes back.
- OpenRouter connect uses headless OAuth PKCE (S256): nothing hosted by us, the user only sees
  openrouter.ai and pastes a code that is useless without the plugin's verifier (trust).
- A key is checked with a free request before it is saved; Remove then Add replaces a key.
- Only current Photoshop and the beta matter (2026-11-07): with the subscription everyone can
  update. Manifest `minVersion` 27.11.0; raise it as releases come.
- A website carries the user docs before the first public release (2026-11-07).
- Own project, not a fork to upstream; OpenFill's MIT copyright line stays in `LICENSE`.
- No modes and no Expand: to extend, enlarge the canvas in Photoshop and fill the new area.
- Vocabulary: a provider is who gets the request and bills; a model is what generates.
- First run is the adoption make-or-break (most users have no AI account): OpenRouter put forward,
  Google and OpenAI keys offered from day one to power users, fal.ai later. One account per
  provider type in v1.
- One model menu, a curated catalogue of tested models for configured providers; no custom model
  IDs (2026-11-07); never every model of an aggregator.
- Clean, efficient UI close to everyday AI chat apps, not a form with many selects.
- Colours: read and send sRGB, embed an sRGB profile in results. With policy Off Photoshop drops
  it; handling that (putPixels instead of placing a file) is a bigger change, ask first.
- Develop with UXP Developer Tools; never install with `install.ps1` at the same time.
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
