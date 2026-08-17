// TASK-545-03-L03 checkpoint and owner resume tests (Bun lane). Reuses the
// TASK-545-03-L01 temporary Git-repository corpus pattern: phase-1 pause
// payload, atomic create-only checkpoint, exact path/hash/schema/task/run/
// workflow resume, tracked parity, the frozen/metadata_recovery closure-resume
// discriminants, the strict supplemental closure-task mapping, and type
// fixtures that reject widened checkpoint/closure-identity shapes. Kill/
// recovery and ordered-durable changelog marker fixtures belong to
// TASK-545-03-L04. Uses temporary synthetic image bytes only.

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, test } from "bun:test";

import {
  createResumeCheckpoint,
  openWorkflowClosureResume,
  requireTaskBoundOwningWorkflow,
  resolveOwnerControlledSupplementalClosureTaskFiles,
  resumeTrackedEvidence,
} from "../../../_docs/_workflows/lib/smoke-evidence-checkpoint.mjs";
import {
  SmokeEvidenceError,
  computeWorkingTreeRevision,
  publicRevision,
  resolveCanonicalEvidenceDirectory,
  sha256,
} from "../../../_docs/_workflows/lib/smoke-evidence.mjs";
import {
  createResumeCheckpoint as reexportedCreate,
  openWorkflowClosureResume as reexportedOpen,
  requireTaskBoundOwningWorkflow as reexportedRequireOwner,
  resumeTrackedEvidence as reexportedResume,
} from "../../../_docs/_workflows/lib/smoke-evidence.mjs";
import type {
  OwnerActionRequiredPayload,
  SmokeEvidenceCheckpointV1,
  SmokeEvidenceOwnerOptions,
  SmokeEvidenceResumeOptions,
  Task545ClosureIdentity,
  Task545ClosureResume,
  VerifiedTask545Checkpoint,
  VerifiedTask545MetadataRecoveryDelta,
} from "../../../_docs/_workflows/lib/smoke-evidence-checkpoint.mjs";

const FIXTURES = resolve(import.meta.dir, "../../fixtures/workflows/smoke-evidence/checkpoint");
const TASK = "TASK-545";
const SUITE = "task-545";
const PROFILE = "certification";
const SESSION = "task-545-certification";
const CHANGELOG_NUMBER = 1257;
const CHANGELOG_SLUG = "task-545-smoke-evidence-checkpoint";
const WORKFLOW_ENTRY = "_docs/_workflows/task-545-implement.mjs";
const CHECKPOINT_REL =
  "_docs/_workflows/_smoke/evidence/task-545/task-545-certification/resume-checkpoint.json";
const CLOSURE_DATE = "2026-08-14";
// Frozen closure corpus at HEAD: the task index carries the exact owning Board
// and Statistics rows, and the changelog index carries the separator plus the
// pinned next-pointer. TASK-545-03-L04's plan rebuilds from these exact bytes.
const FROZEN_TASK_INDEX = [
  "# Task Board",
  "",
  "## Board",
  "",
  "| Task | Title | Priority | Effort | Status |",
  "|------|-------|----------|--------|--------|",
  "| TASK-545 | Smoke Evidence | High | Medium | ⏳ To Do |",
  "",
  "## Statistics",
  "",
  "| Task | Status | Open | Total |",
  "|------|--------|------|-------|",
  "| TASK-545 | ⏳ To Do | 4 | 13 |",
  "",
].join("\n");
const FROZEN_CHANGELOG_INDEX =
  [
    "# Changelog",
    "",
    "## Index",
    "",
    "| No. | Date | Title | Type |",
    "|-----|------|-------|------|",
    "",
    "Next changelog number: 1257.",
  ].join("\n") + "\n";
// The exact L04 bounded closure-evidence template for the pinned changelog.
const CHANGELOG_TEMPLATE = [
  "# 1257 - Task 545 Smoke Evidence Checkpoint",
  "",
  "**Date:** 2026-08-14",
  "**Version:** Unreleased",
  "**Tasks:** TASK-545",
  "",
  "## Key Changes",
  "",
  "- Metadata-only closure delta validated and applied under the smoke evidence contract.",
  "",
].join("\n");
// The exact post-mutation changelog index: the planned row inserted after the
// separator and the next-pointer bumped, byte-identical to the L04 plan.
const CHANGELOG_INDEX_AFTER = (() => {
  const lines = FROZEN_CHANGELOG_INDEX.split("\n");
  const separator = lines.findIndex(
    (line) => /^\|-+(\|-+)*\|$/u.test(line) && line.includes("---")
  );
  lines.splice(
    separator + 1,
    0,
    "| 1257 | 2026-08-14 | Task 545 Smoke Evidence Checkpoint | TASK-545 |"
  );
  return lines.join("\n").replace("Next changelog number: 1257.", "Next changelog number: 1258.");
})();

let checkpointV1Fixture: SmokeEvidenceCheckpointV1;
let identityFixture: Task545ClosureIdentity;
let recoveryDeltaFixture: VerifiedTask545MetadataRecoveryDelta;

// Loaded lazily at first fixture use so the module import stays side-effect
// free for the type-level gate.
async function loadFixtureJson(): Promise<void> {
  if (checkpointV1Fixture !== undefined) return;
  checkpointV1Fixture = JSON.parse(
    await readFile(join(FIXTURES, "checkpoint-v1.json"), "utf8")
  ) as SmokeEvidenceCheckpointV1;
  const recovery = JSON.parse(
    await readFile(join(FIXTURES, "metadata-recovery-resume.json"), "utf8")
  ) as Task545ClosureResume;
  if (recovery.state !== "metadata_recovery") throw new Error("fixture must be metadata_recovery");
  identityFixture = recovery.closureIdentity;
  recoveryDeltaFixture = recovery.delta;
}

const sha = (text: string): string => createHash("sha256").update(text).digest("hex");

// Synthetic owning workflow entry: closure-only resume dispatch that echoes the
// exact argv. Imports the canonical driver surface; never contains staging
// patterns, so the TASK-545 static-contract/import gate accepts it.
const WORKFLOW_FIXTURE = [
  "// TASK-545 implementation workflow entry (synthetic test fixture).",
  "// Closure-only resume dispatch; owner review and staging are manual.",
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

function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof SmokeEvidenceError) return error.code;
    throw error;
  }
  throw new Error("expected SmokeEvidenceError");
}

async function errorCodeAsync(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof SmokeEvidenceError) return error.code;
    throw error;
  }
  throw new Error("expected SmokeEvidenceError");
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_OPTIONAL_LOCKS: "0",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
    },
  }).trim();
}

const tempRoots: string[] = [];

async function makeRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "smoke-checkpoint-test-"));
  tempRoots.push(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  await writeFile(join(root, "source.txt"), "v1\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "init"]);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function addWorkflowEntry(
  root: string,
  entry = "task-545-implement.mjs",
  source = WORKFLOW_FIXTURE,
  commit = true
): Promise<string> {
  const entryDir = join(root, "_docs", "_workflows");
  await mkdir(join(entryDir, "lib"), { recursive: true });
  await writeFile(join(entryDir, "lib", "smoke-evidence.mjs"), STUB_LIB);
  await writeFile(join(entryDir, entry), source);
  if (commit) {
    git(root, ["add", "_docs/_workflows"]);
    git(root, ["commit", "-q", "-m", `add ${entry}`]);
  }
  return `_docs/_workflows/${entry}`;
}

function entryUrl(root: string, entry = "task-545-implement.mjs"): string {
  return pathToFileURL(join(root, "_docs", "_workflows", entry)).href;
}

function ownerOptions(
  root: string,
  overrides: Record<string, unknown> = {}
): SmokeEvidenceOwnerOptions {
  return {
    repoRoot: root,
    expectedTask: TASK,
    expectedWorkflowRole: "implement",
    executingImportMetaUrl: entryUrl(root),
    ...overrides,
  } as SmokeEvidenceOwnerOptions;
}

type MutableAssertion = {
  kind: string;
  target: string;
  property: string;
  expected: string;
  actual: string;
  pass: boolean;
  [key: string]: unknown;
};
type MutableVariant = {
  id: string;
  surface: string;
  theme: string;
  viewport: { width: number; height: number };
  assertions: MutableAssertion[];
  consoleErrors: string[];
  [key: string]: unknown;
};
type MutableScenario = {
  id: string;
  title: string;
  variants: MutableVariant[];
  screenshots: { path: string; sha256: string }[];
  [key: string]: unknown;
};
type MutableManifest = {
  schemaVersion: number;
  taskId: string;
  suiteId: string;
  profile: string;
  session: string;
  report: { path: string; sha256: string };
  revision: { gitHead: string; workingTreeDirty: boolean; workingTreeSha256: string };
  generatedAt: string;
  serverUp: boolean;
  scenarios: MutableScenario[];
  [key: string]: unknown;
};

function assertion(overrides: Record<string, unknown> = {}): MutableAssertion {
  return {
    kind: "computed-style",
    target: "sidebar",
    property: "display",
    expected: "flex",
    actual: "flex",
    pass: true,
    ...overrides,
  };
}
function variant(id: string, overrides: Record<string, unknown> = {}): MutableVariant {
  return {
    id,
    surface: "admin",
    theme: "light",
    viewport: { width: 1280, height: 800 },
    assertions: [assertion()],
    consoleErrors: [],
    ...overrides,
  };
}
function scenario(id: string, overrides: Record<string, unknown> = {}): MutableScenario {
  return {
    id,
    title: `Title for ${id}`,
    variants: [variant(`${id}-v`)],
    screenshots: [{ path: `${id}.png`, sha256: sha(`${id}.png`) }],
    ...overrides,
  };
}
function baseScenarios(): MutableScenario[] {
  return [
    scenario("admin-light-wide"),
    scenario("admin-dark-narrow", { variants: [variant("dark-narrow", { theme: "dark" })] }),
    scenario("admin-form-focus"),
    scenario("admin-menu-open"),
    scenario("public-mobile-nav", { variants: [variant("mobile-nav", { surface: "public" })] }),
  ];
}
function validManifest(overrides: Record<string, unknown> = {}): MutableManifest {
  return {
    schemaVersion: 1,
    taskId: TASK,
    suiteId: SUITE,
    profile: PROFILE,
    session: SESSION,
    report: { path: "report.json", sha256: "0".repeat(64) },
    revision: {
      gitHead: "a".repeat(40),
      workingTreeDirty: false,
      workingTreeSha256: "b".repeat(64),
    },
    generatedAt: "2026-08-14T00:00:00.000Z",
    serverUp: true,
    scenarios: baseScenarios() as MutableScenario[],
    ...overrides,
  };
}
function validReport(): Record<string, unknown> {
  const scenarios = baseScenarios().map((s) => ({
    id: s.id,
    pass: true,
    elapsedMs: 10,
    title: s.title,
    variants: s.variants,
    screenshots: s.screenshots,
  }));
  const screenshots = baseScenarios().flatMap((s) => s.screenshots);
  return {
    schemaVersion: 1,
    suiteId: SUITE,
    profile: PROFILE,
    session: SESSION,
    pass: true,
    serverUp: true,
    scenarios,
    screenshots,
  };
}

async function buildEvidence(root: string, task = TASK, session = SESSION): Promise<string> {
  const evidence = await resolveCanonicalEvidenceDirectory(root, task, session);
  await mkdir(evidence, { recursive: true });
  for (const id of [
    "admin-light-wide",
    "admin-dark-narrow",
    "admin-form-focus",
    "admin-menu-open",
    "public-mobile-nav",
  ]) {
    await writeFile(join(evidence, `${id}.png`), `${id}.png`);
  }
  const reportBytes = `${JSON.stringify(validReport())}\n`;
  await writeFile(join(evidence, "report.json"), reportBytes);
  const revision = await computeWorkingTreeRevision(root, task, session);
  const manifest = validManifest({ taskId: task, session });
  manifest.revision = publicRevision(revision) as MutableManifest["revision"];
  manifest.report = { path: "report.json", sha256: sha256(reportBytes) };
  await writeFile(join(evidence, "manifest.json"), JSON.stringify(manifest));
  return evidence;
}

async function createCheckpoint(
  root: string,
  overrides: Record<string, unknown> = {}
): Promise<OwnerActionRequiredPayload> {
  return createResumeCheckpoint({
    repoRoot: root,
    expectedTask: TASK,
    pinnedChangelogNumber: CHANGELOG_NUMBER,
    pinnedChangelogSlug: CHANGELOG_SLUG,
    expectedWorkflowRole: "implement",
    executingImportMetaUrl: entryUrl(root),
    expectedSuite: SUITE,
    expectedProfile: PROFILE,
    expectedSession: SESSION,
    runtimeResult: { pass: true },
    ...overrides,
  });
}

function resumeOptions(
  root: string,
  pause: { checkpointPath: string; checkpointSha256: string; runId: string },
  overrides: Record<string, unknown> = {}
): SmokeEvidenceResumeOptions {
  return {
    repoRoot: root,
    expectedTask: TASK,
    checkpointPath: pause.checkpointPath,
    checkpointSha256: pause.checkpointSha256,
    runId: pause.runId,
    expectedSession: SESSION,
    expectedWorkflowRole: "implement",
    executingImportMetaUrl: entryUrl(root),
    ...overrides,
  };
}

async function stageEvidence(root: string, task = TASK, session = SESSION): Promise<void> {
  const evidence = await resolveCanonicalEvidenceDirectory(root, task, session);
  git(root, ["add", evidence]);
}

// Commits the frozen closure corpus indexes at HEAD so L04's plan rebuild can
// derive the exact Board/Statistics rows and the changelog next-pointer.
async function writeFrozenIndexes(root: string): Promise<void> {
  const taskDir = join(root, "_docs", "_TASKS");
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, "README.md"), FROZEN_TASK_INDEX);
  const changelogDir = join(root, "_docs", "_CHANGELOG");
  await mkdir(changelogDir, { recursive: true });
  await writeFile(join(changelogDir, "README.md"), FROZEN_CHANGELOG_INDEX);
  git(root, ["add", "_docs"]);
  git(root, ["commit", "-q", "-m", "frozen closure corpus"]);
}

async function writeChangelogFile(root: string, overrides: { name?: string; body?: string } = {}) {
  const dir = join(root, "_docs", "_CHANGELOG");
  await mkdir(dir, { recursive: true });
  const name = overrides.name ?? "1257-2026-08-14-task-545-smoke-evidence-checkpoint.md";
  const body = overrides.body ?? CHANGELOG_TEMPLATE;
  await writeFile(join(dir, name), body);
  return join(dir, name);
}

async function writeChangelogIndex(root: string) {
  const dir = join(root, "_docs", "_CHANGELOG");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "README.md"), CHANGELOG_INDEX_AFTER);
}

describe("createResumeCheckpoint", () => {
  test("returns the exact owner_action_required pause payload and writes the checkpoint", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    expect(pause.pass).toBe(false);
    expect(pause.code).toBe("owner_action_required");
    expect(pause.action).toBe("review_and_stage_evidence");
    expect(pause.taskId).toBe(TASK);
    expect(pause.evidenceDirectory).toBe(`_docs/_workflows/_smoke/evidence/task-545/${SESSION}`);
    expect(pause.checkpointPath).toBe(`${pause.evidenceDirectory}/resume-checkpoint.json`);
    expect(pause.checkpointSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(pause.runId).toMatch(/^[0-9a-f]{64}$/);
    expect(pause.frozenRuntimeRevision.gitHead).toMatch(/^[0-9a-f]{40}$/);
    expect(pause.frozenRuntimeRevision.workingTreeDirty).toBe(false);
    expect(pause.resumeArgv[0]).toBe(process.execPath);
    expect(pause.resumeArgv).toContain("closure-resume");
    expect(pause.resumeCommand).toContain("closure-resume");
    // Every resume argv element is shell-safe (no control chars or metachars).
    for (const arg of pause.resumeArgv) {
      expect(arg).toMatch(/^[A-Za-z0-9/._:@-]+$/);
      expect(arg.length).toBeGreaterThan(0);
    }
    // The persisted bytes hash exactly to the returned checkpoint hash.
    const bytes = await readFile(join(root, pause.checkpointPath));
    expect(sha256(bytes)).toBe(pause.checkpointSha256);
    const parsed = JSON.parse(bytes.toString("utf8")) as SmokeEvidenceCheckpointV1;
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.taskId).toBe(TASK);
    expect(parsed.runId).toBe(pause.runId);
    expect(parsed.workflowEntry).toBe(WORKFLOW_ENTRY);
    expect(parsed.phase1.state).toBe("owner_review_required");
    expect(parsed.closureContract.changelogNumber).toBe(CHANGELOG_NUMBER);
    expect(parsed.closureContract.changelogSlug).toBe(CHANGELOG_SLUG);
    expect(parsed.closureContract.taskIndex).toBe("_docs/_TASKS/README.md");
    expect(parsed.closureContract.changelogIndex).toBe("_docs/_CHANGELOG/README.md");
    expect(parsed.closureContract.supplementalTaskFiles).toEqual([]);
    expect(parsed.evidenceFiles.length).toBeGreaterThanOrEqual(2);
    // Safe contents: every referenced path is canonical and relative.
    for (const entry of parsed.evidenceFiles) {
      expect(entry.path).not.toMatch(/^[/\\]/);
      expect(entry.path).not.toContain("..");
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  test("create-only never overwrites an existing checkpoint", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    await createCheckpoint(root);
    await expect(errorCodeAsync(() => createCheckpoint(root))).resolves.toBe(
      "smoke_checkpoint_conflict"
    );
  });

  test("refuses when the pinned changelog file or index row already exists", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    await writeChangelogFile(root);
    await expect(errorCodeAsync(() => createCheckpoint(root))).resolves.toBe(
      "smoke_pinned_changelog_conflict"
    );
    await rm(join(root, "_docs", "_CHANGELOG"), { recursive: true, force: true });
    await writeChangelogIndex(root);
    await expect(errorCodeAsync(() => createCheckpoint(root))).resolves.toBe(
      "smoke_pinned_changelog_conflict"
    );
  });

  test("rejects unsafe shell arguments in the returned argv by construction", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    expect(pause.resumeCommand).toBe(
      pause.resumeArgv.map((arg) => `'${arg.replace(/'/gu, `'\\''`)}'`).join(" ")
    );
  });
});

describe("resumeTrackedEvidence", () => {
  test("fails before owner staging with a machine-readable pause", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await expect(
      errorCodeAsync(() => resumeTrackedEvidence(resumeOptions(root, pause)))
    ).resolves.toBe("smoke_owner_stage_required");
  });

  test("passes after staging the exact set and is replay-safe without mutation", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await stageEvidence(root);
    const first = await resumeTrackedEvidence(resumeOptions(root, pause));
    expect(first.pass).toBe(true);
    expect(first.code).toBe("tracked_evidence_ok");
    expect(first.checkpointSha256).toBe(pause.checkpointSha256);
    expect(first.runId).toBe(pause.runId);
    const before = await readFile(join(root, pause.checkpointPath));
    const second = await resumeTrackedEvidence(resumeOptions(root, pause));
    expect(second.checkpointSha256).toBe(pause.checkpointSha256);
    const after = await readFile(join(root, pause.checkpointPath));
    expect(after.equals(before)).toBe(true);
  });

  test("wrong task, session, and checkpoint path fail closed", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await stageEvidence(root);
    const base = resumeOptions(root, pause);
    // The owning-workflow binding runs before path verification, so a foreign
    // task fails the task binding first; session/path drift hits the exact
    // canonical-path check.
    await expect(
      errorCodeAsync(() => resumeTrackedEvidence({ ...base, expectedTask: "TASK-540" }))
    ).resolves.toBe("smoke_workflow_task_binding");
    await expect(
      errorCodeAsync(() => resumeTrackedEvidence({ ...base, expectedSession: "other-session" }))
    ).resolves.toBe("smoke_checkpoint_path_mismatch");
    await expect(
      errorCodeAsync(() => resumeTrackedEvidence({ ...base, checkpointPath: "../other.json" }))
    ).resolves.toBe("smoke_checkpoint_path_mismatch");
  });

  test("wrong run id and wrong checkpoint hash fail closed", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await stageEvidence(root);
    const base = resumeOptions(root, pause);
    await expect(
      errorCodeAsync(() => resumeTrackedEvidence({ ...base, runId: "0".repeat(64) }))
    ).resolves.toBe("smoke_checkpoint_run_mismatch");
    await expect(
      errorCodeAsync(() => resumeTrackedEvidence({ ...base, checkpointSha256: "0".repeat(64) }))
    ).resolves.toBe("smoke_checkpoint_hash_mismatch");
  });

  test("tampered checkpoint bytes and schema drift fail closed", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    const path = join(root, pause.checkpointPath);
    // Byte tamper: raw change fails the constant-time hash check.
    const raw = (await readFile(path)).toString("utf8");
    await writeFile(path, raw.replace('"owner_review_required"', '"owner_reviewed"'));
    await expect(
      errorCodeAsync(() => resumeTrackedEvidence(resumeOptions(root, pause)))
    ).resolves.toBe("smoke_checkpoint_hash_mismatch");
    // Schema tamper with a recomputed hash: unknown version fails validation.
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.schemaVersion = 2;
    const bytes = Buffer.from(JSON.stringify(parsed));
    await writeFile(path, bytes);
    const forged = { ...resumeOptions(root, pause), checkpointSha256: sha256(bytes) };
    await expect(errorCodeAsync(() => resumeTrackedEvidence(forged))).resolves.toBe(
      "smoke_checkpoint_invalid"
    );
    // Unknown top-level field is rejected by the strict schema.
    const extra = { ...JSON.parse(raw), extra: 1 } as Record<string, unknown>;
    const extraBytes = Buffer.from(JSON.stringify(extra));
    await writeFile(path, extraBytes);
    const forgedExtra = { ...resumeOptions(root, pause), checkpointSha256: sha256(extraBytes) };
    await expect(errorCodeAsync(() => resumeTrackedEvidence(forgedExtra))).resolves.toBe(
      "smoke_checkpoint_invalid"
    );
  });

  test("stale non-metadata revision fails resume", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await stageEvidence(root);
    await writeFile(join(root, "source.txt"), "v2\n");
    await expect(
      errorCodeAsync(() => resumeTrackedEvidence(resumeOptions(root, pause)))
    ).resolves.toBe("smoke_revision_mismatch");
  });

  test("extra untracked evidence and non-evidence staging fail closed", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    const evidence = await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await stageEvidence(root);
    await writeFile(join(evidence, "unreferenced.txt"), "extra");
    await expect(
      errorCodeAsync(() => resumeTrackedEvidence(resumeOptions(root, pause)))
    ).resolves.toBe("smoke_evidence_file_set_mismatch");
    await rm(join(evidence, "unreferenced.txt"));
    await writeFile(join(root, "notes.txt"), "staged outside evidence\n");
    git(root, ["add", "notes.txt"]);
    await expect(
      errorCodeAsync(() => resumeTrackedEvidence(resumeOptions(root, pause)))
    ).resolves.toBe("smoke_revision_mismatch");
  });

  test("wrong executing workflow entry fails resume", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await stageEvidence(root);
    const path = join(root, pause.checkpointPath);
    const parsed = JSON.parse((await readFile(path)).toString("utf8")) as Record<string, unknown>;
    parsed.workflowEntry = "_docs/_workflows/task-543-implement.mjs";
    const bytes = Buffer.from(JSON.stringify(parsed));
    await writeFile(path, bytes);
    const forged = { ...resumeOptions(root, pause), checkpointSha256: sha256(bytes) };
    await expect(errorCodeAsync(() => resumeTrackedEvidence(forged))).resolves.toBe(
      "smoke_workflow_entry_mismatch"
    );
  });
});

describe("openWorkflowClosureResume", () => {
  test("frozen state returns the exact closure identity with durableState none", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await stageEvidence(root);
    const resume = await openWorkflowClosureResume(resumeOptions(root, pause));
    expect(resume.state).toBe("frozen");
    if (resume.state !== "frozen") throw new Error("expected frozen");
    expect(resume.checkpoint.runId).toBe(pause.runId);
    expect(resume.closureIdentity.taskId).toBe(TASK);
    expect(resume.closureIdentity.suiteId).toBe(SUITE);
    expect(resume.closureIdentity.session).toBe(SESSION);
    expect(resume.closureIdentity.checkpointSha256).toBe(pause.checkpointSha256);
    expect(resume.closureIdentity.changelogNumber).toBe(CHANGELOG_NUMBER);
    expect(resume.closureIdentity.changelogSlug).toBe(CHANGELOG_SLUG);
    expect(resume.closureIdentity.durableState).toBe("none");
    expect(resume.closureIdentity.closureUtcDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(resume.closureIdentity.pinnedChangelogPath).toBe(
      `_docs/_CHANGELOG/${CHANGELOG_NUMBER}-${resume.closureIdentity.closureUtcDate}-${CHANGELOG_SLUG}.md`
    );
  });

  test("metadata_recovery with both validates the exact L04 metadata delta", async () => {
    const root = await makeRepo();
    await writeFrozenIndexes(root);
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await stageEvidence(root);
    await writeChangelogFile(root);
    await writeChangelogIndex(root);
    const resume = await openWorkflowClosureResume(resumeOptions(root, pause));
    expect(resume.state).toBe("metadata_recovery");
    if (resume.state !== "metadata_recovery") throw new Error("expected metadata_recovery");
    expect(resume.closureIdentity.durableState).toBe("both");
    expect(resume.closureIdentity.closureUtcDate).toBe(CLOSURE_DATE);
    expect(resume.delta.pass).toBe(true);
    expect(resume.delta.runId).toBe(pause.runId);
    expect(resume.delta.changedPaths).toEqual([
      "_docs/_CHANGELOG/1257-2026-08-14-task-545-smoke-evidence-checkpoint.md",
      "_docs/_CHANGELOG/README.md",
    ]);
  });

  test("metadata_recovery with file-only validates the exact L04 first prefix", async () => {
    const root = await makeRepo();
    await writeFrozenIndexes(root);
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await stageEvidence(root);
    await writeChangelogFile(root);
    const resume = await openWorkflowClosureResume(resumeOptions(root, pause));
    expect(resume.state).toBe("metadata_recovery");
    if (resume.state !== "metadata_recovery") throw new Error("expected metadata_recovery");
    expect(resume.closureIdentity.durableState).toBe("file-only");
    expect(resume.closureIdentity.closureUtcDate).toBe(CLOSURE_DATE);
    expect(resume.delta.pass).toBe(true);
    expect(resume.delta.runId).toBe(pause.runId);
    expect(resume.delta.changedPaths).toEqual([
      "_docs/_CHANGELOG/1257-2026-08-14-task-545-smoke-evidence-checkpoint.md",
    ]);
  });

  test("index-only and multiple changelog candidates fail closed", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await stageEvidence(root);
    await writeChangelogIndex(root);
    await expect(
      errorCodeAsync(() => openWorkflowClosureResume(resumeOptions(root, pause)))
    ).resolves.toBe("smoke_changelog_index_only");
    await rm(join(root, "_docs", "_CHANGELOG"), { recursive: true, force: true });
    await writeChangelogFile(root, {
      name: "1257-2026-08-14-task-545-smoke-evidence-checkpoint-a.md",
    });
    await writeChangelogFile(root, {
      name: "1257-2026-08-14-task-545-smoke-evidence-checkpoint-b.md",
    });
    await expect(
      errorCodeAsync(() => openWorkflowClosureResume(resumeOptions(root, pause)))
    ).resolves.toBe("smoke_changelog_multiple");
  });

  test("stale bound transaction residue is cleaned before the frozen branch", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    await stageEvidence(root);
    const changelogDir = join(root, "_docs", "_CHANGELOG");
    await mkdir(changelogDir, { recursive: true });
    const residue = join(changelogDir, `.stale.${pause.runId}.journal`);
    await writeFile(residue, "bound residue");
    const resume = await openWorkflowClosureResume(resumeOptions(root, pause));
    expect(resume.state).toBe("frozen");
    await expect(readFile(residue)).rejects.toThrow();
  });
});

describe("resume discriminants and re-exports (runtime)", () => {
  test("thin re-export surface exposes the exact four entry points", async () => {
    expect(reexportedCreate).toBe(createResumeCheckpoint);
    expect(reexportedResume).toBe(resumeTrackedEvidence);
    expect(reexportedOpen).toBe(openWorkflowClosureResume);
    expect(reexportedRequireOwner).toBe(requireTaskBoundOwningWorkflow);
  });

  test("execution of the exact returned resume argv re-enters the owning workflow", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await buildEvidence(root);
    const pause = await createCheckpoint(root);
    const result = spawnSync(pause.resumeArgv[0], pause.resumeArgv.slice(1), {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout) as { pass: boolean; argv: string[] };
    expect(out.pass).toBe(true);
    expect(out.argv).toContain("closure-resume");
    expect(out.argv).toContain(pause.checkpointPath);
    expect(out.argv).toContain(pause.checkpointSha256);
    expect(out.argv).toContain(pause.runId);
  });
});
