import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { ApiError } from "../api";

export const sha256 = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");
export const SIGNATURE_CONSENT_VERSION = "hlusca-loan-v1";

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Accept only bounded, decodable browser-canvas PNGs with visible ink. */
export function decodeSignature(dataUrl: string) {
  const invalid = () =>
    new ApiError("Draw a clear signature in the signature pad.", 400);
  const encoded = dataUrl.slice("data:image/png;base64,".length);
  if (
    !dataUrl.startsWith("data:image/png;base64,") ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  )
    throw invalid();
  const bytes = Buffer.from(encoded, "base64");
  if (
    bytes.length < 60 ||
    bytes.length > 250000 ||
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw invalid();
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  let ended = false;
  const compressed: Buffer[] = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    if (offset + length + 12 > bytes.length) throw invalid();
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (
      crc32(bytes.subarray(offset + 4, offset + 8 + length)) !==
      bytes.readUInt32BE(offset + 8 + length)
    )
      throw invalid();
    if (offset === 8 && type !== "IHDR") throw invalid();
    if (type === "IHDR") {
      if (offset !== 8 || length !== 13) throw invalid();
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      channels = chunk[9] === 6 ? 4 : chunk[9] === 2 ? 3 : 0;
      if (
        width < 100 ||
        height < 50 ||
        width > 1600 ||
        height > 800 ||
        chunk[8] !== 8 ||
        !channels ||
        chunk[10] ||
        chunk[11] ||
        chunk[12]
      )
        throw invalid();
    } else if (type === "IDAT") compressed.push(chunk);
    else if (type === "IEND") {
      if (length !== 0 || offset + 12 !== bytes.length) throw invalid();
      ended = true;
      break;
    }
    offset += length + 12;
  }
  if (!ended || !compressed.length) throw invalid();
  const stride = width * channels;
  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(compressed), {
      maxOutputLength: (stride + 1) * height,
    });
  } catch {
    throw invalid();
  }
  if (raw.length !== (stride + 1) * height) throw invalid();
  let previous = Buffer.alloc(stride);
  let ink = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    if (filter > 4) throw invalid();
    const row = Buffer.from(
      raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)),
    );
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x];
      const corner = x >= channels ? previous[x - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = up;
      if (filter === 3) predictor = Math.floor((left + up) / 2);
      if (filter === 4) {
        const p = left + up - corner;
        const a = Math.abs(p - left),
          b = Math.abs(p - up),
          c = Math.abs(p - corner);
        predictor = a <= b && a <= c ? left : b <= c ? up : corner;
      }
      row[x] = (row[x] + predictor) & 255;
    }
    for (let x = 0; x < stride; x += channels) {
      if (
        (channels === 3 || row[x + 3] > 32) &&
        Math.min(row[x], row[x + 1], row[x + 2]) < 220
      )
        ink++;
    }
    previous = row;
  }
  if (ink < 30 || ink > width * height * 0.8) throw invalid();
  return new Uint8Array(bytes);
}
