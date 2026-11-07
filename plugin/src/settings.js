// API keys in UXP secure storage (encrypted by the OS); everything else in localStorage.

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

async function getKey(providerId) {
  const s = secure();
  try {
    // Missing keys reject on older hosts and resolve null on Photoshop 26.10+.
    if (s) {
      const v = bytesToString(await s.getItem(`fulla.key.${providerId}`)).trim();
      if (v) return v;
    }
  } catch (_) {
    /* fall through */
  }
  return (localStorage.getItem(`fulla.key.${providerId}`) || "").trim();
}

async function setKey(providerId, value) {
  const v = (value || "").trim();
  const s = secure();
  if (s) {
    if (v) await s.setItem(`fulla.key.${providerId}`, v);
    else {
      try {
        await s.removeItem(`fulla.key.${providerId}`);
      } catch (_) {
        /* older hosts reject when the key was never stored */
      }
      localStorage.removeItem(`fulla.key.${providerId}`); // a copy saved by a host without secure storage
    }
    return "secure";
  }
  // Older hosts without secure storage: keep it local to this machine's plugin data.
  if (v) localStorage.setItem(`fulla.key.${providerId}`, v);
  else localStorage.removeItem(`fulla.key.${providerId}`);
  return "local";
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
