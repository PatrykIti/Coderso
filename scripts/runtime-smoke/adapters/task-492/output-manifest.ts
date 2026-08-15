import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath, type FileHandle } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { assertExactKeys, isPlainObject, SmokeError, type SmokeInput } from "../../contracts";
import type { SmokeScreenshotResult } from "../types";
import { TASK492_SCENARIO_IDS, type Task492ScenarioId } from "./browser-actions";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const MAX_PNG_BYTES = 16 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/u;
const SESSION = /^[a-z][a-z0-9-]{2,63}$/u;
export const TASK492_EVIDENCE_ROOT = "_docs/_workflows/_smoke/evidence/task-492";
const REPORT_FILE = "report.json";

export interface Task492ScreenshotManifestEntry {
  readonly scenarioId: Task492ScenarioId;
  readonly path: string;
}

export interface Task492ScreenshotManifest {
  readonly entries: readonly Task492ScreenshotManifestEntry[];
  readonly paths: readonly string[];
}

function invalid(
  message: string,
  code: "smoke_argument_invalid" | "smoke_output_invalid" = "smoke_output_invalid"
): never {
  throw new SmokeError(code, message);
}

export function assertExactTask492Invocation(value: unknown): asserts value is SmokeInput {
  if (!isPlainObject(value)) invalid("TASK-492 invocation is invalid", "smoke_argument_invalid");
  assertExactKeys(value, ["command", "suite", "profile", "session"], "TASK-492 invocation");
  if (
    value.command !== "run" ||
    value.suite !== "task-492" ||
    (value.profile !== "fast" && value.profile !== "certification") ||
    typeof value.session !== "string" ||
    !SESSION.test(value.session)
  ) {
    invalid("TASK-492 invocation is invalid", "smoke_argument_invalid");
  }
}

function screenshotPath(session: string, index: number, scenarioId: Task492ScenarioId): string {
  return `${TASK492_EVIDENCE_ROOT}/${session}/${String(index + 1).padStart(2, "0")}-${scenarioId}.png`;
}

export function buildExactTask492ScreenshotManifest(input: SmokeInput): Task492ScreenshotManifest {
  assertExactTask492Invocation(input);
  const entries = TASK492_SCENARIO_IDS.map((scenarioId, index) =>
    Object.freeze({ scenarioId, path: screenshotPath(input.session, index, scenarioId) })
  );
  return Object.freeze({
    entries: Object.freeze(entries),
    paths: Object.freeze(entries.map(({ path }) => path)),
  });
}

export function assertExactTask492ScreenshotManifest(
  input: SmokeInput,
  manifest: Task492ScreenshotManifest
): void {
  assertExactTask492Invocation(input);
  if (
    !Object.isFrozen(manifest) ||
    !Object.isFrozen(manifest.entries) ||
    !Object.isFrozen(manifest.paths) ||
    manifest.entries.length !== TASK492_SCENARIO_IDS.length ||
    manifest.paths.length !== TASK492_SCENARIO_IDS.length ||
    new Set(manifest.paths).size !== TASK492_SCENARIO_IDS.length
  ) {
    invalid("TASK-492 screenshot manifest cardinality is invalid");
  }
  for (const [index, scenarioId] of TASK492_SCENARIO_IDS.entries()) {
    const entry = manifest.entries[index];
    const path = screenshotPath(input.session, index, scenarioId);
    if (
      entry === undefined ||
      entry.scenarioId !== scenarioId ||
      entry.path !== path ||
      manifest.paths[index] !== path ||
      !Object.isFrozen(entry)
    ) {
      invalid("TASK-492 screenshot manifest row drifted");
    }
  }
}

function inside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

async function assertNoFollowDirectories(root: string, session: string): Promise<string> {
  const canonicalRoot = await realpath(root).catch((error: unknown) => {
    throw new SmokeError("smoke_output_invalid", "TASK-492 repository root is unavailable", {
      cause: error,
    });
  });
  let current = canonicalRoot;
  for (const component of [...TASK492_EVIDENCE_ROOT.split("/"), session]) {
    current = resolve(current, component);
    if (!inside(canonicalRoot, current)) invalid("TASK-492 evidence escapes repository root");
    const metadata = await lstat(current).catch((error: unknown) => {
      throw new SmokeError("smoke_output_invalid", "TASK-492 evidence directory is unavailable", {
        cause: error,
      });
    });
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      invalid("TASK-492 evidence directory is invalid");
    }
  }
  return current;
}

async function readExactPng(root: string, path: string): Promise<Buffer> {
  const candidate = resolve(root, path);
  if (!inside(root, candidate)) invalid("TASK-492 evidence path escapes repository root");
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
      invalid("TASK-492 PNG ownership is invalid");
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
      invalid("TASK-492 PNG changed while reading");
    }
    return bytes;
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    throw new SmokeError("smoke_output_invalid", "TASK-492 PNG is unavailable", { cause: error });
  } finally {
    await handle?.close();
  }
}

function assertPng(bytes: Buffer): void {
  if (bytes.byteLength < PNG_SIGNATURE.length) invalid("TASK-492 PNG signature is invalid");
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    invalid("TASK-492 PNG signature is invalid");
  }
}

async function assertPrivateReportFile(directory: string): Promise<void> {
  const report = await lstat(resolve(directory, REPORT_FILE)).catch((error: unknown) => {
    throw new SmokeError("smoke_output_invalid", "TASK-492 report receipt is unavailable", {
      cause: error,
    });
  });
  if (report.isSymbolicLink() || !report.isFile() || report.nlink !== 1) {
    invalid("TASK-492 report receipt is invalid");
  }
}

export async function validateTask492ScreenshotOutputs(
  root: string,
  input: SmokeInput,
  manifest: Task492ScreenshotManifest
): Promise<readonly SmokeScreenshotResult[]> {
  assertExactTask492ScreenshotManifest(input, manifest);
  const directory = await assertNoFollowDirectories(root, input.session);
  const names = await readdir(directory);
  const expectedNames = manifest.paths.map((path) => path.slice(path.lastIndexOf("/") + 1));
  if (
    JSON.stringify([...names].sort()) !== JSON.stringify([...expectedNames, REPORT_FILE].sort())
  ) {
    invalid("TASK-492 screenshot evidence set is invalid");
  }
  await assertPrivateReportFile(directory);
  const canonicalRoot = await realpath(root);
  const results: SmokeScreenshotResult[] = [];
  for (const entry of manifest.entries) {
    const bytes = await readExactPng(canonicalRoot, entry.path);
    assertPng(bytes);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (!SHA256.test(sha256)) invalid("TASK-492 PNG hash is invalid");
    results.push(Object.freeze({ path: entry.path, sha256 }));
  }
  if (results.length !== TASK492_SCENARIO_IDS.length) {
    invalid("TASK-492 screenshot output cardinality is invalid");
  }
  return Object.freeze(results);
}
