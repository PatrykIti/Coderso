import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath, type FileHandle } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { assertExactKeys, isPlainObject, SmokeError, type SmokeInput } from "../../contracts";
import type { SmokeScreenshotResult } from "../types";
import { TASK517_SCENARIO_IDS, type Task517ScenarioId } from "./browser-actions";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const MAX_PNG_BYTES = 16 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/u;
const REPORT_FILE = "report.json";
export const EVIDENCE_ROOT = "_docs/_workflows/_smoke/evidence/task-517";

export interface Task517ScreenshotManifestEntry {
  readonly scenarioId: Task517ScenarioId;
  readonly path: string;
}

export interface Task517ScreenshotManifest {
  readonly entries: readonly Task517ScreenshotManifestEntry[];
  readonly paths: readonly string[];
}

function invalid(
  message: string,
  code: "smoke_argument_invalid" | "smoke_output_invalid" = "smoke_output_invalid"
): never {
  throw new SmokeError(code, message);
}

/**
 * The session name is task-scoped and arbitrary (the shared entry point owns
 * it via --session), so the invocation only pins command/suite/profile.
 */
export function assertExactTask517Invocation(value: unknown): asserts value is SmokeInput {
  if (!isPlainObject(value)) invalid("TASK-517 invocation is invalid", "smoke_argument_invalid");
  assertExactKeys(value, ["command", "suite", "profile", "session"], "TASK-517 invocation");
  if (
    value.command !== "run" ||
    value.suite !== "task-517" ||
    (value.profile !== "fast" && value.profile !== "certification") ||
    typeof value.session !== "string" ||
    value.session.length === 0
  ) {
    invalid("TASK-517 invocation is invalid", "smoke_argument_invalid");
  }
}

function screenshotPath(session: string, index: number, scenarioId: string): string {
  return `${EVIDENCE_ROOT}/${session}/${String(index + 1).padStart(2, "0")}-${scenarioId}.png`;
}

export function buildExactTask517ScreenshotManifest(input: SmokeInput): Task517ScreenshotManifest {
  assertExactTask517Invocation(input);
  const entries = TASK517_SCENARIO_IDS.map((scenarioId, index) =>
    Object.freeze({ scenarioId, path: screenshotPath(input.session, index, scenarioId) })
  );
  return Object.freeze({
    entries: Object.freeze(entries),
    paths: Object.freeze(entries.map(({ path }) => path)),
  });
}

export function assertExactTask517ScreenshotManifest(
  input: SmokeInput,
  manifest: Task517ScreenshotManifest
): void {
  assertExactTask517Invocation(input);
  if (
    !Object.isFrozen(manifest) ||
    !Object.isFrozen(manifest.entries) ||
    !Object.isFrozen(manifest.paths) ||
    manifest.entries.length !== TASK517_SCENARIO_IDS.length ||
    manifest.paths.length !== TASK517_SCENARIO_IDS.length ||
    new Set(manifest.paths).size !== TASK517_SCENARIO_IDS.length
  ) {
    invalid("TASK-517 screenshot manifest cardinality is invalid");
  }
  for (const [index, scenarioId] of TASK517_SCENARIO_IDS.entries()) {
    const entry = manifest.entries[index];
    const path = screenshotPath(input.session, index, scenarioId);
    if (
      entry === undefined ||
      entry.scenarioId !== scenarioId ||
      entry.path !== path ||
      manifest.paths[index] !== path ||
      !Object.isFrozen(entry)
    ) {
      invalid("TASK-517 screenshot manifest row drifted");
    }
  }
}

export function manifestDigest(manifest: Task517ScreenshotManifest): string {
  return createHash("sha256")
    .update(JSON.stringify(manifest.entries.map(({ path }) => path)))
    .digest("hex");
}

function inside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

async function assertNoFollowDirectories(root: string, session: string): Promise<string> {
  let current = root;
  const directory = resolve(root, EVIDENCE_ROOT, session);
  if (!inside(root, directory)) invalid("TASK-517 evidence directory escapes repository root");
  const segments = relative(root, directory).split("/");
  for (const segment of segments) {
    current = resolve(current, segment);
    const metadata = await lstat(current).catch((error: unknown) => {
      throw new SmokeError("smoke_output_invalid", "TASK-517 evidence directory is unavailable", {
        cause: error,
      });
    });
    if (metadata.isSymbolicLink() || !metadata.isDirectory())
      invalid("TASK-517 evidence directory is invalid");
  }
  return current;
}

async function readExactPng(root: string, path: string): Promise<Buffer> {
  const candidate = resolve(root, path);
  if (!inside(root, candidate)) invalid("TASK-517 evidence path escapes repository root");
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
      invalid("TASK-517 PNG ownership is invalid");
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
      invalid("TASK-517 PNG changed while reading");
    }
    return bytes;
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    throw new SmokeError("smoke_output_invalid", "TASK-517 PNG is unavailable", { cause: error });
  } finally {
    await handle?.close();
  }
}

/** Bounded PNG structure check: signature, IHDR dims, IEND trailer, CRC of IHDR. */
function assertStructuredPng(bytes: Buffer): void {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    invalid("TASK-517 PNG signature is invalid");
  }
  const ihdrLength = bytes.readUInt32BE(8);
  const ihdrType = bytes.subarray(12, 16).toString("latin1");
  if (ihdrLength !== 13 || ihdrType !== "IHDR") invalid("TASK-517 PNG IHDR is invalid");
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1 || width > 16_384 || height > 16_384) {
    invalid("TASK-517 PNG dimensions are invalid");
  }
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    invalid("TASK-517 PNG encoding is unsupported");
  }
  // The last chunk is IEND: four length bytes, then the "IEND" type, then a CRC.
  if (bytes.subarray(bytes.length - 8, bytes.length - 4).toString("latin1") !== "IEND") {
    invalid("TASK-517 PNG trailer is invalid");
  }
}

export async function validateTask517ScreenshotOutputs(
  root: string,
  input: SmokeInput,
  manifest: Task517ScreenshotManifest
): Promise<readonly SmokeScreenshotResult[]> {
  assertExactTask517ScreenshotManifest(input, manifest);
  const directory = await assertNoFollowDirectories(root, input.session);
  const names = await readdir(directory);
  const expectedNames = manifest.paths.map((path) => path.slice(path.lastIndexOf("/") + 1));
  if (
    JSON.stringify([...names].sort()) !== JSON.stringify([...expectedNames, REPORT_FILE].sort())
  ) {
    console.error(
      `[DIAG] screenshot set mismatch actual=${JSON.stringify([...names].sort())} expected=${JSON.stringify(
        [...expectedNames, REPORT_FILE].sort()
      )}`
    );
    invalid("TASK-517 screenshot evidence set is invalid");
  }
  const report = await lstat(resolve(directory, REPORT_FILE)).catch((error: unknown) => {
    throw new SmokeError("smoke_output_invalid", "TASK-517 report receipt is unavailable", {
      cause: error,
    });
  });
  if (report.isSymbolicLink() || !report.isFile() || report.nlink !== 1) {
    invalid("TASK-517 report receipt is invalid");
  }
  const canonicalRoot = await realpath(root);
  const results: SmokeScreenshotResult[] = [];
  for (const entry of manifest.entries) {
    const bytes = await readExactPng(canonicalRoot, entry.path);
    assertStructuredPng(bytes);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (!SHA256.test(sha256)) invalid("TASK-517 PNG hash is invalid");
    results.push(Object.freeze({ path: entry.path, sha256 }));
  }
  if (results.length !== TASK517_SCENARIO_IDS.length) {
    invalid("TASK-517 screenshot output cardinality is invalid");
  }
  return Object.freeze(results);
}
