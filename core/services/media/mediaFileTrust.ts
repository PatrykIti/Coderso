export const CANONICAL_MEDIA_PROFILES = Object.freeze({
  "image/png": Object.freeze({ extension: ".png", delivery: "inline" }),
  "image/jpeg": Object.freeze({ extension: ".jpg", delivery: "inline" }),
  "image/gif": Object.freeze({ extension: ".gif", delivery: "inline" }),
  "image/webp": Object.freeze({ extension: ".webp", delivery: "inline" }),
  "image/bmp": Object.freeze({ extension: ".bmp", delivery: "inline" }),
  "application/pdf": Object.freeze({ extension: ".pdf", delivery: "attachment" }),
  "text/plain": Object.freeze({ extension: ".txt", delivery: "attachment" }),
  "image/svg+xml": Object.freeze({ extension: ".svg", delivery: "attachment" }),
  "application/octet-stream": Object.freeze({ extension: ".bin", delivery: "attachment" }),
} as const);

export type CanonicalMediaMime = keyof typeof CANONICAL_MEDIA_PROFILES;
export type CanonicalMediaExtension =
  (typeof CANONICAL_MEDIA_PROFILES)[CanonicalMediaMime]["extension"];
export type CanonicalMediaDelivery =
  (typeof CANONICAL_MEDIA_PROFILES)[CanonicalMediaMime]["delivery"];
export type CanonicalMediaIdentity = {
  [Mime in CanonicalMediaMime]: Readonly<{
    mimeType: Mime;
    extension: (typeof CANONICAL_MEDIA_PROFILES)[Mime]["extension"];
    delivery: (typeof CANONICAL_MEDIA_PROFILES)[Mime]["delivery"];
  }>;
}[CanonicalMediaMime];

const PNG_SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPEG_SIGNATURE = Uint8Array.of(0xff, 0xd8, 0xff);
const GIF87A_SIGNATURE = asciiBytes("GIF87a");
const GIF89A_SIGNATURE = asciiBytes("GIF89a");
const RIFF_SIGNATURE = asciiBytes("RIFF");
const WEBP_SIGNATURE = asciiBytes("WEBP");
const BMP_SIGNATURE = asciiBytes("BM");
const PDF_SIGNATURE = asciiBytes("%PDF-");
const MAX_SVG_INSPECTION_BYTES = 1024 * 1024;
const MAX_MEDIA_KEY_BYTES = 1024;
const MAX_MEDIA_KEY_SEGMENT_BYTES = 255;
const MAX_DISPOSITION_STEM_BYTES = 96;
const MAX_DISPOSITION_UNICODE_BYTES = 180;

const PASSIVE_MIMES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp"] as const;

const identityCache = Object.freeze(
  Object.fromEntries(
    Object.entries(CANONICAL_MEDIA_PROFILES).map(([mimeType, profile]) => [
      mimeType,
      Object.freeze({ mimeType, ...profile }),
    ])
  ) as Record<CanonicalMediaMime, CanonicalMediaIdentity>
);

function asciiBytes(value: string): Uint8Array {
  return Uint8Array.from(value, (character) => character.charCodeAt(0));
}

function identityFor<Mime extends CanonicalMediaMime>(mimeType: Mime) {
  return identityCache[mimeType] as Extract<CanonicalMediaIdentity, { mimeType: Mime }>;
}

function startsWithBytes(bytes: Uint8Array, signature: Uint8Array, offset = 0): boolean {
  if (offset < 0 || bytes.length < offset + signature.length) return false;
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[offset + index] !== signature[index]) return false;
  }
  return true;
}

function isStrictPrefix(bytes: Uint8Array, signature: Uint8Array, offset = 0): boolean {
  if (bytes.length <= offset || bytes.length >= offset + signature.length) return false;
  for (let index = 0; index < bytes.length - offset; index += 1) {
    if (bytes[offset + index] !== signature[index]) return false;
  }
  return true;
}

function readUint32Be(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return (
    bytes[offset]! * 0x1000000 +
    bytes[offset + 1]! * 0x10000 +
    bytes[offset + 2]! * 0x100 +
    bytes[offset + 3]!
  );
}

function readUint32Le(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return (
    bytes[offset]! +
    bytes[offset + 1]! * 0x100 +
    bytes[offset + 2]! * 0x10000 +
    bytes[offset + 3]! * 0x1000000
  );
}

function readInt32Le(bytes: Uint8Array, offset: number): number | null {
  const value = readUint32Le(bytes, offset);
  if (value === null) return null;
  return value > 0x7fffffff ? value - 0x100000000 : value;
}

function readUint16Le(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) return null;
  return bytes[offset]! + bytes[offset + 1]! * 0x100;
}

function readUint16Be(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) return null;
  return bytes[offset]! * 0x100 + bytes[offset + 1]!;
}

function crc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) {
    crc ^= bytes[index]!;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validatePng(bytes: Uint8Array): boolean {
  if (!startsWithBytes(bytes, PNG_SIGNATURE) || bytes.length < 45) return false;
  let offset = PNG_SIGNATURE.length;
  let sawHeader = false;
  let sawPalette = false;
  let sawImageData = false;
  let imageDataClosed = false;
  let colorType: number | null = null;
  const idatPrefix: number[] = [];
  while (offset + 12 <= bytes.length) {
    const length = readUint32Be(bytes, offset);
    if (length === null || length > bytes.length - offset - 12) return false;
    const typeOffset = offset + 4;
    const dataOffset = typeOffset + 4;
    const crcOffset = dataOffset + length;
    const nextOffset = crcOffset + 4;
    const type = String.fromCharCode(
      bytes[typeOffset]!,
      bytes[typeOffset + 1]!,
      bytes[typeOffset + 2]!,
      bytes[typeOffset + 3]!
    );
    if (!/^[A-Za-z]{4}$/u.test(type)) return false;
    const expectedCrc = readUint32Be(bytes, crcOffset);
    if (expectedCrc === null || expectedCrc !== crc32(bytes, typeOffset, crcOffset)) return false;
    if (!sawHeader) {
      if (length !== 13 || type !== "IHDR") return false;
      const width = readUint32Be(bytes, dataOffset);
      const height = readUint32Be(bytes, dataOffset + 4);
      if (!width || !height) return false;
      const bitDepth = bytes[dataOffset + 8]!;
      colorType = bytes[dataOffset + 9]!;
      const validDepth =
        (colorType === 0 && [1, 2, 4, 8, 16].includes(bitDepth)) ||
        (colorType === 2 && [8, 16].includes(bitDepth)) ||
        (colorType === 3 && [1, 2, 4, 8].includes(bitDepth)) ||
        (colorType === 4 && [8, 16].includes(bitDepth)) ||
        (colorType === 6 && [8, 16].includes(bitDepth));
      if (
        !validDepth ||
        bytes[dataOffset + 10] !== 0 ||
        bytes[dataOffset + 11] !== 0 ||
        (bytes[dataOffset + 12] !== 0 && bytes[dataOffset + 12] !== 1)
      ) {
        return false;
      }
      sawHeader = true;
    } else if (type === "IHDR") {
      return false;
    } else if (type === "PLTE") {
      if (sawPalette || sawImageData || colorType === 0 || colorType === 4) return false;
      if (length < 3 || length > 768 || length % 3 !== 0) return false;
      sawPalette = true;
    } else if (type === "IDAT") {
      if (imageDataClosed || length === 0 || (colorType === 3 && !sawPalette)) return false;
      sawImageData = true;
      for (let index = dataOffset; index < crcOffset && idatPrefix.length < 2; index += 1) {
        idatPrefix.push(bytes[index]!);
      }
    } else if (type === "IEND") {
      if (length !== 0 || !sawImageData || nextOffset !== bytes.length) return false;
      if (idatPrefix.length !== 2) return false;
      const [cmf, flg] = idatPrefix;
      return (cmf! & 0x0f) === 8 && ((cmf! << 8) + flg!) % 31 === 0;
    } else {
      if ((bytes[typeOffset]! & 0x20) === 0) return false;
      if (sawImageData) imageDataClosed = true;
    }
    offset = nextOffset;
  }
  return false;
}

function validateJpeg(bytes: Uint8Array): boolean {
  if (!startsWithBytes(bytes, JPEG_SIGNATURE) || bytes.length < 16) return false;
  let offset = 2;
  let sawFrame = false;
  let sawScan = false;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return false;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return false;
    const marker = bytes[offset++]!;
    if (marker === 0xd9) return sawFrame && sawScan && offset === bytes.length;
    if (marker === 0xd8 || marker === 0x00) return false;
    if (marker >= 0xd0 && marker <= 0xd7) {
      if (!sawScan) return false;
      continue;
    }
    const segmentLength = readUint16Be(bytes, offset);
    if (segmentLength === null || segmentLength < 2 || offset + segmentLength > bytes.length) {
      return false;
    }
    const segmentStart = offset + 2;
    const segmentEnd = offset + segmentLength;
    const isFrameMarker =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isFrameMarker) {
      if (segmentLength < 11) return false;
      const height = readUint16Be(bytes, segmentStart + 1);
      const width = readUint16Be(bytes, segmentStart + 3);
      if (!width || !height || bytes[segmentStart + 5] === 0) return false;
      sawFrame = true;
    }
    if (marker === 0xda) {
      if (!sawFrame || segmentLength < 8) return false;
      sawScan = true;
      offset = segmentEnd;
      while (offset < bytes.length) {
        if (bytes[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        let next = offset + 1;
        while (next < bytes.length && bytes[next] === 0xff) next += 1;
        if (next >= bytes.length) return false;
        const scanMarker = bytes[next]!;
        if (scanMarker === 0x00 || (scanMarker >= 0xd0 && scanMarker <= 0xd7)) {
          offset = next + 1;
          continue;
        }
        break;
      }
      continue;
    }
    offset = segmentEnd;
  }
  return false;
}

function validateGif(bytes: Uint8Array): boolean {
  const hasSignature =
    startsWithBytes(bytes, GIF87A_SIGNATURE) || startsWithBytes(bytes, GIF89A_SIGNATURE);
  if (!hasSignature || bytes.length < 20 || bytes[bytes.length - 1] !== 0x3b) return false;
  const width = readUint16Le(bytes, 6);
  const height = readUint16Le(bytes, 8);
  if (!width || !height) return false;
  const packed = bytes[10]!;
  let offset = 13;
  let hasColorTable = false;
  if ((packed & 0x80) !== 0) {
    const tableBytes = 3 * 2 ** ((packed & 0x07) + 1);
    if (offset + tableBytes > bytes.length) return false;
    offset += tableBytes;
    hasColorTable = true;
  }
  let sawImage = false;
  const consumeSubBlocks = () => {
    while (offset < bytes.length) {
      const size = bytes[offset++]!;
      if (size === 0) return true;
      if (offset + size > bytes.length) return false;
      offset += size;
    }
    return false;
  };

  while (offset < bytes.length) {
    const introducer = bytes[offset++]!;
    if (introducer === 0x3b) return sawImage && offset === bytes.length;
    if (introducer === 0x21) {
      if (offset >= bytes.length) return false;
      offset += 1;
      if (!consumeSubBlocks()) return false;
      continue;
    }
    if (introducer !== 0x2c || offset + 9 > bytes.length) return false;
    const imageWidth = readUint16Le(bytes, offset + 4);
    const imageHeight = readUint16Le(bytes, offset + 6);
    const imagePacked = bytes[offset + 8]!;
    if (!imageWidth || !imageHeight) return false;
    offset += 9;
    let imageHasColorTable = hasColorTable;
    if ((imagePacked & 0x80) !== 0) {
      const tableBytes = 3 * 2 ** ((imagePacked & 0x07) + 1);
      if (offset + tableBytes > bytes.length) return false;
      offset += tableBytes;
      imageHasColorTable = true;
    }
    if (!imageHasColorTable || offset >= bytes.length) return false;
    const minimumCodeSize = bytes[offset++]!;
    if (minimumCodeSize < 2 || minimumCodeSize > 12 || !consumeSubBlocks()) return false;
    sawImage = true;
  }
  return false;
}

function validateWebp(bytes: Uint8Array): boolean {
  if (
    bytes.length < 20 ||
    !startsWithBytes(bytes, RIFF_SIGNATURE) ||
    !startsWithBytes(bytes, WEBP_SIGNATURE, 8)
  ) {
    return false;
  }
  const declaredSize = readUint32Le(bytes, 4);
  if (declaredSize === null || declaredSize + 8 !== bytes.length) return false;
  let offset = 12;
  let sawImage = false;
  while (offset + 8 <= bytes.length) {
    const chunk = String.fromCharCode(
      bytes[offset]!,
      bytes[offset + 1]!,
      bytes[offset + 2]!,
      bytes[offset + 3]!
    );
    const length = readUint32Le(bytes, offset + 4);
    if (length === null) return false;
    const payloadOffset = offset + 8;
    const paddedLength = length + (length % 2);
    if (payloadOffset + paddedLength > bytes.length) return false;
    if (chunk === "VP8 ") {
      if (
        length < 10 ||
        bytes[payloadOffset + 3] !== 0x9d ||
        bytes[payloadOffset + 4] !== 0x01 ||
        bytes[payloadOffset + 5] !== 0x2a
      ) {
        return false;
      }
      const width = readUint16Le(bytes, payloadOffset + 6);
      const height = readUint16Le(bytes, payloadOffset + 8);
      if (!width || !height) return false;
      sawImage = true;
    } else if (chunk === "VP8L") {
      if (length < 5 || bytes[payloadOffset] !== 0x2f) return false;
      const bits = readUint32Le(bytes, payloadOffset + 1);
      if (bits === null || ((bits >>> 29) & 0x07) !== 0) return false;
      sawImage = true;
    } else if (chunk === "VP8X") {
      if (length !== 10) return false;
    }
    offset = payloadOffset + paddedLength;
  }
  return sawImage && offset === bytes.length;
}

function validateBmp(bytes: Uint8Array): boolean {
  if (!startsWithBytes(bytes, BMP_SIGNATURE) || bytes.length < 58) return false;
  const declaredSize = readUint32Le(bytes, 2);
  const pixelOffset = readUint32Le(bytes, 10);
  const dibSize = readUint32Le(bytes, 14);
  if (declaredSize !== bytes.length || pixelOffset === null || dibSize === null) return false;
  if (dibSize < 40 || pixelOffset < 14 + dibSize || pixelOffset > bytes.length) return false;
  const width = readInt32Le(bytes, 18);
  const height = readInt32Le(bytes, 22);
  const planes = readUint16Le(bytes, 26);
  const bitsPerPixel = readUint16Le(bytes, 28);
  const compression = readUint32Le(bytes, 30);
  if (!width || !height || planes !== 1 || compression !== 0 || !bitsPerPixel) return false;
  if (![1, 4, 8, 16, 24, 32].includes(bitsPerPixel)) return false;
  const colorsUsed = readUint32Le(bytes, 46) ?? 0;
  const paletteEntries = bitsPerPixel <= 8 ? colorsUsed || 2 ** bitsPerPixel : 0;
  const minimumPixelOffset = 14 + dibSize + paletteEntries * 4;
  if (pixelOffset < minimumPixelOffset) return false;
  const rowBytes = Math.floor((Math.abs(width) * bitsPerPixel + 31) / 32) * 4;
  const pixelBytes = rowBytes * Math.abs(height);
  return Number.isSafeInteger(pixelBytes) && pixelOffset + pixelBytes === bytes.length;
}

function validatePdf(bytes: Uint8Array): boolean {
  if (!startsWithBytes(bytes, PDF_SIGNATURE) || bytes.length < 14) return false;
  const prefix = new TextDecoder("ascii").decode(bytes.subarray(0, Math.min(bytes.length, 16)));
  if (!/^%PDF-\d\.\d(?:\r?\n|\r)/.test(prefix)) return false;
  const body = new TextDecoder("latin1").decode(bytes);
  if (!/\b\d+\s+\d+\s+obj\b[\s\S]*\bendobj\b/.test(body)) return false;
  return /\bstartxref\s+\d+\s+%%EOF[\t\r\n ]*$/.test(body);
}

function resemblesTruncatedKnownFormat(bytes: Uint8Array): boolean {
  if (
    isStrictPrefix(bytes, PNG_SIGNATURE) ||
    isStrictPrefix(bytes, JPEG_SIGNATURE) ||
    isStrictPrefix(bytes, GIF87A_SIGNATURE) ||
    isStrictPrefix(bytes, GIF89A_SIGNATURE) ||
    isStrictPrefix(bytes, BMP_SIGNATURE) ||
    isStrictPrefix(bytes, PDF_SIGNATURE)
  ) {
    return true;
  }
  if (isStrictPrefix(bytes, RIFF_SIGNATURE)) return true;
  if (startsWithBytes(bytes, RIFF_SIGNATURE)) {
    if (bytes.length < 12) return true;
    if (isStrictPrefix(bytes, WEBP_SIGNATURE, 8)) return true;
  }
  return bytes.length === 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function decodeStrictUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function containsBinaryMarkupGrammar(bytes: Uint8Array): boolean {
  return containsMarkupGrammar(new TextDecoder("latin1").decode(bytes));
}

function isPdfWhitespace(value: string): boolean {
  const codePoint = value.charCodeAt(0);
  return (
    codePoint === 0x00 ||
    codePoint === 0x09 ||
    codePoint === 0x0a ||
    codePoint === 0x0c ||
    codePoint === 0x0d ||
    codePoint === 0x20
  );
}

function isPdfDelimiter(value: string): boolean {
  return (
    value === "(" ||
    value === ")" ||
    value === "<" ||
    value === ">" ||
    value === "[" ||
    value === "]" ||
    value === "{" ||
    value === "}" ||
    value === "/" ||
    value === "%"
  );
}

function isPdfTokenBoundary(value: string, index: number): boolean {
  if (index < 0 || index >= value.length) return true;
  const character = value[index]!;
  return isPdfWhitespace(character) || isPdfDelimiter(character);
}

function isPdfHexDigit(value: string): boolean {
  const codePoint = value.charCodeAt(0);
  return (
    (codePoint >= 0x30 && codePoint <= 0x39) ||
    (codePoint >= 0x41 && codePoint <= 0x46) ||
    (codePoint >= 0x61 && codePoint <= 0x66)
  );
}

function skipPdfWhitespaceAndComments(value: string, start: number): number {
  let cursor = start;
  while (cursor < value.length) {
    if (isPdfWhitespace(value[cursor]!)) {
      cursor += 1;
      continue;
    }
    if (value[cursor] !== "%") break;
    cursor += 1;
    while (cursor < value.length && value[cursor] !== "\r" && value[cursor] !== "\n") {
      cursor += 1;
    }
  }
  return cursor;
}

function isPdfDictionaryOpener(value: string, start: number): boolean {
  if (value[start] !== "<" || value[start + 1] !== "<") return false;
  const firstEntry = skipPdfWhitespaceAndComments(value, start + 2);
  return value[firstEntry] === "/" || value.startsWith(">>", firstEntry);
}

function findPdfHexStringEnd(value: string, start: number): number {
  if (value[start] !== "<" || value[start + 1] === "<") return -1;
  for (let cursor = start + 1; cursor < value.length; cursor += 1) {
    const character = value[cursor]!;
    if (character === ">") return cursor;
    if (isPdfWhitespace(character) || isPdfHexDigit(character)) continue;
    return -1;
  }
  return -1;
}

const FORBIDDEN_PDF_STRUCTURE_NAMES = new Set([
  "JavaScript",
  "JS",
  "Launch",
  "OpenAction",
  "AA",
  "RichMedia",
  "EmbeddedFile",
  "AcroForm",
  "XFA",
  "Encrypt",
  "ObjStm",
]);

function findPdfLiteralStringEnd(value: string, start: number): number {
  let depth = 1;
  for (let cursor = start + 1; cursor < value.length; cursor += 1) {
    const character = value[cursor]!;
    if (character === "\\") {
      if (cursor + 1 >= value.length) return -1;
      cursor += 1;
      if (value[cursor] === "\r" && value[cursor + 1] === "\n") cursor += 1;
      continue;
    }
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0) return cursor + 1;
    }
  }
  return -1;
}

function readPdfNameToken(
  value: string,
  start: number
): Readonly<{ decoded: string; end: number }> | null {
  let end = start + 1;
  while (end < value.length && !isPdfWhitespace(value[end]!) && !isPdfDelimiter(value[end]!)) {
    end += 1;
  }
  if (end === start + 1) return null;

  const decoded: string[] = [];
  for (let cursor = start + 1; cursor < end; cursor += 1) {
    const character = value[cursor]!;
    if (character !== "#") {
      decoded.push(character);
      continue;
    }
    const high = value[cursor + 1];
    const low = value[cursor + 2];
    if (!high || !low || !isPdfHexDigit(high) || !isPdfHexDigit(low)) return null;
    const codePoint = Number.parseInt(`${high}${low}`, 16);
    if (codePoint === 0) return null;
    decoded.push(String.fromCharCode(codePoint));
    cursor += 2;
  }
  return { decoded: decoded.join(""), end };
}

function startsWithPdfKeyword(value: string, start: number, keyword: string): boolean {
  return (
    value.startsWith(keyword, start) &&
    isPdfTokenBoundary(value, start - 1) &&
    isPdfTokenBoundary(value, start + keyword.length)
  );
}

function findPdfKeyword(value: string, keyword: string, start: number): number {
  let cursor = value.indexOf(keyword, start);
  while (cursor >= 0) {
    if (startsWithPdfKeyword(value, cursor, keyword)) return cursor;
    cursor = value.indexOf(keyword, cursor + 1);
  }
  return -1;
}

function findPdfStreamEnd(value: string, streamTokenEnd: number): number {
  let payloadStart = streamTokenEnd;
  if (value[payloadStart] === "\r") {
    payloadStart += value[payloadStart + 1] === "\n" ? 2 : 1;
  } else if (value[payloadStart] === "\n") {
    payloadStart += 1;
  } else {
    return -1;
  }

  let searchFrom = payloadStart;
  const nextEndObject = findPdfKeyword(value, "endobj", payloadStart);
  while (searchFrom < value.length) {
    const candidate = value.indexOf("endstream", searchFrom);
    if (candidate < 0) return -1;
    const candidateEnd = candidate + "endstream".length;
    const hasPayloadLineEnding =
      candidate === payloadStart || value[candidate - 1] === "\r" || value[candidate - 1] === "\n";
    if (nextEndObject >= 0 && nextEndObject < candidate) return -1;
    if (
      hasPayloadLineEnding &&
      isPdfTokenBoundary(value, candidateEnd) &&
      startsWithPdfKeyword(value, skipPdfWhitespaceAndComments(value, candidateEnd), "endobj")
    ) {
      return candidateEnd;
    }
    searchFrom = candidate + 1;
  }
  return -1;
}

function hasInspectablePdfStructure(bytes: Uint8Array): boolean {
  const body = new TextDecoder("latin1").decode(bytes);
  let cursor = 0;
  while (cursor < body.length) {
    cursor = skipPdfWhitespaceAndComments(body, cursor);
    if (cursor >= body.length) return true;

    const character = body[cursor]!;
    if (character === "(") {
      const end = findPdfLiteralStringEnd(body, cursor);
      if (end < 0) return false;
      cursor = end;
      continue;
    }
    if (character === "<") {
      if (body[cursor + 1] === "<") {
        cursor += 2;
        continue;
      }
      const end = findPdfHexStringEnd(body, cursor);
      if (end < 0) return false;
      cursor = end + 1;
      continue;
    }
    if (character === "/") {
      const name = readPdfNameToken(body, cursor);
      if (!name || FORBIDDEN_PDF_STRUCTURE_NAMES.has(name.decoded)) return false;
      cursor = name.end;
      continue;
    }
    if (character === ")" || (character === ">" && body[cursor + 1] !== ">")) return false;
    if (character === ">" && body[cursor + 1] === ">") {
      cursor += 2;
      continue;
    }
    if (isPdfDelimiter(character)) {
      cursor += 1;
      continue;
    }

    let tokenEnd = cursor + 1;
    while (
      tokenEnd < body.length &&
      !isPdfWhitespace(body[tokenEnd]!) &&
      !isPdfDelimiter(body[tokenEnd]!)
    ) {
      tokenEnd += 1;
    }
    const token = body.slice(cursor, tokenEnd);
    if (token === "stream") {
      const streamEnd = findPdfStreamEnd(body, tokenEnd);
      if (streamEnd < 0) return false;
      cursor = streamEnd;
      continue;
    }
    if (token === "endstream") return false;
    cursor = tokenEnd;
  }
  return true;
}

function maskPdfLexicalTokensForMarkup(value: string): string {
  const chunks: string[] = [];
  let unchangedStart = 0;
  for (let cursor = 0; cursor < value.length; cursor += 1) {
    if (value[cursor] !== "<") continue;

    let tokenEnd = -1;
    if (isPdfDictionaryOpener(value, cursor)) {
      tokenEnd = cursor + 2;
    } else {
      const hexEnd = findPdfHexStringEnd(value, cursor);
      if (hexEnd >= 0) tokenEnd = hexEnd + 1;
    }
    if (tokenEnd < 0) continue;

    chunks.push(value.slice(unchangedStart, cursor), " ".repeat(tokenEnd - cursor));
    unchangedStart = tokenEnd;
    cursor = tokenEnd - 1;
  }
  if (chunks.length === 0) return value;
  chunks.push(value.slice(unchangedStart));
  return chunks.join("");
}

function containsPdfMarkupGrammar(bytes: Uint8Array): boolean {
  const body = new TextDecoder("latin1").decode(bytes);
  return containsMarkupGrammar(maskPdfLexicalTokensForMarkup(body));
}

function containsDisallowedTextControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d) continue;
    if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) return true;
  }
  return false;
}

function containsControlCodePoint(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) return true;
  }
  return false;
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

const forbiddenSvgElement = new Set([
  "script",
  "foreignobject",
  "a",
  "use",
  "image",
  "animate",
  "animatemotion",
  "animatetransform",
  "set",
  "discard",
  "mpath",
  "iframe",
  "object",
  "embed",
  "html",
  "link",
  "meta",
  "style",
  "audio",
  "video",
  "canvas",
]);

function findSvgTagEnd(value: string, start: number): number {
  let quote: '"' | "'" | null = null;
  for (let index = start + 1; index < value.length; index += 1) {
    const character = value[index]!;
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") return index;
  }
  return -1;
}

function hasUnsafeSvgAttributes(rawAttributes: string): boolean {
  const attributePattern =
    /(?:^|\s)([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gu;
  let match: RegExpExecArray | null;
  while ((match = attributePattern.exec(rawAttributes)) !== null) {
    const name = match[1]!.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (name.includes(":") || name === "style" || name.startsWith("on") || name === "xml:base") {
      return true;
    }
    if (
      (name === "href" || name === "src") &&
      !/^#[A-Za-z_][A-Za-z0-9_.:-]*$/u.test(value.trim())
    ) {
      return true;
    }
    if (/\\|&(?:#x?[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9_.:-]*);/u.test(value)) return true;
  }
  const residue = rawAttributes.replace(attributePattern, "").trim();
  if (residue.length > 0) return true;
  const unsafeUrl = /url\s*\(\s*(?!["']?#[-A-Za-z0-9_.:]+["']?\s*\))/i;
  return unsafeUrl.test(rawAttributes);
}

function isStandaloneSafeSvg(value: string): boolean {
  const normalized = value.replace(/^\uFEFF/, "").trim();
  if (!/^<svg(?:\s|>|\/)/i.test(normalized)) return false;
  if (/<!doctype|<!entity|<\?|<!--/i.test(normalized)) return false;

  const stack: string[] = [];
  let rootSeen = false;
  let rootClosed = false;
  let cursor = 0;
  while (cursor < normalized.length) {
    const opening = normalized.indexOf("<", cursor);
    if (opening === -1) {
      return rootClosed && normalized.slice(cursor).trim().length === 0;
    }
    const text = normalized.slice(cursor, opening);
    if ((!rootSeen || rootClosed) && text.trim().length > 0) return false;
    const end = findSvgTagEnd(normalized, opening);
    if (end === -1) return false;
    const raw = normalized.slice(opening + 1, end).trim();
    if (!raw || raw.startsWith("!") || raw.startsWith("?")) return false;

    const closing = raw.startsWith("/");
    const body = closing ? raw.slice(1).trimStart() : raw;
    const match = /^([A-Za-z][A-Za-z0-9:._-]*)([\s\S]*)$/.exec(body);
    if (!match) return false;
    const name = match[1]!.toLowerCase();
    if (name.includes(":")) return false;
    const remainder = match[2]!;
    const selfClosing = !closing && /\/\s*$/.test(remainder);
    const attributes = selfClosing ? remainder.replace(/\/\s*$/, "") : remainder;

    if (closing) {
      if (remainder.trim().length > 0 || stack.pop() !== name) return false;
      if (stack.length === 0) rootClosed = true;
    } else {
      if (rootClosed || forbiddenSvgElement.has(name) || hasUnsafeSvgAttributes(attributes)) {
        return false;
      }
      if (!rootSeen) {
        if (name !== "svg") return false;
        rootSeen = true;
      }
      if (!selfClosing) stack.push(name);
      else if (name === "svg" && stack.length === 0) rootClosed = true;
    }
    cursor = end + 1;
  }
  return rootSeen && rootClosed && stack.length === 0;
}

function containsMarkupGrammar(value: string): boolean {
  const normalized = value.replace(/^\uFEFF/, "");
  return /<\s*(?:!doctype|!entity|!--|\?|\/?\s*[A-Za-z][A-Za-z0-9:._-]*(?:\s|\/|>))/i.test(
    normalized
  );
}

/**
 * Canonicalizes complete upload bytes. Filename and declared Content-Type are
 * deliberately absent: this function owns identity, not upload authorization.
 */
export function canonicalizeMediaBytes(bytes: Uint8Array): CanonicalMediaIdentity | null {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) return null;

  if (startsWithBytes(bytes, PNG_SIGNATURE)) {
    return !containsBinaryMarkupGrammar(bytes) && validatePng(bytes)
      ? identityFor("image/png")
      : null;
  }
  if (startsWithBytes(bytes, JPEG_SIGNATURE) || (bytes[0] === 0xff && bytes[1] === 0xd8)) {
    return !containsBinaryMarkupGrammar(bytes) && validateJpeg(bytes)
      ? identityFor("image/jpeg")
      : null;
  }
  if (startsWithBytes(bytes, GIF87A_SIGNATURE) || startsWithBytes(bytes, GIF89A_SIGNATURE)) {
    return !containsBinaryMarkupGrammar(bytes) && validateGif(bytes)
      ? identityFor("image/gif")
      : null;
  }
  if (startsWithBytes(bytes, RIFF_SIGNATURE) && startsWithBytes(bytes, WEBP_SIGNATURE, 8)) {
    return !containsBinaryMarkupGrammar(bytes) && validateWebp(bytes)
      ? identityFor("image/webp")
      : null;
  }
  if (startsWithBytes(bytes, BMP_SIGNATURE)) {
    return !containsBinaryMarkupGrammar(bytes) && validateBmp(bytes)
      ? identityFor("image/bmp")
      : null;
  }
  if (startsWithBytes(bytes, PDF_SIGNATURE)) {
    return !containsPdfMarkupGrammar(bytes) &&
      validatePdf(bytes) &&
      hasInspectablePdfStructure(bytes)
      ? identityFor("application/pdf")
      : null;
  }
  if (resemblesTruncatedKnownFormat(bytes)) return null;

  const text = decodeStrictUtf8(bytes);
  if (text === null) {
    return containsBinaryMarkupGrammar(bytes) ? null : identityFor("application/octet-stream");
  }
  const hasMarkupGrammar = containsMarkupGrammar(text);
  if (containsDisallowedTextControl(text)) {
    return hasMarkupGrammar ? null : identityFor("application/octet-stream");
  }
  if (bytes.length > MAX_SVG_INSPECTION_BYTES && hasMarkupGrammar) return null;
  if (isStandaloneSafeSvg(text)) return identityFor("image/svg+xml");
  if (hasMarkupGrammar) return null;
  return identityFor("text/plain");
}

/**
 * Delivery-only passive prefix check. It never authorizes an upload and never
 * promotes active/text/unknown content to inline delivery.
 */
export function classifyCanonicalMediaPrefix(prefix: Uint8Array): CanonicalMediaIdentity | null {
  if (!(prefix instanceof Uint8Array) || prefix.length === 0) return null;
  if (startsWithBytes(prefix, PNG_SIGNATURE)) return identityFor("image/png");
  if (startsWithBytes(prefix, JPEG_SIGNATURE)) return identityFor("image/jpeg");
  if (startsWithBytes(prefix, GIF87A_SIGNATURE) || startsWithBytes(prefix, GIF89A_SIGNATURE)) {
    return identityFor("image/gif");
  }
  if (startsWithBytes(prefix, RIFF_SIGNATURE) && startsWithBytes(prefix, WEBP_SIGNATURE, 8)) {
    return identityFor("image/webp");
  }
  if (startsWithBytes(prefix, BMP_SIGNATURE)) return identityFor("image/bmp");
  return null;
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function buildMediaDeliveryPath(key: string): string {
  if (typeof key !== "string" || key.length === 0 || utf8Length(key) > MAX_MEDIA_KEY_BYTES) {
    throw new Error("media_key_invalid");
  }
  if (
    key.startsWith("/") ||
    key.endsWith("/") ||
    key.includes("//") ||
    key.includes("\\") ||
    key.includes("%") ||
    key.includes("?") ||
    key.includes("#") ||
    containsControlCodePoint(key) ||
    hasUnpairedSurrogate(key)
  ) {
    throw new Error("media_key_invalid");
  }
  const segments = key.split("/");
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".." ||
        utf8Length(segment) > MAX_MEDIA_KEY_SEGMENT_BYTES
    )
  ) {
    throw new Error("media_key_invalid");
  }
  return `/media/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

function truncateUtf8(value: string, maxBytes: number): string {
  let result = "";
  let bytes = 0;
  for (const character of value) {
    const size = utf8Length(character);
    if (bytes + size > maxBytes) break;
    result += character;
    bytes += size;
  }
  return result;
}

function stripDispositionSuffix(value: string): string {
  const firstDot = value.indexOf(".");
  return firstDot > 0 ? value.slice(0, firstDot) : value;
}

function sanitizeDispositionStem(value: unknown): string {
  if (typeof value !== "string") return "download";
  const basename = value.split(/[\\/]/u).at(-1) ?? "";
  const withoutUnsafe = Array.from(basename.normalize("NFC"))
    .filter((character) => {
      const codePoint = character.codePointAt(0)!;
      if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) return false;
      if (codePoint >= 0xd800 && codePoint <= 0xdfff) return false;
      return !(
        codePoint === 0x061c ||
        codePoint === 0x200e ||
        codePoint === 0x200f ||
        (codePoint >= 0x202a && codePoint <= 0x202e) ||
        (codePoint >= 0x2066 && codePoint <= 0x2069)
      );
    })
    .join("")
    .replace(/["'\\;]/gu, "_")
    .trim()
    .replace(/[. ]+$/u, "");
  const stem = stripDispositionSuffix(withoutUnsafe)
    .trim()
    .replace(/[. ]+$/u, "");
  return stem || "download";
}

function toAsciiDispositionStem(value: string): string {
  const ascii = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^A-Za-z0-9 _()-]/gu, "_")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/[. ]+$/u, "");
  return ascii || "download";
}

function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/gu,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function safeMediaDisposition(
  delivery: CanonicalMediaDelivery,
  originalName: string | null | undefined,
  extension: CanonicalMediaExtension
): string {
  const profile = Object.values(CANONICAL_MEDIA_PROFILES).find(
    (candidate) => candidate.delivery === delivery && candidate.extension === extension
  );
  if (!profile) throw new Error("media_identity_invalid");

  const unicodeStem = truncateUtf8(
    sanitizeDispositionStem(originalName),
    MAX_DISPOSITION_UNICODE_BYTES
  );
  const asciiStem = truncateUtf8(toAsciiDispositionStem(unicodeStem), MAX_DISPOSITION_STEM_BYTES);
  const asciiFilename = `${asciiStem || "download"}${extension}`;
  const unicodeFilename = `${unicodeStem || "download"}${extension}`;
  return `${delivery}; filename="${asciiFilename}"; filename*=UTF-8''${encodeRfc5987(unicodeFilename)}`;
}

export function isPassiveCanonicalMediaMime(
  mimeType: CanonicalMediaMime
): mimeType is (typeof PASSIVE_MIMES)[number] {
  return (PASSIVE_MIMES as readonly CanonicalMediaMime[]).includes(mimeType);
}
