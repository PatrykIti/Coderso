// TASK-545-03-L04 closure metadata delta and closure-delta CLI: the mutation
// plan builder, the ordered-durable changelog-file-then-index writer, the
// metadata-only delta validator, and the `closure-delta` diagnostic entry.
// Environment-neutral ESM; `lib/smoke-evidence.mjs` only re-exports this
// surface (the 1,000-line gate is why this leaf was split from L01). It
// applies only bounded metadata writes to the exact frozen task/index/
// changelog allowlist and never blesses source, test, workflow, evidence, or
// HEAD drift. Ordered-pair recovery never accepts index-only/corrupt/multiple
// state or treats stale temp/journal bytes as date authority.

import { execFileSync } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  SmokeEvidenceError,
  canonicalJson,
  computeWorkingTreeRevision,
  isLowercaseHex,
  publicRevision,
  readExactGitHead,
  requireExactKeys,
  requireRealGitTopLevel,
  requireRepoTaskId,
  requireRuntimeSmokeSessionName,
  requireSafeRepoRelativePath,
  resolveCanonicalEvidenceDirectory,
  sha256,
  timingSafeEqualHex,
} from "./smoke-evidence.mjs";

export const ORDERED_DURABLE_CHANGELOG_FILE_THEN_INDEX_V1 = "ordered-durable-changelog-file-then-index@v1";
const MAX_METADATA_FILE_BYTES = 1_048_576;
const MAX_CHECKPOINT_BYTES = 4_194_304;
const CHANGELOG_FILE_PATTERN = /^(\d{3,4})-(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/u;
const KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const CANONICAL_STATUS_VALUES = new Set(["⏳ To Do", "🚧 In Progress", "✅ Done", "⏭️ Superseded", "❌ Cancelled"]);
const CLOSURE_STATUS = "✅ Done";
const ALLOWED_OPERATION_KINDS = new Set([
  "replace_once", "upsert_field", "replace_board_row", "replace_statistics_row",
  "create_file", "insert_after",
]);
const INDEX_ROW_PATTERN = /^\|\s*(\d{3,4})\s*\|/u;
const CHECKPOINT_KEYS = new Set([
  "schemaVersion", "taskId", "suiteId", "profile", "session", "runId", "workflowEntry",
  "evidenceDirectory", "manifestSha256", "evidenceFiles", "frozenRuntime", "closureContract", "phase1",
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
function uniqueSorted(paths) {
  return Object.freeze([...new Set(paths)].sort());
}
function gitShowRevisionBytes(repoRoot, gitHead, path) {
  try {
    return execFileSync("git", ["show", `${gitHead}:${path}`], {
      cwd: repoRoot, encoding: "buffer", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    });
  } catch (error) { return null; }
}
async function requireExactRegularFile(path, missingCode = "smoke_changelog_file_invalid") {
  try {
    const entry = await lstat(path);
    if (!entry.isFile() || entry.isSymbolicLink()) fail(missingCode, path, "not_regular");
  } catch (error) {
    if (error.code === "ENOENT") fail("smoke_changelog_file_missing", path, "missing");
    throw error;
  }
}
async function readCappedFileNoSymlink(path, missingCode = "smoke_checkpoint_missing", maxBytes = MAX_METADATA_FILE_BYTES) {
  await requireExactRegularFile(path, missingCode);
  const bytes = await readFile(path);
  if (bytes.length > maxBytes) fail("smoke_changelog_too_large", path, `size=${bytes.length}`);
  return bytes;
}
function timingSafeRequireSha256(bytes, expected) {
  if (typeof expected !== "string" || !isLowercaseHex(expected, 64)) fail("smoke_checkpoint_hash_invalid", "sha256", "grammar");
  const actual = sha256(bytes);
  if (timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex")) === false) {
    fail("smoke_checkpoint_hash_mismatch", "checkpoint", "bytes");
  }
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
      if (entry.isSymbolicLink() || !entry.isFile()) fail("smoke_transaction_artifact_invalid", "transaction", name);
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

// Checkpoint/evidence still-exact guard (L04-owned, defense in depth)

// Re-verifies exact checkpoint bytes, every evidence hash, and the frozen HEAD before any plan/delta.
async function requireCheckpointAndEvidenceStillExact(checkpoint, { closureIdentity, repoRoot }) {
  requireExactKeys(closureIdentity, [
    "taskId", "suiteId", "profile", "session", "runId", "checkpointSha256",
    "changelogNumber", "changelogSlug", "closureUtcDate", "pinnedChangelogPath", "durableState",
  ], "closureIdentity");
  for (const field of ["taskId", "suiteId", "profile", "session", "runId"]) {
    if (checkpoint[field] !== closureIdentity[field]) fail("smoke_closure_identity_mismatch", field, "binding");
  }
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const dir = await resolveCanonicalEvidenceDirectory(realRoot, closureIdentity.taskId, closureIdentity.session);
  const checkpointBytes = await readCappedFileNoSymlink(join(dir, "resume-checkpoint.json"), "smoke_checkpoint_missing", MAX_CHECKPOINT_BYTES);
  timingSafeRequireSha256(checkpointBytes, closureIdentity.checkpointSha256);
  for (const entry of checkpoint.evidenceFiles) {
    requireSafeRepoRelativePath(entry.path, "evidenceFiles.path");
    const bytes = await readFile(join(dir, ...entry.path.split("/")));
    if (!timingSafeEqualHex(sha256(bytes), entry.sha256)) fail("smoke_hash_mismatch", entry.path, "bytes");
  }
  const gitHead = await readExactGitHead(realRoot);
  if (gitHead !== checkpoint.frozenRuntime.gitHead) fail("smoke_head_changed", "gitHead", gitHead);
  return checkpoint;
}

// Frozen closure contract and exact metadata allowlist

function requirePinnedChangelogGrammar(changelogNumber, changelogSlug) {
  if (!Number.isInteger(changelogNumber) || changelogNumber < 1) fail("smoke_changelog_number_invalid", "changelogNumber", String(changelogNumber));
  if (typeof changelogSlug !== "string" || !KEBAB_PATTERN.test(changelogSlug)) fail("smoke_changelog_slug_invalid", "changelogSlug", "grammar");
}
// Strict frozen closure-contract validation: exact keys, canonical indexes, sorted unique disjoint lists.
function validateExactFrozenClosureContract(frozenContract, flags) {
  const rejectUnknownKeys = flags?.rejectUnknownKeys === true;
  if (!isPlainRecord(frozenContract)) fail("smoke_closure_contract_invalid", "closureContract", "not_record");
  const allowed = new Set([
    "taskFiles", "supplementalTaskFiles", "taskIndex", "changelogIndex", "changelogNumber", "changelogSlug",
  ]);
  for (const key of Object.keys(frozenContract)) {
    if (!allowed.has(key) && rejectUnknownKeys) fail("smoke_closure_contract_invalid", `closureContract.${key}`, "unknown");
  }
  if (frozenContract.taskIndex !== "_docs/_TASKS/README.md") fail("smoke_closure_contract_invalid", "taskIndex", "value");
  if (frozenContract.changelogIndex !== "_docs/_CHANGELOG/README.md") fail("smoke_closure_contract_invalid", "changelogIndex", "value");
  requirePinnedChangelogGrammar(frozenContract.changelogNumber, frozenContract.changelogSlug);
  for (const listName of ["taskFiles", "supplementalTaskFiles"]) {
    const list = frozenContract[listName];
    if (!Array.isArray(list)) fail("smoke_closure_contract_invalid", listName, "not_array");
    for (const path of list) {
      if (typeof path !== "string") fail("smoke_closure_contract_invalid", listName, "not_string");
      requireSafeRepoRelativePath(path, listName);
    }
    const sorted = [...list].sort();
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i - 1] === sorted[i]) fail("smoke_closure_contract_invalid", listName, "duplicate");
    }
    if (flags?.requireSortedUniqueTaskAndSupplementalFiles === true) {
      for (let i = 1; i < list.length; i += 1) {
        if (list[i - 1] >= list[i]) fail("smoke_closure_contract_invalid", listName, "not_sorted_unique");
      }
    }
  }
  if (flags?.requireDisjointTaskAndSupplementalFiles === true) {
    const taskSet = new Set(frozenContract.taskFiles);
    for (const path of frozenContract.supplementalTaskFiles) {
      if (taskSet.has(path)) fail("smoke_closure_contract_invalid", "supplementalTaskFiles", "overlap");
    }
  }
  return frozenContract;
}
// Pinned changelog path must be exactly `_docs/_CHANGELOG/{number}-{date}-{slug}.md`; any mismatch fails closed.
function requirePinnedChangelogPathMatchesFrozenNumberSlugAndDate(pinnedChangelogPath, frozenContract, closureUtcDate) {
  requirePinnedChangelogGrammar(frozenContract.changelogNumber, frozenContract.changelogSlug);
  if (typeof closureUtcDate !== "string" || !isValidCalendarDate(closureUtcDate)) {
    fail("smoke_changelog_date_invalid", "closureUtcDate", "grammar");
  }
  if (typeof pinnedChangelogPath !== "string") fail("smoke_changelog_path_invalid", "pinnedChangelogPath", "not_string");
  requireSafeRepoRelativePath(pinnedChangelogPath, "pinnedChangelogPath");
  const expected = `_docs/_CHANGELOG/${frozenContract.changelogNumber}-${closureUtcDate}-${frozenContract.changelogSlug}.md`;
  if (pinnedChangelogPath !== expected) fail("smoke_changelog_path_invalid", "pinnedChangelogPath", expected);
  return pinnedChangelogPath;
}
export function buildExactClosureMetadataAllowlist({ frozenContract, pinnedChangelogPath, closureUtcDate }) {
  validateExactFrozenClosureContract(frozenContract, {
    requireSortedUniqueTaskAndSupplementalFiles: true,
    requireDisjointTaskAndSupplementalFiles: true,
    rejectUnknownKeys: true,
  });
  requirePinnedChangelogPathMatchesFrozenNumberSlugAndDate(pinnedChangelogPath, frozenContract, closureUtcDate);
  return new Set([
    ...frozenContract.taskFiles,
    ...frozenContract.supplementalTaskFiles,
    frozenContract.taskIndex,
    frozenContract.changelogIndex,
    pinnedChangelogPath,
  ]);
}

// Mutation plan builder

async function readFrozenTaskIndexAndChangelogBytes(checkpoint, repoRoot) {
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const gitHead = checkpoint.frozenRuntime.gitHead;
  const taskIndexBytes = gitShowRevisionBytes(realRoot, gitHead, checkpoint.closureContract.taskIndex);
  const changelogIndexBytes = gitShowRevisionBytes(realRoot, gitHead, checkpoint.closureContract.changelogIndex);
  if (taskIndexBytes === null) fail("smoke_changelog_index_missing", "taskIndex", "frozen");
  if (changelogIndexBytes === null) fail("smoke_changelog_index_missing", "changelogIndex", "frozen");
  return { taskIndexBytes, changelogIndexBytes };
}
async function readFreshIndexes(repoRoot) {
  const realRoot = await requireRealGitTopLevel(repoRoot);
  let taskIndexBytes;
  let changelogIndexBytes;
  try {
    taskIndexBytes = await readFile(join(realRoot, "_docs", "_TASKS", "README.md"));
    changelogIndexBytes = await readFile(join(realRoot, "_docs", "_CHANGELOG", "README.md"));
  } catch (error) {
    if (error.code === "ENOENT") fail("smoke_changelog_index_missing", "index", "fresh");
    throw error;
  }
  return { taskIndexBytes, changelogIndexBytes };
}
// Plan-time freshness guard: with durableState none, working-tree indexes must equal frozen HEAD bytes.
async function requireFreshIndexesMatchFrozenWhenDurableStateNone(freshIndexes, frozenBytes, closureIdentity) {
  if (closureIdentity.durableState !== "none") return;
  if (sha256(freshIndexes.taskIndexBytes) !== sha256(frozenBytes.taskIndexBytes) ||
      sha256(freshIndexes.changelogIndexBytes) !== sha256(frozenBytes.changelogIndexBytes)) {
    fail("smoke_changelog_index_base_changed", "index", "fresh_vs_frozen");
  }
}
function countOccurrences(text, search) {
  let count = 0;
  let index = 0;
  while (index <= text.length - search.length) {
    const found = text.indexOf(search, index);
    if (found === -1) break;
    count += 1;
    index = found + search.length;
  }
  return count;
}
function requireExactlyOneOccurrence(text, search, code, label) {
  const count = countOccurrences(text, search);
  if (count !== 1) fail(code, label, `occurrences=${count}`);
  return search;
}
// Applies a deep-frozen operation; every search/anchor must occur exactly once (missing/ambiguous fail closed).
function applyOperation(bytes, operation) {
  const text = bytes.toString("utf8");
  const kind = operation.kind;
  if (kind === "create_file") return Buffer.from(operation.bytes, "utf8");
  if (kind === "replace_once") {
    requireExactlyOneOccurrence(text, operation.search, "smoke_metadata_field_invalid", operation.label);
    return Buffer.from(text.replace(operation.search, operation.replacement), "utf8");
  }
  if (kind === "upsert_field") {
    const prefix = `**${operation.field}:**`;
    const lines = text.split("\n");
    const existingIndex = lines.findIndex((line) => line.startsWith(prefix));
    if (existingIndex !== -1) {
      lines[existingIndex] = `${prefix} ${operation.value}`;
    } else {
      const anchorPrefix = `**${operation.afterField}:**`;
      const anchorIndexes = lines.map((line, index) => (line.startsWith(anchorPrefix) ? index : -1)).filter((index) => index !== -1);
      if (anchorIndexes.length !== 1) fail("smoke_metadata_field_invalid", operation.field, "anchor_ambiguous");
      lines.splice(anchorIndexes[0] + 1, 0, `${prefix} ${operation.value}`);
    }
    return Buffer.from(lines.join("\n"), "utf8");
  }
  if (kind === "replace_board_row" || kind === "replace_statistics_row") {
    const lines = text.split("\n");
    const matches = lines.map((line, index) => (line === operation.from ? index : -1)).filter((index) => index !== -1);
    if (matches.length !== 1) fail("duplicateBoardStatisticRejected", operation.label, `matches=${matches.length}`);
    lines[matches[0]] = operation.to;
    return Buffer.from(lines.join("\n"), "utf8");
  }
  if (kind === "insert_after") {
    const lines = text.split("\n");
    const matches = lines.map((line, index) => (line === operation.anchor ? index : -1)).filter((index) => index !== -1);
    if (matches.length !== 1) fail("smoke_metadata_field_invalid", operation.label, `anchors=${matches.length}`);
    lines.splice(matches[0] + 1, 0, operation.line);
    return Buffer.from(lines.join("\n"), "utf8");
  }
  fail("smoke_metadata_operation_invalid", kind, "kind");
}
// Strict bounded closure-evidence template; carries the exact `# {number} - `, `**Date:**`, `**Tasks:**` markers.
function buildPinnedChangelogBytes(checkpoint, closureIdentity) {
  const title = closureIdentity.changelogSlug.split("-").map((part) => {
    if (/^\d+$/u.test(part)) return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(" ");
  return [
    `# ${closureIdentity.changelogNumber} - ${title}`,
    "",
    `**Date:** ${closureIdentity.closureUtcDate}`,
    "**Version:** Unreleased",
    `**Tasks:** ${closureIdentity.taskId}`,
    "",
    "## Key Changes",
    "",
    "- Metadata-only closure delta validated and applied under the smoke evidence contract.",
    "",
  ].join("\n");
}
function buildTaskFileOperations(taskId, frozenBytes, closureUtcDate) {
  void taskId;
  const text = frozenBytes.toString("utf8");
  const operations = [];
  const statusPrefix = "**Status:**";
  const statusLines = text.split("\n").filter((line) => line.startsWith(statusPrefix));
  if (statusLines.length !== 1) fail("smoke_metadata_field_invalid", "Status", `lines=${statusLines.length}`);
  const currentStatus = statusLines[0].slice(statusPrefix.length).trim();
  if (!CANONICAL_STATUS_VALUES.has(currentStatus)) fail("smoke_metadata_field_invalid", "Status", "value");
  if (currentStatus !== CLOSURE_STATUS) {
    operations.push(Object.freeze({
      kind: "replace_once", label: "task_status", search: statusLines[0], replacement: `**Status:** ${CLOSURE_STATUS}`,
    }));
  }
  operations.push(Object.freeze({
    kind: "upsert_field", label: "task_started", field: "Started", afterField: "Status", value: closureUtcDate,
  }));
  operations.push(Object.freeze({
    kind: "upsert_field", label: "task_completed", field: "Completed", afterField: "Started", value: closureUtcDate,
  }));
  return Object.freeze(operations);
}
// Replaces the canonical status cell in an exact owning board/statistics row, keeping every other cell.
function replaceStatusCellInRow(row, currentStatus) {
  if (!CANONICAL_STATUS_VALUES.has(currentStatus)) fail("smoke_metadata_field_invalid", "row_status", "value");
  const cells = row.split("|").map((cell) => cell.trim());
  const statusCellIndex = cells.findIndex((cell) => cell === currentStatus);
  if (statusCellIndex === -1) fail("smoke_metadata_field_invalid", "row_status", "cell_missing");
  const next = cells.slice();
  next[statusCellIndex] = CLOSURE_STATUS;
  return `| ${next.slice(1, -1).join(" | ")} |`;
}
// Board/Statistics lookup is scoped to the owning section; wrong-section, zero, or two rows fail closed.
function sectionLines(text, heading) {
  const lines = text.split("\n");
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex === -1) return [];
  const section = [];
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (/^##\s/u.test(lines[index])) break;
    section.push(lines[index]);
  }
  return section;
}
function findSingleTableRow(text, taskId, section, label, code) {
  const matches = sectionLines(text, section).filter((line) => line.startsWith(`| ${taskId} |`));
  if (matches.length === 0) fail(code, label, "missing");
  if (matches.length > 1) fail("duplicateBoardStatisticRejected", label, `matches=${matches.length}`);
  return matches[0];
}
function buildBoardAndStatisticsOperations(taskId, taskIndexBytes) {
  const text = taskIndexBytes.toString("utf8");
  const boardRow = findSingleTableRow(text, taskId, "## Board", "board_row", "boardRowMissing");
  const boardStatus = boardRow.split("|").map((cell) => cell.trim()).find((cell) => CANONICAL_STATUS_VALUES.has(cell)) ?? "⏳ To Do";
  const statisticsRow = findSingleTableRow(text, taskId, "## Statistics", "statistics", "boardStatisticMissing");
  const statisticsStatus = statisticsRow.split("|").map((cell) => cell.trim()).find((cell) => CANONICAL_STATUS_VALUES.has(cell)) ?? "⏳ To Do";
  return Object.freeze([
    Object.freeze({ kind: "replace_board_row", label: "board_row", from: boardRow, to: replaceStatusCellInRow(boardRow, boardStatus) }),
    Object.freeze({ kind: "replace_statistics_row", label: "statistics", from: statisticsRow, to: replaceStatusCellInRow(statisticsRow, statisticsStatus) }),
  ]);
}
function slugTitle(slug) {
  return slug.split("-").map((part) => (/^\d+$/u.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1))).join(" ");
}
function buildChangelogIndexOperations(taskId, changelogIndexBytes, closureIdentity) {
  void taskId;
  const text = changelogIndexBytes.toString("utf8");
  const lines = text.split("\n");
  const separatorIndex = lines.findIndex((line) => /^\|-+(\|-+)*\|$/u.test(line) && line.includes("---"));
  if (separatorIndex === -1) fail("smoke_changelog_index_invalid", "index", "separator_missing");
  const row = `| ${closureIdentity.changelogNumber} | ${closureIdentity.closureUtcDate} | ${slugTitle(closureIdentity.changelogSlug)} | TASK-545 |`;
  const pointerPattern = /Next changelog number:\s*(\d{3,4})\./u;
  const pointerMatch = pointerPattern.exec(text);
  if (pointerMatch === null) fail("smoke_changelog_index_invalid", "index", "pointer_missing");
  const pointerFrom = pointerMatch[0];
  const pointerTo = pointerFrom.replace(pointerPattern, `Next changelog number: ${closureIdentity.changelogNumber + 1}.`);
  return Object.freeze([
    Object.freeze({ kind: "insert_after", label: "changelog_index_row", anchor: lines[separatorIndex], line: row }),
    Object.freeze({ kind: "replace_once", label: "changelog_index_pointer", search: pointerFrom, replacement: pointerTo }),
  ]);
}
function applyOperations(frozenBytes, operations) {
  let bytes = frozenBytes;
  for (const operation of operations) bytes = applyOperation(bytes, operation);
  return bytes;
}
async function buildExactClosureMetadataMutationRecords({ checkpoint, closureIdentity, repoRoot, frozenBytes }) {
  const records = [];
  const gitHead = checkpoint.frozenRuntime.gitHead;
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const allowlistPaths = uniqueSorted([
    ...checkpoint.closureContract.taskFiles,
    ...(checkpoint.closureContract.supplementalTaskFiles ?? []),
    checkpoint.closureContract.taskIndex,
    checkpoint.closureContract.changelogIndex,
    closureIdentity.pinnedChangelogPath,
  ]);
  for (const path of allowlistPaths) {
    if (path === closureIdentity.pinnedChangelogPath) {
      const bytes = buildPinnedChangelogBytes(checkpoint, closureIdentity);
      records.push(Object.freeze({
        path,
        beforeSha256: sha256(Buffer.alloc(0)),
        operations: Object.freeze([Object.freeze({ kind: "create_file", label: "changelog_file", bytes })]),
        expectedAfterSha256: sha256(Buffer.from(bytes, "utf8")),
      }));
      continue;
    }
    const frozenBytesAtHead = frozenBytes?.[path] ?? gitShowRevisionBytes(realRoot, gitHead, path);
    if (frozenBytesAtHead === null) fail("smoke_path_untracked", "plan", path);
    let operations;
    if (path === checkpoint.closureContract.taskIndex) {
      operations = buildBoardAndStatisticsOperations(checkpoint.taskId, frozenBytesAtHead);
    } else if (path === checkpoint.closureContract.changelogIndex) {
      operations = buildChangelogIndexOperations(checkpoint.taskId, frozenBytesAtHead, closureIdentity);
    } else {
      operations = buildTaskFileOperations(checkpoint.taskId, frozenBytesAtHead, closureIdentity.closureUtcDate);
    }
    records.push(Object.freeze({
      path,
      beforeSha256: sha256(frozenBytesAtHead),
      operations,
      expectedAfterSha256: sha256(applyOperations(frozenBytesAtHead, operations)),
    }));
  }
  return Object.freeze(records);
}
function validateExactMutationRecordSet(records, flags) {
  if (!Array.isArray(records)) fail("smoke_plan_invalid", "records", "not_array");
  const paths = records.map((record) => record.path);
  if (flags?.requireSortedUniquePaths === true) {
    const sorted = uniqueSorted(paths);
    for (let i = 0; i < paths.length; i += 1) if (paths[i] !== sorted[i]) fail("smoke_plan_invalid", "paths", "not_sorted_unique");
  }
  for (const record of records) {
    if (!isPlainRecord(record)) fail("smoke_plan_invalid", "record", "not_record");
    if (flags?.rejectUnknownKeys === true) {
      const keys = new Set(["path", "beforeSha256", "operations", "expectedAfterSha256"]);
      for (const key of Object.keys(record)) if (!keys.has(key)) fail("smoke_plan_invalid", `record.${key}`, "unknown");
    }
    if (typeof record.path !== "string" || record.path.length === 0) fail("smoke_plan_invalid", "path", "missing");
    if (!isLowercaseHex(record.beforeSha256, 64) || !isLowercaseHex(record.expectedAfterSha256, 64)) {
      fail("smoke_plan_invalid", record.path, "sha256");
    }
    if (!Array.isArray(record.operations) || record.operations.length === 0) fail("smoke_plan_invalid", record.path, "operations");
    for (const operation of record.operations) {
      if (!isPlainRecord(operation)) fail("smoke_plan_invalid", record.path, "operation_not_record");
      if (flags?.rejectNonMetadataOperations === true && !ALLOWED_OPERATION_KINDS.has(operation.kind)) {
        fail("smoke_plan_invalid", record.path, "operation_kind");
      }
    }
  }
  return records;
}
export async function buildClosureMetadataMutationPlanV1(checkpoint, closureIdentity, options) {
  requireExactKeys(options, ["repoRoot"], "buildClosureMetadataMutationPlanV1");
  await requireCheckpointAndEvidenceStillExact(checkpoint, { closureIdentity, repoRoot: options.repoRoot });
  const frozenBytes = await readFrozenTaskIndexAndChangelogBytes(checkpoint, options.repoRoot);
  const freshIndexes = await readFreshIndexes(options.repoRoot);
  await requireFreshIndexesMatchFrozenWhenDurableStateNone(freshIndexes, frozenBytes, closureIdentity);
  const records = await buildExactClosureMetadataMutationRecords({
    checkpoint,
    closureIdentity,
    frozenBytes,
    freshIndexes,
    repoRoot: options.repoRoot,
  });
  validateExactMutationRecordSet(records, {
    requireSortedUniquePaths: true,
    rejectUnknownKeys: true,
    rejectNonMetadataOperations: true,
  });
  return Object.freeze(records);
}

// Ordered-durable changelog-file-then-index writer

function requireExactProtocolMarker(protocol, marker) {
  if (protocol !== marker) fail("smoke_changelog_protocol_invalid", "protocol", protocol);
}
function requireTaskRunAndIdentityBinding(options) {
  const { checkpoint, runId, closureIdentity } = options;
  if (runId !== checkpoint.runId || runId !== closureIdentity.runId) fail("smoke_transaction_artifact_mismatch", "run", "binding");
  if (checkpoint.taskId !== closureIdentity.taskId) fail("smoke_closure_identity_mismatch", "taskId", "binding");
  if (checkpoint.suiteId !== closureIdentity.suiteId) fail("smoke_closure_identity_mismatch", "suiteId", "binding");
  if (checkpoint.profile !== closureIdentity.profile) fail("smoke_closure_identity_mismatch", "profile", "binding");
  if (checkpoint.session !== closureIdentity.session) fail("smoke_closure_identity_mismatch", "session", "binding");
  return options;
}
async function deriveCheckpointRunBoundSameRepoTransaction(options) {
  const realRoot = await requireRealGitTopLevel(options.repoRoot);
  const number = options.closureIdentity.changelogNumber;
  const slug = options.closureIdentity.changelogSlug;
  const date = options.closureIdentity.closureUtcDate;
  const changelogPath = `_docs/_CHANGELOG/${number}-${date}-${slug}.md`;
  return Object.freeze({
    repoRoot: options.repoRoot,
    realRoot,
    runId: options.runId,
    changelogPath,
    changelogIndex: "_docs/_CHANGELOG/README.md",
    journalPath: `_docs/_CHANGELOG/.smoke-closure.${options.runId}.journal`,
    tempPath: `_docs/_CHANGELOG/.smoke-closure.${options.runId}.tmp`,
  });
}
async function createOrVerifyJournalViaTempFsyncRenameAndDirectoryFsync(tx) {
  const journalAbsolute = join(tx.realRoot, ...tx.journalPath.split("/"));
  const journalBytes = Buffer.from(canonicalJson({
    protocol: ORDERED_DURABLE_CHANGELOG_FILE_THEN_INDEX_V1,
    runId: tx.runId,
    changelogPath: tx.changelogPath,
    changelogIndex: tx.changelogIndex,
  }) + "\n", "utf8");
  let existing = null;
  try { existing = await readFile(journalAbsolute); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing !== null) {
    if (existing.equals(journalBytes) === false) fail("smoke_transaction_artifact_mismatch", "journal", "bytes");
    return journalAbsolute;
  }
  const tempAbsolute = join(tx.realRoot, ...tx.tempPath.split("/"));
  let tempBytes = null;
  try { tempBytes = await readFile(tempAbsolute); } catch (error) { if (error.code !== "ENOENT") throw error; }
  // A crash between the journal temp write and its rename leaves journal bytes in the temp; only exact residue promotes.
  if (tempBytes !== null) {
    if (tempBytes.equals(journalBytes) === false) fail("smoke_transaction_artifact_mismatch", "journal", "temp_bytes");
    await fsyncFile(tempAbsolute);
    await rename(tempAbsolute, journalAbsolute);
    await fsyncDirectory(dirname(journalAbsolute));
    return journalAbsolute;
  }
  await mkdir(dirname(journalAbsolute), { recursive: true });
  let handle;
  try {
    handle = await open(tempAbsolute, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    await handle.writeFile(journalBytes);
    await handle.sync();
  } finally {
    if (handle !== undefined) await handle.close();
  }
  await rename(tempAbsolute, journalAbsolute);
  await fsyncDirectory(dirname(journalAbsolute));
  return journalAbsolute;
}
async function countChangelogIndexRows(indexPath, changelogNumber) {
  let text;
  try { text = await readFile(indexPath, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return 0; throw error; }
  if (Buffer.byteLength(text, "utf8") > MAX_METADATA_FILE_BYTES) fail("smoke_changelog_index_too_large", "changelog", "index");
  let count = 0;
  for (const line of text.split("\n")) {
    const match = INDEX_ROW_PATTERN.exec(line);
    if (match !== null && Number(match[1]) === changelogNumber) count += 1;
  }
  return count;
}
async function inspectBoundOrderedChangelogPair(checkpoint, options, flags) {
  const number = checkpoint.closureContract.changelogNumber;
  const realRoot = await requireRealGitTopLevel(options.repoRoot);
  const changelogDir = join(realRoot, "_docs", "_CHANGELOG");
  let names = [];
  try { names = (await readdir(changelogDir)).filter((name) => name.startsWith(`${number}-`)).sort(); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (names.length > 1) fail("smoke_changelog_multiple", "changelog", `count=${names.length}`);
  const changelogFile = names.length === 1 ? `_docs/_CHANGELOG/${names[0]}` : null;
  if (changelogFile !== null) await requireExactRegularFile(join(realRoot, changelogFile));
  const indexRowCount = await countChangelogIndexRows(join(changelogDir, "README.md"), number);
  let state;
  if (changelogFile !== null && indexRowCount === 1) state = "both";
  else if (changelogFile !== null && indexRowCount === 0) state = "file-only";
  else if (changelogFile === null && indexRowCount === 0) state = "none";
  else if (flags?.rejectIndexOnlyCorruptOrMultiple === true) {
    if (indexRowCount > 1) fail("smoke_changelog_index_multiple", "changelog", `rows=${indexRowCount}`);
    fail("smoke_changelog_index_only", "changelog", "index_without_file");
  } else state = "index_only";
  if (flags?.validStates !== undefined && !flags.validStates.includes(state)) {
    fail("smoke_changelog_state_invalid", "changelog", state);
  }
  const boundArtifacts = await findBoundTransactionArtifacts(realRoot, checkpoint.runId);
  if (flags?.rejectAnyBoundTransactionArtifacts === true && boundArtifacts.length > 0) {
    fail("smoke_transaction_artifact_present", "changelog", "bound");
  }
  return Object.freeze({
    state, changelogFile, indexRowCount,
    boundTempOrJournalPresent: boundArtifacts.length > 0,
    staleBoundTempOrJournalOnly: boundArtifacts.length > 0 && state === "none",
    boundArtifacts,
  });
}
async function writeCanonicalChangelogRegularFileNoReplace(tx, changelogBytes) {
  if (typeof changelogBytes !== "string" && !Buffer.isBuffer(changelogBytes)) fail("smoke_changelog_invalid", "changelogBytes", "type");
  const bytes = Buffer.isBuffer(changelogBytes) ? changelogBytes : Buffer.from(changelogBytes, "utf8");
  if (bytes.length > MAX_METADATA_FILE_BYTES) fail("smoke_changelog_too_large", "changelog", `size=${bytes.length}`);
  const absolute = join(tx.realRoot, ...tx.changelogPath.split("/"));
  await mkdir(dirname(absolute), { recursive: true });
  let handle;
  try {
    handle = await open(absolute, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    await handle.chmod(0o600);
    await handle.writeFile(bytes);
    await handle.sync();
  } catch (error) {
    if (error.code === "EEXIST") fail("smoke_changelog_conflict", "changelog", "exists");
    throw error;
  } finally {
    if (handle !== undefined) await handle.close();
  }
  return absolute;
}
async function fsyncFile(path) {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY);
    await handle.sync();
  } finally {
    if (handle !== undefined) await handle.close();
  }
}
async function fsyncFileThenContainingDirectory(path) {
  await fsyncFile(path);
  await fsyncDirectory(dirname(path));
}
// Inspects the pair on disk; the checkpoint's frozen contract number is the only authority.
async function requireExactPairState(tx, state) {
  const number = Number(tx.changelogPath.split("/").pop().split("-")[0]);
  const checkpoint = Object.freeze({
    closureContract: Object.freeze({ changelogNumber: number }),
    runId: tx.runId,
  });
  const pair = await inspectBoundOrderedChangelogPair(checkpoint, { repoRoot: tx.repoRoot }, {
    validStates: [state], rejectIndexOnlyCorruptOrMultiple: true,
  });
  if (pair.state !== state) fail("smoke_changelog_state_invalid", "changelog", pair.state);
  return pair;
}
async function applyExactChangelogIndexMutation(tx, changelogIndexMutation) {
  const indexAbsolute = join(tx.realRoot, ...tx.changelogIndex.split("/"));
  const text = (await readFile(indexAbsolute)).toString("utf8");
  const { anchor, row, pointerFrom, pointerTo } = changelogIndexMutation;
  const lines = text.split("\n");
  const anchorIndexes = lines.map((line, index) => (line === anchor ? index : -1)).filter((index) => index !== -1);
  if (anchorIndexes.length !== 1) fail("smoke_changelog_index_invalid", "index", "anchor_ambiguous");
  if (lines.includes(row)) fail("smoke_changelog_index_invalid", "index", "row_duplicate");
  if (countOccurrences(text, pointerFrom) !== 1) fail("smoke_changelog_index_invalid", "index", "pointer_ambiguous");
  const next = lines.slice();
  next.splice(anchorIndexes[0] + 1, 0, row);
  return Buffer.from(next.join("\n").replace(pointerFrom, pointerTo), "utf8");
}
async function writeSameDirectoryIndexCasTemp(tx, indexBytes) {
  const tempAbsolute = join(tx.realRoot, ...tx.tempPath.split("/"));
  let existing = null;
  try { existing = await readFile(tempAbsolute); } catch (error) { if (error.code !== "ENOENT") throw error; }
  // A crash after the index CAS temp write leaves byte-identical residue; only exact reuse resumes.
  if (existing !== null) {
    if (existing.equals(indexBytes) === false) fail("smoke_transaction_artifact_mismatch", "index_temp", "bytes");
    return tempAbsolute;
  }
  await mkdir(dirname(tempAbsolute), { recursive: true });
  let handle;
  try {
    handle = await open(tempAbsolute, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    await handle.chmod(0o600);
    await handle.writeFile(indexBytes);
    await handle.sync();
  } finally {
    if (handle !== undefined) await handle.close();
  }
  return tempAbsolute;
}
async function renameTempOverIndex(tx, tempAbsolute) {
  const indexAbsolute = join(tx.realRoot, ...tx.changelogIndex.split("/"));
  await rename(tempAbsolute, indexAbsolute);
  return indexAbsolute;
}
// The index base must still byte-match the frozen HEAD revision before the CAS temp rename.
async function requireIndexBaseSha256Unchanged(tx, checkpoint) {
  const realRoot = await requireRealGitTopLevel(tx.repoRoot);
  const indexAbsolute = join(realRoot, ...tx.changelogIndex.split("/"));
  const currentBytes = await readFile(indexAbsolute);
  const frozenBytes = gitShowRevisionBytes(realRoot, checkpoint.frozenRuntime.gitHead, tx.changelogIndex);
  if (frozenBytes === null) fail("smoke_changelog_index_missing", "index", "frozen");
  if (sha256(currentBytes) !== sha256(frozenBytes)) fail("smoke_changelog_index_base_changed", "index", "bytes");
  return indexAbsolute;
}
async function removeBoundTempAndJournalThenFsyncDirectory(tx) {
  const realRoot = await requireRealGitTopLevel(tx.repoRoot);
  const artifacts = [
    join(realRoot, ...tx.tempPath.split("/")),
    join(realRoot, ...tx.journalPath.split("/")),
  ];
  const dirs = new Set();
  for (const artifact of artifacts) {
    await rm(artifact, { force: true });
    dirs.add(dirname(artifact));
  }
  for (const dir of dirs) await fsyncDirectory(dir);
}
function advanceClosureIdentity(closureIdentity, durableState) {
  return deepFreeze({ ...closureIdentity, durableState });
}
export async function writeOrResumeOrderedDurableChangelogFileThenIndexV1(options) {
  requireExactKeys(options, [
    "repoRoot", "checkpoint", "runId", "closureIdentity", "changelogBytes", "changelogIndexMutation", "protocol",
  ], "writeOrResumeOrderedDurableChangelogFileThenIndexV1");
  requireExactProtocolMarker(options.protocol, ORDERED_DURABLE_CHANGELOG_FILE_THEN_INDEX_V1);
  requireTaskRunAndIdentityBinding(options);
  const tx = await deriveCheckpointRunBoundSameRepoTransaction(options);
  await createOrVerifyJournalViaTempFsyncRenameAndDirectoryFsync(tx);
  let state = await inspectBoundOrderedChangelogPair(options.checkpoint, options, {
    validStates: ["none", "file-only", "both"],
    rejectIndexOnlyCorruptOrMultiple: true,
  });
  if (state.state === "none") {
    await writeCanonicalChangelogRegularFileNoReplace(tx, options.changelogBytes);
    await fsyncFileThenContainingDirectory(join(tx.realRoot, ...tx.changelogPath.split("/")));
    state = await requireExactPairState(tx, "file-only");
  }
  if (state.state === "file-only") {
    const indexBytes = await applyExactChangelogIndexMutation(tx, options.changelogIndexMutation);
    const temp = await writeSameDirectoryIndexCasTemp(tx, indexBytes);
    await fsyncFile(temp);
    await requireIndexBaseSha256Unchanged(tx, options.checkpoint);
    await renameTempOverIndex(tx, temp);
    await fsyncDirectory(join(tx.realRoot, "_docs", "_CHANGELOG"));
  }
  await requireExactPairState(tx, "both");
  await removeBoundTempAndJournalThenFsyncDirectory(tx);
  return advanceClosureIdentity(options.closureIdentity, "both");
}

// Metadata-only delta validation

// Exact ordered-prefix guard: pinned path/date/slug, strict body markers, and the durable-state row count.
async function requireExactOrderedChangelogPrefix(checkpoint, closureIdentity, current, options) {
  const pair = await inspectBoundOrderedChangelogPair(checkpoint, options, {
    validStates: [closureIdentity.durableState],
    rejectIndexOnlyCorruptOrMultiple: true,
  });
  if (closureIdentity.durableState === "none") {
    if (pair.changelogFile !== null || pair.indexRowCount !== 0) fail("smoke_changelog_metadata_present", "changelog", "canonical");
    return pair;
  }
  if (pair.changelogFile === null) fail("smoke_changelog_file_missing", "changelog", "file");
  const name = pair.changelogFile.split("/").pop();
  const match = CHANGELOG_FILE_PATTERN.exec(name);
  if (match === null || match[1] !== String(closureIdentity.changelogNumber) || match[3] !== closureIdentity.changelogSlug) {
    fail("smoke_changelog_path_invalid", "changelog", name);
  }
  if (match[2] !== closureIdentity.closureUtcDate) fail("smoke_changelog_date_invalid", "changelog", match[2]);
  const realRoot = await requireRealGitTopLevel(options.repoRoot);
  const body = (await readCappedFileNoSymlink(join(realRoot, ...pair.changelogFile.split("/")), "smoke_changelog_file_invalid")).toString("utf8");
  if (!body.includes(`# ${closureIdentity.changelogNumber} - `) ||
      !body.includes(`**Tasks:** ${closureIdentity.taskId}`) ||
      !body.includes(`**Date:** ${closureIdentity.closureUtcDate}`)) {
    fail("smoke_changelog_body_invalid", "changelog", name);
  }
  const expectedRows = closureIdentity.durableState === "file-only" ? 0 : 1;
  if (pair.indexRowCount !== expectedRows) fail("smoke_changelog_index_rows", "changelog", `rows=${pair.indexRowCount}`);
  void current;
  return pair;
}
// Frozen outside-evidence records are empty; the delta is every current record, all allowlisted.
function diffCanonicalRecords(frozenRecords, currentRecords) {
  const changed = [];
  for (const record of currentRecords ?? []) {
    if (record === undefined || record.path === undefined) continue;
    const prior = (frozenRecords ?? []).find((entry) => entry.path === record.path);
    if (prior === undefined || prior.contentHash !== record.contentHash || prior.mode !== record.mode) {
      changed.push(record);
    }
  }
  return changed;
}
export async function validateMetadataOnlyClosureDelta(checkpoint, closureIdentity, repoRoot) {
  await requireCheckpointAndEvidenceStillExact(checkpoint, { closureIdentity, repoRoot });
  const current = await computeWorkingTreeRevision(repoRoot, closureIdentity.taskId, closureIdentity.session);
  if (current.gitHead !== checkpoint.frozenRuntime.gitHead) fail("smoke_head_changed", "gitHead", current.gitHead);
  await requireExactOrderedChangelogPrefix(checkpoint, closureIdentity, current, { repoRoot });
  const changed = diffCanonicalRecords(checkpoint.frozenRuntime.records, current.records);
  const allowlist = buildExactClosureMetadataAllowlist({
    frozenContract: checkpoint.closureContract,
    pinnedChangelogPath: closureIdentity.pinnedChangelogPath,
    closureUtcDate: closureIdentity.closureUtcDate,
  });
  if (changed.some((entry) => !allowlist.has(entry.path))) {
    const offending = changed.map((entry) => entry.path).filter((path) => !allowlist.has(path));
    fail("smoke_non_metadata_delta", "closure", offending.join(","));
  }
  // Content-level parity: allowlisted changed files must byte-match the exact plan after-state.
  const plan = await buildClosureMetadataMutationPlanV1(checkpoint, closureIdentity, { repoRoot });
  const expectedAfter = new Map(plan.map((record) => [record.path, record.expectedAfterSha256]));
  const drifted = changed.find((entry) => {
    const expected = expectedAfter.get(entry.path);
    return expected !== undefined && entry.contentHash !== expected;
  });
  if (drifted !== undefined) fail("smoke_metadata_delta_mismatch", "closure", drifted.path);
  return Object.freeze({
    pass: true,
    taskId: closureIdentity.taskId,
    runId: checkpoint.runId,
    closureMetadataRevision: publicRevision(current),
    changedPaths: uniqueSorted(changed.map((entry) => entry.path)),
  });
}

// closure-delta CLI (diagnostic; never the owner closure entrypoint)

function printClosureHelp() {
  process.stdout.write(
    [
      "smoke-evidence.mjs closure-delta - closure metadata delta diagnostic",
      "",
      "Usage:",
      "  node smoke-evidence.mjs closure-delta --repo-root <root> --task TASK-###",
      "      --suite <registered-suite> --profile <fast|certification> --session <session>",
      "      --checkpoint <canonical-path> --checkpoint-sha256 <sha> --run-id <run-id>",
      "",
      "Recovers the identity from the checkpoint plus strict on-disk",
      "changelog/index facts; callers never supply a path, hunk, or date.",
      "Recomputes each final SHA-256 and requires exact equality with the",
      "plan; exit 0 is emitted only on success. Every failure is structured",
      "JSON without raw identities.",
      "",
    ].join("\n") + "\n"
  );
}
function parseClosureFlags(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === undefined || !flag.startsWith("--") || flag.length === 2) return null;
    const name = flag.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) return null;
    flags[name] = value;
    index += 1;
  }
  return flags;
}
function validateCheckpointForClosure(value) {
  if (!isPlainRecord(value)) fail("smoke_checkpoint_invalid", "checkpoint", "not_record");
  for (const key of Object.keys(value)) if (!CHECKPOINT_KEYS.has(key)) fail("smoke_checkpoint_invalid", `checkpoint.${key}`, "unknown");
  if (value.schemaVersion !== 1) fail("smoke_checkpoint_invalid", "schemaVersion", "value");
  requireRepoTaskId(value.taskId);
  requireRuntimeSmokeSessionName(value.session);
  if (value.profile !== "fast" && value.profile !== "certification") fail("smoke_checkpoint_invalid", "profile", "value");
  if (typeof value.suiteId !== "string" || value.suiteId.length === 0) fail("smoke_checkpoint_invalid", "suiteId", "value");
  if (typeof value.runId !== "string" || !isLowercaseHex(value.runId, 64)) fail("smoke_checkpoint_invalid", "runId", "value");
  if (!isPlainRecord(value.frozenRuntime) || !isLowercaseHex(value.frozenRuntime.gitHead, 40)) {
    fail("smoke_checkpoint_invalid", "frozenRuntime", "value");
  }
  validateExactFrozenClosureContract(value.closureContract, {
    requireSortedUniqueTaskAndSupplementalFiles: true,
    requireDisjointTaskAndSupplementalFiles: true,
    rejectUnknownKeys: true,
  });
  if (value.phase1.state !== "owner_review_required") fail("smoke_checkpoint_invalid", "phase1.state", "value");
  if (!Array.isArray(value.evidenceFiles)) fail("smoke_checkpoint_invalid", "evidenceFiles", "not_array");
  return deepFreeze(JSON.parse(canonicalJson(value)));
}
// Identity recovery is the sole date/path authority; file-only/both derive the date from the on-disk file.
async function recoverClosureIdentityFromOnDisk(checkpoint, checkpointSha256, flags) {
  const pair = await inspectBoundOrderedChangelogPair(checkpoint, { repoRoot: flags["repo-root"] }, {
    validStates: ["none", "file-only", "both"],
    rejectIndexOnlyCorruptOrMultiple: true,
  });
  let closureUtcDate = currentCanonicalUtcDate();
  let durableState = "none";
  if (pair.changelogFile !== null) {
    const name = pair.changelogFile.split("/").pop();
    const match = CHANGELOG_FILE_PATTERN.exec(name);
    if (match === null || match[1] !== String(checkpoint.closureContract.changelogNumber) ||
        match[3] !== checkpoint.closureContract.changelogSlug) {
      fail("smoke_changelog_path_invalid", "changelog", name);
    }
    closureUtcDate = match[2];
    durableState = pair.state;
  }
  const identity = Object.freeze({
    taskId: checkpoint.taskId, suiteId: checkpoint.suiteId, profile: checkpoint.profile,
    session: checkpoint.session, runId: checkpoint.runId, checkpointSha256,
    changelogNumber: checkpoint.closureContract.changelogNumber,
    changelogSlug: checkpoint.closureContract.changelogSlug,
    closureUtcDate,
    pinnedChangelogPath: `_docs/_CHANGELOG/${checkpoint.closureContract.changelogNumber}-${closureUtcDate}-${checkpoint.closureContract.changelogSlug}.md`,
    durableState,
  });
  if (durableState !== "none") {
    await requireExactOrderedChangelogPrefix(checkpoint, identity, null, { repoRoot: flags["repo-root"] });
  }
  return identity;
}
// Recomputes every final SHA-256 from frozen bytes plus the plan; equality with the plan is required.
async function requirePlanRecomputationEquals(checkpoint, closureIdentity, plan, repoRoot) {
  const realRoot = await requireRealGitTopLevel(repoRoot);
  const gitHead = checkpoint.frozenRuntime.gitHead;
  for (const record of plan) {
    const frozenBytes = gitShowRevisionBytes(realRoot, gitHead, record.path);
    if (record.operations.some((operation) => operation.kind === "create_file")) {
      const afterSha256 = sha256(Buffer.from(record.operations[0].bytes, "utf8"));
      if (afterSha256 !== record.expectedAfterSha256) fail("smoke_plan_after_hash_drift", record.path, "create");
      continue;
    }
    if (frozenBytes === null) fail("smoke_path_untracked", "plan", record.path);
    if (sha256(frozenBytes) !== record.beforeSha256) fail("smoke_plan_before_hash_drift", record.path, "bytes");
    const afterSha256 = sha256(applyOperations(frozenBytes, record.operations));
    if (afterSha256 !== record.expectedAfterSha256) fail("smoke_plan_after_hash_drift", record.path, "bytes");
  }
  return plan;
}
export async function runClosureDeltaCli(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printClosureHelp();
    return;
  }
  const flags = parseClosureFlags(argv);
  const required = ["repo-root", "task", "suite", "profile", "session", "checkpoint", "checkpoint-sha256", "run-id"];
  if (flags === null || required.some((name) => typeof flags[name] !== "string")) {
    process.stderr.write(`${JSON.stringify({ pass: false, code: "smoke_cli_usage", label: "closure-delta", detail: "missing_required_flags" })}\n`);
    process.exitCode = 2;
    return;
  }
  const realRoot = await requireRealGitTopLevel(flags["repo-root"]);
  const canonicalPath = join(await resolveCanonicalEvidenceDirectory(realRoot, flags.task, flags.session), "resume-checkpoint.json");
  if (resolve(realRoot, flags.checkpoint) !== canonicalPath) fail("smoke_checkpoint_path_mismatch", "checkpoint", "canonical");
  const bytes = await readCappedFileNoSymlink(canonicalPath, "smoke_checkpoint_missing", MAX_CHECKPOINT_BYTES);
  timingSafeRequireSha256(bytes, flags["checkpoint-sha256"]);
  let parsed;
  try { parsed = JSON.parse(bytes.toString("utf8")); } catch (error) { fail("smoke_json_invalid", "checkpoint", "parse"); }
  const checkpoint = validateCheckpointForClosure(parsed);
  if (checkpoint.taskId !== flags.task) fail("smoke_checkpoint_task_mismatch", "checkpoint", "task");
  if (checkpoint.session !== flags.session) fail("smoke_checkpoint_session_mismatch", "checkpoint", "session");
  if (checkpoint.runId !== flags["run-id"]) fail("smoke_checkpoint_run_mismatch", "checkpoint", "run");
  if (checkpoint.suiteId !== flags.suite || checkpoint.profile !== flags.profile) {
    fail("smoke_checkpoint_identity_mismatch", "checkpoint", "suite_profile");
  }
  const closureIdentity = await recoverClosureIdentityFromOnDisk(checkpoint, flags["checkpoint-sha256"], flags);
  const plan = await buildClosureMetadataMutationPlanV1(checkpoint, closureIdentity, { repoRoot: flags["repo-root"] });
  await requirePlanRecomputationEquals(checkpoint, closureIdentity, plan, flags["repo-root"]);
  const delta = await validateMetadataOnlyClosureDelta(checkpoint, closureIdentity, flags["repo-root"]);
  process.stdout.write(`${JSON.stringify({
    pass: true, taskId: delta.taskId, runId: delta.runId,
    durableState: closureIdentity.durableState,
    closureMetadataRevision: delta.closureMetadataRevision,
    changedPaths: delta.changedPaths,
  })}\n`);
}
