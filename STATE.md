# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action

- **Resume here: step 6, the website.** Milestones 1 and 2 of the build are done and approved
  (2026-11-11), committed and pushed. What is left needs Stéphane first; nothing to code until
  he gives material or says go:
  - **His tests in Photoshop:** does the built-in generative fill refuse a face swap (if so, he
    captures the refusal text, for the comparison page and home example 5); more tests with GPT
    Image models through Fulla (few so far; paid, give the cost first); is GPT Image in the model
    list of Photoshop (Beta) 28's generative fill.
  - **macOS:** never tested. The `.ccx` through Creative Cloud should install on a Mac too, but
    the docs and the site say nothing about macOS until it is tried.
  - **Images:** he generates the base pictures locally and edits them with Fulla; the list
    (names, sizes, prompts) is a note in his vault. Placeholders in `site/` until then.
  - **Umami:** he creates the site in his Umami, then the id goes in `site/src/lib/analytics.mjs`.
- **Release workflow done (2026-11-12; committed, push at the end of the session):** `release.yml` (a `vX.Y.Z` tag
  → the whole CI via `workflow_call` → `scripts/release-notes.js` checks the tag against both
  versions and takes the `## X.Y.Z` section of the site's Changelog page → `npm run package` →
  `SHA256SUMS.txt` → **draft** release; he ticks pre-release if he wants and publishes by
  hand). Tested locally (unit tests, package, checksums); the workflow itself first runs at his
  first tag. GitHub has no tag or release yet; the old OpenFill tag was deleted.
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
- Git: ask before committing and pushing; he pushes once per session, at the end.
- Self-test with Stéphane's Google key: never run `geminiRaw` without asking (5 billed images);
  use an `only` list of the free scenarios (every key of `SCENARIOS` in `selftest.js` except
  `geminiRaw` and `openaiRaw`). Warn him before a run (nobody may touch Photoshop). Paid
  tests: Google direct by default, give the cost first. A/B input format: see `selftest.js`
  (`abInput`). Photoshop work happens on his Windows machine only.
- Later, after the site: the luminance seam under an added object; spotting a reply where the
  model redrew the whole picture; bigger reference thumbnails.
- Blocked by: —

## Current step

Step 6, website: discussion done (tech, content, SEO, GEO, design); build milestones 1 and 2
done 2026-11-11; waiting for his images, tests and checks before go-live. Step 5 on hold. Step 1 left to test
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

- 2026-11-12 — Release workflow (step 7): `release.yml` and `scripts/release-notes.js`, draft
  release with notes from the site's Changelog page; old OpenFill tag deleted locally.

- 2026-11-11 — Website: design (three mockups, B chosen; docs layout; colours), then built in
  `site/`: home page, 18 docs pages, comparison and explainer pages, About, share image,
  Markdown pages and `llms.txt`; README warns the plugin is a work in progress. CI skips
  `site/**`.
- 2026-11-10 (evening) — Step 6 discussed: tech and hosting, content (site map, whole home
  page), SEO and GEO; research on Adobe credits, uses, comparative advertising, GPT and
  ChatGPT-plan access. Decisions in his notes.
- 2026-11-10 — Grainy hand result: the grain was in that one reply (a one-off; 0 in 9 A/B draws,
  0.53 $); Auto now asks about twice the area, 1K up to a ~512 px area (`0a9e77e`). A shifted
  hand result: the model redrew the whole picture (Fulla's placement checked exact).
- 2026-11-10 — Reference images: paid tests (1.58 $); no minimum area side (`350a857`);
  `refs: false` A/B arms (`3ac1608`).

## Decisions taken

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
