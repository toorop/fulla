// Developer self-test, run inside real Photoshop. Not shipped: scripts/package.js leaves this file out.
//
// Trigger: drop selftest.json into the plugin's data folder
//   (%APPDATA%\Adobe\UXP\PluginsStorage\<host>\<ver>\Developer|External\<id>\PluginData, see CLAUDE.md). The panel picks it up within
//   a few seconds, runs every scenario on throwaway documents, and writes selftest\result.json plus PNG
//   snapshots next to it. selftest.json may contain {"only": ["fill", ...]} or {"live": "openrouter"|"openai"|"gemini", "model": "<optional model id>"}.
//
// Scenarios use a stand-in AI provider that returns a position-encoded gradient (R = x, G = y), so every
// probe can check that the result landed exactly where it should, at any resolution or bit depth.

const { app, action, constants } = require("photoshop");
const uxp = require("uxp");
const ps = require("./photoshop");
const { runGeneration, layerName } = require("./pipeline");
const openai = require("./providers/openai");
const gemini = require("./providers/gemini");
const openrouter = require("./providers/openrouter");
const { PROVIDERS } = require("./providers/index");
const { estimateCost } = require("./cost");
const settings = require("./settings");
const { encodePng } = require("./png");
const { toRGB } = require("./image");

const lfs = uxp.storage.localFileSystem;
const formats = uxp.storage.formats;
const px = (v) => ({ _unit: "pixelsUnit", _value: v });
const SELECTION = { _ref: "channel", _property: "selection" };
const RED = [255, 0, 0];
const BLUE = [0, 0, 255];

// ---------- images from the stand-in provider ----------

function gradientPng(w, h) {
  const p = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3;
      p[o] = Math.round((x * 255) / (w - 1));
      p[o + 1] = Math.round((y * 255) / (h - 1));
      p[o + 2] = 0;
    }
  }
  return encodePng(p, w, h, 3);
}

function solidPng(w, h, rgb) {
  const p = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) p.set(rgb, i * 3);
  return encodePng(p, w, h, 3);
}

/** Stand-in AI provider. Variation 1 is the gradient, others solid colours. */
function mockProvider({ base = openai, colors = [null, [0, 255, 0], [255, 255, 0], [0, 255, 255]], scale = 1, garbage = false } = {}) {
  const m = {
    name: "Mock",
    requests: [],
    fitSize: base.fitSize,
    async generate(req) {
      m.requests.push(req);
      if (garbage) return [{ bytes: Uint8Array.of(1, 2, 3, 4, 5), mime: "image/png" }];
      const W = Math.round(req.target.width * scale);
      const H = Math.round(req.target.height * scale);
      m.outSize = { W, H };
      return Array.from({ length: req.n }, (_, i) => ({ bytes: i === 0 ? gradientPng(W, H) : solidPng(W, H, colors[i]), mime: "image/png" }));
    },
  };
  return m;
}

// ---------- assertions ----------

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

function near(actual, expected, tol, label) {
  for (let k = 0; k < 3; k++) {
    if (Math.abs(actual[k] - expected[k]) > tol) throw new Error(`${label}: got [${actual.slice(0, 3)}], expected [${expected.map(Math.round)}] (±${tol})`);
  }
}

function gradAt(x, y, crop, W, H) {
  const fx = ((x + 0.5 - crop.left) / (crop.right - crop.left)) * W - 0.5;
  const fy = ((y + 0.5 - crop.top) / (crop.bottom - crop.top)) * H - 0.5;
  const c = (v) => Math.max(0, Math.min(255, v));
  return [c((fx * 255) / (W - 1)), c((fy * 255) / (H - 1)), 0];
}

// ---------- Photoshop helpers (each in its own modal scope) ----------

const made = [];
let panelHooks = {};

/** Pattern image, left half red, right half blue, written as a PNG and opened like a user would. */
async function newDoc({ width = 1200, height = 800, resolution = 72, transparent = false, bits16 = false, opaque = null, profile = "sRGB IEC61966-2.1" } = {}) {
  const comps = transparent ? 4 : 3;
  const p = new Uint8Array(width * height * comps);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * comps;
      p.set(x < width / 2 ? RED : BLUE, o);
      if (comps === 4) p[o + 3] = !opaque || (x >= opaque.left && x < opaque.right && y >= opaque.top && y < opaque.bottom) ? 255 : 0;
    }
  }
  const png = encodePng(p, width, height, comps, { ppi: resolution });
  // Unique name per document: rewriting a file Photoshop has open triggers its "disk copy changed" dialog.
  const file = await outFolder.createFile(`pattern-${width}x${height}-${resolution}${transparent ? "-alpha" : ""}${opaque ? "-island" : ""}-${Date.now()}-${made.length}.png`, { overwrite: true });
  await file.write(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength), { format: formats.binary });
  return ps.modal("Fulla self-test: open", async () => {
    const d = await app.open(file);
    made.push(d);
    // The PNG carries no profile, so Photoshop tags it with the user's working RGB; reads convert to
    // sRGB and pure colours would shift. Tag it sRGB so the expected colours hold on any setup.
    await ps.bp([{ _obj: "assignProfile", _target: [{ _ref: "document", _id: d.id }], profile }]);
    if (bits16) d.bitsPerChannel = constants.BitsPerChannelType.SIXTEEN;
    return d;
  });
}

async function selectRect(r) {
  await ps.bp([{ _obj: "set", _target: [SELECTION], to: { _obj: "rectangle", top: px(r.top), left: px(r.left), bottom: px(r.bottom), right: px(r.right) } }]);
}

async function select(doc, shape, r) {
  return ps.modal("Fulla self-test: select", async () => {
    if (shape === "none") return ps.bp([{ _obj: "set", _target: [SELECTION], to: { _enum: "ordinal", _value: "none" } }]);
    if (shape === "ellipse") {
      return ps.bp([{ _obj: "set", _target: [SELECTION], to: { _obj: "ellipse", top: px(r.top), left: px(r.left), bottom: px(r.bottom), right: px(r.right) }, antiAlias: true }]);
    }
    return selectRect(r);
  });
}

// Photoshop 27.10 returns wrong pixels for tiny (1x1) imaging reads, so probes read the whole
// document at full resolution and look the pixel up.
async function readWhole(doc) {
  const w = Math.round(doc.width);
  const h = Math.round(doc.height);
  const r = await ps.modal("Fulla self-test: read", () => ps.readComposite(doc.id, { left: 0, top: 0, right: w, bottom: h }, { width: w, height: h }));
  expect(r.width === w && r.height === h, `full read came back ${r.width}x${r.height}, expected ${w}x${h}`);
  return r;
}

async function probe(doc, x, y) {
  const r = await readWhole(doc);
  const o = (y * r.width + x) * r.components;
  const a = r.components === 4 ? r.data[o + 3] / 255 : 1;
  return [Math.round(r.data[o] * a), Math.round(r.data[o + 1] * a), Math.round(r.data[o + 2] * a), Math.round(a * 255)];
}

const historyCount = (doc) => doc.historyStates.length;

async function undoTo(doc, count) {
  await ps.modal("Fulla self-test: undo", async () => {
    doc.activeHistoryState = doc.historyStates[count - 1];
  });
}

async function groupInfo(doc, groupId) {
  const group = Array.from(doc.layers).find((l) => l.id === groupId);
  expect(group, `group ${groupId} not found at top level`);
  const [m] = await ps.modal("Fulla self-test: inspect", () =>
    ps.bp([{ _obj: "get", _target: [{ _property: "hasUserMask" }, { _ref: "layer", _id: groupId }, { _ref: "document", _id: doc.id }] }])
  );
  return {
    name: group.name,
    hasMask: !!(m && m.hasUserMask),
    feather: group.layerMaskFeather,
    children: Array.from(group.layers || []).map((l) => ({ id: l.id, name: l.name, visible: l.visible })),
  };
}

let outFolder = null;

async function snapshot(doc, name) {
  const w = Math.round(doc.width);
  const h = Math.round(doc.height);
  const k = Math.min(1, 640 / Math.max(w, h));
  const size = { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
  const r = await ps.modal("Fulla self-test: snapshot", () => ps.readComposite(doc.id, { left: 0, top: 0, right: w, bottom: h }, size));
  const rgb = toRGB(r.data, r.width, r.height, r.components, 200);
  const file = await outFolder.createFile(`${name}.png`, { overwrite: true });
  const png = encodePng(rgb, r.width, r.height, 3);
  await file.write(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength), { format: formats.binary });
}

function run(provider, extra) {
  return runGeneration({ ps, provider, fetch: (u, i) => fetch(u, i), apiKey: "selftest", model: "selftest-model", maxTier: "2K", n: 1, ...extra });
}

// ---------- scenarios ----------

/** Standard fill check on a painted doc: input sent, placement accuracy, mask, history, undo. */
async function fillScenario(name, docOpts, sel, { shape = "rect", base = openai, scale = 1, n = 1, prompt = `selftest ${name}` } = {}) {
  const doc = await newDoc(docOpts);
  await select(doc, shape, sel);
  const h0 = historyCount(doc);
  const prov = mockProvider({ base, scale });
  const trace = [];
  const out = await run(prov, { prompt, n, trace });
  await snapshot(doc, name);
  const req = prov.requests[0];
  const crop = out.crop;
  const notes = { crop, target: out.target, input: { w: req.image.width, h: req.image.height }, out: prov.outSize, trace };
  try {

  // What the provider received: the right pixels at the right place, and the right mask.
  const at = (x, y) => {
    const ix = Math.floor(((x - crop.left) * req.image.width) / (crop.right - crop.left));
    const iy = Math.floor(((y - crop.top) * req.image.height) / (crop.bottom - crop.top));
    const o = iy * req.image.width + ix;
    return { rgb: [req.image.rgb[o * 3], req.image.rgb[o * 3 + 1], req.image.rgb[o * 3 + 2]], mask: req.mask[o] };
  };
  const cx = Math.round((sel.left + sel.right) / 2);
  const cy = Math.round((sel.top + sel.bottom) / 2);
  expect(at(cx, cy).mask === 255, "mask sent to provider: selection centre not marked");
  const halfW = Math.round(docOpts.width || 1200) / 2;
  // The mask sent to the provider is grown ~1% of the upload (so the model can blend); stay outside that.
  const grownDoc = Math.ceil((Math.max(req.image.width, req.image.height) * 0.01 * (crop.right - crop.left)) / req.image.width) + 4;
  const gap = 40 + grownDoc;
  const outsideLeft = { x: Math.max(crop.left + 2, Math.min(sel.left - gap, halfW - 20)), y: cy };
  if (outsideLeft.x <= sel.left - gap && outsideLeft.x < halfW) {
    const s = at(outsideLeft.x, outsideLeft.y);
    near(s.rgb, RED, 12, "image sent to provider (left of selection)");
    expect(s.mask === 0, "mask sent to provider marks an unselected pixel");
  }
  if (!prompt) expect(/Remove everything/.test(req.task), "an empty prompt did not send the remove instruction");

  // Result placed exactly over the crop, clipped to the selection.
  const W = prov.outSize.W;
  const H = prov.outSize.H;
  // Stay clear of the soft edge: the mask feather scales with the crop (same rule as the pipeline).
  const feather = Math.max(2, Math.min(24, Math.round(Math.max(crop.right - crop.left, crop.bottom - crop.top) * 0.004)));
  const inset = Math.max(30, 3 * feather + 10);
  const pts = shape === "ellipse"
    ? [[cx, cy], [cx - 40, cy + 30]]
    : [[sel.left + inset, sel.top + inset], [cx, cy], [sel.right - inset, sel.bottom - inset]];
  for (const [x, y] of pts) near(await probe(doc, x, y), gradAt(x, y, crop, W, H), 12, `result at (${x},${y})`);
  if (shape === "ellipse") {
    // inside the bounding box, outside the ellipse: must be untouched
    const x = sel.left + 15;
    const y = sel.top + 15;
    near(await probe(doc, x, y), x < halfW ? RED : BLUE, 12, `ellipse corner (${x},${y}) untouched`);
  }
  if (sel.left > inset + 20) near(await probe(doc, sel.left - inset, cy), sel.left - inset < halfW ? RED : BLUE, 12, "left of selection untouched");

  const g = await groupInfo(doc, out.placed.groupId);
  expect(g.hasMask, "group has no layer mask");
  expect(g.name === layerName(prompt), `group name is "${g.name}"`);
  expect(g.children.length === n, `group has ${g.children.length} layers, expected ${n}`);
  expect(historyCount(doc) === h0 + 1, `history grew by ${historyCount(doc) - h0}, expected exactly 1`);
  notes.feather = g.feather;

  await undoTo(doc, h0);
  near(await probe(doc, cx, cy), cx < halfW ? RED : BLUE, 12, "undo restores the original");
  } catch (e) {
    e.message = `${e.message} || ${JSON.stringify(notes)}`;
    throw e;
  }
  return { doc, notes };
}


function describeDoc(d) {
  const safe = (f) => {
    try {
      return f();
    } catch (e) {
      return `err: ${e.message}`;
    }
  };
  return {
    id: d.id,
    name: safe(() => d.name),
    mode: safe(() => String(d.mode)),
    bits: safe(() => String(d.bitsPerChannel)),
    activeDocId: safe(() => app.activeDocument && app.activeDocument.id),
    layers: safe(() => Array.from(d.layers).map((l) => l.name)),
    active: safe(() => d.activeLayers.map((l) => ({ name: l.name, kind: String(l.kind), isBackground: safe(() => l.isBackgroundLayer), allLocked: safe(() => l.allLocked) }))),
  };
}

async function diag() {
  const info = {};
  const raw = async (label, descs) => {
    try {
      info[label] = await action.batchPlay(descs, { dialogOptions: "silent" });
    } catch (e) {
      info[label] = `threw: ${e.message}`;
    }
  };
  const small = solidPng(64, 64, [0, 255, 0]);
  const f = await outFolder.createFile("diag-green.png", { overwrite: true });
  await f.write(small.buffer.slice(small.byteOffset, small.byteOffset + small.byteLength), { format: formats.binary });
  const token = lfs.createSessionToken(f);
  const place = {
    _obj: "placeEvent",
    null: { _path: token, _kind: "local" },
    freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
    offset: { _obj: "offset", horizontal: px(0), vertical: px(0) },
  };
  const fillRed = { _obj: "fill", using: { _enum: "fillContents", _value: "color" }, color: { _obj: "RGBColor", red: 255, grain: 0, blue: 0 }, opacity: { _unit: "percentUnit", _value: 100 }, mode: { _enum: "blendMode", _value: "normal" } };

  // A: blank document from documents.add
  await ps.modal("diag A", async () => {
    const DF = constants.DocumentFill || {};
    const d = await app.documents.add({ width: 400, height: 300, resolution: 72, mode: (constants.NewDocumentMode && constants.NewDocumentMode.RGB) || "RGBColorMode", fill: DF.WHITE || "white" });
    made.push(d);
    info.A_state = describeDoc(d);
    await raw("A_fill", [fillRed]);
    await raw("A_place", [place]);
    info.A_after = describeDoc(d);
  });
  // B: an opened PNG file
  const doc = await newDoc({ width: 400, height: 300 });
  await ps.modal("diag B", async () => {
    info.B_state = describeDoc(doc);
    await raw("B_place", [place]);
    info.B_after = describeDoc(doc);
  });
  // C: same, inside a history suspension (how commit runs)
  await ps.modal("diag C", async () => {
    await raw("C_place", [place]);
    info.C_after = describeDoc(doc);
  }, { historyDocId: doc.id });
  // D: plain DOM: new pixel layer, then place on top of it
  await ps.modal("diag D", async () => {
    try {
      await doc.createLayer({ name: "diag layer" });
      info.D_layer = "created";
    } catch (e) {
      info.D_layer = `err: ${e.message}`;
    }
    await raw("D_place", [place]);
    info.D_after = describeDoc(doc);
  });
  return info;
}

const SCENARIOS = {
  diag,

  async probeCheck() {
    // The reads Fulla depends on (regions at odd offsets, scaled) must hit exact pixels.
    const doc = await newDoc(); // red x<600, blue x>=600
    for (const [x, y, want] of [[100, 100, RED], [599, 400, RED], [600, 400, BLUE], [1199, 799, BLUE], [0, 0, RED]]) {
      near(await probe(doc, x, y), want, 2, `full-resolution read (${x},${y})`);
    }
    const region = async (b, size) => ps.modal("Fulla self-test: region", () => ps.readComposite(doc.id, b, size));
    const colAt = (r, x) => [r.data[x * r.components], r.data[x * r.components + 1], r.data[x * r.components + 2]];
    const cases = [
      { b: { left: 37, top: 53, right: 937, bottom: 653 }, size: { width: 900, height: 600 } }, // 1:1, odd offset
      { b: { left: 37, top: 53, right: 937, bottom: 653 }, size: { width: 450, height: 300 } }, // half size
      { b: { left: 344, top: 144, right: 856, bottom: 656 }, size: { width: 816, height: 816 } }, // upscaled, like a real fill
      { b: { left: 0, top: 0, right: 1200, bottom: 800 }, size: { width: 2048, height: 1365 } }, // whole document, upscaled
    ];
    const notes = [];
    for (const c of cases) {
      const r = await region(c.b, c.size);
      expect(r.width === c.size.width && r.height === c.size.height, `region read ${r.width}x${r.height}, expected ${c.size.width}x${c.size.height}`);
      const k = c.size.width / (c.b.right - c.b.left);
      const edge = (600 - c.b.left) * k; // where the red/blue split must land in the returned image
      const before = Math.floor(edge - 2 * Math.max(1, k));
      const after = Math.ceil(edge + 2 * Math.max(1, k));
      near(colAt(r, before), RED, 12, `region ${JSON.stringify(c.b)} at ${c.size.width}px: pixel ${before} (just left of the split)`);
      near(colAt(r, after), BLUE, 12, `region ${JSON.stringify(c.b)} at ${c.size.width}px: pixel ${after} (just right of the split)`);
      notes.push({ region: c.b, size: c.size, split: edge.toFixed(1) });
    }
    // Record (not assert) the tiny-read behaviour, for reference.
    const tiny = await region({ left: 600, top: 400, right: 601, bottom: 401 }, { width: 1, height: 1 });
    notes.push({ tinyReadAt600: Array.from(tiny.data.slice(0, 3)), expected: BLUE });
    return notes;
  },

  async fill() {
    return (await fillScenario("fill", {}, { left: 500, top: 300, right: 700, bottom: 500 })).notes;
  },

  async variations() {
    const doc = await newDoc();
      const sel = { left: 450, top: 250, right: 750, bottom: 550 };
    await select(doc, "rect", sel);
    const h0 = historyCount(doc);
    const prov = mockProvider();
    const out = await run(prov, { prompt: "selftest variations", n: 3 });
    await snapshot(doc, "variations-1");
    const g = await groupInfo(doc, out.placed.groupId);
    expect(g.children.length === 3, `${g.children.length} variation layers`);
    const names = g.children.map((c) => c.name).sort();
    expect(names.join() === "Variation 1,Variation 2,Variation 3", `names: ${names}`);
    expect(g.children.filter((c) => c.visible).length === 1, "more than one variation visible");
    near(await probe(doc, 600, 400), gradAt(600, 400, out.crop, prov.outSize.W, prov.outSize.H), 12, "variation 1 shown first");
    await ps.showVariation(out.placed, 1);
    near(await probe(doc, 600, 400), [0, 255, 0], 12, "variation 2 after switching");
    await ps.showVariation(out.placed, 2);
    near(await probe(doc, 600, 400), [255, 255, 0], 12, "variation 3 after switching");
    near(await probe(doc, 400, 400), RED, 12, "outside selection untouched with variations");
    await snapshot(doc, "variations");
    expect(historyCount(doc) === h0 + 3, `history grew by ${historyCount(doc) - h0}, expected 3 (generate + 2 switches)`);
    return { crop: out.crop };
  },

  async ellipse() {
    return (await fillScenario("ellipse", {}, { left: 300, top: 200, right: 900, bottom: 600 }, { shape: "ellipse" })).notes;
  },

  async remove() {
    return (await fillScenario("remove", {}, { left: 520, top: 320, right: 680, bottom: 480 }, { prompt: "" })).notes;
  },

  async edge() {
    return (await fillScenario("edge", {}, { left: 0, top: 0, right: 160, bottom: 120 })).notes;
  },

  async selectAll() {
    return (await fillScenario("selectAll", {}, { left: 0, top: 0, right: 1200, bottom: 800 })).notes;
  },

  async bigPhotoDownscale() {
    // 24 MP document, 3000x2000 selection: the crop is far larger than the 2048px upload, so the
    // full strip-read + shrink path runs, and the result is enlarged back on placement.
    const t0 = Date.now();
    const r = await fillScenario("bigPhotoDownscale", { width: 6000, height: 4000 }, { left: 1500, top: 1000, right: 4500, bottom: 3000 });
    expect(r.notes.input.w <= 2048 && r.notes.input.h <= 2048, `upload ${r.notes.input.w}x${r.notes.input.h} exceeds 2048`);
    expect(r.notes.crop.right - r.notes.crop.left > 2048, "crop was not larger than the upload; shrink path not exercised");
    return { ...r.notes, trace: undefined, seconds: (Date.now() - t0) / 1000 };
  },

  async bigDiag() {
    // Where does each gradient pixel actually land? Sample a grid two ways and invert the gradient.
    const doc = await newDoc({ width: 6000, height: 4000 });
    const sel = { left: 1500, top: 1000, right: 4500, bottom: 3000 };
    await select(doc, "rect", sel);
    const prov = mockProvider();
    const trace = [];
    const out = await run(prov, { prompt: "selftest bigDiag", trace });
    const { W, H } = prov.outSize;
    const crop = out.crop;
    const whole = await readWhole(doc);
    const rows = [];
    for (const y of [1100, 2000, 2900]) {
      for (const x of [1600, 2500, 3500, 4400]) {
        const o = (y * whole.width + x) * 4;
        const a = [whole.data[o], whole.data[o + 1]];
        const small = await ps.modal("diag region", () => ps.readComposite(doc.id, { left: x - 16, top: y - 16, right: x + 16, bottom: y + 16 }, { width: 32, height: 32 }));
        const so = (16 * 32 + 16) * 4;
        const b = [small.data[so], small.data[so + 1]];
        const imply = (v) => ({ x: Math.round(crop.left + ((v[0] / 255) * (W - 1) + 0.5) * ((crop.right - crop.left) / W)), y: Math.round(crop.top + ((v[1] / 255) * (H - 1) + 0.5) * ((crop.bottom - crop.top) / H)) });
        rows.push({ at: [x, y], expect: gradAt(x, y, crop, W, H).slice(0, 2).map(Math.round), whole: a, region: b, impliedWhole: imply(a), impliedRegion: imply(b) });
      }
    }
    return { crop, W, H, trace, rows };
  },

  async panelPickers() {
    // The model chip (roadmap 2.3) and the provisional Variations / Resolution pickers, driven the way
    // the UI does. Only providers with a key are listed; nothing here makes a network call.
    const $ = (id) => document.getElementById(id);
    const tick = (ms = 150) => new Promise((r) => setTimeout(r, ms));
    const labels = (id) => Array.from($(id).querySelectorAll("sp-menu-item")).map((m) => m.textContent);
    const choose = async (id, label) => {
      const items = labels(id);
      const i = items.indexOf(label);
      expect(i >= 0, `"${label}" not in ${id} picker: ${items.join(" | ")}`);
      const el = $(id);
      el.selectedIndex = i;
      el.dispatchEvent(new Event("change"));
      await tick();
    };
    const prefs = () => JSON.parse(localStorage.getItem("fulla.prefs.v1") || "{}");
    const rows = () => Array.from($("menuList").querySelectorAll(".menu-item"));
    const text = (row) => row.querySelector(".grow").textContent;
    const groups = () => Array.from($("menuList").querySelectorAll(".menu-group")).map((g) => g.textContent);
    const search = async (q) => {
      $("menuSearch").value = q;
      $("menuSearch").dispatchEvent(new Event("input"));
      await tick();
    };
    const log = {};
    expect(!$("provider") && !$("model") && !$("customModelRow"), "the old Provider / Model pickers or the custom model row are still there");
    const keyed = [];
    for (const p of PROVIDERS) if (await settings.getKey(p.id)) keyed.push(p);
    if (keyed.length) {
      const chip = $("modelChip");
      const before = { provider: prefs().provider, model: (prefs().models || {})[prefs().provider] };
      const beforeLabel = chip.textContent;
      chip.dispatchEvent(new Event("click"));
      await tick(400);
      expect($("menu"), "the model chip did not open its menu");
      log.groups = groups();
      expect(groups().join() === keyed.map((p) => p.name).join(), `groups ${groups()} but keys for ${keyed.map((p) => p.name)}`);
      const checked = rows().filter((r) => r.querySelector(".check").textContent === "✓").map(text);
      expect(checked.length === 1 && beforeLabel.endsWith(`· ${checked[0]} ▾`), `checked ${checked}, chip "${beforeLabel}"`);
      expect(rows().every((r) => !/\(/.test(text(r))), "a model name still carries a (...) note");
      await search("banana");
      expect(rows().length > 0 && rows().every((r) => /banana/i.test(text(r))), `"banana" kept ${rows().map(text)}`);
      expect(groups().length > 0, "searching hid the provider headers");
      await search(keyed[0].name.toLowerCase());
      expect(rows().length === keyed[0].models.length, `a provider name should keep its whole group, kept ${rows().length}`);
      // Pick another model by clicking it: saved, shown on the chip, menu closed.
      const target = rows().find((r) => r.querySelector(".check").textContent !== "✓");
      const targetName = text(target);
      target.dispatchEvent(new Event("click"));
      await tick();
      expect(!$("menu"), "picking a model did not close the menu");
      expect(chip.textContent === `${keyed[0].name} · ${targetName} ▾`, `chip "${chip.textContent}" after picking ${targetName} (provider · model)`);
      expect(prefs().provider === keyed[0].id && prefs().models[keyed[0].id] !== before.model, "the picked model was not saved");
      log.picked = targetName;
      // Back to the original model with Enter on a search (Enter picks the first match).
      chip.dispatchEvent(new Event("click"));
      await tick(400);
      await search(beforeLabel.replace(" ▾", "").replace(" · ", " "));
      const enter = new Event("keydown");
      Object.defineProperty(enter, "key", { value: "Enter" });
      $("menuSearch").dispatchEvent(enter);
      await tick();
      expect(!$("menu") && chip.textContent === beforeLabel, `Enter did not pick back "${beforeLabel}" (chip "${chip.textContent}")`);
      expect(prefs().provider === before.provider && prefs().models[before.provider] === before.model, "the original model was not restored");
    } else log.skipped = "no provider has a key";
    const n0 = String(prefs().n || 1);
    const t0 = prefs().maxTier || "2K";
    await choose("n", "3");
    await choose("maxTier", "1K (fast)");
    expect(prefs().n === 3 && prefs().maxTier === "1K", "Variations / Resolution choices not saved");
    await choose("n", n0);
    await choose("maxTier", { "1K": "1K (fast)", "4K": "4K (slow, costly)" }[t0] || "2K");
    return log;
  },

  async panelTabs() {
    // Tabs switch pages; Generate with no key for the chosen provider opens Providers and says why.
    const $ = (id) => document.getElementById(id);
    const tick = () => new Promise((r) => setTimeout(r, 150));
    const click = async (id) => {
      $(id).dispatchEvent(new Event("click"));
      await tick();
    };
    const shown = () => ["generate", "providers"].filter((t) => !$(`page-${t}`).hidden);
    const active = () => Array.from(document.querySelectorAll(".tab.active")).map((t) => t.id);
    await click("tab-generate");
    expect(shown().join() === "generate" && active().join() === "tab-generate", `start: pages ${shown()} tabs ${active()}`);
    await click("tab-providers");
    expect(shown().join() === "providers" && active().join() === "tab-providers", `after Providers: pages ${shown()} tabs ${active()}`);
    expect($("page-providers").contains($("providerList")) && !$("page-providers").contains($("generate")), "Providers page holds the provider list, not Generate");
    await click("tab-generate");
    expect(shown().join() === "generate", `after Generate: pages ${shown()}`);
    // Only with a provider that has no key: with a key, the click would start a real, paid run.
    const prefs = JSON.parse(localStorage.getItem("fulla.prefs.v1") || "{}");
    const current = prefs.provider || settings.DEFAULTS.provider;
    if (await settings.getKey(current)) return { noKeyCheck: `skipped: ${current} has a key` };
    await click("generate");
    expect(shown().join() === "providers", `Generate without a key should open Providers, pages: ${shown()}`);
    // With no key at all the welcome screen shows (the provider's row is hidden); otherwise its row says why.
    const msg = $(`pmsg-${current}`).textContent;
    expect(!$("welcome").hidden || /API key first/.test(msg), `neither welcome screen nor provider message ("${msg}")`);
    await click("tab-generate");
    return { noKeyCheck: `ran with ${current}` };
  },

  async panelLayout() {
    // Roadmap 2.1. The prompt box stays at the bottom of the panel and the area above scrolls; the
    // chip's floating menu opens above the box, inside the panel, and its list scrolls and filters.
    // Whether UXP draws a native text field over the menu can't be measured: checked by eye.
    const $ = (id) => document.getElementById(id);
    const tick = () => new Promise((r) => setTimeout(r, 150));
    const click = async (node, bubbles = false) => {
      node.dispatchEvent(new Event("click", { bubbles }));
      await tick();
    };
    const rect = (id) => $(id).getBoundingClientRect();
    const span = (b) => `${Math.round(b.top)}..${Math.round(b.bottom)}`;
    await click($("tab-generate"));
    const app = rect("app");
    const pinned = () => Math.abs(rect("promptBox").bottom - (app.bottom - 12)) <= 2;
    const info = { panel: `${Math.round(app.width)}x${Math.round(app.height)}` };
    expect(pinned(), `prompt box at ${span(rect("promptBox"))}, panel bottom ${Math.round(app.bottom)}`);

    // Overfill the scrolling area: the box must not move, and the area must scroll.
    const scroll = $("genScroll");
    const filler = document.createElement("div");
    filler.style.height = "3000px";
    scroll.appendChild(filler);
    await tick();
    try {
      expect(pinned(), `with tall content the prompt box moved to ${span(rect("promptBox"))}`);
      expect(scroll.scrollHeight > scroll.clientHeight, `the area does not overflow (${scroll.scrollHeight}/${scroll.clientHeight})`);
      scroll.scrollTop = 200;
      await tick();
      expect(scroll.scrollTop > 0, "the area above the prompt box does not scroll");
    } finally {
      scroll.scrollTop = 0;
      scroll.removeChild(filler);
    }

    // A list longer than any panel, opened through main.js's own menu code, anchored to the model chip.
    const chip = $("modelChip");
    const long = [];
    for (let i = 1; i <= 40; i++) long.push({ group: i <= 20 ? "Banana group" : "Other group", label: i % 2 ? `Banana ${i}` : `Item ${i}` });
    const openLong = async () => {
      panelHooks.openMenu(chip, long, () => {}, "Search");
      await tick();
    };
    await openLong();
    expect($("menu"), "the menu did not open");
    try {
      const m = rect("menu");
      const box = rect("promptBox");
      info.menu = span(m);
      expect(m.top >= app.top - 1 && m.left >= app.left - 1 && m.right <= app.right + 1, `menu ${span(m)} leaves the panel`);
      expect(m.bottom <= box.top + 1, `menu ${span(m)} covers the prompt box ${span(box)}`);
      // The test list is longer than any panel: the menu should use the height above the box.
      expect(m.top <= app.top + 40, `menu ${span(m)} uses too little of the height above the box ${span(box)}`);
      const list = $("menuList");
      const total = list.querySelectorAll(".menu-item").length;
      expect(list.scrollHeight > list.clientHeight, `menu list does not overflow (${list.scrollHeight}/${list.clientHeight})`);
      list.scrollTop = 100;
      await tick();
      expect(list.scrollTop > 0, "menu list does not scroll");
      $("menuSearch").value = "banana";
      $("menuSearch").dispatchEvent(new Event("input"));
      await tick();
      const found = list.querySelectorAll(".menu-item").length;
      expect(found > 0 && found < total, `search "banana" kept ${found} of ${total}`);
      await click(list.querySelector(".menu-item"));
      expect(!$("menu"), "picking an item did not close the menu");
      await openLong();
      await click(scroll, true);
      expect(!$("menu"), "a click elsewhere in the panel did not close the menu");
      // The chip's own menu needs a provider with a key (without one, the chip opens Providers).
      let keyed = false;
      for (const p of PROVIDERS) if (await settings.getKey(p.id)) keyed = true;
      if (keyed) {
        await click(chip);
        await tick(300);
        expect($("menu"), "the model chip did not open its menu");
        await click(chip);
        expect(!$("menu"), "clicking the chip again did not close the menu");
      }
    } finally {
      panelHooks.closeMenu();
    }
    return info;
  },

  async panelRun() {
    // Roadmap 2.2, the run card. Free: every request goes to a fake fetch that answers nothing until
    // Cancel, then fails. Running: card, stage, seconds and bar move, prompt and chip locked, Cancel.
    // After Cancel: "Cancelled", unlocked. Then an error card (no selection).
    const $ = (id) => document.getElementById(id);
    const tick = (ms = 150) => new Promise((r) => setTimeout(r, ms));
    const prefs = JSON.parse(localStorage.getItem("fulla.prefs.v1") || "{}");
    const current = prefs.provider || settings.DEFAULTS.provider;
    if (!(await settings.getKey(current))) return { skipped: `${current} has no key` };
    const net = panelHooks.generationNet;
    expect(net, "main.js did not pass generationNet to the self-test");
    $("tab-generate").dispatchEvent(new Event("click"));
    const doc = await newDoc();
    await select(doc, "rect", { left: 450, top: 250, right: 750, bottom: 550 });
    const h0 = historyCount(doc);
    const realFetch = net.fetch;
    let calls = 0;
    let release;
    const gate = new Promise((r) => (release = r));
    net.fetch = async () => {
      calls++;
      await gate;
      throw new Error("selftest: request dropped");
    };
    const idle = async (seconds) => {
      for (let i = 0; i < seconds * 5 && $("generate").textContent !== "Generate"; i++) await tick(200);
      return $("generate").textContent === "Generate";
    };
    const info = {};
    try {
      $("generate").dispatchEvent(new Event("click"));
      for (let i = 0; i < 50 && !calls; i++) await tick(200);
      expect(calls > 0, "the run never reached the provider");
      expect(!$("runCard").hidden && $("idleHint").hidden && !$("runProgress").hidden, "running: card or progress not shown");
      expect(/^Generating with /.test($("runStage").textContent) && !$("runStage").textContent.includes($("runTitle").textContent), `running: title "${$("runTitle").textContent}", stage "${$("runStage").textContent}" (provider on top, model in the stage)`);
      expect($("generate").textContent === "Cancel", `running: button "${$("generate").textContent}"`);
      expect($("prompt").hasAttribute("disabled") && $("modelChip").hasAttribute("disabled"), "running: prompt or model chip not locked");
      const bar = $("runBarFill").style.marginLeft;
      const time = $("runTime").textContent;
      await tick(1200);
      expect($("runBarFill").style.marginLeft !== bar, "running: the bar does not move");
      expect($("runTime").textContent !== time, `running: seconds stuck at "${time}"`);
      info.running = `${$("runTitle").textContent} | ${$("runStage").textContent} ${$("runTime").textContent}`;
      $("generate").dispatchEvent(new Event("click"));
      await tick();
      expect(/Cancelling/.test($("runStage").textContent), `cancelling: stage "${$("runStage").textContent}"`);
      release();
      expect(await idle(30), "still running 30 s after Cancel");
      expect($("status").textContent === "Cancelled. Nothing was changed." && !/error/.test($("status").className), `cancelled: "${$("status").textContent}"`);
      expect($("runProgress").hidden && !$("prompt").hasAttribute("disabled"), "cancelled: progress shown or prompt still locked");
      expect(historyCount(doc) === h0, "cancelled: the document changed");
    } finally {
      release();
      // Never hand the real network back while the run could still retry: that would be a paid request.
      if (await idle(30)) net.fetch = realFetch;
      else throw new Error("run still going after 60 s; fetch left faked, reload the plugin");
    }

    await select(doc, "none");
    $("generate").dispatchEvent(new Event("click"));
    for (let i = 0; i < 25 && !$("status").textContent; i++) await tick(200);
    expect(await idle(10), "no-selection run did not end");
    expect(/Make a selection first/.test($("status").textContent) && /error/.test($("status").className), `no selection: "${$("status").textContent}"`);
    info.error = $("status").textContent;
    return info;
  },

  async panelProviders() {
    // The Providers tab with a provider that has no key: a refused key is not saved, Cancel closes
    // the form, a saved key shows as "Connected · ...last 4", Remove deletes it. Free: the only
    // network call is a key check that the provider refuses.
    const $ = (id) => document.getElementById(id);
    const tick = (ms = 150) => new Promise((r) => setTimeout(r, ms));
    const click = async (elOrId) => {
      (typeof elOrId === "string" ? $(elOrId) : elOrId).dispatchEvent(new Event("click"));
      await tick();
    };
    const buttonIn = (id, label) => {
      const b = Array.from($(id).querySelectorAll("sp-action-button")).find((x) => x.textContent === label);
      expect(b, `no "${label}" button in ${id}`);
      return b;
    };
    // OpenRouter connects through its guided flow (no key form), so take another provider.
    let p = null;
    for (const x of PROVIDERS) if (!p && x.id !== "openrouter" && !(await settings.getKey(x.id))) p = x;
    if (!p) return { skipped: "every provider with a key form has a key" };
    const id = p.id;
    let firstRun = true;
    for (const x of PROVIDERS) if (await settings.getKey(x.id)) firstRun = false;
    try {
      await click("tab-providers");
      if (firstRun) {
        // No key anywhere: welcome screen instead of the OpenRouter row, and Generate says so.
        expect(!$("welcome").hidden && $("prow-openrouter").hidden, "first run: welcome screen should replace the OpenRouter row");
        expect(!$("noProvider").hidden, "first run: the Generate tab should say a provider is needed");
      }
      expect($(`pstate-${id}`).textContent === "No key", `state: "${$(`pstate-${id}`).textContent}"`);
      expect($(`padd-${id}`).children.length === 0, "key form open before Add");
      await click(buttonIn(`pactions-${id}`, "Add a key"));
      expect($(`padd-${id}`).children.length > 0 && $(`pactions-${id}`).hidden, "Add a key did not open the form");
      expect(!$(`key-${id}`).getAttribute("placeholder"), "the key field must have no placeholder (its masked length would show)");
      // The page where the key is created is one click away (not clicked: it would open the browser).
      buttonIn(`padd-${id}`, `Get a key on ${p.keyHelp.split("/")[0]}`);
      $(`key-${id}`).value = "fulla-selftest-invalid";
      await click(buttonIn(`padd-${id}`, "Save"));
      for (let i = 0; i < 50 && /Checking/.test($(`pmsg-${id}`).textContent); i++) await tick(200);
      const refused = $(`pmsg-${id}`).textContent;
      expect(/rejected/.test(refused), `invalid key message: "${refused}"`);
      expect(!(await settings.getKey(id)), "a refused key was saved");
      await click(buttonIn(`padd-${id}`, "Cancel"));
      expect($(`padd-${id}`).children.length === 0 && !$(`pactions-${id}`).hidden, "Cancel did not close the form");
      expect(!$(`key-${id}`), "Cancel left the key field in the page");
      await settings.setKey(id, "fulla-selftest-saved-1234");
      await click("tab-providers"); // re-renders the rows
      await tick();
      expect($(`pstate-${id}`).textContent === "Connected", `state with a key: "${$(`pstate-${id}`).textContent}"`);
      expect($("welcome").hidden && $("noProvider").hidden, "with a key, no welcome screen and no Generate notice");
      if (firstRun) {
        expect(!$("prow-openrouter").hidden, "with a key, the OpenRouter row is back");
        buttonIn("pactions-openrouter", "Connect"); // guided connect, not a key form
      }
      expect(/\.\.\.1234$/.test($(`pkey-${id}`).textContent), `key hint: "${$(`pkey-${id}`).textContent}"`);
      await click(buttonIn(`pactions-${id}`, "Remove"));
      await tick();
      expect(!(await settings.getKey(id)), "Remove left the key");
      expect($(`pstate-${id}`).textContent === "No key", `state after Remove: "${$(`pstate-${id}`).textContent}"`);
      if (firstRun) expect(!$("welcome").hidden, "removing the last key brings the welcome screen back");
      return { provider: id, firstRun, refused };
    } finally {
      await settings.setKey(id, "");
      await click("tab-generate");
    }
  },

  async geminiRaw() {
    // Raw requests with the saved Gemini key, no retries, one per image model: records exactly what
    // Google answers. Responses never contain the key; refused requests are not billed.
    const apiKey = await settings.getKey("gemini");
    expect(apiKey, "no Gemini key saved");
    const w = 64, h = 64;
    const b64 = require("./bytes").toBase64(encodePng(new Uint8Array(w * h * 3).fill(128), w, h, 3));
    const models = ["gemini-nano-banana-2.1", "gemini-3.1-flash-lite-image", "gemini-3.1-flash-image", "gemini-3-pro-image", "gemini-2.5-flash-image"];
    const out = {};
    for (const model of models) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Return this image unchanged." }, { inline_data: { mime_type: "image/png", data: b64 } }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1", imageSize: "1K" } } }),
      });
      const text = await res.text();
      let summary;
      try {
        const j = JSON.parse(text);
        summary = j.error ? `${j.error.status}: ${String(j.error.message).split(String.fromCharCode(10))[0].slice(0, 160)}${/limit: 0/.test(j.error.message) ? " [free tier limit 0]" : ""}` : `OK, ${(j.candidates || []).length} candidate(s), finish ${j.candidates && j.candidates[0] && j.candidates[0].finishReason}`;
      } catch (_) {
        summary = text.slice(0, 200);
      }
      out[model] = { status: res.status, summary };
    }
    return out;
  },

  async openaiRaw() {
    // One raw edit request with the saved OpenAI key, no retries: records exactly what OpenAI answers.
    const apiKey = await settings.getKey("openai");
    expect(apiKey, "no OpenAI key saved");
    const w = 64, h = 64;
    const b64 = require("./bytes").toBase64(encodePng(new Uint8Array(w * h * 3).fill(128), w, h, 3));
    const out = {};
    for (const model of ["gpt-image-2.5-sunburst", "gpt-image-2"]) {
      const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, prompt: "Return this image unchanged.", images: [{ image_url: `data:image/png;base64,${b64}` }], n: 1, size: "1024x1024", quality: "low" }),
      });
      const text = await res.text();
      let summary;
      try {
        const j = JSON.parse(text);
        summary = j.error ? { type: j.error.type, code: j.error.code, message: j.error.message } : { ok: true, images: (j.data || []).length };
      } catch (_) {
        summary = text.slice(0, 300);
      }
      out[model] = { status: res.status, summary };
    }
    return out;
  },

  async transparentEmptyArea() {
    // Content only in the middle; fill a selection that sits in empty, transparent space.
    const doc = await newDoc({ transparent: true, opaque: { left: 400, top: 250, right: 800, bottom: 550 } });
    const sel = { left: 40, top: 40, right: 240, bottom: 200 };
    await select(doc, "rect", sel);
    const prov = mockProvider();
    const out = await run(prov, { prompt: "selftest transparent" });
    await snapshot(doc, "transparentEmptyArea");
    const req = prov.requests[0];
    // the empty area is sent as neutral grey
    near([req.image.rgb[0], req.image.rgb[1], req.image.rgb[2]], [128, 128, 128], 2, "transparent area sent as grey");
    near(await probe(doc, 140, 120), gradAt(140, 120, out.crop, prov.outSize.W, prov.outSize.H), 12, "fill inside transparent area");
    const outside = await probe(doc, 300, 120);
    expect(outside[3] === 0, `outside the selection stays transparent (alpha ${outside[3]})`);
    near(await probe(doc, 500, 400), RED, 12, "content island untouched");
    return { crop: out.crop };
  },

  async highRes300ppi() {
    return (await fillScenario("highRes300ppi", { width: 3000, height: 2000, resolution: 300 }, { left: 1300, top: 800, right: 1700, bottom: 1200 })).notes;
  },

  async bits16() {
    const r = await fillScenario("bits16", { bits16: true }, { left: 500, top: 300, right: 700, bottom: 500 });
    return { ...r.notes, bitsPerChannel: String(r.doc.bitsPerChannel) };
  },

  async geminiSizesOddOutput() {
    // fixed-ratio sizing, and a provider that returns a different size than asked
    return (await fillScenario("geminiSizesOddOutput", { width: 1600, height: 900 }, { left: 700, top: 300, right: 1000, bottom: 600 }, { base: gemini, scale: 0.75 })).notes;
  },

  async adobeRgb() {
    // Results come back as sRGB; in a document with another profile they must keep their colours.
    // These colours read about 20-30 levels apart if sRGB values are taken as Adobe RGB ones.
    const GREEN = [60, 160, 60];
    const BRICK = [180, 90, 60];
    const doc = await newDoc({ profile: "Adobe RGB (1998)" });
    const [p] = await ps.modal("Fulla self-test: profile", () => ps.bp([{ _obj: "get", _target: [{ _property: "profile" }, { _ref: "document", _id: doc.id }] }]));
    expect(/Adobe RGB/.test(p && p.profile), `document profile is ${p && p.profile}, expected Adobe RGB`);
    await select(doc, "rect", { left: 450, top: 250, right: 750, bottom: 550 });
    const prov = mockProvider({ colors: [null, GREEN, BRICK] });
    const out = await run(prov, { prompt: "selftest adobeRgb", n: 3 });
    const got = { profile: p.profile };
    try {
      const [cs] = await ps.modal("Fulla self-test: colour settings", () => ps.bp([{ _obj: "get", _target: [{ _property: "colorSettings" }, { _ref: "application", _enum: "ordinal", _value: "targetEnum" }] }]));
      got.colorSettings = cs && cs.colorSettings;
    } catch (e) {
      got.colorSettings = `unreadable: ${e.message}`;
    }
    await ps.showVariation(out.placed, 1);
    got.green = { got: (await probe(doc, 600, 400)).slice(0, 3), want: GREEN };
    await ps.showVariation(out.placed, 2);
    got.brick = { got: (await probe(doc, 600, 400)).slice(0, 3), want: BRICK };
    await snapshot(doc, "adobeRgb");
    const bad = [got.green, got.brick].filter((v) => v.got.some((c, k) => Math.abs(c - v.want[k]) > 6));
    expect(!bad.length, `colours shifted in an Adobe RGB document: ${JSON.stringify(got)}`);
    return got;
  },

  async rollbackOnBadImage() {
    const doc = await newDoc();
      const sel = { left: 500, top: 300, right: 700, bottom: 500 };
    await select(doc, "rect", sel);
    const h0 = historyCount(doc);
    const layers0 = Array.from(doc.layers).length;
    let failed = false;
    try {
      await run(mockProvider({ garbage: true }), { prompt: "x" });
    } catch (e) {
      failed = e.message;
    }
    expect(failed, "a broken image did not raise an error");
    expect(historyCount(doc) === h0, `history changed by ${historyCount(doc) - h0} after a failed run`);
    expect(Array.from(doc.layers).length === layers0, "layers left behind after a failed run");
    const b = await ps.getSelectionBounds(doc.id);
    expect(b && Math.round(b.left) === 500 && Math.round(b.right) === 700, `selection changed after a failed run: ${JSON.stringify(b)}`);
    return { error: failed };
  },

  async cancel() {
    const doc = await newDoc();
      await select(doc, "rect", { left: 500, top: 300, right: 700, bottom: 500 });
    const h0 = historyCount(doc);
    const prov = mockProvider();
    let msg = "";
    try {
      await run(prov, { prompt: "x", cancelled: () => prov.requests.length > 0 });
    } catch (e) {
      msg = e.message;
    }
    expect(/Cancelled/.test(msg), `expected a cancel, got "${msg}"`);
    expect(historyCount(doc) === h0, "cancel changed the document");
    return { message: msg };
  },

  async noSelection() {
    const doc = await newDoc();
    await select(doc, "none");
    let msg = "";
    try {
      await run(mockProvider(), { prompt: "x" });
    } catch (e) {
      msg = e.message;
    }
    expect(/Make a selection first/.test(msg), `got "${msg}"`);
    return { message: msg };
  },

  async networkOpenAI() {
    // Free: an invalid key is rejected before any image is generated.
    const w = 64, h = 64;
    try {
      await openai.generate({ fetch: (u, i) => fetch(u, i), apiKey: "sk-fulla-selftest-invalid", model: "gpt-image-2", image: { rgb: new Uint8Array(w * h * 3), width: w, height: h }, mask: new Uint8Array(w * h).fill(255), task: "test", n: 1, target: { width: 1024, height: 1024 } });
    } catch (e) {
      expect(e.status === 401 && /rejected the API key/.test(e.message), `unexpected: ${e.status} ${e.message} ${e.detail || ""}`);
      return { status: e.status, message: e.message };
    }
    throw new Error("OpenAI accepted an invalid key?");
  },

  async networkGemini() {
    const w = 64, h = 64;
    const target = gemini.fitSize("gemini-nano-banana-2.1", 1024, 1024, "1K");
    try {
      await gemini.generate({ fetch: (u, i) => fetch(u, i), apiKey: "fulla-selftest-invalid", model: "gemini-nano-banana-2.1", image: { rgb: new Uint8Array(w * h * 3), width: w, height: h }, mask: new Uint8Array(w * h).fill(255), task: "test", n: 1, target });
    } catch (e) {
      expect(/rejected the Gemini API key/.test(e.message), `unexpected: ${e.status} ${e.message} ${e.detail || ""}`);
      return { status: e.status, message: e.message };
    }
    throw new Error("Gemini accepted an invalid key?");
  },

  async networkOpenRouter() {
    const w = 64, h = 64;
    const target = openrouter.fitSize(openrouter.defaultModel, 1024, 1024, "1K");
    try {
      await openrouter.generate({ fetch: (u, i) => fetch(u, i), apiKey: "sk-or-fulla-selftest-invalid", model: openrouter.defaultModel, image: { rgb: new Uint8Array(w * h * 3), width: w, height: h }, mask: new Uint8Array(w * h).fill(255), task: "test", n: 1, target });
    } catch (e) {
      expect(e.status === 401 && /rejected the API key/.test(e.message), `unexpected: ${e.status} ${e.message} ${e.detail || ""}`);
      return { status: e.status, message: e.message };
    }
    throw new Error("OpenRouter accepted an invalid key?");
  },
};

/** Opt-in, paid: a real fill and a real remove (empty prompt) with the saved key (1K, lowest quality). */
async function live(providerId, model) {
  const provider = { gemini, openai, openrouter }[providerId];
  expect(provider, `unknown provider "${providerId}"`);
  const apiKey = await settings.getKey(provider.id);
  expect(apiKey, `no ${provider.name} key saved in the panel`);
  let usages = [];
  const base = { ps, provider, fetch: (u, i) => fetch(u, i), apiKey, model: model || provider.defaultModel, n: 1, quality: "low", maxTier: "1K", onUsage: (u) => usages.push(u) };
  const report = { model: base.model };
  const step = async (name, fn) => {
    const t0 = Date.now();
    usages = [];
    try {
      const out = await fn();
      const usd = usages.map((u) => estimateCost(base.model, u)).reduce((a, c) => (a == null || c == null ? null : a + c), 0);
      report[name] = { ok: true, seconds: Math.round((Date.now() - t0) / 1000), usd, target: out.target, results: out.results.length, crop: out.crop };
    } catch (e) {
      report[name] = { ok: false, seconds: Math.round((Date.now() - t0) / 1000), error: String((e && e.message) || e), detail: e && e.detail };
    }
  };
  await step("fill", async () => {
    const doc = await newDoc();
    await select(doc, "rect", { left: 450, top: 250, right: 750, bottom: 550 });
    const h0 = historyCount(doc);
    const out = await runGeneration({ ...base, prompt: "a small green potted plant" });
    expect(historyCount(doc) === h0 + 1, "fill did not add exactly one undo step");
    await snapshot(doc, `live-${provider.id}-fill`);
    return out;
  });
  await step("remove", async () => {
    const doc = await newDoc();
    await select(doc, "rect", { left: 560, top: 300, right: 640, bottom: 500 });
    const out = await runGeneration({ ...base, prompt: "" });
    await snapshot(doc, `live-${provider.id}-remove`);
    return out;
  });
  const failed = Object.entries(report).filter(([k, v]) => k !== "model" && !v.ok);
  if (failed.length) throw new Error(`${failed.length} live step(s) failed: ${JSON.stringify(report)}`);
  return report;
}

async function runAll(opts = {}) {
  const startedAt = new Date().toISOString();
  const original = app.activeDocument;
  const results = [];
  const names = opts.live ? [] : opts.only && opts.only.length ? opts.only : Object.keys(SCENARIOS);
  const all = opts.live ? [[`live-${opts.live}`, () => live(opts.live, opts.model)]] : names.map((n) => [n, SCENARIOS[n]]);
  for (const [name, fn] of all) {
    const t0 = Date.now();
    try {
      const notes = await fn();
      results.push({ name, ok: true, ms: Date.now() - t0, notes });
      console.log(`[Fulla self-test] PASS ${name}`);
    } catch (e) {
      results.push({ name, ok: false, ms: Date.now() - t0, error: String((e && e.message) || e), stack: String((e && e.stack) || "").split("\n").slice(0, 6).join(" | ") });
      console.log(`[Fulla self-test] FAIL ${name}: ${e && e.message}`);
    }
    // Throwaway documents are closed after each scenario.
    while (made.length) {
      const d = made.pop();
      try {
        await ps.modal("Fulla self-test: close", async () => d.closeWithoutSaving());
      } catch (_) {
        /* already closed */
      }
    }
  }
  try {
    if (original) await ps.modal("Fulla self-test: restore", async () => (app.activeDocument = original));
  } catch (_) {
    /* original was closed by the user */
  }
  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    host: { version: app.version },
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

async function getOrCreateFolder(parent, name) {
  try {
    return await parent.getEntry(name);
  } catch (_) {
    return parent.createFolder(name);
  }
}

let running = false;

/** Poll the data folder for selftest.json; run once per file. */
/**
 * @param {object} [hooks] from main.js: `generationNet` ({ fetch }) carries the panel's generation
 *   requests; `openMenu` / `closeMenu` are the panel's floating menu.
 */
function watch(hooks = {}) {
  panelHooks = hooks;
  setInterval(async () => {
    if (running) return;
    try {
      const data = await lfs.getDataFolder();
      const entries = await data.getEntries();
      const flag = entries.find((e) => e.name === "selftest.json");
      if (!flag) return;
      running = true;
      let opts = {};
      try {
        opts = JSON.parse((await flag.read()) || "{}");
      } catch (_) {
        opts = {};
      }
      await flag.delete();
      outFolder = await getOrCreateFolder(data, "selftest");
      const status = await outFolder.createFile("status.txt", { overwrite: true });
      await status.write(`running since ${new Date().toISOString()}`);
      const report = await runAll(opts);
      const file = await outFolder.createFile("result.json", { overwrite: true });
      await file.write(JSON.stringify(report, null, 2));
      await status.write(`done ${report.finishedAt}: ${report.passed} passed, ${report.failed} failed`);
    } catch (e) {
      console.log(`[Fulla self-test] harness error: ${e && e.message}`);
      try {
        const data = await lfs.getDataFolder();
        const f = await data.createFile("selftest-harness-error.txt", { overwrite: true });
        await f.write(String((e && e.stack) || e));
      } catch (_) {
        /* nothing else to do */
      }
    } finally {
      running = false;
    }
  }, 3000);
}

module.exports = { watch, runAll };
