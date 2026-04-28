export type ImageDimensions = {
  width: number;
  height: number;
};

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webpSignature = Buffer.from("WEBP", "ascii");

const isPositiveDimension = (value: number) =>
  Number.isInteger(value) && value > 0 && value <= 100_000;

const fromDimensions = (width: number, height: number): ImageDimensions | null =>
  isPositiveDimension(width) && isPositiveDimension(height) ? { width, height } : null;

const readPngDimensions = (buffer: Buffer) => {
  if (buffer.length < 24) return null;
  if (!buffer.subarray(0, 8).equals(pngSignature)) return null;
  const chunkType = buffer.subarray(12, 16).toString("ascii");
  if (chunkType !== "IHDR") return null;
  return fromDimensions(buffer.readUInt32BE(16), buffer.readUInt32BE(20));
};

const readJpegDimensions = (buffer: Buffer) => {
  if (buffer.length < 4) return null;
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    offset += 2;

    if (marker === undefined || marker === 0xd9 || marker === 0xda) return null;
    if (marker >= 0xd0 && marker <= 0xd7) continue;

    if (offset + 2 > buffer.length) return null;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2) return null;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      if (offset + 7 > buffer.length) return null;
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      return fromDimensions(width, height);
    }

    offset += segmentLength;
  }

  return null;
};

const readGifDimensions = (buffer: Buffer) => {
  if (buffer.length < 10) return null;
  const signature = buffer.subarray(0, 6).toString("ascii");
  if (signature !== "GIF87a" && signature !== "GIF89a") return null;
  return fromDimensions(buffer.readUInt16LE(6), buffer.readUInt16LE(8));
};

const readWebpDimensions = (buffer: Buffer) => {
  if (buffer.length < 30) return null;
  if (buffer.subarray(0, 4).toString("ascii") !== "RIFF") return null;
  if (!buffer.subarray(8, 12).equals(webpSignature)) return null;

  const chunkType = buffer.subarray(12, 16).toString("ascii");
  if (chunkType === "VP8X" && buffer.length >= 30) {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return fromDimensions(width, height);
  }

  if (chunkType === "VP8 " && buffer.length >= 30) {
    const startCode = buffer.subarray(23, 26);
    if (startCode[0] !== 0x9d || startCode[1] !== 0x01 || startCode[2] !== 0x2a) {
      return null;
    }
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return fromDimensions(width, height);
  }

  if (chunkType === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return fromDimensions(width, height);
  }

  return null;
};

export function readImageDimensions(input: ArrayBuffer | Uint8Array | Buffer) {
  const buffer = Buffer.isBuffer(input)
    ? input
    : input instanceof ArrayBuffer
      ? Buffer.from(new Uint8Array(input))
      : Buffer.from(input);
  return (
    readPngDimensions(buffer) ??
    readJpegDimensions(buffer) ??
    readGifDimensions(buffer) ??
    readWebpDimensions(buffer)
  );
}
