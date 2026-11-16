const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// The site's Download links point to github.com/.../releases/latest/download/<name>: every release
// must attach files under those exact names, or the links break at the next version.
const { releaseNames } = require("../scripts/package");
const { DOWNLOAD_CCX, DOWNLOAD_ZIP } = require("../site/src/lib/download.mjs");
const { linkEvent } = require("../site/src/lib/analytics.mjs");

test("the site's Download links point to files every release attaches, and count as downloads", () => {
  const names = releaseNames("9.9.9");
  const latest = "https://github.com/toorop/fulla/releases/latest/download/";
  assert.equal(DOWNLOAD_CCX, latest + names.latestCcx);
  assert.equal(DOWNLOAD_ZIP, latest + names.latestZip);
  assert.deepEqual([names.ccx, names.zip], ["fulla-9.9.9.ccx", "fulla-9.9.9-windows.zip"]);

  const install = fs.readFileSync(path.join(__dirname, "../site/src/content/docs/docs/install.mdx"), "utf8");
  assert.ok(install.includes(`(${DOWNLOAD_CCX})`) && install.includes(`(${DOWNLOAD_ZIP})`), "the Install page links to both files");

  assert.equal(linkEvent(DOWNLOAD_CCX, "fulla.dppst.com"), "download");
  assert.equal(linkEvent(DOWNLOAD_ZIP, "fulla.dppst.com"), "download");
});
