// The panel's markup (plugin/index.html): what main.js expects before it has run anything.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "plugin", "index.html"), "utf8");

// A message shown before any run (e.g. "OpenRouter is connected" after the first connect) opens
// the run card; the parts that belong to a run must not show with it (seen 2026-11-12: a frozen
// progress bar and "You can keep working.").
test("the parts of the run card that belong to a run start hidden", () => {
  for (const id of ["runProgress", "runDone", "results", "runCost", "details"]) {
    const tag = new RegExp(`<[a-z]+ id="${id}"[^>]*>`).exec(html);
    assert.ok(tag, `#${id} missing from index.html`);
    assert.match(tag[0], /\shidden[\s>]/, `#${id} must start hidden`);
  }
});
