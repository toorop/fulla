// Release helper for .github/workflows/release.yml (no dependencies):
//   node scripts/release-notes.js <tag> <notes-file>
// Stops unless the tag is v<version> of both package.json and plugin/manifest.json, then writes
// that version's "## X.Y.Z" section of the website's Changelog page to <notes-file>: the page is
// the one source of the release notes, so a version can't ship without them.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const CHANGELOG = "site/src/content/docs/docs/changelog.md";

function checkTag(tag, pkgVersion, manifestVersion) {
  const m = /^v(\d+\.\d+\.\d+)$/.exec(tag || "");
  if (!m) throw new Error(`Tag "${tag}" is not of the form vX.Y.Z`);
  if (m[1] !== pkgVersion || m[1] !== manifestVersion) {
    throw new Error(`Tag ${tag} doesn't match the versions: package.json ${pkgVersion}, plugin/manifest.json ${manifestVersion}`);
  }
  return m[1];
}

// The body of the "## X.Y.Z" section (a date or text may follow the number on the heading line),
// up to the next level-2 heading. Root-relative links point at the website, since the notes are
// read on GitHub.
function notesFor(markdown, version, siteUrl) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const escaped = version.replace(/\./g, "\\.");
  const heading = new RegExp(`^##\\s+v?${escaped}(\\s|$)`);
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) throw new Error(`No "## ${version}" section in ${CHANGELOG}`);
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end < 0) end = lines.length;
  const body = lines.slice(start + 1, end).join("\n").trim();
  if (!body) throw new Error(`The "## ${version}" section in ${CHANGELOG} is empty`);
  return body.replace(/\]\(\//g, `](${siteUrl.replace(/\/$/, "")}/`) + "\n";
}

function main() {
  const [tag, out] = process.argv.slice(2);
  if (!out) throw new Error("Usage: node scripts/release-notes.js <tag> <notes-file>");
  const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
  const version = checkTag(tag, JSON.parse(read("package.json")).version, JSON.parse(read("plugin/manifest.json")).version);
  const site = /\bsite:\s*['"]([^'"]+)['"]/.exec(read("site/astro.config.mjs"));
  if (!site) throw new Error("No site URL in site/astro.config.mjs");
  fs.writeFileSync(out, notesFor(read(CHANGELOG), version, site[1]));
  console.log(`Release notes for ${version} written to ${out}`);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
module.exports = { checkTag, notesFor };
