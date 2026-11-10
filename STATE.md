# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Resume here (next session, 2026-11-11, possibly on another machine): step 6, the
  website, sub-step "design".** The discussion of tech, content, SEO and GEO is done; first ask
  him to confirm that the GEO sub-step is closed (proposed, not yet answered), then discuss the
  design (look of the site, home page, docs layout). Discussion only, no code until he
  validates; one question at a time, with a recommendation. After design: captures, then build.
- **Where the decisions are** (his vault, Fulla folder; not in this public repo): his roadmap
  note, step 6 (tech, site map, the whole home page section by section, footer, contact); his
  new SEO and GEO note (searches targeted, extra pages, final URLs, technical defaults, AI
  crawlers, AI-readable help, GEO writing rules); his note on Photoshop's Generative Fill
  (Adobe credits and pricing research, rules for lawful comparison, uses). A hand-off note in
  the same folder sums up the session for a machine without Claude's local memory.
- **Site decisions in one breath:** Astro, Starlight for the docs only, a home page of its own
  that sells Fulla; English only; code in `site/` of this repo (own `package.json`); Cloudflare
  Workers static assets, deployed by Workers Builds (root `site/`, watch paths `site/**`);
  cost 0; stats with his self-hosted Umami; audience: photographers with little AI culture (no
  jargon up top); docs sorted by tool (`/docs/generative-fill/…`), URLs final after release;
  before/after as sliders; every AI crawler allowed; `llms.txt`, Markdown pages and an "Ask
  your AI assistant" box in the docs. SEO and GEO with the Claude SEO skill set
  (claude-seo.md): reinstall it on a new machine (read its installer first).
- **Before publishing:** compare the same model on both sides (Adobe lists Nano Banana 2,
  `gemini-3.1-flash-image`; Fulla's default is Nano Banana 2.1); reread Adobe's credits FAQ by
  hand; prices in euros; never write "the only one"; at go-live, help him with the whole
  Cloudflare setup (custom domain, Workers Builds, Cloudflare's default AI-bot blocking,
  Search Console and Bing).
- **His checks, when he wants:** does Photoshop refuse a face swap; is GPT Image in the model
  list of Photoshop (Beta) 28's generative fill; the Details button on an error; what "source
  of error" he meant with the generated layer becoming active (Fulla always reads the
  composite, never the active layer).
- ChatGPT plan via OAuth: researched 2026-11-10; the official route has no image generation,
  so not now (his roadmap note, "En attente").
- **Docs tips for the site** (his calls; in the docs, not the built-in text): select generously,
  with room for the object and its shadow; ask for the lighting, perspective and depth of
  field; describe the change, not the photo's style; references to bring back what was really
  there, a face, an object; generate again when a draw fails (about 1 in 4). His ideas note, §8.
- Git: ask before committing and pushing; he pushes once per session, at the end (spares
  the CI).
- Later, after the site: the luminance seam (wood redrawn under an added object, darker and
  stopping at the selection's edge; leads: wider feather, a local low-frequency correction);
  spotting a reply where the model redrew the whole picture (its margin must match what was
  sent); bigger reference thumbnails.
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

Step 6, website: tech, content, SEO and GEO discussed; next sub-step: design (discussion). Before the site: margin and
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

- 2026-11-10 (evening) — Step 6 discussed: tech and hosting, content (site map, whole home
  page), SEO and GEO; research on Adobe credits, uses, comparative advertising, GPT and
  ChatGPT-plan access. Decisions in his notes.
- 2026-11-10 — Grainy hand result: the grain was in that one reply (a one-off; 0 in 9 A/B draws,
  0.53 $); Auto now asks about twice the area, 1K up to a ~512 px area (`0a9e77e`). A shifted
  hand result: the model redrew the whole picture (Fulla's placement checked exact).
- 2026-11-10 — Reference images: paid tests (1.58 $); no minimum area side (`350a857`);
  `refs: false` A/B arms (`3ac1608`).
- 2026-11-09 — Reference images (`2d2416d`); context margin 5 %. 2026-11-08 — step 4 code
  review and fixes (`c41e68d` to `5a920cf`); step 5 put on hold. 2026-11-07 — steps 1 and 2.

## Decisions taken

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
