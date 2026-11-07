// The panel's ≡ menu: where Photoshop and Adobe's own plugins put help. Each entry opens a page.

const REPO = "https://github.com/toorop/fulla";

/** @param {string} version  the plugin's version, shown in "About" */
function helpMenu(version) {
  return [
    { id: "docs", label: "Documentation", url: `${REPO}#readme` },
    { id: "bug", label: "Report a bug", url: `${REPO}/issues/new?template=bug.yml` },
    { id: "model", label: "Request a model or provider", url: `${REPO}/issues/new?template=model-request.yml` },
    { id: "about", label: version ? `About Fulla ${version}` : "About Fulla", url: REPO },
  ];
}

module.exports = { helpMenu };
