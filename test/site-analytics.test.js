const test = require("node:test");
const assert = require("node:assert/strict");

// Umami events for links off the site (download from GitHub releases, any other site), set by an
// inline script on every page.
const { tagLinks, tagLinksScript } = require("../site/src/lib/analytics.mjs");

function fakeLink(href, attrs = {}) {
  const a = { href, attrs: { ...attrs } };
  a.hasAttribute = (k) => k in a.attrs;
  a.setAttribute = (k, v) => (a.attrs[k] = v);
  return a;
}

test("links off the site get an Umami event with their URL; site links and tagged links are left alone", () => {
  const release = fakeLink("https://github.com/toorop/fulla/releases");
  const repo = fakeLink("https://github.com/toorop/fulla");
  const own = fakeLink("https://fulla.dppst.com/docs/install/");
  const mail = fakeLink("mailto:someone@example.com");
  const tagged = fakeLink("https://chatgpt.com/?q=x", { "data-umami-event": "ask-assistant" });
  const doc = { querySelectorAll: () => [release, repo, own, mail, tagged] };

  tagLinks(doc, "fulla.dppst.com");

  assert.deepEqual(release.attrs, { "data-umami-event": "download", "data-umami-event-url": release.href });
  assert.deepEqual(repo.attrs, { "data-umami-event": "outbound", "data-umami-event-url": repo.href });
  assert.deepEqual(own.attrs, {});
  assert.deepEqual(mail.attrs, {});
  assert.deepEqual(tagged.attrs, { "data-umami-event": "ask-assistant" });
});

test("the inline script runs on its own in a page", () => {
  const link = fakeLink("https://github.com/toorop/fulla/releases/tag/v0.1.0");
  let onLoad;
  const document = {
    addEventListener: (type, fn) => type === "DOMContentLoaded" && (onLoad = fn),
    querySelectorAll: () => [link],
  };
  new Function("document", "location", tagLinksScript())(document, { host: "fulla.dppst.com" });
  onLoad();
  assert.equal(link.attrs["data-umami-event"], "download");
});
