# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Resume here: D5** (step 6, the site images, card by card in the order of his illustrations
  note, vault, Fulla folder). D5 = tight against large selection with the mug (shadow cut by a
  tight selection): if he kept a draw with the shadow cut, only two exports and two captures of
  the marching ants are needed. Then D6 (colour policy Off against Preserve Embedded Profiles, an
  Adobe RGB document, about $0.12; optional, could stay text). Recommended next, by Claude alone:
  the social share image (1200 x 630, from A1) and the favicon.
  - Done 2026-11-12: home page A1 to A5 (carousel), docs D1 (Your first fill), D4 (Variations),
    A1 and A2 on Remove and extend. Skipped: D2 (no photo with fine detail; the Resolution page
    keeps its text). D3 (tone matching) waits for a draw that really drifts, exported with and
    without the correction.
  - For each card: his PNG pairs in `captures/site/` next to his notes; check same size and
    alignment, resize to 1800 px JPEG q95 (never upscale) into `site/src/assets/examples/`, wire
    with `Compare.astro` (props `variants`, `reference`, `afterLabel`), caption facts from him:
    prompt (translated to English when he wrote French), draws, model, resolution, cost; say
    "Sample photo generated for this demo" for generated pictures. Exports from his Adobe RGB
    photos need the sRGB conversion (D4's first ones came out faded).
  - Panel captures last, when the panel no longer changes (decision of 2026-11-08): C3 to C5, C7,
    C10, C11; C1 with the release `.ccx`; C2 done; C8/C9 need an English Photoshop (text instead).
  - Dev server: `.claude/launch.json` (local, excluded from git) via the preview tool,
    http://localhost:4321; restart it after renaming a docs page (`.md` to `.mdx`).
- **Waiting on him, when he wants:** GPT Image tests (paid, cost first); the `.ccx` on a Mac
  (**no release and no site go-live before it**, his call 2026-11-12; the docs already say
  "Windows and macOS"); Umami site id (`site/src/lib/analytics.mjs`). Windows installer kept as a
  fallback for computers without admin rights or Creative Cloud; never mention pirated copies.
- **Release workflow done (2026-11-12):** a `vX.Y.Z` tag runs the CI, checks the tag, takes the
  notes from the site's Changelog page and creates a **draft** release; procedure in the README
  and `CLAUDE.md`. Never run yet (no tag on GitHub).
- **Before publishing the site:** Photoshop now offers GPT in its generative fill (seen by him
  2026-11-12): the GPT Image page must say so, as the Nano Banana page does (which model, credits,
  resolution: to look up); recheck "models Photoshop doesn't offer". Check every figure again (Adobe's credits FAQ by hand; the
  same model on both sides: Adobe lists Nano Banana 2, `gemini-3.1-flash-image`, Fulla's
  default is Nano Banana 2.1), then remove the "Draft" banners (`draft: true` in the pages'
  frontmatter); judge the background (`#1e1e1e`, on trial) with the real photos; never write
  "the only one". At go-live, help him with Cloudflare: custom domain, Workers Builds (root
  `site/`, watch paths `site/**`), Cloudflare's default AI-bot blocking, Search Console, Bing.
- **Where the decisions are:** his vault, Fulla folder (not in this public repo): the roadmap
  (step 6 in detail), the SEO and GEO note, the note on Photoshop's generative fill (prices,
  rules for a lawful comparison), the illustrations list, the mockups (`maquettes/`), and a
  hand-off note for a session without Claude's local memory.
- **Site in one breath:** `site/` (Astro 7.4, Starlight 0.42), commands in `CLAUDE.md`. Home
  page from mockup B (Photoshop-like workspace, then the examples carousel); docs under `/docs/`,
  each also in Markdown, plus `llms.txt`; dark home page, docs dark by default with a light toggle.
- Git: ask before committing and pushing; push only when his dev session ends (it can span several
  Claude sessions). Unpushed on the evening of 2026-11-12: about 23 commits (`git status` shows them). Update
  the site (`site/`) as we go, in the same change as the work.
- Self-test with Stéphane's Google key: never run `geminiRaw` without asking (5 billed images);
  use an `only` list of the free scenarios (every key of `SCENARIOS` in `selftest.js` except
  `geminiRaw` and `openaiRaw`: 35 on 2026-11-12). Warn him before a run (nobody may touch Photoshop). Paid
  tests: Google direct by default, give the cost first. A/B input format: see `selftest.js`
  (`abInput`). Photoshop work happens on his Windows machine only.
- Later, after the site: spot a reply where the model redrew the whole picture; bigger reference
  thumbnails; maybe grow the mask a little for an empty prompt; 35 % on a band's short side.
- Blocked by: —

## Current step

Step 6, website: build milestones 1 and 2 done 2026-11-11; real images going in card by card
(home page and most docs images done 2026-11-12); then his tests and checks before go-live. Step 5 on hold. Step 1 left to test
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

- 2026-11-12 — Docs images D1 (Your first fill: a boat added to A1's empty pier) and D4
  (Variations: four sea kayaks of one run, panel capture C6); A1 and A2 on Remove and extend.
- 2026-11-12 — Home page images A1 to A5 (pier, beach extend, mug, locomotive, face swap), each
  with honest caption facts. `Compare.astro`: `variants` and `reference` switched by buttons on
  the photo, `not-content` for the docs, hidden images loaded and decoded once in view.
- 2026-11-12 — Home page examples as a carousel: one at a time, looping arrows named after the
  neighbouring example, every frame one height on a wide screen; sideways scroll without JS.
- 2026-11-12 — Docs: the selection takes the proportions of the finished object, shadow
  included, wider on the shadow's side in raking light (Tips, Reference images).
- 2026-11-12 — Tone fix layer in documents with no colour profile (sRGB then); `toneDiag`
  reports the local decision. The layer is not yet seen on a real drift.
- 2026-11-12 — Extends fixed: no light line at the photo's edge, 35 % context when the selection
  is mostly empty, local tone correction ("Fulla: tone fix" layer); free self-test 36/36.
- 2026-11-12 — Release workflow (draft release from a tag); `.ccx` install checked on Windows;
  C2 captures; tone matching in greyscale documents and extended canvases.
- 2026-11-11 — Website designed and built in `site/` (milestones 1 and 2).

## Decisions taken

- Site examples (2026-11-12, his calls): real results only, caption gives prompt, draws, model,
  resolution and cost; a reference gets its own button (full frame) when it matters (locomotive,
  face), a corner inset when it is obvious (mug); no claim about Photoshop from a single try
  (Photoshop swaps faces too with a clear prompt); his archive locomotive photo used, author
  unknown, risk accepted.
- Tone matching (2026-11-12, his go): the curve for the whole tile, then a local correction as a
  clipped "Fulla: tone fix" layer: a smart object cannot be retouched, a smart filter's mask can
  only dose one curve, and the layer keeps variations and stays non-destructive.
- Extends get 35 % context (2026-11-12): the 5 % margin keeps added objects inside the selection,
  but starves an extend of photo; an extend has nothing to spill.
- Website design (2026-11-11, his calls): beauty first; neutral dark grey (a tinted one biases
  photos), monochrome with one blue; light theme on the docs only; generated photos said so.
- Repo stays public before the release, with a work-in-progress warning (2026-11-11, his call).
  About says Fulla is written with an AI assistant, every change his (his call).
- Website (2026-11-10, his calls): static Astro, Starlight for the docs, English only, code in
  `site/` (a feature and its docs in one commit), deployed by Cloudflare Workers Builds (no
  token on GitHub). Docs sorted by tool: URLs never change after the release.
- Auto resolution (2026-11-10): the smallest size that covers the area, at least about twice it
  (oversampling: as sharp as the photo), so 1K up to a ~512 px area, else at least 2K; up to 4K
  (2K at OpenAI). A/B on a 271 px area: 1K as good as 2K, 25 % cheaper.
- Get the best image from the model rather than fix it afterwards (2026-11-10, his call).
- Context margin 5 % around the selection (2026-11-09): models compose additions in the whole
  image sent; more room let them spill out of the selection. No minimum area side (2026-11-10):
  same reason, the whole photo sent as a scene reference gives the context.
- The user's prompt says what to do with reference images (2026-11-09, his call, true for the
  whole plugin): the built-in text only says what each image is, never what to do; an empty
  prompt with references: "Edit the area to change using the reference images." plus blending.
- Reference images (2026-11-09/10, his calls): from files only, no "Object" or "Mode" option (a
  cut-out gained little; Adobe dropped them too in November); kept in the document in a hidden
  group, the panel mirrors it; at most the model's room left, capped at 8.
- After Cancel no new request is sent (2026-11-07): each one may be billed.
- Stay as close as possible to Photoshop's built-in Generative Fill (2026-11-07): one variation →
  one layer, no group; several → thumbnails in the panel. Show clearly that a generation runs.
- First run: no provider → Providers opens with "Connect with OpenRouter" (recommended; headless
  OAuth PKCE, nothing hosted by us) and Google/OpenAI rows. A key is checked before it is saved.
- Only current Photoshop and the beta matter (2026-11-07). Manifest `minVersion` 27.11.0.
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
