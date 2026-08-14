// TASK-545-03-L05 TASK-548 committed bootstrap gate: the exact six-path
// receipt schema, its strict normalizer, and the live-Git authorization that
// brands a receipt only after current-HEAD, direct-parent, exact-diff,
// tracked-byte, clean-worktree, and static/import-gate proof. Environment-
// neutral ESM (no repo/runtime/server/DB dependency) so Node and Bun unit
// tests import it directly; `lib/smoke-evidence.mjs` re-exports the three
// public entry points (the 1,000-line gate is why this leaf was split from
// TASK-545-03-L01).
//
// The six TASK-548 files are the only mechanism by which a TASK-548 workflow
// may claim a current-HEAD, exact-six-path committed bootstrap before invoking
// `createResumeCheckpoint`; no TASK-548 fixture may call phase 1 without
// immediately preceding it with this gate. The receipt carries no root,
// timestamp, body, command output, or override, and is never accepted by
// `createResumeCheckpoint`. Missing/stale/wrong-entry receipts reject;
// reordering the six paths, an intervening action between the gate and the
// phase-1 call, an unknown phase-1 option, or a receipt that fails any live
// Git proof rejects. The aggregate is recomputed over the checkpoint-
// compatible canonical JSON `{ priorHead, files }` (same canonicalJson as the
// checkpoint family) with one final LF. Errors are machine-readable and never
// leak receipt bodies: codes, canonical repo-relative paths, hashes, and
// bounded counts only.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  SmokeEvidenceError,
  canonicalJson,
  isLowercaseHex,
  requireExactKeys,
  requireRealGitTopLevel,
  sha256,
} from "./smoke-evidence.mjs";

// The exact, order-sensitive TASK-548 committed-bootstrap file set.
// `_docs/_workflows/task-548-closeout.mjs` is intentionally not part of the
// constant: a phase-1 committed bootstrap covers exactly these six files.
export const TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1 = Object.freeze([
  "_docs/_workflows/lib/task-548-contract.mjs",
  "_docs/_workflows/task-548-author-audit.mjs",
  "_docs/_workflows/task-548-fix.mjs",
  "_docs/_workflows/task-548-implement.mjs",
  "tests/unit/workflows/task548AuthorAudit.test.ts",
  "tests/unit/workflows/task548WorkflowContracts.test.ts",
]);

const RECEIPT_SCHEMA = "coderso.task548-committed-bootstrap@v1";
const TASK_ID = "TASK-548";
const WORKFLOW_ENTRY = "_docs/_workflows/task-548-implement.mjs";
const EXPECTED_FILES_COUNT = 6;
const MAX_WORKFLOW_ENTRY_BYTES = 1_048_576;
// Bounded runtime subset of the TASK-545-01-L02 static-contract/import gates:
// the owning workflow entry must import at least one canonical `./lib/` driver
// (including this L05 family) and must never contain direct agent staging
// patterns; the full AST gate stays static.
const CANONICAL_DRIVER_IMPORT_PATTERN =
  /from\s+["']\.\/lib\/(?:smoke-evidence(?:-checkpoint|-closure|-task548)?|audit-rounds|post-audit|workflow-contracts)\.mjs["']/u;
const FORBIDDEN_ENTRY_PATTERN = /git\s+add|git\s+commit/iu;

// Opaque brand: only `requireTask548CommittedSixPathBootstrapAuthorizationV1`
// may attach it, and only after every live Git proof has passed. The symbol is
// never exported, so a caller can never forge the verified type.
const verifiedTask548Bootstrap = Symbol("coderso.task548-committed-bootstrap-verified");

function fail(code, label, detail) {
  throw new SmokeEvidenceError(code, label, detail);
}

function isPlainRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

// Aggregate over the checkpoint-compatible canonical JSON `{ priorHead,
// files }` with displayed key order and one final LF:
// sha256(canonicalJson({ priorHead, files }) + "\n").
function aggregateFor(priorHead, files) {
  return sha256(`${canonicalJson({ priorHead, files })}\n`);
}

// Files must be exactly the six constant paths, path-sorted constant
// membership in exact order, each with a lowercase 64-hex sha256. Unknown
// keys, missing keys, substitution, and reordering all reject.
function requireExactSixFiles(value) {
  if (!Array.isArray(value) || value.length !== EXPECTED_FILES_COUNT) {
    fail("smoke_task548_schema_invalid", "files", "array_bounds");
  }
  const files = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    requireExactKeys(entry, ["path", "sha256"], `files[${index}]`);
    const expectedPath = TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1[index];
    if (entry.path !== expectedPath) fail("smoke_task548_path_invalid", "files", "order_or_membership");
    if (!isLowercaseHex(entry.sha256, 64)) fail("smoke_task548_hash_invalid", "files", "grammar");
    files.push(Object.freeze({ path: entry.path, sha256: entry.sha256 }));
  }
  return Object.freeze(files);
}

export function normalizeTask548CommittedSixPathBootstrapReceiptV1(value) {
  requireExactKeys(
    value,
    ["schema", "taskId", "priorHead", "head", "workflowEntry", "files", "aggregateSha256"],
    "receipt"
  );
  if (value.schema !== RECEIPT_SCHEMA) fail("smoke_task548_schema_invalid", "schema", "const");
  if (value.taskId !== TASK_ID) fail("smoke_task548_schema_invalid", "taskId", "const");
  if (value.workflowEntry !== WORKFLOW_ENTRY) fail("smoke_task548_schema_invalid", "workflowEntry", "const");
  if (!isLowercaseHex(value.priorHead, 40)) fail("smoke_task548_hash_invalid", "priorHead", "grammar");
  if (!isLowercaseHex(value.head, 40)) fail("smoke_task548_hash_invalid", "head", "grammar");
  const files = requireExactSixFiles(value.files);
  if (!isLowercaseHex(value.aggregateSha256, 64)) fail("smoke_task548_hash_invalid", "aggregateSha256", "grammar");
  if (value.aggregateSha256 !== aggregateFor(value.priorHead, files)) {
    fail("smoke_task548_aggregate_mismatch", "aggregateSha256", "recomputed");
  }
  return deepFreeze({
    schema: RECEIPT_SCHEMA,
    taskId: TASK_ID,
    priorHead: value.priorHead,
    head: value.head,
    workflowEntry: WORKFLOW_ENTRY,
    files,
    aggregateSha256: value.aggregateSha256,
  });
}

// ---------------------------------------------------------------------------
// Live-Git proof helpers
// ---------------------------------------------------------------------------

function gitCommand(repoRoot, args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    });
  } catch (error) {
    fail("smoke_task548_git_failed", "git", args[0] ?? "run");
  }
}

function gitShowHeadBytes(repoRoot, path) {
  try {
    return execFileSync("git", ["show", `HEAD:${path}`], {
      cwd: repoRoot,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    });
  } catch (error) {
    return null; // not present at HEAD
  }
}

function requireCurrentHeadEqualsHead(receipt, realRoot) {
  const current = gitCommand(realRoot, ["rev-parse", "HEAD"]).trim();
  if (!isLowercaseHex(current, 40)) fail("smoke_task548_repository_invalid", "head", "grammar");
  if (current !== receipt.head) fail("smoke_task548_head_stale", "head", receipt.head);
}

// HEAD must have exactly one parent and that parent must equal priorHead.
function requireSingleDirectChildOfPriorHead(receipt, realRoot) {
  const line = gitCommand(realRoot, ["rev-list", "--parents", "-n", "1", "HEAD"]).trim();
  const parts = line.split(/\s+/u).filter((part) => part.length > 0);
  if (parts.length !== 2 || parts[0] !== receipt.head || parts[1] !== receipt.priorHead) {
    fail("smoke_task548_parent_mismatch", "parent", "not_single_direct_child");
  }
}

// The exact diff between priorHead and head must be exactly the six paths.
function requireExactCommittedDiff(receipt, expectedPaths, realRoot) {
  const raw = gitCommand(realRoot, ["diff", "--name-only", "-z", receipt.priorHead, receipt.head]);
  const actual = raw.split("\0").filter((path) => path.length > 0).sort();
  const expected = [...expectedPaths].sort();
  if (actual.length !== expected.length || actual.some((path, index) => path !== expected[index])) {
    fail("smoke_task548_diff_mismatch", "diff", "paths");
  }
}

// Every tracked HEAD byte hash must match the receipt's file hash; a missing
// file at HEAD or a caller-supplied/faked hash value fails closed.
function requireTrackedHeadByteHashes(receipt, realRoot) {
  for (const file of receipt.files) {
    const bytes = gitShowHeadBytes(realRoot, file.path);
    if (bytes === null) fail("smoke_task548_byte_mismatch", "file", file.path);
    if (sha256(bytes) !== file.sha256) fail("smoke_task548_byte_mismatch", "file", file.path);
  }
}

async function requireEachPathRegularNoSymlink(realRoot, paths) {
  for (const path of paths) {
    let entryStat;
    try {
      entryStat = await lstat(join(realRoot, ...path.split("/")));
    } catch (error) {
      if (error.code === "ENOENT") fail("smoke_task548_dirty", "worktree", path);
      throw error;
    }
    if (entryStat.isSymbolicLink()) fail("smoke_task548_entry_symlink", "worktree", path);
    if (!entryStat.isFile()) fail("smoke_task548_entry_not_regular", "worktree", path);
  }
}

// Worktree and index must be clean for the six paths: `git status
// --porcelain=v1 -z` covers both staged (index) and unstaged (worktree)
// changes in one call.
function requireCleanWorktreeForPaths(realRoot, paths) {
  const status = gitCommand(realRoot, ["status", "--porcelain=v1", "-z", "--", ...paths]);
  if (status.length > 0) fail("smoke_task548_dirty", "worktree", "dirty");
}

async function requireExactWorkflowStaticImportGates(realRoot, entry) {
  const bytes = await readFile(join(realRoot, ...entry.split("/")));
  if (bytes.length > MAX_WORKFLOW_ENTRY_BYTES) fail("smoke_task548_entry_not_regular", "workflow", entry);
  const source = bytes.toString("utf8");
  if (!CANONICAL_DRIVER_IMPORT_PATTERN.test(source)) fail("smoke_task548_static_contract", "workflow", "imports");
  if (FORBIDDEN_ENTRY_PATTERN.test(source)) fail("smoke_task548_static_contract", "workflow", "staging");
}

// Private gate: proves the normalized receipt against the live repository.
// The flags mirror the exact TASK-548 phase-1 requirement groups; the L05
// caller always enables every group. A caller-supplied hash, path order, or
// receipt body is never trusted on its own.
async function requireExactCommittedTask548SixPathReceipt(receipt, options) {
  requireExactKeys(
    options,
    [
      "repoRoot",
      "expectedTask",
      "expectedWorkflowEntry",
      "expectedPaths",
      "requireExactSchemaTaskPriorHeadCurrentHeadFilesAndAggregate",
      "requireCurrentHeadDirectParentEqualsPriorHead",
      "requireCurrentHeadAndExactStaticImportGates",
    ],
    "task548Receipt"
  );
  if (options.expectedTask !== TASK_ID) fail("smoke_task548_schema_invalid", "expectedTask", "const");
  if (options.expectedWorkflowEntry !== WORKFLOW_ENTRY) {
    fail("smoke_task548_schema_invalid", "expectedWorkflowEntry", "const");
  }
  if (!Array.isArray(options.expectedPaths) || options.expectedPaths.length !== EXPECTED_FILES_COUNT) {
    fail("smoke_task548_path_invalid", "expectedPaths", "set");
  }
  let verified = receipt;
  if (options.requireExactSchemaTaskPriorHeadCurrentHeadFilesAndAggregate === true) {
    verified = normalizeTask548CommittedSixPathBootstrapReceiptV1(receipt);
  }
  const realRoot = await requireRealGitTopLevel(options.repoRoot);
  if (options.requireCurrentHeadDirectParentEqualsPriorHead === true) {
    requireCurrentHeadEqualsHead(verified, realRoot);
    requireSingleDirectChildOfPriorHead(verified, realRoot);
  }
  if (options.requireCurrentHeadAndExactStaticImportGates === true) {
    requireExactCommittedDiff(verified, options.expectedPaths, realRoot);
    requireTrackedHeadByteHashes(verified, realRoot);
    await requireEachPathRegularNoSymlink(realRoot, options.expectedPaths);
    requireCleanWorktreeForPaths(realRoot, options.expectedPaths);
    await requireExactWorkflowStaticImportGates(realRoot, options.expectedWorkflowEntry);
  }
}

function brandVerifiedTask548CommittedBootstrapReceipt(receipt) {
  return deepFreeze({ ...receipt, [verifiedTask548Bootstrap]: true });
}

// Phase-1 gate: the receipt is normalized strictly, then the live Git proof
// runs; only then is the opaque brand attached. The branded receipt is the
// sole acceptable input to the exact-argument TASK-548 phase-1 call and must
// never be passed into `createResumeCheckpoint`.
export async function requireTask548CommittedSixPathBootstrapAuthorizationV1(options) {
  requireExactKeys(options, ["repoRoot", "receipt"], "requireTask548CommittedSixPathBootstrapAuthorizationV1");
  const receipt = normalizeTask548CommittedSixPathBootstrapReceiptV1(options.receipt);
  await requireExactCommittedTask548SixPathReceipt(receipt, {
    repoRoot: options.repoRoot,
    expectedTask: TASK_ID,
    expectedWorkflowEntry: WORKFLOW_ENTRY,
    expectedPaths: TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1,
    requireExactSchemaTaskPriorHeadCurrentHeadFilesAndAggregate: true,
    requireCurrentHeadDirectParentEqualsPriorHead: true,
    requireCurrentHeadAndExactStaticImportGates: true,
  });
  return brandVerifiedTask548CommittedBootstrapReceipt(receipt);
}
