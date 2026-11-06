const test = require("node:test");
const assert = require("node:assert/strict");

const { PRICES, emptyUsage, addUsage, estimateCost, formatCost, formatUsd } = require("../plugin/src/cost");
const { PROVIDERS } = require("../plugin/src/providers/index");

const usage = (o) => ({ ...emptyUsage(), ...o });

test("every listed model has a price, unless its service reports the billed amount", () => {
  for (const p of PROVIDERS) if (!p.reportsCost) for (const m of p.models) assert.ok(PRICES[m.id], `${p.id} ${m.id} missing from cost.js`);
  // A reported amount wins over any price table, for known and custom models alike.
  assert.equal(estimateCost("my-custom-model", usage({ outputImage: 1000, cost: 0.0412 })), 0.0412);
  assert.equal(estimateCost("gpt-image-2", usage({ outputImage: 1000, cost: 0 })), 0);
});

test("cost matches the services' own per-image figures", () => {
  // Google lists Nano Banana 2.1 1K output as $0.0336 per image, i.e. 1,120 image tokens at $30/M.
  assert.ok(Math.abs(estimateCost("gemini-nano-banana-2.1", usage({ outputImage: 1120 })) - 0.0336) < 1e-9);
  // Input and output together, text and image priced apart (OpenAI).
  const u = usage({ inputText: 100, inputImage: 1000, outputImage: 2000 });
  assert.ok(Math.abs(estimateCost("gpt-image-2.5-sunburst", u) - (100 * 5 + 1000 * 8 + 2000 * 30) / 1e6) < 1e-12);
  // No text output price listed: falls back to the image output price.
  assert.ok(Math.abs(estimateCost("gpt-image-2", usage({ outputText: 10 })) - (10 * 30) / 1e6) < 1e-12);
  // Gemini thinking tokens are billed as text output.
  assert.ok(Math.abs(estimateCost("gemini-3-pro-image", usage({ outputText: 1000 })) - 0.012) < 1e-12);
});

test("unknown models and missing usage have no price", () => {
  assert.equal(estimateCost("my-custom-model", usage({ outputImage: 1000 })), null);
  assert.equal(estimateCost("gpt-image-2", null), null);
});

test("usage adds up, starting from nothing", () => {
  const a = usage({ inputText: 10, outputImage: 1000, total: 1010 });
  const b = usage({ inputImage: 5, outputText: 3, total: 8 });
  assert.deepEqual(addUsage(null, a), a);
  assert.deepEqual(addUsage(a, b), { inputText: 10, inputImage: 5, outputText: 3, outputImage: 1000, total: 1018 });
});

test("cost reads as a short line", () => {
  assert.equal(formatCost(0.0336, usage({ total: 1290 })), "≈ $0.034 · 1,290 tokens");
  assert.equal(formatCost(1.234, usage({ total: 1234567 })), "≈ $1.23 · 1,234,567 tokens");
  assert.equal(formatCost(null, usage({ total: 999 })), "999 tokens");
  assert.equal(formatCost(null, null), "0 tokens");
  assert.equal(formatUsd(0), "$0.000");
});
