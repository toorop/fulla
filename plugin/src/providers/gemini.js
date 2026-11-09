// Google Gemini adapter: generateContent with the image plus a black/white mask image.
// Gemini has no true mask parameter; the mask is a hint and Fulla clips the result in Photoshop.

const { toBase64, fromBase64 } = require("../bytes");
const { encodePng } = require("../png");
const { binarize } = require("../image");
const { maskImagePrompt } = require("../prompts");
const { postJson, getJson, ProviderError } = require("./http");
const { closestRatio, chooseTier } = require("./sizing");
const { MAX_REFERENCES } = require("../references");

const HOST = "generativelanguage.googleapis.com";
const urlFor = (model) => `https://${HOST}/v1beta/models/${encodeURIComponent(model)}:generateContent`;

// Output pixel sizes at 1K; 2K and 4K are exact 2x / 4x.
const RATIOS_1K = {
  "1:1": [1024, 1024],
  "2:3": [848, 1264], "3:2": [1264, 848],
  "3:4": [896, 1200], "4:3": [1200, 896],
  "4:5": [928, 1152], "5:4": [1152, 928],
  "9:16": [768, 1376], "16:9": [1376, 768],
  "21:9": [1584, 672],
  "1:4": [512, 2048], "4:1": [2048, 512],
  "1:8": [384, 3072], "8:1": [3072, 384],
};
const WIDE = ["1:4", "4:1", "1:8", "8:1"];
const R14 = Object.keys(RATIOS_1K);
const R10 = R14.filter((r) => !WIDE.includes(r));

// inputs = images a request may carry: 14 for Nano Banana 2.1 and Pro (Google's model pages, checked
// 2026-11-09); not documented for 2 Lite, assumed the same.
const MODELS = [
  { id: "gemini-nano-banana-2.1", label: "Nano Banana 2.1", ratios: R14, tiers: ["1K", "2K", "4K"], inputs: 14 },
  // Pro bills 1K and 2K the same (1,120 tokens, checked 2026-11-07), so 1K is not offered.
  { id: "gemini-3-pro-image", label: "Nano Banana Pro", ratios: R10, tiers: ["2K", "4K"], inputs: 14 },
  { id: "gemini-3.1-flash-lite-image", label: "Nano Banana 2 Lite", note: "Fast", ratios: R14, tiers: ["1K"], inputs: 14 },
];
const TIER_MULT = { "1K": 1, "2K": 2, "4K": 4 };

function modelInfo(model) {
  // A model not in the catalogue (saved by an older version) gets the widest common set.
  return MODELS.find((m) => m.id === model) || { id: model, ratios: R10, tiers: ["1K", "2K", "4K"], inputs: 3 };
}

/** Closest supported ratio and a size tier (rules in sizing.js); Gemini's exact pixels per ratio. */
function fitSize(model, w, h, maxTier = "2K", opts = {}) {
  const info = modelInfo(model);
  const ratio = closestRatio(info.ratios, w, h, (r) => RATIOS_1K[r][0] / RATIOS_1K[r][1]);
  const [bw, bh] = RATIOS_1K[ratio];
  const size = (t) => ({ width: bw * TIER_MULT[t], height: bh * TIER_MULT[t] });
  const tier = chooseTier(info.tiers, w, h, maxTier, opts, size);
  return { ...size(tier), aspectRatio: ratio, imageSize: tier };
}

function classify(status, json, text) {
  const e = (json && json.error) || {};
  const msg = e.message || (text || "").slice(0, 200) || `HTTP ${status}`;
  const reasons = JSON.stringify(e.details || []);
  if (/API_KEY_INVALID/.test(reasons) || /API key not valid/i.test(msg)) {
    return new ProviderError("Google rejected the Gemini API key. Check it in the Providers tab.", { status, code: "bad_key" });
  }
  if (status === 400 && e.status === "FAILED_PRECONDITION") {
    return new ProviderError("Gemini's free tier isn't available for this account or region. Enable billing in Google AI Studio.", { status, code: e.status });
  }
  if (status === 402) return new ProviderError("Your Gemini prepaid credits are used up.", { status, code: "credits" });
  if (status === 403) return new ProviderError(`Gemini refused the request: ${msg}`, { status, code: e.status });
  if (status === 404) return new ProviderError(`Gemini doesn't know that model. ${msg}`, { status, code: e.status });
  if (status === 429) {
    // Google explains quota refusals in the message and in a RetryInfo detail ("10334s").
    const retry = (e.details || []).find((d) => d && /RetryInfo/.test(d["@type"] || ""));
    const delayS = retry ? parseFloat(String(retry.retryDelay || "0")) : 0;
    if (/limit: 0/.test(msg) && /free_tier|FreeTier/i.test(msg + reasons)) {
      return new ProviderError(
        "Your Gemini key is on Google's free tier, which allows 0 image generations. Turn on billing for the key's project in Google AI Studio (aistudio.google.com > Get API key > Set up billing), then try again.",
        { status, code: "free_tier_no_image_quota", detail: msg }
      );
    }
    if (delayS > 30) {
      const h = Math.floor(delayS / 3600);
      const m = Math.ceil((delayS % 3600) / 60);
      return new ProviderError(`Gemini quota used up. Google says try again in ${h ? `${h}h ` : ""}${m}m.`, { status, code: "quota", detail: msg });
    }
    return new ProviderError("Gemini rate limit reached. Retrying shortly...", { status, code: e.status, retryable: true, retryAfterMs: delayS * 1000, detail: msg });
  }
  // Retried only when the service was unavailable (nothing ran); after a 500 or 504 the image may have been made.
  if (status >= 500) return new ProviderError("Gemini is having trouble right now. Try again shortly.", { status, code: e.status, retryable: status === 502 || status === 503, detail: msg });
  return new ProviderError(`Gemini: ${msg}`, { status, code: e.status || "" });
}

const BLOCKED = /SAFETY|PROHIBITED|BLOCKLIST|RECITATION|SPII/;

function extractImage(json) {
  const cand = (json.candidates || [])[0];
  if (!cand) {
    const reason = json.promptFeedback && json.promptFeedback.blockReason;
    throw new ProviderError(
      reason ? `Gemini's safety filter blocked this prompt (${reason}). Try different wording or selection.` : "Gemini returned nothing. Try again.",
      { code: reason || "empty" }
    );
  }
  const parts = (cand.content && cand.content.parts) || [];
  let found = null;
  for (const p of parts) {
    const d = p.inlineData || p.inline_data;
    if (d && d.data && !p.thought) found = d;
  }
  if (found) return { bytes: fromBase64(found.data), mime: found.mimeType || found.mime_type || "image/png" };
  const fr = cand.finishReason || "";
  if (BLOCKED.test(fr)) {
    throw new ProviderError(`Gemini's safety filter blocked the result (${fr}). Try different wording or selection.`, { code: fr });
  }
  throw new ProviderError("Gemini didn't return an image. Try rephrasing the prompt.", { code: fr || "no_image" });
}

/** Token counts from the reply's usageMetadata, in the shape cost.js expects; null when absent. */
function usageFrom(json) {
  const u = json && json.usageMetadata;
  if (!u) return null;
  const byModality = (list) => {
    const o = {};
    for (const d of list || []) if (d && d.modality) o[d.modality] = (o[d.modality] || 0) + (d.tokenCount || 0);
    return o;
  };
  const prompt = u.promptTokenCount || 0;
  const cand = u.candidatesTokenCount || 0;
  const thoughts = u.thoughtsTokenCount || 0;
  const inputImage = byModality(u.promptTokensDetails).IMAGE || 0;
  // Without a per-modality split, all output counts as image: Fulla asks for IMAGE only.
  const outputImage = u.candidatesTokensDetails ? byModality(u.candidatesTokensDetails).IMAGE || 0 : cand;
  return {
    inputText: prompt - inputImage,
    inputImage,
    outputText: cand - outputImage + thoughts,
    outputImage,
    total: u.totalTokenCount || prompt + cand + thoughts,
  };
}

// Which config field the API accepted last time, per model ("responseFormat" or "imageConfig").
const configStyle = {};

function buildBody(text, imgB64, maskB64, size, style, extraB64) {
  const image = { aspectRatio: size.aspectRatio, imageSize: size.imageSize };
  const generationConfig = { responseModalities: ["IMAGE"] };
  if (style === "imageConfig") generationConfig.imageConfig = image;
  else generationConfig.responseFormat = { image };
  return {
    contents: [
      {
        role: "user",
        parts: [
          { text },
          { inline_data: { mime_type: "image/png", data: imgB64 } },
          { inline_data: { mime_type: "image/png", data: maskB64 } },
          ...extraB64.map((data) => ({ inline_data: { mime_type: "image/png", data } })),
        ],
      },
    ],
    generationConfig,
  };
}

async function generateOne(req, text, imgB64, maskB64, size, extraB64) {
  // imageConfig {aspectRatio: "16:9", imageSize: "2K"} is what the API accepts (verified 2026-10-12);
  // responseFormat.image wants enum values instead, so it is only a fallback.
  const style = configStyle[req.model] || "imageConfig";
  const call = (s) =>
    postJson({
      fetch: req.fetch,
      url: urlFor(req.model),
      headers: { "x-goog-api-key": req.apiKey },
      body: buildBody(text, imgB64, maskB64, size, s, extraB64),
      classify,
      host: HOST,
      cancelled: req.cancelled,
      whenCancelled: req.whenCancelled,
    });
  let json;
  try {
    json = await call(style);
    configStyle[req.model] = style;
  } catch (e) {
    // Two documented spellings for size config; fall back to the other on a schema error.
    const schemaError = e instanceof ProviderError && e.status === 400 && /responseFormat|response_format|imageConfig|image_config|Unknown name|Invalid JSON payload/i.test(e.message);
    if (!schemaError) throw e;
    const other = style === "imageConfig" ? "responseFormat" : "imageConfig";
    json = await call(other);
    configStyle[req.model] = other;
  }
  // Reported before extracting: a blocked result may still be billed.
  const usage = usageFrom(json);
  if (usage && req.onUsage) req.onUsage(usage);
  return extractImage(json);
}

/** Free request that only proves the key works. */
async function checkKey({ fetch, apiKey }) {
  await getJson({ fetch, url: `https://${HOST}/v1beta/models?pageSize=1`, headers: { "x-goog-api-key": apiKey }, classify, host: HOST });
  return {};
}

/** How many reference images the user may add with this model: the room left after Fulla's own, 8 at most. */
function maxReferences(model) {
  return Math.max(0, Math.min(MAX_REFERENCES, modelInfo(model).inputs - 3));
}

/** Same request shape as openai.generate. Variations run as parallel requests. */
async function generate(req) {
  if (!req.apiKey) throw new ProviderError("Add your Gemini API key in the Providers tab first.", { code: "no_key" });
  const { width, height } = req.image;
  const imgB64 = toBase64(encodePng(req.image.rgb, width, height, 3));
  const maskB64 = toBase64(encodePng(binarize(req.mask), width, height, 1));
  const size = req.target.aspectRatio ? req.target : fitSize(req.model, req.target.width, req.target.height, "2K");
  const own = (req.refs || []).slice(0, maxReferences(req.model));
  // The whole photo, then the user's references, after the picture and its mask.
  const extraB64 = (req.scene ? [req.scene] : []).concat(own).map((r) => toBase64(encodePng(r.rgb, r.width, r.height, 3)));
  const text = maskImagePrompt(req.task, !!req.scene, own.map((r) => r.number));
  const n = Math.max(1, Math.min(4, req.n || 1));
  const settled = await Promise.allSettled(Array.from({ length: n }, () => generateOne(req, text, imgB64, maskB64, size, extraB64)));
  const ok = settled.filter((s) => s.status === "fulfilled").map((s) => s.value);
  if (!ok.length) throw settled[0].reason;
  return ok;
}

module.exports = {
  id: "gemini",
  name: "Google",
  badge: "G", // shown before the model's name on the model button
  host: HOST,
  keyHelp: "aistudio.google.com/apikey",
  // Google's free tier allows no image generation: without billing, every run is refused.
  keyNote: "Image generation needs billing turned on for the key's Google Cloud project.",
  models: MODELS.map(({ id, label, note }) => ({ id, label, note })),
  defaultModel: MODELS[0].id,
  qualities: null,
  fitSize,
  /** Sizes the user may choose for this model, besides Auto (none when there is only one). */
  maxReferences,
  resolutions: (model) => modelInfo(model).tiers,
  generate,
  checkKey,
  _classify: classify,
  _extractImage: extractImage,
  _usageFrom: usageFrom,
  _configStyle: configStyle,
};
