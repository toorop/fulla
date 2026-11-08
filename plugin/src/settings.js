// API keys in UXP secure storage (encrypted by the OS), never in plain text; everything else in localStorage.

const PREFS_KEY = "fulla.prefs.v1";

const DEFAULTS = {
  provider: "openrouter",
  models: { openrouter: "google/gemini-nano-banana-2.1", openai: "gpt-image-2.5-sunburst", gemini: "gemini-nano-banana-2.1" },
  n: 1,
  quality: "auto",
  resolution: "auto", // or "1K" / "2K" / "4K" when the model offers it
};

function secure() {
  try {
    const s = require("uxp").storage.secureStorage;
    return s && typeof s.getItem === "function" ? s : null;
  } catch (_) {
    return null;
  }
}

function bytesToString(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  let s = "";
  for (let i = 0; i < v.length; i++) s += String.fromCharCode(v[i]);
  try {
    return decodeURIComponent(escape(s));
  } catch (_) {
    return s;
  }
}

/**
 * The saved key, or "". A plain-text copy left in localStorage by an early build is moved into
 * secure storage once, then erased.
 */
async function getKey(providerId) {
  const name = `fulla.key.${providerId}`;
  const s = secure();
  if (!s) return "";
  let v = "";
  try {
    v = bytesToString(await s.getItem(name)).trim();
  } catch (_) {
    /* a missing key may reject instead of resolving null */
  }
  const old = (localStorage.getItem(name) || "").trim();
  if (old) {
    if (!v) {
      await s.setItem(name, old);
      v = old;
    }
    localStorage.removeItem(name);
  }
  return v;
}

/** Save a key in secure storage, or remove it when `value` is empty. Never writes it in plain text. */
async function setKey(providerId, value) {
  const name = `fulla.key.${providerId}`;
  const v = (value || "").trim();
  const s = secure();
  if (!s) throw new Error("This Photoshop has no secure storage for keys. Update Photoshop and try again.");
  localStorage.removeItem(name); // any plain-text copy from an early build
  if (v) await s.setItem(name, v);
  else {
    try {
      await s.removeItem(name);
    } catch (_) {
      /* removing a key that was never stored may reject */
    }
  }
}

function loadPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    const prefs = { ...DEFAULTS, ...raw, models: { ...DEFAULTS.models, ...(raw.models || {}) } };
    delete prefs.customModel; // custom model IDs are gone (2026-11-07); such a choice falls back to the default model
    delete prefs.maxTier; // the old size cap (until 2026-11-07); "resolution" starts at Auto
    return prefs;
  } catch (_) {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (_) {
    /* non-fatal */
  }
}

module.exports = { getKey, setKey, loadPrefs, savePrefs, DEFAULTS };
