const test = require("node:test");
const assert = require("node:assert/strict");

const refs = require("../plugin/src/references");

test("reference layer names carry the number the prompt uses", () => {
  assert.equal(refs.layerName(2, "mug.jpg"), "ref 2 — mug.jpg");
  assert.equal(refs.numberOf(refs.layerName(12, "a b.png")), 12);
  assert.equal(refs.numberOf("Ref3"), 3);
  for (const name of ["Layer 1", "reference", "ref 0", "my ref 2", ""]) assert.equal(refs.numberOf(name), null, name);
});

test("numbers stay fixed; layers without one, or with a taken one, get the next free", () => {
  // Top to bottom, as in the Layers panel: the bottom (oldest) layer keeps a number two layers claim.
  const list = refs.listFrom([
    { id: 5, name: "Layer 7" },
    { id: 4, name: "ref 2 — copy" },
    { id: 3, name: "ref 4 — mug.jpg" },
    { id: 2, name: "ref 2 — face.jpg" },
  ]);
  assert.deepEqual(list.map((r) => [r.id, r.number]), [[2, 2], [3, 4], [4, 5], [5, 6]]);
  assert.equal(refs.nextNumber(list), 7);
  assert.equal(refs.nextNumber([]), 1);
});

test("a reference is sent at its own size, its long side at most 2048", () => {
  assert.deepEqual(refs.sendSize(600, 400), { width: 600, height: 400 });
  assert.deepEqual(refs.sendSize(6000, 4000), { width: 2048, height: 1365 });
  assert.deepEqual(refs.sendSize(1000, 5000), { width: 410, height: 2048 });
});

test("the panel says what the model in use takes, and which references stay unsent", () => {
  assert.equal(refs.limitNote(2, 8, "Nano Banana 2.1"), "Nano Banana 2.1 takes up to 8.");
  assert.equal(refs.limitNote(2, 1, "Qwen Image 3"), "Qwen Image 3 takes 1: the last one won't be sent.");
  assert.equal(refs.limitNote(4, 2, "Qwen Image 2.1 Pro"), "Qwen Image 2.1 Pro takes 2: the last 2 won't be sent.");
  assert.equal(refs.limitNote(1, 0, "Other"), "Other takes no reference images: they won't be sent.");
});
