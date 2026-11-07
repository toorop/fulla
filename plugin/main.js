// Panel controller: wires the UI to settings, the pipeline and Photoshop.

const ps = require("./src/photoshop");
const { PROVIDERS, getProvider } = require("./src/providers/index");
const { runGeneration, UserError } = require("./src/pipeline");
const settings = require("./src/settings");
const { toBase64 } = require("./src/bytes");
const { addUsage, estimateCost, formatCost } = require("./src/cost");

const $ = (id) => document.getElementById(id);
const CUSTOM = "__custom__";
const TIERS = [
  { id: "1K", label: "1K (fast)" },
  { id: "2K", label: "2K" },
  { id: "4K", label: "4K (slow, costly)" },
];

let prefs = settings.loadPrefs();
let busy = false;
let lastRun = null; // { placed, count, active }
const sessionSpend = newSpend(); // since the panel was opened

// ---------- pickers ----------
// Photoshop's sp-picker breaks ("locks") if its own menu is rebuilt while it is closing, so a picker's
// items are never changed after creation. Lists that depend on the provider are replaced with a fresh
// picker element, after the event that triggered it has finished.

const N_ITEMS = [1, 2, 3, 4].map((n) => ({ id: n, label: String(n) }));

function makePicker(id, items, selected, onChange) {
  const old = $(id);
  const picker = document.createElement("sp-picker");
  picker.id = id;
  picker.setAttribute("size", "s");
  const menu = document.createElement("sp-menu");
  menu.setAttribute("slot", "options");
  items.forEach((it) => {
    const mi = document.createElement("sp-menu-item");
    mi.setAttribute("value", String(it.id));
    mi.textContent = it.label;
    if (it.id === selected) mi.setAttribute("selected", "");
    menu.appendChild(mi);
  });
  picker.appendChild(menu);
  picker.addEventListener("change", () => {
    const i = picker.selectedIndex;
    if (i >= 0 && i < items.length) onChange(items[i].id);
  });
  old.parentNode.replaceChild(picker, old);
  const idx = items.findIndex((it) => it.id === selected);
  if (idx >= 0) picker.selectedIndex = idx;
  return picker;
}

function modelItems(provider) {
  return [...provider.models.map((m) => ({ id: m.id, label: m.label })), { id: CUSTOM, label: "Custom model ID..." }];
}

function currentModel() {
  const id = prefs.models[prefs.provider];
  if (id === CUSTOM) return (prefs.customModel[prefs.provider] || "").trim();
  return id;
}

function buildStaticPickers() {
  makePicker("provider", PROVIDERS.map((p) => ({ id: p.id, label: p.name })), prefs.provider, (id) => {
    if (id === prefs.provider) return;
    prefs.provider = id;
    persist();
    setTimeout(buildProviderPickers, 0); // after the provider picker has closed
  });
  makePicker("n", N_ITEMS, prefs.n, (n) => {
    prefs.n = n;
    persist();
  });
  makePicker("maxTier", TIERS, prefs.maxTier, (t) => {
    prefs.maxTier = t;
    persist();
  });
}

/** Model and quality lists depend on the provider. */
function buildProviderPickers() {
  const provider = getProvider(prefs.provider);
  if (!provider.models.some((m) => m.id === prefs.models[provider.id]) && prefs.models[provider.id] !== CUSTOM) {
    prefs.models[provider.id] = provider.defaultModel;
  }
  makePicker("model", modelItems(provider), prefs.models[provider.id], (id) => {
    prefs.models[provider.id] = id;
    persist();
    $("customModelRow").hidden = id !== CUSTOM;
  });
  $("customModelRow").hidden = prefs.models[provider.id] !== CUSTOM;
  $("customModel").value = prefs.customModel[provider.id] || "";
  $("qualityCell").hidden = !provider.qualities;
  if (provider.qualities) {
    if (!provider.qualities.includes(prefs.quality)) prefs.quality = provider.qualities[0];
    makePicker("quality", provider.qualities.map((q) => ({ id: q, label: q[0].toUpperCase() + q.slice(1) })), prefs.quality, (q) => {
      prefs.quality = q;
      persist();
    });
  }
}

// ---------- render ----------

function setStatus(text, kind) {
  const el = $("status");
  el.textContent = text || "";
  el.className = kind === "error" ? "status error" : "status";
}

function setBusy(b) {
  busy = b;
  const g = $("generate");
  g.textContent = b ? "Cancel" : "Generate";
  g.setAttribute("variant", b ? "secondary" : "cta");
}

const TABS = ["generate", "providers"];

/** Show one tab's page. A generation keeps running while another tab is shown. */
function showTab(name) {
  for (const t of TABS) {
    $(`page-${t}`).hidden = t !== name;
    $(`tab-${t}`).className = t === name ? "tab active" : "tab";
  }
  if (name === "providers") renderProviders();
}

function persist() {
  settings.savePrefs(prefs);
}

// ---------- cost ----------
// Estimated from the tokens each reply reports. Replies count even when the run is then cancelled
// or a variation is blocked, because the provider may still bill them.

function newSpend() {
  return { usage: null, cost: 0, priced: false, unpriced: false };
}

function addSpend(spend, usage, cost) {
  spend.usage = addUsage(spend.usage, usage);
  if (cost == null) spend.unpriced = true;
  else {
    spend.cost += cost;
    spend.priced = true;
  }
}

function spendText(spend) {
  const text = formatCost(spend.priced ? spend.cost : null, spend.usage);
  return spend.priced && spend.unpriced ? `${text} (custom models not priced)` : text;
}

function renderCost(run) {
  $("costRun").textContent = `This run: ${spendText(run)}`;
  $("costSession").textContent = `Since the panel opened: ${spendText(sessionSpend)}`;
  $("cost").hidden = false;
}

// ---------- results ----------

function dataUrl(r) {
  return `data:${r.mime || "image/png"};base64,${toBase64(r.bytes)}`;
}

function renderThumbs(results) {
  const box = $("thumbs");
  box.innerHTML = "";
  $("results").hidden = results.length < 2;
  results.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = i === lastRun.active ? "thumb active" : "thumb";
    const img = document.createElement("img");
    img.src = dataUrl(r);
    div.appendChild(img);
    div.addEventListener("click", () => chooseVariation(i));
    box.appendChild(div);
  });
}

async function chooseVariation(i) {
  if (!lastRun || busy || i === lastRun.active) return;
  try {
    await ps.showVariation(lastRun.placed, i);
    lastRun.active = i;
    document.querySelectorAll(".thumb").forEach((t, k) => (t.className = k === i ? "thumb active" : "thumb"));
  } catch (e) {
    setStatus(`Couldn't switch variation: ${e.message || e}`, "error");
  }
}

// ---------- generate ----------

let cancelRequested = false;

async function generate() {
  if (busy) {
    // While running, the button is Cancel. The request already sent can't be recalled,
    // but its result is thrown away and the document is left untouched.
    cancelRequested = true;
    setStatus("Cancelling... the document will not be changed.");
    return;
  }
  const provider = getProvider(prefs.provider);
  const model = currentModel();
  if (!model) return setStatus("Enter a model ID first.", "error");
  const apiKey = await settings.getKey(provider.id);
  if (!apiKey) {
    const msg = `Add your ${provider.name} API key first.`;
    setStatus(msg, "error");
    showTab("providers");
    return providerMessage(provider, msg, "error");
  }
  const prompt = $("prompt").value || "";
  if (prompt.length > 4000) return setStatus("Prompt is too long (4,000 characters max).", "error");

  cancelRequested = false;
  setBusy(true);
  const started = Date.now();
  let stage = "Starting";
  const tick = () => {
    if (!cancelRequested) setStatus(`${stage}... ${Math.round((Date.now() - started) / 1000)}s`);
  };
  tick();
  const timer = setInterval(tick, 1000);
  const runSpend = newSpend();
  const onUsage = (usage) => {
    const cost = estimateCost(model, usage);
    addSpend(runSpend, usage, cost);
    addSpend(sessionSpend, usage, cost);
    renderCost(runSpend);
  };
  try {
    const out = await runGeneration({
      ps,
      provider,
      fetch: (url, init) => fetch(url, init),
      apiKey,
      model,
      prompt,
      n: prefs.n,
      quality: prefs.quality,
      maxTier: prefs.maxTier,
      progress: (label) => {
        stage = label;
        tick();
      },
      cancelled: () => cancelRequested,
      onUsage,
    });
    lastRun = { placed: out.placed, count: out.results.length, active: 0 };
    renderThumbs(out.results);
    let msg = `Done in ${Math.round((Date.now() - started) / 1000)}s.`;
    if (out.results.length < prefs.n) msg += ` ${prefs.n - out.results.length} variation(s) were blocked or failed.`;
    if (out.softness > 1.6) msg += ` Large area: enlarged ${out.softness.toFixed(1)}x, may look soft. Try a higher resolution or a smaller selection.`;
    setStatus(msg);
  } catch (e) {
    console.error(e);
    const known = e instanceof UserError || e.name === "ProviderError" || e instanceof ps.HostError;
    setStatus(known ? e.message : `Something went wrong: ${e.message || e}`, "error");
  } finally {
    clearInterval(timer);
    setBusy(false);
  }
}

// ---------- events ----------

function bind() {
  $("customModel").addEventListener("input", () => {
    prefs.customModel[prefs.provider] = $("customModel").value;
    persist();
  });
  $("generate").addEventListener("click", generate);
  for (const t of TABS) $(`tab-${t}`).addEventListener("click", () => showTab(t));
}

// ---------- providers tab ----------
// One row per provider: its state as readable text, then Test / Remove, or Add a key. The key field
// only exists while adding a key and has no placeholder (UXP masks a password field's placeholder
// too, so its length would show); once saved, the key is never put back in the page.

function el(tag, attrs = {}, text) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

// Action buttons: Spectrum's regular-weight button (sp-button labels are bold).
function button(label, onClick) {
  const b = el("sp-action-button", { size: "s" }, label);
  b.addEventListener("click", onClick);
  return b;
}

function providerMessage(p, text, kind) {
  const m = $(`pmsg-${p.id}`);
  m.textContent = text || "";
  m.className = kind === "error" ? "pmsg status error" : "pmsg status";
  m.hidden = !text;
}

function buildProviderRows() {
  const list = $("providerList");
  for (const p of PROVIDERS) {
    const row = el("div", { id: `prow-${p.id}`, class: "prow" });
    const head = el("div", { class: "prow-head" });
    head.appendChild(el("span", {}, p.name));
    head.appendChild(el("span", { id: `pstate-${p.id}`, class: "pstate" }));
    row.appendChild(head);
    row.appendChild(el("div", { id: `pkey-${p.id}`, class: "hint" }));
    row.appendChild(el("div", { id: `pactions-${p.id}`, class: "row" }));
    // Filled only while a key is being added (see openAdd): hiding it instead left its height behind.
    row.appendChild(el("div", { id: `padd-${p.id}`, class: "padd" }));
    const msg = el("div", { id: `pmsg-${p.id}`, class: "pmsg status" });
    row.appendChild(msg);
    list.appendChild(row);
    list.appendChild(el("sp-divider", { size: "small" }));
    msg.hidden = true;
  }
}

const adding = (p) => $(`padd-${p.id}`).children.length > 0;

async function renderProviders() {
  for (const p of PROVIDERS) {
    const key = await settings.getKey(p.id);
    const state = $(`pstate-${p.id}`);
    state.textContent = key ? "Connected" : "No key";
    state.className = key ? "pstate on" : "pstate";
    $(`pkey-${p.id}`).textContent = key ? `Key ...${key.slice(-4)}` : "";
    $(`pkey-${p.id}`).hidden = !key;
    const actions = $(`pactions-${p.id}`);
    actions.innerHTML = "";
    if (key) {
      actions.appendChild(button("Test", () => testKey(p)));
      actions.appendChild(button("Remove", () => removeKey(p)));
    } else {
      actions.appendChild(button("Add a key", () => openAdd(p)));
    }
    actions.hidden = adding(p);
  }
}

function openAdd(p) {
  const add = $(`padd-${p.id}`);
  add.innerHTML = "";
  add.appendChild(el("sp-label", {}, `Paste your ${p.name} API key`));
  const line = el("div", { class: "row" });
  line.appendChild(el("sp-textfield", { id: `key-${p.id}`, type: "password" }));
  line.appendChild(button("Save", () => saveKey(p)));
  line.appendChild(button("Cancel", () => closeAdd(p)));
  add.appendChild(line);
  add.appendChild(el("div", { class: "hint" }, `${p.tagline ? `${p.tagline} ` : ""}Get one at ${p.keyHelp}`));
  $(`pactions-${p.id}`).hidden = true;
  providerMessage(p, "");
}

function closeAdd(p) {
  $(`padd-${p.id}`).innerHTML = ""; // removes the field and whatever was typed in it
  $(`pactions-${p.id}`).hidden = false;
}

/** Check the key with one free request before saving it. Refused keys are not saved. */
async function saveKey(p) {
  const value = ($(`key-${p.id}`).value || "").trim();
  if (!value) return providerMessage(p, "Paste a key first.", "error");
  providerMessage(p, "Checking the key...");
  let warning = "";
  try {
    await p.checkKey({ fetch: (url, init) => fetch(url, init), apiKey: value });
  } catch (e) {
    if (e.code !== "network") return providerMessage(p, e.message || String(e), "error");
    warning = ` Couldn't check it yet: ${e.message}`; // offline: keep the key, say so
  }
  try {
    await settings.setKey(p.id, value);
  } catch (e) {
    return providerMessage(p, `Couldn't save the key: ${e.message || e}`, "error");
  }
  closeAdd(p);
  await renderProviders();
  providerMessage(p, warning ? `Saved.${warning}` : "Saved. The key works.", warning ? "error" : undefined);
}

async function testKey(p) {
  const key = await settings.getKey(p.id);
  if (!key) return renderProviders();
  providerMessage(p, "Checking the key...");
  try {
    await p.checkKey({ fetch: (url, init) => fetch(url, init), apiKey: key });
    providerMessage(p, "The key works.");
  } catch (e) {
    providerMessage(p, e.message || String(e), "error");
  }
}

async function removeKey(p) {
  try {
    await settings.setKey(p.id, "");
  } catch (e) {
    return providerMessage(p, `Couldn't remove the key: ${e.message || e}`, "error");
  }
  await renderProviders();
  providerMessage(p, "Key removed.");
}

buildStaticPickers();
buildProviderPickers();
buildProviderRows();
bind();
renderProviders();

// Developer self-test hook. selftest.js is left out of release builds, so this is a no-op for users.
try {
  require("./src/selftest").watch();
} catch (_) {
  /* release build */
}
