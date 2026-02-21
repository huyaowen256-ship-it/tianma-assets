/**
 * 生成一张 100x100 的宣纸噪点纹理 PNG（纯 Node.js，无依赖）
 * 输出到 textures/paper_noise.png
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 100, H = 100;

// PNG 文件签名
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
}

// IHDR: 宽100, 高100, 8位深度, RGBA颜色类型(6)
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(W, 0);
ihdrData.writeUInt32BE(H, 4);
ihdrData[8] = 8;   // bit depth
ihdrData[9] = 6;   // color type RGBA
ihdrData[10] = 0;  // compression
ihdrData[11] = 0;  // filter
ihdrData[12] = 0;  // interlace

// 生成像素数据 — 暖调宣纸噪点
const rawData = Buffer.alloc(H * (1 + W * 4)); // 每行前加1字节滤波器类型
for (let y = 0; y < H; y++) {
    const rowOffset = y * (1 + W * 4);
    rawData[rowOffset] = 0; // None filter
    for (let x = 0; x < W; x++) {
        const offset = rowOffset + 1 + x * 4;
        // 产生随机噪点：暖调偏黄宣纸色
        const noise = Math.random();
        // 底色 #F9F4E8 加上随机扰动
        const r = Math.min(255, Math.max(0, 249 + Math.floor((noise - 0.5) * 16)));
        const g = Math.min(255, Math.max(0, 244 + Math.floor((noise - 0.5) * 14)));
        const b = Math.min(255, Math.max(0, 232 + Math.floor((noise - 0.5) * 12)));
        const a = Math.floor(noise * 25 + 5); // 非常低的透明度
        rawData[offset] = r;
        rawData[offset + 1] = g;
        rawData[offset + 2] = b;
        rawData[offset + 3] = a;
    }
}

const compressed = zlib.deflateSync(rawData);
const idatChunk = makeChunk('IDAT', compressed);
const ihdrChunk = makeChunk('IHDR', ihdrData);
const iendChunk = makeChunk('IEND', Buffer.alloc(0));

const png = Buffer.concat([SIGNATURE, ihdrChunk, idatChunk, iendChunk]);

const outDir = path.join(__dirname, 'textures');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'paper_noise.png');
fs.writeFileSync(outPath, png);
console.log('Generated:', outPath, '(' + png.length + ' bytes)');
