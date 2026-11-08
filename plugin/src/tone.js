// Tone matching: the models often shift the colours of the whole picture they return (warmer, darker,
// a colour cast on black and white). Around the selection, in the ring the model was told to keep,
// the tile should equal the original; comparing them there gives a per-channel correction, applied
// in Photoshop as a Curves smart filter on the run's layer. Host-free, tested in Node.

const GRID = 128; // long side of the comparison grid: coarse enough to ignore grain and small shifts
const RING_GAP = 0.04; // keep this far (fraction of the grid) from the selection: the edit and its blend
const MIN_CELLS = 40; // fewer ring cells than this (e.g. Select All): nothing to compare, no correction
const GAIN = [0.8, 1.25]; // a ring that misleads must not wreck the picture
const MAX_OFFSET = 60;
const NEGLIGIBLE = 3; // levels out of 255: below this everywhere, no filter (it would only distract)
const MISMATCH = 10; // levels: if the corrected ring still differs this much (median), the tile is not
// the same picture there (cropped, shifted, redrawn): a correction would only make things worse

/** Area average of an interleaved image onto a gw x gh grid; the mask cells keep their maximum. */
function shrink(src, w, h, comps, gw, gh, useMax = false) {
  const out = new Float64Array(gw * gh * comps);
  for (let gy = 0; gy < gh; gy++) {
    const y0 = Math.floor((gy * h) / gh);
    const y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * h) / gh));
    for (let gx = 0; gx < gw; gx++) {
      const x0 = Math.floor((gx * w) / gw);
      const x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * w) / gw));
      const o = (gy * gw + gx) * comps;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * comps;
          for (let k = 0; k < comps; k++) out[o + k] = useMax ? Math.max(out[o + k], src[i + k]) : out[o + k] + src[i + k];
        }
      }
      if (!useMax) for (let k = 0; k < comps; k++) out[o + k] /= (y1 - y0) * (x1 - x0);
    }
  }
  return out;
}

/** 3 x 3 box blur on a grid (edges use what exists). */
function blur(g, gw, gh, comps) {
  const out = new Float64Array(g.length);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let n = 0;
      const acc = new Float64Array(comps);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
          const i = (yy * gw + xx) * comps;
          for (let k = 0; k < comps; k++) acc[k] += g[i + k];
          n++;
        }
      }
      const o = (y * gw + x) * comps;
      for (let k = 0; k < comps; k++) out[o + k] = acc[k] / n;
    }
  }
  return out;
}

/** Least squares y = gain * x + offset, gain bounded; flat data only shifts. */
function fitLine(xs, ys) {
  const n = xs.length;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += xs[i];
    my += ys[i];
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  const gain = sxx / n < 16 ? 1 : Math.min(GAIN[1], Math.max(GAIN[0], sxy / sxx));
  const offset = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, my - gain * mx));
  return { gain, offset };
}

/** Fit, drop the 20 % worst-matching cells (something the model did change), fit again. */
function robustFit(xs, ys) {
  const first = fitLine(xs, ys);
  const res = xs.map((x, i) => Math.abs(first.gain * x + first.offset - ys[i]));
  const cut = res.slice().sort((a, b) => a - b)[Math.floor(res.length * 0.8)];
  const keep = res.map((r) => r <= cut);
  return fitLine(xs.filter((_, i) => keep[i]), ys.filter((_, i) => keep[i]));
}

/** Two Curves points for y = gain * x + offset, clipped to 0..255 (Curves is flat beyond its end points). */
function curvePoints({ gain, offset }) {
  let x0 = 0;
  let y0 = offset;
  if (y0 < 0) [x0, y0] = [-offset / gain, 0];
  let x1 = 255;
  let y1 = gain * 255 + offset;
  if (y1 > 255) [x1, y1] = [(255 - offset) / gain, 255];
  const r = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return [
    { input: r(x0), output: r(y0) },
    { input: Math.max(r(x0) + 1, r(x1)), output: r(y1) },
  ];
}

/**
 * The correction that brings the tile's ring back to the original's, or null when there is no ring to
 * compare, the ring is not the same picture even after correction, or the correction would be negligible.
 * @param {object} p
 * @param {Uint8Array} p.orig   original pixels of the area sent (interleaved, origComps per pixel)
 * @param {Uint8Array} p.tile   the placed result over the same area, same size (tileComps per pixel)
 * @param {Uint8Array} p.mask   selection, 1 byte per pixel, same size
 * @returns {null | {channels: Array<{gain, offset}>, curves: Array<Array<{input, output}>>, cells: number}}
 *   channels and curves in R, G, B order
 */
function fitTone({ orig, origComps = 3, tile, tileComps = 4, mask, width, height }) {
  const k = GRID / Math.max(width, height);
  const gw = Math.max(1, Math.min(width, Math.round(width * k)));
  const gh = Math.max(1, Math.min(height, Math.round(height * k)));
  const o = blur(shrink(orig, width, height, origComps, gw, gh), gw, gh, origComps);
  const t = blur(shrink(tile, width, height, tileComps, gw, gh), gw, gh, tileComps);
  const m = shrink(mask, width, height, 1, gw, gh, true);

  // Ring: cells farther than the gap from any selected cell, where the tile is opaque.
  const gap = Math.max(1, Math.ceil(RING_GAP * Math.max(gw, gh)));
  const ring = [];
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let near = false;
      for (let dy = -gap; dy <= gap && !near; dy++) {
        for (let dx = -gap; dx <= gap; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < gw && yy < gh && m[yy * gw + xx] > 0) {
            near = true;
            break;
          }
        }
      }
      const i = y * gw + x;
      if (!near && (tileComps < 4 || t[i * tileComps + 3] > 250)) ring.push(i);
    }
  }
  if (ring.length < MIN_CELLS) return null;

  const channels = [0, 1, 2].map((c) => robustFit(ring.map((i) => t[i * tileComps + c]), ring.map((i) => o[i * origComps + c])));
  const mismatch = channels.some((f, c) => {
    const res = ring.map((i) => Math.abs(f.gain * t[i * tileComps + c] + f.offset - o[i * origComps + c])).sort((a, b) => a - b);
    return res[Math.floor(res.length / 2)] > MISMATCH;
  });
  if (mismatch) return null;
  // Negligible: over the tones the ring actually has, no channel moves by NEGLIGIBLE levels or more.
  const moved = channels.some((f, c) => {
    const xs = ring.map((i) => t[i * tileComps + c]);
    return [Math.min(...xs), Math.max(...xs)].some((x) => Math.abs(f.gain * x + f.offset - x) >= NEGLIGIBLE);
  });
  if (!moved) return null;
  return { channels, curves: channels.map(curvePoints), cells: ring.length };
}

module.exports = { fitTone, curvePoints };
