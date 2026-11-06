// Draw the plugin icons with the plugin's own PNG encoder: a dashed selection marquee filling up
// from the bottom like a glass, with a sparkle. Redrawn as shapes from docs/brand/logo.png so the
// glyph stays sharp at 23 px. Run: node scripts/icons.js

const fs = require("node:fs");
const path = require("node:path");
const { encodePng } = require("../plugin/src/png");

const OUT = path.join(__dirname, "..", "plugin", "icons");

// Design grid 24 x 24.
const BOX = { lo: 3, hi: 21, r: 2.5 }; // marquee centre line, corner radius
const STROKE = 1.6;
const DASHES_PER_SIDE = 3; // dash periods from one corner to the next; a dash sits on every corner
const DASH_ON = 0.62; // share of each period that is drawn
const FILL = { left: 5.2, right: 18.8, bottom: 18.8, r: 1 }; // liquid, inside the marquee
const SPARKLE = { x: 8.8, y: 8.1, r: 3.0, k: 0.6 }; // 4-pointed star, k < 1 makes the sides concave

const side = BOX.hi - BOX.lo;
const straight = side - 2 * BOX.r;
const segment = straight + (Math.PI * BOX.r) / 2; // corner middle to next corner middle
const period = segment / DASHES_PER_SIDE;
const halfDash = (period * DASH_ON) / 2;

/** Nearest point on the marquee's centre line: distance to it and position along it. */
function onMarquee(x, y) {
  const c = (BOX.lo + BOX.hi) / 2;
  const h = side / 2 - BOX.r; // half length of the straight parts
  const dx = x - c;
  const dy = y - c;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  let dist;
  let along; // within the quarter, measured from the middle of the corner (0) towards the side
  if (ax > h && ay > h) {
    const ang = Math.atan2(ay - h, ax - h); // 0 = towards the vertical side, pi/2 = horizontal side
    dist = Math.abs(Math.hypot(ax - h, ay - h) - BOX.r);
    along = (ang - Math.PI / 4) * BOX.r; // signed arc length from the corner middle
  } else if (ax > ay) {
    dist = Math.abs(ax - (h + BOX.r));
    along = -((Math.PI * BOX.r) / 4 + (h - ay)); // on the vertical side, towards its middle
  } else {
    dist = Math.abs(ay - (h + BOX.r));
    along = (Math.PI * BOX.r) / 4 + (h - ax);
  }
  return { dist, along };
}

function inMarquee(x, y) {
  const { dist, along } = onMarquee(x, y);
  if (dist > STROKE / 2) return false;
  // Distance to the nearest dash centre (dashes sit on corner middles, every `period`).
  const t = ((along % period) + period) % period;
  const off = Math.min(t, period - t);
  // Round caps: a capsule of the dash length.
  const ds = Math.max(0, off - (halfDash - STROKE / 2));
  return ds * ds + dist * dist <= (STROKE / 2) ** 2;
}

function waveTop(x) {
  const u = (x - FILL.left) / (FILL.right - FILL.left);
  return 11.7 + 1.1 * Math.cos(2 * Math.PI * (u - 0.25));
}

function inFill(x, y) {
  if (x < FILL.left || x > FILL.right || y > FILL.bottom || y < waveTop(x)) return false;
  // Rounded bottom corners.
  const r = FILL.r;
  const cx = x < FILL.left + r ? FILL.left + r : x > FILL.right - r ? FILL.right - r : x;
  if (y > FILL.bottom - r && cx !== x) return (x - cx) ** 2 + (y - (FILL.bottom - r)) ** 2 <= r * r;
  return true;
}

function inSparkle(x, y) {
  const ax = Math.abs(x - SPARKLE.x) / SPARKLE.r;
  const ay = Math.abs(y - SPARKLE.y) / SPARKLE.r;
  return ax ** SPARKLE.k + ay ** SPARKLE.k <= 1;
}

const inGlyph = (x, y) => inMarquee(x, y) || inFill(x, y) || inSparkle(x, y);

/**
 * @param {number} size  pixels
 * @param {number[]} rgb glyph colour
 * @param {number[]} [tile] background colour of a rounded tile behind the glyph (plugin list icon)
 */
function draw(size, rgb, tile) {
  const px = new Uint8Array(size * size * 4);
  const s = size / 24;
  const SS = 8; // supersampling
  const inTile = (gx, gy) => {
    const r = 5;
    const qx = Math.max(Math.abs(gx - 12) - (12 - r), 0);
    const qy = Math.max(Math.abs(gy - 12) - (12 - r), 0);
    return qx * qx + qy * qy <= r * r;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let glyph = 0;
      let back = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          let gx = (x + (sx + 0.5) / SS) / s;
          let gy = (y + (sy + 0.5) / SS) / s;
          if (tile && inTile(gx, gy)) back++;
          if (tile) {
            // Shrink the glyph a little inside the tile.
            gx = 12 + (gx - 12) / 0.8;
            gy = 12 + (gy - 12) / 0.8;
          }
          if (inGlyph(gx, gy) && (!tile || inTile((gx - 12) * 0.8 + 12, (gy - 12) * 0.8 + 12))) glyph++;
        }
      }
      const n = SS * SS;
      const g = glyph / n;
      const b = tile ? back / n : 0;
      const a = g + b * (1 - g);
      const o = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) px[o + k] = a ? Math.round((rgb[k] * g + (tile ? tile[k] : 0) * b * (1 - g)) / a) : 0;
      px[o + 3] = Math.round(a * 255);
    }
  }
  return encodePng(px, size, size, 4);
}

if (require.main === module) {
  fs.mkdirSync(OUT, { recursive: true });
  const variants = [
    ["dark", [235, 235, 235]], // light glyph for dark UI themes
    ["light", [50, 50, 50]], // dark glyph for light UI themes
  ];
  for (const [name, rgb] of variants) {
    fs.writeFileSync(path.join(OUT, `icon-${name}@1x.png`), draw(23, rgb));
    fs.writeFileSync(path.join(OUT, `icon-${name}@2x.png`), draw(46, rgb));
  }
  // Plugin list: white glyph on the logo's dark tile, readable on any theme.
  fs.writeFileSync(path.join(OUT, "plugin@1x.png"), draw(48, [255, 255, 255], [30, 30, 30]));
  fs.writeFileSync(path.join(OUT, "plugin@2x.png"), draw(96, [255, 255, 255], [30, 30, 30]));
  console.log("icons written to plugin/icons");
}

module.exports = { draw };
