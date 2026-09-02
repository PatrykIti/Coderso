import { createHash, randomBytes } from "node:crypto";
import { constants, type BigIntStats } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  unlink,
  type FileHandle,
} from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

import { SmokeError, resolveInsideRoot, type SmokeInput } from "../../contracts";
import type { SmokeScreenshotResult } from "../types";

/** Canonical report evidence root for TASK-540. */
export const EVIDENCE_ROOT = "_docs/_workflows/_smoke/evidence/task-540";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const MAXIMUM_PNG_BYTES = 16 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/u;
const SESSION = /^[a-z][a-z0-9-]{2,63}$/u;
const REPORT_FILE = "report.json";
const SCREENSHOTS_DIRECTORY = "screenshots";

// This is deliberately independent from the native plan's runtime object. A
// plan mutation cannot silently retarget archival output outside this frozen
// source set.
export const TASK540_FLAT_SCREENSHOT_PATHS = Object.freeze([
  "_docs/_workflows/_smoke/task-540-wf540smoke-button-image-light.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-media-prior-pending.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-tabs-content-dark.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-tabs-keyboard-light.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-space-selection-dark.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-dirty-save-failure.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-dirty-guards-final.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-related-first-failure.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-related-a-stale.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-related-b-dark.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-light.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-b-dark.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-converged.png",
] as const);

export interface Task540ArchiveManifestEntry {
  readonly sourcePath: string;
  readonly archivePath: string;
  readonly filename: string;
}

export interface Task540ArchiveManifest {
  readonly session: string;
  readonly entries: readonly Task540ArchiveManifestEntry[];
  readonly sourcePaths: readonly string[];
  readonly archivePaths: readonly string[];
}

interface Task540StableFileIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
  readonly mode: number;
}

interface Task540ObservedFile extends Task540StableFileIdentity {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: Buffer;
}

export interface Task540FlatScreenshotBaselineEntry {
  readonly sourcePath: string;
  readonly baseline: Task540ObservedFile | null;
}

export interface Task540FlatScreenshotBaseline {
  readonly entries: readonly Task540FlatScreenshotBaselineEntry[];
}

export interface Task540GeneratedScreenshotObservation {
  readonly sourcePath: string;
  readonly generated: Task540ObservedFile;
}

export interface Task540GeneratedScreenshotObservations {
  readonly entries: readonly Task540GeneratedScreenshotObservation[];
}

export interface Task540ArchivedScreenshotResult {
  readonly archivedScreenshots: readonly SmokeScreenshotResult[];
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

function assertTask540Invocation(input: SmokeInput): void {
  if (
    input.command !== "run" ||
    input.suite !== "task-540" ||
    (input.profile !== "fast" && input.profile !== "certification") ||
    !SESSION.test(input.session)
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 archive invocation is invalid");
  }
}

function assertRepositoryPath(path: string, label: string): void {
  if (
    path.length === 0 ||
    path.includes("\0") ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path === "." ||
    path.startsWith("../") ||
    path.includes("/../") ||
    path.split("/").includes(".")
  ) {
    invalid(`TASK-540 ${label} is invalid`);
  }
}

function absoluteRepositoryPath(root: string, path: string, label: string): string {
  assertRepositoryPath(path, label);
  const candidate = resolve(root, path);
  if (!isWithin(root, candidate)) invalid(`TASK-540 ${label} escapes repository root`);
  return candidate;
}

function stableIdentity(stats: BigIntStats): Task540StableFileIdentity {
  return Object.freeze({
    dev: stats.dev,
    ino: stats.ino,
    size: stats.size,
    mtimeNs: stats.mtimeNs,
    ctimeNs: stats.ctimeNs,
    mode: Number(stats.mode) & 0o777,
  });
}

function sameIdentity(left: Task540StableFileIdentity, right: Task540StableFileIdentity): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs &&
    left.mode === right.mode
  );
}

async function canonicalRoot(root: string): Promise<string> {
  try {
    return await realpath(root);
  } catch (error) {
    return invalid("TASK-540 repository root is unavailable", error);
  }
}

async function assertTrustedDirectory(root: string, repositoryDirectory: string): Promise<string> {
  const directory = absoluteRepositoryPath(root, repositoryDirectory, "directory");
  const segments = relative(root, directory).split("/").filter(Boolean);
  let current = root;
  for (const segment of segments) {
    current = resolve(current, segment);
    let metadata: Awaited<ReturnType<typeof lstat>>;
    try {
      metadata = await lstat(current);
    } catch (error) {
      return invalid("TASK-540 evidence directory is unavailable", error);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      invalid("TASK-540 evidence directory is not a trusted directory");
    }
    let canonical: string;
    try {
      canonical = await realpath(current);
    } catch (error) {
      return invalid("TASK-540 evidence directory is unavailable", error);
    }
    if (canonical !== current || !isWithin(root, canonical)) {
      invalid("TASK-540 evidence directory escapes repository root");
    }
  }
  return directory;
}

async function assertTrustedParent(root: string, repositoryPath: string): Promise<string> {
  const path = absoluteRepositoryPath(root, repositoryPath, "file path");
  const parent = relative(root, dirname(path));
  if (parent !== "") await assertTrustedDirectory(root, parent);
  return path;
}

async function readNoFollowRegularFile(
  root: string,
  repositoryPath: string,
  label: string,
  requirePng: boolean
): Promise<Task540ObservedFile> {
  const path = await assertTrustedParent(root, repositoryPath);
  let handle: FileHandle | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const descriptor = await handle.stat({ bigint: true });
    const before = stableIdentity(descriptor);
    if (
      !descriptor.isFile() ||
      before.size <= 0n ||
      before.size > BigInt(MAXIMUM_PNG_BYTES) ||
      descriptor.nlink !== 1n
    ) {
      invalid(`TASK-540 ${label} ownership is invalid`);
    }
    const bytes = await handle.readFile();
    const after = stableIdentity(await handle.stat({ bigint: true }));
    const current = await lstat(path, { bigint: true });
    const currentIdentity = stableIdentity(current);
    if (
      !current.isFile() ||
      current.isSymbolicLink() ||
      current.nlink !== 1n ||
      !sameIdentity(before, after) ||
      !sameIdentity(after, currentIdentity) ||
      BigInt(bytes.byteLength) !== before.size
    ) {
      invalid(`TASK-540 ${label} changed while reading`);
    }
    if (requirePng && !bytes.subarray(0, PNG_SIGNATURE.byteLength).equals(PNG_SIGNATURE)) {
      invalid(`TASK-540 ${label} is not a PNG`);
    }
    return Object.freeze({
      ...after,
      path: repositoryPath,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: Buffer.from(bytes),
    });
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    return invalid(`TASK-540 ${label} is unavailable`, error);
  } finally {
    await handle?.close();
  }
}

function assertExactSourcePaths(sourcePaths: readonly string[]): void {
  if (
    !Array.isArray(sourcePaths) ||
    sourcePaths.length !== TASK540_FLAT_SCREENSHOT_PATHS.length ||
    sourcePaths.some((path, index) => path !== TASK540_FLAT_SCREENSHOT_PATHS[index])
  ) {
    invalid("TASK-540 flat screenshot manifest drifted");
  }
}

function archivePathFor(session: string, sourcePath: string): string {
  return `${EVIDENCE_ROOT}/${session}/${SCREENSHOTS_DIRECTORY}/${basename(sourcePath)}`;
}

export function buildExactTask540ArchiveManifest(
  input: SmokeInput,
  sourcePaths: readonly string[] = TASK540_FLAT_SCREENSHOT_PATHS
): Task540ArchiveManifest {
  assertTask540Invocation(input);
  assertExactSourcePaths(sourcePaths);
  const entries = sourcePaths.map((sourcePath) => {
    const filename = basename(sourcePath);
    if (
      !filename.endsWith(".png") ||
      filename !== sourcePath.slice(sourcePath.lastIndexOf("/") + 1)
    ) {
      invalid("TASK-540 flat screenshot filename is invalid");
    }
    return Object.freeze({
      sourcePath,
      archivePath: archivePathFor(input.session, sourcePath),
      filename,
    });
  });
  const sourceSet = new Set(entries.map(({ sourcePath }) => sourcePath));
  const archiveSet = new Set(entries.map(({ archivePath }) => archivePath));
  const filenameSet = new Set(entries.map(({ filename }) => filename));
  if (
    sourceSet.size !== entries.length ||
    archiveSet.size !== entries.length ||
    filenameSet.size !== entries.length
  ) {
    invalid("TASK-540 archive manifest has duplicate paths");
  }
  return Object.freeze({
    session: input.session,
    entries: Object.freeze(entries),
    sourcePaths: Object.freeze(entries.map(({ sourcePath }) => sourcePath)),
    archivePaths: Object.freeze(entries.map(({ archivePath }) => archivePath)),
  });
}

export function assertExactTask540ArchiveManifest(
  input: SmokeInput,
  manifest: Task540ArchiveManifest
): void {
  assertTask540Invocation(input);
  if (
    !Object.isFrozen(manifest) ||
    !Object.isFrozen(manifest.entries) ||
    !Object.isFrozen(manifest.sourcePaths) ||
    !Object.isFrozen(manifest.archivePaths) ||
    manifest.session !== input.session ||
    manifest.entries.length !== TASK540_FLAT_SCREENSHOT_PATHS.length ||
    manifest.sourcePaths.length !== TASK540_FLAT_SCREENSHOT_PATHS.length ||
    manifest.archivePaths.length !== TASK540_FLAT_SCREENSHOT_PATHS.length
  ) {
    invalid("TASK-540 archive manifest cardinality is invalid");
  }
  for (const [index, sourcePath] of TASK540_FLAT_SCREENSHOT_PATHS.entries()) {
    const entry = manifest.entries[index];
    const expectedArchivePath = archivePathFor(input.session, sourcePath);
    if (
      entry === undefined ||
      !Object.isFrozen(entry) ||
      entry.sourcePath !== sourcePath ||
      entry.archivePath !== expectedArchivePath ||
      entry.filename !== basename(sourcePath) ||
      manifest.sourcePaths[index] !== sourcePath ||
      manifest.archivePaths[index] !== expectedArchivePath
    ) {
      invalid("TASK-540 archive manifest row drifted");
    }
  }
  if (
    new Set(manifest.sourcePaths).size !== manifest.sourcePaths.length ||
    new Set(manifest.archivePaths).size !== manifest.archivePaths.length ||
    new Set(manifest.entries.map(({ filename }) => filename)).size !== manifest.entries.length
  ) {
    invalid("TASK-540 archive manifest has duplicate paths");
  }
}

export function task540EvidenceDirectory(input: SmokeInput, root: string): string {
  assertTask540Invocation(input);
  return resolveInsideRoot(root, `${EVIDENCE_ROOT}/${input.session}`, "task_540_evidence");
}

function assertExactScreenshotProjection(
  manifest: Task540ArchiveManifest,
  screenshots: readonly SmokeScreenshotResult[],
  kind: "native" | "archived"
): void {
  const expectedPaths = kind === "native" ? manifest.sourcePaths : manifest.archivePaths;
  if (!Array.isArray(screenshots) || screenshots.length !== expectedPaths.length) {
    invalid(`TASK-540 ${kind} screenshot projection is invalid`);
  }
  const paths = new Set<string>();
  for (const [index, candidate] of (screenshots as readonly unknown[]).entries()) {
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
      invalid(`TASK-540 ${kind} screenshot projection is invalid`);
    }
    const screenshot = candidate as Partial<SmokeScreenshotResult>;
    if (
      typeof screenshot.path !== "string" ||
      screenshot.path !== expectedPaths[index] ||
      typeof screenshot.sha256 !== "string" ||
      !SHA256.test(screenshot.sha256) ||
      paths.has(screenshot.path)
    ) {
      invalid(`TASK-540 ${kind} screenshot projection drifted`);
    }
    paths.add(screenshot.path);
  }
}

export function projectTask540ArchivedScreenshots(
  input: SmokeInput,
  manifest: Task540ArchiveManifest,
  screenshots: readonly SmokeScreenshotResult[]
): readonly SmokeScreenshotResult[] {
  assertExactTask540ArchiveManifest(input, manifest);
  assertExactScreenshotProjection(manifest, screenshots, "archived");
  return Object.freeze(screenshots.map(({ path, sha256 }) => Object.freeze({ path, sha256 })));
}

export async function captureTask540FlatScreenshotBaseline(
  root: string,
  manifest: Task540ArchiveManifest
): Promise<Task540FlatScreenshotBaseline> {
  const canonical = await canonicalRoot(root);
  const entries: Task540FlatScreenshotBaselineEntry[] = [];
  for (const { sourcePath } of manifest.entries) {
    let baseline: Task540ObservedFile | null = null;
    try {
      baseline = await readNoFollowRegularFile(
        canonical,
        sourcePath,
        "flat screenshot baseline",
        false
      );
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | null)?.cause as
        NodeJS.ErrnoException | undefined;
      if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT" || code?.code === "ENOENT") {
        baseline = null;
      } else {
        throw error;
      }
    }
    entries.push(Object.freeze({ sourcePath, baseline }));
  }
  return Object.freeze({ entries: Object.freeze(entries) });
}

export async function captureTask540GeneratedScreenshotObservations(
  root: string,
  manifest: Task540ArchiveManifest,
  nativeScreenshots: readonly SmokeScreenshotResult[]
): Promise<Task540GeneratedScreenshotObservations> {
  assertExactScreenshotProjection(manifest, nativeScreenshots, "native");
  const canonical = await canonicalRoot(root);
  const entries: Task540GeneratedScreenshotObservation[] = [];
  for (const [index, entry] of manifest.entries.entries()) {
    const expected = nativeScreenshots[index];
    if (expected === undefined) invalid("TASK-540 native screenshot projection is absent");
    const generated = await readNoFollowRegularFile(
      canonical,
      entry.sourcePath,
      "generated flat screenshot",
      true
    );
    if (generated.sha256 !== expected.sha256) {
      invalid("TASK-540 generated flat screenshot hash drifted");
    }
    entries.push(Object.freeze({ sourcePath: entry.sourcePath, generated }));
  }
  return Object.freeze({ entries: Object.freeze(entries) });
}

function assertExactGeneratedObservations(
  manifest: Task540ArchiveManifest,
  observations: Task540GeneratedScreenshotObservations
): void {
  if (!Object.isFrozen(observations) || !Object.isFrozen(observations.entries)) {
    invalid("TASK-540 generated screenshot observations are invalid");
  }
  if (observations.entries.length !== manifest.entries.length) {
    invalid("TASK-540 generated screenshot observation cardinality is invalid");
  }
  for (const [index, entry] of observations.entries.entries()) {
    const expected = manifest.entries[index];
    if (
      expected === undefined ||
      entry.sourcePath !== expected.sourcePath ||
      entry.generated.path !== expected.sourcePath ||
      !SHA256.test(entry.generated.sha256)
    ) {
      invalid("TASK-540 generated screenshot observation drifted");
    }
  }
}

async function assertInitialEvidenceDirectory(
  root: string,
  input: SmokeInput,
  manifest: Task540ArchiveManifest
): Promise<string> {
  assertExactTask540ArchiveManifest(input, manifest);
  const directory = await assertTrustedDirectory(root, `${EVIDENCE_ROOT}/${input.session}`);
  const names = (await readdir(directory)).sort();
  if (JSON.stringify(names) !== JSON.stringify([REPORT_FILE])) {
    invalid("TASK-540 evidence directory already contains archive output");
  }
  const report = await lstat(resolve(directory, REPORT_FILE), { bigint: true });
  if (
    report.isSymbolicLink() ||
    !report.isFile() ||
    report.nlink !== 1n ||
    (Number(report.mode) & 0o777) !== 0o600
  ) {
    invalid("TASK-540 evidence report ownership is invalid");
  }
  return directory;
}

async function writeNewNoFollowPng(
  root: string,
  repositoryPath: string,
  bytes: Buffer,
  expectedSha256: string
): Promise<SmokeScreenshotResult> {
  const path = await assertTrustedParent(root, repositoryPath);
  let handle: FileHandle | undefined;
  try {
    handle = await open(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    );
    const before = stableIdentity(await handle.stat({ bigint: true }));
    if (
      !SHA256.test(expectedSha256) ||
      before.size !== 0n ||
      (await handle.stat({ bigint: true })).nlink !== 1n
    ) {
      invalid("TASK-540 archive screenshot ownership is invalid");
    }
    await handle.writeFile(bytes);
    await handle.chmod(0o600);
    const after = stableIdentity(await handle.stat({ bigint: true }));
    const current = await lstat(path, { bigint: true });
    if (
      !current.isFile() ||
      current.isSymbolicLink() ||
      current.nlink !== 1n ||
      !sameIdentity(after, stableIdentity(current)) ||
      (Number(current.mode) & 0o777) !== 0o600
    ) {
      invalid("TASK-540 archive screenshot changed while writing");
    }
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    return invalid("TASK-540 archive screenshot cannot be created without overwrite", error);
  } finally {
    await handle?.close();
  }
  const verified = await readNoFollowRegularFile(root, repositoryPath, "archived screenshot", true);
  if (verified.sha256 !== expectedSha256 || (verified.mode & 0o777) !== 0o600) {
    invalid("TASK-540 archive screenshot hash drifted");
  }
  return Object.freeze({ path: repositoryPath, sha256: verified.sha256 });
}

export async function archiveTask540ObservedScreenshots(
  root: string,
  input: SmokeInput,
  manifest: Task540ArchiveManifest,
  observations: Task540GeneratedScreenshotObservations
): Promise<Task540ArchivedScreenshotResult> {
  assertExactTask540ArchiveManifest(input, manifest);
  assertExactGeneratedObservations(manifest, observations);
  const canonical = await canonicalRoot(root);
  const directory = await assertInitialEvidenceDirectory(canonical, input, manifest);
  const screenshotsDirectory = resolve(directory, SCREENSHOTS_DIRECTORY);
  try {
    await mkdir(screenshotsDirectory, { mode: 0o700 });
  } catch (error) {
    return invalid(
      "TASK-540 archive screenshots directory cannot be created without overwrite",
      error
    );
  }
  const screenshotDirectoryMetadata = await lstat(screenshotsDirectory);
  if (screenshotDirectoryMetadata.isSymbolicLink() || !screenshotDirectoryMetadata.isDirectory()) {
    invalid("TASK-540 archive screenshots directory is invalid");
  }
  const archivedScreenshots: SmokeScreenshotResult[] = [];
  for (const [index, entry] of manifest.entries.entries()) {
    const observed = observations.entries[index];
    if (observed === undefined) invalid("TASK-540 generated screenshot observation is absent");
    const current = await readNoFollowRegularFile(
      canonical,
      entry.sourcePath,
      "generated flat screenshot",
      true
    );
    if (
      !sameIdentity(current, observed.generated) ||
      current.sha256 !== observed.generated.sha256
    ) {
      invalid("TASK-540 generated flat screenshot identity drifted before archive");
    }
    archivedScreenshots.push(
      await writeNewNoFollowPng(canonical, entry.archivePath, current.bytes, current.sha256)
    );
  }
  const projected = projectTask540ArchivedScreenshots(input, manifest, archivedScreenshots);
  return Object.freeze({ archivedScreenshots: projected });
}

export async function archiveTask540Screenshots(
  root: string,
  input: SmokeInput,
  manifest: Task540ArchiveManifest,
  nativeScreenshots: readonly SmokeScreenshotResult[],
  observations?: Task540GeneratedScreenshotObservations
): Promise<Task540ArchivedScreenshotResult> {
  const captured =
    observations ??
    (await captureTask540GeneratedScreenshotObservations(root, manifest, nativeScreenshots));
  return archiveTask540ObservedScreenshots(root, input, manifest, captured);
}

async function assertCurrentMatchesGenerated(
  root: string,
  expected: Task540ObservedFile
): Promise<Task540ObservedFile> {
  const current = await readNoFollowRegularFile(
    root,
    expected.path,
    "flat screenshot restoration target",
    true
  );
  if (!sameIdentity(current, expected) || current.sha256 !== expected.sha256) {
    invalid("TASK-540 flat screenshot restoration refused identity drift");
  }
  return current;
}

async function replaceWithBaseline(
  root: string,
  sourcePath: string,
  expectedGenerated: Task540ObservedFile,
  baseline: Task540ObservedFile
): Promise<void> {
  const target = await assertTrustedParent(root, sourcePath);
  const temporaryPath = resolve(
    dirname(target),
    `.task540-restore-${randomBytes(16).toString("hex")}.tmp`
  );
  let handle: FileHandle | undefined;
  let temporaryCreated = false;
  try {
    handle = await open(
      temporaryPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    );
    temporaryCreated = true;
    await handle.writeFile(baseline.bytes);
    await handle.chmod(baseline.mode);
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    return invalid("TASK-540 flat screenshot restoration file cannot be created", error);
  } finally {
    await handle?.close();
  }
  try {
    const temporary = await readNoFollowRegularFile(
      root,
      relative(root, temporaryPath),
      "flat screenshot restoration file",
      false
    );
    if (temporary.sha256 !== baseline.sha256 || temporary.mode !== baseline.mode) {
      invalid("TASK-540 flat screenshot restoration file drifted");
    }
    // This second observation is intentionally immediately adjacent to the
    // atomic replacement. It refuses a detected external writer; no portable
    // filesystem primitive can make an unconstrained producer race safe.
    await assertCurrentMatchesGenerated(root, expectedGenerated);
    await rename(temporaryPath, target);
    temporaryCreated = false;
    const restored = await readNoFollowRegularFile(
      root,
      sourcePath,
      "restored flat screenshot",
      false
    );
    if (restored.sha256 !== baseline.sha256 || restored.mode !== baseline.mode) {
      invalid("TASK-540 flat screenshot restoration result drifted");
    }
  } finally {
    if (temporaryCreated) {
      const metadata = await lstat(temporaryPath, { bigint: true }).catch(() => null);
      if (metadata?.isFile() && !metadata.isSymbolicLink() && metadata.nlink === 1n) {
        await unlink(temporaryPath).catch(() => undefined);
      }
    }
  }
}

async function removeGeneratedOutput(
  root: string,
  sourcePath: string,
  expectedGenerated: Task540ObservedFile
): Promise<void> {
  const target = await assertTrustedParent(root, sourcePath);
  await assertCurrentMatchesGenerated(root, expectedGenerated);
  try {
    await unlink(target);
  } catch (error) {
    return invalid("TASK-540 flat screenshot restoration cannot remove generated output", error);
  }
  const remaining = await lstat(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (remaining !== null) invalid("TASK-540 flat screenshot restoration removal drifted");
}

export async function restoreTask540FlatScreenshotBaseline(
  root: string,
  manifest: Task540ArchiveManifest,
  baseline: Task540FlatScreenshotBaseline,
  observations: Task540GeneratedScreenshotObservations
): Promise<void> {
  assertExactGeneratedObservations(manifest, observations);
  if (!Object.isFrozen(baseline) || !Object.isFrozen(baseline.entries)) {
    invalid("TASK-540 flat screenshot baseline is invalid");
  }
  if (baseline.entries.length !== manifest.entries.length) {
    invalid("TASK-540 flat screenshot baseline cardinality is invalid");
  }
  const canonical = await canonicalRoot(root);
  const failures: unknown[] = [];
  for (const [index, entry] of manifest.entries.entries()) {
    const baselineEntry = baseline.entries[index];
    const observedEntry = observations.entries[index];
    if (
      baselineEntry === undefined ||
      observedEntry === undefined ||
      baselineEntry.sourcePath !== entry.sourcePath ||
      observedEntry.sourcePath !== entry.sourcePath
    ) {
      invalid("TASK-540 flat screenshot baseline row drifted");
    }
    try {
      if (baselineEntry.baseline === null) {
        await removeGeneratedOutput(canonical, entry.sourcePath, observedEntry.generated);
      } else {
        await replaceWithBaseline(
          canonical,
          entry.sourcePath,
          observedEntry.generated,
          baselineEntry.baseline
        );
      }
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-540 flat screenshot restoration failed", {
      cause: new AggregateError(failures, "TASK-540 flat screenshot restoration failures"),
    });
  }
}

export async function assertExactTask540EvidenceDirectory(
  root: string,
  input: SmokeInput,
  manifest: Task540ArchiveManifest,
  archivedScreenshots: readonly SmokeScreenshotResult[]
): Promise<void> {
  assertExactTask540ArchiveManifest(input, manifest);
  const projected = projectTask540ArchivedScreenshots(input, manifest, archivedScreenshots);
  const canonical = await canonicalRoot(root);
  const directory = await assertTrustedDirectory(canonical, `${EVIDENCE_ROOT}/${input.session}`);
  const names = (await readdir(directory)).sort();
  if (JSON.stringify(names) !== JSON.stringify([REPORT_FILE, SCREENSHOTS_DIRECTORY])) {
    invalid("TASK-540 evidence directory tree is invalid");
  }
  const report = await lstat(resolve(directory, REPORT_FILE), { bigint: true });
  if (
    report.isSymbolicLink() ||
    !report.isFile() ||
    report.nlink !== 1n ||
    (Number(report.mode) & 0o777) !== 0o600
  ) {
    invalid("TASK-540 evidence report ownership is invalid");
  }
  const screenshotsDirectory = resolve(directory, SCREENSHOTS_DIRECTORY);
  const screenshotDirectoryMetadata = await lstat(screenshotsDirectory, { bigint: true });
  if (screenshotDirectoryMetadata.isSymbolicLink() || !screenshotDirectoryMetadata.isDirectory()) {
    invalid("TASK-540 evidence screenshots directory is invalid");
  }
  const actualNames = (await readdir(screenshotsDirectory)).sort();
  const expectedNames = manifest.entries.map(({ filename }) => filename).sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    invalid("TASK-540 evidence screenshot tree is invalid");
  }
  for (const screenshot of projected) {
    const observed = await readNoFollowRegularFile(
      canonical,
      screenshot.path,
      "archived screenshot",
      true
    );
    if (observed.sha256 !== screenshot.sha256 || observed.mode !== 0o600) {
      invalid("TASK-540 archived screenshot validation drifted");
    }
  }
}
