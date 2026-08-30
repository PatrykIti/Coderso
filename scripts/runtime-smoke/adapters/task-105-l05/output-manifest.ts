import { constants, type BigIntStats } from "node:fs";
import { lstat, mkdir, open, readdir, realpath, type FileHandle } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import { SmokeError, type SmokeInput } from "../../contracts";
import type { SmokeScreenshotResult } from "../types";
import { decodeTask547Png } from "../task-547/output-manifest";
import {
  TASK_105_L05_SCENARIO_DESCRIPTORS,
  type Task105L05ScenarioDescriptor,
} from "./descriptors";

const SESSION = /^[a-z][a-z0-9-]{2,63}$/u;
const MAX_PNG_BYTES = 8_388_608;
const EVIDENCE_PARTS = ["_docs", "_workflows", "_smoke", "evidence", "task-105"] as const;

export const TASK_105_L05_STAGING_ROOT = "_docs/_workflows/_smoke/task-105-l05/screenshots";

export interface Task105L05ScreenshotManifestEntry {
  readonly scenarioId: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
}

export interface Task105L05ScreenshotManifest {
  readonly profile: "fast" | "certification";
  readonly session: string;
  readonly entries: readonly Task105L05ScreenshotManifestEntry[];
  readonly paths: readonly string[];
}

/** Narrow deterministic race seam used only by the owning Bun tests. */
export interface Task105L05OutputManifestTestSeams {
  readonly afterNoFollowOpen?: (path: string) => void | Promise<void>;
  /** Test-only seam between a directory listing and its identity recheck. */
  readonly afterDirectoryRead?: (path: string) => void | Promise<void>;
}

export interface Task105L05ArchivedScreenshotVerificationInput {
  readonly root: string;
  readonly manifest: Task105L05ScreenshotManifest;
  readonly evidenceSessionDirectory: string;
  readonly report: unknown;
  readonly testSeams?: Task105L05OutputManifestTestSeams;
}

/** Orchestrator-only post-exit shape documented by the L04 terminal procedure. */
export interface Task105L05OrchestratorVerificationInput {
  readonly repoRoot: string;
  readonly expectedTask: "TASK-105";
  readonly expectedSession: string;
  readonly expectedManifest: Task105L05ScreenshotManifest;
  readonly report: unknown;
  readonly testSeams?: Task105L05OutputManifestTestSeams;
}

interface NodeIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly mode: bigint;
  readonly nlink: bigint;
  readonly directory: boolean;
  readonly size: bigint;
  readonly mtimeNs: bigint;
}

interface EvidenceSessionSnapshot {
  readonly root: string;
  readonly directory: string;
  readonly identities: readonly { readonly path: string; readonly identity: NodeIdentity }[];
}

interface TrustedDirectorySnapshot {
  readonly path: string;
  readonly identity: NodeIdentity;
}

function fail(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function normalizeVerificationInput(
  input: Task105L05ArchivedScreenshotVerificationInput | Task105L05OrchestratorVerificationInput
): Task105L05ArchivedScreenshotVerificationInput {
  if ("root" in input) return input;
  if (input.expectedTask !== "TASK-105") fail("TASK-105 L05 evidence task is invalid");
  return Object.freeze({
    root: input.repoRoot,
    manifest: input.expectedManifest,
    evidenceSessionDirectory: resolve(
      input.repoRoot,
      "_docs/_workflows/_smoke/evidence/task-105",
      input.expectedSession
    ),
    report: input.report,
    testSeams: input.testSeams,
  });
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return (
    rel === "" || (!rel.startsWith("..") && !isAbsolute(rel) && !rel.split(sep).includes(".."))
  );
}

function identity(entry: BigIntStats): NodeIdentity {
  return Object.freeze({
    dev: entry.dev,
    ino: entry.ino,
    mode: entry.mode,
    nlink: entry.nlink,
    directory: entry.isDirectory(),
    size: entry.size,
    mtimeNs: entry.mtimeNs,
  });
}

function sameIdentity(left: NodeIdentity, right: NodeIdentity): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.directory === right.directory &&
    (left.directory ||
      (left.nlink === right.nlink && left.size === right.size && left.mtimeNs === right.mtimeNs))
  );
}

function sameObjectIdentity(left: NodeIdentity, right: NodeIdentity): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.directory === right.directory
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
  if (!entry.isDirectory() || entry.isSymbolicLink())
    return fail(`${label} is not a trusted directory`);
  if (requiredMode !== undefined && (entry.mode & 0o777n) !== requiredMode)
    return fail(`${label} mode is unsafe`);
  return identity(entry);
}

function screenshotFileName(
  input: Pick<SmokeInput, "profile" | "session">,
  descriptor: Task105L05ScenarioDescriptor
): string {
  const ordinal = String(descriptor.number).padStart(2, "0");
  return `${input.profile}-${input.session}-${ordinal}-${descriptor.id}.png`;
}

export function task105L05StagingPath(
  input: Pick<SmokeInput, "profile" | "session">,
  descriptor: Task105L05ScenarioDescriptor
): string {
  return `${TASK_105_L05_STAGING_ROOT}/${screenshotFileName(input, descriptor)}`;
}

export function buildExactTask105L05ScreenshotManifest(
  input: SmokeInput
): Task105L05ScreenshotManifest {
  if (
    input.suite !== "task-105-l05" ||
    (input.profile !== "fast" && input.profile !== "certification") ||
    !SESSION.test(input.session)
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L05 screenshot invocation is invalid");
  }
  const entries = TASK_105_L05_SCENARIO_DESCRIPTORS.map((descriptor) =>
    Object.freeze({
      scenarioId: descriptor.id,
      path: task105L05StagingPath(input, descriptor),
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

export function assertExactTask105L05ScreenshotManifest(
  manifest: Task105L05ScreenshotManifest
): void {
  if (
    !SESSION.test(manifest.session) ||
    (manifest.profile !== "fast" && manifest.profile !== "certification") ||
    manifest.entries.length !== TASK_105_L05_SCENARIO_DESCRIPTORS.length ||
    manifest.paths.length !== TASK_105_L05_SCENARIO_DESCRIPTORS.length ||
    new Set(manifest.paths).size !== TASK_105_L05_SCENARIO_DESCRIPTORS.length
  ) {
    fail("TASK-105 L05 screenshot manifest cardinality is invalid");
  }
  for (const [index, entry] of manifest.entries.entries()) {
    const descriptor = TASK_105_L05_SCENARIO_DESCRIPTORS[index];
    if (
      descriptor === undefined ||
      entry.scenarioId !== descriptor.id ||
      entry.path !== task105L05StagingPath(manifest, descriptor) ||
      manifest.paths[index] !== entry.path ||
      entry.width !== descriptor.viewport.width ||
      entry.height !== descriptor.viewport.height ||
      !entry.path.endsWith(".png")
    ) {
      fail("TASK-105 L05 screenshot manifest row drifted");
    }
  }
}

async function readTrustedPng(
  path: string,
  label: string,
  requiredMode: bigint | undefined,
  seams: Task105L05OutputManifestTestSeams,
  revalidateParent?: () => Promise<void>
): Promise<Buffer> {
  let handle: FileHandle | undefined;
  try {
    await revalidateParent?.();
    const pathBefore = await lstatBig(path);
    if (!pathBefore.isFile() || pathBefore.isSymbolicLink() || pathBefore.nlink !== 1n) {
      return fail(`${label} ownership is invalid`);
    }
    if (requiredMode !== undefined && (pathBefore.mode & 0o777n) !== requiredMode)
      return fail(`${label} mode is unsafe`);
    await revalidateParent?.();
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const descriptorBefore = await handle.stat({ bigint: true });
    if (
      !descriptorBefore.isFile() ||
      descriptorBefore.nlink !== 1n ||
      descriptorBefore.size <= 0n ||
      descriptorBefore.size > BigInt(MAX_PNG_BYTES) ||
      !sameIdentity(identity(pathBefore), identity(descriptorBefore))
    ) {
      return fail(`${label} ownership is invalid`);
    }
    await revalidateParent?.();
    await seams.afterNoFollowOpen?.(path);
    await revalidateParent?.();
    const bytes = await handle.readFile();
    const descriptorAfter = await handle.stat({ bigint: true });
    const pathAfter = await lstatBig(path);
    if (
      !sameIdentity(identity(descriptorBefore), identity(descriptorAfter)) ||
      !sameIdentity(identity(descriptorBefore), identity(pathAfter)) ||
      BigInt(bytes.byteLength) !== descriptorBefore.size
    ) {
      return fail(`${label} changed while reading`);
    }
    await revalidateParent?.();
    return bytes;
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    return fail(`${label} is unavailable`);
  } finally {
    await handle?.close();
  }
}

async function captureEvidenceSession(
  root: string,
  sessionDirectory: string,
  session: string
): Promise<EvidenceSessionSnapshot> {
  const canonicalRoot = await realpath(root).catch(() =>
    fail("TASK-105 L05 repository root is unavailable")
  );
  const directory = resolve(sessionDirectory);
  const expected = join(canonicalRoot, ...EVIDENCE_PARTS, session);
  if (directory !== expected || !SESSION.test(session))
    fail("TASK-105 L05 evidence session is not canonical");
  const paths = [canonicalRoot];
  let current = canonicalRoot;
  for (const part of [...EVIDENCE_PARTS, session]) {
    current = join(current, part);
    paths.push(current);
  }
  const identities = await Promise.all(
    paths.map(async (path) =>
      Object.freeze({
        path,
        identity: await trustedDirectory(path, "TASK-105 L05 evidence ancestor"),
      })
    )
  );
  const sessionIdentity = identities.at(-1)?.identity;
  if (sessionIdentity === undefined || (sessionIdentity.mode & 0o777n) !== 0o700n) {
    fail("TASK-105 L05 evidence session mode is unsafe");
  }
  return Object.freeze({ root: canonicalRoot, directory, identities: Object.freeze(identities) });
}

async function revalidateEvidenceSession(snapshot: EvidenceSessionSnapshot): Promise<void> {
  const current = await captureEvidenceSession(
    snapshot.root,
    snapshot.directory,
    snapshot.directory.split(sep).at(-1) ?? ""
  );
  if (
    current.identities.length !== snapshot.identities.length ||
    current.identities.some(
      (entry, index) =>
        entry.path !== snapshot.identities[index]?.path ||
        !sameIdentity(entry.identity, snapshot.identities[index]!.identity)
    )
  ) {
    fail("TASK-105 L05 evidence ancestry changed");
  }
}

async function ensureScreenshotsDirectory(snapshot: EvidenceSessionSnapshot): Promise<string> {
  const target = join(snapshot.directory, "screenshots");
  const parentBefore = await trustedDirectory(
    snapshot.directory,
    "TASK-105 L05 evidence session",
    0o700n
  );
  try {
    await mkdir(target, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST")
      fail("TASK-105 L05 screenshots directory could not be created");
  }
  const child = await trustedDirectory(target, "TASK-105 L05 screenshots directory", 0o700n);
  const parentAfter = await trustedDirectory(
    snapshot.directory,
    "TASK-105 L05 evidence session",
    0o700n
  );
  if (!sameIdentity(parentBefore, parentAfter) || !child.directory)
    fail("TASK-105 L05 evidence session changed");
  await revalidateEvidenceSession(snapshot);
  return target;
}

async function captureTrustedDirectory(
  path: string,
  label: string,
  requiredMode?: bigint
): Promise<TrustedDirectorySnapshot> {
  return Object.freeze({
    path,
    identity: await trustedDirectory(path, label, requiredMode),
  });
}

async function revalidateTrustedDirectory(
  snapshot: TrustedDirectorySnapshot,
  label: string,
  requiredMode?: bigint
): Promise<void> {
  const current = await trustedDirectory(snapshot.path, label, requiredMode);
  if (!sameIdentity(snapshot.identity, current)) fail(`${label} identity changed`);
}

async function readTrustedDirectoryEntries(
  snapshot: TrustedDirectorySnapshot,
  label: string,
  seams: Task105L05OutputManifestTestSeams
) {
  await revalidateTrustedDirectory(snapshot, label, 0o700n);
  const entries = await readdir(snapshot.path, { withFileTypes: true });
  await seams.afterDirectoryRead?.(snapshot.path);
  await revalidateTrustedDirectory(snapshot, label, 0o700n);
  return entries;
}

async function assertManifestAbsent(path: string): Promise<void> {
  try {
    await lstatBig(path);
    fail("TASK-105 L05 manifest must be absent before verification");
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      fail("TASK-105 L05 manifest precondition is invalid");
  }
}

async function captureTrustedStagingRoot(
  root: string,
  stagingRoot: string
): Promise<readonly TrustedDirectorySnapshot[]> {
  const canonicalRoot = await realpath(root).catch(() =>
    fail("TASK-105 L05 repository root is unavailable")
  );
  const target = resolve(canonicalRoot, stagingRoot);
  if (!isWithin(canonicalRoot, target))
    fail("TASK-105 L05 screenshot staging root escapes the repository");
  let current = canonicalRoot;
  const snapshots: TrustedDirectorySnapshot[] = [
    await captureTrustedDirectory(current, "TASK-105 L05 repository root"),
  ];
  for (const part of relative(canonicalRoot, target).split(sep).filter(Boolean)) {
    current = join(current, part);
    snapshots.push(
      await captureTrustedDirectory(current, "TASK-105 L05 screenshot staging ancestor")
    );
  }
  return Object.freeze(snapshots);
}

async function revalidateStagingRoot(
  snapshots: readonly TrustedDirectorySnapshot[]
): Promise<void> {
  for (const [index, snapshot] of snapshots.entries()) {
    await revalidateTrustedDirectory(
      snapshot,
      index === 0 ? "TASK-105 L05 repository root" : "TASK-105 L05 screenshot staging ancestor"
    );
  }
}

async function writeExclusivePng(
  path: string,
  bytes: Buffer,
  revalidateParent?: () => Promise<void>
): Promise<void> {
  let handle: FileHandle | undefined;
  try {
    await revalidateParent?.();
    handle = await open(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    );
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n)
      fail("TASK-105 L05 archived screenshot ownership is invalid");
    await revalidateParent?.();
    await handle.chmod(0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    const after = await handle.stat({ bigint: true });
    const pathname = await lstatBig(path);
    if (
      !sameObjectIdentity(identity(before), identity(after)) ||
      !sameObjectIdentity(identity(before), identity(pathname)) ||
      (after.mode & 0o777n) !== 0o600n ||
      after.size !== BigInt(bytes.byteLength)
    ) {
      fail("TASK-105 L05 archived screenshot identity changed");
    }
    await revalidateParent?.();
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      fail("TASK-105 L05 archived screenshot already exists");
    fail("TASK-105 L05 archived screenshot write failed");
  } finally {
    await handle?.close();
  }
}

/** Archives exactly five trusted candidate PNGs into the exclusive L05 session. */
export async function archiveTask105L05Screenshots(input: {
  readonly root: string;
  readonly manifest: Task105L05ScreenshotManifest;
  readonly evidenceSessionDirectory: string;
  readonly stagingRoot?: string;
  readonly testSeams?: Task105L05OutputManifestTestSeams;
}): Promise<readonly SmokeScreenshotResult[]> {
  assertExactTask105L05ScreenshotManifest(input.manifest);
  const seams = input.testSeams ?? {};
  const snapshot = await captureEvidenceSession(
    input.root,
    input.evidenceSessionDirectory,
    input.manifest.session
  );
  const screenshotsDirectory = await ensureScreenshotsDirectory(snapshot);
  const screenshots = await captureTrustedDirectory(
    screenshotsDirectory,
    "TASK-105 L05 screenshots directory",
    0o700n
  );
  const staging = await captureTrustedStagingRoot(
    input.root,
    input.stagingRoot ?? TASK_105_L05_STAGING_ROOT
  );
  const stagingRoot = staging.at(-1)?.path;
  if (stagingRoot === undefined) fail("TASK-105 L05 screenshot staging root is unavailable");
  const revalidateArchiveDestination = async (): Promise<void> => {
    await revalidateEvidenceSession(snapshot);
    await revalidateTrustedDirectory(screenshots, "TASK-105 L05 screenshots directory", 0o700n);
  };
  const revalidateCandidate = async (): Promise<void> => {
    await revalidateStagingRoot(staging);
  };
  const results: SmokeScreenshotResult[] = [];
  const digests = new Set<string>();
  for (const entry of input.manifest.entries) {
    await revalidateArchiveDestination();
    await revalidateCandidate();
    const fileName = entry.path.split("/").at(-1);
    if (fileName === undefined) fail("TASK-105 L05 screenshot filename is invalid");
    const candidate = join(stagingRoot, fileName);
    const destination = join(screenshotsDirectory, fileName);
    if (!isWithin(stagingRoot, candidate) || !isWithin(screenshotsDirectory, destination)) {
      fail("TASK-105 L05 screenshot path escapes a trusted directory");
    }
    const bytes = await readTrustedPng(
      candidate,
      "TASK-105 L05 screenshot candidate",
      undefined,
      seams,
      revalidateCandidate
    );
    const decoded = decodeTask547Png(bytes);
    if (
      decoded.width !== entry.width ||
      decoded.height !== entry.height ||
      digests.has(decoded.sha256)
    ) {
      fail("TASK-105 L05 screenshot descriptor or digest drifted");
    }
    await writeExclusivePng(destination, bytes, revalidateArchiveDestination);
    const archived = await readTrustedPng(
      destination,
      "TASK-105 L05 archived screenshot",
      0o600n,
      seams,
      revalidateArchiveDestination
    );
    if (!archived.equals(bytes)) fail("TASK-105 L05 archived screenshot hash verification failed");
    digests.add(decoded.sha256);
    results.push(
      Object.freeze({ path: relative(snapshot.directory, destination), sha256: decoded.sha256 })
    );
    await revalidateArchiveDestination();
  }
  if (results.length !== TASK_105_L05_SCENARIO_DESCRIPTORS.length)
    fail("TASK-105 L05 archived screenshot cardinality is invalid");
  return Object.freeze(results);
}

function assertTerminalReportScreenshots(
  report: unknown,
  expected: readonly SmokeScreenshotResult[]
): void {
  if (report === null || typeof report !== "object" || Array.isArray(report))
    fail("TASK-105 L05 terminal report is invalid");
  const screenshots = (report as { screenshots?: unknown }).screenshots;
  if (!Array.isArray(screenshots) || screenshots.length !== expected.length)
    fail("TASK-105 L05 terminal report screenshot cardinality is invalid");
  for (const [index, actual] of screenshots.entries()) {
    const wanted = expected[index];
    if (
      wanted === undefined ||
      actual === null ||
      typeof actual !== "object" ||
      Array.isArray(actual) ||
      Object.keys(actual).length !== 2 ||
      (actual as { path?: unknown }).path !== wanted.path ||
      (actual as { sha256?: unknown }).sha256 !== wanted.sha256
    ) {
      fail("TASK-105 L05 terminal report screenshot drifted");
    }
  }
}

/**
 * Read-only pre-manifest gate: the terminal report must name exactly the five
 * archived 0600 PNGs, with no extras, and every hash is recomputed no-follow.
 */
export async function verifyTask105L05ArchivedScreenshotsBeforeManifest(
  input: Task105L05ArchivedScreenshotVerificationInput | Task105L05OrchestratorVerificationInput
): Promise<readonly SmokeScreenshotResult[]> {
  const normalized = normalizeVerificationInput(input);
  assertExactTask105L05ScreenshotManifest(normalized.manifest);
  const snapshot = await captureEvidenceSession(
    normalized.root,
    normalized.evidenceSessionDirectory,
    normalized.manifest.session
  );
  const manifestPath = join(snapshot.directory, "manifest.json");
  await assertManifestAbsent(manifestPath);
  const screenshotsDirectory = join(snapshot.directory, "screenshots");
  const screenshots = await captureTrustedDirectory(
    screenshotsDirectory,
    "TASK-105 L05 screenshots directory",
    0o700n
  );
  const expectedNames = normalized.manifest.entries
    .map((entry) => entry.path.split("/").at(-1)!)
    .sort();
  const revalidateArchivedScreenshot = async (): Promise<void> => {
    await revalidateEvidenceSession(snapshot);
    await revalidateTrustedDirectory(screenshots, "TASK-105 L05 screenshots directory", 0o700n);
  };
  const entries = await readTrustedDirectoryEntries(
    screenshots,
    "TASK-105 L05 screenshots directory",
    normalized.testSeams ?? {}
  );
  const actualNames = entries.map((entry) => entry.name).sort();
  if (
    entries.some((entry) => !entry.isFile() || entry.isSymbolicLink()) ||
    actualNames.length !== expectedNames.length ||
    actualNames.some((name, index) => name !== expectedNames[index])
  ) {
    fail("TASK-105 L05 archived screenshot file set drifted");
  }
  const results: SmokeScreenshotResult[] = [];
  for (const entry of normalized.manifest.entries) {
    const name = entry.path.split("/").at(-1)!;
    const path = join(screenshotsDirectory, name);
    const bytes = await readTrustedPng(
      path,
      "TASK-105 L05 archived screenshot",
      0o600n,
      normalized.testSeams ?? {},
      revalidateArchivedScreenshot
    );
    const decoded = decodeTask547Png(bytes);
    if (decoded.width !== entry.width || decoded.height !== entry.height)
      fail("TASK-105 L05 archived screenshot dimensions drifted");
    results.push(
      Object.freeze({ path: relative(snapshot.directory, path), sha256: decoded.sha256 })
    );
  }
  assertTerminalReportScreenshots(normalized.report, results);
  await assertManifestAbsent(manifestPath);
  await revalidateArchivedScreenshot();
  await revalidateEvidenceSession(snapshot);
  return Object.freeze(results);
}
