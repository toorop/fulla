// A minimal sRGB ICC profile (v2, matrix/TRC), built in code so no binary file ships with the plugin.
// Embedded in result PNGs so Photoshop knows their pixels are sRGB.

const { concat } = require("./bytes");

const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const u16 = (v) => Uint8Array.of((v >>> 8) & 255, v & 255);
const u32 = (v) => Uint8Array.of((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
const s15 = (v) => u32(Math.round(v * 65536) | 0);
const pad4 = (b) => (b.length % 4 ? concat([b, new Uint8Array(4 - (b.length % 4))]) : b);

const xyz = (x, y, z) => concat([ascii("XYZ "), new Uint8Array(4), s15(x), s15(y), s15(z)]);
const NAME = "sRGB IEC61966-2.1";

function desc(s) {
  // textDescriptionType: ASCII part, then empty Unicode and ScriptCode parts.
  return concat([ascii("desc"), new Uint8Array(4), u32(s.length + 1), ascii(s), Uint8Array.of(0), u32(0), u32(0), u16(0), Uint8Array.of(0), new Uint8Array(67)]);
}

function curve(n = 1024) {
  const parts = [ascii("curv"), new Uint8Array(4), u32(n)];
  for (let i = 0; i < n; i++) {
    const v = i / (n - 1);
    const lin = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    parts.push(u16(Math.round(lin * 65535)));
  }
  return concat(parts);
}

let cached = null;

/** sRGB IEC61966-2.1 as ICC v2 bytes (primaries adapted to D50, as in the standard profile). */
function srgbProfile() {
  if (cached) return cached;
  const trc = pad4(curve());
  const tags = [
    ["desc", pad4(desc(NAME))],
    ["cprt", pad4(concat([ascii("text"), new Uint8Array(4), ascii("No copyright, use freely"), Uint8Array.of(0)]))],
    ["wtpt", xyz(0.9642, 1.0, 0.8249)],
    ["rXYZ", xyz(0.4361, 0.2225, 0.0139)],
    ["gXYZ", xyz(0.3851, 0.7169, 0.0971)],
    ["bXYZ", xyz(0.1431, 0.0606, 0.7141)],
    ["rTRC", trc],
    ["gTRC", trc], // the three curves share one copy of the data
    ["bTRC", trc],
  ];
  const tableSize = 4 + tags.length * 12;
  let offset = 128 + tableSize;
  const table = [u32(tags.length)];
  const data = [];
  const placed = new Map();
  for (const [sig, body] of tags) {
    if (!placed.has(body)) {
      placed.set(body, offset);
      data.push(body);
      offset += body.length;
    }
    table.push(ascii(sig), u32(placed.get(body)), u32(body.length));
  }
  const size = offset;
  const header = concat([
    u32(size),
    new Uint8Array(4), // preferred CMM
    u32(0x02100000), // version 2.1
    ascii("mntr"),
    ascii("RGB "),
    ascii("XYZ "),
    u16(2026), u16(1), u16(1), u16(0), u16(0), u16(0), // creation date
    ascii("acsp"),
    new Uint8Array(4 + 4 + 4 + 4 + 8), // platform, flags, manufacturer, model, attributes
    u32(0), // perceptual intent
    s15(0.9642), s15(1.0), s15(0.8249), // PCS illuminant D50
    new Uint8Array(4 + 16 + 28), // creator, profile ID, reserved
  ]);
  cached = concat([header, ...table, ...data]);
  return cached;
}

module.exports = { srgbProfile, SRGB_NAME: NAME };
