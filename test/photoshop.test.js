// Runs plugin/src/photoshop.js against a scripted fake of the "photoshop" and "uxp" modules.
// This checks our control flow (order of calls, cleanup, rollback, data mapping), not Photoshop itself.

const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

function loadWithFakes({ imagingMissing = false, fail8bit = false, trim = null, refuse = null } = {}) {
  const calls = [];
  const state = { selection: { left: 10, top: 20, right: 110, bottom: 220 }, nextId: 100, layers: {}, active: null, deleted: [], history: [], putSelection: null, filterFX: [] };

  function makeLayer(w, h, kind = "layer") {
    const id = state.nextId++;
    const L = {
      id, kind, name: "", visible: true, layerMaskFeather: 0,
      b: { left: 0, top: 0, right: w, bottom: h },
      async scale(px, py, anchor) {
        calls.push(["scale", id, anchor]);
        const nw = (L.b.right - L.b.left) * px / 100, nh = (L.b.bottom - L.b.top) * py / 100;
        L.b = { left: L.b.left, top: L.b.top, right: L.b.left + nw, bottom: L.b.top + nh };
      },
      async translate(dx, dy) {
        L.b = { left: L.b.left + dx, top: L.b.top + dy, right: L.b.right + dx, bottom: L.b.bottom + dy };
      },
    };
    Object.defineProperty(L, "bounds", { get: () => L.b });
    state.layers[id] = L;
    state.active = L;
    return L;
  }

  const doc = {
    id: 7, width: 2000, height: 1000, resolution: 300,
    get activeLayers() { return [state.active]; },
    get layers() { return Object.values(state.layers); },
  };
  const app = { documents: [doc], activeDocument: doc };

  const photoshop = {
    app,
    constants: { AnchorPosition: { TOPLEFT: "tl" }, BlendMode: { LINEARLIGHT: "linearLight" } },
    core: {
      async executeAsModal(fn, opts) {
        calls.push(["modal", opts.commandName]);
        return fn({
          isCancelled: false,
          reportProgress: () => {},
          hostControl: {
            async suspendHistory(o) { state.history.push(["suspend", o.documentID, o.name]); return 42; },
            async resumeHistory(id, commit) { state.history.push(["resume", id, commit]); },
          },
        });
      },
    },
    imaging: imagingMissing ? undefined : {
      async getPixels(o) {
        calls.push(["getPixels", o.componentSize, o.sourceBounds, o.targetSize, o.layerID]);
        if (fail8bit && o.componentSize === 8) throw new Error("Photoshop error code -1");
        const sixteen = o.componentSize === 16;
        calls.push(["getPixelsSize", o.targetSize || null]);
        let width = o.sourceBounds.right - o.sourceBounds.left;
        let height = o.sourceBounds.bottom - o.sourceBounds.top;
        let sourceBounds = o.sourceBounds;
        if (trim) { width = trim.w; height = trim.h; sourceBounds = trim.bounds; }
        const n = width * height * 3;
        const data = sixteen ? new Uint16Array(n).fill(32768) : new Uint8Array(n).fill(77);
        return { sourceBounds, level: trim ? trim.level : 0, imageData: { width, height, components: 3, getData: async () => data, dispose: () => calls.push(["dispose"]) } };
      },
      async getSelection(o) {
        const width = o.targetSize ? o.targetSize.width : o.sourceBounds.right - o.sourceBounds.left;
        const height = o.targetSize ? o.targetSize.height : o.sourceBounds.bottom - o.sourceBounds.top;
        return { sourceBounds: o.sourceBounds, imageData: { width, height, components: 1, getData: async () => new Uint8Array(width * height).fill(255), dispose: () => {} } };
      },
      async createImageDataFromBuffer(buf, o) {
        calls.push(["createImageData", buf.length, o, buf]);
        return { ...o, dispose: () => calls.push(["disposeSel"]) };
      },
      async putSelection(o) { state.putSelection = o; calls.push(["putSelection", o.targetBounds]); },
      async putPixels(o) { calls.push(["putPixels", o.layerID, o.targetBounds, o.imageData]); },
    },
    action: {
      async batchPlay(descs, opts) {
        const out = [];
        for (const d of descs) {
          calls.push(["bp", d._obj, d, opts]);
          if (refuse && d._obj === refuse) {
            // what Photoshop returns (it does not throw) when a command is unavailable
            out.push({ _obj: "error", result: -25920, message: `The command “${d._obj}” is not currently available.` });
            continue;
          }
          if (d._obj === "get" && d._target[0]._ref === "layer") out.push({ smartObject: { filterFX: state.filterFX.slice() } });
          else if (d._obj === "curves") { state.filterFX.push({ _obj: "filterFX", filter: { _obj: "curves", adjustment: d.adjustment } }); out.push({}); }
          else if (d._obj === "delete" && d._target[0]._ref === "filterFX") { state.filterFX.splice(d._target[0]._index - 1, 1); out.push({}); }
          else if (d._obj === "get") out.push({ selection: state.selection && { left: { _unit: "pixelsUnit", _value: state.selection.left }, top: state.selection.top, right: state.selection.right, bottom: state.selection.bottom } });
          else if (d._obj === "placeEvent") { makeLayer(1536, 1024); out.push({}); }
          else if (d._obj === "make" && d._target && d._target[0]._ref === "layerSection") { makeLayer(0, 0, "group"); out.push({}); }
          else if (d._obj === "make" && d._target && d._target[0]._ref === "layer") { makeLayer(0, 0, "pixel"); out.push({}); }
          else if (d._obj === "select" && d._target[0]._ref === "layer" && d._target[0]._id) { state.active = state.layers[d._target[0]._id] || state.active; out.push({}); }
          else if (d._obj === "delete" && d._target[0]._ref === "layer") { delete state.layers[d._target[0]._id]; out.push({}); }
          else out.push({});
        }
        return out;
      },
    },
  };

  const uxp = {
    storage: {
      formats: { binary: "binary" },
      localFileSystem: {
        async getTemporaryFolder() {
          return {
            async createFile(name) {
              return {
                name,
                async write(buf, o) { calls.push(["write", name, buf.byteLength, o.format]); },
                async delete() { state.deleted.push(name); },
              };
            },
          };
        },
        createSessionToken: (f) => `token:${f.name}`,
      },
    },
  };

  const origLoad = Module._load;
  Module._load = function (request) {
    if (request === "photoshop") return photoshop;
    if (request === "uxp") return uxp;
    return origLoad.apply(this, arguments);
  };
  const file = path.join(__dirname, "..", "plugin", "src", "photoshop.js");
  delete require.cache[file];
  try {
    return { ps: require(file), calls, state, doc, app };
  } finally {
    Module._load = origLoad;
  }
}

const png = (n) => ({ bytes: new Uint8Array(n), mime: "image/png" });
const bpOps = (calls) => calls.filter((c) => c[0] === "bp").map((c) => c[1]);

test("ensureSupported refuses hosts without the Imaging API", () => {
  assert.throws(() => loadWithFakes({ imagingMissing: true }).ps.ensureSupported(), /27\.11/);
  assert.doesNotThrow(() => loadWithFakes().ps.ensureSupported());
});

test("getSelectionBounds unwraps unit values; null when nothing selected", async () => {
  const { ps, state } = loadWithFakes();
  assert.deepEqual(await ps.getSelectionBounds(7), { left: 10, top: 20, right: 110, bottom: 220 });
  state.selection = null;
  assert.equal(await ps.getSelectionBounds(7), null);
});

test("commit: one layer, like Adobe's: deselect, place and fit the first result, name it, restore the exact selection as its mask, then leave it selected; no group", async () => {
  const { ps, calls, state } = loadWithFakes();
  const crop = { left: 100, top: 50, right: 868, bottom: 562 };
  const sel = { data: new Uint8Array(768 * 512).fill(255), width: 768, height: 512, left: 100, top: 50 };
  const placed = await ps.commit({ docId: 7, results: [png(10), png(20), png(30)], crop, name: "Fulla: test", feather: 4, selection: sel });
  const ops = bpOps(calls);
  assert.equal(ops[0], "set", "deselect first");
  assert.equal(calls.find((c) => c[1] === "set")[2].to._value, "none");
  assert.equal(ops.filter((o) => o === "placeEvent").length, 1, "only the first variation is placed");
  assert.ok(!calls.some((c) => c[1] === "make" && c[2]._target && c[2]._target[0]._ref === "layerSection"), "no group");
  const layer = state.layers[placed.layerId];
  assert.deepEqual(layer.b, crop, "fitted exactly to the crop");
  assert.ok(calls.filter((c) => c[0] === "scale").every((c) => c[2] === "tl"), "scaled from the top-left");
  assert.equal(layer.name, "Fulla: test");
  assert.equal(layer.layerMaskFeather, 0, "the soft edge is in the mask itself, not Photoshop's feather");
  assert.deepEqual(state.putSelection.targetBounds, { left: 100, top: 50 });
  const created = calls.find((c) => c[0] === "createImageData");
  assert.equal(created[1], 768 * 512);
  assert.equal(created[2].colorSpace, "Grayscale");
  // selection restored before the mask is made, on the placed layer (still the active one)
  const putIdx = calls.findIndex((c) => c[0] === "putSelection");
  const maskIdx = calls.findIndex((c) => c[1] === "make" && c[2].using);
  assert.ok(putIdx >= 0 && maskIdx > putIdx);
  // and put back once more at the end, like Adobe: the selection is ready for the next run
  const puts = calls.map((c, i) => (c[0] === "putSelection" ? i : -1)).filter((i) => i >= 0);
  assert.equal(puts.length, 2);
  assert.ok(puts[1] > maskIdx, "selected again after the mask");
  // The mask gets a soft edge; the selection put back for the next run is the exact one.
  const bufs = calls.filter((c) => c[0] === "createImageData").map((c) => c[3]);
  assert.ok(bufs[0][0] < 255 && bufs[0][256 * 768 + 384] === 255, "soft edge at the crop's border, solid inside");
  assert.equal(bufs[1][0], 255, "exact selection restored");
  assert.deepEqual(calls[puts[1]][1], { left: 100, top: 50 });
  assert.equal(state.active.id, placed.layerId);
  assert.equal(state.deleted.length, 1, "temp file removed");
  assert.deepEqual(placed, { docId: 7, layerId: layer.id, crop, tone: null, fixId: null });
});

test("tone matching: the layer's own pixels are read, the correction lands as a Curves smart filter, and each variation gets its own", async () => {
  const { ps, calls, state } = loadWithFakes();
  const crop = { left: 0, top: 0, right: 40, bottom: 20 };
  const sel = { data: new Uint8Array(800).fill(255), width: 40, height: 20, left: 0, top: 0 };
  const seen = [];
  let next = [[{ input: 0, output: 10 }, { input: 255, output: 245 }], [{ input: 0, output: 0 }, { input: 255, output: 255 }], [{ input: 5, output: 0 }, { input: 255, output: 250 }]];
  const matchTone = { size: { width: 20, height: 10 }, fit: (tile) => (seen.push(tile), next && { curves: next }) };
  const placed = await ps.commit({ docId: 7, results: [png(10), png(20)], crop, name: "x", feather: 2, selection: sel, matchTone });
  assert.deepEqual([seen[0].width, seen[0].height, seen[0].components], [20, 10, 4], "the fit gets the layer at the size sent");
  const read = calls.findIndex((c) => c[0] === "getPixels" && c[4] === placed.layerId);
  assert.ok(read >= 0, "read the run's layer, not the composite");
  // ...without its mask: the ring compared lies outside the selection.
  const maskSet = calls.map((c, i) => [i, c]).filter(([, c]) => c[0] === "bp" && c[1] === "set" && c[2].to && "userMaskEnabled" in c[2].to);
  assert.deepEqual(maskSet.map(([i, c]) => [i < read, c[2].to.userMaskEnabled]), [[true, false], [false, true]], "mask off for the read, then on again");
  const ops = calls.filter((c) => c[0] === "bp").map((c) => c[2]);
  const ci = ops.findIndex((d) => d._obj === "curves");
  assert.ok(ci > ops.findIndex((d) => d._obj === "make" && d.using), "after the mask");
  assert.equal(ops[ci - 1]._target[0]._value, "RGB", "on the picture's channels, not the mask");
  assert.deepEqual(ops[ci].adjustment.map((a) => a.channel._value), ["red", "green", "blue"]);
  assert.deepEqual(ops[ci].adjustment[2].curve, [{ _obj: "paint", horizontal: 5, vertical: 0 }, { _obj: "paint", horizontal: 255, vertical: 250 }]);
  assert.equal(state.filterFX.length, 1);
  // A variation drops the old correction and fits a new one; a negligible one leaves no filter.
  // The user's selection is set aside meanwhile (a smart filter would take it as its mask), then put back.
  placed.matchTone = matchTone;
  calls.length = 0;
  await ps.showVariation(placed, png(20));
  assert.equal(state.filterFX.length, 1, "replaced, not stacked");
  const vops = calls.filter((c) => c[0] === "bp").map((c) => c[2]);
  const at = (f) => vops.findIndex(f);
  const aside = at((d) => d._obj === "duplicate" && d._target[0]._property === "selection");
  const none = at((d) => d._obj === "set" && d.to._value === "none");
  const curves = at((d) => d._obj === "curves");
  const back = at((d) => d._obj === "set" && d.to._ref === "channel" && d.to._name === vops[aside].name);
  const gone = at((d) => d._obj === "delete" && d._target[0]._ref === "channel" && d._target[0]._name === vops[aside].name);
  assert.ok(aside >= 0 && aside < none && none < curves && curves < back && back < gone, `selection aside around the tone fit: ${vops.map((d) => d._obj)}`);
  // Without a selection there is nothing to set aside.
  state.selection = null;
  calls.length = 0;
  await ps.showVariation(placed, png(20));
  assert.ok(!calls.some((c) => c[0] === "bp" && c[1] === "duplicate"), "no channel without a selection");
  state.selection = { left: 10, top: 20, right: 110, bottom: 220 };
  next = null;
  await ps.showVariation(placed, png(20));
  assert.equal(state.filterFX.length, 0);
});

test("local tone correction: a clipped Linear Light layer above the result, mid-grey where nothing changes; the result stays active; each variation gets its own", async () => {
  const { ps, calls, state } = loadWithFakes();
  const crop = { left: 100, top: 50, right: 140, bottom: 70 };
  const sel = { data: new Uint8Array(800).fill(255), width: 40, height: 20, left: 100, top: 50 };
  // A 2 x 1 grid: no change on the left, +40 levels on the right.
  let field = Float32Array.of(0, 0, 0, 40, 40, 40);
  const seen = [];
  const matchTone = { size: { width: 20, height: 10 }, fit: () => null, local: (tile, fit, report) => (seen.push([tile.width, fit]), (report.local = { reason: "fitted" }), field && { width: 2, height: 1, field }) };
  const placed = await ps.commit({ docId: 7, results: [png(10)], crop, name: "x", feather: 2, selection: sel, matchTone });
  assert.deepEqual(seen[0], [20, null], "measured on the layer read at the size sent, after the curve (none here)");
  const fix = state.layers[placed.fixId];
  assert.ok(fix && fix.id !== placed.layerId, "a layer of its own");
  const ops = calls.filter((c) => c[0] === "bp").map((c) => c[2]);
  assert.deepEqual([fix.name, fix.blendMode], ["Fulla: tone fix", "linearLight"]);
  const put = calls.find((c) => c[0] === "putPixels");
  assert.equal(put[1], placed.fixId);
  assert.deepEqual(put[2], { left: 100, top: 50 });
  const buf = calls.find((c) => c[0] === "createImageData" && c[2].components === 3)[3];
  assert.deepEqual([buf[0], buf[1], buf[2]], [128, 128, 128], "mid-grey on the left: no change");
  assert.deepEqual(Array.from(buf.slice(39 * 3, 39 * 3 + 3)), [148, 148, 148], "+40 levels on the right: 128 + 40 / 2");
  assert.ok(ops.findIndex((d) => d._obj === "groupEvent") > ops.findIndex((d) => d._obj === "make" && d._target && d._target[0]._ref === "layer"), "clipped to the result");
  assert.equal(state.active.id, placed.layerId, "the result stays the active layer");
  // A variation replaces the layer; when nothing is left to correct, none.
  placed.matchTone = matchTone;
  const first = placed.fixId;
  await ps.showVariation(placed, png(20));
  assert.ok(!state.layers[first] && state.layers[placed.fixId], "replaced");
  field = null;
  const second = placed.fixId;
  await ps.showVariation(placed, png(20));
  assert.ok(!state.layers[second] && placed.fixId === null, "removed, none added");
});

test("tone matching: a greyscale document gets one composite curve; a correction Photoshop refuses leaves the result without it", async () => {
  const crop = { left: 0, top: 0, right: 40, bottom: 20 };
  const sel = { data: new Uint8Array(800).fill(255), width: 40, height: 20, left: 0, top: 0 };
  const gray = [{ input: 0, output: 20 }, { input: 255, output: 250 }];
  const matchTone = { size: { width: 20, height: 10 }, fit: () => ({ curves: [gray, gray, gray], gray }) };
  {
    const { ps, calls, doc } = loadWithFakes();
    doc.mode = "grayscaleMode";
    await ps.commit({ docId: 7, results: [png(10)], crop, name: "x", feather: 2, selection: sel, matchTone });
    const c = calls.find((x) => x[0] === "bp" && x[1] === "curves")[2];
    assert.deepEqual(c.adjustment.map((a) => [a.channel._value, a.curve.map((p) => p.vertical)]), [["composite", [20, 250]]]);
  }
  {
    // Seen 2026-11-12: "Photoshop refused curves" threw away a paid result.
    const { ps, state } = loadWithFakes({ refuse: "curves" });
    const trace = [];
    const placed = await ps.commit({ docId: 7, results: [png(10)], crop, name: "x", feather: 2, selection: sel, matchTone, trace });
    assert.equal(placed.tone, null);
    assert.equal(state.active.id, placed.layerId, "the result is kept");
    assert.ok(trace.some((t) => t.step === "toneError" && /curves/.test(t.message)), "the reason is in the trace");
  }
});

test("commit: on the sides where the crop meets the canvas edge, the result reaches 2 px beyond it; selected pixels with nothing under them keep a full mask", async () => {
  // Photoshop smooths the last pixel of a scaled layer: a faint see-through edge in an extended canvas (2026-11-12).
  const { ps, state, calls } = loadWithFakes();
  const crop = { left: 1900, top: 900, right: 2000, bottom: 1000 };
  const sel = { data: new Uint8Array(100 * 100).fill(255), width: 100, height: 100, left: 1900, top: 900 };
  const placed = await ps.commit({ docId: 7, results: [png(10)], crop, name: "x", feather: 2, selection: sel });
  assert.deepEqual(state.layers[placed.layerId].b, { left: 1900, top: 900, right: 2002, bottom: 1002 });
  assert.deepEqual(placed.crop, crop);
  const mask = () => calls.filter((c) => c[0] === "createImageData")[0][3];
  assert.ok(mask()[0] < 255, "soft edge inside the canvas");
  calls.length = 0;
  await ps.commit({ docId: 7, results: [png(10)], crop, name: "x", feather: 2, selection: { ...sel, cover: new Uint8Array(100 * 100).fill(255) } });
  assert.equal(mask()[0], 255, "nothing under it: fully covered");
});

test("commit refuses a closed document", async () => {
  const { ps, app } = loadWithFakes();
  app.documents = [];
  await assert.rejects(ps.commit({ docId: 7, results: [png(1)], crop: { left: 0, top: 0, right: 1, bottom: 1 }, name: "x", feather: 2, selection: {} }), /closed/);
});

test("modal commits history on success, rolls back on failure, skips history for reads", async () => {
  const { ps, state } = loadWithFakes();
  assert.equal(await ps.modal("Fulla fill", async () => 5, { historyDocId: 7 }), 5);
  assert.deepEqual(state.history.slice(0, 2), [["suspend", 7, "Fulla fill"], ["resume", 42, true]]);
  await assert.rejects(ps.modal("Fulla fill", async () => { throw new Error("boom"); }, { historyDocId: 7 }), /boom/);
  assert.deepEqual(state.history.at(-1), ["resume", 42, false]);
  const before = state.history.length;
  await ps.modal("Fulla: read", async () => 1);
  assert.equal(state.history.length, before, "reads make no history step");
});

test("readComposite falls back to 16-bit, converts to 8-bit, never asks Photoshop to scale", async () => {
  const { ps, calls } = loadWithFakes({ fail8bit: true });
  const r = await ps.readComposite(7, { left: 0, top: 0, right: 100, bottom: 50 }, { width: 64, height: 32 });
  assert.deepEqual(calls.filter((c) => c[0] === "getPixels").map((c) => c[1]).slice(0, 2), [8, 16]);
  assert.ok(calls.filter((c) => c[0] === "getPixelsSize").every((c) => c[1] === null), "no targetSize passed to Photoshop");
  assert.ok(r.data instanceof Uint8Array);
  assert.equal(r.width, 64);
  assert.equal(r.components, 4);
  assert.equal(r.data[0], 255, "Photoshop 16-bit white (32768) becomes 255");
  assert.ok(calls.some((c) => c[0] === "dispose"));
  await ps.readLayer(7, 42, { left: 0, top: 0, right: 100, bottom: 50 }, { width: 64, height: 32 });
  assert.equal(calls.filter((c) => c[0] === "getPixels").pop()[4], 42, "readLayer reads that layer, not the composite");
});

test("readComposite maps a trimmed read back onto the requested area", async () => {
  // asked for 0..100 x 0..50 at 100x50; Photoshop returned only the right half (pixels exist only there)
  const { ps } = loadWithFakes({ trim: { w: 50, h: 50, bounds: { left: 50, top: 0, right: 100, bottom: 50 }, level: 0 } });
  const r = await ps.readComposite(7, { left: 0, top: 0, right: 100, bottom: 50 }, { width: 100, height: 50 });
  assert.equal(r.width, 100);
  assert.equal(r.components, 4);
  assert.equal(r.data.length, 100 * 50 * 4);
  assert.equal(r.data[3], 0, "left half transparent");
  assert.equal(r.data[(10 * 100 + 75) * 4], 77, "right half has the pixels");
  assert.equal(r.data[(10 * 100 + 75) * 4 + 3], 255);
});

test("readSelection full resolution when no size given", async () => {
  const { ps } = loadWithFakes();
  const r = await ps.readSelection(7, { left: 10, top: 10, right: 40, bottom: 30 }, null);
  assert.equal(r.width, 30);
  assert.equal(r.height, 20);
  assert.equal(r.data.length, 600);
});

test("showVariation replaces the run layer's content as one undo step; a deleted layer or closed document says so", async () => {
  const { ps, calls, state, app } = loadWithFakes();
  const sel = { data: new Uint8Array(4).fill(255), width: 2, height: 2, left: 0, top: 0 };
  const placed = await ps.commit({ docId: 7, results: [png(10), png(20)], crop: { left: 0, top: 0, right: 2, bottom: 2 }, name: "x", feather: 2, selection: sel });
  calls.length = 0;
  await ps.showVariation(placed, png(20));
  const ops = calls.filter((c) => c[0] === "bp").map((c) => c[2]);
  assert.deepEqual(ops.map((d) => d._obj), ["select", "placedLayerReplaceContents"]);
  assert.equal(ops[0]._target[0]._id, placed.layerId, "the run's layer is the one replaced");
  assert.match(ops[1].null._path, /^token:fulla-.*\.png$/);
  assert.deepEqual(state.history.slice(-2), [["suspend", 7, "Fulla: variation"], ["resume", 42, true]]);
  assert.equal(state.deleted.length, 2, "temp files removed");
  delete state.layers[placed.layerId];
  await assert.rejects(ps.showVariation(placed, png(20)), /layer was deleted/);
  app.documents = [];
  await assert.rejects(ps.showVariation(placed, png(20)), /document is closed/);
});

test("refused commands become errors, never Photoshop dialogs", async () => {
  const { ps, calls, state } = loadWithFakes({ refuse: "placeEvent" });
  const sel = { data: new Uint8Array(4), width: 2, height: 2, left: 0, top: 0 };
  await assert.rejects(
    ps.commit({ docId: 7, results: [png(10)], crop: { left: 0, top: 0, right: 2, bottom: 2 }, name: "x", feather: 2, selection: sel }),
    (e) => e.name === "HostError" && /Photoshop refused "placeEvent": The command/.test(e.message)
  );
  assert.equal(state.deleted.length, 1, "temp file still removed");
  assert.ok(calls.filter((c) => c[0] === "bp").every((c) => c[3] && c[3].dialogOptions === "silent"), "every batchPlay call is silent");
  const g = loadWithFakes({ refuse: "get" });
  assert.equal(await g.ps.getSelectionBounds(7), null, "a refused selection read means no selection");
});

test("large reads are split so no single Photoshop read exceeds 4 MP", async () => {
  const { ps, calls } = loadWithFakes();
  const r = await ps.readComposite(7, { left: 0, top: 0, right: 3000, bottom: 2000 }, { width: 3000, height: 2000 });
  assert.equal(r.data.length, 3000 * 2000 * 4);
  const reads = calls.filter((c) => c[0] === "getPixels");
  assert.ok(reads.length >= 2, `${reads.length} reads`);
  for (const c of reads) {
    const b = c[2];
    assert.ok((b.right - b.left) * (b.bottom - b.top) <= 4000000, `read of ${JSON.stringify(b)} too big`);
  }
  // strips tile the area exactly: contiguous rows, full width
  let next = 0;
  for (const c of reads) { assert.equal(c[2].top, next); assert.equal(c[2].left, 0); assert.equal(c[2].right, 3000); next = c[2].bottom; }
  assert.equal(next, 2000);
});
