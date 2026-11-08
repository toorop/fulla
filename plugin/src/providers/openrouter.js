// OpenRouter adapter: one key for many image models, through POST /api/v1/images.
// The API has no mask parameter, so the mask goes as a second reference image (as with Gemini direct)
// and Fulla clips the result in Photoshop. Each reply reports its own cost in USD.

const { toBase64, fromBase64 } = require("../bytes");
const { encodePng } = require("../png");
const { binarize } = require("../image");
const { maskImagePrompt } = require("../prompts");
const { postJson, getJson, ProviderError } = require("./http");
const { closestRatio, chooseTier } = require("./sizing");

const HOST = "openrouter.ai";
const URL = `https://${HOST}/api/v1/images`;

// Ratios each model family accepts (from GET /api/v1/images/models, checked 2026-11-06).
const GEMINI_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9", "1:4", "4:1", "1:8", "8:1"];
const GEMINI_PRO_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
const QWEN_RATIOS = ["1:1", "1:2", "2:1", "1:4", "4:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"];
const OPENAI_RATIOS = ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"];

// Catalogue: models Fulla offers through OpenRouter. maxN = variations per request (1 = one request
// each). OpenAI models take no `resolution` (the provider picks the pixels) but can be asked for PNG.
const MODELS = [
  { id: "google/gemini-nano-banana-2.1", label: "Nano Banana 2.1", note: "Recommended", ratios: GEMINI_RATIOS, tiers: ["1K", "2K", "4K"], maxN: 1 },
  // Pro bills 1K and 2K the same, so 1K is not offered; Qwen always renders 2K (1K is a downscale, same price).
  { id: "google/gemini-3-pro-image", label: "Nano Banana Pro", ratios: GEMINI_PRO_RATIOS, tiers: ["2K", "4K"], maxN: 1 },
  { id: "qwen/qwen-image-3", label: "Qwen Image 3", ratios: QWEN_RATIOS, tiers: ["2K"], maxN: 6 },
  { id: "qwen/qwen-image-2.1-pro", label: "Qwen Image 2.1 Pro", ratios: QWEN_RATIOS, tiers: ["2K"], maxN: 6 },
  { id: "openai/gpt-image-2.6-sunburst", label: "GPT Image 2.6 Sunburst", ratios: OPENAI_RATIOS, tiers: ["1K", "2K"], maxN: 4, noResolution: true, png: true },
  { id: "openai/gpt-image-2.5-sunburst", label: "GPT Image 2.5 Sunburst", ratios: OPENAI_RATIOS, tiers: ["1K", "2K"], maxN: 4, noResolution: true, png: true },
];
const TIER_SIDE = { "1K": 1024, "2K": 2048, "4K": 4096 }; // about this many pixels squared per tier

function modelInfo(model) {
  // Not in the catalogue (a model saved by an older version): common ratios, 1K and 2K, one image per request.
  return MODELS.find((m) => m.id === model) || { id: model, ratios: GEMINI_PRO_RATIOS, tiers: ["1K", "2K"], maxN: 1 };
}

const ratioValue = (r) => {
  const [a, b] = r.split(":").map(Number);
  return a / b;
};

/**
 * Closest supported ratio and a size tier (rules in sizing.js). OpenRouter picks the exact pixels
 * per provider, so width/height here are the expected size; placement fits whatever comes back
 * onto the crop.
 */
function fitSize(model, w, h, maxTier = "2K", opts = {}) {
  const info = modelInfo(model);
  const ratio = closestRatio(info.ratios, w, h, ratioValue);
  const size = (t) => {
    const k = ratioValue(ratio);
    const area = TIER_SIDE[t] * TIER_SIDE[t];
    return { width: Math.round(Math.sqrt(area * k) / 16) * 16, height: Math.round(Math.sqrt(area / k) / 16) * 16 };
  };
  const tier = chooseTier(info.tiers, w, h, maxTier, opts, size);
  return { ...size(tier), aspectRatio: ratio, imageSize: tier };
}

function classify(status, json, text) {
  const e = (json && json.error) || {};
  const msg = e.message || (text || "").slice(0, 200) || `HTTP ${status}`;
  const code = String(e.code || status);
  const detail = `${status}: ${msg}`;
  if (status === 401) {
    // OpenRouter answers the same for a wrong key and for one created seconds ago (it takes up to
    // about a minute to start working), so the message covers both.
    return new ProviderError("OpenRouter rejected the API key. If you just created it, wait a minute and try again; otherwise check it in the Providers tab.", { status, code: "bad_key", detail });
  }
  if (status === 402) {
    return new ProviderError("Your OpenRouter credits are used up. Add credits at openrouter.ai/settings/credits, then try again.", { status, code: "credits", detail });
  }
  if (status === 403) return new ProviderError("OpenRouter's safety filter blocked this request. Try a different prompt or selection.", { status, code: "moderation", detail });
  if (status === 404) return new ProviderError(`OpenRouter doesn't know that model. ${msg}`, { status, code, detail });
  // Not retried: the model may have run (and billed) before the time ran out.
  if (status === 408) return new ProviderError("The model took too long to answer. Try again.", { status, code, detail });
  if (status === 429) return new ProviderError("OpenRouter rate limit reached. Retrying shortly...", { status, code, retryable: true, detail });
  // 502: the model failed (not billed); 503: no provider available right now. Both cost nothing: retried.
  if (status === 502 || status === 503) return new ProviderError("The model is having trouble right now. Nothing was billed; try again shortly.", { status, code, retryable: true, detail });
  if (status >= 500) return new ProviderError("OpenRouter had a problem with this request. Try again shortly.", { status, code, detail });
  return new ProviderError(`OpenRouter: ${msg}`, { status, code, detail });
}

/** Usage in the shape cost.js expects, plus `cost`: the USD OpenRouter actually billed. Null when absent. */
function usageFrom(json) {
  const u = json && json.usage;
  if (!u) return null;
  const input = u.prompt_tokens || 0;
  const output = u.completion_tokens || 0;
  return {
    inputText: 0,
    inputImage: input,
    outputText: 0,
    outputImage: output,
    total: u.total_tokens || input + output,
    ...(typeof u.cost === "number" ? { cost: u.cost } : {}),
  };
}

async function request(req, body) {
  const json = await postJson({
    fetch: req.fetch,
    url: URL,
    // Attribution headers: show "Fulla" in the user's OpenRouter activity.
    headers: { Authorization: `Bearer ${req.apiKey}`, "HTTP-Referer": "https://github.com/toorop/fulla", "X-Title": "Fulla" },
    body,
    classify,
    host: HOST,
    cancelled: req.cancelled,
    whenCancelled: req.whenCancelled,
  });
  // Reported before the image check: a reply without an image may still be billed.
  const usage = usageFrom(json);
  if (usage && req.onUsage) req.onUsage(usage);
  const items = (json.data || []).filter((d) => d && d.b64_json);
  if (!items.length) throw new ProviderError("The model returned no image. Try again or change the prompt.", { code: "no_image" });
  return items.map((d) => ({ bytes: fromBase64(d.b64_json), mime: d.media_type || "image/png" }));
}

/** Free request that only proves the key works (it describes the key: usage, limit). */
async function checkKey({ fetch, apiKey }) {
  const json = await getJson({ fetch, url: `https://${HOST}/api/v1/key`, headers: { Authorization: `Bearer ${apiKey}` }, classify, host: HOST });
  return (json && json.data) || {};
}

/**
 * Account balance in USD (credits bought minus used), or null when OpenRouter won't say. A new
 * account has none, and its first generation would fail: the panel offers to add credits.
 */
async function balance({ fetch, apiKey }) {
  try {
    const json = await getJson({ fetch, url: `https://${HOST}/api/v1/credits`, headers: { Authorization: `Bearer ${apiKey}` }, classify, host: HOST });
    const d = (json && json.data) || {};
    return typeof d.total_credits === "number" ? d.total_credits - (d.total_usage || 0) : null;
  } catch (_) {
    return null;
  }
}

/** Same request shape as openai.generate. */
async function generate(req) {
  if (!req.apiKey) throw new ProviderError("Add your OpenRouter API key in the Providers tab first.", { code: "no_key" });
  const { width, height } = req.image;
  const info = modelInfo(req.model);
  const size = req.target.aspectRatio ? req.target : fitSize(req.model, req.target.width, req.target.height, "2K");
  const n = Math.max(1, Math.min(4, req.n || 1));
  const dataUrl = (png) => ({ type: "image_url", image_url: { url: `data:image/png;base64,${toBase64(png)}` } });
  const refs = [dataUrl(encodePng(req.image.rgb, width, height, 3)), dataUrl(encodePng(binarize(req.mask), width, height, 1))];
  if (req.scene) refs.push(dataUrl(encodePng(req.scene.rgb, req.scene.width, req.scene.height, 3)));
  const body = (count) => ({
    model: req.model,
    prompt: maskImagePrompt(req.task, !!req.scene),
    input_references: refs,
    ...(info.noResolution ? {} : { resolution: size.imageSize }),
    aspect_ratio: size.aspectRatio,
    ...(info.png ? { output_format: "png" } : {}),
    n: count,
  });
  if (n <= info.maxN) return request(req, body(n));
  // One image per request: run the variations in parallel and keep the ones that worked.
  const settled = await Promise.allSettled(Array.from({ length: n }, () => request(req, body(1))));
  const ok = settled.filter((s) => s.status === "fulfilled").flatMap((s) => s.value);
  if (!ok.length) throw settled[0].reason;
  return ok;
}

module.exports = {
  id: "openrouter",
  name: "OpenRouter",
  badge: "OR", // shown before the model's name on the model button
  host: HOST,
  keyHelp: "openrouter.ai/settings/keys",
  models: MODELS.map(({ id, label, note }) => ({ id, label, note })),
  defaultModel: MODELS[0].id,
  qualities: null,
  reportsCost: true,
  fitSize,
  /** Sizes the user may choose for this model, besides Auto (none when the provider picks the size). */
  resolutions: (model) => (modelInfo(model).noResolution ? [] : modelInfo(model).tiers),
  generate,
  checkKey,
  balance,
  creditsUrl: "https://openrouter.ai/settings/credits",
  _classify: classify,
  _usageFrom: usageFrom,
};
