// Pure geometry: which part of the document to send, and at what size.
// Rects are {left, top, right, bottom} in document pixels (right/bottom exclusive).

const width = (r) => r.right - r.left;
const height = (r) => r.bottom - r.top;

function clampRect(r, docW, docH) {
  return {
    left: Math.max(0, Math.floor(r.left)),
    top: Math.max(0, Math.floor(r.top)),
    right: Math.min(docW, Math.ceil(r.right)),
    bottom: Math.min(docH, Math.ceil(r.bottom)),
  };
}

// Grow one axis of a span [a, b) to `len`, centred, shifted to stay inside [0, max).
function growSpan(a, b, len, max) {
  len = Math.min(len, max);
  const c = (a + b) / 2;
  let lo = Math.round(c - len / 2);
  lo = Math.max(0, Math.min(lo, max - len));
  return [lo, lo + len];
}

/**
 * Work out the crop sent to the model.
 * The crop contains the selection plus context, matches the target aspect where the
 * document allows, and never exceeds the document.
 *
 * @param {object} p
 * @param {number} p.docWidth
 * @param {number} p.docHeight
 * @param {{left,top,right,bottom}} p.selection   selection bounds
 * @param {(w: number, h: number) => {width, height}} p.fit  provider's output size for a crop of w x h
 * @param {number} [p.context=0.05]             context margin as a fraction of the selection's longest side.
 *   Kept thin: models compose what they add in the whole image sent, so with more room around the
 *   selection an added object spills out of it and the layer mask cuts it (A/B 2026-11-09: at 35 %
 *   a sail's tip came out 3 times in 3, at 5 % never); and the selection gets more of the pixels.
 * @param {number} [p.minSide=512]              smallest crop side worth sending
 * @returns {{crop, target, scaleX, scaleY, softness, margin}}  margin: in document pixels
 */
function computeCrop({ docWidth, docHeight, selection, fit, context = 0.05, minSide = 512 }) {
  const sel = clampRect(selection, docWidth, docHeight);
  if (width(sel) <= 0 || height(sel) <= 0) throw new Error("Selection is outside the document");

  const margin = Math.max(16, Math.round(Math.max(width(sel), height(sel)) * context));
  let crop = clampRect(
    { left: sel.left - margin, top: sel.top - margin, right: sel.right + margin, bottom: sel.bottom + margin },
    docWidth,
    docHeight
  );

  // Small selections still get a decent amount of surrounding image.
  if (width(crop) < minSide) [crop.left, crop.right] = growSpan(crop.left, crop.right, minSide, docWidth);
  if (height(crop) < minSide) [crop.top, crop.bottom] = growSpan(crop.top, crop.bottom, minSide, docHeight);

  const target = fit(width(crop), height(crop));
  const aspect = target.width / target.height;

  // Grow the short axis to match the target aspect (never shrink: the selection must stay inside).
  if (width(crop) / height(crop) < aspect) {
    const want = Math.round(height(crop) * aspect);
    [crop.left, crop.right] = growSpan(crop.left, crop.right, want, docWidth);
  } else {
    const want = Math.round(width(crop) / aspect);
    [crop.top, crop.bottom] = growSpan(crop.top, crop.bottom, want, docHeight);
  }

  const scaleX = target.width / width(crop);
  const scaleY = target.height / height(crop);
  // >1 means the model output gets upscaled on placement (result will look softer).
  const softness = Math.max(width(crop) / target.width, height(crop) / target.height);
  return { crop, target, scaleX, scaleY, softness, margin };
}

/** Size of the image actually uploaded: the target's aspect, no larger than maxSide on the long edge. */
function inputSize(target, maxSide = 2048) {
  const k = Math.min(1, maxSide / Math.max(target.width, target.height));
  return { width: Math.max(1, Math.round(target.width * k)), height: Math.max(1, Math.round(target.height * k)) };
}

module.exports = { computeCrop, inputSize, clampRect, width, height };
