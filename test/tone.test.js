const test = require("node:test");
const assert = require("node:assert/strict");
const { fitTone, curvePoints, localTone, linearLightRows } = require("../plugin/src/tone");

const W = 400;
const H = 300;
const SEL = { left: 150, top: 100, right: 250, bottom: 200 };

/** A textured RGB picture (gradients plus fine noise, like a photo with grain). */
function photo(gray = false) {
  const p = new Uint8Array(W * H * 3);
  let seed = 7;
  const noise = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 21) - 10;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      const v = [40 + (x * 150) / W, 60 + (y * 120) / H, 200 - (x * 100) / W];
      const g = (v[0] + v[1] + v[2]) / 3;
      for (let k = 0; k < 3; k++) p[o + k] = Math.max(0, Math.min(255, Math.round((gray ? g : v[k]) + noise())));
    }
  }
  return p;
}

function selMask(sel = SEL) {
  const m = new Uint8Array(W * H);
  for (let y = sel.top; y < sel.bottom; y++) m.fill(255, y * W + sel.left, y * W + sel.right);
  return m;
}

/** What a model returns: the picture with its tones shifted by `cast`, and new content in the selection. */
function tileFrom(orig, cast, sel = SEL) {
  const t = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const x = i % W;
    const y = Math.floor(i / W);
    const inside = x >= sel.left && x < sel.right && y >= sel.top && y < sel.bottom;
    for (let k = 0; k < 3; k++) t[i * 4 + k] = Math.max(0, Math.min(255, Math.round(inside ? 30 + ((x * 7 + k * 50) % 180) : cast(orig[i * 3 + k], k))));
    t[i * 4 + 3] = 255;
  }
  return t;
}

/** Photoshop's Curves with two points: linear between them, flat beyond. */
function applyCurve(pts, v) {
  const [a, b] = pts;
  if (v <= a.input) return a.output;
  if (v >= b.input) return b.output;
  return a.output + ((v - a.input) * (b.output - a.output)) / (b.input - a.input);
}

test("tone: a colour cast measured around the selection is undone, as Curves points", () => {
  const orig = photo();
  // Warmer and a little darker blue, as the models do.
  const tile = tileFrom(orig, (v, k) => (k === 0 ? v * 0.9 + 20 : k === 2 ? v - 15 : v));
  const fit = fitTone({ orig, tile, mask: selMask(), width: W, height: H });
  assert.ok(fit, "a correction is found");
  const [r, g, b] = fit.channels;
  assert.ok(Math.abs(r.gain - 1 / 0.9) < 0.03 && Math.abs(r.offset + 20 / 0.9) < 3, `red ${JSON.stringify(r)}`);
  assert.ok(Math.abs(g.gain - 1) < 0.03 && Math.abs(g.offset) < 3, `green ${JSON.stringify(g)}`);
  assert.ok(Math.abs(b.gain - 1) < 0.03 && Math.abs(b.offset - 15) < 3, `blue ${JSON.stringify(b)}`);
  // The Curves points bring the shifted tones back.
  for (const v of [60, 120, 180]) {
    assert.ok(Math.abs(applyCurve(fit.curves[0], v * 0.9 + 20) - v) <= 2, `red ${v}`);
    assert.ok(Math.abs(applyCurve(fit.curves[2], v - 15) - v) <= 2, `blue ${v}`);
  }
});

test("tone: a thin margin around the selection still gets its correction, the gap kept to the blend", () => {
  const thin = { left: 12, top: 12, right: W - 12, bottom: H - 12 }; // the 5 % margin of the default crop
  const orig = photo();
  const tile = tileFrom(orig, (v, k) => (k === 2 ? v - 15 : v), thin);
  assert.equal(fitTone({ orig, tile, mask: selMask(thin), width: W, height: H }), null, "the old fixed gap leaves no ring");
  const fit = fitTone({ orig, tile, mask: selMask(thin), width: W, height: H, gap: 6 });
  assert.ok(fit && Math.abs(fit.channels[2].offset - 15) < 3, `blue ${JSON.stringify(fit && fit.channels[2])}`);
});

test("tone: a colour cast on a black and white photo comes back neutral", () => {
  const orig = photo(true);
  const tile = tileFrom(orig, (v, k) => v + [12, 0, -10][k]);
  const fit = fitTone({ orig, tile, mask: selMask(), width: W, height: H });
  for (const v of [80, 120, 160]) {
    const out = [0, 1, 2].map((k) => applyCurve(fit.curves[k], v + [12, 0, -10][k]));
    assert.ok(Math.max(...out) - Math.min(...out) <= 2, `grey ${v} came back as ${out}`);
  }
});

test("tone: a texture the model redrew a little off around the selection still gets its colour cast undone", () => {
  // Planks: bands 8 px high; the model's are half a band off, and redder (seen 2026-11-12, extending a canvas).
  const planks = (shift) => {
    const p = new Uint8Array(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      const dark = Math.floor((Math.floor(i / W) + shift) / 8) % 2;
      [170, 120, 90].forEach((v, k) => (p[i * 3 + k] = v - dark * 60));
    }
    return p;
  };
  const orig = planks(0);
  const tile = tileFrom(planks(4), (v, k) => v + [25, 8, 0][k]);
  const report = {};
  const fit = fitTone({ orig, tile, mask: selMask(), width: W, height: H, report });
  assert.equal(report.method, "tones", JSON.stringify(report));
  for (const [v, k] of [[170, 0], [110, 0], [120, 1], [60, 1]]) assert.ok(Math.abs(applyCurve(fit.curves[k], v + [25, 8, 0][k]) - v) <= 3, `channel ${k}: ${v}`);
});

test("tone: a greyscale document gets one curve that undoes a brightness shift", () => {
  const orig = photo(true);
  const tile = tileFrom(orig, (v) => v * 0.9 + 20);
  const fit = fitTone({ orig, tile, mask: selMask(), width: W, height: H });
  for (const v of [60, 120, 180]) assert.ok(Math.abs(applyCurve(fit.gray, v * 0.9 + 20) - v) <= 2, `grey ${v} came back as ${applyCurve(fit.gray, v * 0.9 + 20)}`);
});

test("tone: no filter when the shift is negligible, there is no ring to compare, or the ring is another picture; never a wild correction", () => {
  const orig = photo();
  const other = tileFrom(orig, (v, k) => [255, 0, 128][k]);
  // Each abstention says why (the self-test's toneDiag reports it).
  const why = (tile, mask = selMask()) => {
    const report = {};
    assert.equal(fitTone({ orig, tile, mask, width: W, height: H, report }), null);
    return report.reason;
  };
  assert.equal(why(other), "mismatch", "a tile that is not the same picture around the selection gets no correction");
  assert.equal(why(tileFrom(orig, (v) => v + 1)), "negligible", "1 level is not worth a filter");
  assert.equal(why(tileFrom(orig, (v) => v + 20), new Uint8Array(W * H).fill(255)), "ring", "Select All leaves no ring");
  assert.equal(fitTone({ orig, tile: tileFrom(orig, (v) => v * 0.3), mask: selMask(), width: W, height: H }), null, "beyond the gain bounds: none rather than a wrong one");
  // Points stay inside 0..255 and in order, whatever the line.
  for (const p of [curvePoints({ gain: 1.25, offset: -40 }), curvePoints({ gain: 0.8, offset: 60 })]) {
    assert.ok(p.every((q) => q.input >= 0 && q.input <= 255 && q.output >= 0 && q.output <= 255) && p[1].input > p[0].input, JSON.stringify(p));
  }
});

// Linear Light as Photoshop computes it in 8 bits.
const linearLight = (base, v) => Math.max(0, Math.min(255, v >= 128 ? base + 2 * (v - 128) : base + 2 * v - 255));

test("local tone: a drift near the selection that varies along its edge is undone all along it, and the photo far away is left alone", () => {
  // Seen 2026-11-12: a band filled along the top of a beach came back too bright, +40 levels on one
  // side and +60 on the other at the band's edge, fading halfway down; the photo far below kept.
  const band = { left: 0, top: 0, right: W, bottom: 60 };
  const orig = photo();
  const drift = (x, y) => (40 + (20 * x) / W) * Math.max(0, 1 - Math.max(0, y - band.bottom) / 100);
  const tile = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const x = i % W;
    const y = Math.floor(i / W);
    for (let k = 0; k < 3; k++) tile[i * 4 + k] = Math.min(255, Math.round(orig[i * 3 + k] + drift(x, y)));
    tile[i * 4 + 3] = 255;
  }
  const mask = selMask(band);
  const fit = fitTone({ orig, tile, mask, width: W, height: H });
  const report = {};
  const local = localTone({ orig, tile, mask, width: W, height: H, gap: 4, fit, report });
  assert.ok(local, JSON.stringify(report));
  const rows = linearLightRows(local, W, H, 0, H);
  const curve = (k, v) => (fit ? Math.max(0, Math.min(255, fit.channels[k].gain * v + fit.channels[k].offset)) : v);
  // Just inside the band, on both sides: back to the photo just outside it.
  for (const x of [40, 200, 360]) {
    const i = (band.bottom - 3) * W + x;
    for (let k = 0; k < 3; k++) {
      const back = linearLight(curve(k, tile[i * 4 + k]), rows[i * 3 + k]);
      assert.ok(Math.abs(back - orig[i * 3 + k]) <= 6, `x ${x}, channel ${k}: ${back} for ${orig[i * 3 + k]}`);
    }
  }
});

test("local tone: no layer when nothing is left to correct, nothing can be measured, or what is next to the selection is another picture; empty canvas is not measured", () => {
  const orig = photo();
  const same = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) for (let k = 0; k < 4; k++) same[i * 4 + k] = k < 3 ? orig[i * 3 + k] : 255;
  const why = (o) => {
    const report = {};
    assert.ok(localTone({ orig, tile: same, mask: selMask(), width: W, height: H, ...o, report }) === null, JSON.stringify(report.local));
    return report.local.reason;
  };
  assert.equal(why({}), "negligible");
  assert.equal(why({ mask: new Uint8Array(W * H).fill(255) }), "ring", "Select All");
  assert.equal(why({ solid: new Uint8Array(W * H) }), "ring", "everything around is empty canvas");
  assert.equal(why({ tile: new Uint8Array(W * H * 4).fill(255) }), "mismatch", "a white tile is not a drift");
});

test("local tone: Linear Light values lighten above mid-grey and darken below it, exactly, in 8 and 16 bits", () => {
  const local = { width: 3, height: 1, field: Float32Array.of(-41, -41, -41, 0, 0, 0, 40, 40, 40) };
  const rows = linearLightRows(local, 3, 1, 0, 1);
  assert.deepEqual([0, 3, 6].map((i) => linearLight(100, rows[i]) - 100), [-41, 0, 40]);
  assert.deepEqual(Array.from(linearLightRows(local, 3, 1, 0, 1, true)), [Array.from(rows)[0], 128, Array.from(rows)[6]], "greyscale: one channel");
  assert.deepEqual(Array.from(linearLightRows(local, 3, 1, 0, 1, true, 32768)), [16384 - 2634, 16384, 16384 + 2570]);
});
