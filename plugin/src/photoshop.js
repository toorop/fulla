// Everything that touches Photoshop. The pipeline calls these; nothing else imports "photoshop".
// Targets the current Photoshop and the beta (manifest minVersion). Network calls never happen inside a modal scope, so
// Photoshop stays usable while a provider is generating.

const { app, core, action, imaging, constants } = require("photoshop");
const uxp = require("uxp");
const { to8bit, placeInto, toRGBA, resample, downsampleStrips } = require("./image");
const { tagSrgb } = require("./png");

const lfs = uxp.storage.localFileSystem;
const formats = uxp.storage.formats;

const px = (v) => ({ _unit: "pixelsUnit", _value: v });
const num = (v) => (v && typeof v === "object" && "_value" in v ? v._value : v);
const TARGET = { _ref: "layer", _enum: "ordinal", _value: "targetEnum" };
const SELECTION = { _ref: "channel", _property: "selection" };
const SRGB = "sRGB IEC61966-2.1";

class HostError extends Error {
  constructor(message) {
    super(message);
    this.name = "HostError";
  }
}

/**
 * batchPlay that never shows Photoshop's own dialogs and turns refusals into errors.
 * (batchPlay does not throw when a command fails; it returns an {_obj: "error"} descriptor.)
 */
async function bp(descriptors) {
  const results = await action.batchPlay(descriptors, { dialogOptions: "silent" });
  (results || []).forEach((r, i) => {
    if (r && r._obj === "error") {
      throw new HostError(`Photoshop refused "${descriptors[i]._obj}": ${r.message || `error ${r.result}`}`);
    }
  });
  return results;
}

function ensureSupported() {
  if (!imaging || typeof imaging.getPixels !== "function") {
    throw new HostError("Fulla needs Photoshop 2026 version 27.11 or newer. Update Photoshop and try again.");
  }
}

function findDoc(id) {
  const d = app.documents && Array.from(app.documents).find((x) => x.id === id);
  if (!d) throw new HostError("The document was closed before the result arrived.");
  return d;
}

/**
 * Run fn in a modal scope. With `historyDocId`, every edit inside becomes one named undo step and
 * is rolled back if fn throws.
 */
async function modal(name, fn, { historyDocId } = {}) {
  // Errors thrown inside executeAsModal lose their message on the way out, so the
  // outcome is carried out as a value and the original error is rethrown here.
  const outcome = await core.executeAsModal(
    async (ec) => {
      const hc = ec.hostControl;
      let suspension = null;
      if (historyDocId && hc && typeof hc.suspendHistory === "function") {
        suspension = await hc.suspendHistory({ documentID: historyDocId, name });
      }
      try {
        const value = await fn();
        if (suspension !== null) await hc.resumeHistory(suspension, true);
        return { ok: true, value };
      } catch (error) {
        if (suspension !== null) {
          try {
            await hc.resumeHistory(suspension, false);
          } catch (_) {
            /* keep the original error */
          }
        }
        return { ok: false, error };
      }
    },
    { commandName: name }
  );
  if (outcome && outcome.ok === false) throw outcome.error;
  return outcome ? outcome.value : undefined;
}

async function getDocument() {
  const d = app.activeDocument;
  if (!d) return null;
  return { id: d.id, width: Math.round(num(d.width)), height: Math.round(num(d.height)), resolution: num(d.resolution) };
}

async function getSelectionBounds(docId) {
  let r;
  try {
    [r] = await bp([{ _obj: "get", _target: [{ _property: "selection" }, { _ref: "document", _id: docId }] }]);
  } catch (_) {
    return null; // no selection can come back as a refusal
  }
  const s = r && r.selection;
  if (!s) return null;
  const b = { left: num(s.left), top: num(s.top), right: num(s.right), bottom: num(s.bottom) };
  return b.right > b.left && b.bottom > b.top ? b : null;
}

// Imaging may trim the read to the area that has pixels and reports bounds relative to a pyramid level.
// Map whatever came back onto exactly `bounds` at exactly `size`.
function normalize(data, imageData, returned, level, bounds, size, comps) {
  const w = imageData.width;
  const h = imageData.height;
  const exact = !returned || (Math.abs(returned.left * 2 ** (level || 0) - bounds.left) < 1 && Math.abs(returned.top * 2 ** (level || 0) - bounds.top) < 1);
  if (exact && w === size.width && h === size.height) return { data, width: w, height: h, components: comps };
  let src = bounds;
  if (returned) {
    const k = 2 ** (level || 0);
    const scaled = { left: returned.left * k, top: returned.top * k, right: returned.right * k, bottom: returned.bottom * k };
    const inside = (r) => r.left >= bounds.left - k && r.top >= bounds.top - k && r.right <= bounds.right + k && r.bottom <= bounds.bottom + k;
    src = inside(scaled) ? scaled : inside(returned) ? returned : bounds;
  }
  const out = placeInto(data, w, h, comps, src, bounds, size.width, size.height);
  return out;
}

async function getPixelsAnyDepth(opts) {
  let lastErr;
  // 8-bit first; 16-bit documents can refuse an 8-bit read on some builds, so fall back.
  for (const componentSize of [8, 16, -1]) {
    try {
      return await imaging.getPixels({ ...opts, componentSize });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// Photoshop 27.10 returns misaligned data for single very large reads (seen at 24 MP), so no single
// read covers more than this many pixels; bigger areas are read as strips and assembled.
const MAX_READ_PIXELS = 4000000;

/** Read `b` at full resolution, mapped exactly onto b, in strips. RGBA (composite, or one layer) or 1-byte mask (selection). */
async function readExact(docId, b, gray, layerId) {
  const w = b.right - b.left;
  const h = b.bottom - b.top;
  const rows = Math.max(1, Math.floor(MAX_READ_PIXELS / w));
  if (rows >= h) return readOne(docId, b, gray, layerId);
  const comps = gray ? 1 : 4;
  const out = new Uint8Array(w * h * comps);
  for (let y = 0; y < h; y += rows) {
    const y1 = Math.min(h, y + rows);
    out.set(await readOne(docId, { left: b.left, right: b.right, top: b.top + y, bottom: b.top + y1 }, gray, layerId), y * w * comps);
  }
  return out;
}

/** One imaging call for `b` (callers keep it small). With a layer id, that layer's own pixels (its mask is not applied). */
async function readOne(docId, b, gray, layerId) {
  const w = b.right - b.left;
  const h = b.bottom - b.top;
  let res;
  try {
    res = gray
      ? await imaging.getSelection({ documentID: docId, sourceBounds: b })
      : await getPixelsAnyDepth({ documentID: docId, ...(layerId ? { layerID: layerId } : {}), sourceBounds: b, colorSpace: "RGB", colorProfile: SRGB });
  } catch (e) {
    const msg = String((e && e.message) || e);
    // Photoshop refuses reads of areas with nothing in them (no pixels / nothing selected).
    // Bounds here are always inside the document, so that means "empty", not a bug.
    if (/Invalid Source Bounds/i.test(msg)) return new Uint8Array(w * h * (gray ? 1 : 4));
    throw new HostError(`${msg} (reading ${gray ? "selection" : "pixels"} ${b.left},${b.top} to ${b.right},${b.bottom})`);
  }
  try {
    const data = to8bit(await res.imageData.getData({ chunky: true }));
    const n = normalize(data, res.imageData, res.sourceBounds, res.level, b, { width: w, height: h }, gray ? 1 : res.imageData.components);
    return gray ? n.data : toRGBA(n.data, w, h, n.components);
  } finally {
    res.imageData.dispose();
  }
}

/**
 * Read `bounds` at `size`. Photoshop's own scaled reads come back shifted by a few pixels when
 * shrinking (seen on 27.10), so pixels are always read at full resolution, in strips, and scaled here.
 */
async function readScaled(docId, bounds, size, gray, layerId) {
  const b = { left: Math.round(bounds.left), top: Math.round(bounds.top), right: Math.round(bounds.right), bottom: Math.round(bounds.bottom) };
  const W = b.right - b.left;
  const H = b.bottom - b.top;
  const comps = gray ? 1 : 4;
  const dw = Math.min(W, size.width);
  const dh = Math.min(H, size.height);
  let img;
  if (dw === W && dh === H) img = await readExact(docId, b, gray, layerId);
  else {
    const strip = (y0, y1) => readExact(docId, { left: b.left, right: b.right, top: b.top + y0, bottom: b.top + y1 }, gray, layerId);
    img = await downsampleStrips(strip, W, H, comps, dw, dh);
  }
  if (dw !== size.width || dh !== size.height) img = resample(img, dw, dh, comps, size.width, size.height);
  return { data: img, width: size.width, height: size.height, components: comps };
}

/** Composite pixels of `bounds` (document px) at `size`. 8-bit RGBA. */
async function readComposite(docId, bounds, size) {
  return readScaled(docId, bounds, size, false);
}

/** One layer's own pixels in `bounds`, at `size`, RGBA; its mask is not applied (self-test measures). */
async function readLayer(docId, layerId, bounds, size) {
  return readScaled(docId, bounds, size, false, layerId);
}

/**
 * Selection mask of `bounds`; at `size`, or full resolution when size is null. 1 byte per pixel.
 * Photoshop refuses selection reads that miss the selection, so only the selection's own bounding
 * box is read (once, full resolution); everything else is unselected. Shrinking happens in memory.
 */
async function readSelection(docId, bounds, size) {
  const b = { left: Math.round(bounds.left), top: Math.round(bounds.top), right: Math.round(bounds.right), bottom: Math.round(bounds.bottom) };
  const W = b.right - b.left;
  const H = b.bottom - b.top;
  const full = new Uint8Array(W * H);
  const sel = await getSelectionBounds(docId);
  if (sel) {
    const i = {
      left: Math.max(b.left, Math.floor(sel.left)),
      top: Math.max(b.top, Math.floor(sel.top)),
      right: Math.min(b.right, Math.ceil(sel.right)),
      bottom: Math.min(b.bottom, Math.ceil(sel.bottom)),
    };
    if (i.right > i.left && i.bottom > i.top) {
      const part = await readExact(docId, i, true);
      const iw = i.right - i.left;
      for (let y = 0; y < i.bottom - i.top; y++) {
        full.set(part.subarray(y * iw, (y + 1) * iw), (y + i.top - b.top) * W + (i.left - b.left));
      }
    }
  }
  if (!size || (size.width === W && size.height === H)) return { data: full, width: W, height: H };
  const dw = Math.min(W, size.width);
  const dh = Math.min(H, size.height);
  let img = dw === W && dh === H ? full : await downsampleStrips(async (y0, y1) => full.subarray(y0 * W, y1 * W), W, H, 1, dw, dh);
  if (dw !== size.width || dh !== size.height) img = resample(img, dw, dh, 1, size.width, size.height);
  return { data: img, width: size.width, height: size.height };
}

async function writeTemp(bytes, ext) {
  const folder = await lfs.getTemporaryFolder();
  const name = `fulla-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const file = await folder.createFile(name, { overwrite: true });
  await file.write(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { format: formats.binary });
  return file;
}

function layerBounds(layer) {
  const b = layer.bounds;
  return { left: num(b.left), top: num(b.top), right: num(b.right), bottom: num(b.bottom) };
}

/** Place one image file as an embedded smart object and fit it exactly onto `crop`. Returns the layer. */
async function placeFitted(doc, file, crop, trace) {
  const t = (step, extra) => trace && trace.push({ step, ...extra });
  const token = lfs.createSessionToken(file);
  await bp([
    {
      _obj: "placeEvent",
      null: { _path: token, _kind: "local" },
      freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
      offset: { _obj: "offset", horizontal: px(0), vertical: px(0) },
    },
  ]);
  const layer = doc.activeLayers[0];
  let b = layerBounds(layer);
  t("placed", { id: layer.id, name: layer.name, kind: String(layer.kind), bounds: b, crop });
  const sx = ((crop.right - crop.left) / (b.right - b.left)) * 100;
  const sy = ((crop.bottom - crop.top) / (b.bottom - b.top)) * 100;
  if (Math.abs(sx - 100) > 0.01 || Math.abs(sy - 100) > 0.01) {
    await layer.scale(sx, sy, constants.AnchorPosition.TOPLEFT);
    b = layerBounds(layer);
    t("scaled", { sx, sy, bounds: b });
  }
  const dx = crop.left - b.left;
  const dy = crop.top - b.top;
  if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
    await layer.translate(dx, dy);
    t("moved", { dx, dy, bounds: layerBounds(layer) });
  }
  return layer;
}

async function putSelectionPixels(docId, s) {
  const imageData = await imaging.createImageDataFromBuffer(s.data, {
    width: s.width,
    height: s.height,
    components: 1,
    chunky: true,
    colorSpace: "Grayscale",
    colorProfile: "Gray Gamma 2.2",
  });
  try {
    await imaging.putSelection({ documentID: docId, imageData, replace: true, targetBounds: { left: s.left, top: s.top } });
  } finally {
    imageData.dispose();
  }
}

/** A result as a temp file Photoshop can place, tagged sRGB (pixels were read and sent as sRGB). */
async function resultFile(r) {
  const ext = /jpe?g/.test(r.mime) ? "jpg" : /webp/.test(r.mime) ? "webp" : "png";
  // Say it's sRGB, so Photoshop converts it into the document's profile instead of reading it as if
  // it were already in it.
  return writeTemp(tagSrgb(r.bytes), ext);
}

async function removeTemp(file) {
  try {
    await file.delete();
  } catch (_) {
    /* the temp folder is cleared when the plugin unloads */
  }
}

function findLayer(layers, id) {
  for (const l of Array.from(layers || [])) {
    if (l.id === id) return l;
    const inner = findLayer(l.layers, id);
    if (inner) return inner;
  }
  return null;
}

// Curves channels in descriptor terms (Photoshop names green "grain" in colours, not in channels).
const CURVE_CHANNELS = ["red", "green", "blue"];

/** Remove the Curves smart filters Fulla put on the layer (they were fitted to the previous content). */
async function removeToneFilters(layerId) {
  const [d] = await bp([{ _obj: "get", _target: [{ _ref: "layer", _id: layerId }] }]);
  const fx = (d && d.smartObject && d.smartObject.filterFX) || [];
  for (let i = fx.length; i >= 1; i--) {
    if (fx[i - 1] && fx[i - 1].filter && fx[i - 1].filter._obj === "curves") {
      await bp([{ _obj: "delete", _target: [{ _ref: "filterFX", _index: i }, { _ref: "layer", _id: layerId }] }]);
    }
  }
}

/**
 * Tone matching (tone.js): read the layer's own pixels over the crop, let `match.fit` compare them with
 * the original, and apply the correction as a Curves smart filter. Nothing when the fit says it's not needed.
 * @param {{size: {width, height}, fit: (px: {data, width, height, components}) => object|null}} match
 */
async function matchTone(docId, layerId, crop, match) {
  if (!match) return null;
  const tile = await readScaled(docId, crop, match.size, false, layerId);
  const fit = match.fit(tile);
  if (!fit) return null;
  const point = (p) => ({ _obj: "paint", horizontal: p.input, vertical: p.output });
  await bp([
    { _obj: "select", _target: [{ _ref: "layer", _id: layerId }], makeVisible: false },
    // The new mask is the target channel; Curves needs the picture's own channels.
    { _obj: "select", _target: [{ _ref: "channel", _enum: "channel", _value: "RGB" }] },
    {
      _obj: "curves",
      presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
      adjustment: fit.curves.map((pts, i) => ({ _obj: "curvesAdjustment", channel: { _ref: "channel", _enum: "channel", _value: CURVE_CHANNELS[i] }, curve: pts.map(point) })),
    },
  ]);
  return fit;
}

// An alpha channel that holds the user's selection while Fulla works without one.
const KEPT_SELECTION = "Fulla: kept selection";

/**
 * Set the active selection aside (in a temporary channel) and deselect; returns a function that
 * puts it back and removes the channel. Nothing to do without a selection. Smart filters added
 * while a selection is active get it as their mask, so tone matching runs without one.
 */
async function setSelectionAside(docId) {
  if (!(await getSelectionBounds(docId))) return async () => {};
  await bp([
    { _obj: "duplicate", _target: [SELECTION], name: KEPT_SELECTION },
    { _obj: "set", _target: [SELECTION], to: { _enum: "ordinal", _value: "none" } },
  ]);
  return () =>
    bp([
      { _obj: "set", _target: [SELECTION], to: { _ref: "channel", _name: KEPT_SELECTION } },
      { _obj: "delete", _target: [{ _ref: "channel", _name: KEPT_SELECTION }] },
    ]);
}

/**
 * Apply a finished generation to the document, like Adobe's Generative Fill: one layer (the first
 * result as a smart object fitted to the crop), named after the prompt, with the selection as its
 * own mask. No group. The selection is put back at the end, as Adobe does, for the next run. Other variations are swapped in later with showVariation.
 * Call inside modal(..., { historyDocId }).
 * @param {object} o
 * @param {number} o.docId
 * @param {Array<{bytes, mime}>} o.results
 * @param {{left,top,right,bottom}} o.crop   where the result goes (document px)
 * @param {string} o.name                    layer name
 * @param {number} o.feather                 mask feather in px
 * @param {object} o.selection               {data, width, height, left, top}: the selection read before generating
 * @returns {Promise<{docId, layerId, crop}>}
 */
async function commit(o) {
  const doc = findDoc(o.docId);
  if (app.activeDocument.id !== doc.id) app.activeDocument = doc;

  // Transforms with an active selection only move the selected pixels, so place with nothing selected.
  await bp([{ _obj: "set", _target: [SELECTION], to: { _enum: "ordinal", _value: "none" } }]);

  const file = await resultFile(o.results[0]);
  try {
    const layer = await placeFitted(doc, file, o.crop, o.trace);
    layer.name = o.name;
    // Recreate the exact selection, then turn it into the layer's mask.
    await putSelectionPixels(doc.id, o.selection);
    await bp([{ _obj: "make", new: { _class: "channel" }, at: { _ref: "channel", _enum: "channel", _value: "mask" }, using: { _enum: "userMaskEnabled", _value: "revealSelection" } }]);
    try {
      layer.layerMaskFeather = o.feather;
    } catch (_) {
      /* feather is cosmetic; the mask itself is correct */
    }
    // After the mask, as in the self-test's exploration: reads ignore the mask, Curves then lands on the picture.
    const tone = await matchTone(doc.id, layer.id, o.crop, o.matchTone);
    // Like Adobe's Generative Fill, the selection stays for the next run (making the mask used it up).
    await putSelectionPixels(doc.id, o.selection);
    if (o.trace) o.trace.push({ step: "done", layer: layer.id, bounds: layerBounds(layer), doc: [num(doc.width), num(doc.height)], tone });
    return { docId: doc.id, layerId: layer.id, crop: o.crop, tone };
  } finally {
    await removeTemp(file);
  }
}

/**
 * Show another variation: replace the content of the run's smart object (its mask and place stay),
 * as one undo step, like a click on a variation in Adobe's Properties panel.
 * @param {{docId, layerId}} placed  what commit returned
 * @param {{bytes, mime}} result
 */
async function showVariation(placed, result) {
  const doc = Array.from(app.documents || []).find((d) => d.id === placed.docId);
  if (!doc) throw new HostError("That document is closed. Generate again.");
  if (!findLayer(doc.layers, placed.layerId)) throw new HostError("That Fulla layer was deleted. Generate again.");
  return modal(
    "Fulla: variation",
    async () => {
      if (app.activeDocument.id !== doc.id) app.activeDocument = doc;
      const file = await resultFile(result);
      try {
        await bp([
          { _obj: "select", _target: [{ _ref: "layer", _id: placed.layerId }], makeVisible: false },
          { _obj: "placedLayerReplaceContents", null: { _path: lfs.createSessionToken(file), _kind: "local" } },
        ]);
      } finally {
        await removeTemp(file);
      }
      // Each variation shifts tones its own way: drop the previous correction, fit this one,
      // with the user's selection set aside meanwhile (it would become the filter's mask).
      if (placed.matchTone) {
        const putBack = await setSelectionAside(placed.docId);
        try {
          await removeToneFilters(placed.layerId);
          return await matchTone(placed.docId, placed.layerId, placed.crop, placed.matchTone);
        } finally {
          await putBack();
        }
      }
      return null;
    },
    { historyDocId: placed.docId }
  );
}

module.exports = {
  HostError,
  bp,
  ensureSupported,
  modal,
  getDocument,
  getSelectionBounds,
  readComposite,
  readLayer,
  readSelection,
  commit,
  showVariation,
};
