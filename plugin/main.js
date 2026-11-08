// Panel controller: wires the UI to settings, the pipeline and Photoshop.

const ps = require("./src/photoshop");
const { PROVIDERS, getProvider } = require("./src/providers/index");
const { runGeneration, UserError } = require("./src/pipeline");
const settings = require("./src/settings");
const { toBase64 } = require("./src/bytes");
const { addUsage, estimateCost, formatCost, formatUsd } = require("./src/cost");
const connect = require("./src/connect");
const { filterItems, modelMenuItems } = require("./src/menu");
const { helpMenu } = require("./src/help");

const $ = (id) => document.getElementById(id);
let prefs = settings.loadPrefs();
let busy = false;
let lastRun = null; // { placed, results, active }: the last run's layer and its variations
const sessionSpend = newSpend(); // since the panel was opened

// ---------- chips ----------

/** The model in use: the provider's saved choice, or its default when that is no longer in the catalogue. */
function currentModel() {
  const provider = getProvider(prefs.provider);
  if (!provider.models.some((m) => m.id === prefs.models[provider.id])) prefs.models[provider.id] = provider.defaultModel;
  return prefs.models[provider.id];
}

/** What the options sheet offers for the model in use: sizes besides Auto (none when only one), qualities. */
function currentOffer() {
  const provider = getProvider(prefs.provider);
  const sizes = provider.resolutions ? provider.resolutions(currentModel()) : [];
  return { resolutions: sizes.length > 1 ? sizes : [], qualities: provider.qualities || null };
}

/** The size actually asked for: the saved choice when this model offers it, else Auto. */
function currentResolution() {
  return currentOffer().resolutions.includes(prefs.resolution) ? prefs.resolution : "auto";
}

/** The model button: the provider's badge ("OR", "G", "OA": a model may come from several providers) and the model's name. */
function renderChips() {
  const provider = getProvider(prefs.provider);
  $("modelBadge").textContent = provider.badge;
  $("modelName").textContent = modelLabel(provider, currentModel());
  const offer = currentOffer();
  if (offer.qualities && !offer.qualities.includes(prefs.quality)) prefs.quality = offer.qualities[0];
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
  for (const id of ["runDone", "runCost", "results"]) $(id).hidden = true;
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

/** "Nano Banana 2.1": the catalogue name. */
function modelLabel(provider, id) {
  const m = provider.models.find((x) => x.id === id);
  return m ? m.label : id;
}

// Locked while a run is going: what was sent is what the card shows.
const LOCKED = ["prompt", "modelChip", "optionsChip"];

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
  return spend.priced && spend.unpriced ? `${text} (some replies not priced)` : text;
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
    await ps.showVariation(lastRun.placed, lastRun.results[i]);
    lastRun.active = i;
    document.querySelectorAll(".thumb").forEach((t, k) => (t.className = k === i ? "thumb active" : "thumb"));
  } catch (e) {
    setStatus(`Couldn't switch variation: ${e.message || e}`, "error");
  }
}

/** Done: the result stays in the document; the card, its thumbnails and the prompt are cleared. */
function finishRun() {
  lastRun = null;
  $("runCard").hidden = true;
  $("thumbs").innerHTML = "";
  $("prompt").value = "";
  renderIdle();
}

// ---------- generate ----------

let cancelRequested = false;

// "Open a document first" / "Make a selection first" go away by themselves once the user has done
// it: the panel checks Photoshop every second while such a message shows (a cheap read).
let readyWatch = null;

function stopReadyWatch() {
  clearInterval(readyWatch);
  readyWatch = null;
}

function watchUntilReady(code) {
  stopReadyWatch();
  readyWatch = setInterval(async () => {
    if (busy) return stopReadyWatch();
    try {
      const doc = await ps.getDocument();
      const ready = doc && (code === "noDocument" || (await ps.getSelectionBounds(doc.id)));
      if (!ready) return;
      stopReadyWatch();
      $("runCard").hidden = true; // the card held only this message
      renderIdle();
    } catch (_) {
      /* try again next second */
    }
  }, 1000);
}
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
  stopReadyWatch();
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
      resolution: currentResolution(),
      progress: (label) => {
        stage = label;
        tick();
      },
      cancelled: () => cancelRequested,
      onUsage,
    });
    animateBar(false);
    lastRun = { placed: out.placed, results: out.results, active: 0 };
    // The prompt is still in the box above, so the card names the model, size and time instead.
    const size = out.target.imageSize || `${out.target.width}×${out.target.height}`;
    $("runTitle").textContent = `${modelLabel(provider, model)} · ${size} · ${seconds()} s`;
    // Done clears the thumbnails once one is chosen; with a single result there is nothing to choose.
    $("runDone").hidden = out.results.length < 2;
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
      if (e.code === "noSelection" || e.code === "noDocument") watchUntilReady(e.code);
    }
  } finally {
    clearInterval(timer);
    setBusy(false);
  }
}

// ---------- floating menu ----------
// Built on open and removed on close (UXP keeps a hidden element's height). It opens under the
// prompt box, over the last run, and never over the box: the box holds a text field, which UXP may
// draw over any page content. One menu at a time; a click elsewhere in the panel closes it.

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
  menu.style.top = `${Math.round(box.bottom - app.top + 4)}px`;
  const search = el("sp-textfield", { id: "menuSearch", size: "s", placeholder: searchHint });
  const list = el("div", { id: "menuList", class: "menu-list" });
  let shown = [];
  const pick = (it) => {
    closeMenu();
    onPick(it);
  };
  const render = () => {
    list.innerHTML = "";
    shown = filterItems(items, search.value);
    let group = null;
    for (const it of shown) {
      if (it.group && it.group !== group) list.appendChild(el("div", { class: "menu-group" }, (group = it.group)));
      const row = el("div", { class: "menu-item" });
      row.appendChild(el("span", { class: "check" }, it.checked ? "✓" : ""));
      row.appendChild(el("span", { class: "grow" }, it.label));
      if (it.note) row.appendChild(el("span", { class: "note" }, it.note));
      row.addEventListener("click", () => pick(it));
      list.appendChild(row);
    }
    if (!shown.length) list.appendChild(el("div", { class: "menu-empty" }, "No match"));
  };
  search.addEventListener("input", render);
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
    if (e.key === "Enter" && shown.length) pick(shown[0]);
  });
  menu.appendChild(search);
  menu.appendChild(list);
  render();
  // The list takes the height under the box that the search field leaves, down to 12 px above the
  // bottom of the panel. UXP lays the menu out only after this function returns, so the fit is
  // corrected once it has (a measurement taken here reads zero heights).
  list.style.maxHeight = `${Math.max(60, Math.round(app.bottom - box.bottom - 70))}px`;
  $("app").appendChild(menu);
  setTimeout(() => {
    if ($("menu") !== menu) return;
    const over = menu.getBoundingClientRect().bottom - (app.bottom - 12);
    if (over > 0) list.style.maxHeight = `${Math.max(60, Math.round(list.getBoundingClientRect().height - over))}px`;
  }, 50);
  menuChip = chip;
  try {
    search.focus();
  } catch (_) {
    /* focus is a convenience */
  }
}

// ---------- settings popup ----------
// The settings button opens one popup, in the floating spot the model menu uses (one at a time,
// closed by a click elsewhere), with a row of buttons per setting the model in use offers a real
// choice for. It stays open while choosing.

/** What Auto does, under the Resolution row: it goes up to 4K unless the provider caps Auto lower. */
function autoHint(provider, sizes) {
  const max = provider.autoMax || "4K";
  const top = sizes.includes(max) ? max : sizes[sizes.length - 1];
  const slow = top === "4K" ? " (slower and costs more)" : "";
  if (top === "2K") return "Auto uses 2K, for results as sharp as your photo. Pick a size to always use it.";
  return `Auto uses 2K, or more for a large selection, up to ${top}${slow}. Pick a size to always use it.`;
}

/** The popup's rows, in order; a setting the model has no choice for is left out. */
function optionRows() {
  const offer = currentOffer();
  const cap = (q) => q[0].toUpperCase() + q.slice(1);
  const rows = [];
  if (offer.resolutions.length) {
    rows.push({
      id: "optResolution",
      title: "Resolution",
      values: [{ id: "auto", label: "Auto" }, ...offer.resolutions.map((r) => ({ id: r, label: r }))],
      current: currentResolution(),
      set: (r) => (prefs.resolution = r),
      hint: autoHint(getProvider(prefs.provider), offer.resolutions),
    });
  }
  rows.push({
    id: "optVariations",
    title: "Variations",
    values: [1, 2, 3, 4].map((n) => ({ id: n, label: String(n) })),
    current: prefs.n,
    set: (n) => (prefs.n = n),
    hint: "Each variation is billed.",
  });
  if (offer.qualities) {
    rows.push({ id: "optQuality", title: "Quality", values: offer.qualities.map((q) => ({ id: q, label: cap(q) })), current: prefs.quality, set: (q) => (prefs.quality = q) });
  }
  return rows;
}

function fillSheet(sheet) {
  const body = sheet.querySelector(".sheet-body");
  body.innerHTML = "";
  for (const r of optionRows()) {
    const row = el("div", { id: r.id, class: "opt" });
    row.appendChild(el("div", { class: "opt-title" }, r.title));
    const seg = el("div", { class: "seg" });
    for (const v of r.values) {
      const b = el("div", { class: v.id === r.current ? "seg-btn on" : "seg-btn", "data-value": String(v.id) }, v.label);
      b.addEventListener("click", () => {
        r.set(v.id);
        persist();
        renderChips();
        fillSheet(sheet);
      });
      seg.appendChild(b);
    }
    row.appendChild(seg);
    if (r.hint) row.appendChild(el("div", { class: "hint" }, r.hint));
    body.appendChild(row);
  }
}

function toggleSettings() {
  const chip = $("optionsChip");
  if (busy) return;
  if (menuChip === chip) return closeMenu();
  closeMenu();
  const app = $("app").getBoundingClientRect();
  const box = $("promptBox").getBoundingClientRect();
  // The border is on the popup, the scrolling on its body: UXP drops the bottom border of a box
  // that scrolls itself.
  const sheet = el("div", { id: "menu", class: "menu sheet" });
  sheet.style.top = `${Math.round(box.bottom - app.top + 4)}px`;
  const body = el("div", { class: "sheet-body" });
  body.style.maxHeight = `${Math.max(80, Math.round(app.bottom - box.bottom - 30))}px`;
  sheet.appendChild(body);
  fillSheet(sheet);
  $("app").appendChild(sheet);
  menuChip = chip;
}

// ---------- prompt height ----------
// The handle under the prompt drags its height (40 to 400 px); the height is remembered.

function bindGrip() {
  const grip = $("promptGrip");
  const area = $("prompt");
  if (prefs.promptHeight) area.style.height = `${prefs.promptHeight}px`;
  let drag = null;
  // The height is kept from the drag itself: UXP updates an element's measured size only later.
  const move = (e) => {
    if (!drag) return;
    drag.now = Math.max(40, Math.min(400, Math.round(drag.h + e.clientY - drag.y)));
    area.style.height = `${drag.now}px`;
  };
  const end = () => {
    if (!drag) return;
    if (drag.now) {
      prefs.promptHeight = drag.now;
      persist();
    }
    drag = null;
  };
  grip.addEventListener("pointerdown", (e) => {
    closeMenu(); // an open menu or popup sits under the old prompt height
    drag = { y: e.clientY, h: area.getBoundingClientRect().height };
    try {
      grip.setPointerCapture(e.pointerId); // keeps the drag even over the text field
    } catch (_) {
      /* the document listeners below still follow the pointer */
    }
  });
  for (const t of [grip, document]) {
    t.addEventListener("pointermove", move);
    t.addEventListener("pointerup", end);
  }
}

/** The model chip: one menu for every model of every provider that has a key. */
async function toggleModelMenu() {
  const chip = $("modelChip");
  if (busy) return;
  if (menuChip === chip) return closeMenu();
  const keys = await savedKeys();
  const keyed = {};
  for (const id of Object.keys(keys)) keyed[id] = !!keys[id];
  const items = modelMenuItems(PROVIDERS, keyed, { provider: prefs.provider, model: currentModel() });
  if (!items.length) return showTab("providers");
  openMenu(chip, items, (it) => {
    prefs.provider = it.providerId;
    prefs.models[it.providerId] = it.modelId;
    persist();
    renderChips();
  }, "Search models");
}

// ---------- events ----------

function bind() {
  $("modelChip").addEventListener("click", toggleModelMenu);
  $("optionsChip").addEventListener("click", toggleSettings);
  $("runDone").addEventListener("click", finishRun);
  bindGrip();
  // A click anywhere else in the panel closes the menu (the chip toggles it itself).
  $("app").addEventListener("click", (e) => {
    const m = $("menu");
    if (m && !m.contains(e.target) && !(menuChip && menuChip.contains(e.target))) closeMenu();
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
/**
 * The outlined button of the Generate tab (class "obtn"), for one look across the panel.
 * `icon` (icons/<name>.svg) only where it tells something: external (opens the browser), check
 * (Test), trash (Remove), plus (add); form buttons (Save, Cancel...) stay text.
 */
function button(label, onClick, icon) {
  const b = el("div", { class: "obtn" });
  const inner = el("div", { class: "obtn-in" });
  if (icon) inner.appendChild(el("img", { class: "ico", src: `icons/${icon}.svg`, width: "12", height: "12" }));
  inner.appendChild(el("span", {}, label));
  b.appendChild(inner);
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
      actions.appendChild(button("Test", () => testKey(p), "check"));
      actions.appendChild(button("Remove", () => removeKey(p), "trash"));
    } else if (p.id === "openrouter") {
      actions.appendChild(button("Connect", startConnect, "plus")); // guided, no key to paste
    } else {
      actions.appendChild(button("Add a key", () => openAdd(p), "plus"));
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
  renderChips();
}

function openAdd(p) {
  const add = $(`padd-${p.id}`);
  add.innerHTML = "";
  // First the page where the key is created, then the field to paste it in.
  const site = p.keyHelp.split("/")[0];
  const get = el("div", { class: "row" });
  get.appendChild(
    button(
      `Get a key on ${site}`,
      async () => {
        const err = await openBrowser(`https://${p.keyHelp}`, `Fulla opens ${site} so you can create a ${p.name} API key.`);
        if (err) providerMessage(p, `Couldn't open the browser (${err}). Go to ${p.keyHelp}`, "error");
      },
      "external"
    )
  );
  add.appendChild(get);
  if (p.keyNote) add.appendChild(el("div", { class: "hint" }, p.keyNote));
  add.appendChild(el("sp-label", {}, "Then paste it here"));
  const line = el("div", { class: "row" });
  line.appendChild(el("sp-textfield", { id: `key-${p.id}`, type: "password" }));
  line.appendChild(button("Save", () => saveKey(p)));
  line.appendChild(button("Cancel", () => closeAdd(p)));
  add.appendChild(line);
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
      renderChips();
    await renderProviders();
    showTab("generate");
    return setStatus("OpenRouter is connected. Make a selection, then click Generate.");
  }
  await renderProviders();
}

// The panel's ≡ menu (Photoshop's place for help): docs, bug report, model request, about.
// Set up once, when the plugin loads. The outcome is kept for the self-test.
const panelMenu = { ok: false, error: "" };
function setupPanelMenu() {
  let version = "";
  try {
    version = require("uxp").versions.plugin || ""; // empty in development builds
  } catch (_) {
    /* the About entry then shows no version */
  }
  const items = helpMenu(version);
  try {
    require("uxp").entrypoints.setup({
      panels: {
        fullaPanel: {
          // UXP refuses a panel entry without create or show (found 2026-11-07); the panel's page
          // is index.html itself, so there is nothing to do here.
          show() {},
          menuItems: items.map((it) => ({ id: it.id, label: it.label })),
          invokeMenu(id) {
            const it = items.find((x) => x.id === id);
            if (it) openBrowser(it.url, "Fulla opens its page on github.com.");
          },
        },
      },
    });
    panelMenu.ok = true;
  } catch (e) {
    panelMenu.error = String((e && e.message) || e);
    console.error("Fulla: panel menu not set up", e);
  }
}

setupPanelMenu();
renderChips();
buildProviderRows();
bind();
// First run: no provider yet, so open on the Providers tab and its welcome screen.
renderProviders().then((any) => {
  if (!any) showTab("providers");
});

// Developer self-test hook. selftest.js is left out of release builds, so this is a no-op for users.
try {
  require("./src/selftest").watch({ generationNet, openMenu, closeMenu, panelMenu });
} catch (_) {
  /* release build */
}
