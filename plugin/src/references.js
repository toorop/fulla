// Reference images the user adds (a face from another frame, the product to place…). They live in the
// document itself, in a hidden layer group, one layer per reference: the group is the list (the panel
// keeps none of its own), so references survive a save, follow the active document and can be removed
// with Ctrl+Z like any edit. Host-free: the Photoshop calls are in photoshop.js.

/** The hidden group that holds the references, at the top of the layer stack. */
const GROUP_NAME = "Fulla references";

/** References one run may carry at most, whatever the model takes (Adobe allows 8 with Gemini 3). */
const MAX_REFERENCES = 8;

/** Long side of a reference as sent to the model (like the uploaded crop). */
const MAX_SIDE = 2048;

/** "ref 2 — mug.jpg": the number the prompt uses, then the file it came from. */
function layerName(number, fileName) {
  return fileName ? `ref ${number} — ${fileName}` : `ref ${number}`;
}

/** The number in a reference layer's name, or null ("ref 2 — mug.jpg" → 2; "Layer 1" → null). */
function numberOf(name) {
  const m = /^\s*ref\s*(\d+)(?!\d)/i.exec(name || "");
  const n = m ? Number(m[1]) : 0;
  return n > 0 ? n : null;
}

/**
 * The group's layers as references, sorted by number. Numbers stay as named, so a prompt that says
 * "ref 2" still means the same image after ref 1 is removed; a layer without a number (added by hand)
 * or with a number already taken gets the next free one after the highest.
 * @param {Array<{id: number, name: string}>} layers  top to bottom, as in the Layers panel
 * @returns {Array<{id: number, name: string, number: number}>}
 */
function listFrom(layers) {
  const taken = new Set();
  const named = [];
  const unnamed = [];
  // Bottom first: the oldest layer keeps a number that two layers claim.
  for (const l of [...layers].reverse()) {
    const n = numberOf(l.name);
    if (n && !taken.has(n)) {
      taken.add(n);
      named.push({ ...l, number: n });
    } else unnamed.push(l);
  }
  let next = Math.max(0, ...taken) + 1;
  const out = named.concat(unnamed.map((l) => ({ ...l, number: next++ })));
  return out.sort((a, b) => a.number - b.number);
}

/** Number for the next reference added: one more than the highest, 1 when there is none. */
function nextNumber(refs) {
  return refs.length ? Math.max(...refs.map((r) => r.number)) + 1 : 1;
}

/** Size to read a reference at: its own size, its long side brought down to `max`. */
function sendSize(width, height, max = MAX_SIDE) {
  const k = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

/**
 * The line under the references saying what the model in use takes. References past its limit
 * (the highest numbers) stay in the document but are not sent.
 */
function limitNote(count, max, modelName) {
  if (max <= 0) return `${modelName} takes no reference images: they won't be sent.`;
  if (count > max) return `${modelName} takes ${max}: ${count - max === 1 ? "the last one" : `the last ${count - max}`} won't be sent.`;
  return `${modelName} takes up to ${max}.`;
}

module.exports = { GROUP_NAME, limitNote, MAX_REFERENCES, MAX_SIDE, layerName, numberOf, listFrom, nextNumber, sendSize };
