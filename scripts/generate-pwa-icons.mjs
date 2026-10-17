import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// CRC32 calculation for PNG chunks
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPng(width, height) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from('IHDR'),
    ihdrData,
    Buffer.alloc(4),
  ]);
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  ihdrChunk.writeUInt32BE(ihdrCrc, 21);

  // Raw image data: scanlines with filter byte 0
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.42;
  const innerRadius = width * 0.36;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // None filter

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Deep dark slate gradient (#020617 to #0f172a)
      let r = 2 + Math.floor((x / width) * 12);
      let g = 6 + Math.floor((y / height) * 16);
      let b = 23 + Math.floor(((x + y) / (width * 2)) * 25);
      let a = 255;

      // Outer glowing compass ring
      if (dist >= innerRadius && dist <= radius) {
        // Cyan-to-blue gradient ring
        r = 37 + Math.floor(((x + y) / (width * 2)) * 40);
        g = 99 + Math.floor((x / width) * 120);
        b = 235 + Math.floor((y / height) * 20);
      } else if (dist < innerRadius) {
        // Inner compass disc
        r = 15;
        g = 23;
        b = 42;

        // Compass Star / Needle:
        // North needle (pointing up) - Golden Amber (#f59e0b)
        // South needle (pointing down) - Slate Blue (#38bdf8)
        const inNeedleNorth =
          dy < 0 && Math.abs(dx) <= (-dy * 0.32) && dist <= innerRadius * 0.75;
        const inNeedleSouth =
          dy >= 0 && Math.abs(dx) <= (dy * 0.32) && dist <= innerRadius * 0.75;
        const inCenterDot = dist <= innerRadius * 0.12;

        if (inCenterDot) {
          r = 255;
          g = 255;
          b = 255;
        } else if (inNeedleNorth) {
          r = 245;
          g = 158;
          b = 11;
        } else if (inNeedleSouth) {
          r = 56;
          g = 189;
          b = 248;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // IDAT chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = Buffer.concat([
    Buffer.alloc(4),
    Buffer.from('IDAT'),
    compressed,
    Buffer.alloc(4),
  ]);
  idatChunk.writeUInt32BE(compressed.length, 0);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  idatChunk.writeUInt32BE(idatCrc, idatChunk.length - 4);

  // IEND chunk
  const iendChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('IEND'),
    Buffer.alloc(4),
  ]);
  const iendCrc = crc32(Buffer.from('IEND'));
  iendChunk.writeUInt32BE(iendCrc, 8);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate icons
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPng(192, 192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPng(512, 512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180));

console.log('PWA icons generated successfully in public/: icon-192.png, icon-512.png, apple-touch-icon.png');
