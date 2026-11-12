# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Resume here: A5 (face swap) goes in whatever his Photoshop test shows** (his call 2026-11-12,
  replacing the 2026-11-10 condition). He is testing Photoshop's generative fill on it, and looking
  for the pair from the 10 November trial (generated people, no real person); the test's result
  may change the caption (step 6, the site images, card by card in the order of his illustrations
  note, vault, Fulla folder; A1 and A2 done). **A2 done (2026-11-12):**
  `site/src/assets/examples/a2-avant.jpg` (checkerboard painted over the white bands, Photoshop's
  white/#ccc grid, 40 px squares at full size) and `a2-apres.jpg`, 1800 px q95; its card is 16:9,
  as tall as the 3:2 ones and wider (`.ex.wide`); placeholder `extend.png` removed. Caption: empty
  prompt, first try for each band, Nano Banana 2.1, 4K, $0.12 each (he said "0.12 €": assumed
  the panel's dollars), generated sample photo. For each next card: resize to
  1800 px JPEG q95 into `site/src/assets/examples/`, wire it in, fill the caption facts. He is
  retesting a top band to see the "Fulla: tone fix" layer on a real drift (not seen yet; names
  for his captures: `captures/2026-11-12 plage - 4 bande du haut avec tone fix.png`, `- 5 ... sans
  tone fix.png`). The dev server: `.claude/launch.json` (local, excluded from git) via the preview
  tool, http://localhost:4321.
  Panel captures: C2 done (`captures/site/`, Windows at 200 %, darkest theme); C3 to C7 later;
  C8/C9 need an English Photoshop (skipped, described in text); C1/C10 with the release `.ccx`.
- **Waiting on him, when he wants:** face-swap refusal test in Photoshop; GPT Image tests (paid,
  cost first); the `.ccx` on a Mac (**no release and no site go-live before it**, his call
  2026-11-12; the docs already say "Windows and macOS"); Umami site id
  (`site/src/lib/analytics.mjs`). Windows installer kept as a fallback for computers without
  admin rights or Creative Cloud; never mention pirated copies.
- **Release workflow done (2026-11-12):** a `vX.Y.Z` tag runs the CI, checks the tag, takes the
  notes from the site's Changelog page and creates a **draft** release; procedure in the README
  and `CLAUDE.md`. Never run yet (no tag on GitHub).
- **Before publishing the site:** check every figure again (Adobe's credits FAQ by hand; the
  same model on both sides: Adobe lists Nano Banana 2, `gemini-3.1-flash-image`, Fulla's
  default is Nano Banana 2.1), then remove the "Draft" banners (`draft: true` in the pages'
  frontmatter); judge the background (`#1e1e1e`, on trial) with the real photos; never write
  "the only one". At go-live, help him with Cloudflare: custom domain, Workers Builds (root
  `site/`, watch paths `site/**`), Cloudflare's default AI-bot blocking, Search Console, Bing.
- **Where the decisions are:** his vault, Fulla folder (not in this public repo): the roadmap
  (step 6 in detail), the SEO and GEO note, the note on Photoshop's generative fill (prices,
  rules for a lawful comparison), the illustrations list, the mockups (`maquettes/`), and a
  hand-off note for a session without Claude's local memory.
- **Site in one breath:** `site/` (Astro 7.4, Starlight 0.42), see `CLAUDE.md` for commands.
  Home page from mockup B ("Selection": Photoshop-like workspace, marching ants, result
  revealed, then the slider); docs under `/docs/` sorted by tool, URLs final after release;
  comparison pages, credits explainer, Nano Banana and GPT Image pages, About; every docs page
  also in Markdown, `llms.txt`, `llms-full.txt`, every crawler allowed; dark only on the home
  page, dark by default with a light toggle on the docs; monochrome greys and one blue
  (`#7aa7ff`) for focus and states. English only. Deployed by Cloudflare Workers Builds; the
  CI skips `site/**`.
- Git: ask before committing and pushing; push only when his dev session ends (it can span several
  Claude sessions). Unpushed on 2026-11-12: `8117236`, `14436d3`, `a71608a` and what follows. Update
  the site (`site/`) as we go, in the same change as the work.
- Self-test with Stéphane's Google key: never run `geminiRaw` without asking (5 billed images);
  use an `only` list of the free scenarios (every key of `SCENARIOS` in `selftest.js` except
  `geminiRaw` and `openaiRaw`: 35 on 2026-11-12). Warn him before a run (nobody may touch Photoshop). Paid
  tests: Google direct by default, give the cost first. A/B input format: see `selftest.js`
  (`abInput`). Photoshop work happens on his Windows machine only.
- Later, after the site: spotting a reply where the model redrew the whole picture; bigger
  reference thumbnails; maybe grow the mask a little by itself for an empty prompt (ghost outline
  after a tight removal); for a top or bottom band, take the 35 % on the band's short side (now the
  whole width is sent, reduced to 2048 px).
- Blocked by: —

## Current step

Step 6, website: build milestones 1 and 2 done 2026-11-11; real images going in card by card
(A1 done 2026-11-12); then his tests and checks before go-live. Step 5 on hold. Step 1 left to test
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

- 2026-11-12 — Site image A4: his archive photo of the 2D2 5402 (author unknown, his call to
  use it), the man removed with another shot of the same series as reference; square card;
  `Compare.astro` takes `variants` (other "after" images) and `reference`, switched by buttons on
  the photo (With reference, the default, first / Without reference / Reference last; the
  reference fills the frame and sets the slider aside). Prompt translated, first try with the reference, 2K, $0.06. The mug
  keeps its corner inset (his call).
- 2026-11-12 — Site image A3 (new generated table and enamel mug, 1672 x 941, kept at that
  width): 16:9 card, the reference shown small in a corner, slider starting at 8 % so the mug
  shows; his prompt translated ("Put the mug from the reference image on the table."), first try
  with that selection, 2K, $0.06. Docs (Tips, Reference images): the selection takes the
  proportions of the finished object, shadow included; widen it on the shadow's side in raking
  light (his finding: otherwise the shadow comes out cut).
- 2026-11-12 — Home page examples: one at a time (his request: he had not seen the sideways
  scrollbar), an arrow on each side named after the example it leads to (under the photo on a
  phone), looping both ways; light disc, dark thick arrow (his call: must stand out); on a wide
  screen every frame has one height (up to 560 px, less when 16:9 would not fit), so the arrows
  never move (his bug report); without JavaScript, still a sideways scroll.
- 2026-11-12 — Site image A2 (his generated beach, extended left and top) on the home page, in a
  16:9 card; A1 and A2 also on the docs page Remove and extend (now `.mdx`, sliders with captions;
  the Markdown copy keeps the captions, drops the sliders).
- 2026-11-12 — The tone fix layer was refused in a document with no colour profile (Photoshop
  reports "None": "Unknown color profile"); sRGB then. `localTone` scenario now also runs in an
  untagged document; `toneDiag` reports the local decision, bit depth and profile. His "parfait"
  beach draw needed no local fix (5 levels at most), so the layer is not yet seen on a real drift.
- 2026-11-12 — Extends fixed (his beach: both bands good): no light line
  along the photo's edge (`emptyUnder`, `image.js`); 35 % context when at least half the selection
  is empty (`EXTEND_CONTEXT`, `pipeline.js`; with 5 % a one-side band went as a 1:4 strip with a
  sliver of photo, and the model drew its own scene); local tone correction after the curve
  (`localTone`, `tone.js`: the rest measured around the selection on a 256-cell grid, carried in
  as a membrane; `addToneFix`, `photoshop.js`: a clipped "Fulla: tone fix" layer in Linear Light,
  blend mode set through the DOM since a batchPlay "set" ignored it; replaced per variation);
  `toneDiag` reports both sides of the edge and saves the two pictures; free self-test 36/36.
- 2026-11-12 — Release workflow (draft release from a tag, notes from the Changelog page). `.ccx`
  double-click install checked on Windows; docs mention macOS and Photoshop's permission dialog;
  Windows installer kept as a fallback. C2 panel captures. Panel fixes after the first connect.
- 2026-11-12 — Tone matching in greyscale documents and extended canvases (gain bounds 0.5-2, fit on
  tone distributions as a fallback); no see-through canvas edge; `{"toneDiag": true}`.
- 2026-11-12 — Site image A1 (his pier photo, boat removed) on the home page.
- 2026-11-11 — Website designed and built in `site/` (milestones 1 and 2).

## Decisions taken

- Tone matching (2026-11-12, his go): the curve for the whole tile, then a local correction as a
  clipped "Fulla: tone fix" layer: a smart object cannot be retouched, a smart filter's mask can
  only dose one curve, and the layer keeps variations and stays non-destructive.
- Extends get 35 % context (2026-11-12): the 5 % margin keeps added objects inside the selection,
  but starves an extend of photo; an extend has nothing to spill.

- Website design (2026-11-11, his calls): Fulla's own look, beauty first (the audience works on
  images); neutral dark grey background (a tinted one biases photos); monochrome with one blue;
  light theme on the docs only. Base images generated locally, mostly in colour (to show the
  colour matching), edited with Fulla; generated photos are said to be generated.
- Repo stays public before the release, with a work-in-progress warning (2026-11-11, his call).
  About says Fulla is written with an AI assistant, every change his (his call).
- Website (2026-11-10, his calls): static, Astro (his usual tool), Starlight for the docs only,
  the home page sells Fulla; Cloudflare Workers static assets (where he hosts); English only;
  code in `site/` here, so a feature and its docs change in the same commit; Workers Builds
  deploys it (no GitHub Actions, no Cloudflare token on GitHub). Docs sorted by tool: URLs
  never change after the release, and a later retouch tool gets its own section.
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
- Whole photo as a scene reference, always on, no setting (2026-11-08).
- Local models on hold (2026-11-08): need a high-end GPU; heavy for a solo maintainer.
- Tone matching as a separate Curves smart filter (2026-11-08); no filter when not needed.

## Open questions / blockers

- After the first connect, a 1 px line may stay under Generate until a change of tab:
  `redrawPage()` (`main.js`) should clear it; not checked (his call). Look next time someone
  connects.
- WebP results get no colour profile (JPEG and PNG do since 2026-11-08); none seen so far.
- GitHub "Forked from" label (optional, Stéphane): leave the fork network or ask Support.
