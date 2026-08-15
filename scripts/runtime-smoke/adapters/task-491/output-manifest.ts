import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, realpath, type FileHandle } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { inflateSync } from "node:zlib";

import { SmokeError, type SmokeInput } from "../../contracts";
import type { SmokeScreenshotResult } from "../types";
import type { Task491ScenarioDescriptor } from "./descriptors";
import { TASK_491_SCENARIOS } from "./descriptors";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const MAXIMUM_PNG_BYTES = 16 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/u;
const SESSION = /^[a-z][a-z0-9-]{2,63}$/u;

export const EVIDENCE_ROOT = "_docs/_workflows/_smoke/evidence/task-491";

export interface Task491ScreenshotManifestEntry {
  readonly scenarioId: string;
  readonly path: string;
  readonly evidencePath: string;
  readonly width: number;
  readonly height: number;
}

export interface Task491ScreenshotManifest {
  readonly profile: "fast" | "certification";
  readonly session: string;
  readonly entries: readonly Task491ScreenshotManifestEntry[];
  readonly paths: readonly string[];
}

export interface Task491DecodedPng {
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly sha256: string;
}

function fail(message: string, cause?: unknown): never {
  throw new SmokeError(
    "smoke_output_invalid",
    message,
    cause === undefined ? undefined : { cause }
  );
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function screenshotEvidencePath(
  input: Pick<SmokeInput, "profile" | "session">,
  descriptor: Task491ScenarioDescriptor
): string {
  const ordinal = String(descriptor.number).padStart(2, "0");
  return `shots/${ordinal}-${descriptor.id}.png`;
}

export function buildExactTask491ScreenshotManifest(input: SmokeInput): Task491ScreenshotManifest {
  if (
    input.suite !== "task-491" ||
    (input.profile !== "fast" && input.profile !== "certification") ||
    !SESSION.test(input.session)
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-491 screenshot invocation is invalid");
  }
  const entries = TASK_491_SCENARIOS.map((descriptor) => {
    const evidencePath = screenshotEvidencePath(input, descriptor);
    return Object.freeze({
      scenarioId: descriptor.id,
      path: `${EVIDENCE_ROOT}/${input.session}/${evidencePath}`,
      evidencePath,
      width: descriptor.viewport.width,
      height: descriptor.viewport.height,
    });
  });
  return Object.freeze({
    profile: input.profile,
    session: input.session,
    entries: Object.freeze(entries),
    paths: Object.freeze(entries.map(({ path }) => path)),
  });
}

export function assertExactTask491ScreenshotManifest(
  manifest: Task491ScreenshotManifest,
  descriptors: readonly Task491ScenarioDescriptor[] = TASK_491_SCENARIOS
): void {
  if (
    !SESSION.test(manifest.session) ||
    (manifest.profile !== "fast" && manifest.profile !== "certification") ||
    manifest.entries.length !== 5 ||
    manifest.paths.length !== 5 ||
    new Set(manifest.paths).size !== 5
  ) {
    fail("TASK-491 screenshot manifest cardinality is invalid");
  }
  for (const [index, entry] of manifest.entries.entries()) {
    const descriptor = descriptors[index];
    if (
      descriptor === undefined ||
      entry.scenarioId !== descriptor.id ||
      entry.path !== `${EVIDENCE_ROOT}/${manifest.session}/${entry.evidencePath}` ||
      entry.evidencePath !== screenshotEvidencePath(manifest, descriptor) ||
      manifest.paths[index] !== entry.path ||
      entry.width !== descriptor.viewport.width ||
      entry.height !== descriptor.viewport.height ||
      !entry.path.endsWith(".png") ||
      entry.path.includes(".json")
    ) {
      fail("TASK-491 screenshot manifest row drifted");
    }
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 0xff]! ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function channels(colorType: number): number {
  if (colorType === 0) return 1;
  if (colorType === 2) return 3;
  if (colorType === 3) return 1;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  return fail("TASK-491 PNG color type is unsupported");
}

function validBitDepth(colorType: number, bitDepth: number): boolean {
  if (colorType === 0) return [1, 2, 4, 8, 16].includes(bitDepth);
  if (colorType === 3) return [1, 2, 4, 8].includes(bitDepth);
  return [8, 16].includes(bitDepth);
}

export function decodeTask491Png(bytes: Uint8Array): Task491DecodedPng {
  if (bytes.byteLength < 57 || bytes.byteLength > MAXIMUM_PNG_BYTES) {
    return fail("TASK-491 PNG size is invalid");
  }
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return fail("TASK-491 PNG signature is invalid");
  }
  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let sawHeader = false;
  let sawPalette = false;
  let sawData = false;
  let sawEnd = false;
  const data: Buffer[] = [];
  while (offset < buffer.byteLength) {
    if (offset + 12 > buffer.byteLength) return fail("TASK-491 PNG chunk is truncated");
    const length = buffer.readUInt32BE(offset);
    const typeOffset = offset + 4;
    const dataOffset = typeOffset + 4;
    const crcOffset = dataOffset + length;
    const next = crcOffset + 4;
    if (length > MAXIMUM_PNG_BYTES || next > buffer.byteLength) {
      return fail("TASK-491 PNG chunk bound is invalid");
    }
    const type = buffer.subarray(typeOffset, dataOffset).toString("ascii");
    const chunk = buffer.subarray(dataOffset, crcOffset);
    const expectedCrc = buffer.readUInt32BE(crcOffset);
    if (crc32(buffer.subarray(typeOffset, crcOffset)) !== expectedCrc) {
      return fail("TASK-491 PNG chunk checksum is invalid");
    }
    if (!/^[A-Za-z]{4}$/u.test(type)) return fail("TASK-491 PNG chunk type is invalid");
    if (type === "IHDR") {
      if (sawHeader || offset !== PNG_SIGNATURE.length || length !== 13) {
        return fail("TASK-491 PNG header is invalid");
      }
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8] ?? 0;
      colorType = chunk[9] ?? -1;
      if (
        width <= 0 ||
        height <= 0 ||
        width > 16_384 ||
        height > 16_384 ||
        !validBitDepth(colorType, bitDepth) ||
        chunk[10] !== 0 ||
        chunk[11] !== 0 ||
        chunk[12] !== 0
      ) {
        return fail("TASK-491 PNG header fields are invalid");
      }
      sawHeader = true;
    } else if (type === "PLTE") {
      if (!sawHeader || sawData || length === 0 || length % 3 !== 0 || length > 768) {
        return fail("TASK-491 PNG palette is invalid");
      }
      sawPalette = true;
    } else if (type === "IDAT") {
      if (!sawHeader || sawEnd || length === 0 || (colorType === 3 && !sawPalette)) {
        return fail("TASK-491 PNG image data is invalid");
      }
      sawData = true;
      data.push(chunk);
    } else if (type === "IEND") {
      if (!sawHeader || !sawData || sawEnd || length !== 0 || next !== buffer.byteLength) {
        return fail("TASK-491 PNG end marker is invalid");
      }
      sawEnd = true;
    } else if ((type.charCodeAt(0) & 0x20) === 0) {
      return fail("TASK-491 PNG has an unknown critical chunk");
    }
    offset = next;
  }
  if (!sawHeader || !sawData || !sawEnd) return fail("TASK-491 PNG is incomplete");

  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(data), {
      maxOutputLength: Math.min(256 * 1024 * 1024, bytes.byteLength * 2_048),
    });
  } catch (error) {
    return fail("TASK-491 PNG image data cannot be decoded", error);
  }
  const rowBytes = Math.ceil((width * channels(colorType) * bitDepth) / 8);
  const expectedInflated = (rowBytes + 1) * height;
  if (inflated.byteLength !== expectedInflated) {
    return fail("TASK-491 PNG decoded byte count is invalid");
  }
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[row * (rowBytes + 1)];
    if (filter === undefined || filter > 4) return fail("TASK-491 PNG row filter is invalid");
  }
  return Object.freeze({
    width,
    height,
    bytes: buffer.byteLength,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  });
}

async function readDirectPng(root: string, path: string): Promise<Buffer> {
  const candidate = resolve(root, path);
  if (!isWithin(root, candidate)) return fail("TASK-491 screenshot escapes repository root");
  let handle: FileHandle | undefined;
  try {
    handle = await open(candidate, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat({ bigint: true });
    if (
      !before.isFile() ||
      before.size <= 0n ||
      before.size > BigInt(MAXIMUM_PNG_BYTES) ||
      before.nlink !== 1n
    ) {
      return fail("TASK-491 screenshot ownership is invalid");
    }
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      BigInt(bytes.byteLength) !== before.size
    ) {
      return fail("TASK-491 screenshot changed while reading");
    }
    return bytes;
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    return fail("TASK-491 screenshot is unavailable", error);
  } finally {
    await handle?.close();
  }
}

export async function validateTask491ScreenshotOutputs(
  rootInput: string,
  manifest: Task491ScreenshotManifest
): Promise<readonly SmokeScreenshotResult[]> {
  assertExactTask491ScreenshotManifest(manifest);
  const root = await realpath(rootInput).catch((error: unknown) =>
    fail("TASK-491 repository root is unavailable", error)
  );
  const results: SmokeScreenshotResult[] = [];
  const digests = new Set<string>();
  for (const entry of manifest.entries) {
    const decoded = decodeTask491Png(await readDirectPng(root, entry.path));
    if (
      decoded.width !== entry.width ||
      decoded.height !== entry.height ||
      !SHA256.test(decoded.sha256) ||
      digests.has(decoded.sha256)
    ) {
      fail("TASK-491 screenshot dimensions or identity drifted");
    }
    digests.add(decoded.sha256);
    results.push(Object.freeze({ path: entry.evidencePath, sha256: decoded.sha256 }));
  }
  if (results.length !== 5 || digests.size !== 5) {
    fail("TASK-491 screenshot output cardinality is invalid");
  }
  return Object.freeze(results);
}
