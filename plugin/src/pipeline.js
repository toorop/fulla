// One generation, start to finish, in three phases:
//   1. read   (short modal scope): selection, pixels and masks; the document is not changed
//   2. generate (no modal scope): the network call; Photoshop stays usable
//   3. commit (one modal scope, one undo step): place one layer, mask it
// Photoshop access goes through `ps` (photoshop.js, or a fake in tests), so this file has no host dependencies.

const { computeCrop, inputSize } = require("./geometry");
const { resample, toRGB, dilate, coverage } = require("./image");
const { taskFor } = require("./prompts");

/** A message for the user. `code` names the cases the panel follows up on ("noDocument", "noSelection"). */
class UserError extends Error {
  constructor(message, code = "") {
    super(message);
    this.code = code;
  }
}

/** Group name: the prompt, shortened; an empty prompt removes what is selected. */
function layerName(prompt) {
  const p = (prompt || "").trim().replace(/\s+/g, " ");
  if (!p) return "Fulla: Remove";
  return `Fulla: ${p.length > 40 ? p.slice(0, 39) + "…" : p}`;
}

const asUserError = (fn) => {
  try {
    return fn();
  } catch (e) {
    throw new UserError(e.message);
  }
};

/** Phase 1: read the selection and the pixels around it. */
async function read(ps, doc, fit) {
  const selection = await ps.getSelectionBounds(doc.id);
  if (!selection) throw new UserError("Make a selection first (any selection tool).", "noSelection");
  const geo = asUserError(() => computeCrop({ docWidth: doc.width, docHeight: doc.height, selection, fit }));
  const inp = inputSize(geo.target);
  const px = await ps.readComposite(doc.id, geo.crop, inp);
  let rgb = toRGB(px.data, px.width, px.height, px.components);
  if (px.width !== inp.width || px.height !== inp.height) rgb = resample(rgb, px.width, px.height, 3, inp.width, inp.height);
  const small = await ps.readSelection(doc.id, geo.crop, inp);
  let mask = small.data;
  if (small.width !== inp.width || small.height !== inp.height) mask = resample(mask, small.width, small.height, 1, inp.width, inp.height);
  if (coverage(mask) === 0) throw new UserError("The selection is empty.");
  // Full-resolution copy of the selection, so the final layer mask is exact even if the user
  // changes the selection while the provider is working.
  const full = await ps.readSelection(doc.id, geo.crop, null);
  return { geo, inp, rgb, mask, selection: { data: full.data, width: full.width, height: full.height, left: geo.crop.left, top: geo.crop.top } };
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
 * @param {string} [o.resolution="auto"]  "auto": the smallest size that covers the selection, up to 2K;
 *   "1K" / "2K" / "4K": that size, when the model offers it
 * @param {(label: string) => void} [o.progress]
 * @param {() => boolean} [o.cancelled]
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
  const fit = (w, h) => provider.fitSize(o.model, w, h, forced ? o.resolution : "2K", { exact: forced });

  progress("Reading the image");
  const job = await ps.modal("Fulla: read", () => read(ps, doc, fit));
  checkCancel();

  // A little extra room so the model can blend; the Photoshop layer mask still uses the exact selection.
  const modelMask = dilate(job.mask, job.inp.width, job.inp.height, Math.max(2, Math.round(Math.max(job.inp.width, job.inp.height) * 0.01)));

  progress(`Generating with ${o.modelName || provider.name}`);
  const results = await provider.generate({
    fetch: o.fetch,
    apiKey: o.apiKey,
    model: o.model,
    image: { rgb: job.rgb, width: job.inp.width, height: job.inp.height },
    mask: modelMask,
    task: taskFor(o.prompt),
    n: Math.max(1, Math.min(4, o.n || 1)),
    target: job.geo.target,
    quality: o.quality,
    onUsage: o.onUsage,
    cancelled,
  });
  checkCancel();

  progress("Placing the result");
  const crop = job.geo.crop;
  const feather = Math.max(2, Math.min(24, Math.round(Math.max(crop.right - crop.left, crop.bottom - crop.top) * 0.004)));
  const name = layerName(o.prompt);
  const placed = await ps.modal(name, () => ps.commit({ docId: doc.id, results, crop, name, feather, selection: job.selection, trace: o.trace }), { historyDocId: doc.id });
  return { results, placed, crop, target: job.geo.target, softness: job.geo.softness };
}

module.exports = { runGeneration, layerName, UserError };
