const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");

const openai = require("../plugin/src/providers/openai");
const gemini = require("../plugin/src/providers/gemini");
const openrouter = require("../plugin/src/providers/openrouter");
const { estimateCost } = require("../plugin/src/cost");
const { encodePng } = require("../plugin/src/png");
const { toBase64, fromBase64 } = require("../plugin/src/bytes");
const { runGeneration, layerName, UserError } = require("../plugin/src/pipeline");
const { taskFor } = require("../plugin/src/prompts");

const tinyPng = (w = 4, h = 4) => encodePng(new Uint8Array(w * h * 3).fill(90), w, h, 3);

function fakeFetch(handler) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });
    const { status = 200, json, headers = {} } = await handler(url, init, calls.length);
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (k) => headers[k.toLowerCase()] },
      text: async () => (typeof json === "string" ? json : JSON.stringify(json)),
    };
  };
  fn.calls = calls;
  return fn;
}

function req(extra = {}) {
  const w = 64, h = 32;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = i % w > 20 && i % w < 40 ? 255 : 0;
  return {
    apiKey: "sk-test",
    image: { rgb: new Uint8Array(w * h * 3).fill(120), width: w, height: h },
    mask,
    task: taskFor("a red door"),
    n: 2,
    target: { width: 1536, height: 768 },
    ...extra,
  };
}

function pngAlphaAt(pngBytes) {
  // decode our own RGBA PNG and return alpha channel values
  const buf = Buffer.from(pngBytes);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const idat = [];
  let o = 8;
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    if (buf.toString("ascii", o + 4, o + 8) === "IDAT") idat.push(buf.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < stride; x++) {
    const left = x >= 4 ? px[y * stride + x - 4] : 0;
    px[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + left) & 255;
  }
  return { w, h, alpha: (x, y) => px[(y * w + x) * 4 + 3] };
}

// ---------------- OpenAI ----------------

test("openai fitSize obeys every documented rule across aspects and tiers", () => {
  for (const tier of ["1K", "2K", "4K"]) {
    for (let a = 0.1; a <= 10; a *= 1.07) {
      for (const base of [300, 1500, 7000]) {
        const w = Math.round(base * Math.sqrt(a)), h = Math.round(base / Math.sqrt(a));
        const s = openai._fitSize(w, h, tier);
        const tag = `${w}x${h} ${tier} -> ${s.width}x${s.height}`;
        assert.equal(s.width % 16, 0, tag);
        assert.equal(s.height % 16, 0, tag);
        assert.ok(s.width / s.height <= 3 + 1e-9 && s.height / s.width <= 3 + 1e-9, tag);
        assert.ok(s.width <= 3840 && s.height <= 3840, tag);
        assert.ok(s.width * s.height >= 655360, tag);
        const maxP = { "1K": 1048576, "2K": 3686400, "4K": 8294400 }[tier];
        assert.ok(s.width * s.height <= maxP, tag);
        // aspect stays close for in-range inputs
        if (a >= 1 / 3 && a <= 3) assert.ok(Math.abs(Math.log(s.width / s.height) - Math.log(w / h)) < 0.06, tag);
      }
    }
  }
});

test("openai sends a JSON edit with image, inverted alpha mask, size, n", async () => {
  const fetch = fakeFetch(() => ({ json: { data: [{ b64_json: toBase64(tinyPng()) }, { b64_json: toBase64(tinyPng()) }] } }));
  const out = await openai.generate(req({ fetch, model: "gpt-image-2.5-sunburst", quality: "high" }));
  assert.equal(out.length, 2);
  assert.equal(out[0].mime, "image/png");
  const { url, init, body } = fetch.calls[0];
  assert.equal(url, "https://api.openai.com/v1/images/edits");
  assert.equal(init.headers.Authorization, "Bearer sk-test");
  assert.equal(body.model, "gpt-image-2.5-sunburst");
  assert.equal(body.n, 2);
  assert.equal(body.size, "1536x768");
  assert.equal(body.quality, "high");
  assert.ok(body.prompt.includes("a red door"));
  assert.ok(body.images[0].image_url.startsWith("data:image/png;base64,"));
  const mask = pngAlphaAt(fromBase64(body.mask.image_url.split(",")[1]));
  assert.equal(mask.w, 64);
  assert.equal(mask.h, 32);
  assert.equal(mask.alpha(30, 10), 0, "selected pixel is transparent (edit)");
  assert.equal(mask.alpha(5, 10), 255, "unselected pixel is opaque (keep)");
});

test("openai maps errors to plain messages and retries transient ones", async () => {
  const cases = [
    [401, { error: { message: "Incorrect API key" } }, /rejected the API key/],
    [400, { error: { type: "image_generation_user_error", code: "moderation_blocked" } }, /safety filter/],
    // exact reply captured from OpenAI on 2026-10-12
    [429, { error: { code: "credit_balance_exhausted", type: "insufficient_quota", message: "You have no credits remaining." } }, /no credits left.*billing/],
    [429, { error: { code: "project_spend_limit_exceeded", type: "insufficient_quota" } }, /spend limit.*limits/],
    [403, { error: { message: "Your organization must be verified to use the model" } }, /verified/],
    [400, { error: { message: "Invalid size" } }, /OpenAI: Invalid size/],
  ];
  for (const [status, json, re] of cases) {
    const fetch = fakeFetch(() => ({ status, json }));
    await assert.rejects(openai.generate(req({ fetch, model: "gpt-image-2" })), re);
    assert.equal(fetch.calls.length, 1, `no retry for ${status}`);
  }
  // 503 then success
  const fetch = fakeFetch((u, i, n) => (n === 1 ? { status: 503, json: { error: { message: "busy" } }, headers: { "retry-after": "0.01" } } : { json: { data: [{ b64_json: toBase64(tinyPng()) }] } }));
  const out = await openai.generate(req({ fetch, model: "gpt-image-2" }));
  assert.equal(out.length, 1);
  assert.equal(fetch.calls.length, 2);
  await assert.rejects(openai.generate(req({ fetch, model: "x", apiKey: "" })), /Add your OpenAI API key/);
});

// ---------------- OpenRouter ----------------

const orOk = (count = 1) => ({
  json: { created: 1, data: Array.from({ length: count }, () => ({ b64_json: toBase64(tinyPng()), media_type: "image/png" })), usage: { prompt_tokens: 1300, completion_tokens: 1120, total_tokens: 2420, cost: 0.0371 } },
});

test("openrouter sends image + mask as references, sizes by ratio and tier, reports the billed cost", async () => {
  assert.deepEqual(openrouter.fitSize("google/gemini-nano-banana-2.1", 3000, 1700, "2K"), { width: 2736, height: 1536, aspectRatio: "16:9", imageSize: "2K" });
  assert.equal(openrouter.fitSize("qwen/qwen-image-3", 6000, 4000, "4K").imageSize, "2K", "Qwen tops out at 2K");
  assert.equal(openrouter.fitSize("google/gemini-3-pro-image", 8000, 1000, "1K").aspectRatio, "21:9", "Pro has no 8:1");

  // Nano Banana makes one image per request: variations go out in parallel.
  const usages = [];
  const fetch = fakeFetch(() => orOk(1));
  const target = openrouter.fitSize("google/gemini-nano-banana-2.1", 1536, 768, "2K");
  const out = await openrouter.generate(req({ fetch, model: "google/gemini-nano-banana-2.1", target, n: 2, onUsage: (u) => usages.push(u) }));
  assert.equal(out.length, 2);
  assert.equal(fetch.calls.length, 2);
  const { url, init, body } = fetch.calls[0];
  assert.equal(url, "https://openrouter.ai/api/v1/images");
  assert.equal(init.headers.Authorization, "Bearer sk-test");
  assert.equal(init.headers["X-Title"], "Fulla");
  assert.deepEqual([body.model, body.n, body.resolution, body.aspect_ratio], ["google/gemini-nano-banana-2.1", 1, "1K", "16:9"]);
  assert.ok(body.prompt.includes("a red door") && body.prompt.includes("white marks the area to change"));
  assert.equal(body.input_references.length, 2, "picture, then mask");
  for (const r of body.input_references) assert.ok(r.image_url.url.startsWith("data:image/png;base64,"));
  assert.equal(usages.length, 2);
  assert.equal(estimateCost(body.model, usages[0]), 0.0371, "the amount OpenRouter billed");

  // Qwen returns several images from one request.
  const q = fakeFetch(() => orOk(3));
  const qOut = await openrouter.generate(req({ fetch: q, model: "qwen/qwen-image-3", target: openrouter.fitSize("qwen/qwen-image-3", 1024, 1024, "2K"), n: 3 }));
  assert.equal(qOut.length, 3);
  assert.equal(q.calls.length, 1);
  assert.equal(q.calls[0].body.n, 3);
  assert.equal(q.calls[0].body.resolution, "1K");

  // OpenAI models: no resolution field (the provider picks the pixels), PNG asked for.
  const o = fakeFetch(() => orOk(2));
  await openrouter.generate(req({ fetch: o, model: "openai/gpt-image-2.6-sunburst", target: openrouter.fitSize("openai/gpt-image-2.6-sunburst", 1500, 1000, "2K"), n: 2 }));
  assert.equal(o.calls.length, 1);
  assert.deepEqual([o.calls[0].body.aspect_ratio, o.calls[0].body.output_format, "resolution" in o.calls[0].body], ["3:2", "png", false]);
});

test("openrouter maps errors to plain messages; failed generations are retried", async () => {
  const target = openrouter.fitSize("google/gemini-nano-banana-2.1", 1024, 1024, "1K");
  const cases = [
    [401, { error: { code: 401, message: "No auth credentials found" } }, /rejected the API key/],
    [402, { error: { code: 402, message: "Insufficient credits" } }, /credits are used up.*openrouter\.ai\/settings\/credits/],
    [403, { error: { code: 403, message: "Input was flagged", metadata: { reasons: ["violence"] } } }, /safety filter/],
    [400, { error: { code: 400, message: "Invalid aspect_ratio" } }, /OpenRouter: Invalid aspect_ratio/],
  ];
  for (const [status, json, re] of cases) {
    const fetch = fakeFetch(() => ({ status, json }));
    await assert.rejects(openrouter.generate(req({ fetch, model: "google/gemini-nano-banana-2.1", target, n: 1 })), re);
    assert.equal(fetch.calls.length, 1, `no retry for ${status}`);
  }
  const flaky = fakeFetch((u, i, n) => (n === 1 ? { status: 502, json: { error: { code: 502, message: "Provider returned error" } }, headers: { "retry-after": "0.01" } } : orOk(1)));
  assert.equal((await openrouter.generate(req({ fetch: flaky, model: "google/gemini-nano-banana-2.1", target, n: 1 }))).length, 1);
  assert.equal(flaky.calls.length, 2);
  await assert.rejects(openrouter.generate(req({ fetch: flaky, model: "x", target, apiKey: "" })), /Add your OpenRouter API key/);
});

// ---------------- key checks (Providers tab) ----------------

test("checkKey: one free GET per provider with the key; refused keys and network failures give plain messages", async () => {
  // Refusal bodies captured from the real APIs with an invalid key (2026-11-07).
  const cases = [
    [openrouter, "https://openrouter.ai/api/v1/key", ["authorization", "Bearer k"], 401, { error: { message: "User not found.", code: 401 } }, /rejected the API key.*just created it, wait a minute/],
    [openai, "https://api.openai.com/v1/models", ["authorization", "Bearer k"], 401, { error: { message: "Incorrect API key provided: sk-f***", type: "invalid_request_error", code: "invalid_api_key" } }, /OpenAI rejected the API key.*Providers tab/],
    [gemini, "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", ["x-goog-api-key", "k"], 400, { error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } }, /Google rejected the Gemini API key.*Providers tab/],
  ];
  for (const [provider, url, [header, value], status, json, re] of cases) {
    const ok = fakeFetch(() => ({ json: { data: { label: "sk-or-v1-abc...xyz", usage: 0, limit: null } } }));
    await provider.checkKey({ fetch: ok, apiKey: "k" });
    assert.equal(ok.calls.length, 1);
    assert.equal(ok.calls[0].url, url);
    assert.equal(ok.calls[0].init.method, "GET");
    const headers = Object.fromEntries(Object.entries(ok.calls[0].init.headers).map(([k, v]) => [k.toLowerCase(), v]));
    assert.equal(headers[header], value, `${provider.id} sends the key`);
    const refused = fakeFetch(() => ({ status, json }));
    await assert.rejects(provider.checkKey({ fetch: refused, apiKey: "k" }), re);
    assert.equal(refused.calls.length, 1, `${provider.id}: a key check is never retried`);
    const offline = async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    };
    await assert.rejects(provider.checkKey({ fetch: offline, apiKey: "k" }), (e) => e.code === "network" && /Can't reach/.test(e.message));
  }
});

// ---------------- Gemini ----------------

test("gemini fitSize picks the closest ratio and smallest covering tier", () => {
  assert.deepEqual(gemini.fitSize("gemini-nano-banana-2.1", 1000, 1000, "2K"), { width: 1024, height: 1024, aspectRatio: "1:1", imageSize: "1K" });
  assert.deepEqual(gemini.fitSize("gemini-nano-banana-2.1", 3000, 1700, "2K"), { width: 2752, height: 1536, aspectRatio: "16:9", imageSize: "2K" });
  assert.deepEqual(gemini.fitSize("gemini-nano-banana-2.1", 6000, 3400, "4K"), { width: 5504, height: 3072, aspectRatio: "16:9", imageSize: "4K" });
  assert.equal(gemini.fitSize("gemini-nano-banana-2.1", 8000, 1000, "1K").aspectRatio, "8:1");
  assert.equal(gemini.fitSize("gemini-3-pro-image", 8000, 1000, "1K").aspectRatio, "21:9", "pro has no 8:1");
  assert.equal(gemini.fitSize("gemini-3.1-flash-lite-image", 6000, 4000, "4K").imageSize, "1K", "lite is 1K only");
});

const geminiOk = (n) => ({
  json: {
    candidates: [{ content: { parts: [{ text: "here" }, { inlineData: { mimeType: "image/png", data: toBase64(tinyPng(n, n)) } }] }, finishReason: "STOP" }],
  },
});

test("gemini sends image + mask, runs variations in parallel, reads inlineData", async () => {
  const fetch = fakeFetch(() => geminiOk(4));
  const target = gemini.fitSize("gemini-nano-banana-2.1", 1376, 768, "2K");
  const out = await gemini.generate(req({ fetch, model: "gemini-nano-banana-2.1", target, n: 3 }));
  assert.equal(out.length, 3);
  assert.equal(fetch.calls.length, 3);
  const { url, init, body } = fetch.calls[0];
  assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent");
  assert.equal(init.headers["x-goog-api-key"], "sk-test");
  const parts = body.contents[0].parts;
  assert.equal(parts.length, 3);
  assert.ok(parts[0].text.includes("a red door") && parts[0].text.includes("white marks the area to change"));
  assert.equal(parts[1].inline_data.mime_type, "image/png");
  assert.deepEqual(body.generationConfig.responseModalities, ["IMAGE"]);
  assert.deepEqual(body.generationConfig.imageConfig, { aspectRatio: "16:9", imageSize: "1K" });
});

test("gemini falls back to responseFormat when imageConfig is rejected, and remembers", async () => {
  delete gemini._configStyle["m-fallback"];
  const fetch = fakeFetch((u, init) => {
    const b = JSON.parse(init.body);
    if (b.generationConfig.imageConfig) return { status: 400, json: { error: { code: 400, status: "INVALID_ARGUMENT", message: 'Invalid JSON payload received. Unknown name "imageConfig"' } } };
    return geminiOk(4);
  });
  const target = gemini.fitSize("m-fallback", 1024, 1024, "1K");
  await gemini.generate(req({ fetch, model: "m-fallback", target, n: 1 }));
  assert.equal(fetch.calls.length, 2);
  assert.ok(fetch.calls[1].body.generationConfig.responseFormat);
  await gemini.generate(req({ fetch, model: "m-fallback", target, n: 1 }));
  assert.equal(fetch.calls.length, 3, "second run goes straight to the accepted form");
});

test("gemini surfaces blocks, bad keys and partial variation failures", async () => {
  assert.throws(() => gemini._extractImage({ promptFeedback: { blockReason: "SAFETY" } }), /safety filter blocked this prompt \(SAFETY\)/);
  assert.throws(() => gemini._extractImage({ candidates: [{ content: { parts: [] }, finishReason: "IMAGE_SAFETY" }] }), /blocked the result/);
  assert.throws(() => gemini._extractImage({ candidates: [{ content: { parts: [{ text: "no" }] }, finishReason: "STOP" }] }), /didn't return an image/);
  // thought images are skipped
  const thought = { inlineData: { mimeType: "image/png", data: toBase64(tinyPng(2, 2)) }, thought: true };
  const final = { inlineData: { mimeType: "image/jpeg", data: toBase64(tinyPng(3, 3)) } };
  assert.equal(gemini._extractImage({ candidates: [{ content: { parts: [thought, final] } }] }).mime, "image/jpeg");

  const bad = fakeFetch(() => ({ status: 400, json: { error: { code: 400, status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key.", details: [{ reason: "API_KEY_INVALID" }] } } }));
  const target = gemini.fitSize("gemini-nano-banana-2.1", 1024, 1024, "1K");
  await assert.rejects(gemini.generate(req({ fetch: bad, model: "gemini-nano-banana-2.1", target, n: 1 })), /rejected the Gemini API key/);

  const flaky = fakeFetch((u, i, n) => (n === 2 ? { json: { promptFeedback: { blockReason: "OTHER" } } } : geminiOk(4)));
  const out = await gemini.generate(req({ fetch: flaky, model: "gemini-nano-banana-2.1", target, n: 3 }));
  assert.equal(out.length, 2, "one blocked variation is dropped, the rest return");
});

// ---------------- Pipeline ----------------

function fakePs({ doc = { id: 1, width: 4000, height: 3000, resolution: 300 }, selection = { left: 1000, top: 1000, right: 1400, bottom: 1300 } } = {}) {
  const log = [];
  return {
    log,
    async modal(name, fn, opts) { log.push(["modal", name, opts || {}]); return fn(); },
    async getDocument() { return doc; },
    async getSelectionBounds() { return selection; },
    // returns one pixel narrower than asked, to exercise the resample path
    async readComposite(id, bounds, size) { log.push(["read", bounds, size]); return { data: new Uint8Array((size.width - 1) * size.height * 4).fill(200), width: size.width - 1, height: size.height, components: 4 }; },
    async readSelection(id, bounds, size) {
      const w = size ? size.width : bounds.right - bounds.left;
      const h = size ? size.height : bounds.bottom - bounds.top;
      log.push(["readSelection", size ? "scaled" : "full", w, h]);
      const m = new Uint8Array(w * h); m.fill(255, 0, Math.min(m.length, 5000));
      return { data: m, width: w, height: h };
    },
    async commit(o) { log.push(["commit", o]); return { docId: o.docId, groupId: 9, layerIds: o.results.map((_, i) => 10 + i) }; },
  };
}

const fakeProvider = (out = 2) => ({
  name: "Fake",
  fitSize: (m, w, h) => openai._fitSize(w, h, "2K"),
  async generate(r) { this.seen = r; return Array.from({ length: out }, () => ({ bytes: tinyPng(), mime: "image/png" })); },
});

test("pipeline: read in one modal, network outside, commit as one undo step", async () => {
  const ps = fakePs();
  const provider = fakeProvider(2);
  const stages = [];
  const r = await runGeneration({ ps, provider, apiKey: "k", model: "m", modelName: "Model M", prompt: "a cat", n: 2, progress: (s) => stages.push(s) });
  const seen = provider.seen;
  assert.equal(seen.n, 2);
  assert.equal(seen.image.rgb.length, seen.image.width * seen.image.height * 3, "resampled to exact input size, RGB");
  assert.equal(seen.mask.length, seen.image.width * seen.image.height);
  assert.ok(seen.task.includes("a cat"));
  const modals = ps.log.filter((l) => l[0] === "modal");
  assert.equal(modals.length, 2);
  assert.equal(modals[0][2].historyDocId, undefined, "read scope makes no history");
  assert.equal(modals[1][1], "Fulla: a cat");
  assert.equal(modals[1][2].historyDocId, 1, "commit is one undo step on the right document");
  const commit = ps.log.find((l) => l[0] === "commit")[1];
  assert.equal(commit.results.length, 2);
  assert.equal(commit.selection.width, r.crop.right - r.crop.left, "full-resolution selection kept for the mask");
  assert.equal(commit.selection.left, r.crop.left);
  assert.ok(commit.feather >= 2);
  assert.deepEqual(stages, ["Reading the image", "Generating with Model M", "Placing the result"]);
});

test("pipeline errors are user-friendly and leave the document alone", async () => {
  const provider = fakeProvider(1);
  const none = fakePs({ selection: null });
  await assert.rejects(runGeneration({ ps: none, provider, apiKey: "k", model: "m" }), (e) => e instanceof UserError && /Make a selection first/.test(e.message));
  const c = fakePs();
  await assert.rejects(runGeneration({ ps: c, provider, apiKey: "k", model: "m", cancelled: () => true }), /Cancelled/);
  assert.ok(!c.log.some((l) => l[0] === "commit"), "cancel never touches the document");
  const old = { ...fakePs(), ensureSupported() { throw new Error("needs 27.11"); } };
  await assert.rejects(runGeneration({ ps: old, provider, apiKey: "k", model: "m" }), (e) => e instanceof UserError && /27\.11/.test(e.message));
  const failing = { ...fakeProvider(1), async generate() { throw new Error("network down"); } };
  const f = fakePs();
  await assert.rejects(runGeneration({ ps: f, provider: failing, apiKey: "k", model: "m" }), /network down/);
  assert.ok(!f.log.some((l) => l[0] === "commit"));
});

test("an empty prompt removes what is selected; a prompt is painted and names the layer", async () => {
  const provider = fakeProvider(1);
  const ps = fakePs();
  await runGeneration({ ps, provider, apiKey: "k", model: "m", prompt: "   " });
  assert.match(provider.seen.task, /^Remove everything inside the area to change/);
  assert.equal(ps.log.find((l) => l[0] === "commit")[1].name, "Fulla: Remove");
  assert.match(taskFor("a red door"), /paint: a red door./);
  assert.equal(layerName("  a   very long prompt that keeps going and going forever "), "Fulla: a very long prompt that keeps going and…");
});

test("gemini quota refusals: free tier says so and never retries; long waits are reported; short waits retry", async () => {
  // Body shape captured from Google on 2026-10-12 (free-tier key, image model).
  const freeTier = {
    error: {
      code: 429,
      status: "RESOURCE_EXHAUSTED",
      message: [
        "You exceeded your current quota, please check your plan and billing details.",
        "* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-nano-banana-2.1",
        "Please retry in 2h52m14.9s.",
      ].join("\n"),
      details: [
        { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] },
        { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "10334s" },
      ],
    },
  };
  const target = gemini.fitSize("gemini-nano-banana-2.1", 1024, 1024, "1K");
  const f1 = fakeFetch(() => ({ status: 429, json: freeTier }));
  await assert.rejects(gemini.generate(req({ fetch: f1, model: "gemini-nano-banana-2.1", target, n: 1 })), /free tier, which allows 0 image generations.*billing/);
  assert.equal(f1.calls.length, 1, "no retries on a free-tier refusal");

  const paidDaily = { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for metric: generate_content_requests, limit: 250", details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "5400s" }] } };
  const f2 = fakeFetch(() => ({ status: 429, json: paidDaily }));
  await assert.rejects(gemini.generate(req({ fetch: f2, model: "gemini-nano-banana-2.1", target, n: 1 })), /try again in 1h 30m/);
  assert.equal(f2.calls.length, 1);

  const brief = { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Rate limited", details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "0.01s" }] } };
  const f3 = fakeFetch((u, i, n) => (n === 1 ? { status: 429, json: brief } : geminiOk(4)));
  const out = await gemini.generate(req({ fetch: f3, model: "gemini-nano-banana-2.1", target, n: 1 }));
  assert.equal(out.length, 1);
  assert.equal(f3.calls.length, 2, "short wait retried once, then succeeded");
});

// ---------------- Usage (for the cost estimate) ----------------
// Reply shapes follow each provider's API reference; the counts are made up.

const geminiUsage = {
  promptTokenCount: 1300,
  candidatesTokenCount: 1120,
  thoughtsTokenCount: 200,
  totalTokenCount: 2620,
  promptTokensDetails: [{ modality: "TEXT", tokenCount: 100 }, { modality: "IMAGE", tokenCount: 1200 }],
  candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1120 }],
};

test("gemini reads usageMetadata by modality, thinking counted as text output", () => {
  assert.deepEqual(gemini._usageFrom({ usageMetadata: geminiUsage }), { inputText: 100, inputImage: 1200, outputText: 200, outputImage: 1120, total: 2620 });
  // no per-modality detail: output is all image, input all text (same price at Google)
  assert.deepEqual(gemini._usageFrom({ usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 1120 } }), { inputText: 50, inputImage: 0, outputText: 0, outputImage: 1120, total: 1170 });
  assert.equal(gemini._usageFrom({ candidates: [] }), null);
});

test("gemini reports usage for every reply, blocked variations included", async () => {
  const ok = { json: { ...geminiOk(4).json, usageMetadata: geminiUsage } };
  const blocked = { json: { promptFeedback: { blockReason: "OTHER" }, usageMetadata: { promptTokenCount: 1300, totalTokenCount: 1300 } } };
  const fetch = fakeFetch((u, i, n) => (n === 2 ? blocked : ok));
  const seen = [];
  const target = gemini.fitSize("gemini-nano-banana-2.1", 1024, 1024, "1K");
  const out = await gemini.generate(req({ fetch, model: "gemini-nano-banana-2.1", target, n: 3, onUsage: (u) => seen.push(u) }));
  assert.equal(out.length, 2);
  assert.equal(seen.length, 3);
  assert.deepEqual(seen.map((u) => u.total).sort(), [1300, 2620, 2620]);
  // replies without usageMetadata report nothing
  const quiet = [];
  await gemini.generate(req({ fetch: fakeFetch(() => geminiOk(4)), model: "gemini-nano-banana-2.1", target, n: 1, onUsage: (u) => quiet.push(u) }));
  assert.equal(quiet.length, 0);
});

test("openai reads usage once per reply, even when output details come back zeroed", async () => {
  const usage = {
    input_tokens: 1250,
    input_tokens_details: { text_tokens: 50, image_tokens: 1200 },
    output_tokens: 4160,
    output_tokens_details: { image_tokens: 0, text_tokens: 0 },
    total_tokens: 5410,
  };
  assert.deepEqual(openai._usageFrom({ usage }), { inputText: 50, inputImage: 1200, outputText: 0, outputImage: 4160, total: 5410 });
  // no details: input counted at the dearer image rate
  assert.deepEqual(openai._usageFrom({ usage: { input_tokens: 300, output_tokens: 1000 } }), { inputText: 0, inputImage: 300, outputText: 0, outputImage: 1000, total: 1300 });
  assert.equal(openai._usageFrom({ data: [] }), null);

  const fetch = fakeFetch(() => ({ json: { data: [{ b64_json: toBase64(tinyPng()) }, { b64_json: toBase64(tinyPng()) }], usage } }));
  const seen = [];
  await openai.generate(req({ fetch, model: "gpt-image-2.5-sunburst", onUsage: (u) => seen.push(u) }));
  assert.equal(seen.length, 1, "one reply for all variations");
  assert.equal(seen[0].total, 5410);
  // billed reply without an image is still reported
  const empty = fakeFetch(() => ({ json: { data: [], usage } }));
  const seen2 = [];
  await assert.rejects(openai.generate(req({ fetch: empty, model: "gpt-image-2", onUsage: (u) => seen2.push(u) })), /no image/);
  assert.equal(seen2.length, 1);
});

test("pipeline passes usage through, even when the run is then cancelled", async () => {
  const spending = { ...fakeProvider(1), async generate(r) { r.onUsage({ total: 7 }); return [{ bytes: tinyPng(), mime: "image/png" }]; } };
  let cancel = false;
  const seen = [];
  const run = (o) => runGeneration({ ps: fakePs(), provider: spending, apiKey: "k", model: "m", mode: "fill", onUsage: (u) => { seen.push(u); cancel = true; }, cancelled: () => cancel, ...o });
  await assert.rejects(run(), /Cancelled/);
  assert.deepEqual(seen, [{ total: 7 }]);
  // without a listener, nothing breaks
  const quiet = { ...fakeProvider(1), async generate(r) { if (r.onUsage) r.onUsage({ total: 1 }); return [{ bytes: tinyPng(), mime: "image/png" }]; } };
  await runGeneration({ ps: fakePs(), provider: quiet, apiKey: "k", model: "m", mode: "fill" });
});

test("after Cancel no new request is sent: a failed request is not retried (each one may be billed)", async () => {
  let cancel = false;
  const fetch = fakeFetch(() => {
    cancel = true; // the user clicks Cancel while the request is out; it then fails with a retryable error
    return { status: 503, json: { error: { message: "busy" } }, headers: { "retry-after": "0.01" } };
  });
  await assert.rejects(
    runGeneration({ ps: fakePs(), provider: openrouter, fetch, apiKey: "k", model: "qwen/qwen-image-3", prompt: "a red door", cancelled: () => cancel }),
    /Cancelled/
  );
  assert.equal(fetch.calls.length, 1);
});
