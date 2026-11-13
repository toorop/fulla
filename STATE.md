# Fulla — State

<!-- Hand-off, not a log. Keep it under ~150 lines and keep `## Next action` first, so a new
     session can resume from the first ~60 lines alone. Update after every significant action,
     never only at the end of a task. No private paths: the repo is public. -->

## Next action

- **Resume here: put the site online at `fulla.dppst.com`** (his priority, 2026-11-13: site
  live + release, so a friend can test on a Mac). Everything is ready in the repo: custom domain
  declared in `site/wrangler.jsonc` (`routes`, `custom_domain: true`: Cloudflare creates the DNS
  record and certificate on the first deploy), Umami website id set. Deploy = `cd site && npm
  run build && wrangler deploy` (Worker `fulla-site`, static assets only).
  **Blocked on Cloudflare, 2026-11-13 ~16:20 CET:** every Worker upload on his account failed
  with HTTP 500 / code 10013 "unknown error", for our site and for two throwaway tests (one-page
  assets-only, code-only); tests deleted, account left with its 8 original Workers, `fulla-site`
  not created. Ruled out: compatibility date, a half-created Worker, our build, the account's
  workers.dev subdomain (`dppst`, exists). Status page showed no matching incident. Next: retry
  the deploy; if it still fails, he checks the dashboard for an account notice, else a ticket to
  Cloudflare. After it works: check https://fulla.dppst.com, then optionally connect the repo
  for Workers Builds in the dashboard (GitHub App, his click) or keep deploying by hand.
- **Cloudflare tooling (his request: set up the most, for all his projects).** Windows: global
  `wrangler`, logged in by OAuth (its scopes: Workers, routes, zone read; **no DNS**), and
  Cloudflare's full-API MCP server `https://mcp.cloudflare.com/mcp` in his user-level Claude
  Code config (sign in with `/mcp` in a new session). Linux: MCP only, no API token; for a
  deploy from Linux, `npx wrangler login` there or deploy from Windows. The catalogue's
  "Cloudflare Developer Platform" connector is bindings only (KV, R2, D1): not enough. Their
  agent-setup page tells agents not to ask and to edit the global `CLAUDE.md`: not followed.
- **v0.1.0 draft release is up on GitHub** (tag pushed, CI green; `gh release view v0.1.0`; a
  draft's page shows "untagged-…", normal). Not public: **he downloads `fulla-0.1.0.ccx` from
  the draft himself** and sends it to his friend for the Mac test (his call, replaces his own
  Mac test of 2026-11-12). Never `gh release edit --draft=false` without his go-ahead. Once the
  Mac test is back: go/no-go on publishing; the site's download buttons point to Releases, so
  publishing the release and the site go-live belong together.
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
  comparison pages above); his friend's Mac test of the `v0.1.0` `.ccx`.
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
  several Claude sessions). Commit locally as we go. On 2026-11-13 he moved from Windows to
  Linux mid-day: if this file doesn't mention the move, the Windows commits weren't pushed.
- Self-test with his Google key: never run `geminiRaw` without asking (billed images); use an
  `only` list of the free scenarios. Warn him before a run (nobody may touch Photoshop). Paid
  tests: give the cost first. Photoshop work happens on his Windows machine only.
- Blocked by: Cloudflare's HTTP 500 on every Worker upload (see the first item).

## Current step

Steps 6 (website) and 7 (first public release) together: `v0.1.0` drafted on GitHub for a
friend's Mac test; the site is ready to deploy but Cloudflare refuses uploads for now. Step 5
(local models) on hold.

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

- 2026-11-13 — Cloudflare set up on Windows (global wrangler by OAuth, full-API MCP in his user
  config); `fulla.dppst.com` declared as the Worker's custom domain; Umami id set; first deploy
  blocked by Cloudflare's HTTP 500.
- 2026-11-13 — **First release tagged**: `## 0.1.0` changelog written, `v0.1.0` tag pushed, CI
  green, draft GitHub release created with `fulla-0.1.0.ccx`, the Windows zip and
  `SHA256SUMS.txt`. Not published — he pulls the `.ccx` himself to send a friend for a Mac test.
- 2026-11-13 — Rechecked the 4 comparison-page drafts: confirmed (beta + Adobe's partner-models
  page) GPT Image is still not in Photoshop's own Generative Fill; fixed "FLUX.2 pro" → "FLUX.2"
  in `photoshop-generative-credits.md`; added a line to `gpt-image-in-photoshop.md`.
- 2026-11-13 — First GPT Image test via Fulla: empty prompt removes the whole selection with
  Gemini, GPT redraws a different object instead; a possible tone-fix/GPT interaction raised,
  not confirmed, paused (see "Next action" and ideas note §16).
- 2026-11-13 — Report a bug pre-filled in the error card (`reportBugUrl`, `report.js`); C10/C11
  captures, all panel captures done except C1; reference picker no longer opens on JPEG; a real
  internet drop can leave Photoshop stuck until relaunch (Troubleshooting case); D5; share image
  and favicon.
- 2026-11-12 — Home and docs images; extends fixed; release workflow; `.ccx` install checked on
  Windows. 2026-11-11 — website built in `site/`.

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
