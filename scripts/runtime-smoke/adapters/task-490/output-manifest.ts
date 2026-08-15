// TASK-490 screenshot evidence manifest: bounded PNG validation and exact
// evidence-set proofs under the canonical evidence root. The runner owns
// report.json (pre-created before the adapter runs); the adapter owns the five
// scenario PNGs and proves the directory contains exactly those files.

import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath, type FileHandle } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { SmokeError, type SmokeInput } from "../../contracts";
import type { SmokeScreenshotResult } from "../types";
import { TASK490_SCENARIO_IDS } from "./browser-actions";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const MAX_PNG_BYTES = 16 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/u;
export const TASK490_EVIDENCE_ROOT = "_docs/_workflows/_smoke/evidence/task-490";
const REPORT_FILE = "report.json";

export interface Task490ScreenshotManifestEntry {
  readonly scenarioId: (typeof TASK490_SCENARIO_IDS)[number];
  readonly path: string;
}

export interface Task490ScreenshotManifest {
  readonly entries: readonly Task490ScreenshotManifestEntry[];
  readonly paths: readonly string[];
}

function invalid(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function screenshotPath(session: string, index: number, scenarioId: string): string {
  return `${TASK490_EVIDENCE_ROOT}/${session}/${String(index + 1).padStart(2, "0")}-${scenarioId}.png`;
}

export function buildExactTask490ScreenshotManifest(input: SmokeInput): Task490ScreenshotManifest {
  const entries = TASK490_SCENARIO_IDS.map((scenarioId, index) =>
    Object.freeze({ scenarioId, path: screenshotPath(input.session, index, scenarioId) })
  );
  return Object.freeze({
    entries: Object.freeze(entries),
    paths: Object.freeze(entries.map(({ path }) => path)),
  });
}

export function assertExactTask490ScreenshotManifest(
  input: SmokeInput,
  manifest: Task490ScreenshotManifest
): void {
  if (
    !Object.isFrozen(manifest) ||
    !Object.isFrozen(manifest.entries) ||
    !Object.isFrozen(manifest.paths) ||
    manifest.entries.length !== TASK490_SCENARIO_IDS.length ||
    manifest.paths.length !== TASK490_SCENARIO_IDS.length ||
    new Set(manifest.paths).size !== TASK490_SCENARIO_IDS.length
  ) {
    invalid("TASK-490 screenshot manifest cardinality is invalid");
  }
  for (const [index, scenarioId] of TASK490_SCENARIO_IDS.entries()) {
    const entry = manifest.entries[index];
    const path = screenshotPath(input.session, index, scenarioId);
    if (
      entry === undefined ||
      entry.scenarioId !== scenarioId ||
      entry.path !== path ||
      manifest.paths[index] !== path ||
      !Object.isFrozen(entry)
    ) {
      invalid("TASK-490 screenshot manifest row drifted");
    }
  }
}

function inside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

async function assertNoFollowEvidenceDirectory(root: string, session: string): Promise<string> {
  const canonicalRoot = await realpath(root).catch((error: unknown) => {
    throw new SmokeError("smoke_output_invalid", "TASK-490 repository root is unavailable", {
      cause: error,
    });
  });
  let current = canonicalRoot;
  for (const component of [...TASK490_EVIDENCE_ROOT.split("/"), session]) {
    current = resolve(current, component);
    if (!inside(canonicalRoot, current)) invalid("TASK-490 evidence escapes repository root");
    const metadata = await lstat(current).catch((error: unknown) => {
      throw new SmokeError("smoke_output_invalid", "TASK-490 evidence directory is unavailable", {
        cause: error,
      });
    });
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      invalid("TASK-490 evidence directory is invalid");
    }
  }
  return current;
}

async function readExactPng(root: string, path: string): Promise<Buffer> {
  const candidate = resolve(root, path);
  if (!inside(root, candidate)) invalid("TASK-490 evidence path escapes repository root");
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
      invalid("TASK-490 PNG ownership is invalid");
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
      invalid("TASK-490 PNG changed while reading");
    }
    return bytes;
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    throw new SmokeError("smoke_output_invalid", "TASK-490 PNG is unavailable", {
      cause: error,
    });
  } finally {
    await handle?.close();
  }
}

async function assertPrivateReportFile(directory: string): Promise<void> {
  const report = await lstat(resolve(directory, REPORT_FILE)).catch((error: unknown) => {
    throw new SmokeError("smoke_output_invalid", "TASK-490 report receipt is unavailable", {
      cause: error,
    });
  });
  if (report.isSymbolicLink() || !report.isFile() || report.nlink !== 1) {
    invalid("TASK-490 report receipt is invalid");
  }
}

export async function validateTask490ScreenshotOutputs(
  root: string,
  input: SmokeInput,
  manifest: Task490ScreenshotManifest
): Promise<readonly SmokeScreenshotResult[]> {
  assertExactTask490ScreenshotManifest(input, manifest);
  const directory = await assertNoFollowEvidenceDirectory(root, input.session);
  const names = await readdir(directory);
  const expectedNames = manifest.paths.map((path) => path.slice(path.lastIndexOf("/") + 1));
  if (
    JSON.stringify([...names].sort()) !== JSON.stringify([...expectedNames, REPORT_FILE].sort())
  ) {
    console.error(
      `[DIAG] screenshot set mismatch actual=${JSON.stringify([...names].sort())} expected=${JSON.stringify([...expectedNames, REPORT_FILE].sort())}`
    );
    invalid("TASK-490 screenshot evidence set is invalid");
  }
  await assertPrivateReportFile(directory);
  const canonicalRoot = await realpath(root);
  const results: SmokeScreenshotResult[] = [];
  for (const entry of manifest.entries) {
    const bytes = await readExactPng(canonicalRoot, entry.path);
    if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
      invalid("TASK-490 PNG signature is invalid");
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (!SHA256.test(sha256)) invalid("TASK-490 PNG hash is invalid");
    results.push(Object.freeze({ path: entry.path, sha256 }));
  }
  if (results.length !== TASK490_SCENARIO_IDS.length) {
    invalid("TASK-490 screenshot output cardinality is invalid");
  }
  return Object.freeze(results);
}
