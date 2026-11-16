const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// The Adobe Marketplace build is the GitHub build under the listing's ID, nothing else; and Adobe's
// portal refuses a host.minVersion that is not "a.b".
const { marketplaceFiles } = require("../scripts/package");

const PLUGIN = path.join(__dirname, "../plugin");

test("the Marketplace build changes only the plugin ID, and the manifest's minVersion suits Adobe", () => {
  const files = ["manifest.json", "index.html"].map((name) => ({ name, data: fs.readFileSync(path.join(PLUGIN, name)) }));
  const out = marketplaceFiles(files, "abc12345");

  const before = JSON.parse(files[0].data.toString("utf8"));
  const after = JSON.parse(out[0].data.toString("utf8"));
  assert.equal(after.id, "abc12345");
  assert.deepEqual({ ...after, id: before.id }, before);
  assert.equal(out[1], files[1]);

  const old = { name: "manifest.json", data: Buffer.from(JSON.stringify({ ...before, host: { app: "PS", minVersion: "27.11.0" } })) };
  assert.throws(() => marketplaceFiles([old], "abc12345"), /minVersion must be "a\.b"/);
});
