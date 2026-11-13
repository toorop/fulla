const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");

const { toBase64, fromBase64, utf8Encode, crc32, adler32 } = require("../plugin/src/bytes");
const { encodePng, deflateRaw, imageSize, tagSrgb } = require("../plugin/src/png");
const { computeCrop, inputSize } = require("../plugin/src/geometry");
const { resample, toRGB, featherMask, emptyUnder, dilate, alphaEditMask, maskBounds, downsampleStrips } = require("../plugin/src/image");

function randomBytes(n, seed = 1) {
  const out = new Uint8Array(n);
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    out[i] = s >>> 24;
  }
  return out;
}

test("base64 round-trips and matches Node", () => {
  for (const n of [0, 1, 2, 3, 4, 5, 100, 12289, 50000]) {
    const b = randomBytes(n, n + 7);
    const enc = toBase64(b);
    assert.equal(enc, Buffer.from(b).toString("base64"));
    assert.deepEqual(fromBase64(enc), b);
  }
  assert.deepEqual(fromBase64("aGVs\nbG8="), utf8Encode("hello"));
});

test("utf8 encode matches Node", () => {
  const s = "Fill with a café ☕ and 🌄 sky, हिंदी";
  assert.deepEqual(Buffer.from(utf8Encode(s)), Buffer.from(s, "utf8"));
});

test("crc32 and adler32 match zlib", () => {
  const b = randomBytes(100000);
  assert.equal(crc32(b), zlib.crc32 ? zlib.crc32(b) : crc32(b));
  // adler32 checked indirectly through zlib inflate in the PNG test
  assert.equal(adler32(utf8Encode("Wikipedia")), 0x11e60398);
});

test("deflate output inflates back to the input (random, runs, mixed)", () => {
  const cases = [
    new Uint8Array(0),
    randomBytes(1),
    randomBytes(70000),
    new Uint8Array(200000).fill(7),
    Uint8Array.from({ length: 100000 }, (_, i) => (i % 300 < 150 ? 0 : (i * 31) & 255)),
  ];
  for (const c of cases) {
    const raw = deflateRaw(c);
    assert.deepEqual(new Uint8Array(zlib.inflateRawSync(raw)), c);
  }
  // runs compress hard
  assert.ok(deflateRaw(new Uint8Array(200000)).length < 2000);
});

function decodePng(bytes) {
  // tiny test-only decoder for our own Sub-filtered output
  const buf = Buffer.from(bytes);
  assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  let o = 8;
  let w, h, ct;
  const idat = [];
  const types = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString("ascii", o + 4, o + 8);
    const data = buf.subarray(o + 8, o + 8 + len);
    const crc = buf.readUInt32BE(o + 8 + len);
    assert.equal(crc, crc32(bytes, o + 4, o + 8 + len), `crc of ${type}`);
    types.push(type);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      ct = data[9];
    }
    if (type === "IDAT") idat.push(data);
    o += 12 + len;
  }
  const comps = { 0: 1, 2: 3, 6: 4 }[ct];
  const raw = zlib.inflateSync(Buffer.concat(idat)); // checks adler32 too
  const stride = w * comps;
  const px = new Uint8Array(w * h * comps);
  for (let y = 0; y < h; y++) {
    assert.equal(raw[y * (stride + 1)], 1);
    for (let x = 0; x < stride; x++) {
      const left = x >= comps ? px[y * stride + x - comps] : 0;
      px[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + left) & 255;
    }
  }
  return { w, h, comps, px, types };
}

test("PNG encodes gray, RGB and RGBA losslessly with valid chunks", () => {
  for (const comps of [1, 3, 4]) {
    const w = 37, h = 23;
    const px = randomBytes(w * h * comps, comps);
    const png = encodePng(px, w, h, comps, { ppi: 300 });
    const d = decodePng(png);
    assert.equal(d.w, w);
    assert.equal(d.h, h);
    assert.equal(d.comps, comps);
    assert.deepEqual(d.px, px);
    assert.deepEqual(d.types, ["IHDR", "pHYs", "IDAT", "IEND"]);
    assert.deepEqual(imageSize(png), { width: w, height: h, type: "png" });
  }
  assert.throws(() => encodePng(new Uint8Array(5), 2, 2, 3));
});

test("PNG of a 1536x1024 mask stays small and encodes fast", () => {
  const w = 1536, h = 1024;
  const mask = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) mask[i * 4 + 3] = (i % w) > 600 && (i % w) < 900 ? 0 : 255;
  const t = Date.now();
  const png = encodePng(mask, w, h, 4);
  const ms = Date.now() - t;
  assert.ok(png.length < 200000, `mask png ${png.length} bytes`);
  assert.ok(ms < 3000, `took ${ms}ms`);
});

test("result PNGs get an embedded sRGB profile, once; other formats are left alone", () => {
  const px = randomBytes(5 * 4 * 3, 3);
  const tagged = tagSrgb(encodePng(px, 5, 4, 3));
  const d = decodePng(tagged);
  assert.deepEqual(d.types, ["IHDR", "iCCP", "IDAT", "IEND"]);
  assert.deepEqual(d.px, px, "pixels untouched");
  // iCCP: name, NUL, method 0, zlib(profile). The profile must be a well-formed ICC header.
  const b = Buffer.from(tagged);
  const body = b.subarray(41, 41 + b.readUInt32BE(33));
  const nul = body.indexOf(0);
  assert.equal(body.toString("latin1", 0, nul), "sRGB");
  const icc = zlib.inflateSync(body.subarray(nul + 2));
  assert.equal(icc.readUInt32BE(0), icc.length, "profile size field");
  assert.equal(icc.toString("latin1", 12, 24), "mntrRGB XYZ ");
  assert.equal(icc.toString("latin1", 36, 40), "acsp");
  assert.ok(icc.includes(Buffer.from("sRGB IEC61966-2.1")));
  assert.deepEqual(tagSrgb(tagged), tagged, "already tagged: unchanged");
  const webp = Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]);
  assert.equal(tagSrgb(webp), webp, "other formats unchanged");
});

test("result JPEGs get an sRGB profile too (APP2 ICC_PROFILE, after the JFIF header), once", () => {
  // SOI, APP0 JFIF (len 16), SOF0 640 x 480, EOI
  const app0 = [0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof = [0xff, 0xc0, 0, 17, 8, 0x01, 0xe0, 0x02, 0x80, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  const jpg = Uint8Array.from([0xff, 0xd8, ...app0, ...sof, 0xff, 0xd9]);
  const tagged = Buffer.from(tagSrgb(jpg));
  assert.deepEqual([...tagged.subarray(0, 2 + app0.length)], [0xff, 0xd8, ...app0], "SOI and JFIF stay first");
  const at = 2 + app0.length;
  assert.deepEqual([tagged[at], tagged[at + 1]], [0xff, 0xe2], "then APP2");
  const len = tagged.readUInt16BE(at + 2);
  assert.equal(tagged.toString("latin1", at + 4, at + 16), "ICC_PROFILE\0");
  assert.deepEqual([tagged[at + 16], tagged[at + 17]], [1, 1], "one segment of one");
  const icc = tagged.subarray(at + 18, at + 2 + len);
  assert.equal(icc.readUInt32BE(0), icc.length, "profile size field");
  assert.equal(icc.toString("latin1", 36, 40), "acsp");
  assert.deepEqual([...tagged.subarray(at + 2 + len)], [...sof, 0xff, 0xd9], "the image itself untouched");
  assert.deepEqual(imageSize(new Uint8Array(tagged)), { width: 640, height: 480, type: "jpeg" });
  assert.deepEqual(tagSrgb(new Uint8Array(tagged)), new Uint8Array(tagged), "already has a profile: unchanged");
  // Without a JFIF header the profile goes right after the start marker.
  const bare = tagSrgb(Uint8Array.from([0xff, 0xd8, ...sof, 0xff, 0xd9]));
  assert.deepEqual([bare[2], bare[3]], [0xff, 0xe2]);
});

test("imageSize reads JPEG dimensions", () => {
  // SOI, APP0 (len 16), SOF0 with h=480 w=640
  const jpg = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
    0xff, 0xc0, 0, 17, 8, 0x01, 0xe0, 0x02, 0x80, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
  ]);
  assert.deepEqual(imageSize(jpg), { width: 640, height: 480, type: "jpeg" });
  assert.equal(imageSize(Uint8Array.from([1, 2, 3])), null);
});

test("imageSize reads WebP dimensions (lossy, lossless, extended) and refuses an unknown WebP chunk", () => {
  const webp = (fourcc, body) => {
    const b = new Uint8Array(40);
    b.set([82, 73, 70, 70, 32, 0, 0, 0, 87, 69, 66, 80], 0); // RIFF .... WEBP
    b.set([...fourcc].map((c) => c.charCodeAt(0)), 12);
    b.set(body, 20);
    return b;
  };
  // VP8: frame tag, start code 9d 01 2a, then 14-bit width and height (little endian): 1376 x 768
  assert.deepEqual(imageSize(webp("VP8 ", [0, 0, 0, 0x9d, 0x01, 0x2a, 0x60, 0x05, 0x00, 0x03])), { width: 1376, height: 768, type: "webp" });
  // VP8L: signature 2f, then width-1 (14 bits) and height-1 (14 bits) packed: 2048 x 1152
  const w = 2047, h = 1151, bits = w | (h << 14);
  assert.deepEqual(imageSize(webp("VP8L", [0x2f, bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, (bits >> 24) & 255])), { width: 2048, height: 1152, type: "webp" });
  // VP8X: flags (4 bytes), then width-1 and height-1 on 3 bytes each: 4096 x 2304
  assert.deepEqual(imageSize(webp("VP8X", [0, 0, 0, 0, 0xff, 0x0f, 0x00, 0xff, 0x08, 0x00])), { width: 4096, height: 2304, type: "webp" });
  assert.equal(imageSize(webp("ABCD", [])), null);
});

const SIZES = [
  { width: 1024, height: 1024 },
  { width: 1536, height: 1024 },
  { width: 1024, height: 1536 },
];

// closest-aspect pick from a fixed list, like a fixed-size model
const fit = (w, h) => {
  let best = SIZES[0], err = Infinity;
  for (const z of SIZES) {
    const e = Math.abs(Math.log(z.width / z.height) - Math.log(w / h));
    if (e < err) { err = e; best = z; }
  }
  return best;
};

test("inputSize caps the long edge and keeps aspect", () => {
  assert.deepEqual(inputSize({ width: 4096, height: 2048 }), { width: 2048, height: 1024 });
  assert.deepEqual(inputSize({ width: 1024, height: 1536 }), { width: 1024, height: 1536 });
});

test("computeCrop keeps the selection inside, stays in the document, matches aspect", () => {
  const docWidth = 6000, docHeight = 4000;
  const selections = [
    { left: 100, top: 100, right: 300, bottom: 260 },
    { left: 5800, top: 3900, right: 6000, bottom: 4000 },
    { left: 0, top: 0, right: 6000, bottom: 4000 },
    { left: 2000, top: 500, right: 2100, bottom: 3500 },
  ];
  for (const selection of selections) {
    const { crop, target, scaleX, scaleY } = computeCrop({ docWidth, docHeight, selection, fit });
    assert.ok(crop.left >= 0 && crop.top >= 0 && crop.right <= docWidth && crop.bottom <= docHeight, "inside doc");
    assert.ok(crop.left <= selection.left && crop.top <= selection.top, "contains selection (top-left)");
    assert.ok(crop.right >= selection.right && crop.bottom >= selection.bottom, "contains selection (bottom-right)");
    const cw = crop.right - crop.left, ch = crop.bottom - crop.top;
    assert.ok(Math.abs(cw / ch - target.width / target.height) < 0.01, `aspect ${cw}x${ch} vs ${target.width}x${target.height}`);
    assert.ok(Math.abs(scaleX - scaleY) / scaleX < 0.01);
    assert.ok(Number.isInteger(crop.left) && Number.isInteger(crop.right));
  }
});

test("computeCrop on a tiny document never exceeds it", () => {
  const r = computeCrop({ docWidth: 300, docHeight: 200, selection: { left: 10, top: 10, right: 50, bottom: 50 }, fit, minSide: 512 });
  assert.deepEqual(r.crop, { left: 0, top: 0, right: 300, bottom: 200 });
  assert.deepEqual(r.target, SIZES[1]);
  assert.ok(r.softness < 1);
});

test("computeCrop reports softness for huge areas", () => {
  const r = computeCrop({ docWidth: 6000, docHeight: 4000, selection: { left: 0, top: 0, right: 6000, bottom: 4000 }, fit });
  assert.ok(r.softness > 3.5);
});

test("resample keeps flat colours and exact sizes", () => {
  const src = new Uint8Array(10 * 6 * 3);
  for (let i = 0; i < src.length; i += 3) { src[i] = 200; src[i + 1] = 100; src[i + 2] = 50; }
  const out = resample(src, 10, 6, 3, 17, 4);
  assert.equal(out.length, 17 * 4 * 3);
  for (let i = 0; i < out.length; i += 3) assert.deepEqual([out[i], out[i + 1], out[i + 2]], [200, 100, 50]);
  // gradient stays monotonic
  const g = Uint8Array.from({ length: 8 }, (_, i) => i * 32);
  const up = resample(g, 8, 1, 1, 32, 1);
  for (let i = 1; i < up.length; i++) assert.ok(up[i] >= up[i - 1]);
});

test("toRGB composites alpha over grey", () => {
  const rgba = Uint8Array.of(255, 0, 0, 255, 255, 0, 0, 0);
  assert.deepEqual(toRGB(rgba, 2, 1, 4), Uint8Array.of(255, 0, 0, 128, 128, 128));
});

test("the mask's soft edge fades inside the picture but stays fully selected along the canvas edge it touches", () => {
  // Right half selected, top to bottom: an extended canvas filled on the right.
  const w = 60, h = 30;
  const mask = new Uint8Array(w * h).map((_, i) => (i % w >= 30 ? 255 : 0));
  const at = (m, x, y) => m[y * w + x];
  const kept = featherMask(mask, w, h, 8, { top: true, right: true, bottom: true });
  for (const y of [0, 15, h - 1]) assert.equal(at(kept, w - 1, y), 255, `canvas edge, row ${y}`);
  assert.equal(at(kept, 0, 15), 0, "far from the selection");
  const inner = [24, 27, 30, 33, 36].map((x) => at(kept, x, 15));
  assert.ok(inner.every((v, i) => i === 0 || v > inner[i - 1]) && inner[0] > 0 && inner[4] < 255, `soft inner edge ${inner}`);
  // Photoshop's way (edges not kept) fades the canvas edge too: the see-through strip.
  const faded = featherMask(mask, w, h, 8);
  assert.ok(at(faded, w - 1, 15) < 200 && at(faded, w - 1, 0) < at(faded, w - 1, 15), "edges not kept fade");
});

test("an empty area selected as it is (extended canvas) stays fully covered up to the photo's edge; the soft edge stays on the photo", () => {
  // 60 x 30 document: photo on the left 40 px, empty (transparent) on the right; the empty area is the
  // selection, not grown into the photo (2026-11-12: a light line along the photo's edge).
  const w = 60, h = 30;
  const sel = new Uint8Array(w * h).map((_, i) => (i % w >= 40 ? 255 : 0));
  const at = (m, x, y) => m[y * w + x];
  const composite = (cw, ch) => {
    const px = new Uint8Array(cw * ch * 4);
    for (let i = 0; i < cw * ch; i++) px[i * 4 + 3] = (i % cw) * w < 40 * cw ? 255 : 0;
    return px;
  };
  for (const [cw, ch] of [[60, 30], [45, 23]]) {
    const cover = emptyUnder(sel, w, h, composite(cw, ch), cw, ch, 4);
    const soft = featherMask(sel, w, h, 8, { top: true, right: true, bottom: true }, cover);
    for (const x of [40, 41, 44, 59]) assert.equal(at(soft, x, 15), 255, `read at ${cw} px: empty pixel x=${x} covered`);
    assert.ok(at(soft, 38, 15) > 0 && at(soft, 38, 15) < 255 && at(soft, 20, 15) === 0, `read at ${cw} px: the soft edge falls on the photo`);
  }
  // Without the cover, the soft edge leaves the first empty pixels see-through.
  assert.ok(at(featherMask(sel, w, h, 8, { top: true, right: true, bottom: true }), 40, 15) < 200);
  // Nothing empty, or nothing empty under the selection: nothing to cover.
  assert.equal(emptyUnder(sel, w, h, new Uint8Array(w * h * 4).fill(255), w, h, 4), null);
  assert.equal(emptyUnder(sel.map((_, i) => (i % w < 30 ? 255 : 0)), w, h, composite(w, h), w, h, 4), null);
});

test("dilate grows a single pixel into a square", () => {
  const m = new Uint8Array(25);
  m[12] = 255;
  const d = dilate(m, 5, 5, 1);
  assert.deepEqual(maskBounds(d, 5, 5), { left: 1, top: 1, right: 4, bottom: 4 });
  assert.equal(maskBounds(new Uint8Array(4), 2, 2), null);
});

test("alphaEditMask marks selected pixels transparent", () => {
  assert.deepEqual(alphaEditMask(Uint8Array.of(0, 255, 10)), Uint8Array.of(0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0));
});

test("downsampleStrips keeps edges exactly where they belong, reading in strips", async () => {
  // 900x600 source, red left of x=563, blue from x=563 (an odd split), read as 37-row strips
  const W = 900, H = 600;
  const src = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) src.set(x < 563 ? [255, 0, 0, 255] : [0, 0, 255, 255], (y * W + x) * 4);
  const reads = [];
  const strip = async (y0, y1) => {
    reads.push([y0, y1]);
    return src.subarray(y0 * W * 4, y1 * W * 4);
  };
  for (const [ow, oh] of [[450, 300], [300, 200], [617, 411]]) {
    reads.length = 0;
    const out = await downsampleStrips(strip, W, H, 4, ow, oh, 37);
    assert.equal(out.length, ow * oh * 4);
    const split = (563 * ow) / W;
    const at = (x) => [out[x * 4], out[x * 4 + 1], out[x * 4 + 2]];
    assert.deepEqual(at(Math.floor(split) - 1), [255, 0, 0], `${ow}: left of split is red`);
    assert.deepEqual(at(Math.ceil(split) + 1), [0, 0, 255], `${ow}: right of split is blue`);
    // strips cover every row exactly once, in order
    let next = 0;
    for (const [a, b] of reads) { assert.equal(a, next); next = b; }
    assert.equal(next, H);
  }
  await assert.rejects(downsampleStrips(strip, 10, 10, 4, 20, 10), /only shrinks/);
});

test("keys: only in secure storage; a plain-text copy left in localStorage is moved there once, then erased", async () => {
  const Module = require("node:module");
  const secure = new Map();
  const local = new Map([["fulla.key.gemini", "old-local-copy"]]); // saved by a host without secure storage
  global.localStorage = { getItem: (k) => (local.has(k) ? local.get(k) : null), setItem: (k, v) => local.set(k, v), removeItem: (k) => local.delete(k) };
  const uxp = { storage: { secureStorage: { getItem: async (k) => secure.get(k) || null, setItem: async (k, v) => secure.set(k, v), removeItem: async (k) => secure.delete(k) } } };
  const origLoad = Module._load;
  Module._load = function (request) {
    return request === "uxp" ? uxp : origLoad.apply(this, arguments);
  };
  try {
    const settings = require("../plugin/src/settings");
    await settings.setKey("openrouter", "  sk-or-v1-abcd  ");
    assert.equal(await settings.getKey("openrouter"), "sk-or-v1-abcd");
    assert.equal(local.has("fulla.key.openrouter"), false, "never written in plain text");
    assert.equal(await settings.getKey("gemini"), "old-local-copy");
    assert.equal(secure.get("fulla.key.gemini"), "old-local-copy", "moved into secure storage");
    assert.equal(local.has("fulla.key.gemini"), false, "the plain-text copy is erased");
    // A plain-text copy next to a secure key: the secure one wins, the copy goes.
    local.set("fulla.key.openrouter", "stale");
    assert.equal(await settings.getKey("openrouter"), "sk-or-v1-abcd");
    assert.equal(local.has("fulla.key.openrouter"), false);
    await settings.setKey("openrouter", "");
    await settings.setKey("gemini", "");
    assert.equal(await settings.getKey("openrouter"), "");
    assert.equal(await settings.getKey("gemini"), "");
  } finally {
    Module._load = origLoad;
    delete global.localStorage;
  }
});

test("error report: versions, provider, model, message, status, code and provider detail; never the key", () => {
  const { errorReport } = require("../plugin/src/report");
  const { ProviderError } = require("../plugin/src/providers/http");
  const err = new ProviderError("The model is having trouble right now.", { status: 502, code: "502", detail: "502: Provider returned error" });
  const text = errorReport({ error: err, provider: "OpenRouter", model: "google/gemini-nano-banana-2.1", size: "Auto", plugin: "0.1.0", host: "28.0.1", when: new Date("2026-11-08T18:00:00Z") });
  assert.equal(
    text,
    [
      "Fulla 0.1.0 · Photoshop 28.0.1 · 2026-11-08T18:00:00.000Z",
      "Provider: OpenRouter · model: google/gemini-nano-banana-2.1 · size: Auto",
      "Message: The model is having trouble right now.",
      "HTTP status: 502",
      "Code: 502",
      "Detail: 502: Provider returned error",
    ].join("\n")
  );
  // A plain error (Photoshop, network) still reads; a long detail is cut.
  const plain = errorReport({ error: Object.assign(new Error("Photoshop refused \"placeEvent\""), { detail: "x".repeat(5000) }) });
  assert.match(plain, /^Fulla dev · Photoshop \? · /);
  assert.ok(plain.split("\n").pop().length <= "Detail: ".length + 1000);
});

test("report a bug URL: opens the real template, pre-fills Fulla/Photoshop and the same report", () => {
  const { errorReport, reportBugUrl } = require("../plugin/src/report");
  const { ProviderError } = require("../plugin/src/providers/http");
  const err = new ProviderError("The model is having trouble right now.", { status: 502, code: "502", detail: "502: Provider returned error" });
  const info = { error: err, provider: "OpenRouter", model: "google/gemini-nano-banana-2.1", size: "Auto", plugin: "0.1.0", host: "28.0.1", when: new Date("2026-11-08T18:00:00Z"), repo: "https://github.com/toorop/fulla" };
  const url = reportBugUrl(info);
  assert.ok(url.startsWith("https://github.com/toorop/fulla/issues/new?"));
  const params = new URL(url).searchParams;
  assert.equal(params.get("template"), "bug.yml");
  assert.equal(params.get("title"), "Bug: The model is having trouble right now.");
  assert.equal(params.get("fulla"), "0.1.0");
  assert.equal(params.get("photoshop"), "28.0.1");
  assert.equal(params.get("result"), errorReport(info));
  // No version yet (first run, before the host answers): the two fields are left out, not "?".
  assert.equal(new URL(reportBugUrl({ error: err })).searchParams.get("fulla"), null);
});

test("run gate: one run at a time; Cancel during a run drops it at once; the second half of a double click is ignored", async () => {
  const { createRunGate } = require("../plugin/src/run");
  let t = 1000;
  const gate = createRunGate({ now: () => t });
  assert.equal(gate.busy, false);
  assert.equal(gate.click(), "start");
  assert.equal(gate.busy, true, "busy at once, before anything is awaited");
  t += 200;
  assert.equal(gate.click(), "ignore", "a double click is not a Cancel, nor a second run");
  assert.equal(gate.cancelled(), false);
  let dropped = false;
  gate.whenCancelled.then(() => (dropped = true));
  t += 400;
  assert.equal(gate.click(), "cancel");
  await Promise.resolve();
  assert.ok(dropped && gate.cancelled(), "Cancel resolves whenCancelled");
  gate.finish();
  assert.equal(gate.busy, false);
  // The next run starts clean.
  assert.equal(gate.click(), "start");
  assert.equal(gate.cancelled(), false);
  let early = false;
  gate.whenCancelled.then(() => (early = true));
  await Promise.resolve();
  assert.equal(early, false, "a new run has its own whenCancelled");
});
