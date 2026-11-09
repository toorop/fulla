const test = require("node:test");
const assert = require("node:assert/strict");
const { fitTone, curvePoints } = require("../plugin/src/tone");

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

test("tone: no filter when the shift is negligible, there is no ring to compare, or the ring is another picture; never a wild correction", () => {
  const orig = photo();
  const other = tileFrom(orig, (v, k) => [255, 0, 128][k]);
  assert.equal(fitTone({ orig, tile: other, mask: selMask(), width: W, height: H }), null, "a tile that is not the same picture around the selection gets no correction");
  assert.equal(fitTone({ orig, tile: tileFrom(orig, (v) => v + 1), mask: selMask(), width: W, height: H }), null, "1 level is not worth a filter");
  assert.equal(fitTone({ orig, tile: tileFrom(orig, (v) => v + 20), mask: new Uint8Array(W * H).fill(255), width: W, height: H }), null, "Select All leaves no ring");
  assert.equal(fitTone({ orig, tile: tileFrom(orig, (v) => v * 0.5), mask: selMask(), width: W, height: H }), null, "beyond the gain bounds: none rather than a wrong one");
  // Points stay inside 0..255 and in order, whatever the line.
  for (const p of [curvePoints({ gain: 1.25, offset: -40 }), curvePoints({ gain: 0.8, offset: 60 })]) {
    assert.ok(p.every((q) => q.input >= 0 && q.input <= 255 && q.output >= 0 && q.output <= 255) && p[1].input > p[0].input, JSON.stringify(p));
  }
});
