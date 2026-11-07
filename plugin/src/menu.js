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

module.exports = { filterItems };
