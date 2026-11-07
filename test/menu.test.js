const test = require("node:test");
const assert = require("node:assert/strict");

const { filterItems } = require("../plugin/src/menu");

test("menu search keeps items matching every word, in label or group, any case, order kept", () => {
  const items = [
    { group: "OpenRouter", label: "Nano Banana 2.1" },
    { group: "OpenRouter", label: "Qwen Image 3" },
    { group: "Google Gemini", label: "Nano Banana Pro" },
  ];
  const labels = (q) => filterItems(items, q).map((it) => it.label);
  assert.deepEqual(labels(""), ["Nano Banana 2.1", "Qwen Image 3", "Nano Banana Pro"]);
  assert.deepEqual(labels("  BANANA "), ["Nano Banana 2.1", "Nano Banana Pro"]);
  assert.deepEqual(labels("banana openrouter"), ["Nano Banana 2.1"]);
  assert.deepEqual(labels("flux"), []);
});
