import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath, type FileHandle } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { inflateSync } from "node:zlib";

import { assertExactKeys, isPlainObject, SmokeError, type SmokeInput } from "../../contracts";
import type { SmokeScreenshotResult } from "../types";
import { TASK554_SCENARIO_IDS } from "./browser-actions";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const MAX_PNG_BYTES = 16 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/u;
export const EVIDENCE_ROOT = "_docs/_workflows/_smoke/task-554";
const REPORT_FILE = "report.json";

export interface Task554ScreenshotManifestEntry {
  readonly scenarioId: (typeof TASK554_SCENARIO_IDS)[number];
  readonly path: string;
}

export interface Task554ScreenshotManifest {
  readonly entries: readonly Task554ScreenshotManifestEntry[];
  readonly paths: readonly string[];
}

function invalid(
  message: string,
  code: "smoke_argument_invalid" | "smoke_output_invalid" = "smoke_output_invalid"
): never {
  throw new SmokeError(code, message);
}

function sessionFor(profile: "fast" | "certification"): string {
  return `task-554-${profile}`;
}

export function assertExactTask554Invocation(value: unknown): asserts value is SmokeInput {
  if (!isPlainObject(value)) invalid("TASK-554 invocation is invalid", "smoke_argument_invalid");
  assertExactKeys(value, ["command", "suite", "profile", "session"], "TASK-554 invocation");
  if (
    value.command !== "run" ||
    value.suite !== "task-554" ||
    (value.profile !== "fast" && value.profile !== "certification") ||
    value.session !== sessionFor(value.profile)
  ) {
    invalid("TASK-554 invocation is invalid", "smoke_argument_invalid");
  }
}

function screenshotPath(session: string, index: number, scenarioId: string): string {
  return `${EVIDENCE_ROOT}/${session}/${String(index + 1).padStart(2, "0")}-${scenarioId}.png`;
}

export function buildExactTask554ScreenshotManifest(input: SmokeInput): Task554ScreenshotManifest {
  assertExactTask554Invocation(input);
  const entries = TASK554_SCENARIO_IDS.map((scenarioId, index) =>
    Object.freeze({ scenarioId, path: screenshotPath(input.session, index, scenarioId) })
  );
  return Object.freeze({
    entries: Object.freeze(entries),
    paths: Object.freeze(entries.map(({ path }) => path)),
  });
}

export function assertExactTask554ScreenshotManifest(
  input: SmokeInput,
  manifest: Task554ScreenshotManifest
): void {
  assertExactTask554Invocation(input);
  if (
    !Object.isFrozen(manifest) ||
    !Object.isFrozen(manifest.entries) ||
    !Object.isFrozen(manifest.paths) ||
    manifest.entries.length !== TASK554_SCENARIO_IDS.length ||
    manifest.paths.length !== TASK554_SCENARIO_IDS.length ||
    new Set(manifest.paths).size !== TASK554_SCENARIO_IDS.length
  ) {
    invalid("TASK-554 screenshot manifest cardinality is invalid");
  }
  for (const [index, scenarioId] of TASK554_SCENARIO_IDS.entries()) {
    const entry = manifest.entries[index];
    const path = screenshotPath(input.session, index, scenarioId);
    if (
      entry === undefined ||
      entry.scenarioId !== scenarioId ||
      entry.path !== path ||
      manifest.paths[index] !== path ||
      !Object.isFrozen(entry)
    ) {
      invalid("TASK-554 screenshot manifest row drifted");
    }
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1)
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
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
  if (colorType === 0 || colorType === 3) return 1;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  return invalid("TASK-554 PNG color type is invalid");
}

function acceptsBitDepth(colorType: number, bitDepth: number): boolean {
  if (colorType === 0) return [1, 2, 4, 8, 16].includes(bitDepth);
  if (colorType === 3) return [1, 2, 4, 8].includes(bitDepth);
  return [8, 16].includes(bitDepth);
}

/** Decodes the complete bounded PNG container and deliberately exposes dimensions only. */
export function decodeTask554Png(
  bytes: Uint8Array
): Readonly<{ readonly width: number; readonly height: number }> {
  if (bytes.byteLength < 57 || bytes.byteLength > MAX_PNG_BYTES)
    invalid("TASK-554 PNG size is invalid");
  const image = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (!image.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE))
    invalid("TASK-554 PNG signature is invalid");
  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let header = false;
  let palette = false;
  let data = false;
  let ended = false;
  const compressed: Buffer[] = [];
  while (offset < image.byteLength) {
    if (offset + 12 > image.byteLength) invalid("TASK-554 PNG chunk is truncated");
    const length = image.readUInt32BE(offset);
    const typeOffset = offset + 4;
    const contentOffset = typeOffset + 4;
    const checksumOffset = contentOffset + length;
    const next = checksumOffset + 4;
    if (length > MAX_PNG_BYTES || next > image.byteLength)
      invalid("TASK-554 PNG chunk bounds are invalid");
    const type = image.subarray(typeOffset, contentOffset).toString("ascii");
    const content = image.subarray(contentOffset, checksumOffset);
    if (
      !/^[A-Za-z]{4}$/u.test(type) ||
      crc32(image.subarray(typeOffset, checksumOffset)) !== image.readUInt32BE(checksumOffset)
    ) {
      invalid("TASK-554 PNG chunk checksum is invalid");
    }
    if (type === "IHDR") {
      if (header || offset !== PNG_SIGNATURE.length || length !== 13)
        invalid("TASK-554 PNG header is invalid");
      width = content.readUInt32BE(0);
      height = content.readUInt32BE(4);
      bitDepth = content[8] ?? 0;
      colorType = content[9] ?? -1;
      if (
        width <= 0 ||
        height <= 0 ||
        width > 16_384 ||
        height > 16_384 ||
        !acceptsBitDepth(colorType, bitDepth) ||
        content[10] !== 0 ||
        content[11] !== 0 ||
        content[12] !== 0
      )
        invalid("TASK-554 PNG header fields are invalid");
      header = true;
    } else if (type === "PLTE") {
      if (!header || data || length === 0 || length % 3 !== 0 || length > 768)
        invalid("TASK-554 PNG palette is invalid");
      palette = true;
    } else if (type === "IDAT") {
      if (!header || ended || length === 0 || (colorType === 3 && !palette))
        invalid("TASK-554 PNG data is invalid");
      data = true;
      compressed.push(content);
    } else if (type === "IEND") {
      if (!header || !data || ended || length !== 0 || next !== image.byteLength)
        invalid("TASK-554 PNG end marker is invalid");
      ended = true;
    } else if ((type.charCodeAt(0) & 0x20) === 0) {
      invalid("TASK-554 PNG critical chunk is unknown");
    }
    offset = next;
  }
  if (!header || !data || !ended) invalid("TASK-554 PNG is incomplete");
  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(compressed), {
      maxOutputLength: Math.min(256 * 1024 * 1024, image.byteLength * 2048),
    });
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "TASK-554 PNG image data cannot be decoded", {
      cause: error,
    });
  }
  const rowBytes = Math.ceil((width * channels(colorType) * bitDepth) / 8);
  if (inflated.byteLength !== (rowBytes + 1) * height)
    invalid("TASK-554 PNG decoded bytes are invalid");
  for (let row = 0; row < height; row += 1) {
    if ((inflated[row * (rowBytes + 1)] ?? 255) > 4) invalid("TASK-554 PNG filter is invalid");
  }
  return Object.freeze({ width, height });
}

function inside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

async function assertNoFollowDirectories(root: string, session: string): Promise<string> {
  const canonicalRoot = await realpath(root).catch((error: unknown) => {
    throw new SmokeError("smoke_output_invalid", "TASK-554 repository root is unavailable", {
      cause: error,
    });
  });
  let current = canonicalRoot;
  for (const component of [...EVIDENCE_ROOT.split("/"), session]) {
    current = resolve(current, component);
    if (!inside(canonicalRoot, current)) invalid("TASK-554 evidence escapes repository root");
    const metadata = await lstat(current).catch((error: unknown) => {
      throw new SmokeError("smoke_output_invalid", "TASK-554 evidence directory is unavailable", {
        cause: error,
      });
    });
    if (metadata.isSymbolicLink() || !metadata.isDirectory())
      invalid("TASK-554 evidence directory is invalid");
  }
  return current;
}

async function readExactPng(root: string, path: string): Promise<Buffer> {
  const candidate = resolve(root, path);
  if (!inside(root, candidate)) invalid("TASK-554 evidence path escapes repository root");
  let handle: FileHandle | undefined;
  try {
    handle = await open(candidate, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat({ bigint: true });
    if (
      !before.isFile() ||
      before.size <= 0n ||
      before.size > BigInt(MAX_PNG_BYTES) ||
      before.nlink !== 1n
    ) {
      invalid("TASK-554 PNG ownership is invalid");
    }
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      BigInt(bytes.byteLength) !== before.size
    )
      invalid("TASK-554 PNG changed while reading");
    return bytes;
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    throw new SmokeError("smoke_output_invalid", "TASK-554 PNG is unavailable", { cause: error });
  } finally {
    await handle?.close();
  }
}

async function assertPrivateReportFile(directory: string): Promise<void> {
  const report = await lstat(resolve(directory, REPORT_FILE)).catch((error: unknown) => {
    throw new SmokeError("smoke_output_invalid", "TASK-554 report receipt is unavailable", {
      cause: error,
    });
  });
  if (report.isSymbolicLink() || !report.isFile() || report.nlink !== 1) {
    invalid("TASK-554 report receipt is invalid");
  }
}

export async function validateTask554ScreenshotOutputs(
  root: string,
  input: SmokeInput,
  manifest: Task554ScreenshotManifest
): Promise<readonly SmokeScreenshotResult[]> {
  assertExactTask554ScreenshotManifest(input, manifest);
  const directory = await assertNoFollowDirectories(root, input.session);
  const names = await readdir(directory);
  const expectedNames = manifest.paths.map((path) => path.slice(path.lastIndexOf("/") + 1));
  if (
    JSON.stringify([...names].sort()) !== JSON.stringify([...expectedNames, REPORT_FILE].sort())
  ) {
    console.error(`[DIAG] screenshot set mismatch actual=${JSON.stringify([...names].sort())} expected=${JSON.stringify([...expectedNames, REPORT_FILE].sort())}`);
    invalid("TASK-554 screenshot evidence set is invalid");
  }
  await assertPrivateReportFile(directory);
  const canonicalRoot = await realpath(root);
  const results: SmokeScreenshotResult[] = [];
  for (const entry of manifest.entries) {
    const bytes = await readExactPng(canonicalRoot, entry.path);
    decodeTask554Png(bytes);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (!SHA256.test(sha256)) invalid("TASK-554 PNG hash is invalid");
    results.push(Object.freeze({ path: entry.path, sha256 }));
  }
  if (results.length !== TASK554_SCENARIO_IDS.length)
    invalid("TASK-554 screenshot output cardinality is invalid");
  return Object.freeze(results);
}
