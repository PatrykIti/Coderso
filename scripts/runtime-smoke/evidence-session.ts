import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  ftruncateSync,
  lstatSync,
  mkdirSync,
  openSync,
  writeFileSync,
  type Stats,
} from "node:fs";
import { relative, resolve } from "node:path";

import { SmokeError, resolveInsideRoot, type SmokeInput } from "./contracts";

const SESSION = /^[a-z][a-z0-9-]{2,63}$/u;

interface DirectoryIdentity {
  readonly dev: number;
  readonly ino: number;
  readonly mode: number;
}

interface FileIdentity {
  readonly dev: number;
  readonly ino: number;
  readonly mode: number;
  readonly nlink: number;
}

export interface EvidenceSessionClaimSeams {
  /** Test-only race seam; production callers must omit it. */
  readonly afterSessionClaimed?: (sessionDirectory: string) => void;
}

export interface ClaimedEvidenceReport {
  readonly sessionDirectory: string;
  readonly reportPath: string;
  /** Writes through the originally claimed identity; never reclaims by path. */
  readonly write: (json: string) => void;
}

function fail(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function directoryIdentity(stats: Stats): DirectoryIdentity {
  return Object.freeze({ dev: stats.dev, ino: stats.ino, mode: stats.mode & 0o7777 });
}

function sameDirectory(left: DirectoryIdentity, right: DirectoryIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode;
}

function fileIdentity(stats: Stats): FileIdentity {
  return Object.freeze({
    dev: stats.dev,
    ino: stats.ino,
    mode: stats.mode & 0o7777,
    nlink: stats.nlink,
  });
}

function sameFile(left: FileIdentity, right: FileIdentity): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink
  );
}

function trustedDirectory(path: string, label: string): DirectoryIdentity {
  let stats: Stats;
  try {
    stats = lstatSync(path);
  } catch {
    return fail(`${label} is unavailable`);
  }
  if (!stats.isDirectory() || stats.isSymbolicLink())
    return fail(`${label} is not a trusted directory`);
  return directoryIdentity(stats);
}

function assertChild(parent: string, child: string, label: string): void {
  const value = resolve(parent, child);
  const rel = relative(parent, value);
  if (
    child.length === 0 ||
    child.includes("/") ||
    child.includes("\\") ||
    rel === "" ||
    rel.startsWith("..")
  ) {
    fail(`${label} is outside its trusted parent`);
  }
}

function ensureTrustedChild(
  parent: string,
  child: string,
  label: string,
  requirePrivateMode = false
): string {
  assertChild(parent, child, label);
  const path = resolve(parent, child);
  const parentBefore = trustedDirectory(parent, `${label} parent`);
  try {
    mkdirSync(path, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST")
      return fail(`${label} could not be created`);
  }
  const target = trustedDirectory(path, label);
  const parentAfter = trustedDirectory(parent, `${label} parent`);
  if (!sameDirectory(parentBefore, parentAfter)) return fail(`${label} parent identity changed`);
  if (requirePrivateMode && (target.mode & 0o777) !== 0o700) return fail(`${label} mode is unsafe`);
  return path;
}

function captureAncestry(
  root: string,
  session: string,
  includeSession = true
): readonly DirectoryIdentity[] {
  const paths = [
    root,
    resolve(root, "_docs"),
    resolve(root, "_docs/_workflows"),
    resolve(root, "_docs/_workflows/_smoke"),
    resolve(root, "_docs/_workflows/_smoke/evidence"),
    resolve(root, "_docs/_workflows/_smoke/evidence/task-105"),
    resolve(root, `_docs/_workflows/_smoke/evidence/task-105/${session}`),
  ];
  return Object.freeze(
    paths
      .slice(0, includeSession ? undefined : -1)
      .map((path) => trustedDirectory(path, "evidence ancestor"))
  );
}

function assertSameAncestry(
  before: readonly DirectoryIdentity[],
  after: readonly DirectoryIdentity[]
): void {
  if (
    before.length !== after.length ||
    before.some((entry, index) => !sameDirectory(entry, after[index]!))
  ) {
    fail("evidence ancestry identity changed");
  }
}

function assertClaimedReport(path: string, descriptor: number): void {
  const opened = fstatSync(descriptor);
  const pathname = lstatSync(path);
  if (
    !opened.isFile() ||
    opened.nlink !== 1 ||
    (opened.mode & 0o777) !== 0o600 ||
    !pathname.isFile() ||
    pathname.isSymbolicLink() ||
    pathname.nlink !== 1 ||
    (pathname.mode & 0o777) !== 0o600 ||
    opened.dev !== pathname.dev ||
    opened.ino !== pathname.ino
  ) {
    fail("evidence report ownership is invalid");
  }
}

function trustedReportIdentity(path: string): FileIdentity {
  let stats: Stats;
  try {
    stats = lstatSync(path);
  } catch {
    return fail("evidence report is unavailable");
  }
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1 ||
    (stats.mode & 0o777) !== 0o600
  ) {
    return fail("evidence report ownership is invalid");
  }
  return fileIdentity(stats);
}

/** Claims the exclusive L05 session/report with no-follow stable ancestry. */
export function claimExclusiveEvidenceReport(
  input: SmokeInput,
  root: string,
  seams: EvidenceSessionClaimSeams = {}
): ClaimedEvidenceReport {
  if (
    input.command !== "run" ||
    input.suite !== "task-105-l05" ||
    (input.profile !== "fast" && input.profile !== "certification") ||
    !SESSION.test(input.session)
  ) {
    fail("TASK-105 L05 evidence invocation is invalid");
  }
  const base = resolveInsideRoot(root, "_docs/_workflows/_smoke/evidence", "evidence root");
  trustedDirectory(root, "repository root");
  trustedDirectory(resolve(root, "_docs"), "evidence ancestor");
  trustedDirectory(resolve(root, "_docs/_workflows"), "evidence ancestor");
  const smokeRoot = resolve(root, "_docs/_workflows/_smoke");
  trustedDirectory(smokeRoot, "evidence ancestor");
  trustedDirectory(base, "evidence root");
  const task = ensureTrustedChild(base, "task-105", "task-105 evidence parent", true);
  const ancestryBeforeClaim = captureAncestry(root, input.session, false);
  assertChild(task, input.session, "evidence session");
  const session = resolve(task, input.session);
  try {
    mkdirSync(session, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      return fail("evidence session already exists");
    return fail("evidence session could not be claimed");
  }
  const claimed = trustedDirectory(session, "evidence session");
  if ((claimed.mode & 0o777) !== 0o700) fail("evidence session mode is unsafe");
  seams.afterSessionClaimed?.(session);
  const ancestryBeforeReport = captureAncestry(root, input.session);
  assertSameAncestry(ancestryBeforeClaim, ancestryBeforeReport.slice(0, -1));
  if (!sameDirectory(claimed, ancestryBeforeReport.at(-1)!))
    fail("evidence session identity changed");
  const report = resolve(session, "report.json");
  let descriptor: number | undefined;
  try {
    descriptor = openSync(
      report,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    );
    assertClaimedReport(report, descriptor);
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    return fail("evidence report claim failed");
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  const claimedAncestry = captureAncestry(root, input.session);
  assertSameAncestry(ancestryBeforeReport, claimedAncestry);
  const claimedReport = trustedReportIdentity(report);
  return Object.freeze({
    sessionDirectory: session,
    reportPath: report,
    write(json: string): void {
      assertSameAncestry(claimedAncestry, captureAncestry(root, input.session));
      if (!sameFile(claimedReport, trustedReportIdentity(report))) {
        fail("evidence report identity changed before writing");
      }
      let writeDescriptor: number | undefined;
      try {
        writeDescriptor = openSync(report, constants.O_WRONLY | constants.O_NOFOLLOW);
        assertClaimedReport(report, writeDescriptor);
        if (!sameFile(claimedReport, fileIdentity(fstatSync(writeDescriptor)))) {
          fail("evidence report identity changed while opening");
        }
        ftruncateSync(writeDescriptor, 0);
        writeFileSync(writeDescriptor, json, "utf8");
        fchmodSync(writeDescriptor, 0o600);
        const after = fileIdentity(fstatSync(writeDescriptor));
        if (!sameFile(claimedReport, after) || !sameFile(after, trustedReportIdentity(report))) {
          fail("evidence report identity changed while writing");
        }
      } catch (error) {
        if (error instanceof SmokeError) throw error;
        return fail("evidence report write failed");
      } finally {
        if (writeDescriptor !== undefined) closeSync(writeDescriptor);
      }
      assertSameAncestry(claimedAncestry, captureAncestry(root, input.session));
    },
  });
}

/** Backwards-compatible session-only facade for callers outside the L05 writer. */
export function claimExclusiveEvidenceSession(
  input: SmokeInput,
  root: string,
  seams: EvidenceSessionClaimSeams = {}
): string {
  return claimExclusiveEvidenceReport(input, root, seams).sessionDirectory;
}
