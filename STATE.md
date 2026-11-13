# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Resume here: v0.1.0 draft release is up on GitHub**, untested so far by anyone but CI.
  2026-11-13, his call: a friend will test the `.ccx` on a Mac instead of Stéphane's own
  (packed away, old Photoshop) — releasing now, under a **draft** release he can pull the
  `.ccx` from himself to send his friend, rather than waiting on his own Mac test first (his
  2026-11-12 call is superseded). Tag `v0.1.0` pushed, CI green, draft release created
  (`gh release view v0.1.0`; its tag page currently shows as "untagged-..." until published —
  normal for a draft). **He downloads `fulla-0.1.0.ccx` from the draft release himself** and
  sends it to his friend; nothing public yet (don't `gh release edit --draft=false` without his
  go-ahead). Changelog's `## 0.1.0` section written and committed (models, auto resolution,
  references, tone matching, cost shown, install Windows/macOS). Once the Mac test is back:
  decide go/no-go on publishing the release.
- **Site go-live, blocked on Cloudflare (2026-11-13):** he asked for the full setup, for all his
  Cloudflare use. Done: `wrangler` installed globally and logged in (OAuth, his single account;
  zone `dppst.com` active there), Cloudflare's full-API MCP server (`mcp.cloudflare.com/mcp`)
  added to his user-level Claude Code config (OAuth to sign in from a new session), custom
  domain `fulla.dppst.com` declared in `site/wrangler.jsonc` (Cloudflare makes the DNS record and
  certificate), Umami website id set. **Blocked:** every Worker upload on his account fails with
  HTTP 500 / code 10013 "unknown error" — our site, a one-page assets-only test and a code-only
  test alike (tests deleted, account left with its 8 original Workers; `fulla-site` not created).
  Not the compatibility date, not a half-created Worker, not our build. Cloudflare's status page
  showed no matching incident. Next: retry `cd site && npm run build && wrangler deploy`; if it
  still fails, he looks at the dashboard (account notice?) or opens a ticket with Cloudflare.
  After it works: connect the GitHub repo for Workers Builds in the dashboard (GitHub App, his
  click), or keep deploying with `wrangler deploy`.
- The 4 comparison pages (`gpt-image-in-photoshop.md`, `nano-banana-in-photoshop.md`,
  `fulla-vs-photoshop-generative-fill.md`, `photoshop-generative-credits.md`, still
  `draft: true`): figures rechecked 2026-11-13 against Adobe's partner-models page (updated
  10/11) — confirmed again in the beta that **GPT Image is still not in Photoshop's own
  Generative Fill** (only Generate Image and Prompt to edit, Nano Banana 2/Pro and FLUX are the
  only Generative Fill partners); said so on the GPT Image page instead of the old "Photoshop
  now offers GPT" read (wrong). Fixed a stale name, "FLUX.2 pro" → **FLUX.2**, in
  `photoshop-generative-credits.md`; Nano Banana and Fulla-vs-Photoshop pages already accurate.
  He's fine with the `#1e1e1e` background as is. Left: remove the Draft banners when he's ready;
  never write "the only one".
- Panel captures: **done** except **C1** (installer), with the release. No English Photoshop
  (his call 2026-11-13): `c1-ccx`, C8, C9 stay text. `c3-en-cours.png` is still cropped to hide
  the cursor, to redo without it if he feels like it (not urgent).
- D6 (colour policy Off/Preserve) optional, can stay text. D3 (tone matching) waits for a draw
  that really drifts.
- **Open thread, paused by him**: his first GPT Image test suggested "Fulla: tone fix" might
  help Gemini but hurt GPT once. Likely mechanism (not confirmed): `localTone` in `tone.js`
  measures a real defect only in a thin ring right at the selection's edge, then spreads it over
  the *whole* selection via a harmonic membrane (600 Gauss-Seidel passes) — a small defect in one
  corner can tint an otherwise-good result. Two `toneDiag` attempts both picked the wrong layer
  (an old A3/mug layer) because the active GPT layer wasn't named `Fulla: ...` (he'd renamed it
  to "GPT"). **He said to drop it and see if it reproduces** — nothing to chase unless it does.
  If it comes back: rename the active layer to start with `Fulla: ` before writing
  `selftest.json`; Claude can write that file itself (full disk access), but only he can set the
  Photoshop-side state (active layer, live selection) first. Details in his ideas note, §16.
- **Waiting on him, when he wants:** GPT Image tests (paid, cost first — also needed for the
  comparison pages above); his friend's Mac test of the `v0.1.0` `.ccx`; Umami site id
  (`site/src/lib/analytics.mjs`).
- **Release workflow (built 2026-11-12, first run 2026-11-13):** a `vX.Y.Z` tag runs the CI,
  checks the tag, takes the notes from the site's Changelog page and creates a **draft** release;
  procedure in the README and `CLAUDE.md`. `v0.1.0` tag pushed and release drafted 2026-11-13 —
  see "Next action".
- **Where the decisions are:** his vault, Fulla folder (not in this public repo): the roadmap,
  the SEO/GEO note, the note on Photoshop's generative fill, the illustrations list, the
  mockups, and a hand-off note for a session without Claude's local memory.
- **Site in one breath:** `site/` (Astro 7.4, Starlight 0.42), commands in `CLAUDE.md`. Docs
  under `/docs/`, each also in Markdown, plus `llms.txt`; dark home page, docs dark by default.
  Dev server: `.claude/launch.json` via the preview tool, http://localhost:4321; restart it
  after renaming a docs page (`.md` to `.mdx`).
- Git: ask before committing and pushing; push only when his dev session ends (it can span
  several Claude sessions). **6 commits ahead of origin, not pushed as of 2026-11-13** (he paused
  mid-session) — ask him whether to push now or wait for the real end of his dev day.
- Self-test with his Google key: never run `geminiRaw` without asking (billed images); use an
  `only` list of the free scenarios. Warn him before a run (nobody may touch Photoshop). Paid
  tests: give the cost first. Photoshop work happens on his Windows machine only.
- Blocked by: —

## Current step

Straddling step 6 (website) and 7 (first public release): the site isn't live yet (Cloudflare
not connected) but `v0.1.0` is tagged and drafted on GitHub to get a friend's Mac test going
before going further on either. Step 5 (local models) on hold.

## Roadmap (order agreed 2026-11-07, revised that evening; details in Stéphane's notes)

1. Onboarding. Done.
2. Prompt box. Done.
3. Automatic resolution, tone matching, whole image as a scene reference. Done.
4. Full code review: done 2026-11-08.
5. Local models: **on hold since 2026-11-08**.
6. Website (presentation + all user docs; SEO and GEO). Domain: a subdomain of his own domain.
7. First public release.
8. fal.ai provider (real masks), compared on real photos.

Each step and sub-step is discussed and validated by Stéphane, and starts only when he says so.

## Recently done

- 2026-11-13 — **First release tagged**: `## 0.1.0` changelog written, `v0.1.0` tag pushed, CI
  green, draft GitHub release created with `fulla-0.1.0.ccx`, the Windows zip and
  `SHA256SUMS.txt`. Not published — he pulls the `.ccx` himself to send a friend for a Mac test.
- 2026-11-13 — Rechecked the 4 comparison-page drafts: confirmed (beta + Adobe's partner-models
  page) GPT Image is still not in Photoshop's own Generative Fill; fixed "FLUX.2 pro" → "FLUX.2"
  in `photoshop-generative-credits.md`; added a line to `gpt-image-in-photoshop.md`.
- 2026-11-13 — First GPT Image test via Fulla: empty prompt removes the whole selection with
  Gemini, GPT redraws a different object instead; a possible tone-fix/GPT interaction raised,
  not confirmed, paused (see "Next action" and ideas note §16).
- 2026-11-13 — C10/C11 captures (the ≡ menu, an error card with Report a bug) on Troubleshooting.
  All panel captures done except C1.
- 2026-11-13 — **Report a bug, pre-filled**: a failed run's card has a Report a bug button next
  to Details (`reportBugUrl` in `report.js`), opening GitHub's bug template with Fulla/Photoshop
  versions and the same report Details shows. `bug.yml` now asks for the photo for
  reproducibility. Docs corrected: they used to promise a link that never existed. Verified by
  him in Photoshop.
- 2026-11-13 — GitHub repo had Issues turned off (not the templates); he turned it on. Fixed and
  verified: reference file picker opened on the JPEG filter on Windows (`"*"` first in
  `REF_TYPES`). Explained (not a Fulla bug): a real internet drop while Photoshop stays open can
  leave it stuck on every provider until a full relaunch — noted in `CLAUDE.md` and a new
  Troubleshooting case for users.
- 2026-11-13 — D5 on Getting good results (narrow against generous selection). Share image
  `public/og.jpg` and favicon redrawn on a 16-pixel grid (`site/scripts/og.sh`,
  `site/scripts/favicon.mjs`). Docs Markdown export keeps the text of multi-line MDX components.
- 2026-11-12 — Home page and docs images (A1-A5 carousel, D1, D4); selection-proportions advice
  in the docs; extends fixed (no edge line, 35% context, local tone correction); release
  workflow; `.ccx` install checked on Windows.
- 2026-11-11 — Website designed and built in `site/` (milestones 1 and 2).

## Decisions taken

- Tone matching (2026-11-12, his go): the curve for the whole tile, then a local correction as a
  clipped "Fulla: tone fix" layer: a smart object cannot be retouched, a smart filter's mask can
  only dose one curve, and the layer keeps variations and stays non-destructive.
- Extends get 35 % context (2026-11-12): a 5 % margin keeps added objects inside the selection,
  but starves an extend of photo; an extend has nothing to spill.
- Website design (2026-11-11, his calls): beauty first; neutral dark grey, monochrome with one
  blue; light theme on the docs only; generated photos said so.
- Repo stays public before the release, with a work-in-progress warning (his call). About says
  Fulla is written with an AI assistant, every change his.
- Website (2026-11-10, his calls): static Astro, Starlight for the docs, English only, code in
  `site/` (a feature and its docs in one commit), deployed by Cloudflare Workers Builds.
- Auto resolution (2026-11-10): the smallest size that covers the area, at least about twice it,
  so 1K up to a ~512 px area, else at least 2K; up to 4K (2K at OpenAI).
- Context margin 5 % around the selection (2026-11-09): models compose in the whole image sent;
  more room lets them spill out. No minimum area side: same reason.
- Reference images (2026-11-09/10, his calls): from files only, kept in the document in a hidden
  group, the panel mirrors it; at most the model's room left, capped at 8.
- After Cancel no new request is sent (2026-11-07): each one may be billed.
- Stay as close as possible to Photoshop's built-in Generative Fill (2026-11-07): one variation →
  one layer, no group; several → thumbnails in the panel.
- First run: no provider → Providers opens with "Connect with OpenRouter" (recommended) and
  Google/OpenAI rows. A key is checked before it is saved.
- Only current Photoshop and the beta matter. Manifest `minVersion` 27.11.0.
- Own project, not a fork to upstream; OpenFill's MIT copyright line stays in `LICENSE`.
- No modes and no Expand: to extend, enlarge the canvas in Photoshop and fill the new area.
- Colours: read and send sRGB, embed an sRGB profile in results.
- Whole photo as a scene reference, always on, no setting (2026-11-08).
- Local models on hold (2026-11-08): need a high-end GPU; heavy for a solo maintainer.
- Tone matching as a separate Curves smart filter (2026-11-08); no filter when not needed.

## Open questions / blockers

- After the first connect, a 1 px line may stay under Generate until a change of tab:
  `redrawPage()` (`main.js`) should clear it; not checked (his call).
- WebP results get no colour profile (JPEG and PNG do since 2026-11-08); none seen so far.
- GitHub "Forked from" label (optional, Stéphane): leave the fork network or ask Support.
