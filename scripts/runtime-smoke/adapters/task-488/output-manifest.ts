import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath, type FileHandle } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { inflateSync } from "node:zlib";

import {
  assertExactKeys,
  isPlainObject,
  resolveInsideRoot,
  SmokeError,
  type SmokeInput,
} from "../../contracts";
import type { SmokeScreenshotResult } from "../types";
import { TASK_488_SCENARIOS, type Task488ScenarioDescriptor } from "./descriptors";

/**
 * TASK-488 screenshot evidence contract. Every scenario runs a light and a
 * dark admin variant, so the manifest owns exactly 10 PNGs (one per
 * scenario-variant pair) inside the run session evidence directory. The
 * evidence directory and report.json are owned by the shared runner; the
 * adapter validates the exact set, private ownership, PNG container integrity,
 * dimensions, and content hashes.
 */

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const MAXIMUM_PNG_BYTES = 16 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/u;
const SESSION = /^[a-z][a-z0-9-]{2,63}$/u;
const REPORT_FILE = "report.json";

export const TASK_488_EVIDENCE_ROOT = "_docs/_workflows/_smoke/evidence/task-488";

export interface Task488ScreenshotManifestEntry {
  readonly scenarioId: string;
  readonly variantId: "light" | "dark";
  readonly path: string;
  readonly width: number;
  readonly height: number;
}

export interface Task488ScreenshotManifest {
  readonly profile: "fast";
  readonly session: string;
  readonly entries: readonly Task488ScreenshotManifestEntry[];
  readonly paths: readonly string[];
}

function invalid(message: string, cause?: unknown): never {
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

export function assertExactTask488Invocation(value: unknown): asserts value is SmokeInput {
  if (!isPlainObject(value)) invalid("TASK-488 invocation is invalid", "smoke_argument_invalid");
  assertExactKeys(value, ["command", "suite", "profile", "session"], "TASK-488 invocation");
  if (
    value.command !== "run" ||
    value.suite !== "task-488" ||
    value.profile !== "fast" ||
    typeof value.session !== "string" ||
    !SESSION.test(value.session)
  ) {
    invalid("TASK-488 invocation is invalid", "smoke_argument_invalid");
  }
}

function task488VariantOrder(): readonly ("light" | "dark")[] {
  return Object.freeze(["light", "dark"] as const);
}

function screenshotPath(
  input: SmokeInput,
  descriptor: Task488ScenarioDescriptor,
  variantId: "light" | "dark"
): string {
  const ordinal = String(descriptor.number).padStart(2, "0");
  return `${TASK_488_EVIDENCE_ROOT}/${input.session}/${ordinal}-${descriptor.id}-${variantId}.png`;
}

export function task488EvidenceDirectory(input: SmokeInput, root: string): string {
  assertExactTask488Invocation(input);
  return resolveInsideRoot(root, `${TASK_488_EVIDENCE_ROOT}/${input.session}`, "task_488_evidence");
}

export function buildExactTask488ScreenshotManifest(input: SmokeInput): Task488ScreenshotManifest {
  assertExactTask488Invocation(input);
  const entries = TASK_488_SCENARIOS.flatMap((descriptor) =>
    task488VariantOrder().map((variantId) =>
      Object.freeze({
        scenarioId: descriptor.id,
        variantId,
        path: screenshotPath(input, descriptor, variantId),
        width: descriptor.variants[0]!.viewport.width,
        height: descriptor.variants[0]!.viewport.height,
      })
    )
  );
  return Object.freeze({
    profile: "fast",
    session: input.session,
    entries: Object.freeze(entries),
    paths: Object.freeze(entries.map(({ path }) => path)),
  });
}

export function assertExactTask488ScreenshotManifest(
  manifest: Task488ScreenshotManifest,
  input: SmokeInput
): void {
  const expected = buildExactTask488ScreenshotManifest(input);
  if (
    manifest.profile !== "fast" ||
    manifest.session !== input.session ||
    manifest.entries.length !== expected.entries.length ||
    manifest.paths.length !== expected.entries.length ||
    new Set(manifest.paths).size !== manifest.entries.length ||
    manifest.entries.some((entry, index) => {
      const wanted = expected.entries[index];
      return (
        wanted === undefined ||
        entry.scenarioId !== wanted.scenarioId ||
        entry.variantId !== wanted.variantId ||
        entry.path !== wanted.path ||
        entry.width !== wanted.width ||
        entry.height !== wanted.height ||
        manifest.paths[index] !== wanted.path
      );
    })
  ) {
    invalid("TASK-488 screenshot manifest drifted");
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
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
  if (colorType === 0 || colorType === 3) return 1;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  return invalid("TASK-488 PNG color type is invalid");
}

function acceptsBitDepth(colorType: number, bitDepth: number): boolean {
  if (colorType === 0) return [1, 2, 4, 8, 16].includes(bitDepth);
  if (colorType === 3) return [1, 2, 4, 8].includes(bitDepth);
  return [8, 16].includes(bitDepth);
}

function decodeTask488Png(
  bytes: Uint8Array
): Readonly<{ readonly width: number; readonly height: number }> {
  if (bytes.byteLength < 57 || bytes.byteLength > MAXIMUM_PNG_BYTES) {
    invalid("TASK-488 PNG size is invalid");
  }
  const image = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (!image.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    invalid("TASK-488 PNG signature is invalid");
  }
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
    if (offset + 12 > image.byteLength) invalid("TASK-488 PNG chunk is truncated");
    const length = image.readUInt32BE(offset);
    const typeOffset = offset + 4;
    const contentOffset = typeOffset + 4;
    const checksumOffset = contentOffset + length;
    const next = checksumOffset + 4;
    if (length > MAXIMUM_PNG_BYTES || next > image.byteLength) {
      invalid("TASK-488 PNG chunk bounds are invalid");
    }
    const type = image.subarray(typeOffset, contentOffset).toString("ascii");
    const content = image.subarray(contentOffset, checksumOffset);
    if (
      !/^[A-Za-z]{4}$/u.test(type) ||
      crc32(image.subarray(typeOffset, checksumOffset)) !== image.readUInt32BE(checksumOffset)
    ) {
      invalid("TASK-488 PNG chunk checksum is invalid");
    }
    if (type === "IHDR") {
      if (header || offset !== PNG_SIGNATURE.length || length !== 13) {
        invalid("TASK-488 PNG header is invalid");
      }
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
      ) {
        invalid("TASK-488 PNG header fields are invalid");
      }
      header = true;
    } else if (type === "PLTE") {
      if (!header || data || length === 0 || length % 3 !== 0 || length > 768) {
        invalid("TASK-488 PNG palette is invalid");
      }
      palette = true;
    } else if (type === "IDAT") {
      if (!header || ended || length === 0 || (colorType === 3 && !palette)) {
        invalid("TASK-488 PNG data is invalid");
      }
      data = true;
      compressed.push(content);
    } else if (type === "IEND") {
      if (!header || !data || ended || length !== 0 || next !== image.byteLength) {
        invalid("TASK-488 PNG end marker is invalid");
      }
      ended = true;
    } else if ((type.charCodeAt(0) & 0x20) === 0) {
      invalid("TASK-488 PNG critical chunk is unknown");
    }
    offset = next;
  }
  if (!header || !data || !ended) invalid("TASK-488 PNG is incomplete");
  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(compressed), {
      maxOutputLength: Math.min(256 * 1024 * 1024, image.byteLength * 2048),
    });
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "TASK-488 PNG image data cannot be decoded", {
      cause: error,
    });
  }
  const rowBytes = Math.ceil((width * channels(colorType) * bitDepth) / 8);
  if (inflated.byteLength !== (rowBytes + 1) * height) {
    invalid("TASK-488 PNG decoded bytes are invalid");
  }
  for (let row = 0; row < height; row += 1) {
    if ((inflated[row * (rowBytes + 1)] ?? 255) > 4) invalid("TASK-488 PNG filter is invalid");
  }
  return Object.freeze({ width, height });
}

async function assertNoFollowDirectories(root: string, session: string): Promise<string> {
  const canonicalRoot = await realpath(root).catch((error: unknown) => {
    throw new SmokeError("smoke_output_invalid", "TASK-488 repository root is unavailable", {
      cause: error,
    });
  });
  let current = canonicalRoot;
  for (const component of [...TASK_488_EVIDENCE_ROOT.split("/"), session]) {
    current = resolve(current, component);
    if (!isWithin(canonicalRoot, current)) invalid("TASK-488 evidence escapes repository root");
    const metadata = await lstat(current).catch((error: unknown) => {
      throw new SmokeError("smoke_output_invalid", "TASK-488 evidence directory is unavailable", {
        cause: error,
      });
    });
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      invalid("TASK-488 evidence directory is invalid");
    }
  }
  return current;
}

async function readExactPng(root: string, path: string): Promise<Buffer> {
  const candidate = resolve(root, path);
  if (!isWithin(root, candidate)) invalid("TASK-488 evidence path escapes repository root");
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
      invalid("TASK-488 PNG ownership is invalid");
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
      invalid("TASK-488 PNG changed while reading");
    }
    return bytes;
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    throw new SmokeError("smoke_output_invalid", "TASK-488 PNG is unavailable", { cause: error });
  } finally {
    await handle?.close();
  }
}

async function assertPrivateReportFile(directory: string): Promise<void> {
  const report = await lstat(resolve(directory, REPORT_FILE)).catch((error: unknown) => {
    throw new SmokeError("smoke_output_invalid", "TASK-488 report receipt is unavailable", {
      cause: error,
    });
  });
  if (report.isSymbolicLink() || !report.isFile() || report.nlink !== 1) {
    invalid("TASK-488 report receipt is invalid");
  }
}

export async function validateTask488ScreenshotOutputs(
  root: string,
  input: SmokeInput,
  manifest: Task488ScreenshotManifest
): Promise<readonly SmokeScreenshotResult[]> {
  assertExactTask488ScreenshotManifest(manifest, input);
  const directory = await assertNoFollowDirectories(root, input.session);
  const names = await readdir(directory);
  const expectedNames = manifest.paths.map((path) => path.slice(path.lastIndexOf("/") + 1));
  if (
    JSON.stringify([...names].sort()) !== JSON.stringify([...expectedNames, REPORT_FILE].sort())
  ) {
    invalid("TASK-488 screenshot evidence set is invalid");
  }
  await assertPrivateReportFile(directory);
  const canonicalRoot = await realpath(root);
  const results: SmokeScreenshotResult[] = [];
  for (const entry of manifest.entries) {
    const bytes = await readExactPng(canonicalRoot, entry.path);
    const decoded = decodeTask488Png(bytes);
    if (decoded.width !== entry.width || decoded.height !== entry.height) {
      invalid("TASK-488 screenshot dimensions drifted");
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (!SHA256.test(sha256)) invalid("TASK-488 PNG hash is invalid");
    results.push(Object.freeze({ path: entry.path, sha256 }));
  }
  if (results.length !== manifest.entries.length) {
    invalid("TASK-488 screenshot output cardinality is invalid");
  }
  return Object.freeze(results);
}

export function task488ScreenshotPathFor(
  manifest: Task488ScreenshotManifest,
  scenarioId: string,
  variantId: string
): string {
  const entry = manifest.entries.find(
    (candidate) => candidate.scenarioId === scenarioId && candidate.variantId === variantId
  );
  if (entry === undefined) invalid("TASK-488 screenshot row is absent");
  return entry.path;
}
