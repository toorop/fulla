// Builds the raster icons from the SVGs. Run from site/: node scripts/favicon.mjs
// - public/favicon.svg: drawn on a 16-pixel grid so it stays sharp in a browser tab (edit it by hand).
// - public/favicon.ico: 16 and 32 px from favicon.svg, 48 px from the full logo (src/assets/logo.svg).
// - public/apple-touch-icon.png: 180 px from the full logo on an opaque square (iOS rounds the corners).
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const BG = '#1e1e1e';
const small = readFileSync('public/favicon.svg');
const logo = readFileSync('src/assets/logo.svg', 'utf8');
// The full logo on the dark background, rounded (for the .ico) or square (for iOS).
const onBg = (rx) => Buffer.from(logo.replace(/(<svg[^>]*>)/, `$1<rect width="64" height="64" rx="${rx}" fill="${BG}"/>`));

const png = (svg, size, viewBox) => sharp(svg, { density: (72 * size * 4) / viewBox }).resize(size, size).png().toBuffer();

const images = [await png(small, 16, 16), await png(small, 32, 16), await png(onBg(12), 48, 64)];

// ICO with PNG entries: 6-byte header, 16 bytes per entry, then the PNG data.
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
[16, 32, 48].forEach((size, i) => {
	const e = 6 + 16 * i;
	header.writeUInt8(size, e);
	header.writeUInt8(size, e + 1);
	header.writeUInt16LE(1, e + 4);
	header.writeUInt16LE(32, e + 6);
	header.writeUInt32LE(images[i].length, e + 8);
	header.writeUInt32LE(offset, e + 12);
	offset += images[i].length;
});
writeFileSync('public/favicon.ico', Buffer.concat([header, ...images]));
writeFileSync('public/apple-touch-icon.png', await png(onBg(0), 180, 64));
console.log('public/favicon.ico, public/apple-touch-icon.png');
