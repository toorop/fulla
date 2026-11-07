// Panel controller: wires the UI to settings, the pipeline and Photoshop.

const ps = require("./src/photoshop");
const { PROVIDERS, getProvider } = require("./src/providers/index");
const { runGeneration, UserError } = require("./src/pipeline");
const settings = require("./src/settings");
const { toBase64 } = require("./src/bytes");
const { addUsage, estimateCost, formatCost, formatUsd } = require("./src/cost");
const connect = require("./src/connect");
const { filterItems } = require("./src/menu");

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

// The Generate tab shows a hint until the first run, then one card for the last run, just above
// the prompt box: running (stage, seconds, looping bar), done (prompt, model, time, cost), or failed.

/** The message line of the run card; shows the card. */
function setStatus(text, kind) {
  const s = $("status");
  s.textContent = text || "";
  s.className = kind === "error" ? "status error" : "status";
  s.hidden = !text;
  if (text) showCard();
}

function showCard() {
  $("runCard").hidden = false;
  $("runTitle").hidden = !$("runTitle").textContent; // a message outside a run has no title
  renderIdle();
}

function renderIdle() {
  $("idleHint").hidden = !$("runCard").hidden || !$("noProvider").hidden;
}

/** Clear the card for a new run. */
function resetCard(title) {
  $("runTitle").textContent = title;
  $("runStage").textContent = "";
  $("runTime").textContent = "";
  for (const id of ["runMeta", "runCost", "results"]) $(id).hidden = true;
  animateBar(false);
  setStatus("");
  showCard();
}

// Providers report no progress, so the bar loops to show activity rather than a percentage.
let barTimer = null;

function animateBar(on) {
  clearInterval(barTimer);
  barTimer = null;
  $("runProgress").hidden = !on;
  if (!on) return;
  const fill = $("runBarFill");
  let pos = 0;
  barTimer = setInterval(() => {
    const w = $("runBar").getBoundingClientRect().width || 200;
    pos = pos > w ? -w * 0.3 : pos + Math.max(2, w / 60);
    fill.style.marginLeft = `${Math.round(pos)}px`;
  }, 40);
}

/** "Nano Banana 2.1": the catalogue label without its "(recommended)"-style note; a custom ID as is. */
function modelLabel(provider, id) {
  const m = provider.models.find((x) => x.id === id);
  return m ? m.label.replace(/\s*\(.*\)\s*$/, "") : id;
}

// Locked while a run is going: what was sent is what the card shows.
const LOCKED = ["prompt", "testChip", "provider", "model", "customModel", "n", "maxTier", "quality"];

function setBusy(b) {
  busy = b;
  closeMenu();
  const g = $("generate");
  g.textContent = b ? "Cancel" : "Generate";
  g.setAttribute("variant", b ? "secondary" : "cta");
  for (const id of LOCKED) {
    const e = $(id);
    if (e && b) e.setAttribute("disabled", "");
    else if (e) e.removeAttribute("disabled");
  }
}

const TABS = ["generate", "providers"];

/** Show one tab's page. A generation keeps running while another tab is shown. */
function showTab(name) {
  closeMenu();
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

/** "≈ $0.041 · 4,011 tokens · session ≈ $0.120": this run, then since the panel opened. */
function renderCost(run) {
  const session = sessionSpend.priced ? `≈ ${formatUsd(sessionSpend.cost)}` : spendText(sessionSpend);
  $("runCost").textContent = `${spendText(run)} · session ${session}`;
  $("runCost").hidden = false;
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
// The network used by generations; the self-test swaps it for a fake so its runs are free.
const generationNet = { fetch: (url, init) => fetch(url, init) };

async function generate() {
  if (busy) {
    // While running, the button is Cancel. The request already sent can't be recalled,
    // but its result is thrown away and the document is left untouched.
    cancelRequested = true;
    $("runStage").textContent = "Cancelling... the document will not be changed.";
    return;
  }
  const provider = getProvider(prefs.provider);
  const model = currentModel();
  resetCard(provider.name); // the model is named in the stage line: "Generating with Nano Banana 2.1"
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
  animateBar(true);
  const started = Date.now();
  const seconds = () => Math.round((Date.now() - started) / 1000);
  let stage = "Starting";
  const tick = () => {
    if (!cancelRequested) $("runStage").textContent = `${stage}...`;
    $("runTime").textContent = `${seconds()} s`;
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
      fetch: (url, init) => generationNet.fetch(url, init),
      apiKey,
      model,
      modelName: modelLabel(provider, model),
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
    animateBar(false);
    lastRun = { placed: out.placed, count: out.results.length, active: 0 };
    const p = prompt.trim().replace(/\s+/g, " ");
    $("runTitle").textContent = p ? `"${p.length > 120 ? p.slice(0, 119) + "…" : p}"` : "No prompt: remove or fill";
    $("runMeta").textContent = `${modelLabel(provider, model)} · ${prefs.maxTier} · ${seconds()} s`;
    $("runMeta").hidden = false;
    renderThumbs(out.results);
    const notes = [];
    if (out.results.length < prefs.n) notes.push(`${prefs.n - out.results.length} variation(s) were blocked or failed.`);
    if (out.softness > 1.6) notes.push(`Large area: enlarged ${out.softness.toFixed(1)}x, may look soft. Try a higher resolution or a smaller selection.`);
    setStatus(notes.join(" "));
  } catch (e) {
    console.error(e);
    animateBar(false);
    // Once Cancel is clicked, whatever ends the run (often the dropped request) means "cancelled".
    if (cancelRequested) setStatus("Cancelled. Nothing was changed.");
    else {
      const known = e instanceof UserError || e.name === "ProviderError" || e instanceof ps.HostError;
      setStatus(known ? e.message : `Something went wrong: ${e.message || e}`, "error");
    }
  } finally {
    clearInterval(timer);
    setBusy(false);
  }
}

// ---------- floating menu ----------
// Built on open and removed on close (UXP keeps a hidden element's height). It covers the scrolling
// area and stops above the prompt box: the box holds a text field, which UXP may draw over any page
// content. One menu at a time; a click elsewhere in the panel closes it.

let menuChip = null;

function closeMenu() {
  const m = $("menu");
  if (m) m.parentNode.removeChild(m);
  menuChip = null;
}

/**
 * @param {Element} chip   the chip that opened it (clicking it again closes the menu)
 * @param {Array<{label: string, group?: string, note?: string}>} items  in display order, grouped
 * @param {(item: object) => void} onPick
 * @param {string} searchHint
 */
function openMenu(chip, items, onPick, searchHint) {
  closeMenu();
  const app = $("app").getBoundingClientRect();
  const box = $("promptBox").getBoundingClientRect();
  const menu = el("div", { id: "menu", class: "menu" });
  menu.style.bottom = `${Math.round(app.bottom - box.top + 4)}px`;
  const search = el("sp-textfield", { id: "menuSearch", size: "s", placeholder: searchHint });
  const list = el("div", { id: "menuList", class: "menu-list" });
  const render = () => {
    list.innerHTML = "";
    const shown = filterItems(items, search.value);
    let group = null;
    for (const it of shown) {
      if (it.group && it.group !== group) list.appendChild(el("div", { class: "menu-group" }, (group = it.group)));
      const row = el("div", { class: "menu-item" });
      row.appendChild(el("span", {}, it.label));
      if (it.note) row.appendChild(el("span", { class: "note" }, it.note));
      row.addEventListener("click", () => {
        closeMenu();
        onPick(it);
      });
      list.appendChild(row);
    }
    if (!shown.length) list.appendChild(el("div", { class: "menu-empty" }, "No match"));
  };
  search.addEventListener("input", render);
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  menu.appendChild(search);
  menu.appendChild(list);
  render();
  // The list takes the height above the box that the search field leaves, up to 12 px under the
  // top of the panel. UXP lays the menu out only after this function returns, so the fit is
  // corrected once it has (a measurement taken here reads zero heights).
  list.style.maxHeight = `${Math.max(60, Math.round(box.top - app.top - 70))}px`;
  $("app").appendChild(menu);
  setTimeout(() => {
    if ($("menu") !== menu) return;
    const over = app.top + 12 - menu.getBoundingClientRect().top;
    if (over > 0) list.style.maxHeight = `${Math.max(60, Math.round(list.getBoundingClientRect().height - over))}px`;
  }, 50);
  menuChip = chip;
  try {
    search.focus();
  } catch (_) {
    /* focus is a convenience */
  }
}

/** Roadmap 2.1 only: real catalogue names plus filler, to try the menu. Replaced by the model chip in 2.3. */
function testMenuItems() {
  const items = [];
  for (const p of PROVIDERS) for (const m of p.models) items.push({ group: p.name, label: m.label });
  for (let i = 1; i <= 30; i++) items.push({ group: "Filler (makes the list scroll)", label: `Test item ${i}` });
  return items;
}

function toggleTestMenu() {
  const chip = $("testChip");
  if (menuChip === chip) return closeMenu();
  openMenu(chip, testMenuItems(), (it) => setStatus(`Test menu: picked "${it.label}". Nothing changes yet.`), "Search");
}

// ---------- events ----------

function bind() {
  $("testChip").addEventListener("click", toggleTestMenu);
  // A click anywhere else in the panel closes the menu (the chip toggles it itself).
  $("app").addEventListener("click", (e) => {
    const m = $("menu");
    if (m && !m.contains(e.target) && !(menuChip && menuChip.contains(e.target))) closeMenu();
  });
  $("customModel").addEventListener("input", () => {
    prefs.customModel[prefs.provider] = $("customModel").value;
    persist();
  });
  $("generate").addEventListener("click", generate);
  for (const t of TABS) $(`tab-${t}`).addEventListener("click", () => showTab(t));
  $("setupProvider").addEventListener("click", () => showTab("providers"));
  $("connectOpenRouter").addEventListener("click", startConnect);
  $("connectGo").addEventListener("click", finishConnect);
  $("connectReopen").addEventListener("click", openConnectPage);
  $("connectCancel").addEventListener("click", () => endConnect(false));
  $("connectContinue").addEventListener("click", () => endConnect(true));
  $("addCredits").addEventListener("click", () => openBrowser(getProvider("openrouter").creditsUrl, "Fulla opens openrouter.ai so you can add credits."));
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

async function anyKey() {
  for (const p of PROVIDERS) if (await settings.getKey(p.id)) return true;
  return false;
}

/**
 * Rows, plus the first-run state: with no key at all, the welcome screen replaces the OpenRouter row
 * and the Generate tab says a provider is needed. Returns whether any provider has a key.
 */
async function renderProviders() {
  const any = await anyKey();
  $("welcome").hidden = any || connecting;
  $("connect").hidden = !connecting;
  $("providerList").hidden = connecting;
  $("noProvider").hidden = any;
  renderIdle();
  for (const p of PROVIDERS) {
    const key = await settings.getKey(p.id);
    $(`prow-${p.id}`).hidden = !any && p.id === "openrouter";
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
    } else if (p.id === "openrouter") {
      actions.appendChild(button("Connect", startConnect)); // guided, no key to paste
    } else {
      actions.appendChild(button("Add a key", () => openAdd(p)));
    }
    actions.hidden = adding(p);
  }
  return any;
}

async function savedKeys() {
  const keys = {};
  for (const x of PROVIDERS) keys[x.id] = await settings.getKey(x.id);
  return keys;
}

/** The provider picked in Generate must have a key: switch to this one when it has none. */
function useProviderIfNeeded(p, keys) {
  if (keys[prefs.provider]) return;
  prefs.provider = p.id;
  persist();
  buildStaticPickers();
  buildProviderPickers();
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
  const wasFirst = !(await anyKey());
  try {
    await settings.setKey(p.id, value);
  } catch (e) {
    return providerMessage(p, `Couldn't save the key: ${e.message || e}`, "error");
  }
  useProviderIfNeeded(p, await savedKeys());
  closeAdd(p);
  await renderProviders();
  providerMessage(p, warning ? `Saved.${warning}` : "Saved. The key works.", warning ? "error" : undefined);
  if (wasFirst) {
    // The first key: straight to Generate, which is what the user came for.
    showTab("generate");
    setStatus(`${p.name} is connected. Make a selection, then click Generate.${warning}`);
  }
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
  const keys = await savedKeys();
  const other = PROVIDERS.find((x) => keys[x.id]);
  if (other) useProviderIfNeeded(other, keys);
  await renderProviders();
  providerMessage(p, "Key removed.");
}

// ---------- OpenRouter connect ----------
// Guided steps in the Providers tab (see connect.js). The same session (verifier) is reused for 9
// minutes, so "Open the page again" keeps every code the user was shown valid.

let connecting = false;
let connectSession = null;

function randomBytes(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

/** Opens a page in the user's browser; Photoshop asks the user first. Returns an error text or "". */
async function openBrowser(url, why) {
  try {
    const r = await require("uxp").shell.openExternal(url, why);
    return typeof r === "string" ? r : "";
  } catch (e) {
    return String((e && e.message) || e || "refused");
  }
}

function connectMessage(text, kind) {
  const el = $("connectMsg");
  el.textContent = text || "";
  el.className = kind === "error" ? "status error" : "status";
  el.hidden = !text;
}

async function startConnect() {
  connecting = true;
  $("connectSteps").hidden = false;
  $("connectDone").hidden = true;
  $("connectUrl").hidden = true;
  $("connectCode").value = "";
  connectMessage("");
  showTab("providers");
  await renderProviders();
  await openConnectPage();
}

async function openConnectPage() {
  if (!connect.isFresh(connectSession)) connectSession = connect.newSession(randomBytes);
  // Photoshop's consent dialog shows only the end of the address, so this text names the site.
  const err = await openBrowser(connectSession.url, "Fulla opens openrouter.ai so you can connect your account.");
  if (err) {
    connectMessage("The browser didn't open. Copy this address into your browser:", "error");
    $("connectUrl").value = connectSession.url;
    $("connectUrl").hidden = false;
  }
}

async function finishConnect() {
  const code = ($("connectCode").value || "").trim();
  if (!code) return connectMessage("Paste the code shown on the OpenRouter page first.", "error");
  if (!connect.isFresh(connectSession)) return connectMessage('This attempt has expired. Click "Open the page again" and paste the new code.', "error");
  const or = getProvider("openrouter");
  const f = (url, init) => fetch(url, init);
  connectMessage("Connecting...");
  let key;
  try {
    key = await connect.exchangeCode({ fetch: f, code, verifier: connectSession.verifier });
  } catch (e) {
    return connectMessage(e.message || String(e), "error");
  }
  connectSession = null;
  try {
    await settings.setKey("openrouter", key);
  } catch (e) {
    return connectMessage(`Couldn't save the key: ${e.message || e}`, "error");
  }
  $("connectSteps").hidden = true;
  connectMessage("Connected. Activating your key...");
  try {
    await connect.waitUntilActive({ check: () => or.checkKey({ fetch: f, apiKey: key }), sleep: (ms) => new Promise((r) => setTimeout(r, ms)) });
  } catch (e) {
    connectMessage(e.status === 401 ? "Connected, but OpenRouter hasn't activated the key yet. Wait a minute, then click Test." : `Connected, but the key couldn't be checked: ${e.message || e}`, "error");
    $("addCredits").hidden = true;
    $("connectDone").hidden = false;
    return;
  }
  const left = await or.balance({ fetch: f, apiKey: key });
  if (left !== null && left <= 0) {
    connectMessage("Connected. Your OpenRouter account has no credits yet: add some to start ($5 is about 100 images).");
    $("addCredits").hidden = false;
    $("connectDone").hidden = false;
    return;
  }
  await endConnect(true);
}

/** Leave the guide. After a connect, OpenRouter becomes the provider used in Generate. */
async function endConnect(connected) {
  connecting = false;
  connectMessage("");
  if (connected && (await settings.getKey("openrouter"))) {
    prefs.provider = "openrouter";
    persist();
    buildStaticPickers();
    buildProviderPickers();
    await renderProviders();
    showTab("generate");
    return setStatus("OpenRouter is connected. Make a selection, then click Generate.");
  }
  await renderProviders();
}

buildStaticPickers();
buildProviderPickers();
buildProviderRows();
bind();
// First run: no provider yet, so open on the Providers tab and its welcome screen.
renderProviders().then((any) => {
  if (!any) showTab("providers");
});

// Developer self-test hook. selftest.js is left out of release builds, so this is a no-op for users.
try {
  require("./src/selftest").watch({ generationNet });
} catch (_) {
  /* release build */
}
