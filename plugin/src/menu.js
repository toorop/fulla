// Search for the hand-built floating menus (UXP has no picker with a search field).

/**
 * Items whose label or group contains every word of the query, ignoring case; order is kept.
 * @param {Array<{label: string, group?: string}>} items
 * @param {string} query
 */
function filterItems(items, query) {
  const words = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items.slice();
  return items.filter((it) => {
    const text = `${it.label} ${it.group || ""}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

/**
 * The model menu: the catalogue of each provider that has a key, grouped by provider in registry
 * order (OpenRouter first). `checked` marks the model in use.
 * @param {Array<{id, name, models: Array<{id, label, note?}>}>} providers
 * @param {Object<string, boolean>} keyed  provider id → has a key
 * @param {{provider: string, model: string}} current
 */
function modelMenuItems(providers, keyed, current) {
  const items = [];
  for (const p of providers) {
    if (!keyed[p.id]) continue;
    for (const m of p.models) {
      items.push({ group: p.name, label: m.label, note: m.note || "", providerId: p.id, modelId: m.id, checked: current.provider === p.id && current.model === m.id });
    }
  }
  return items;
}

module.exports = { filterItems, modelMenuItems };
