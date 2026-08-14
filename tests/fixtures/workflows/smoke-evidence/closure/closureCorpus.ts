// TASK-545-03-L04 shared closure-delta test corpus helpers (Bun lane). Owns
// the deterministic temporary Git-repository corpus: frozen task files, the
// task/changelog indexes at HEAD, staged evidence plus the phase-1 checkpoint,
// the exact pinned-changelog template, and the ordered-durable writer options
// builders. The kill/recovery child and the closure-delta suite import these
// exact constants so the plan, the writer, and the delta validators share one
// byte-identical corpus. Synthetic image bytes only.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalJson, computeWorkingTreeRevision, publicRevision, resolveCanonicalEvidenceDirectory, sha256 } from "../../../../../_docs/_workflows/lib/smoke-evidence.mjs";
import { createResumeCheckpoint } from "../../../../../_docs/_workflows/lib/smoke-evidence-checkpoint.mjs";
import type {
  OwnerActionRequiredPayload,
  PublicWorkingTreeRevision,
  SmokeEvidenceResumeOptions,
  Task545ClosureIdentity,
  VerifiedTask545Checkpoint,
} from "../../../../../_docs/_workflows/lib/smoke-evidence-checkpoint.d.mts";
import type { ChangelogIndexMutationV1 } from "../../../../../_docs/_workflows/lib/smoke-evidence-closure.d.mts";

export const TASK = "TASK-545";
export const SUITE = "task-545";
export const PROFILE = "certification";
export const SESSION = "task-545-certification";
export const CHANGELOG_NUMBER = 1257;
export const CHANGELOG_SLUG = "task-545-smoke-evidence-checkpoint";
export const CLOSURE_DATE = "2026-08-14";
export const RUN_ID = "1111111111111111111111111111111111111111111111111111111111111111";
export const WORKFLOW_ENTRY = "_docs/_workflows/task-545-implement.mjs";
export const WRITER_PROTOCOL = "ordered-durable-changelog-file-then-index@v1";
export const PINNED_CHANGELOG_REL = `_docs/_CHANGELOG/${CHANGELOG_NUMBER}-${CLOSURE_DATE}-${CHANGELOG_SLUG}.md`;
export const CHANGELOG_INDEX_REL = "_docs/_CHANGELOG/README.md";
export const TASK_INDEX_REL = "_docs/_TASKS/README.md";

export const sha = (text: string): string => createHash("sha256").update(text).digest("hex");
export const today = (): string => new Date().toISOString().slice(0, 10);

// Frozen task files at HEAD: exactly one canonical Status line, a Dependencies
// line, and scenario prose that must never drift during closure.
export const TASK_FILE_PARENT = [
  "# TASK-545: Workflow Smoke Evidence and Task Graph Integrity",
  "",
  "**Parent Task:** TASK-545",
  "**Dependencies:** TASK-545-01-L02, TASK-545-02",
  "**Status:** ⏳ To Do",
  "**Changelog:** 1257 (pinned; closure only)",
  "",
  "## Overview",
  "",
  "Scenario inventories, acceptance text, dependencies, pseudocode, security",
  "contracts, arbitrary prose, another board row, another statistic, and",
  "duplicate/ambiguous board rows or statistics fail closed.",
  "",
].join("\n");
export const TASK_FILE_L01 = [
  "# TASK-545-03-L01: Define and validate smoke evidence manifests",
  "",
  "**Parent Subtask:** TASK-545-03",
  "**Dependencies:** TASK-545-01-L02",
  "**Status:** ⏳ To Do",
  "",
  "## Overview",
  "",
  "Owns the strict manifest/checkpoint schemas and the report-equality",
  "validator.",
  "",
].join("\n");

export const FROZEN_TASK_INDEX = [
  "# Task Board", "",
  "## Board", "",
  "| Task | Title | Priority | Effort | Status |",
  "|------|-------|----------|--------|--------|",
  "| TASK-545 | Smoke Evidence | High | Medium | ⏳ To Do |",
  "| TASK-540 | Other Board Row | Low | Small | ✅ Done |", "",
  "## Statistics", "",
  "| Task | Status | Open | Total |",
  "|------|--------|------|-------|",
  "| TASK-545 | ⏳ To Do | 4 | 13 |",
  "| TASK-540 | ✅ Done | 0 | 2 |", "",
].join("\n");
export const FROZEN_CHANGELOG_INDEX = [
  "# Changelog", "", "## Index", "",
  "| No. | Date | Title | Type |",
  "|-----|------|-------|------|",
  "",
  "Next changelog number: 1257.",
].join("\n") + "\n";
// The exact L04 bounded closure-evidence template for the pinned changelog.
export const CHANGELOG_TEMPLATE = [
  "# 1257 - Task 545 Smoke Evidence Checkpoint", "",
  "**Date:** 2026-08-14", "**Version:** Unreleased", "**Tasks:** TASK-545", "",
  "## Key Changes", "",
  "- Metadata-only closure delta validated and applied under the smoke evidence contract.", "",
].join("\n");
export const CHANGELOG_ROW = "| 1257 | 2026-08-14 | Task 545 Smoke Evidence Checkpoint | TASK-545 |";
// The exact post-mutation changelog index (row after separator, pointer bumped).
export const CHANGELOG_INDEX_AFTER = (() => {
  const lines = FROZEN_CHANGELOG_INDEX.split("\n");
  const separator = lines.findIndex((line) => /^\|-+(\|-+)*\|$/u.test(line) && line.includes("---"));
  lines.splice(separator + 1, 0, CHANGELOG_ROW);
  return lines.join("\n").replace("Next changelog number: 1257.", "Next changelog number: 1258.");
})();

// Synthetic owning workflow entry: closure-only dispatch, canonical driver
// import, never contains staging patterns.
const WORKFLOW_FIXTURE = [
  "// TASK-545 implementation workflow entry (synthetic test fixture).",
  'import { createResumeCheckpoint, openWorkflowClosureResume, requireTaskBoundOwningWorkflow, resumeTrackedEvidence } from "./lib/smoke-evidence.mjs";',
  "",
  "async function main(argv) {",
  '  if (argv[0] !== "closure-resume") {',
  '    process.stderr.write(JSON.stringify({ pass: false, code: "smoke_cli_unknown_command", detail: String(argv[0] ?? "none") }));',
  "    process.exitCode = 2;",
  "    return;",
  "  }",
  "  process.stdout.write(JSON.stringify({ pass: true, argv: process.argv.slice(2) }));",
  "}",
  "",
  "main(process.argv.slice(2)).catch((error) => {",
  '  process.stderr.write(JSON.stringify({ pass: false, code: "fixture_failure", detail: String((error && error.message) ?? error) }));',
  "  process.exitCode = 1;",
  "});",
  "",
].join("\n");
const STUB_LIB = [
  "export function createResumeCheckpoint() { return null; }",
  "export function openWorkflowClosureResume() { return null; }",
  "export function requireTaskBoundOwningWorkflow() { return null; }",
  "export function resumeTrackedEvidence() { return null; }",
  "",
].join("\n");

export function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
  }).trim();
}

const tempRoots: string[] = [];

export async function makeRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "smoke-closure-test-"));
  tempRoots.push(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  await writeFile(join(root, "source.txt"), "v1\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "init"]);
  return root;
}

export async function cleanupTempRoots(): Promise<void> {
  const { rm } = await import("node:fs/promises");
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
}

export async function addWorkflowEntry(root: string): Promise<string> {
  const workflowDir = join(root, "_docs", "_workflows");
  await mkdir(join(workflowDir, "lib"), { recursive: true });
  await writeFile(join(workflowDir, "lib", "smoke-evidence.mjs"), STUB_LIB);
  await writeFile(join(root, WORKFLOW_ENTRY), WORKFLOW_FIXTURE);
  git(root, ["add", "_docs/_workflows"]);
  git(root, ["commit", "-q", "-m", "add workflow entry"]);
  return WORKFLOW_ENTRY;
}

export function entryUrl(root: string): string {
  return pathToFileURL(join(root, "_docs", "_workflows", "task-545-implement.mjs")).href;
}

export function validManifest(task: string, session: string, reportSha: string, revision: PublicWorkingTreeRevision): Record<string, unknown> {
  const scenarios = ["admin-light-wide", "admin-dark-narrow", "admin-form-focus", "admin-menu-open", "public-mobile-nav"].map((id) => ({
    id, title: `Title ${id}`,
    variants: [{
      id: `${id}-v`, surface: id.startsWith("public") ? "public" : "admin", theme: id.includes("dark") ? "dark" : "light",
      viewport: { width: 1280, height: 800 },
      assertions: [{ kind: "computed-style", target: "sidebar", property: "display", expected: "flex", actual: "flex", pass: true }],
      consoleErrors: [],
    }],
    screenshots: [{ path: `${id}.png`, sha256: sha(`${id}.png`) }],
  }));
  return {
    schemaVersion: 1, taskId: task, suiteId: SUITE, profile: PROFILE, session,
    report: { path: "report.json", sha256: reportSha }, revision,
    generatedAt: "2026-08-14T00:00:00.000Z", serverUp: true, scenarios,
  };
}

export async function buildEvidence(root: string): Promise<string> {
  const evidence = await resolveCanonicalEvidenceDirectory(root, TASK, SESSION);
  await mkdir(evidence, { recursive: true });
  for (const id of ["admin-light-wide", "admin-dark-narrow", "admin-form-focus", "admin-menu-open", "public-mobile-nav"]) {
    await writeFile(join(evidence, `${id}.png`), `${id}.png`);
  }
  const scenarios = ["admin-light-wide", "admin-dark-narrow", "admin-form-focus", "admin-menu-open", "public-mobile-nav"].map((id) => ({
    id, pass: true, elapsedMs: 10, title: `Title ${id}`,
    variants: [{
      id: `${id}-v`, surface: id.startsWith("public") ? "public" : "admin", theme: id.includes("dark") ? "dark" : "light",
      viewport: { width: 1280, height: 800 },
      assertions: [{ kind: "computed-style", target: "sidebar", property: "display", expected: "flex", actual: "flex", pass: true }],
      consoleErrors: [],
    }],
    screenshots: [{ path: `${id}.png`, sha256: sha(`${id}.png`) }],
  }));
  const reportBytes = `${JSON.stringify({
    schemaVersion: 1, suiteId: SUITE, profile: PROFILE, session: SESSION, pass: true, serverUp: true,
    scenarios, screenshots: scenarios.map((s) => s.screenshots[0]),
  })}\n`;
  await writeFile(join(evidence, "report.json"), reportBytes);
  const revision = await computeWorkingTreeRevision(root, TASK, SESSION);
  const manifest = validManifest(TASK, SESSION, sha256(reportBytes), publicRevision(revision));
  await writeFile(join(evidence, "manifest.json"), JSON.stringify(manifest));
  return evidence;
}

// Commits the frozen task files and both indexes at HEAD so the closure plan
// derives exact rows and the next-pointer from git history. A taskIndexOverride
// lets negative suites freeze ambiguous or missing board/statistics rows at HEAD
// (L03's checkpoint creation does not validate README content).
export async function writeFrozenIndexes(root: string, taskIndexOverride?: string): Promise<void> {
  const taskDir = join(root, "_docs", "_TASKS");
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, "TASK-545-01-All-Results-Guard-And-Static-Workflow-Contract.md"), TASK_FILE_PARENT);
  await writeFile(join(taskDir, "TASK-545-03-L01-Add-Require-All-Results-Helper.md"), TASK_FILE_L01);
  await writeFile(join(taskDir, "README.md"), taskIndexOverride ?? FROZEN_TASK_INDEX);
  const changelogDir = join(root, "_docs", "_CHANGELOG");
  await mkdir(changelogDir, { recursive: true });
  await writeFile(join(changelogDir, "README.md"), FROZEN_CHANGELOG_INDEX);
  git(root, ["add", "_docs"]);
  git(root, ["commit", "-q", "-m", "frozen closure corpus"]);
}

export async function createCheckpoint(root: string): Promise<OwnerActionRequiredPayload> {
  return createResumeCheckpoint({
    repoRoot: root, expectedTask: TASK, pinnedChangelogNumber: CHANGELOG_NUMBER,
    pinnedChangelogSlug: CHANGELOG_SLUG, expectedWorkflowRole: "implement",
    executingImportMetaUrl: entryUrl(root), expectedSuite: SUITE, expectedProfile: PROFILE,
    expectedSession: SESSION, runtimeResult: { pass: true },
  });
}

export function resumeOptions(root: string, pause: OwnerActionRequiredPayload): SmokeEvidenceResumeOptions {
  return {
    repoRoot: root, expectedTask: TASK, checkpointPath: pause.checkpointPath,
    checkpointSha256: pause.checkpointSha256, runId: pause.runId, expectedSession: SESSION,
    expectedWorkflowRole: "implement", executingImportMetaUrl: entryUrl(root),
  };
}

export async function stageEvidence(root: string): Promise<void> {
  const evidence = await resolveCanonicalEvidenceDirectory(root, TASK, SESSION);
  git(root, ["add", evidence]);
}

// Minimal in-memory checkpoint/identity for the ordered-durable writer: the
// writer only binds run/identity fields, the frozen changelog number, and the
// frozen HEAD for the index-base CAS guard.
export function writerCheckpoint(gitHead: string): VerifiedTask545Checkpoint {
  return {
    schemaVersion: 1, taskId: TASK, suiteId: SUITE, profile: PROFILE, session: SESSION,
    runId: RUN_ID, workflowEntry: WORKFLOW_ENTRY, evidenceDirectory: "",
    manifestSha256: "0".repeat(64), evidenceFiles: [],
    frozenRuntime: { gitHead, workingTreeDirty: false, workingTreeSha256: "0".repeat(64) },
    closureContract: {
      taskFiles: [], supplementalTaskFiles: [], taskIndex: TASK_INDEX_REL,
      changelogIndex: CHANGELOG_INDEX_REL, changelogNumber: CHANGELOG_NUMBER, changelogSlug: CHANGELOG_SLUG,
    },
    phase1: { state: "owner_review_required", generatedAt: "2026-08-14T00:00:00.000Z" },
  } as unknown as VerifiedTask545Checkpoint;
}

export function closureIdentity(durableState: "none" | "file-only" | "both" = "none"): Task545ClosureIdentity {
  return {
    taskId: TASK, suiteId: SUITE, profile: PROFILE, session: SESSION, runId: RUN_ID,
    checkpointSha256: "0".repeat(64), changelogNumber: CHANGELOG_NUMBER, changelogSlug: CHANGELOG_SLUG,
    closureUtcDate: CLOSURE_DATE, pinnedChangelogPath: PINNED_CHANGELOG_REL, durableState,
  };
}

export function changelogIndexMutation(): ChangelogIndexMutationV1 {
  const separator = FROZEN_CHANGELOG_INDEX.split("\n").find((line) => /^\|-+(\|-+)*\|$/u.test(line) && line.includes("---"));
  return {
    anchor: separator as string,
    row: CHANGELOG_ROW,
    pointerFrom: "Next changelog number: 1257.",
    pointerTo: "Next changelog number: 1258.",
  };
}

// Journal bytes exactly as the writer persists them (canonical JSON, sorted
// keys, trailing LF), so crash-residue verification is byte-exact.
export function journalBytes(runId: string, changelogPath: string): string {
  return canonicalJson({
    protocol: WRITER_PROTOCOL,
    runId,
    changelogPath,
    changelogIndex: CHANGELOG_INDEX_REL,
  }) + "\n";
}

// Applies the exact planned task-file closure text (status replace plus the
// Started/Completed upserts) to the frozen file bytes.
export function taskFileAfterState(frozen: string, date: string): string {
  return frozen.replace("**Status:** ⏳ To Do", `**Status:** ✅ Done\n**Started:** ${date}\n**Completed:** ${date}`);
}

// Applies the exact planned README board/statistics row replacements.
export function taskIndexAfterState(): string {
  return FROZEN_TASK_INDEX
    .replace("| TASK-545 | Smoke Evidence | High | Medium | ⏳ To Do |", "| TASK-545 | Smoke Evidence | High | Medium | ✅ Done |")
    .replace("| TASK-545 | ⏳ To Do | 4 | 13 |", "| TASK-545 | ✅ Done | 4 | 13 |");
}

export const FROZEN_TASK_FILE_PARENT_BYTES = Buffer.from(TASK_FILE_PARENT, "utf8");
export const FROZEN_TASK_FILE_L01_BYTES = Buffer.from(TASK_FILE_L01, "utf8");
export const FROZEN_TASK_INDEX_BYTES = Buffer.from(FROZEN_TASK_INDEX, "utf8");
export const FROZEN_CHANGELOG_INDEX_BYTES = Buffer.from(FROZEN_CHANGELOG_INDEX, "utf8");
