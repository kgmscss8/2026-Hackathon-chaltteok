// PWA 아이콘 생성기 (의존성 없음). 실행: node scripts/gen-icons.mjs
// 금색 바탕 + 가운데 흰 찰떡(둥근 타원) + 콩고물 점 3개. 가장자리 20% 안전 영역을 비워 maskable로도 쓴다.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [232, 176, 74]; // #E8B04A
const RICE = [255, 253, 247]; // #FFFDF7
const DOT = [168, 112, 40]; // #A87028

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
  const SS = 4; // 4x4 슈퍼샘플링으로 가장자리를 부드럽게
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const [pr, pg, pb] = pixel((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
          r += pr;
          g += pg;
          b += pb;
        }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = Math.round(r / SS / SS);
      raw[o + 1] = Math.round(g / SS / SS);
      raw[o + 2] = Math.round(b / SS / SS);
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// u, v: 0~1 좌표
function design(u, v) {
  const dx = (u - 0.5) / 0.3;
  const dy = (v - 0.52) / 0.21;
  if (dx * dx + dy * dy > 1) return BG;
  for (const [cx, cy] of [
    [0.4, 0.47],
    [0.55, 0.43],
    [0.6, 0.57],
  ]) {
    if ((u - cx) ** 2 + (v - cy) ** 2 < 0.028 ** 2) return DOT;
  }
  return RICE;
}

mkdirSync('public/icons', { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(`public/icons/${name}`, png(size, design));
  process.stdout.write(`public/icons/${name}\n`);
}
