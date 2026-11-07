// Estimated cost of a generation, from the token counts the provider sends back (or the exact amount,
// for providers such as OpenRouter that report it).
// Each provider turns its own usage reply into { inputText, inputImage, outputText, outputImage, total }.

// USD per 1M tokens, standard paid tier. Update by hand when the providers change their prices.
// Gemini: ai.google.dev/gemini-api/docs/pricing (last updated 2026-10-27, checked 2026-10-27).
//   Image input costs the same as text input; thinking tokens are billed as text output.
// OpenAI: developers.openai.com/api/docs/pricing (checked 2026-10-27). No text output price is listed
//   for GPT Image 2 and 2.5, so text output falls back to the image output price.
// Cached input is cheaper but not counted here, so the estimate errs high.
const PRICES = {
  "gemini-nano-banana-2.1": { inputText: 1.5, inputImage: 1.5, outputText: 7.5, outputImage: 30 },
  "gemini-3-pro-image": { inputText: 2, inputImage: 2, outputText: 12, outputImage: 120 },
  "gemini-3.1-flash-lite-image": { inputText: 0.25, inputImage: 0.25, outputText: 1.5, outputImage: 30 },
  "gpt-image-2.5-sunburst": { inputText: 5, inputImage: 8, outputImage: 30 },
  "gpt-image-2.5-flare": { inputText: 5, inputImage: 8, outputImage: 30 },
  "gpt-image-2": { inputText: 5, inputImage: 8, outputImage: 30 },
};

const FIELDS = ["inputText", "inputImage", "outputText", "outputImage", "total"];

const emptyUsage = () => ({ inputText: 0, inputImage: 0, outputText: 0, outputImage: 0, total: 0 });

function addUsage(a, b) {
  const out = emptyUsage();
  for (const f of FIELDS) out[f] = ((a && a[f]) || 0) + ((b && b[f]) || 0);
  return out;
}

/**
 * USD for this usage, or null when the model has no known price (not in the catalogue). When the reply
 * carried its own billed amount (OpenRouter's usage.cost), that amount is used as is.
 */
function estimateCost(model, usage) {
  if (usage && typeof usage.cost === "number") return usage.cost;
  const p = PRICES[model];
  if (!p || !usage) return null;
  const outText = p.outputText != null ? p.outputText : p.outputImage;
  return (usage.inputText * p.inputText + usage.inputImage * p.inputImage + usage.outputText * outText + usage.outputImage * p.outputImage) / 1e6;
}

/** "1,290": toLocaleString is not reliable in every UXP version. */
function groupThousands(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatUsd(usd) {
  return `$${usd.toFixed(usd < 1 ? 3 : 2)}`;
}

/** "≈ $0.034 · 1,290 tokens", or "1,290 tokens" when the price is unknown. */
function formatCost(cost, usage) {
  const tokens = `${groupThousands((usage && usage.total) || 0)} tokens`;
  return cost == null ? tokens : `≈ ${formatUsd(cost)} · ${tokens}`;
}

module.exports = { PRICES, emptyUsage, addUsage, estimateCost, formatCost, formatUsd };
