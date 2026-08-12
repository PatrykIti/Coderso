import { constants, closeSync, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = "/home/coder/project/Coderso";
const TASK = "TASK-554";
const MAX_SNAPSHOT_BYTES = 8 * 1024 * 1024;
const CLOSEOUT_PATHS = Object.freeze({
  changelogReadme: "_docs/_CHANGELOG/README.md",
  changelogEntry: "_docs/_CHANGELOG/1267-2026-08-11-task-554-post-metadata-publish-rbac-hardening.md",
  taskBoard: "_docs/_TASKS/README.md",
  taskFile: "_docs/_TASKS/TASK-554_Post_Metadata_Publish_RBAC_Hardening.md",
});
const SNAPSHOT_KEYS = Object.freeze(["schemaVersion", "task", "changelogReadme", "changelogEntry", "taskBoard", "taskFile"]);
export const CHANGELOG_RESERVATION_BEFORE = "Changelogs 1266 and 1267 are reserved for TASK-414 Guide/Agent/Designer\ncompletion and the critical TASK-554 Post metadata publish-RBAC hardening\n(surviving variant; the root Repair variant is superseded by it), respectively.";
export const CHANGELOG_RESERVATION_AFTER = "Changelog 1266 remains reserved for TASK-414 Guide/Agent/Designer completion.\nChangelog 1267 is consumed by completed TASK-554 Post Metadata Publish RBAC\nHardening (surviving variant; the root Repair variant is superseded by it).";
export const CHANGELOG_1267_INDEX_ROW = "| 1267 | 2026-08-11 | TASK-554 Post Metadata Publish RBAC Hardening — conditional all-of publish authorization, present-only metadata, exact calendar validation, race-safe Admin cache/editor hydration, and seven-flow shared smoke | Posts/RBAC/Security/Admin UI/Caching/Testing/Docs/Task Board |";
export const CHANGELOG_1267_ENTRY_BYTES = Buffer.from(["# 1267 - TASK-554 Post Metadata Publish RBAC Hardening", "", "**Date:** 2026-08-11", "**Version:** Unreleased", "**Tasks:** TASK-554", "", "## Key Changes", "", "- Required `content:publish` together with `content:write` for Post metadata publication fields while preserving present-only writer metadata updates.", "- Added exact RFC3339 calendar validation, one-snapshot RBAC coverage, and race-safe Admin cache/editor hydration.", "- Registered the shared `task-554` smoke suite with seven verified publication flows."].join("\n") + "\n", "utf8");
const TASK_BOARD_STATISTIC = /^- \*\*(To Do|In Progress|Done):\*\* (\d+) tasks$/u;

function exactKeys(value, keys) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function assertNofollowAncestors(absolutePath, label) {
  const parsed = path.parse(absolutePath);
  let current = parsed.root;
  const components = absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (const component of components.slice(0, -1)) {
    current = path.join(current, component);
    const stats = lstatSync(current);
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label}_ancestor_invalid:${current}`);
  }
}

function readStableRegularFile(absolutePath, label, optional = false) {
  assertNofollowAncestors(absolutePath, label);
  let initial;
  try {
    initial = lstatSync(absolutePath);
  } catch (error) {
    if (optional && error && typeof error === "object" && error.code === "ENOENT") return null;
    throw error;
  }
  if (!initial.isFile() || initial.isSymbolicLink() || initial.nlink !== 1 || initial.size > MAX_SNAPSHOT_BYTES) throw new Error(`${label}_not_regular`);
  let descriptor;
  try {
    descriptor = openSync(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.nlink !== 1 || before.size > MAX_SNAPSHOT_BYTES) throw new Error(`${label}_not_regular`);
    const bytes = Buffer.from(readFileSync(descriptor));
    const after = fstatSync(descriptor);
    const final = lstatSync(absolutePath);
    const same = (left, right) => left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.nlink === right.nlink && left.size === right.size;
    if (!same(initial, before) || !same(before, after) || !same(after, final) || bytes.byteLength !== after.size) throw new Error(`${label}_changed`);
    return bytes;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function readCloseoutBytes(root, relativePath, label, optional = false) {
  return readStableRegularFile(path.join(root, relativePath), label, optional);
}

function decodeBytes(value, label) {
  if (typeof value !== "string" || value.length > MAX_SNAPSHOT_BYTES * 2 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) throw new Error(`task_554_closeout_snapshot_${label}_invalid`);
  const bytes = Buffer.from(value, "base64");
  if (bytes.byteLength > MAX_SNAPSHOT_BYTES || bytes.toString("base64") !== value) throw new Error(`task_554_closeout_snapshot_${label}_invalid`);
  return bytes;
}

function snapshotBytes(snapshot, key) {
  return snapshot[key] === null ? null : decodeBytes(snapshot[key], key);
}

export function captureTask554CloseoutSnapshot(root = ROOT) {
  return Object.freeze({
    schemaVersion: 1,
    task: TASK,
    changelogReadme: readCloseoutBytes(root, CLOSEOUT_PATHS.changelogReadme, "task_554_closeout_changelog_readme").toString("base64"),
    changelogEntry: readCloseoutBytes(root, CLOSEOUT_PATHS.changelogEntry, "task_554_closeout_changelog_entry", true)?.toString("base64") ?? null,
    taskBoard: readCloseoutBytes(root, CLOSEOUT_PATHS.taskBoard, "task_554_closeout_task_board").toString("base64"),
    taskFile: readCloseoutBytes(root, CLOSEOUT_PATHS.taskFile, "task_554_closeout_task_file").toString("base64"),
  });
}

export function normalizeTask554CloseoutSnapshot(value) {
  if (!exactKeys(value, SNAPSHOT_KEYS) || value.schemaVersion !== 1 || value.task !== TASK || typeof value.changelogReadme !== "string" || (value.changelogEntry !== null && typeof value.changelogEntry !== "string") || typeof value.taskBoard !== "string" || typeof value.taskFile !== "string") throw new Error("task_554_closeout_snapshot_invalid");
  for (const key of SNAPSHOT_KEYS.slice(2)) snapshotBytes(value, key);
  return Object.freeze({ ...value });
}

export function readTask554CloseoutSnapshot(snapshotPath) {
  const bytes = readStableRegularFile(path.resolve(snapshotPath), "task_554_closeout_snapshot");
  let parsed;
  try {
    const text = bytes.toString("utf8");
    if (!Buffer.from(text, "utf8").equals(bytes)) throw new Error("invalid_utf8");
    parsed = JSON.parse(text);
  } catch {
    throw new Error("task_554_closeout_snapshot_invalid");
  }
  return normalizeTask554CloseoutSnapshot(parsed);
}

function onlyTask554Row(text) {
  let section = null;
  const matches = [];
  for (const line of text.split("\n")) {
    const heading = /^## (To Do|In Progress|Done)$/u.exec(line);
    if (heading) section = heading[1];
    if (line.startsWith("| TASK-554 |")) matches.push({ line, section });
  }
  if (matches.length !== 1 || !matches[0]?.section) throw new Error("task_554_closure_board_row_invalid");
  return matches[0];
}

function boardStatistics(text) {
  const values = new Map();
  for (const [index, line] of text.split("\n").entries()) {
    const match = TASK_BOARD_STATISTIC.exec(line);
    if (match) {
      if (values.has(match[1])) throw new Error("task_554_closure_board_statistics_duplicate");
      values.set(match[1], Object.freeze({ index, value: Number(match[2]) }));
    }
  }
  if (["To Do", "In Progress", "Done"].some((name) => !Number.isSafeInteger(values.get(name)?.value))) throw new Error("task_554_closure_board_statistics_invalid");
  return values;
}

export function assertTask554BoardClosureDelta(before, after) {
  const beforeRow = onlyTask554Row(before);
  const afterRow = onlyTask554Row(after);
  if (beforeRow.section !== "In Progress" || afterRow.section !== "Done" || !beforeRow.line.includes("In progress 2026-08-11.") || afterRow.line !== beforeRow.line.replace("In progress 2026-08-11.", "✅ Done (2026-08-11):")) throw new Error("task_554_closure_board_row_delta_invalid");
  const beforeStats = boardStatistics(before);
  const afterStats = boardStatistics(after);
  if (["To Do", "In Progress", "Done"].some((name) => beforeStats.get(name).index !== afterStats.get(name).index) || afterStats.get("To Do").value !== beforeStats.get("To Do").value || afterStats.get("In Progress").value !== beforeStats.get("In Progress").value - 1 || afterStats.get("Done").value !== beforeStats.get("Done").value + 1 || [...beforeStats.values()].reduce((sum, entry) => sum + entry.value, 0) !== [...afterStats.values()].reduce((sum, entry) => sum + entry.value, 0)) throw new Error("task_554_closure_board_statistics_delta_invalid");
  const preserve = (text) => text.split("\n").filter((line) => !TASK_BOARD_STATISTIC.test(line) && !line.startsWith("| TASK-554 |")).join("\n");
  if (preserve(before) !== preserve(after)) throw new Error("task_554_closure_board_scope_invalid");
}

export function assertTask554ChangelogClosureDelta(beforeIndex, afterIndex, beforeEntry, afterEntry) {
  const beforeRows = beforeIndex.split("\n").filter((line) => line.startsWith("| 1267 |"));
  const afterRows = afterIndex.split("\n").filter((line) => line.startsWith("| 1267 |"));
  if (beforeRows.length !== 0 || afterRows.length !== 1 || afterRows[0] !== CHANGELOG_1267_INDEX_ROW) throw new Error("task_554_closure_changelog_row_invalid");
  if (!beforeIndex.includes(CHANGELOG_RESERVATION_BEFORE) || afterIndex.includes(CHANGELOG_RESERVATION_BEFORE) || !afterIndex.includes(CHANGELOG_RESERVATION_AFTER)) throw new Error("task_554_closure_reservation_invalid");
  const preserve = (text, reservation) => text.replace(reservation, "").split("\n").filter((line) => !line.startsWith("| 1267 |")).join("\n");
  if (preserve(beforeIndex, CHANGELOG_RESERVATION_BEFORE) !== preserve(afterIndex, CHANGELOG_RESERVATION_AFTER)) throw new Error("task_554_closure_changelog_scope_invalid");
  if (beforeEntry !== null || !Buffer.isBuffer(afterEntry) || !afterEntry.equals(CHANGELOG_1267_ENTRY_BYTES)) throw new Error("task_554_closure_entry_invalid");
}

export function assertTask554TerminalStatusDelta(before, after) {
  const fields = (text, name) => text.split("\n").filter((line) => line.startsWith(`**${name}:**`));
  const beforeStatus = fields(before, "Status");
  const afterStatus = fields(after, "Status");
  const beforeCompleted = fields(before, "Completed");
  const afterCompleted = fields(after, "Completed");
  const preserve = (text) => text.split("\n").filter((line) => !line.startsWith("**Status:**") && !line.startsWith("**Completed:")).join("\n");
  if (beforeStatus.length !== 1 || beforeStatus[0] !== "**Status:** 🚧 In Progress" || afterStatus.length !== 1 || afterStatus[0] !== "**Status:** ✅ Done" || beforeCompleted.length !== 0 || afterCompleted.length !== 1 || afterCompleted[0] !== "**Completed:** 2026-08-11" || preserve(before) !== preserve(after)) throw new Error("task_554_closure_terminal_status_invalid");
}

export function validateTask554MetadataCloseout(root, before) {
  const after = captureTask554CloseoutSnapshot(root);
  assertTask554ChangelogClosureDelta(snapshotBytes(before, "changelogReadme").toString("utf8"), snapshotBytes(after, "changelogReadme").toString("utf8"), snapshotBytes(before, "changelogEntry"), snapshotBytes(after, "changelogEntry"));
  assertTask554BoardClosureDelta(snapshotBytes(before, "taskBoard").toString("utf8"), snapshotBytes(after, "taskBoard").toString("utf8"));
  if (!snapshotBytes(before, "taskFile").equals(snapshotBytes(after, "taskFile"))) throw new Error("task_554_closeout_metadata_task_changed");
  return Object.freeze({ pass: true, task: TASK, mode: "metadata", changelog: true, board: true, taskFileUnchanged: true });
}

export function validateTask554TerminalCloseout(root, before) {
  const after = captureTask554CloseoutSnapshot(root);
  for (const key of ["changelogReadme", "changelogEntry", "taskBoard"]) {
    const prior = snapshotBytes(before, key);
    const current = snapshotBytes(after, key);
    if (prior === null ? current !== null : current === null || !prior.equals(current)) throw new Error(`task_554_closeout_terminal_metadata_changed:${key}`);
  }
  assertTask554TerminalStatusDelta(snapshotBytes(before, "taskFile").toString("utf8"), snapshotBytes(after, "taskFile").toString("utf8"));
  return Object.freeze({ pass: true, task: TASK, mode: "terminal", metadataUnchanged: true, terminalStatus: true });
}

function expectFailure(work, prefix) {
  try { work(); } catch (error) {
    if (String(error?.message).startsWith(prefix)) return;
    throw error;
  }
  throw new Error(`task_554_closeout_self_test_expected_failure:${prefix}`);
}

function selfTest() {
  const root = mkdtempSync(path.join(os.tmpdir(), "task-554-closeout-"));
  try {
    const initialBoard = ["- **To Do:** 1 tasks", "- **In Progress:** 2 tasks", "- **Done:** 3 tasks", "## In Progress", "| ID |", "| TASK-554 | title | priority | effort | In progress 2026-08-11. details |", "## Done", "| ID |", "| TASK-999 | retained |"].join("\n");
    const completedBoard = ["- **To Do:** 1 tasks", "- **In Progress:** 1 tasks", "- **Done:** 4 tasks", "## In Progress", "| ID |", "## Done", "| ID |", "| TASK-999 | retained |", "| TASK-554 | title | priority | effort | ✅ Done (2026-08-11): details |"].join("\n");
    const indexBefore = `prefix\n${CHANGELOG_RESERVATION_BEFORE}\n| No. | Date | Title | Type |`;
    const indexAfter = `prefix\n${CHANGELOG_RESERVATION_AFTER}\n| No. | Date | Title | Type |\n${CHANGELOG_1267_INDEX_ROW}`;
    const taskBefore = "**Status:** 🚧 In Progress\n**Started:** 2026-08-11";
    const taskAfter = "**Status:** ✅ Done\n**Completed:** 2026-08-11\n**Started:** 2026-08-11";
    mkdirSync(path.join(root, "_docs/_CHANGELOG"), { recursive: true });
    mkdirSync(path.join(root, "_docs/_TASKS"), { recursive: true });
    writeFileSync(path.join(root, CLOSEOUT_PATHS.changelogReadme), indexBefore);
    writeFileSync(path.join(root, CLOSEOUT_PATHS.taskBoard), initialBoard);
    writeFileSync(path.join(root, CLOSEOUT_PATHS.taskFile), taskBefore);
    const before = captureTask554CloseoutSnapshot(root);
    writeFileSync(path.join(root, CLOSEOUT_PATHS.changelogReadme), indexAfter);
    writeFileSync(path.join(root, CLOSEOUT_PATHS.changelogEntry), CHANGELOG_1267_ENTRY_BYTES);
    writeFileSync(path.join(root, CLOSEOUT_PATHS.taskBoard), completedBoard);
    const metadata = validateTask554MetadataCloseout(root, before);
    expectFailure(() => validateTask554MetadataCloseout(root, { ...before, taskFile: Buffer.from("forged").toString("base64") }), "task_554_closeout_metadata_task_changed");
    const metadataSnapshot = captureTask554CloseoutSnapshot(root);
    writeFileSync(path.join(root, CLOSEOUT_PATHS.taskFile), taskAfter);
    const terminal = validateTask554TerminalCloseout(root, metadataSnapshot);
    expectFailure(() => validateTask554TerminalCloseout(root, { ...metadataSnapshot, taskBoard: Buffer.from("forged").toString("base64") }), "task_554_closeout_terminal_metadata_changed:taskBoard");
    return Object.freeze({ pass: true, metadataDeltaValidated: metadata.pass, terminalDeltaValidated: terminal.pass, unrelatedTaskEditRejected: true, metadataRewriteRejected: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function parseMode() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--task-554-closeout-self-test") return Object.freeze({ mode: "self-test" });
  if (args.length === 1 && args[0] === "--task-554-closeout-snapshot") return Object.freeze({ mode: "snapshot" });
  if (args.length === 2 && args[0] === "--task-554-closeout-metadata-validate") return Object.freeze({ mode: "metadata", snapshotPath: args[1] });
  if (args.length === 2 && args[0] === "--task-554-closeout-terminal-validate") return Object.freeze({ mode: "terminal", snapshotPath: args[1] });
  throw new Error(`task_554_closeout_unknown_arguments:${args.join(",")}`);
}

function isDirectInvocation() {
  try {
    return typeof process.argv[1] === "string" && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

const invokedDirectly = isDirectInvocation();
if (process.env.TASK_554_WORKFLOW_IMPORT === "1" && invokedDirectly) throw new Error("task_554_workflow_import_direct_invocation");

export const result = invokedDirectly
  ? (() => {
    const command = parseMode();
    if (command.mode === "self-test") return selfTest();
    if (command.mode === "snapshot") return captureTask554CloseoutSnapshot();
    const snapshot = readTask554CloseoutSnapshot(command.snapshotPath);
    return command.mode === "metadata" ? validateTask554MetadataCloseout(ROOT, snapshot) : validateTask554TerminalCloseout(ROOT, snapshot);
  })()
  : null;
if (invokedDirectly) process.stdout.write(`${JSON.stringify(result)}\n`);
