// TASK-105-08-05-L04: cohesive Git/evidence filesystem operations extracted
// from smoke-evidence.mjs (which approached the 1,000-line gate). This module
// owns every no-follow evidence/Git filesystem primitive plus the additive
// secure private-report read API. Validation/schema logic stays in the facade;
// this module must never import the facade (no cycles). All public signatures
// are preserved by the facade through re-exports.

import { execFileSync } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, readlink, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const MAX_REPORT_BYTES = 1_048_576;
export const MAX_MANIFEST_BYTES = 1_048_576;
export const MAX_SCREENSHOT_BYTES = 8_388_608;

const SESSION_PATTERN = /^[a-z][a-z0-9-]{2,63}$/u;

export class SmokeEvidenceError extends Error {
  constructor(code, label, detail) {
    super(`${code}:${label}:${detail}`);
    this.name = "SmokeEvidenceError";
    this.code = code;
    this.label = label;
    this.detail = detail;
  }
}

export function fail(code, label, detail) {
  throw new SmokeEvidenceError(code, label, detail);
}

export function isPlainRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

export function isLowercaseHex(value, length) {
  return typeof value === "string" && value.length === length && /^[0-9a-f]+$/u.test(value);
}

export function timingSafeEqualHex(actual, expected) {
  if (!isLowercaseHex(actual, 64) || !isLowercaseHex(expected, 64))
    fail("smoke_hash_invalid", "hash", "grammar");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

// Task IDs are exactly TASK-[0-9]{3} plus the sole reserved TASK-9999 sentinel.
export function requireRepoTaskId(taskId) {
  if (typeof taskId !== "string" || (!/^TASK-[0-9]{3}$/u.test(taskId) && taskId !== "TASK-9999")) {
    fail("smoke_task_id_invalid", "task", "grammar");
  }
  return taskId;
}

export function requireRuntimeSmokeSessionName(session) {
  if (
    typeof session !== "string" ||
    !SESSION_PATTERN.test(session) ||
    /[./\\]/u.test(session) ||
    /[\u0000-\u001f\u007f]/u.test(session)
  ) {
    fail("smoke_session_invalid", "session", "grammar");
  }
  return session;
}

export function isStrictDescendant(root, candidate) {
  const rel = relative(root, candidate);
  if (rel === "" || rel === "." || rel.startsWith("..") || isAbsolute(rel)) return false;
  if (rel.split(sep).includes("..")) return false;
  return true;
}

export function git(repoRoot, args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    });
  } catch {
    fail("smoke_git_failed", "git", args[0] ?? "run");
  }
}

export async function requireRealGitTopLevel(repoRoot) {
  if (typeof repoRoot !== "string" || repoRoot.length === 0)
    fail("smoke_repository_invalid", "repoRoot", "missing");
  const realRoot = await realpath(repoRoot);
  const top = git(realRoot, ["rev-parse", "--show-toplevel"]).trim();
  if (top.length === 0) fail("smoke_repository_invalid", "repoRoot", "top_level");
  return realpath(top);
}

function nodeIdentity(entry) {
  return {
    directory: entry.isDirectory(),
    dev: entry.dev,
    ino: entry.ino,
    mode: entry.mode,
    nlink: entry.nlink,
    size: entry.size,
    mtimeNs: entry.mtimeNs,
  };
}

function sameNode(left, right) {
  return (
    left !== undefined &&
    right !== undefined &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.directory === right.directory &&
    (left.directory ||
      (left.nlink === right.nlink && left.size === right.size && left.mtimeNs === right.mtimeNs))
  );
}

async function lstatBig(path) {
  return lstat(path, { bigint: true });
}

function evidenceParts(expectedTask, expectedSession) {
  return ["_docs", "_workflows", "_smoke", "evidence", expectedTask.toLowerCase(), expectedSession];
}

async function trustedDirectory(path, root, label) {
  const entry = await lstatBig(path);
  if (entry.isSymbolicLink()) fail("smoke_path_symlink", "evidence", relative(root, path));
  if (!entry.isDirectory()) fail("smoke_evidence_directory_invalid", label, "not_directory");
  return entry;
}

function isWithinOrEqual(root, candidate) {
  return (
    resolve(root) === resolve(candidate) || isStrictDescendant(resolve(root), resolve(candidate))
  );
}

async function captureTrustedDirectoryChain(root, directory, label) {
  const trustedRoot = resolve(root);
  const target = resolve(directory);
  if (!isWithinOrEqual(trustedRoot, target)) fail("smoke_path_escape", label, "directory");
  const entries = [];
  let current = trustedRoot;
  entries.push({
    path: current,
    identity: nodeIdentity(await trustedDirectory(current, trustedRoot, label)),
  });
  for (const part of relative(trustedRoot, target).split(sep).filter(Boolean)) {
    current = join(current, part);
    entries.push({
      path: current,
      identity: nodeIdentity(await trustedDirectory(current, trustedRoot, label)),
    });
  }
  return Object.freeze({ root: trustedRoot, directory: target, entries: Object.freeze(entries) });
}

async function revalidateTrustedDirectoryChain(snapshot, label) {
  for (const entry of snapshot.entries) {
    const current = nodeIdentity(await trustedDirectory(entry.path, snapshot.root, label));
    if (!sameNode(entry.identity, current))
      fail("smoke_path_identity_changed", label, relative(snapshot.root, entry.path));
  }
}

async function captureTrustedEvidenceFile(root, path, label) {
  const target = resolve(path);
  if (!isStrictDescendant(resolve(root), target)) fail("smoke_path_escape", label, "file");
  return captureTrustedDirectoryChain(root, dirname(target), label);
}

/**
 * Captures the real Git root and every existing canonical evidence component
 * through no-follow lstat identities. Missing suffixes are allowed only for
 * callers that are about to create them one component at a time.
 */
export async function captureCanonicalEvidenceAncestry(
  repoRoot,
  expectedTask,
  expectedSession,
  { allowMissing = false } = {}
) {
  requireRepoTaskId(expectedTask);
  requireRuntimeSmokeSessionName(expectedSession);
  const root = await requireRealGitTopLevel(repoRoot);
  const identities = [];
  const rootEntry = await trustedDirectory(root, root, "repository");
  identities.push({ path: root, identity: nodeIdentity(rootEntry) });
  let current = root;
  let missing = false;
  for (const part of evidenceParts(expectedTask, expectedSession)) {
    current = join(current, part);
    if (missing) continue;
    try {
      const entry = await trustedDirectory(current, root, "evidence");
      identities.push({ path: current, identity: nodeIdentity(entry) });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      if (!allowMissing)
        fail("smoke_evidence_directory_missing", "evidence", relative(root, current));
      missing = true;
    }
  }
  return Object.freeze({
    root,
    expectedTask,
    expectedSession,
    path: join(root, ...evidenceParts(expectedTask, expectedSession)),
    identities: Object.freeze(identities),
  });
}

/** Revalidates a captured ancestry before/after a sensitive evidence action. */
export async function revalidateCanonicalEvidenceAncestry(snapshot) {
  const current = await captureCanonicalEvidenceAncestry(
    snapshot.root,
    snapshot.expectedTask,
    snapshot.expectedSession
  );
  if (
    current.path !== snapshot.path ||
    current.identities.length !== snapshot.identities.length ||
    current.identities.some(
      (entry, index) =>
        entry.path !== snapshot.identities[index]?.path ||
        !sameNode(entry.identity, snapshot.identities[index]?.identity)
    )
  ) {
    fail("smoke_path_identity_changed", "evidence", "ancestry");
  }
  return current;
}

/** Creates missing canonical evidence components one at a time, never recursively. */
export async function ensureCanonicalEvidenceDirectory(repoRoot, expectedTask, expectedSession) {
  const initial = await captureCanonicalEvidenceAncestry(repoRoot, expectedTask, expectedSession, {
    allowMissing: true,
  });
  let current = initial.root;
  for (const part of evidenceParts(expectedTask, expectedSession)) {
    const next = join(current, part);
    try {
      await trustedDirectory(next, initial.root, "evidence");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parentBefore = await trustedDirectory(current, initial.root, "evidence");
      try {
        await mkdir(next, { mode: 0o700 });
      } catch (mkdirError) {
        if (mkdirError?.code !== "EEXIST") throw mkdirError;
      }
      const child = await trustedDirectory(next, initial.root, "evidence");
      const parentAfter = await trustedDirectory(current, initial.root, "evidence");
      if (!sameNode(nodeIdentity(parentBefore), nodeIdentity(parentAfter))) {
        fail("smoke_path_identity_changed", "evidence", "parent");
      }
      if ((child.mode & 0o777n) !== 0o700n)
        fail("smoke_evidence_mode_unsafe", "evidence", "directory");
    }
    current = next;
  }
  return captureCanonicalEvidenceAncestry(initial.root, expectedTask, expectedSession);
}

// Derives the canonical evidence directory from the real Git top level, the
// task ID, and the report-bound session. Callers cannot supply an evidence
// root; traversal, symlinked components, and alternate same-basename roots are
// rejected by construction.
export async function resolveCanonicalEvidenceDirectory(repoRoot, expectedTask, expectedSession) {
  return (
    await captureCanonicalEvidenceAncestry(repoRoot, expectedTask, expectedSession, {
      allowMissing: true,
    })
  ).path;
}

export async function readExactGitHead(repoRoot) {
  const head = git(repoRoot, ["rev-parse", "HEAD"]).trim();
  if (!isLowercaseHex(head, 40)) fail("smoke_revision_invalid", "gitHead", "grammar");
  return head;
}

// In porcelain v1 `-z`, rename/copy records put the destination in the first
// token and the source in the following token. Preserve full XY state and
// consume the source so it cannot become a synthetic standalone record.
function parsePorcelainV1ZRecords(raw) {
  if (typeof raw !== "string") fail("smoke_repository_invalid", "porcelain", "type");
  const tokens = raw.split("\0").filter((token) => token.length > 0);
  const records = [];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token.length < 4) fail("smoke_repository_invalid", "porcelain", "record");
    const status = token.slice(0, 2);
    const path = token.slice(3);
    if (status.includes("R") || status.includes("C")) {
      index += 1;
      const source = tokens[index];
      if (source === undefined || source.length === 0)
        fail("smoke_repository_invalid", "porcelain", "rename_source");
    }
    records.push({ status, path });
    index += 1;
  }
  return records;
}

export async function readPorcelainRecords(repoRoot, { includeUntracked = false } = {}) {
  const args = ["status", "--porcelain=v1", "-z"];
  if (includeUntracked) args.push("--untracked-files=all");
  return parsePorcelainV1ZRecords(git(repoRoot, args));
}

// Bounded canonical status records: status, normalized repository-relative
// path, mode, and content hash (or deletion marker). Regular dirty files are
// read through stable no-follow descriptor identities so a computed working-
// tree revision cannot be assembled from swapped pathname objects; symlinks
// hash their target text behind a pre/post readlink identity check. The
// manifest's own evidence directory is excluded from the revision.
export async function canonicalStatusRecords(records, { repoRoot, excludeStrictDescendant } = {}) {
  if (typeof repoRoot !== "string" || repoRoot.length === 0) {
    fail("smoke_repository_invalid", "repoRoot", "missing");
  }
  const out = [];
  for (const record of records) {
    const abs = resolve(repoRoot, record.path);
    if (excludeStrictDescendant !== undefined && isStrictDescendant(excludeStrictDescendant, abs)) {
      continue;
    }
    let mode;
    let contentHash;
    try {
      const entry = await lstatBig(abs);
      mode = (entry.mode & 0o7777n).toString(8).padStart(6, "0");
      if (entry.isSymbolicLink()) {
        const identityBefore = nodeIdentity(entry);
        const targetBefore = await readlink(abs);
        contentHash = `link:${targetBefore}`;
        const targetAfter = await readlink(abs);
        const identityAfter = nodeIdentity(await lstatBig(abs));
        if (targetAfter !== targetBefore || !sameNode(identityBefore, identityAfter)) {
          fail("smoke_path_identity_changed", record.path, "symlink");
        }
      } else if (entry.isFile()) {
        contentHash = sha256(
          await readRegularBytesNoFollow(abs, Number.MAX_SAFE_INTEGER, "repository")
        );
      } else {
        fail("smoke_repository_invalid", record.path, "not_regular_or_symlink");
      }
    } catch (error) {
      if (error instanceof SmokeEvidenceError) throw error;
      if (error.code === "ENOENT") {
        mode = "000000";
        contentHash = "DELETED";
      } else {
        throw error;
      }
    }
    out.push({ status: record.status, path: record.path, mode, contentHash });
  }
  return out;
}

export async function canonicalRevisionStream(
  gitHead,
  records,
  { repoRoot, excludeStrictDescendant } = {}
) {
  const canonical = await canonicalStatusRecords(records, { repoRoot, excludeStrictDescendant });
  const lines = canonical
    .map((record) => `${record.status}\0${record.path}\0${record.mode}\0${record.contentHash}`)
    .sort();
  return `${gitHead}\0${lines.join("\0")}`;
}

export async function computeWorkingTreeRevision(repoRoot, expectedTask, expectedSession) {
  const evidenceRoot = await resolveCanonicalEvidenceDirectory(
    repoRoot,
    expectedTask,
    expectedSession
  );
  const gitHead = await readExactGitHead(repoRoot);
  const records = await readPorcelainRecords(repoRoot, { includeUntracked: true });
  const outsideEvidence = await canonicalStatusRecords(records, {
    repoRoot,
    excludeStrictDescendant: evidenceRoot,
  });
  const canonical = await canonicalRevisionStream(gitHead, records, {
    repoRoot,
    excludeStrictDescendant: evidenceRoot,
  });
  return {
    gitHead,
    workingTreeDirty: outsideEvidence.length > 0,
    workingTreeSha256: sha256(canonical),
    records: outsideEvidence,
  };
}

// ---------------------------------------------------------------------------
// No-follow regular-file primitives
// ---------------------------------------------------------------------------

// Reads at most `maxBytes` bytes of a regular single-link file through
// O_NOFOLLOW, requiring stable descriptor and pathname identities before and
// after the read. Never follows, copies, or hashes a swapped pathname.
export async function readRegularBytesNoFollow(path, maxBytes, label, revalidateParent) {
  await revalidateParent?.();
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (error) {
    if (error.code === "ELOOP") fail("smoke_path_symlink", label, path);
    throw error;
  }
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n)
      fail("smoke_evidence_file_invalid", path, "not_regular_single_link");
    if (before.size > BigInt(maxBytes)) fail("smoke_file_too_large", label, `size=${before.size}`);
    const statBefore = await lstatBig(path);
    if (!sameNode(before, statBefore)) fail("smoke_path_identity_changed", label, path);
    await revalidateParent?.();
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (!sameNode(before, after)) fail("smoke_path_identity_changed", label, "descriptor");
    if (BigInt(bytes.byteLength) !== before.size)
      fail("smoke_path_identity_changed", label, "size");
    const statAfter = await lstatBig(path);
    if (!sameNode(before, statAfter)) fail("smoke_path_identity_changed", label, "pathname");
    await revalidateParent?.();
    return bytes;
  } finally {
    await handle.close();
  }
}

/** Reads one evidence descendant only after rechecking every directory component. */
export async function readTrustedEvidenceDescendantBytesNoFollow(
  root,
  path,
  maxBytes,
  label,
  { requiredMode } = {}
) {
  let ancestry;
  try {
    ancestry = await captureTrustedEvidenceFile(root, path, label);
  } catch (error) {
    if (error?.code === "ENOENT") fail("smoke_evidence_file_missing", label, "missing");
    throw error;
  }
  const revalidate = async () => {
    try {
      await revalidateTrustedDirectoryChain(ancestry, label);
    } catch (error) {
      if (error?.code === "ENOENT") fail("smoke_evidence_file_missing", label, "missing");
      throw error;
    }
  };
  await revalidate();
  let before;
  try {
    before = await lstatBig(path);
  } catch (error) {
    if (error?.code === "ENOENT") fail("smoke_evidence_file_missing", label, "missing");
    throw error;
  }
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n)
    fail("smoke_evidence_file_invalid", label, "not_regular_single_link");
  if (requiredMode !== undefined && (before.mode & 0o777n) !== requiredMode)
    fail("smoke_evidence_mode_unsafe", label, (before.mode & 0o7777n).toString(8));
  await revalidate();
  const bytes = await readRegularBytesNoFollow(path, maxBytes, label, revalidate);
  const after = await lstatBig(path);
  if (!sameNode(before, after)) fail("smoke_path_identity_changed", label, "pathname");
  if (requiredMode !== undefined && (after.mode & 0o777n) !== requiredMode)
    fail("smoke_evidence_mode_unsafe", label, (after.mode & 0o7777n).toString(8));
  await revalidate();
  return bytes;
}

export async function readTrustedEvidenceDescendantJsonFile(
  root,
  path,
  maxBytes,
  code,
  label,
  options
) {
  let bytes;
  try {
    bytes = await readTrustedEvidenceDescendantBytesNoFollow(root, path, maxBytes, label, options);
  } catch (error) {
    if (error instanceof SmokeEvidenceError && error.code === "smoke_file_too_large")
      fail(code, label, "size");
    throw error;
  }
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("smoke_json_invalid", label, "parse");
  }
}

async function requireExactRegularFile(path) {
  try {
    const entry = await lstatBig(path);
    if (!entry.isFile() || entry.isSymbolicLink())
      fail("smoke_evidence_file_invalid", path, "not_regular");
  } catch (error) {
    if (error.code === "ENOENT") fail("smoke_evidence_file_missing", path, "missing");
    throw error;
  }
}

export async function readCappedJsonFile(path, maxBytes, code, label) {
  await requireExactRegularFile(path);
  let bytes;
  try {
    bytes = await readRegularBytesNoFollow(path, maxBytes, label);
  } catch (error) {
    if (error instanceof SmokeEvidenceError && error.code === "smoke_file_too_large")
      fail(code, label, "size");
    throw error;
  }
  const text = bytes.toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    fail("smoke_json_invalid", label, "parse");
  }
}

export async function verifyScenarioScreenshots(root, manifest, readOptions = undefined) {
  const referenced = ["manifest.json", "report.json"];
  const seen = new Set(referenced);
  for (const scenario of manifest.scenarios) {
    for (const shot of scenario.screenshots) {
      const resolved = resolve(root, shot.path);
      if (!isStrictDescendant(root, resolved)) fail("smoke_path_escape", "screenshot", shot.path);
      let bytes;
      try {
        bytes = await readTrustedEvidenceDescendantBytesNoFollow(
          root,
          resolved,
          MAX_SCREENSHOT_BYTES,
          shot.path,
          readOptions
        );
      } catch (error) {
        if (error instanceof SmokeEvidenceError && error.code === "smoke_file_too_large") {
          fail("smoke_screenshot_too_large", shot.path, `size`);
        }
        throw error;
      }
      if (!timingSafeEqualHex(sha256(bytes), shot.sha256))
        fail("smoke_hash_mismatch", shot.path, "bytes");
      if (seen.has(shot.path)) fail("smoke_screenshot_duplicate", "screenshot", shot.path);
      seen.add(shot.path);
      referenced.push(shot.path);
    }
  }
  return referenced.sort();
}

export async function enumerateRegularFilesNoSymlinks(dir, { afterDirectoryRead } = {}) {
  const out = [];
  async function walk(current, expectedIdentity) {
    const ancestry = await captureTrustedDirectoryChain(dir, current, "evidence");
    const currentIdentity = ancestry.entries.at(-1)?.identity;
    if (expectedIdentity !== undefined && !sameNode(expectedIdentity, currentIdentity))
      fail("smoke_path_identity_changed", "evidence", relative(dir, current));
    const entries = await readdir(current, { withFileTypes: true });
    const listed = await Promise.all(
      entries.map(async (entry) => {
        const path = join(current, entry.name);
        return { entry, path, identity: nodeIdentity(await lstatBig(path)) };
      })
    );
    await afterDirectoryRead?.(current);
    await revalidateTrustedDirectoryChain(ancestry, "evidence");
    for (const listedEntry of listed) {
      const { path: abs, identity: listedIdentity } = listedEntry;
      const currentEntry = await lstatBig(abs);
      if (!sameNode(listedIdentity, nodeIdentity(currentEntry)))
        fail("smoke_path_identity_changed", "evidence", relative(dir, abs));
      if (currentEntry.isSymbolicLink()) fail("smoke_path_symlink", "evidence", relative(dir, abs));
      if (currentEntry.isDirectory()) {
        await walk(abs, listedIdentity);
        await revalidateTrustedDirectoryChain(ancestry, "evidence");
        continue;
      }
      if (currentEntry.isFile()) {
        out.push(relative(dir, abs));
        await revalidateTrustedDirectoryChain(ancestry, "evidence");
      } else {
        fail("smoke_evidence_file_invalid", "evidence", relative(dir, abs));
      }
    }
    await revalidateTrustedDirectoryChain(ancestry, "evidence");
  }
  await walk(dir);
  return out.sort();
}

export function sameSortedPaths(left, right) {
  return left.length === right.length && left.every((path, index) => path === right[index]);
}

// ---------------------------------------------------------------------------
// TASK-105-08-05-L04 additive secure private-report read API
// ---------------------------------------------------------------------------

// Securely reads exactly `report.json` inside the canonical evidence session.
// Requires the validated canonical ancestry, a regular single-link 0600-mode
// file read through O_NOFOLLOW with stable descriptor/pathname identities
// before and after the read, and bounded size. Returns private in-process
// `{ report, sha256 }` data; raw bytes are never logged.
export async function readCanonicalSmokeEvidenceReport({
  repoRoot,
  expectedTask,
  expectedSession,
}) {
  const ancestry = await captureCanonicalEvidenceAncestry(repoRoot, expectedTask, expectedSession);
  const root = ancestry.path;
  const reportPath = join(root, "report.json");
  let bytes;
  try {
    bytes = await readTrustedEvidenceDescendantBytesNoFollow(
      root,
      reportPath,
      MAX_REPORT_BYTES,
      "report",
      { requiredMode: 0o600n }
    );
  } catch (error) {
    if (
      error?.code === "ENOENT" ||
      (error instanceof SmokeEvidenceError && error.code === "smoke_evidence_file_missing")
    )
      fail("smoke_report_missing", "report", "missing");
    throw error;
  }
  const text = bytes.toString("utf8");
  let report;
  try {
    report = JSON.parse(text);
  } catch {
    fail("smoke_json_invalid", "report", "parse");
  }
  if (!isPlainRecord(report)) fail("smoke_report_invalid", "report", "shape");
  await revalidateCanonicalEvidenceAncestry(ancestry);
  return Object.freeze({ report: Object.freeze(report), sha256: sha256(bytes) });
}
