// The technical details of a failed run, as plain text the user can copy into a bug report.
// Never contains the API key or the prompt (the prompt may be private; the user can add it).

/**
 * @param {object} o
 * @param {Error & {status?: number, code?: string, detail?: string}} o.error
 * @param {string} [o.provider]  provider name ("OpenRouter")
 * @param {string} [o.model]     model id
 * @param {string} [o.size]      size asked ("2K", "Auto")
 * @param {string} [o.plugin]    Fulla version
 * @param {string} [o.host]      Photoshop version
 * @param {Date} [o.when]
 * @returns {string}
 */
function errorReport({ error, provider, model, size, plugin, host, when = new Date() }) {
  const e = error || {};
  const lines = [
    `Fulla ${plugin || "dev"} · Photoshop ${host || "?"} · ${when.toISOString()}`,
    `Provider: ${provider || "?"} · model: ${model || "?"}${size ? ` · size: ${size}` : ""}`,
    `Message: ${e.message || String(e)}`,
  ];
  if (e.status) lines.push(`HTTP status: ${e.status}`);
  if (e.code) lines.push(`Code: ${e.code}`);
  if (e.detail) lines.push(`Detail: ${String(e.detail).slice(0, 1000)}`);
  return lines.join("\n");
}

const REPO = "https://github.com/toorop/fulla";

/**
 * A "Report a bug" link that opens the bug template with the error already in it: Fulla and
 * Photoshop versions in their own fields, the rest (provider, model, message...) as the same
 * report errorReport() gives, in "What happened". The user still fills in "What you did" and can
 * attach a screenshot; GitHub fills a field from the URL by the field's id in bug.yml.
 * @param {object} o  the same fields as errorReport()
 * @param {string} [o.repo]  override for testing; defaults to the real repo
 * @returns {string}
 */
function reportBugUrl(o) {
  const e = (o && o.error) || {};
  const title = `Bug: ${(e.message || String(e) || "unknown error").replace(/\s+/g, " ")}`.slice(0, 120);
  const fields = { template: "bug.yml", title, result: errorReport(o) };
  if (o && o.plugin) fields.fulla = o.plugin;
  if (o && o.host) fields.photoshop = o.host;
  const query = Object.entries(fields)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `${(o && o.repo) || REPO}/issues/new?${query}`;
}

module.exports = { errorReport, reportBugUrl };
