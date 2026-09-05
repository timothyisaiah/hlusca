import { deflateSync } from "node:zlib";

// A real PNG fixture with a small dark stroke on a transparent RGBA canvas.
export function signatureFixture(blank = false) {
  function chunk(type: string, data: Buffer) {
    const bytes = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, bytes, checksum]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(200, 0);
  header.writeUInt32BE(100, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.alloc(801 * 100);
  if (!blank)
    for (let x = 20; x < 100; x++) pixels[50 * 801 + 1 + x * 4 + 3] = 255;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}
