// Tone matching: the models often shift the colours of the whole picture they return (warmer, darker,
// a colour cast on black and white). Around the selection, in the ring the model was told to keep,
// the tile should equal the original; comparing them there gives a per-channel correction, applied
// in Photoshop as a Curves smart filter on the run's layer. Host-free, tested in Node.

const GRID = 128; // long side of the comparison grid: coarse enough to ignore grain and small shifts
const RING_GAP = 0.04; // keep at most this far (fraction of the grid) from the selection: the edit and its blend
const MIN_CELLS = 40; // fewer ring cells than this (e.g. Select All): nothing to compare, no correction
const GAIN = [0.5, 2]; // a ring that misleads must not wreck the picture; the residual checks below catch it first (a model returned planks 1.5 times too bright, 2026-11-12)
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

/**
 * The same line fitted on the two distributions instead of cell by cell: the 10th to 90th
 * percentiles of the tile against the original's. Blind to where things are, so a texture the
 * model redrew a little off (planks, bricks) still gives the right tones, where the cell-by-cell
 * fit flattens (seen 2026-11-12: gain stuck at its floor, then "not the same picture").
 * @returns {{gain, offset, residual}}  residual: the worst percentile left apart after the fit
 */
function quantileFit(xs, ys) {
  const qs = (v) => {
    const s = Float64Array.from(v).sort();
    return Array.from({ length: 17 }, (_, i) => s[Math.min(s.length - 1, Math.floor(((i + 2) / 20) * s.length))]);
  };
  const qx = qs(xs);
  const qy = qs(ys);
  const f = fitLine(qx, qy);
  return { ...f, residual: Math.max(...qx.map((x, i) => Math.abs(f.gain * x + f.offset - qy[i]))), qx, qy };
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
 * @param {number} [p.gap]      distance kept from the selection, in pixels of this size (the model's blend);
 * @param {object} [p.report]   filled with why: reason "ring" (too few cells to compare), "mismatch",
 *   "negligible" or "fitted", and the numbers behind it (for diagnosis)
 *   at most RING_GAP of the grid, so a thin margin around the selection still leaves a ring
 * @returns {null | {channels: Array<{gain, offset}>, curves: Array<Array<{input, output}>>, gray: Array<{input, output}>, cells: number}}
 *   channels and curves in R, G, B order; gray, the one curve for a greyscale document
 */
function fitTone({ orig, origComps = 3, tile, tileComps = 4, mask, width, height, gap: gapPx, report = {} }) {
  const k = GRID / Math.max(width, height);
  const gw = Math.max(1, Math.min(width, Math.round(width * k)));
  const gh = Math.max(1, Math.min(height, Math.round(height * k)));
  const o = blur(shrink(orig, width, height, origComps, gw, gh), gw, gh, origComps);
  const t = blur(shrink(tile, width, height, tileComps, gw, gh), gw, gh, tileComps);
  const m = shrink(mask, width, height, 1, gw, gh, true);

  // Ring: cells farther than the gap from any selected cell, where the tile is opaque.
  const most = Math.ceil(RING_GAP * Math.max(gw, gh));
  const gap = Math.max(1, gapPx > 0 ? Math.min(most, Math.ceil(gapPx * k)) : most);
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
  report.cells = ring.length;
  report.grid = [gw, gh];
  if (ring.length < MIN_CELLS) return (report.reason = "ring"), null;

  const channels = [0, 1, 2].map((c) => robustFit(ring.map((i) => t[i * tileComps + c]), ring.map((i) => o[i * origComps + c])));
  // Median residual of each channel after its fit: large when the ring is not the same picture.
  const residuals = channels.map((f, c) => {
    const res = ring.map((i) => Math.abs(f.gain * t[i * tileComps + c] + f.offset - o[i * origComps + c])).sort((a, b) => a - b);
    return res[Math.floor(res.length / 2)];
  });
  Object.assign(report, { channels, residuals, method: "cells" });
  if (residuals.some((r) => r > MISMATCH)) {
    // Not the same picture cell by cell: perhaps the same tones, redrawn a little off.
    const byTones = [0, 1, 2].map((c) => quantileFit(ring.map((i) => t[i * tileComps + c]), ring.map((i) => o[i * origComps + c])));
    report.quantileResiduals = byTones.map((f) => f.residual);
    report.quantileFits = byTones;
    if (byTones.some((f) => f.residual > MISMATCH)) return (report.reason = "mismatch"), null;
    channels.splice(0, 3, ...byTones.map(({ gain, offset }) => ({ gain, offset })));
    Object.assign(report, { channels, method: "tones" });
  }
  // Negligible: over the tones the ring actually has, no channel moves by NEGLIGIBLE levels or more.
  const moved = channels.some((f, c) => {
    const xs = ring.map((i) => t[i * tileComps + c]);
    return [Math.min(...xs), Math.max(...xs)].some((x) => Math.abs(f.gain * x + f.offset - x) >= NEGLIGIBLE);
  });
  if (!moved) return (report.reason = "negligible"), null;
  report.reason = "fitted";
  // A greyscale document has one channel: its curve is the mean of the three (they agree there).
  const mean = (k) => channels.reduce((s, f) => s + f[k], 0) / channels.length;
  return { channels, curves: channels.map(curvePoints), gray: curvePoints({ gain: mean("gain"), offset: mean("offset") }), cells: ring.length };
}

/**
 * Diagnosis (toneDiag): the tones on both sides of the selection's edge, on fitTone's grid. Per
 * channel, the mean of the tile just inside the selection and just outside it, and of the original
 * just outside, in a band of cells `from` to `to` cells from the edge (past the model's blend).
 * Tells a drift near the edge (tile outside far from the original) from a step in the model's own
 * picture at the edge (tile outside right, tile inside far from it), which a ring far from the
 * selection sees neither.
 */
function seamDiag({ orig, origComps = 3, tile, tileComps = 4, mask, width, height, from = 2, to = 4 }) {
  const k = GRID / Math.max(width, height);
  const gw = Math.max(1, Math.min(width, Math.round(width * k)));
  const gh = Math.max(1, Math.min(height, Math.round(height * k)));
  const o = blur(shrink(orig, width, height, origComps, gw, gh), gw, gh, origComps);
  const t = blur(shrink(tile, width, height, tileComps, gw, gh), gw, gh, tileComps);
  const m = shrink(mask, width, height, 1, gw, gh, true);
  // Chebyshev distance of each cell to the nearest cell on the other side of the edge.
  const dist = new Int32Array(gw * gh).fill(-1);
  const sel = (i) => m[i] > 127;
  let front = [];
  for (let i = 0; i < gw * gh; i++) {
    const x = i % gw, y = (i / gw) | 0;
    for (let dy = -1; dy <= 1 && dist[i] < 0; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < gw && yy < gh && sel(yy * gw + xx) !== sel(i)) {
          dist[i] = 1;
          break;
        }
      }
    if (dist[i] === 1) front.push(i);
  }
  for (let d = 2; front.length && d <= to; d++) {
    const next = [];
    for (const i of front) {
      const x = i % gw, y = (i / gw) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy, j = yy * gw + xx;
          if (xx >= 0 && yy >= 0 && xx < gw && yy < gh && dist[j] < 0 && sel(j) === sel(i)) (dist[j] = d), next.push(j);
        }
    }
    front = next;
  }
  const band = (inside) => {
    const cells = [];
    for (let i = 0; i < gw * gh; i++) if (sel(i) === inside && dist[i] >= from && dist[i] <= to && (tileComps < 4 || t[i * tileComps + 3] > 250)) cells.push(i);
    return cells;
  };
  const mean = (g, comps, cells) => [0, 1, 2].map((c) => (cells.length ? Math.round(cells.reduce((s, i) => s + g[i * comps + c], 0) / cells.length) : null));
  const inside = band(true);
  const outside = band(false).filter((i) => origComps < 4 || o[i * origComps + 3] > 250);
  return { grid: [gw, gh], cells: { inside: inside.length, outside: outside.length }, tileInside: mean(t, tileComps, inside), tileOutside: mean(t, tileComps, outside), origOutside: mean(o, origComps, outside) };
}

// ---------- Local correction ----------
// A model can also drift in one part of its picture only: a beach's sky came back 42 levels too bright
// along a filled band, the drift fading halfway down the tile and stronger on one side, the photo far
// away kept (2026-11-12). One curve cannot follow that. What is left after the curve is measured all
// around the selection, cell by cell, and carried smoothly into it (a membrane: each cell inside the
// average of its neighbours, the cells outside fixed at what was measured), so at every point of the
// edge the fill lands on the photo next to it. Photoshop applies it as a clipped layer in Linear Light.
const LOCAL_MAX = 80; // levels: a bigger difference next to the selection is not a drift (the model changed something there)
const LOCAL_NEGLIGIBLE = 3; // levels: below this everywhere in the selection, no layer
const MEMBRANE_PASSES = 600;
// Finer than the curve's grid: the drift is measured right next to the selection (on the beach, a
// 128-cell grid left a 5-7 level step at the edge, a 256-cell one 0-4: the sky's own variation).
const LOCAL_GRID = 256;

/** Chessboard distance of each grid cell to the nearest selected cell (0 inside); -1 when none is selected. */
function distances(m, gw, gh) {
  const d = new Int32Array(gw * gh).fill(-1);
  let front = [];
  for (let i = 0; i < gw * gh; i++) if (m[i] > 0) (d[i] = 0), front.push(i);
  for (let n = 1; front.length; n++) {
    const next = [];
    for (const i of front) {
      const x = i % gw;
      const y = (i - x) / gw;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          const j = yy * gw + xx;
          if (xx >= 0 && yy >= 0 && xx < gw && yy < gh && d[j] < 0) (d[j] = n), next.push(j);
        }
      }
    }
    front = next;
  }
  return d;
}

/**
 * The local correction left after the curve, or null when there is nothing to measure next to the
 * selection, what is next to it is not the same picture, or the correction would be negligible.
 * @param {object} p   as fitTone (`gap`: the model's blend, in pixels of this size), plus:
 * @param {Uint8Array} [p.solid]  the original's opacity, 1 byte per pixel, same size: empty areas (an
 *   extended canvas) are not measured
 * @param {{channels: Array<{gain, offset}>}|null} [p.fit]  the curve already applied (fitTone's result)
 * @returns {null | {width, height, field: Float32Array}}  a grid over the whole area sent, 3 offsets per
 *   cell (R, G, B, in levels) to add to the tile after the curve
 */
function localTone({ orig, origComps = 3, tile, tileComps = 4, mask, width, height, gap: gapPx, solid = null, fit = null, report = {} }) {
  const k = LOCAL_GRID / Math.max(width, height);
  const gw = Math.max(1, Math.min(width, Math.round(width * k)));
  const gh = Math.max(1, Math.min(height, Math.round(height * k)));
  const o = blur(shrink(orig, width, height, origComps, gw, gh), gw, gh, origComps);
  const t = blur(shrink(tile, width, height, tileComps, gw, gh), gw, gh, tileComps);
  const m = shrink(mask, width, height, 1, gw, gh, true);
  const s = solid ? shrink(solid, width, height, 1, gw, gh) : null;
  const gap = Math.max(1, Math.ceil((gapPx > 0 ? gapPx : RING_GAP * Math.max(width, height)) * k));
  const dist = distances(m, gw, gh);
  const n = gw * gh;
  const curve = (f, v) => (f ? Math.max(0, Math.min(255, f.gain * v + f.offset)) : v);
  // Measured cells: outside the selection, past the model's blend, where both pictures have pixels.
  const known = new Uint8Array(n);
  const d = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (!(dist[i] > gap) || (s && s[i] < 250) || (tileComps === 4 && t[i * 4 + 3] <= 250)) continue;
    known[i] = 1;
    for (let c = 0; c < 3; c++) d[i * 3 + c] = o[i * origComps + c] - curve(fit && fit.channels[c], t[i * tileComps + c]);
  }
  // Each measured cell takes the median of the measured cells around it (5 x 5): a small thing the
  // model changed next to the selection does not tint the fill.
  const med = new Float32Array(n * 3);
  const vals = [];
  for (let i = 0; i < n; i++) {
    if (!known[i]) continue;
    const x = i % gw;
    const y = (i - x) / gw;
    for (let c = 0; c < 3; c++) {
      vals.length = 0;
      for (let yy = Math.max(0, y - 2); yy <= Math.min(gh - 1, y + 2); yy++) {
        for (let xx = Math.max(0, x - 2); xx <= Math.min(gw - 1, x + 2); xx++) if (known[yy * gw + xx]) vals.push(d[(yy * gw + xx) * 3 + c]);
      }
      vals.sort((a, b) => a - b);
      med[i * 3 + c] = vals[vals.length >> 1];
    }
  }
  // The cells that matter: measured ones next to the selection (a few cells past the gap).
  const edge = [];
  for (let i = 0; i < n; i++) if (known[i] && dist[i] <= gap + 3) edge.push(i);
  report.local = { cells: edge.length };
  if (!edge.length) return (report.local.reason = "ring"), null;
  const typical = edge.map((i) => Math.max(Math.abs(med[i * 3]), Math.abs(med[i * 3 + 1]), Math.abs(med[i * 3 + 2]))).sort((a, b) => a - b)[edge.length >> 1];
  report.local.typical = Math.round(typical);
  if (typical > LOCAL_MAX) return (report.local.reason = "mismatch"), null;
  // Membrane: the other cells settle to the average of their neighbours (over-relaxed Gauss-Seidel),
  // starting from the mean of what was measured next to the selection.
  const field = new Float32Array(n * 3);
  const start = [0, 1, 2].map((c) => edge.reduce((a, i) => a + med[i * 3 + c], 0) / edge.length);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) field[i * 3 + c] = known[i] ? Math.max(-LOCAL_MAX, Math.min(LOCAL_MAX, med[i * 3 + c])) : start[c];
  for (let pass = 0; pass < MEMBRANE_PASSES; pass++) {
    for (let i = 0; i < n; i++) {
      if (known[i]) continue;
      const x = i % gw;
      const y = (i - x) / gw;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let cnt = 0;
        if (x > 0) (sum += field[(i - 1) * 3 + c]), cnt++;
        if (x < gw - 1) (sum += field[(i + 1) * 3 + c]), cnt++;
        if (y > 0) (sum += field[(i - gw) * 3 + c]), cnt++;
        if (y < gh - 1) (sum += field[(i + gw) * 3 + c]), cnt++;
        const v = field[i * 3 + c];
        field[i * 3 + c] = v + 1.9 * (sum / cnt - v);
      }
    }
  }
  let biggest = 0;
  for (let i = 0; i < n; i++) if (m[i] > 0) for (let c = 0; c < 3; c++) biggest = Math.max(biggest, Math.abs(field[i * 3 + c]));
  report.local.biggest = Math.round(biggest);
  if (biggest < LOCAL_NEGLIGIBLE) return (report.local.reason = "negligible"), null;
  report.local.reason = "fitted";
  return { width: gw, height: gh, field };
}

/**
 * Rows y0..y1 of the correction layer for an area of w x h pixels: the grid's offsets interpolated
 * (bilinear, between cell centres), as Linear Light values. In 8 bits, v >= 128 lightens by
 * 2 x (v - 128) and v < 128 darkens by 255 - 2 x v, so 128 changes nothing. `gray`: one channel, the
 * mean of the three. `max` 32768 for a 16-bit document (Photoshop's 16-bit range): 0.5 + f / 510 of it.
 */
function linearLightRows(local, w, h, y0, y1, gray = false, max = 255) {
  const { width: gw, height: gh, field } = local;
  const comps = gray ? 1 : 3;
  const out = max === 255 ? new Uint8Array(w * (y1 - y0) * comps) : new Uint16Array(w * (y1 - y0) * comps);
  const enc = max === 255 ? (f) => (f >= 0 ? Math.min(255, 128 + Math.round(f / 2)) : Math.max(0, Math.round((f + 255) / 2))) : (f) => Math.max(0, Math.min(max, Math.round(max / 2 + (f * max) / 510)));
  const xs = new Float32Array(w);
  for (let x = 0; x < w; x++) xs[x] = Math.max(0, Math.min(gw - 1, ((x + 0.5) * gw) / w - 0.5));
  const v = [0, 0, 0];
  for (let y = y0; y < y1; y++) {
    const fy = Math.max(0, Math.min(gh - 1, ((y + 0.5) * gh) / h - 0.5));
    const ya = Math.floor(fy);
    const yb = Math.min(gh - 1, ya + 1);
    const ty = fy - ya;
    for (let x = 0; x < w; x++) {
      const xa = Math.floor(xs[x]);
      const xb = Math.min(gw - 1, xa + 1);
      const tx = xs[x] - xa;
      for (let c = 0; c < 3; c++) {
        const a = field[(ya * gw + xa) * 3 + c] * (1 - tx) + field[(ya * gw + xb) * 3 + c] * tx;
        const b = field[(yb * gw + xa) * 3 + c] * (1 - tx) + field[(yb * gw + xb) * 3 + c] * tx;
        v[c] = a * (1 - ty) + b * ty;
      }
      const o = ((y - y0) * w + x) * comps;
      if (gray) out[o] = enc((v[0] + v[1] + v[2]) / 3);
      else for (let c = 0; c < 3; c++) out[o + c] = enc(v[c]);
    }
  }
  return out;
}

module.exports = { fitTone, curvePoints, seamDiag, localTone, linearLightRows };
