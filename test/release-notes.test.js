const test = require("node:test");
const assert = require("node:assert/strict");

const { checkTag, notesFor } = require("../scripts/release-notes");

const SITE = "https://fulla.example.com";
const PAGE = [
  "---",
  "title: Changelog",
  "---",
  "",
  "Every version, newest first.",
  "",
  "## 0.2.10",
  "",
  "- Not this one.",
  "",
  "## 0.2.1 — 2026-12-01",
  "",
  "- Faster previews, see [Variations](/docs/generative-fill/variations/).",
  "",
  "### Fixed",
  "",
  "- A crash on [GitHub](https://github.com/toorop/fulla).",
  "",
  "## 0.2.0",
  "",
  "## 0.1.0",
  "",
  "- First release.",
].join("\r\n");

test("a release is made only from a vX.Y.Z tag that matches both versions", () => {
  assert.equal(checkTag("v0.2.1", "0.2.1", "0.2.1"), "0.2.1");
  for (const tag of ["0.2.1", "v0.2", "v0.2.1-beta", "", undefined]) assert.throws(() => checkTag(tag, "0.2.1", "0.2.1"), /vX\.Y\.Z/);
  assert.throws(() => checkTag("v0.2.1", "0.2.0", "0.2.1"), /package\.json 0\.2\.0/);
  assert.throws(() => checkTag("v0.2.1", "0.2.1", "0.2.0"), /manifest\.json 0\.2\.0/);
});

test("the notes are the version's Changelog section, with site links made absolute", () => {
  assert.equal(
    notesFor(PAGE, "0.2.1", SITE + "/"),
    [
      "- Faster previews, see [Variations](https://fulla.example.com/docs/generative-fill/variations/).",
      "",
      "### Fixed",
      "",
      "- A crash on [GitHub](https://github.com/toorop/fulla).",
      "",
    ].join("\n"),
  );
  assert.equal(notesFor(PAGE, "0.1.0", SITE), "- First release.\n");
});

test("a missing or empty Changelog section stops the release", () => {
  assert.throws(() => notesFor(PAGE, "0.3.0", SITE), /No "## 0\.3\.0" section/);
  assert.throws(() => notesFor(PAGE, "0.2.0", SITE), /"## 0\.2\.0" section .* is empty/);
});
