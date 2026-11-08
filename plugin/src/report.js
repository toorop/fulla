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

module.exports = { errorReport };
