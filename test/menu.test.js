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
  assert.deepEqual(labels("openrouter"), ["Nano Banana 2.1", "Qwen Image 3"], "a provider name keeps its whole group");
  assert.deepEqual(labels("flux"), []);
});

test("model menu lists only providers with a key, in registry order, and checks the model in use", () => {
  const { modelMenuItems } = require("../plugin/src/menu");
  const { PROVIDERS } = require("../plugin/src/providers/index");
  const items = modelMenuItems(PROVIDERS, { openrouter: true, openai: true }, { provider: "openai", model: "gpt-image-2.5-flare" });
  assert.deepEqual([...new Set(items.map((it) => it.group))], ["OpenRouter", "OpenAI"]);
  assert.deepEqual(items.filter((it) => it.checked).map((it) => it.label), ["GPT Image 2.5 Flare"]);
  // Names carry no "(...)" notes; the notes are separate and limited to Recommended and Fast.
  assert.ok(items.every((it) => !/\(/.test(it.label) && ["", "Recommended", "Fast"].includes(it.note)));
  assert.deepEqual(items.filter((it) => it.note === "Recommended").map((it) => `${it.label} · ${it.group}`), ["Nano Banana 2.1 · OpenRouter"]);
  assert.deepEqual(modelMenuItems(PROVIDERS, {}, { provider: "openrouter", model: "x" }), []);
});
