import { constants, type BigIntStats } from "node:fs";
import { lstat, mkdir, open, readdir, realpath, type FileHandle } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import { SmokeError, type SmokeInput } from "../../contracts";
import type { SmokeScreenshotResult } from "../types";
import { decodeTask547Png } from "../task-547/output-manifest";
import {
  TASK_105_L08_SCENARIO_DESCRIPTORS,
  type Task105L08ScenarioDescriptor,
} from "./descriptors";

/**
 * TASK-105 L08 screenshot manifest ownership (contract: TASK-105-08-08-L07).
 *
 * Exactly five PNGs, one per scenario, written no-follow and exclusively into
 * the claimed evidence session. Existing evidence is never replaced: the
 * screenshots directory is created only once and every PNG open is
 * O_CREAT|O_EXCL|O_NOFOLLOW at mode 0600.
 */

const SESSION = /^[a-z][a-z0-9-]{2,63}$/u;
const MAX_PNG_BYTES = 8_388_608;
const EVIDENCE_PARTS = ["_docs", "_workflows", "_smoke", "evidence", "task-105"] as const;

export const TASK_105_L08_STAGING_ROOT = "_docs/_workflows/_smoke/task-105-l08/screenshots";

export interface Task105L08ScreenshotManifestEntry {
  readonly scenarioId: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
}

export interface Task105L08ScreenshotManifest {
  readonly profile: "fast" | "certification";
  readonly session: string;
  readonly entries: readonly Task105L08ScreenshotManifestEntry[];
  readonly paths: readonly string[];
}

/** Narrow deterministic race seam used only by the owning Bun tests. */
export interface Task105L08OutputManifestTestSeams {
  readonly afterNoFollowOpen?: (path: string) => void | Promise<void>;
}

function fail(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return (
    rel === "" || (!rel.startsWith("..") && !isAbsolute(rel) && !rel.split(sep).includes(".."))
  );
}

interface NodeIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly mode: bigint;
  readonly nlink: bigint;
  readonly directory: boolean;
  readonly size: bigint;
}

function identity(entry: BigIntStats): NodeIdentity {
  return Object.freeze({
    dev: entry.dev,
    ino: entry.ino,
    mode: entry.mode,
    nlink: entry.nlink,
    directory: entry.isDirectory(),
    size: entry.size,
  });
}

function sameIdentity(left: NodeIdentity, right: NodeIdentity): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.directory === right.directory &&
    (left.directory || (left.nlink === right.nlink && left.size === right.size))
  );
}

async function lstatBig(path: string): Promise<BigIntStats> {
  return lstat(path, { bigint: true });
}

async function trustedDirectory(
  path: string,
  label: string,
  requiredMode?: bigint
): Promise<NodeIdentity> {
  let entry: BigIntStats;
  try {
    entry = await lstatBig(path);
  } catch {
    return fail(`${label} is unavailable`);
  }
  if (!entry.isDirectory() || entry.isSymbolicLink()) return fail(`${label} is not a directory`);
  if (requiredMode !== undefined && (entry.mode & 0o777n) !== requiredMode)
    return fail(`${label} mode is unsafe`);
  return identity(entry);
}

function screenshotFileName(
  input: Pick<SmokeInput, "profile" | "session">,
  descriptor: Task105L08ScenarioDescriptor
): string {
  const ordinal = String(descriptor.number).padStart(2, "0");
  return `${input.profile}-${input.session}-${ordinal}-${descriptor.id}.png`;
}

export function task105L08StagingPath(
  input: Pick<SmokeInput, "profile" | "session">,
  descriptor: Task105L08ScenarioDescriptor
): string {
  return `${TASK_105_L08_STAGING_ROOT}/${screenshotFileName(input, descriptor)}`;
}

export function buildExactTask105L08ScreenshotManifest(
  input: SmokeInput
): Task105L08ScreenshotManifest {
  if (
    input.suite !== "task-105-l08" ||
    (input.profile !== "fast" && input.profile !== "certification") ||
    !SESSION.test(input.session)
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L08 screenshot invocation is invalid");
  }
  const entries = TASK_105_L08_SCENARIO_DESCRIPTORS.map((descriptor) =>
    Object.freeze({
      scenarioId: descriptor.id,
      path: task105L08StagingPath(input, descriptor),
      width: descriptor.viewport.width,
      height: descriptor.viewport.height,
    })
  );
  return Object.freeze({
    profile: input.profile,
    session: input.session,
    entries: Object.freeze(entries),
    paths: Object.freeze(entries.map(({ path }) => path)),
  });
}

export function assertExactTask105L08ScreenshotManifest(
  manifest: Task105L08ScreenshotManifest
): void {
  if (
    !SESSION.test(manifest.session) ||
    (manifest.profile !== "fast" && manifest.profile !== "certification") ||
    manifest.entries.length !== TASK_105_L08_SCENARIO_DESCRIPTORS.length ||
    manifest.paths.length !== TASK_105_L08_SCENARIO_DESCRIPTORS.length ||
    new Set(manifest.paths).size !== TASK_105_L08_SCENARIO_DESCRIPTORS.length
  ) {
    fail("TASK-105 L08 screenshot manifest cardinality is invalid");
  }
  for (const [index, entry] of manifest.entries.entries()) {
    const descriptor = TASK_105_L08_SCENARIO_DESCRIPTORS[index];
    if (
      descriptor === undefined ||
      entry.scenarioId !== descriptor.id ||
      entry.path !== task105L08StagingPath(manifest, descriptor) ||
      manifest.paths[index] !== entry.path ||
      entry.width !== descriptor.viewport.width ||
      entry.height !== descriptor.viewport.height ||
      !entry.path.endsWith(".png")
    ) {
      fail("TASK-105 L08 screenshot manifest row drifted");
    }
  }
}

async function readTrustedPng(
  path: string,
  label: string,
  requiredMode: bigint | undefined,
  seams: Task105L08OutputManifestTestSeams
): Promise<Buffer> {
  let handle: FileHandle | undefined;
  try {
    const before = await lstatBig(path);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n)
      return fail(`${label} ownership is invalid`);
    if (requiredMode !== undefined && (before.mode & 0o777n) !== requiredMode)
      return fail(`${label} mode is unsafe`);
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = await handle.stat({ bigint: true });
    if (
      !opened.isFile() ||
      opened.nlink !== 1n ||
      opened.size <= 0n ||
      opened.size > BigInt(MAX_PNG_BYTES) ||
      !sameIdentity(identity(before), identity(opened))
    ) {
      return fail(`${label} ownership is invalid`);
    }
    await seams.afterNoFollowOpen?.(path);
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    const pathname = await lstatBig(path);
    if (
      !sameIdentity(identity(opened), identity(after)) ||
      !sameIdentity(identity(opened), identity(pathname)) ||
      BigInt(bytes.byteLength) !== opened.size
    ) {
      return fail(`${label} changed while reading`);
    }
    return bytes;
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    return fail(`${label} is unavailable`);
  } finally {
    await handle?.close();
  }
}

interface EvidenceSessionSnapshot {
  readonly root: string;
  readonly directory: string;
  readonly identity: NodeIdentity;
}

async function captureEvidenceSession(
  root: string,
  sessionDirectory: string,
  session: string
): Promise<EvidenceSessionSnapshot> {
  const canonicalRoot = await realpath(root).catch(() =>
    fail("TASK-105 L08 repository root is unavailable")
  );
  const directory = resolve(sessionDirectory);
  const expected = join(canonicalRoot, ...EVIDENCE_PARTS, session);
  if (directory !== expected || !SESSION.test(session)) {
    fail("TASK-105 L08 evidence session is not canonical");
  }
  let current = canonicalRoot;
  for (const part of [...EVIDENCE_PARTS, session]) {
    current = join(current, part);
    await trustedDirectory(current, "TASK-105 L08 evidence ancestor");
  }
  const sessionIdentity = await trustedDirectory(
    directory,
    "TASK-105 L08 evidence session",
    0o700n
  );
  return Object.freeze({ root: canonicalRoot, directory, identity: sessionIdentity });
}

async function revalidateEvidenceSession(snapshot: EvidenceSessionSnapshot): Promise<void> {
  const current = await captureEvidenceSession(
    snapshot.root,
    snapshot.directory,
    snapshot.directory.split(sep).at(-1) ?? ""
  );
  if (!sameIdentity(snapshot.identity, current.identity)) {
    fail("TASK-105 L08 evidence session changed");
  }
}

async function ensureScreenshotsDirectory(
  snapshot: EvidenceSessionSnapshot
): Promise<NodeIdentity> {
  const target = join(snapshot.directory, "screenshots");
  const parentBefore = await trustedDirectory(
    snapshot.directory,
    "TASK-105 L08 evidence session",
    0o700n
  );
  try {
    await mkdir(target, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      fail("TASK-105 L08 screenshots directory could not be created");
    }
  }
  const child = await trustedDirectory(target, "TASK-105 L08 screenshots directory", 0o700n);
  const parentAfter = await trustedDirectory(
    snapshot.directory,
    "TASK-105 L08 evidence session",
    0o700n
  );
  if (!sameIdentity(parentBefore, parentAfter)) fail("TASK-105 L08 evidence session changed");
  await revalidateEvidenceSession(snapshot);
  return child;
}

async function captureTrustedStagingRoot(
  root: string,
  stagingRoot: string
): Promise<{ readonly path: string; readonly snapshots: readonly NodeIdentity[] }> {
  const canonicalRoot = await realpath(root).catch(() =>
    fail("TASK-105 L08 repository root is unavailable")
  );
  const target = resolve(canonicalRoot, stagingRoot);
  if (!isWithin(canonicalRoot, target))
    fail("TASK-105 L08 screenshot staging root escapes the repository");
  const snapshots: NodeIdentity[] = [];
  let current = canonicalRoot;
  snapshots.push(await trustedDirectory(current, "TASK-105 L08 repository root"));
  for (const part of relative(canonicalRoot, target).split(sep).filter(Boolean)) {
    current = join(current, part);
    snapshots.push(await trustedDirectory(current, "TASK-105 L08 screenshot staging ancestor"));
  }
  return Object.freeze({ path: target, snapshots: Object.freeze(snapshots) });
}

async function writeExclusivePng(
  path: string,
  bytes: Buffer,
  revalidateParent: () => Promise<void>
): Promise<void> {
  let handle: FileHandle | undefined;
  try {
    await revalidateParent();
    handle = await open(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    );
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n)
      fail("TASK-105 L08 archived screenshot ownership is invalid");
    await revalidateParent();
    await handle.chmod(0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    const after = await handle.stat({ bigint: true });
    const pathname = await lstatBig(path);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.dev !== pathname.dev ||
      before.ino !== pathname.ino ||
      (after.mode & 0o777n) !== 0o600n ||
      after.size !== BigInt(bytes.byteLength)
    ) {
      fail("TASK-105 L08 archived screenshot identity changed");
    }
    await revalidateParent();
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      fail("TASK-105 L08 archived screenshot already exists");
    }
    fail("TASK-105 L08 archived screenshot write failed");
  } finally {
    await handle?.close();
  }
}

/** Archives exactly five trusted candidate PNGs into the claimed L08 session. */
export async function archiveTask105L08Screenshots(input: {
  readonly root: string;
  readonly manifest: Task105L08ScreenshotManifest;
  readonly evidenceSessionDirectory: string;
  readonly stagingRoot?: string;
  readonly testSeams?: Task105L08OutputManifestTestSeams;
}): Promise<readonly SmokeScreenshotResult[]> {
  assertExactTask105L08ScreenshotManifest(input.manifest);
  const seams = input.testSeams ?? {};
  const snapshot = await captureEvidenceSession(
    input.root,
    input.evidenceSessionDirectory,
    input.manifest.session
  );
  const screenshotsIdentity = await ensureScreenshotsDirectory(snapshot);
  const screenshotsDirectory = join(snapshot.directory, "screenshots");
  const staging = await captureTrustedStagingRoot(
    input.root,
    input.stagingRoot ?? TASK_105_L08_STAGING_ROOT
  );
  const revalidateArchiveDestination = async (): Promise<void> => {
    await revalidateEvidenceSession(snapshot);
    const current = await trustedDirectory(
      screenshotsDirectory,
      "TASK-105 L08 screenshots directory",
      0o700n
    );
    if (!sameIdentity(screenshotsIdentity, current)) {
      fail("TASK-105 L08 screenshots directory changed");
    }
  };
  const revalidateCandidate = async (): Promise<void> => {
    const fresh = await captureTrustedStagingRoot(
      input.root,
      input.stagingRoot ?? TASK_105_L08_STAGING_ROOT
    );
    if (
      fresh.path !== staging.path ||
      fresh.snapshots.length !== staging.snapshots.length ||
      fresh.snapshots.some((identity, index) => !sameIdentity(identity, staging.snapshots[index]!))
    ) {
      fail("TASK-105 L08 screenshot staging ancestry changed");
    }
  };
  const results: SmokeScreenshotResult[] = [];
  const digests = new Set<string>();
  for (const entry of input.manifest.entries) {
    await revalidateArchiveDestination();
    await revalidateCandidate();
    const fileName = entry.path.split("/").at(-1);
    if (fileName === undefined) fail("TASK-105 L08 screenshot filename is invalid");
    const candidate = join(staging.path, fileName);
    const destination = join(screenshotsDirectory, fileName);
    if (!isWithin(staging.path, candidate) || !isWithin(screenshotsDirectory, destination)) {
      fail("TASK-105 L08 screenshot path escapes a trusted directory");
    }
    const bytes = await readTrustedPng(
      candidate,
      "TASK-105 L08 screenshot candidate",
      undefined,
      seams
    );
    const decoded = decodeTask547Png(bytes);
    if (
      decoded.width !== entry.width ||
      decoded.height !== entry.height ||
      digests.has(decoded.sha256)
    ) {
      fail("TASK-105 L08 screenshot descriptor or digest drifted");
    }
    await writeExclusivePng(destination, bytes, revalidateArchiveDestination);
    const archived = await readTrustedPng(
      destination,
      "TASK-105 L08 archived screenshot",
      0o600n,
      seams
    );
    if (!archived.equals(bytes)) fail("TASK-105 L08 archived screenshot hash verification failed");
    digests.add(decoded.sha256);
    results.push(
      Object.freeze({ path: relative(snapshot.directory, destination), sha256: decoded.sha256 })
    );
    await revalidateArchiveDestination();
  }
  const entries = await readdir(screenshotsDirectory, { withFileTypes: true });
  if (
    results.length !== TASK_105_L08_SCENARIO_DESCRIPTORS.length ||
    entries.length !== TASK_105_L08_SCENARIO_DESCRIPTORS.length ||
    entries.some((entry) => !entry.isFile() || entry.isSymbolicLink())
  ) {
    fail("TASK-105 L08 archived screenshot cardinality is invalid");
  }
  return Object.freeze(results);
}

/** Read-only gate: the claimed session holds exactly the five trusted PNGs. */
export async function verifyTask105L08ArchivedScreenshots(input: {
  readonly root: string;
  readonly manifest: Task105L08ScreenshotManifest;
  readonly evidenceSessionDirectory: string;
  readonly testSeams?: Task105L08OutputManifestTestSeams;
}): Promise<readonly SmokeScreenshotResult[]> {
  const normalized = input;
  assertExactTask105L08ScreenshotManifest(normalized.manifest);
  const snapshot = await captureEvidenceSession(
    normalized.root,
    normalized.evidenceSessionDirectory,
    normalized.manifest.session
  );
  const screenshotsDirectory = join(snapshot.directory, "screenshots");
  const screenshotsIdentity = await trustedDirectory(
    screenshotsDirectory,
    "TASK-105 L08 screenshots directory",
    0o700n
  );
  const expectedNames = normalized.manifest.entries
    .map((entry) => entry.path.split("/").at(-1)!)
    .sort();
  const entries = await readdir(screenshotsDirectory, { withFileTypes: true });
  const actualNames = entries.map((entry) => entry.name).sort();
  if (
    entries.some((entry) => !entry.isFile() || entry.isSymbolicLink()) ||
    actualNames.length !== expectedNames.length ||
    actualNames.some((name, index) => name !== expectedNames[index])
  ) {
    fail("TASK-105 L08 archived screenshot file set drifted");
  }
  const results: SmokeScreenshotResult[] = [];
  for (const entry of normalized.manifest.entries) {
    const name = entry.path.split("/").at(-1)!;
    const path = join(screenshotsDirectory, name);
    const bytes = await readTrustedPng(
      path,
      "TASK-105 L08 archived screenshot",
      0o600n,
      normalized.testSeams ?? {}
    );
    const decoded = decodeTask547Png(bytes);
    if (decoded.width !== entry.width || decoded.height !== entry.height) {
      fail("TASK-105 L08 archived screenshot dimensions drifted");
    }
    results.push(
      Object.freeze({ path: relative(snapshot.directory, path), sha256: decoded.sha256 })
    );
  }
  const fresh = await trustedDirectory(
    screenshotsDirectory,
    "TASK-105 L08 screenshots directory",
    0o700n
  );
  if (!sameIdentity(screenshotsIdentity, fresh)) fail("TASK-105 L08 screenshots directory changed");
  await revalidateEvidenceSession(snapshot);
  return Object.freeze(results);
}
