const test = require("node:test");
const assert = require("node:assert/strict");

// The site's Markdown copy of each docs page (/docs/<page>.md, llms-full.txt), read by AI assistants.
const { pageMarkdown } = require("../site/src/lib/markdown.ts");

test("an MDX page's Markdown keeps text and captions, without imports or component tags", () => {
  const body = [
    "import Selection from '../../components/Selection.astro';",
    "",
    "Leave room, see [Variations](/docs/generative-fill/variations/).",
    "",
    "<Compare before={a} after={b} />",
    "",
    '<div class="pair">',
    '\t<Selection image={tight} rect={{ left: 1, top: 2, width: 3, height: 4 }}>',
    "\t\t**Tight selection.** The shadow is cut.",
    "\t</Selection>",
    "</div>",
    "",
    "    indented code stays indented",
  ].join("\n");
  const md = pageMarkdown({ id: "docs/tips", data: { title: "Tips", description: "How." }, body });
  assert.equal(
    md,
    [
      "# Tips",
      "",
      "URL: https://fulla.dppst.com/docs/tips/",
      "",
      "> How.",
      "",
      "Leave room, see [Variations](https://fulla.dppst.com/docs/generative-fill/variations/).",
      "",
      "",
      "**Tight selection.** The shadow is cut.",
      "",
      "    indented code stays indented",
      "",
    ].join("\n"),
  );
});
