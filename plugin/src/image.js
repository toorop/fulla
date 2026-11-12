// Pixel-buffer helpers (interleaved 8-bit). Pure JS, shared by UXP and tests.

/** Bilinear resample of an interleaved buffer to an exact size (handles non-uniform scale). */
function resample(src, sw, sh, comps, dw, dh) {
  if (sw === dw && sh === dh) return src;
  const out = new Uint8Array(dw * dh * comps);
  const sx = sw / dw;
  const sy = sh / dh;
  for (let y = 0; y < dh; y++) {
    const fy = Math.max(0, Math.min(sh - 1, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(sh - 1, y0 + 1);
    const wy = fy - y0;
    for (let x = 0; x < dw; x++) {
      const fx = Math.max(0, Math.min(sw - 1, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(sw - 1, x0 + 1);
      const wx = fx - x0;
      const o = (y * dw + x) * comps;
      const a = (y0 * sw + x0) * comps;
      const b = (y0 * sw + x1) * comps;
      const c = (y1 * sw + x0) * comps;
      const d = (y1 * sw + x1) * comps;
      for (let k = 0; k < comps; k++) {
        const top = src[a + k] + (src[b + k] - src[a + k]) * wx;
        const bot = src[c + k] + (src[d + k] - src[c + k]) * wx;
        out[o + k] = Math.round(top + (bot - top) * wy);
      }
    }
  }
  return out;
}

/** Drop alpha by compositing over a flat colour (default mid-grey, neutral for the models). */
function toRGB(src, w, h, comps, bg = 128) {
  if (comps === 3) return src;
  const out = new Uint8Array(w * h * 3);
  if (comps === 1) {
    for (let i = 0; i < w * h; i++) out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = src[i];
    return out;
  }
  if (comps !== 4) throw new Error(`Unsupported component count: ${comps}`);
  for (let i = 0; i < w * h; i++) {
    const a = src[i * 4 + 3] / 255;
    for (let k = 0; k < 3; k++) out[i * 3 + k] = Math.round(src[i * 4 + k] * a + bg * (1 - a));
  }
  return out;
}

/**
 * Soft edge for the layer mask (instead of Photoshop's mask feather, which also fades the canvas
 * edge: in an extended canvas nothing is under it, so a see-through strip showed, 2026-11-12).
 * Three box blurs of about radius/2 px each. Beyond a side listed in `edges` (it lies on the canvas
 * edge) the mask goes on as it is at that side, so a selection that reaches the canvas edge stays
 * fully selected there; beyond the other sides it is unselected. Where `cover` is set (selected, and
 * nothing in the document under it: emptyUnder) the mask stays fully selected too.
 * @param {Uint8Array} mask  1 byte per pixel
 * @param {{left?: boolean, top?: boolean, right?: boolean, bottom?: boolean}} [edges]
 * @param {Uint8Array|null} [cover]  1 byte per pixel, same size as mask
 */
function featherMask(mask, w, h, radius, edges = {}, cover = null) {
  const r = Math.max(1, Math.round(radius / 2));
  let a = Float32Array.from(mask);
  let b = new Float32Array(w * h);
  // One box pass along a line of n values read with get(i) and written with set(i, v).
  const pass = (n, get, set, keepStart, keepEnd) => {
    const at = (i) => (i < 0 ? (keepStart ? get(0) : 0) : i >= n ? (keepEnd ? get(n - 1) : 0) : get(i));
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += at(i);
    for (let i = 0; i < n; i++) {
      set(i, sum / (2 * r + 1));
      sum += at(i + r + 1) - at(i - r);
    }
  };
  for (let k = 0; k < 3; k++) {
    for (let y = 0; y < h; y++) pass(w, (x) => a[y * w + x], (x, v) => (b[y * w + x] = v), edges.left, edges.right);
    for (let x = 0; x < w; x++) pass(h, (y) => b[y * w + x], (y, v) => (a[y * w + x] = v), edges.top, edges.bottom);
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = cover && cover[i] ? 255 : Math.round(a[i]);
  return out;
}

/**
 * The selected pixels with nothing under them in the document (an extended canvas): the result must
 * cover them fully, or the mask's soft edge leaves them see-through (a light line along the photo's
 * edge when the empty area itself is selected, 2026-11-12). `rgba` is the composite read over the same
 * area, maybe smaller; a pixel counts as empty below half opacity. Its empty area is grown by one of its
 * pixels, so a scaled read never leaves an empty full-resolution pixel out. Null when there is none.
 * @param {Uint8Array} sel  full-resolution selection, W x H, 1 byte per pixel
 * @param {Uint8Array} rgba composite, aw x ah, `comps` bytes per pixel
 */
function emptyUnder(sel, W, H, rgba, aw, ah, comps) {
  if (comps !== 4) return null;
  let empty = new Uint8Array(aw * ah);
  let any = false;
  for (let i = 0; i < empty.length; i++) if (rgba[i * 4 + 3] < 128) (empty[i] = 255), (any = true);
  if (!any) return null;
  empty = dilate(empty, aw, ah, 1);
  const cover = new Uint8Array(W * H);
  any = false;
  for (let y = 0; y < H; y++) {
    const row = Math.min(ah - 1, Math.floor((y * ah) / H)) * aw;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (sel[i] && empty[row + Math.min(aw - 1, Math.floor((x * aw) / W))]) (cover[i] = 255), (any = true);
    }
  }
  return any ? cover : null;
}

/** Grow the selected (non-zero) area by r pixels: separable max filter. Gives the model room to blend. */
function dilate(mask, w, h, r) {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 0;
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      for (let i = x0; i <= x1 && m < 255; i++) if (mask[y * w + i] > m) m = mask[y * w + i];
      tmp[y * w + x] = m;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let m = 0;
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(h - 1, y + r);
      for (let i = y0; i <= y1 && m < 255; i++) if (tmp[i * w + x] > m) m = tmp[i * w + x];
      out[y * w + x] = m;
    }
  }
  return out;
}

/** Hard black/white mask: any partially selected pixel counts as selected. */
function binarize(mask) {
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = mask[i] > 0 ? 255 : 0;
  return out;
}

/** OpenAI-style edit mask: RGBA, alpha 0 where the model may paint, 255 where it must keep. */
function alphaEditMask(mask) {
  const out = new Uint8Array(mask.length * 4);
  for (let i = 0; i < mask.length; i++) {
    out[i * 4 + 3] = mask[i] > 0 ? 0 : 255;
  }
  return out;
}

/** Fraction of pixels selected (0..1). */
function coverage(mask) {
  let n = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i] > 0) n++;
  return mask.length ? n / mask.length : 0;
}

/** Bounds of non-zero mask pixels, or null if empty. */
function maskBounds(mask, w, h) {
  let left = w, top = h, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] > 0) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return right < 0 ? null : { left, top, right: right + 1, bottom: bottom + 1 };
}

/** Convert Photoshop pixel data of any depth to 8-bit. 16-bit is 0..32768 (Photoshop's range), 32-bit is float 0..1. */
function to8bit(data) {
  if (data instanceof Uint8Array) return data;
  const out = new Uint8Array(data.length);
  if (data instanceof Uint16Array) {
    for (let i = 0; i < data.length; i++) out[i] = Math.min(255, Math.round((data[i] * 255) / 32768));
  } else {
    for (let i = 0; i < data.length; i++) out[i] = Math.round(Math.max(0, Math.min(1, data[i])) * 255);
  }
  return out;
}

/**
 * Map a buffer that covers document rect `src` onto an output of size tw x th that covers document rect `dst`.
 * Areas of dst not covered by src are transparent (RGB gets an alpha channel) or 0 (masks).
 * Nearest-neighbour: used where scales already match closely (trimmed reads).
 */
function placeInto(data, sw, sh, comps, src, dst, tw, th) {
  const outComps = comps === 1 ? 1 : 4;
  const out = new Uint8Array(tw * th * outComps);
  const sx = (src.right - src.left) / sw;
  const sy = (src.bottom - src.top) / sh;
  const dx = (dst.right - dst.left) / tw;
  const dy = (dst.bottom - dst.top) / th;
  for (let y = 0; y < th; y++) {
    const docY = dst.top + (y + 0.5) * dy;
    const iy = Math.floor((docY - src.top) / sy);
    if (iy < 0 || iy >= sh) continue;
    for (let x = 0; x < tw; x++) {
      const docX = dst.left + (x + 0.5) * dx;
      const ix = Math.floor((docX - src.left) / sx);
      if (ix < 0 || ix >= sw) continue;
      const si = (iy * sw + ix) * comps;
      const oi = (y * tw + x) * outComps;
      if (outComps === 1) out[oi] = data[si];
      else {
        out[oi] = data[si];
        out[oi + 1] = data[si + 1];
        out[oi + 2] = data[si + 2];
        out[oi + 3] = comps === 4 ? data[si + 3] : 255;
      }
    }
  }
  return { data: out, width: tw, height: th, components: outComps };
}

/**
 * Area-average downscale of a W x H image that is read in horizontal strips, so the full-resolution
 * image never has to sit in memory. readStrip(y0, y1) must return rows y0..y1-1, full width, `comps` bytes per pixel.
 * Output pixel (ox, oy) averages exactly the source block it covers, so positions stay exact.
 */
async function downsampleStrips(readStrip, W, H, comps, outW, outH, bandRows = 32) {
  if (outW > W || outH > H) throw new Error("downsampleStrips only shrinks");
  const out = new Uint8Array(outW * outH * comps);
  const x0s = new Int32Array(outW);
  const x1s = new Int32Array(outW);
  for (let ox = 0; ox < outW; ox++) {
    x0s[ox] = Math.floor((ox * W) / outW);
    x1s[ox] = Math.max(x0s[ox] + 1, Math.floor(((ox + 1) * W) / outW));
  }
  for (let oy0 = 0; oy0 < outH; oy0 += bandRows) {
    const oy1 = Math.min(outH, oy0 + bandRows);
    const sy0 = Math.floor((oy0 * H) / outH);
    const sy1 = Math.min(H, Math.max(sy0 + 1, Math.floor((oy1 * H) / outH)));
    const strip = await readStrip(sy0, sy1);
    const acc = new Float64Array(comps);
    for (let oy = oy0; oy < oy1; oy++) {
      const ya = Math.floor((oy * H) / outH);
      const yb = Math.min(sy1, Math.max(ya + 1, Math.floor(((oy + 1) * H) / outH)));
      for (let ox = 0; ox < outW; ox++) {
        acc.fill(0);
        const xa = x0s[ox];
        const xb = x1s[ox];
        for (let y = ya; y < yb; y++) {
          let i = ((y - sy0) * W + xa) * comps;
          for (let x = xa; x < xb; x++) {
            for (let k = 0; k < comps; k++) acc[k] += strip[i + k];
            i += comps;
          }
        }
        const n = (yb - ya) * (xb - xa);
        const o = (oy * outW + ox) * comps;
        for (let k = 0; k < comps; k++) out[o + k] = Math.round(acc[k] / n);
      }
    }
  }
  return out;
}

/** Add an opaque alpha channel to RGB (or pass RGBA through). */
function toRGBA(data, w, h, comps) {
  if (comps === 4) return data;
  const out = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = data[i * comps];
    out[i * 4 + 1] = data[i * comps + (comps === 1 ? 0 : 1)];
    out[i * 4 + 2] = data[i * comps + (comps === 1 ? 0 : 2)];
    out[i * 4 + 3] = 255;
  }
  return out;
}

module.exports = { resample, toRGB, toRGBA, featherMask, emptyUnder, dilate, binarize, alphaEditMask, coverage, maskBounds, to8bit, placeInto, downsampleStrips };
