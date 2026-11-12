// One generation, start to finish, in three phases:
//   1. read   (short modal scope): selection, pixels and masks; the document is not changed
//   2. generate (no modal scope): the network call; Photoshop stays usable
//   3. commit (one modal scope, one undo step): place one layer, mask it
// Photoshop access goes through `ps` (photoshop.js, or a fake in tests), so this file has no host dependencies.

const { computeCrop, inputSize } = require("./geometry");
const { resample, toRGB, dilate, coverage, emptyUnder } = require("./image");
const { taskFor } = require("./prompts");
const { fitTone, localTone } = require("./tone");
const { imageSize } = require("./png");

// Whole photo as a scene reference (roadmap 3.3): its long side, and when it is worth sending (the area
// sent covers less than this share of the photo; above, the model already sees most of it).
const SCENE_SIDE = 1024;
const SCENE_MAX_SHARE = 0.5;

// An extend (at least this share of the selection has nothing under it: an enlarged canvas) gets a
// wide margin of photo around it, OpenFill's 35 %, instead of geometry.js's thin default. With the
// thin margin, a band along one side went as a 1:4 strip, mostly empty, with a sliver of photo: the
// model drew a scene of its own there, once rotated 90° (2026-11-12). The thin margin keeps added
// objects inside the selection; an extend has no such risk.
const EXTEND_SHARE = 0.5;
const EXTEND_CONTEXT = 0.35;

/** A message for the user. `code` names the cases the panel follows up on ("noDocument", "noSelection"). */
class UserError extends Error {
  constructor(message, code = "") {
    super(message);
    this.code = code;
  }
}

/** Layer name: the prompt, shortened; an empty prompt fills the selection (remove or extend). */
function layerName(prompt) {
  const p = (prompt || "").trim().replace(/\s+/g, " ");
  if (!p) return "Fulla: Fill";
  return `Fulla: ${p.length > 40 ? p.slice(0, 39) + "…" : p}`;
}

const asUserError = (fn) => {
  try {
    return fn();
  } catch (e) {
    throw new UserError(e.message);
  }
};

/**
 * Phase 1: read the selection and the pixels around it (and the whole photo, reduced, when asked),
 * and the document's reference images, as many as the model takes (lowest numbers first).
 */
async function read(ps, doc, fit, { sceneRef, upload, context, minSide }, maxRefs) {
  const selection = await ps.getSelectionBounds(doc.id);
  if (!selection) throw new UserError("Make a selection first (any selection tool).", "noSelection");
  const area = async (ctx) => {
    const geo = asUserError(() => computeCrop({ docWidth: doc.width, docHeight: doc.height, selection, fit, context: ctx, minSide }));
    // Never more pixels than the area has: an upscaled image is soft, and the model copies that softness
    // (review A1, 2026-11-08: about 15 % more fine detail sent at the area's own size, same price).
    // "target" (the old way, kept for A/B tests): the output size.
    const cw = geo.crop.right - geo.crop.left;
    const inp = upload !== "target" && cw < geo.target.width ? inputSize({ width: cw, height: geo.crop.bottom - geo.crop.top }) : inputSize(geo.target);
    const px = await ps.readComposite(doc.id, geo.crop, inp);
    const small = await ps.readSelection(doc.id, geo.crop, inp);
    let mask = small.data;
    if (small.width !== inp.width || small.height !== inp.height) mask = resample(mask, small.width, small.height, 1, inp.width, inp.height);
    return { geo, inp, px, mask };
  };
  let a = await area(context);
  if (coverage(a.mask) === 0) throw new UserError("The selection is empty.");
  // The model blends within the thin margin, whatever was sent: tone matching keeps that far from the selection.
  const blend = a.geo.margin;
  if (context === undefined) {
    const empty = emptyUnder(a.mask, a.inp.width, a.inp.height, a.px.data, a.px.width, a.px.height, a.px.components);
    const count = (m) => m.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
    if (empty && count(empty) >= EXTEND_SHARE * count(a.mask)) a = await area(EXTEND_CONTEXT);
  }
  const { geo, inp, px, mask } = a;
  let rgb = toRGB(px.data, px.width, px.height, px.components);
  if (px.width !== inp.width || px.height !== inp.height) rgb = resample(rgb, px.width, px.height, 3, inp.width, inp.height);
  // Where the document has pixels (local tone correction measures only there).
  let solid = null;
  if (px.components === 4) {
    solid = new Uint8Array(px.width * px.height);
    for (let i = 0; i < solid.length; i++) solid[i] = px.data[i * 4 + 3];
    if (px.width !== inp.width || px.height !== inp.height) solid = resample(solid, px.width, px.height, 1, inp.width, inp.height);
  }
  // Full-resolution copy of the selection, so the final layer mask is exact even if the user
  // changes the selection while the provider is working.
  const full = await ps.readSelection(doc.id, geo.crop, null);
  const cover = emptyUnder(full.data, full.width, full.height, px.data, px.width, px.height, px.components);
  let scene = null;
  const share = ((geo.crop.right - geo.crop.left) * (geo.crop.bottom - geo.crop.top)) / (doc.width * doc.height);
  if (sceneRef && share < SCENE_MAX_SHARE) {
    const k = Math.min(1, SCENE_SIDE / Math.max(doc.width, doc.height));
    const size = { width: Math.max(1, Math.round(doc.width * k)), height: Math.max(1, Math.round(doc.height * k)) };
    const px = await ps.readComposite(doc.id, { left: 0, top: 0, right: doc.width, bottom: doc.height }, size);
    scene = { rgb: toRGB(px.data, px.width, px.height, px.components), width: px.width, height: px.height };
  }
  const refs = [];
  if (maxRefs > 0 && ps.listReferences) {
    for (const r of (await ps.listReferences(doc.id)).slice(0, maxRefs)) refs.push({ number: r.number, ...(await ps.readReference(doc.id, r.id)) });
  }
  return { geo, inp, rgb, solid, mask, scene, refs, blend, selection: { data: full.data, width: full.width, height: full.height, left: geo.crop.left, top: geo.crop.top, cover } };
}

/**
 * @param {object} o
 * @param {object} o.ps          Photoshop adapter
 * @param {object} o.provider    provider adapter
 * @param {Function} o.fetch
 * @param {string} o.apiKey
 * @param {string} o.model
 * @param {string} [o.modelName]  shown in progress ("Generating with Nano Banana 2.1"); the provider's name if absent
 * @param {string} [o.prompt]    what to paint in the selection; empty removes what is selected
 * @param {number} [o.n=1]
 * @param {string} [o.quality]
 * @param {string} [o.resolution="auto"]  "auto": the smallest size that covers the selection, at least about twice its size (1K for a
 *   small one, else 2K or more), up to 4K (provider.autoMax);
 *   "1K" / "2K" / "4K": that size, when the model offers it
 * @param {boolean} [o.sceneRef]  also send the whole photo, reduced, as a scene reference (roadmap 3.3)
 * @param {"crop"|"target"} [o.upload="crop"]  size of the image sent: the area's own pixels at most
 *   (default), or the output size, upscaling a smaller area (the old way, for A/B tests)
 * @param {number} [o.context]  margin around the selection, as a fraction of its longest side
 *   (geometry.js default when absent); for A/B tests of how much room the model gets
 * @param {number} [o.minSide]  smallest side of the area sent (geometry.js default when absent); for
 *   A/B tests on small selections
 * @param {(label: string) => void} [o.progress]
 * @param {() => boolean} [o.cancelled]
 * @param {Promise} [o.whenCancelled]  resolves on Cancel: the request in flight is dropped at once
 * @param {(usage: object) => void} [o.onUsage]  token counts of each provider reply, even if the run then fails
 */
async function runGeneration(o) {
  const { ps, provider } = o;
  const progress = o.progress || (() => {});
  const cancelled = o.cancelled || (() => false);
  const checkCancel = () => {
    if (cancelled()) throw new UserError("Cancelled. Nothing was changed.");
  };

  if (ps.ensureSupported) asUserError(() => ps.ensureSupported());
  const doc = await ps.getDocument();
  if (!doc) throw new UserError("Open a document first.", "noDocument");
  const forced = o.resolution && o.resolution !== "auto";
  // Auto: the smallest size that covers the area, up to the provider's Auto ceiling (4K by default),
  // and at least about twice the area (oversampled: as sharp as the photo, and models keep the tones
  // better): 1K when it covers twice the area (up to ~512 px), else at least 2K. A/B 2026-11-10 on a
  // 271 px area: 1K as good as 2K, 25 % cheaper.
  const floor = (w, h) => {
    const s = provider.fitSize(o.model, 2 * w, 2 * h, "1K", { exact: true });
    return s.width >= 2 * w && s.height >= 2 * h ? "1K" : "2K";
  };
  const fit = (w, h) =>
    forced ? provider.fitSize(o.model, w, h, o.resolution, { exact: true }) : provider.fitSize(o.model, w, h, provider.autoMax || "4K", { minTier: floor(w, h) });

  progress("Reading the image");
  const maxRefs = provider.maxReferences ? provider.maxReferences(o.model) : 0;
  const job = await ps.modal("Fulla: read", () => read(ps, doc, fit, o, maxRefs));
  checkCancel();

  // A little extra room so the model can blend; the Photoshop layer mask still uses the exact selection.
  const room = Math.max(2, Math.round(Math.max(job.inp.width, job.inp.height) * 0.01));
  const modelMask = dilate(job.mask, job.inp.width, job.inp.height, room);

  progress(`Generating with ${o.modelName || provider.name}`);
  const results = await provider.generate({
    fetch: o.fetch,
    apiKey: o.apiKey,
    model: o.model,
    image: { rgb: job.rgb, width: job.inp.width, height: job.inp.height },
    mask: modelMask,
    scene: job.scene,
    refs: job.refs,
    task: taskFor(o.prompt, job.refs.length),
    n: Math.max(1, Math.min(4, o.n || 1)),
    target: job.geo.target,
    quality: o.quality,
    onUsage: o.onUsage,
    cancelled,
    whenCancelled: o.whenCancelled,
  });
  checkCancel();
  // Paste only replies Fulla can read as an image of the area's shape: a reply of the wrong shape is
  // not the area (e.g. the whole photo came back), and unreadable bytes are not an image at all.
  const want = job.geo.target.width / job.geo.target.height;
  const sizes = results.map((r) => imageSize(r.bytes));
  const shaped = results.filter((r, i) => {
    const s = sizes[i];
    return s && s.width > 0 && s.height > 0 && Math.abs(Math.log(s.width / s.height / want)) < 0.15;
  });
  if (!shaped.length) {
    throw new UserError(
      sizes.some((s) => s && s.width > 0)
        ? "The model sent back a picture of the wrong shape (perhaps the whole photo). Nothing was changed: try again."
        : "The model sent back something that isn't an image Fulla can read. Nothing was changed: try again."
    );
  }
  results.splice(0, results.length, ...shaped);

  progress("Placing the result");
  const crop = job.geo.crop;
  const feather = Math.max(2, Math.min(24, Math.round(Math.max(crop.right - crop.left, crop.bottom - crop.top) * 0.004)));
  const name = layerName(o.prompt);
  // Tone matching: the placed result is compared with what was sent, around the selection (tone.js):
  // one curve for the whole tile, then what is left next to the selection, carried into it.
  const area = { orig: job.rgb, origComps: 3, mask: job.mask, width: job.inp.width, height: job.inp.height };
  const matchTone = {
    size: job.inp,
    // Half the margin is left to the model's blend; the rest is the ring compared.
    fit: (tile, report) => fitTone({ ...area, tile: tile.data, tileComps: tile.components, gap: (job.blend / 2) * (job.inp.width / (crop.right - crop.left)), report }),
    // Measured right past the room the model had to blend.
    local: (tile, fit, report) => localTone({ ...area, tile: tile.data, tileComps: tile.components, gap: room + 1, solid: job.solid, fit, report }),
  };
  const placed = await ps.modal(name, () => ps.commit({ docId: doc.id, results, crop, name, feather, selection: job.selection, matchTone, trace: o.trace }), { historyDocId: doc.id });
  placed.matchTone = matchTone; // each variation shown later gets its own correction
  return { results, placed, crop, target: job.geo.target, softness: job.geo.softness };
}

module.exports = { runGeneration, layerName, UserError };
