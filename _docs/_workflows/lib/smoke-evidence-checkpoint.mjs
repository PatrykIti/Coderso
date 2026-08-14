// TASK-545-03-L03 smoke evidence resume checkpoint: phase-1 owner-review
// pause, exact-path/hash tracked resume, and the canonical closure-resume
// state machine. Environment-neutral ESM (no repo/runtime/server/DB
// dependency) so Node and Bun unit tests import it directly; this module is
// the sole owner of the checkpoint/resume contract and `lib/smoke-evidence
// .mjs` only re-exports the four public entry points (the 1,000-line gate is
// why this leaf was split from TASK-545-03-L01).
//
// Phase 1 never claims durability: `createResumeCheckpoint` validates exact
// identity/schema/file set/hashes, atomically creates a strict
// `resume-checkpoint.json` beside the manifest (create-only, never
// overwritten, never staged), and returns the exact `owner_action_required`
// pause payload. The owner reviews and stages only the canonical evidence
// directory, then re-enters the owning workflow with the unchanged checkpoint
// path/hash/run ID. `resumeTrackedEvidence` verifies exact canonical
// path/hash/schema/task/run/owning workflow and tracked parity; it is
// read-only, idempotent, and replay-safe. `openWorkflowClosureResume` returns
// the canonical `none | file-only | both` resume state that TASK-545-03-L04
// consumes; `validateMetadataOnlyClosureDelta` is L04-owned and reached
// through a lazy forward reference. The executing owner is derived only from
// its `import.meta.url`; callers can never supply a workflow path. The six
// post-TASK-554 migration entries stay exact; `task-554-closeout.mjs` is an
// inventory-only `closeout` exception, never an owning resume entry. A future
// owner must be canonical `_docs/_workflows/task-<matching-id>-(author-audit|
// implement|fix).mjs` (`TASK-9999` is the only four-digit exception), tracked,
// regular/no-symlink, byte-identical to `git show HEAD`, task/suffix-bound,
// and green in the TASK-545 static-contract/import gates. The checkpoint
// holds only safe identity/integrity metadata; errors are machine-readable
// with bounded codes/counts and canonical repo-relative paths/hashes only.

import { execFileSync } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readFile, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SmokeEvidenceError,
  auditSmokeEvidenceDirectory,
  canonicalJson,
  computeWorkingTreeRevision,
  enumerateRegularFilesNoSymlinks,
  isLowercaseHex,
  isStrictDescendant,
  publicRevision,
  requireExactKeys,
  requireRealGitTopLevel,
  requireRepoTaskId,
  requireRuntimeSmokeSessionName,
  requireSafeRepoRelativePath,
  resolveCanonicalEvidenceDirectory,
  revisionEquals,
  sameSortedPaths,
  sha256,
  timingSafeEqualHex,
} from "./smoke-evidence.mjs";

export const MAX_CHECKPOINT_BYTES = 4_194_304; // 4 MiB
const MAX_METADATA_FILE_BYTES = 1_048_576;
const MAX_WORKFLOW_ENTRY_BYTES = 1_048_576;
const KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const CANONICAL_OWNER_PATTERN = /^_docs\/_workflows\/task-((?:[0-9]{3}|9999))-(author-audit|implement|fix)\.mjs$/u;
const CHANGELOG_FILE_PATTERN = /^(\d{3,4})-(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/u;
const CHANGELOG_TEMPLATE = "_docs/_CHANGELOG/<number>-YYYY-MM-DD-<safe-slug>.md";
const CANONICAL_DRIVER_IMPORT_PATTERN =
  /from\s+["']\.\/lib\/(?:smoke-evidence(?:-checkpoint|-closure)?|audit-rounds|post-audit|workflow-contracts)\.mjs["']/u;
const FORBIDDEN_ENTRY_PATTERN = /git\s+add|git\s+commit/iu;
const SHELL_UNSAFE_PATTERN = /[\u0000-\u001f\u007f|&;<>`$\\"'\n\r\t]/u;
const TYPE_GUARDS = Object.freeze({
  object: isPlainRecord,
  array: Array.isArray,
  string: (value) => typeof value === "string",
  integer: Number.isInteger,
  boolean: (value) => typeof value === "boolean",
});
const RESUME_OPTION_KEYS = Object.freeze([
  "repoRoot", "expectedTask", "checkpointPath", "checkpointSha256", "runId",
  "expectedSession", "expectedWorkflowRole", "executingImportMetaUrl",
]);

// The six post-TASK-554 tracked migration entries stay exact for TASK-545
// closure; `task-554-closeout.mjs` is inventory-only and never an owner.
const BUILTIN_ENTRY_BINDINGS = Object.freeze({
  "_docs/_workflows/task-522-author.mjs": { task: "TASK-522", role: "author-audit" },
  "_docs/_workflows/task-543-implement.mjs": { task: "TASK-543", role: "implement" },
  "_docs/_workflows/task-554-author-audit.mjs": { task: "TASK-554", role: "author-audit" },
  "_docs/_workflows/task-554-closeout.mjs": { task: "TASK-554", role: "closeout" },
  "_docs/_workflows/task-554-implement.mjs": { task: "TASK-554", role: "implement" },
  "_docs/_workflows/task-554-fix.mjs": { task: "TASK-554", role: "fix" },
});
const CANONICAL_OWNER_ROLES = Object.freeze(["author-audit", "implement", "fix"]);
// Owner-side static switch for closure supplemental task files; no caller may
// extend it and TASK-406 may change only during the TASK-414 closure.
const TASK_414_SUPPLEMENTAL_CLOSURE_TASK_FILES = Object.freeze([
  "_docs/_TASKS/TASK-406_Assistant_Cross_Industry_Reset_E2E.md",
]);

function fail(code, label, detail) { throw new SmokeEvidenceError(code, label, detail); }
function isPlainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}
function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}
function nowUtc() { return new Date().toISOString(); }
function currentCanonicalUtcDate() { return nowUtc().slice(0, 10); }
function isValidCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return false;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function gitCommand(repoRoot, args) {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
  } catch (error) { fail("smoke_git_failed", "git", args[0] ?? "run"); }
}
function gitShowHeadBytes(repoRoot, path) {
  try {
    return execFileSync("git", ["show", `HEAD:${path}`], { cwd: repoRoot, encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
  } catch (error) { return null; } // not present at HEAD
}

// ---------------------------------------------------------------------------
// Checkpoint JSON-schema validation (the schema file is the authority)
// ---------------------------------------------------------------------------

let cachedCheckpointSchema = null;
async function loadCheckpointSchema() {
  if (cachedCheckpointSchema !== null) return cachedCheckpointSchema;
  const schemaUrl = new URL("../smoke-evidence-checkpoint.schema.json", import.meta.url);
  const bytes = await readFile(fileURLToPath(schemaUrl));
  if (bytes.length > 64 * 1024) fail("smoke_checkpoint_invalid", "schema", "size");
  let parsed;
  try { parsed = JSON.parse(bytes.toString("utf8")); } catch (error) { fail("smoke_checkpoint_invalid", "schema", "parse"); }
  if (!isPlainRecord(parsed) || parsed.$id !== "coderso.smoke-evidence-checkpoint@v1") fail("smoke_checkpoint_invalid", "schema", "id");
  cachedCheckpointSchema = parsed;
  return parsed;
}
// Bounded JSON-schema subset interpreter for the checkpoint schema document:
// type/const/enum/pattern/length/min-max/items/properties/required/
// additionalProperties. Any schema drift fails closed; details stay bounded.
function validateJsonSchemaValue(value, schema, path) {
  if (schema.const !== undefined && canonicalJson(value) !== canonicalJson(schema.const)) fail("smoke_checkpoint_invalid", path, "const");
  if (schema.type !== undefined && TYPE_GUARDS[schema.type] === undefined) fail("smoke_checkpoint_invalid", path, "type");
  if (schema.type !== undefined && !TYPE_GUARDS[schema.type](value)) fail("smoke_checkpoint_invalid", path, "type");
  if (schema.enum !== undefined && !schema.enum.some((item) => canonicalJson(item) === canonicalJson(value))) {
    fail("smoke_checkpoint_invalid", path, "enum");
  }
  if (schema.type === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) fail("smoke_checkpoint_invalid", path, "minLength");
    if (schema.maxLength !== undefined && value.length > schema.maxLength) fail("smoke_checkpoint_invalid", path, "maxLength");
    if (schema.pattern !== undefined && new RegExp(schema.pattern, "u").test(value) === false) fail("smoke_checkpoint_invalid", path, "pattern");
  }
  if (schema.type === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) fail("smoke_checkpoint_invalid", path, "minItems");
    if (schema.maxItems !== undefined && value.length > schema.maxItems) fail("smoke_checkpoint_invalid", path, "maxItems");
    if (schema.items !== undefined) for (const item of value) validateJsonSchemaValue(item, schema.items, `${path}.items`);
  }
  if ((schema.type === "integer" || schema.type === "number") && schema.minimum !== undefined && value < schema.minimum) {
    fail("smoke_checkpoint_invalid", path, "minimum");
  }
  if (schema.type === "object") {
    const properties = schema.properties ?? {};
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(properties, key)) {
        if (schema.additionalProperties === false) fail("smoke_checkpoint_invalid", `${path}.${key}`, "unknown");
      } else {
        validateJsonSchemaValue(value[key], properties[key], `${path}.${key}`);
      }
    }
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) fail("smoke_checkpoint_invalid", `${path}.${key}`, "missing");
    }
  }
  return value;
}
async function validateExactCheckpoint(value) {
  const schema = await loadCheckpointSchema();
  if (!isPlainRecord(value)) fail("smoke_checkpoint_invalid", "checkpoint", "not_record");
  validateJsonSchemaValue(value, schema, "checkpoint");
  const frozen = deepFreeze(JSON.parse(canonicalJson(value)));
  if (frozen.phase1.state !== "owner_review_required") fail("smoke_checkpoint_invalid", "phase1.state", "enum");
  return frozen;
}

// ---------------------------------------------------------------------------
// Owning-workflow gates
// ---------------------------------------------------------------------------

function requireNoWorkflowEntryOverride(options) {
  if (Object.hasOwn(options, "workflowEntry")) fail("smoke_workflow_override", "workflow", "override");
}
function requireCanonicalOwnerRole(expectedWorkflowRole) {
  if (!CANONICAL_OWNER_ROLES.includes(expectedWorkflowRole)) fail("smoke_workflow_role_invalid", "workflow", "role");
  return expectedWorkflowRole;
}
// Derives the canonical repo-relative workflow path only from the executing
// module's import.meta.url; callers can never supply a path.
async function deriveCanonicalRepoPathOnlyFromImportMetaUrl(repoRoot, executingImportMetaUrl) {
  if (typeof executingImportMetaUrl !== "string" || !executingImportMetaUrl.startsWith("file:")) {
    fail("smoke_workflow_entry_invalid", "workflow", "not_file_url");
  }
  let absolute;
  try { absolute = fileURLToPath(executingImportMetaUrl); } catch (error) { fail("smoke_workflow_entry_invalid", "workflow", "url"); }
  const realRoot = await requireRealGitTopLevel(repoRoot);
  if (typeof absolute !== "string" || absolute.length === 0 || !isAbsolute(absolute)) fail("smoke_workflow_entry_invalid", "workflow", "path");
  if (!isStrictDescendant(realRoot, absolute)) fail("smoke_workflow_entry_invalid", "workflow", "outside_repo");
  const rel = relative(realRoot, absolute);
  if (rel.length === 0 || rel.split(sep).includes("..")) fail("smoke_workflow_entry_invalid", "workflow", "path");
  return rel.split(sep).join("/");
}
function isExactTask545BuiltinEntry(entry) { return Object.hasOwn(BUILTIN_ENTRY_BINDINGS, entry); }
function requireExactBuiltinTaskAndRoleBinding(entry, expectedTask, expectedWorkflowRole) {
  const binding = BUILTIN_ENTRY_BINDINGS[entry];
  if (binding.task !== expectedTask) fail("smoke_workflow_task_binding", "workflow", entry);
  if (binding.role !== expectedWorkflowRole) fail("smoke_workflow_role_binding", "workflow", entry);
}
function requireCanonicalFutureTaskOwner(entry, expectedTask, options) {
  const match = options.pattern.exec(entry);
  if (match === null) fail("smoke_workflow_entry_invalid", "workflow", entry);
  const taskId = `TASK-${match[1]}`;
  if (options.requireTaskIdAndSuffixBinding) {
    if (taskId !== expectedTask) fail("smoke_workflow_task_binding", "workflow", entry);
    if (match[2] !== options.expectedRole) fail("smoke_workflow_role_binding", "workflow", entry);
  }
  return taskId;
}
async function requireGitTrackedRegularNoSymlink(entry, repoRoot) {
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const tracked = gitCommand(realRoot, ["ls-files", "-z", "--", entry]).split("\0").filter((path) => path.length > 0);
  if (!tracked.includes(entry)) fail("smoke_workflow_entry_untracked", "workflow", entry);
  let entryStat;
  try { entryStat = await lstat(join(realRoot, ...entry.split("/"))); }
  catch (error) {
    if (error.code === "ENOENT") fail("smoke_workflow_entry_untracked", "workflow", entry);
    throw error;
  }
  if (entryStat.isSymbolicLink()) fail("smoke_workflow_entry_symlink", "workflow", entry);
  if (!entryStat.isFile()) fail("smoke_workflow_entry_not_regular", "workflow", entry);
}
async function requireWorktreeBytesEqualGitShowHead(entry, repoRoot) {
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const worktreeBytes = await readFile(join(realRoot, ...entry.split("/")));
  if (worktreeBytes.length > MAX_WORKFLOW_ENTRY_BYTES) fail("smoke_workflow_entry_not_regular", "workflow", entry);
  const headBytes = gitShowHeadBytes(realRoot, entry);
  if (headBytes === null) fail("smoke_workflow_entry_untracked", "workflow", entry);
  if (worktreeBytes.equals(headBytes) === false) fail("smoke_workflow_entry_dirty", "workflow", entry);
}
// Bounded runtime subset of the TASK-545-01-L02 static-contract/import gates:
// the entry must import at least one canonical `./lib/` driver and must never
// contain direct agent staging patterns (the full AST gate stays static).
async function requireCanonicalTask545StaticContractAndImportGates(entry, repoRoot) {
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const source = await readFile(join(realRoot, ...entry.split("/")), "utf8");
  if (Buffer.byteLength(source, "utf8") > MAX_WORKFLOW_ENTRY_BYTES) fail("smoke_workflow_entry_not_regular", "workflow", entry);
  if (!CANONICAL_DRIVER_IMPORT_PATTERN.test(source)) fail("smoke_workflow_entry_static_contract", "workflow", "imports");
  if (FORBIDDEN_ENTRY_PATTERN.test(source)) fail("smoke_workflow_entry_static_contract", "workflow", "staging");
}
// The executing owner is derived only from the executing module's
// import.meta.url, bound to the exact expected task/role, and gated on
// tracked regular no-symlink HEAD-identical bytes plus the static contract.
export async function requireTaskBoundOwningWorkflow(options) {
  if (!isPlainRecord(options)) fail("smoke_schema_invalid", "workflow", "not_record");
  requireNoWorkflowEntryOverride(options);
  const expectedWorkflowRole = requireCanonicalOwnerRole(options.expectedWorkflowRole);
  requireRepoTaskId(options.expectedTask);
  const entry = await deriveCanonicalRepoPathOnlyFromImportMetaUrl(options.repoRoot, options.executingImportMetaUrl);
  if (isExactTask545BuiltinEntry(entry)) {
    requireExactBuiltinTaskAndRoleBinding(entry, options.expectedTask, expectedWorkflowRole);
  } else {
    requireCanonicalFutureTaskOwner(entry, options.expectedTask, {
      pattern: CANONICAL_OWNER_PATTERN, expectedRole: expectedWorkflowRole, requireTaskIdAndSuffixBinding: true,
    });
  }
  await requireGitTrackedRegularNoSymlink(entry, options.repoRoot);
  await requireWorktreeBytesEqualGitShowHead(entry, options.repoRoot);
  await requireCanonicalTask545StaticContractAndImportGates(entry, options.repoRoot);
  return entry;
}

// ---------------------------------------------------------------------------
// Checkpoint path, identity, and safe metadata helpers
// ---------------------------------------------------------------------------

async function canonicalCheckpointPath(repoRoot, expectedTask, expectedSession) {
  const dir = await resolveCanonicalEvidenceDirectory(repoRoot, expectedTask, expectedSession);
  return join(dir, "resume-checkpoint.json");
}
function canonicalRepoRelativeEvidencePath(expectedTask, expectedSession) {
  return `_docs/_workflows/_smoke/evidence/${expectedTask.toLowerCase()}/${expectedSession}`;
}
function requireExactPath(repoRoot, callerPath, canonicalPath) {
  if (typeof callerPath !== "string" || callerPath.length === 0) fail("smoke_checkpoint_path_mismatch", "checkpoint", "path");
  const resolved = isAbsolute(callerPath) ? resolve(callerPath) : resolve(repoRoot, callerPath);
  if (resolved !== canonicalPath) fail("smoke_checkpoint_path_mismatch", "checkpoint", "path");
  return resolved;
}
async function requireExactRegularFile(path, missingCode = "smoke_evidence_file_missing") {
  let entry;
  try { entry = await lstat(path); }
  catch (error) {
    if (error.code === "ENOENT") fail(missingCode, path, "missing");
    throw error;
  }
  if (!entry.isFile() || entry.isSymbolicLink()) fail("smoke_evidence_file_invalid", path, "not_regular");
  return entry;
}
async function readCappedFileNoSymlink(path, missingCode = "smoke_checkpoint_missing") {
  await requireExactRegularFile(path, missingCode);
  const entry = await stat(path);
  if (entry.size > MAX_CHECKPOINT_BYTES) fail("smoke_checkpoint_too_large", path, `size=${entry.size}`);
  return readFile(path);
}
function timingSafeRequireSha256(bytes, expected) {
  const actual = sha256(bytes);
  if (!isLowercaseHex(actual, 64) || !isLowercaseHex(expected, 64)) fail("smoke_hash_invalid", "hash", "grammar");
  if (!timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"))) fail("smoke_checkpoint_hash_mismatch", "checkpoint", "sha256");
}
function requireTaskSessionAndRun(checkpoint, expectedTask, expectedSession, runId) {
  if (checkpoint.taskId !== expectedTask) fail("smoke_checkpoint_task_mismatch", "checkpoint", "task");
  if (checkpoint.session !== expectedSession) fail("smoke_checkpoint_session_mismatch", "checkpoint", "session");
  if (checkpoint.runId !== runId) fail("smoke_checkpoint_run_mismatch", "checkpoint", "run");
}
function requireExecutingWorkflowEntry(repoRoot, checkpointWorkflowEntry, executingWorkflowEntry) {
  if (typeof repoRoot !== "string" || repoRoot.length === 0) fail("smoke_repository_invalid", "repoRoot", "missing");
  if (checkpointWorkflowEntry !== executingWorkflowEntry) fail("smoke_workflow_entry_mismatch", "workflow", "entry");
}
async function requireRevisionEquals(frozenRevision, repoRoot, expectedTask, expectedSession) {
  const current = await computeWorkingTreeRevision(repoRoot, expectedTask, expectedSession);
  if (!revisionEquals(frozenRevision, publicRevision(current))) fail("smoke_revision_mismatch", "revision", "bytes");
  return current;
}
function requirePinnedChangelogGrammar(changelogNumber, changelogSlug) {
  if (!Number.isSafeInteger(changelogNumber) || changelogNumber < 1) fail("smoke_pinned_changelog_invalid", "changelog", "number");
  if (typeof changelogSlug !== "string" || changelogSlug.length === 0 || changelogSlug.length > 120 || !KEBAB_PATTERN.test(changelogSlug)) {
    fail("smoke_pinned_changelog_invalid", "changelog", "slug");
  }
}

// ---------------------------------------------------------------------------
// Checkpoint construction and atomic create-only write
// ---------------------------------------------------------------------------

function deterministicRunId(expectedTask, expectedSession, result, revision) {
  return sha256(canonicalJson({
    taskId: expectedTask, session: expectedSession, suiteId: result.suiteId,
    referencedFiles: result.referencedFiles, frozenRevision: publicRevision(revision),
  }));
}
async function hashSortedReferencedFiles(evidenceRoot, result) {
  const out = [];
  for (const rel of result.referencedFiles) {
    requireSafeRepoRelativePath(rel, "evidenceFiles.path");
    out.push(Object.freeze({ path: rel, sha256: sha256(await readFile(join(evidenceRoot, ...rel.split("/")))) }));
  }
  return Object.freeze(out);
}
// Exact physical task-family file list at HEAD: `TASK-###` plus `-NN`
// descendants; prefix lookalikes never join and staged-new files are rejected
// because the list must be HEAD-frozen for closure.
async function listExactPhysicalTaskFamilyFiles(repoRoot, expectedTask) {
  requireRepoTaskId(expectedTask);
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const taskId = expectedTask === "TASK-9999" ? "TASK-9999" : `TASK-${expectedTask.slice(5)}`;
  const files = gitCommand(realRoot, ["ls-files", "-z", "--", "_docs/_TASKS/"])
    .split("\0").filter((path) => path.length > 0)
    .filter((path) => { const base = basename(path); return base === `${taskId}.md` || base.startsWith(`${taskId}-`); })
    .sort();
  await requireEveryRepoRelativePathRegularNoSymlinkTrackedAtHead(realRoot, files);
  return Object.freeze(files);
}
// Owner-side static switch: TASK-414 receives exactly the TASK-406 file,
// every other task receives []; untracked/symlinked/non-regular/HEAD-mismatch
// supplemental paths fail closed.
export async function resolveOwnerControlledSupplementalClosureTaskFiles(repoRoot, expectedTask) {
  requireRepoTaskId(expectedTask);
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const paths = expectedTask === "TASK-414" ? TASK_414_SUPPLEMENTAL_CLOSURE_TASK_FILES : [];
  await requireEveryRepoRelativePathRegularNoSymlinkTrackedAtHead(realRoot, paths);
  return paths;
}
async function requireEveryRepoRelativePathRegularNoSymlinkTrackedAtHead(repoRoot, paths) {
  for (const path of paths) {
    requireSafeRepoRelativePath(path, "path");
    const tracked = gitCommand(repoRoot, ["ls-files", "-z", "--", path]).split("\0").filter((entry) => entry.length > 0);
    if (!tracked.includes(path)) fail("smoke_path_untracked", "path", path);
    let entry;
    try { entry = await lstat(join(repoRoot, ...path.split("/"))); }
    catch (error) {
      if (error.code === "ENOENT") fail("smoke_path_untracked", "path", path);
      throw error;
    }
    if (!entry.isFile() || entry.isSymbolicLink()) fail("smoke_path_not_regular", "path", path);
    const worktreeBytes = await readFile(join(repoRoot, ...path.split("/")));
    const headBytes = gitShowHeadBytes(repoRoot, path);
    if (headBytes === null) fail("smoke_path_untracked", "path", path);
    if (worktreeBytes.equals(headBytes) === false) fail("smoke_path_head_mismatch", "path", path);
  }
  return paths;
}
function exactCheckpoint(input) {
  return deepFreeze({
    schemaVersion: input.schemaVersion, taskId: input.taskId, suiteId: input.suiteId,
    profile: input.profile, session: input.session, runId: input.runId,
    workflowEntry: input.workflowEntry, evidenceDirectory: input.evidenceDirectory,
    manifestSha256: input.manifestSha256, evidenceFiles: input.evidenceFiles,
    frozenRuntime: publicRevision(input.frozenRuntime),
    closureContract: deepFreeze({
      taskFiles: input.closureContract.taskFiles,
      supplementalTaskFiles: input.closureContract.supplementalTaskFiles,
      taskIndex: "_docs/_TASKS/README.md", changelogIndex: "_docs/_CHANGELOG/README.md",
      changelogNumber: input.closureContract.changelogNumber, changelogSlug: input.closureContract.changelogSlug,
    }),
    phase1: deepFreeze({ state: "owner_review_required", generatedAt: input.phase1.generatedAt }),
  });
}
// Atomic create-only checkpoint write: same-directory O_EXCL create (an
// existing checkpoint is never overwritten), mode 0600, file fsync, then
// directory fsync. The persisted bytes are exactly `canonicalJson(checkpoint)`
// so the create-time hash equals the resume-time file-byte hash.
async function requireNoResumeCheckpointFile(repoRoot, expectedTask, expectedSession) {
  const dir = await resolveCanonicalEvidenceDirectory(repoRoot, expectedTask, expectedSession);
  let entry;
  try { entry = await lstat(join(dir, "resume-checkpoint.json")); }
  catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (entry.isFile() || entry.isSymbolicLink()) fail("smoke_checkpoint_conflict", "checkpoint", "exists");
}
async function writeNewCheckpointAtomically(repoRoot, expectedTask, expectedSession, checkpoint) {
  const dir = await resolveCanonicalEvidenceDirectory(repoRoot, expectedTask, expectedSession);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const bytes = canonicalJson(checkpoint);
  if (Buffer.byteLength(bytes, "utf8") > MAX_CHECKPOINT_BYTES) fail("smoke_checkpoint_too_large", "checkpoint", "bytes");
  const checkpointPath = join(dir, "resume-checkpoint.json");
  let handle;
  try {
    handle = await open(checkpointPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    await handle.chmod(0o600);
    await handle.writeFile(bytes, "utf8");
    await handle.sync();
  } catch (error) {
    if (error.code === "EEXIST") fail("smoke_checkpoint_conflict", "checkpoint", "exists");
    throw error;
  } finally {
    if (handle !== undefined) await handle.close();
  }
  await fsyncDirectory(dir);
  return { path: checkpointPath, sha256: sha256(bytes) };
}
async function fsyncDirectory(dir) {
  let handle;
  try {
    handle = await open(dir, constants.O_RDONLY);
    await handle.sync();
  } catch (error) {
    // Directory fsync is not available on every platform; the O_EXCL create
    // and file fsync already guarantee the atomic no-overwrite contract.
  } finally {
    if (handle !== undefined) await handle.close();
  }
}
async function requireExactPresentSet(repoRoot, expectedTask, expectedSession, referencedFiles, controlFile) {
  const dir = await resolveCanonicalEvidenceDirectory(repoRoot, expectedTask, expectedSession);
  const present = await enumerateRegularFilesNoSymlinks(dir);
  const expected = [...referencedFiles, controlFile].sort();
  if (!sameSortedPaths(expected, present)) fail("smoke_evidence_file_set_mismatch", "evidence", "set");
}

// ---------------------------------------------------------------------------
// Pinned closure identity guards and bound transaction residue
// ---------------------------------------------------------------------------

async function countChangelogIndexRows(indexPath, changelogNumber) {
  let text;
  try { text = await readFile(indexPath, "utf8"); }
  catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
  if (Buffer.byteLength(text, "utf8") > MAX_METADATA_FILE_BYTES) fail("smoke_changelog_index_too_large", "changelog", "index");
  const rowPattern = new RegExp(`^\\|\\s*${changelogNumber}\\s*\\|`, "u");
  let count = 0;
  for (const line of text.split("\n")) if (rowPattern.test(line)) count += 1;
  return count;
}
// Phase 1 refuses a checkpoint when the pinned changelog file or its index
// row already exists (the closure contract is reserved).
async function requireNoCanonicalPinnedChangelogOrIndexRow({ repoRoot, changelogNumber, changelogSlug }) {
  requirePinnedChangelogGrammar(changelogNumber, changelogSlug);
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const changelogDir = join(realRoot, "_docs", "_CHANGELOG");
  let names = [];
  try { names = await readdir(changelogDir); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (names.some((name) => name.startsWith(`${changelogNumber}-`))) fail("smoke_pinned_changelog_conflict", "changelog", "file");
  if (await countChangelogIndexRows(join(changelogDir, "README.md"), changelogNumber) !== 0) {
    fail("smoke_pinned_changelog_conflict", "changelog", "index");
  }
}
// Same-repository transaction artifacts are hidden temp/journal files whose
// names embed the exact checkpoint run ID beside canonical closure metadata;
// TASK-545-03-L04's writer must use this naming so residue is detectable
// without scanning arbitrary files. Residue never supplies date authority.
function isRunBoundArtifactName(name, runId) {
  if (typeof name !== "string" || !name.startsWith(".") || /^\.+$/u.test(name)) return false;
  if (runId.length === 0 || !isLowercaseHex(runId, 64)) return false;
  return name.endsWith(`.${runId}.tmp`) || name.endsWith(`.${runId}.journal`);
}
async function findBoundTransactionArtifacts(repoRoot, runId) {
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const out = [];
  for (const dir of ["_docs/_CHANGELOG", "_docs/_TASKS"]) {
    const absoluteDir = join(realRoot, dir);
    let names = [];
    try { names = await readdir(absoluteDir); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    for (const name of names) {
      if (!isRunBoundArtifactName(name, runId)) continue;
      let entry;
      try { entry = await lstat(join(absoluteDir, name)); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
      if (entry.isSymbolicLink()) fail("smoke_transaction_artifact_invalid", "transaction", name);
      if (!entry.isFile()) fail("smoke_transaction_artifact_invalid", "transaction", name);
      out.push(join(absoluteDir, name));
    }
  }
  return out.sort();
}
async function cleanBoundTransactionArtifactsAndFsyncDirectory(pair) {
  const dirs = new Set();
  for (const artifact of pair.boundArtifacts) {
    await rm(artifact, { force: true });
    dirs.add(dirname(artifact));
  }
  for (const dir of dirs) await fsyncDirectory(dir);
}

// ---------------------------------------------------------------------------
// Ordered changelog pair inspection and closure identity
// ---------------------------------------------------------------------------

async function inspectBoundOrderedChangelogPair(checkpoint, options, flags) {
  const number = checkpoint.closureContract.changelogNumber;
  const realRoot = await requireRealGitTopLevel(options.repoRoot);
  const changelogDir = join(realRoot, "_docs", "_CHANGELOG");
  let names = [];
  try { names = (await readdir(changelogDir)).filter((name) => name.startsWith(`${number}-`)).sort(); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (names.length > 1) fail("smoke_changelog_multiple", "changelog", `count=${names.length}`);
  const changelogFile = names.length === 1 ? `_docs/_CHANGELOG/${names[0]}` : null;
  if (changelogFile !== null) await requireExactRegularFile(join(realRoot, changelogFile), "smoke_changelog_file_invalid");
  const indexRowCount = await countChangelogIndexRows(join(changelogDir, "README.md"), number);
  let state;
  if (changelogFile !== null && indexRowCount === 1) state = "both";
  else if (changelogFile !== null && indexRowCount === 0) state = "file-only";
  else if (changelogFile === null && indexRowCount === 0) state = "none";
  else if (flags.rejectIndexOnlyCorruptOrMultiple === true) {
    if (indexRowCount > 1) fail("smoke_changelog_index_multiple", "changelog", `rows=${indexRowCount}`);
    fail("smoke_changelog_index_only", "changelog", "index_without_file");
  } else state = "index_only";
  if (!flags.validStates.includes(state)) fail("smoke_changelog_state_invalid", "changelog", state);
  const boundArtifacts = await findBoundTransactionArtifacts(realRoot, checkpoint.runId);
  if (flags.rejectAnyCanonicalMetadata === true && (changelogFile !== null || indexRowCount !== 0)) {
    fail("smoke_changelog_metadata_present", "changelog", "canonical");
  }
  if (flags.rejectAnyBoundTransactionArtifacts === true && boundArtifacts.length > 0) {
    fail("smoke_transaction_artifact_present", "changelog", "bound");
  }
  return Object.freeze({
    state, changelogFile, indexRowCount,
    boundTempOrJournalPresent: boundArtifacts.length > 0,
    staleBoundTempOrJournalOnly: boundArtifacts.length > 0 && state === "none",
    boundArtifacts,
  });
}
// Identity discovery before allowlist/delta validation: exactly one regular
// non-symlink changelog whose canonical path matches the date/slug template,
// strict body task/date/number binding, and the exact index-row count (0 for
// `file-only`, 1 for `both`). The returned identity is the sole date/path
// authority; callers never resolve it again.
async function discoverMetadataRecoveryClosureIdentity(options) {
  const { checkpoint, checkpointSha256, repoRoot, expectedTask, closureContract } = options;
  const number = closureContract.changelogNumber;
  const slug = closureContract.changelogSlug;
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const changelogDir = join(realRoot, "_docs", "_CHANGELOG");
  let names = [];
  try { names = (await readdir(changelogDir)).filter((name) => name.startsWith(`${number}-`)).sort(); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (names.length !== 1) fail("smoke_changelog_multiple", "changelog", `count=${names.length}`);
  const name = names[0];
  const match = CHANGELOG_FILE_PATTERN.exec(name);
  if (options.requireCanonicalPathFromClosureContract !== CHANGELOG_TEMPLATE) {
    fail("smoke_changelog_path_invalid", "changelog", "template");
  }
  if (match === null || match[1] !== String(number) || match[3] !== slug) fail("smoke_changelog_path_invalid", "changelog", name);
  const date = match[2];
  if (!isValidCalendarDate(date)) fail("smoke_changelog_date_invalid", "changelog", date);
  const absolute = join(changelogDir, name);
  await requireExactRegularFile(absolute, "smoke_changelog_file_invalid");
  if (options.requireStrictBodyTaskDateAndNumber === true) {
    const body = (await readCappedFileNoSymlink(absolute, "smoke_changelog_file_invalid")).toString("utf8");
    if (Buffer.byteLength(body, "utf8") > MAX_METADATA_FILE_BYTES) fail("smoke_changelog_too_large", "changelog", "file");
    if (!body.includes(`# ${number} - `) || !body.includes(`**Tasks:** ${expectedTask}`) || !body.includes(`**Date:** ${date}`)) {
      fail("smoke_changelog_body_invalid", "changelog", name);
    }
  }
  if (await countChangelogIndexRows(join(changelogDir, "README.md"), number) !== options.requireMatchingChangelogIndexRows) {
    fail("smoke_changelog_index_rows", "changelog", `rows=${await countChangelogIndexRows(join(changelogDir, "README.md"), number)}`);
  }
  return Object.freeze({
    taskId: expectedTask, suiteId: checkpoint.suiteId, profile: checkpoint.profile,
    session: checkpoint.session, runId: checkpoint.runId, checkpointSha256,
    changelogNumber: number, changelogSlug: slug, closureUtcDate: date,
    pinnedChangelogPath: `_docs/_CHANGELOG/${name}`, durableState: options.durableState,
  });
}
async function createFrozenClosureIdentityFromCheckpoint({ checkpoint, checkpointSha256, closureUtcDate, durableState }) {
  const number = checkpoint.closureContract.changelogNumber;
  const slug = checkpoint.closureContract.changelogSlug;
  return Object.freeze({
    taskId: checkpoint.taskId, suiteId: checkpoint.suiteId, profile: checkpoint.profile,
    session: checkpoint.session, runId: checkpoint.runId, checkpointSha256,
    changelogNumber: number, changelogSlug: slug, closureUtcDate,
    pinnedChangelogPath: `_docs/_CHANGELOG/${number}-${closureUtcDate}-${slug}.md`, durableState,
  });
}
async function requireBoundTransactionArtifactsMatchCheckpointRunAndIdentity({ pair, checkpoint, closureIdentity }) {
  if (closureIdentity.runId !== checkpoint.runId) fail("smoke_transaction_artifact_mismatch", "transaction", "run");
  for (const artifact of pair.boundArtifacts) {
    const name = basename(artifact);
    if (!isRunBoundArtifactName(name, checkpoint.runId)) fail("smoke_transaction_artifact_mismatch", "transaction", name);
    await requireExactRegularFile(artifact, "smoke_transaction_artifact_invalid");
  }
  return pair.boundArtifacts;
}

// ---------------------------------------------------------------------------
// Evidence hash parity, tracked resume boundary, and public entry points
// ---------------------------------------------------------------------------

async function requireEvidenceHashesEqualCheckpoint(checkpoint, repoRoot) {
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const root = join(realRoot, ...checkpoint.evidenceDirectory.split("/"));
  for (const entry of checkpoint.evidenceFiles) {
    requireSafeRepoRelativePath(entry.path, "evidenceFiles.path");
    const bytes = await readFile(join(root, ...entry.path.split("/")));
    if (!timingSafeEqualHex(sha256(bytes), entry.sha256)) fail("smoke_hash_mismatch", entry.path, "bytes");
  }
}
async function auditTrackedEvidenceBoundary(checkpoint, options) {
  try {
    await auditSmokeEvidenceDirectory({
      repoRoot: options.repoRoot, expectedTask: options.expectedTask,
      expectedSuite: checkpoint.suiteId, expectedProfile: checkpoint.profile,
      expectedSession: checkpoint.session, expectedRevision: publicRevision(checkpoint.frozenRuntime),
      requireCheckpoint: true, requireTracked: true,
    });
  } catch (error) {
    if (error instanceof SmokeEvidenceError && error.code === "smoke_evidence_untracked") {
      fail("smoke_owner_stage_required", "evidence", "tracked");
    }
    throw error;
  }
}
export async function createResumeCheckpoint(options) {
  requireExactKeys(
    options,
    ["repoRoot", "expectedTask", "pinnedChangelogNumber", "pinnedChangelogSlug", "expectedWorkflowRole",
     "executingImportMetaUrl", "expectedSuite", "expectedProfile", "expectedSession", "runtimeResult"],
    "createResumeCheckpoint"
  );
  const { repoRoot, expectedTask } = options;
  requireRepoTaskId(expectedTask);
  requireRuntimeSmokeSessionName(options.expectedSession);
  requirePinnedChangelogGrammar(options.pinnedChangelogNumber, options.pinnedChangelogSlug);
  if (!isPlainRecord(options.runtimeResult)) fail("smoke_schema_invalid", "runtimeResult", "not_record");
  const workflowEntry = await requireTaskBoundOwningWorkflow(options);
  await requireNoCanonicalPinnedChangelogOrIndexRow({
    repoRoot, changelogNumber: options.pinnedChangelogNumber, changelogSlug: options.pinnedChangelogSlug,
  });
  // Fail fast on an existing checkpoint before any directory audit: the
  // create-only contract is refuse-overwrite, so a second pause must surface
  // smoke_checkpoint_conflict deterministically even though the stale
  // checkpoint would also perturb the exact file set.
  await requireNoResumeCheckpointFile(repoRoot, expectedTask, options.expectedSession);
  const revision = await computeWorkingTreeRevision(repoRoot, expectedTask, options.expectedSession);
  const result = await auditSmokeEvidenceDirectory({
    repoRoot, expectedTask, expectedSuite: options.expectedSuite,
    expectedProfile: options.expectedProfile, expectedSession: options.expectedSession,
    expectedRevision: publicRevision(revision), requireCheckpoint: false, requireTracked: false,
  });
  const evidenceRoot = await resolveCanonicalEvidenceDirectory(repoRoot, expectedTask, options.expectedSession);
  const manifestSha256 = sha256(await readFile(join(evidenceRoot, "manifest.json")));
  const runId = deterministicRunId(expectedTask, options.expectedSession, result, revision);
  const checkpoint = await validateExactCheckpoint(exactCheckpoint({
    schemaVersion: 1, taskId: expectedTask, suiteId: options.expectedSuite,
    profile: options.expectedProfile, session: options.expectedSession, runId, workflowEntry,
    evidenceDirectory: canonicalRepoRelativeEvidencePath(expectedTask, options.expectedSession),
    manifestSha256, evidenceFiles: await hashSortedReferencedFiles(evidenceRoot, result),
    frozenRuntime: revision,
    closureContract: {
      taskFiles: await listExactPhysicalTaskFamilyFiles(repoRoot, expectedTask),
      supplementalTaskFiles: await resolveOwnerControlledSupplementalClosureTaskFiles(repoRoot, expectedTask),
      changelogNumber: options.pinnedChangelogNumber, changelogSlug: options.pinnedChangelogSlug,
    },
    phase1: { state: "owner_review_required", generatedAt: nowUtc() },
  }));
  await writeNewCheckpointAtomically(repoRoot, expectedTask, options.expectedSession, checkpoint);
  await requireExactPresentSet(repoRoot, expectedTask, options.expectedSession, result.referencedFiles, "resume-checkpoint.json");
  const checkpointSha256 = sha256(canonicalJson(checkpoint));
  return ownerActionRequired(checkpoint, checkpointSha256, workflowEntry, repoRoot);
}
async function ownerActionRequired(checkpoint, checkpointSha256, workflowEntry, repoRoot) {
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const resumeArgv = buildResumeArgv(checkpoint, checkpointSha256, workflowEntry, realRoot);
  return Object.freeze({
    pass: false, code: "owner_action_required", action: "review_and_stage_evidence",
    taskId: checkpoint.taskId, evidenceDirectory: checkpoint.evidenceDirectory,
    checkpointPath: `${checkpoint.evidenceDirectory}/resume-checkpoint.json`,
    checkpointSha256, runId: checkpoint.runId, resumeArgv,
    resumeCommand: buildResumeCommand(resumeArgv),
    frozenRuntimeRevision: publicRevision(checkpoint.frozenRuntime),
  });
}
function buildResumeArgv(checkpoint, checkpointSha256, workflowEntry, realRoot) {
  const entryPath = join(realRoot, ...workflowEntry.split("/"));
  const argv = Object.freeze([
    process.execPath, entryPath, "closure-resume",
    "--checkpoint", `${checkpoint.evidenceDirectory}/resume-checkpoint.json`,
    "--checkpoint-sha256", checkpointSha256, "--run-id", checkpoint.runId,
  ]);
  for (const arg of argv) requireSafeShellArgument(arg);
  return argv;
}
function requireSafeShellArgument(arg) {
  if (typeof arg !== "string" || arg.length === 0 || arg.length > 4096) fail("smoke_shell_argument_unsafe", "resume", "argv");
  if (SHELL_UNSAFE_PATTERN.test(arg)) fail("smoke_shell_argument_unsafe", "resume", "argv");
  return arg;
}
function buildResumeCommand(argv) {
  return argv.map((arg) => `'${arg.replace(/'/gu, `'\\''`)}'`).join(" ");
}
async function readVerifyCheckpointIdentityAndWorkflow(options) {
  const canonicalPath = await canonicalCheckpointPath(options.repoRoot, options.expectedTask, options.expectedSession);
  requireExactPath(options.repoRoot, options.checkpointPath, canonicalPath);
  const bytes = await readCappedFileNoSymlink(canonicalPath, "smoke_checkpoint_missing");
  timingSafeRequireSha256(bytes, options.checkpointSha256);
  let parsed;
  try { parsed = JSON.parse(bytes.toString("utf8")); } catch (error) { fail("smoke_json_invalid", "checkpoint", "parse"); }
  const checkpoint = await validateExactCheckpoint(parsed);
  requireTaskSessionAndRun(checkpoint, options.expectedTask, options.expectedSession, options.runId);
  requireExecutingWorkflowEntry(options.repoRoot, checkpoint.workflowEntry, options.executingWorkflowEntry);
  return checkpoint;
}
function trackedEvidencePass(checkpoint) {
  return Object.freeze({
    pass: true, code: "tracked_evidence_ok",
    taskId: checkpoint.taskId, suiteId: checkpoint.suiteId, profile: checkpoint.profile,
    session: checkpoint.session, runId: checkpoint.runId,
    checkpointPath: `${checkpoint.evidenceDirectory}/resume-checkpoint.json`,
    checkpointSha256: sha256(canonicalJson(checkpoint)),
    frozenRuntimeRevision: publicRevision(checkpoint.frozenRuntime),
  });
}
export async function resumeTrackedEvidence(options) {
  requireExactKeys(options, RESUME_OPTION_KEYS, "resumeTrackedEvidence");
  const executingWorkflowEntry = await requireTaskBoundOwningWorkflow(options);
  const checkpoint = await readVerifyCheckpointIdentityAndWorkflow({ ...options, executingWorkflowEntry });
  await requireRevisionEquals(checkpoint.frozenRuntime, options.repoRoot, options.expectedTask, options.expectedSession);
  await auditTrackedEvidenceBoundary(checkpoint, options);
  await requireEvidenceHashesEqualCheckpoint(checkpoint, options.repoRoot);
  return trackedEvidencePass(checkpoint);
}
export async function openWorkflowClosureResume(options) {
  requireExactKeys(options, RESUME_OPTION_KEYS, "openWorkflowClosureResume");
  const executingWorkflowEntry = await requireTaskBoundOwningWorkflow(options);
  const checkpoint = await readVerifyCheckpointIdentityAndWorkflow({ ...options, executingWorkflowEntry });
  let current = await computeWorkingTreeRevision(options.repoRoot, options.expectedTask, options.expectedSession);
  await auditTrackedEvidenceBoundary(checkpoint, options);
  await requireEvidenceHashesEqualCheckpoint(checkpoint, options.repoRoot);
  let pair = await inspectBoundOrderedChangelogPair(checkpoint, options, {
    validStates: ["none", "file-only", "both"], rejectIndexOnlyCorruptOrMultiple: true,
  });
  if (pair.state === "none" && pair.staleBoundTempOrJournalOnly) {
    await cleanBoundTransactionArtifactsAndFsyncDirectory(pair);
    current = await computeWorkingTreeRevision(options.repoRoot, options.expectedTask, options.expectedSession);
    pair = await inspectBoundOrderedChangelogPair(checkpoint, options, {
      validStates: ["none"], rejectAnyCanonicalMetadata: true,
    });
  }
  if (pair.state === "none" && revisionEquals(current, checkpoint.frozenRuntime)) {
    const closureIdentity = await createFrozenClosureIdentityFromCheckpoint({
      checkpoint, checkpointSha256: options.checkpointSha256,
      closureUtcDate: currentCanonicalUtcDate(), durableState: "none",
    });
    return Object.freeze({ state: "frozen", checkpoint, closureIdentity });
  }
  if (pair.state !== "file-only" && pair.state !== "both") fail("smoke_non_metadata_delta", "closure", `state=${pair.state}`);
  // Discover the identity before constructing the allowlist or validating the
  // delta; it is the only date/path authority consumed by the owning workflow.
  const closureIdentity = await discoverMetadataRecoveryClosureIdentity({
    checkpoint, checkpointSha256: options.checkpointSha256, repoRoot: options.repoRoot,
    expectedTask: options.expectedTask, closureContract: checkpoint.closureContract,
    requireExactlyOneRegularNoSymlinkChangelog: true,
    requireCanonicalPathFromClosureContract: CHANGELOG_TEMPLATE,
    requireStrictBodyTaskDateAndNumber: true,
    requireMatchingChangelogIndexRows: pair.state === "file-only" ? 0 : 1,
    durableState: pair.state,
  });
  if (pair.boundTempOrJournalPresent) {
    await requireBoundTransactionArtifactsMatchCheckpointRunAndIdentity({ pair, checkpoint, closureIdentity });
    await cleanBoundTransactionArtifactsAndFsyncDirectory(pair);
    current = await computeWorkingTreeRevision(options.repoRoot, options.expectedTask, options.expectedSession);
    pair = await inspectBoundOrderedChangelogPair(checkpoint, options, {
      validStates: [closureIdentity.durableState],
      rejectAnyBoundTransactionArtifacts: true, rejectIndexOnlyCorruptOrMultiple: true,
    });
  }
  // `validateMetadataOnlyClosureDelta` is L04-owned; this leaf only forwards
  // lazily so no closure proceeds without the real delta validation. Until
  // that module lands, the metadata_recovery branch fails closed.
  const delta = await validateMetadataOnlyClosureDelta(checkpoint, closureIdentity, options.repoRoot);
  return Object.freeze({ state: "metadata_recovery", checkpoint, closureIdentity, delta });
}
async function validateMetadataOnlyClosureDelta(checkpoint, closureIdentity, repoRoot) {
  try {
    const mod = await import("./smoke-evidence-closure.mjs");
    return await mod.validateMetadataOnlyClosureDelta(checkpoint, closureIdentity, repoRoot);
  } catch (error) {
    if (error instanceof SmokeEvidenceError) throw error;
    fail("smoke_closure_delta_unavailable", "closure", "L04_forward_reference_not_landed");
  }
}
