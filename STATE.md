# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Resume here (2026-11-10, evening): step 6, the website, his call.** Start with the first
  open sub-step of his roadmap note (section "Étape 6"): discuss tech and hosting (static site?
  GitHub Pages, Cloudflare Pages…; languages: English, French?), hosting cost. Discussion only,
  no code until he validates, one sub-step at a time. Then content, SEO, GEO, captures, build.
  Domain decided (2026-11-09): a subdomain of his own domain (in his notes), never to change
  after the release.
- **Docs tips gathered for the site** (all his calls: in the docs, not in the built-in text):
  select generously, with room for the object **and its cast shadow** (a tight selection made
  the model push or crop the mug, 2026-11-10); ask to respect the lighting (much better
  shadows), the perspective, and the depth of field when the spot is blurred (else the object
  comes out sharp); describe the change, not the photo's style ("keep the film grain" made
  things far worse); a reference helps to bring back what was really there (a real place, a
  sign), a face, a precise object; a busy reference can be cropped; generate again when a draw
  fails (about 1 in 4 can miss at random). Details: his ideas note, section 8.
- **Website arguments found** (his ideas note, section 8): the user's selection sets the place and
  size of an added object (Gemini's own site made the mug too big and moved it); Photoshop's
  Generative Fill with Gemini (same mug test): perfect but for the depth of field; Adobe cuts
  the subject out of a reference ("Object"), risky when there is no subject (the facade test);
  Fulla sends the whole reference and the prompt says what to take. Test results kept for the
  site in his test photos folder (`resultats/`). What sets Fulla apart: a note in his vault.
- Pushed up to `f9d435c` (2026-11-10); `0a9e77e` and this STATE update come after (ask before
  committing and pushing). He pushes once per session, at the end (spares the CI).
- Still to do by hand (him): check the Details button on an error. Ask him what "source of
  error" he meant: after a run the new layer is active (as in Adobe's fill; Fulla always reads
  the composite, never the active layer).
- Later, not discussed yet: Fulla could spot a reply where the model redrew the whole picture
  (its margin must match what was sent; tone matching already compares that ring) and say so;
  bigger reference thumbnails (his note); the luminance seam (below).
- **Luminance seam** (left for after the site, 2026-11-10): the wood redrawn under an added object
  can be darker or sharper and stop at the selection's edges; a global Curves can't fix it.
  Mostly helped by the docs tips above. Code leads: wider mask feather, a local low-frequency
  correction near the edges. Tone matching is skipped by design when the ring is redrawn or
  bordered.
- Self-test with Stéphane's Google key: never run `geminiRaw` without asking (5 billed images);
  use an `only` list of the free scenarios (32 on 2026-11-10: every key of `SCENARIOS` in
  `selftest.js`, `diag` included, `geminiRaw` and `openaiRaw` left out). Warn him before a run
  (nobody may touch Photoshop) and run it in the background. Paid tests: Google direct by
  default (more credits there), give the cost first.
- Self-test `abInput` (paid A/B): `provider`, `models`, `prompt`, `variants` (pipeline options
  per arm: `resolution`, `upload`, `context`, `minSide`, `refs: false`), `runs`, `active: true`
  (the open document; a selection is used as its bounding rectangle; `selection` to fix it).
  Saves each reply and an outlined PNG of the layer at the size sent (judge on the PNGs, `spill`
  is coarse). File names come from the arm's options: distinct options keep older files.
- Working setup: Fulla runs from UXP Developer Tools on Photoshop (Beta) 28.0.1 (Load + Watch; a
  manifest change needs Unload + Load). Self-test folder and commands: `CLAUDE.md`. Stéphane's
  OpenRouter key and his Google key are saved in the dev plugin; no OpenAI key (`openaiRaw`
  fails, expected).
- The detailed roadmap with checkboxes lives in Stéphane's notes (not in the repo); tick it as
  sub-steps finish, and record decisions in his ideas note.
- Blocked by: —

## Current step

Step 6, website: next sub-step tech and hosting (discussion). Before the site: margin and
reference images done; grain settled; Auto rule changed. Step 5 on hold. Step 1 left to test
some day, not blocking: sign-up with a fresh OpenRouter account; a real OpenAI key.

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

- 2026-11-10 — Grainy hand result: the grain was in that one reply (a one-off; 0 in 9 A/B draws,
  0.53 $); Auto now asks about twice the area, 1K up to a ~512 px area (`0a9e77e`). A shifted
  hand result: the model redrew the whole picture (Fulla's placement checked exact).
- 2026-11-10 — Reference images: paid tests (1.58 $); no minimum area side (`350a857`);
  `refs: false` A/B arms (`3ac1608`).
- 2026-11-09 — Reference images (`2d2416d`): hidden group in the document, ref 1 / ref 2 in the
  prompt, popup like Adobe's. Context margin 5 % (was 35 %) after his A/B.
- 2026-11-08 — Step 4: code review and its fixes (`c41e68d` to `5a920cf`), JPEG colour profile.
- 2026-11-08 — Step 5 researched and put on hold; scene reference always on (`634c9d9`);
  README "Using Fulla", Auto up to 4K, tone matching. 2026-11-07 — steps 1 and 2.

## Decisions taken

- Auto resolution (2026-11-10): the smallest size that covers the area, at least about twice it
  (oversampling: as sharp as the photo), so 1K up to a ~512 px area, else at least 2K; up to 4K
  (2K at OpenAI). A/B on a 271 px area: 1K as good as 2K, 25 % cheaper.
- Get the best image from the model rather than fix it afterwards (2026-11-10, his call).
- No "Object" (cut-out) option for references (2026-11-10): a hand cut-out gained little; the
  prompt says what to take from the whole reference.
- Context margin 5 % around the selection (2026-11-09): models compose additions in the whole
  image sent; more room let them spill out of the selection. No minimum area side (2026-11-10):
  same reason, the whole photo sent as a scene reference gives the context.
- Reference images before the site and the release (2026-11-09, his call).
- The user's prompt says what to do with reference images (2026-11-09, his call, true for the
  whole plugin): the built-in text only says what each image is, never what to do; an empty
  prompt with references: "Edit the area to change using the reference images." plus blending.
- Reference images (2026-11-09, his calls): from files only; a popup like Adobe's without its
  "Object" and "Mode" options; kept in the document, in a hidden group, one embedded smart object
  each, and the panel mirrors that group (fixed numbers, the cross deletes the layer); the whole
  photo still goes along, except with Qwen (no room); at most the model's room left, capped at 8.
- After Cancel no new request is sent (2026-11-07): each one may be billed.
- Stay as close as possible to Photoshop's built-in Generative Fill (2026-11-07): one variation →
  one layer, no group; several → thumbnails in the panel. Show clearly that a generation runs.
- First run: no provider → Providers opens with "Connect with OpenRouter" (recommended; headless
  OAuth PKCE, nothing hosted by us) and Google/OpenAI rows. A key is checked before it is saved.
- Only current Photoshop and the beta matter (2026-11-07). Manifest `minVersion` 27.11.0.
- A website carries the user docs before the first public release (2026-11-07).
- Own project, not a fork to upstream; OpenFill's MIT copyright line stays in `LICENSE`.
- No modes and no Expand: to extend, enlarge the canvas in Photoshop and fill the new area.
- Vocabulary: a provider is who gets the request and bills; a model is what generates.
- First run is the adoption make-or-break: OpenRouter put forward, Google and OpenAI keys for
  power users, fal.ai later. One model menu, a curated catalogue, no custom IDs.
- Colours: read and send sRGB, embed an sRGB profile in results. With policy Off Photoshop drops
  it; handling that (putPixels instead of placing a file) is a bigger change, ask first.
- Commit as we go, push once at the end of a session (spares the CI).
- Whole photo as a scene reference, always on, no setting (2026-11-08).
- Local models on hold (2026-11-08): need a high-end GPU; heavy for a solo maintainer.
- Tone matching as a separate Curves smart filter (2026-11-08); no filter when not needed.

## Open questions / blockers

- Tile offset (pier removal, shifted up-right while earlier test layers existed): not seen
  again; the 2026-11-10 shifted result was the model redrawing everything, Fulla's placement
  exact. To compare a reply with what was sent: match the margin outside the selection.
- Gemini returns nearly the same image for the same request (seen 2026-11-10): variations of one
  run may differ less than expected; not checked.
- Facts kept: UXP reaches a local server only through `http://localhost` (no port); Photoshop's
  shrink of a placed result follows its Image Interpolation preference (`layer.scale`).
- UXP layout lessons: measured sizes update after the handler returns (use `setTimeout`); flex
  children shrink unless told not to; a self-scrolling div can lose its bottom border; the
  native text field draws over any menu.
- WebP results get no colour profile (JPEG and PNG do since 2026-11-08); none seen so far.
- GitHub "Forked from" label (optional, Stéphane): leave the fork network or ask Support.
