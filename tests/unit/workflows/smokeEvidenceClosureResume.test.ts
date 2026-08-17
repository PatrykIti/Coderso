// TASK-545-03-L03 closure-resume identity and supplemental task tests (Bun
// lane). Owns requireTaskBoundOwningWorkflow, the owner-controlled supplemental
// closure-task mapping, the frozen/metadata_recovery resume discriminants, and
// the checkpoint/closure-identity type fixtures. Uses temporary synthetic
// image bytes only.
//
// TASK-576 split: the phase-1 pause payload, atomic create-only checkpoint, and
// owner resume flow live in smokeEvidenceCheckpoint.test.ts.

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, test } from "bun:test";

import {
  requireTaskBoundOwningWorkflow,
  resolveOwnerControlledSupplementalClosureTaskFiles,
} from "../../../_docs/_workflows/lib/smoke-evidence-checkpoint.mjs";
import { SmokeEvidenceError } from "../../../_docs/_workflows/lib/smoke-evidence.mjs";
import type {
  SmokeEvidenceCheckpointV1,
  SmokeEvidenceOwnerOptions,
  Task545ClosureIdentity,
  Task545ClosureResume,
  VerifiedTask545Checkpoint,
  VerifiedTask545MetadataRecoveryDelta,
} from "../../../_docs/_workflows/lib/smoke-evidence-checkpoint.mjs";

const FIXTURES = resolve(import.meta.dir, "../../fixtures/workflows/smoke-evidence/checkpoint");
const TASK = "TASK-545";
const CHANGELOG_NUMBER = 1257;
const WORKFLOW_ENTRY = "_docs/_workflows/task-545-implement.mjs";

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
describe("requireTaskBoundOwningWorkflow", () => {
  test("accepts the canonical future owner bound to task and role", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    const entry = await requireTaskBoundOwningWorkflow(ownerOptions(root));
    expect(entry).toBe(WORKFLOW_ENTRY);
  });

  test("rejects wrong task, role, and closeout roles", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await expect(
      errorCodeAsync(() =>
        requireTaskBoundOwningWorkflow(ownerOptions(root, { expectedTask: "TASK-540" }))
      )
    ).resolves.toBe("smoke_workflow_task_binding");
    await expect(
      errorCodeAsync(() =>
        requireTaskBoundOwningWorkflow(ownerOptions(root, { expectedWorkflowRole: "fix" }))
      )
    ).resolves.toBe("smoke_workflow_role_binding");
    await expect(
      errorCodeAsync(() =>
        requireTaskBoundOwningWorkflow(ownerOptions(root, { expectedWorkflowRole: "closeout" }))
      )
    ).resolves.toBe("smoke_workflow_role_invalid");
  });

  test("rejects untracked, dirty, and symlinked entries", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root, "task-545-implement.mjs", WORKFLOW_FIXTURE, false);
    await expect(
      errorCodeAsync(() => requireTaskBoundOwningWorkflow(ownerOptions(root)))
    ).resolves.toBe("smoke_workflow_entry_untracked");
    git(root, ["add", "_docs/_workflows"]);
    git(root, ["commit", "-q", "-m", "add workflow"]);
    await writeFile(
      join(root, "_docs", "_workflows", "task-545-implement.mjs"),
      `${WORKFLOW_FIXTURE}// dirty\n`
    );
    await expect(
      errorCodeAsync(() => requireTaskBoundOwningWorkflow(ownerOptions(root)))
    ).resolves.toBe("smoke_workflow_entry_dirty");
    await rm(join(root, "_docs", "_workflows", "task-545-implement.mjs"));
    await symlink(
      join(root, "source.txt"),
      join(root, "_docs", "_workflows", "task-545-implement.mjs")
    );
    await expect(
      errorCodeAsync(() => requireTaskBoundOwningWorkflow(ownerOptions(root)))
    ).resolves.toBe("smoke_workflow_entry_symlink");
  });

  test("enforces the static contract and import gates", async () => {
    const root = await makeRepo();
    const noImport = [
      "// fixture without the canonical driver import",
      "export const nothing = 1;",
      "",
    ].join("\n");
    await addWorkflowEntry(root, "task-545-implement.mjs", noImport);
    await expect(
      errorCodeAsync(() => requireTaskBoundOwningWorkflow(ownerOptions(root)))
    ).resolves.toBe("smoke_workflow_entry_static_contract");
    const staging = [
      "// fixture that would stage evidence directly",
      'import { createResumeCheckpoint } from "./lib/smoke-evidence.mjs";',
      "const run = () => createResumeCheckpoint();",
      "git add .",
      "",
    ].join("\n");
    await addWorkflowEntry(root, "task-545-implement.mjs", staging);
    await expect(
      errorCodeAsync(() => requireTaskBoundOwningWorkflow(ownerOptions(root)))
    ).resolves.toBe("smoke_workflow_entry_static_contract");
  });

  test("binds the TASK-554 builtin entries exactly and rejects closeout", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root, "task-554-implement.mjs");
    const entry = await requireTaskBoundOwningWorkflow(
      ownerOptions(root, {
        expectedTask: "TASK-554",
        executingImportMetaUrl: entryUrl(root, "task-554-implement.mjs"),
      })
    );
    expect(entry).toBe("_docs/_workflows/task-554-implement.mjs");
    await expect(
      errorCodeAsync(() =>
        requireTaskBoundOwningWorkflow(
          ownerOptions(root, { executingImportMetaUrl: entryUrl(root, "task-554-implement.mjs") })
        )
      )
    ).resolves.toBe("smoke_workflow_task_binding");
  });

  test("rejects a caller workflow-entry override", async () => {
    const root = await makeRepo();
    await addWorkflowEntry(root);
    await expect(
      errorCodeAsync(() =>
        requireTaskBoundOwningWorkflow(ownerOptions(root, { workflowEntry: WORKFLOW_ENTRY }))
      )
    ).resolves.toBe("smoke_workflow_override");
  });
});

describe("supplemental closure task files", () => {
  test("TASK-414 receives exactly TASK-406 and every other task receives []", async () => {
    const root = await makeRepo();
    const taskDir = join(root, "_docs", "_TASKS");
    await mkdir(taskDir, { recursive: true });
    await writeFile(
      join(taskDir, "TASK-406_Assistant_Cross_Industry_Reset_E2E.md"),
      "supplemental\n"
    );
    await writeFile(
      join(taskDir, "TASK-406_Assistant_Cross_Industry_Reset_E2E_Extra.md"),
      "lookalike\n"
    );
    git(root, ["add", "_docs/_TASKS"]);
    git(root, ["commit", "-q", "-m", "add supplemental"]);
    const supplemental = await resolveOwnerControlledSupplementalClosureTaskFiles(root, "TASK-414");
    expect(supplemental).toEqual(["_docs/_TASKS/TASK-406_Assistant_Cross_Industry_Reset_E2E.md"]);
    expect(await resolveOwnerControlledSupplementalClosureTaskFiles(root, TASK)).toEqual([]);
    expect(await resolveOwnerControlledSupplementalClosureTaskFiles(root, "TASK-9999")).toEqual([]);
  });

  test("untracked, symlinked, and HEAD-mismatched supplemental paths fail closed", async () => {
    const root = await makeRepo();
    const taskDir = join(root, "_docs", "_TASKS");
    const supplementalPath = "_docs/_TASKS/TASK-406_Assistant_Cross_Industry_Reset_E2E.md";
    await mkdir(taskDir, { recursive: true });
    await writeFile(
      join(taskDir, "TASK-406_Assistant_Cross_Industry_Reset_E2E.md"),
      "supplemental\n"
    );
    // Untracked supplemental file fails.
    await expect(
      errorCodeAsync(() => resolveOwnerControlledSupplementalClosureTaskFiles(root, "TASK-414"))
    ).resolves.toBe("smoke_path_untracked");
    git(root, ["add", "_docs/_TASKS"]);
    git(root, ["commit", "-q", "-m", "add supplemental"]);
    // Symlinked supplemental file fails.
    await rm(join(root, supplementalPath));
    await symlink(join(root, "source.txt"), join(root, supplementalPath));
    await expect(
      errorCodeAsync(() => resolveOwnerControlledSupplementalClosureTaskFiles(root, "TASK-414"))
    ).resolves.toBe("smoke_path_not_regular");
    // HEAD-mismatched supplemental file fails.
    await rm(join(root, supplementalPath));
    await writeFile(join(root, supplementalPath), "changed\n");
    await expect(
      errorCodeAsync(() => resolveOwnerControlledSupplementalClosureTaskFiles(root, "TASK-414"))
    ).resolves.toBe("smoke_path_head_mismatch");
  });
});

describe("resume discriminants and re-exports", () => {
  test("frozen and metadata_recovery fixtures pin the Task545ClosureResume discriminants", async () => {
    const frozen = JSON.parse(
      await readFile(join(FIXTURES, "frozen-resume.json"), "utf8")
    ) as Task545ClosureResume;
    expect(frozen.state).toBe("frozen");
    if (frozen.state === "frozen") {
      expect(frozen.closureIdentity.durableState).toBe("none");
      expect(frozen.closureIdentity.checkpointSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(frozen.checkpoint.schemaVersion).toBe(1);
      expect(frozen.checkpoint.phase1.state).toBe("owner_review_required");
    }
    const recovery = JSON.parse(
      await readFile(join(FIXTURES, "metadata-recovery-resume.json"), "utf8")
    ) as Task545ClosureResume;
    expect(recovery.state).toBe("metadata_recovery");
    if (recovery.state === "metadata_recovery") {
      expect(recovery.closureIdentity.durableState).toBe("both");
      expect(recovery.delta.pass).toBe(true);
      expect(recovery.delta.runId).toBe(recovery.checkpoint.runId);
      expect(recovery.delta.changedPaths).toContain(recovery.closureIdentity.pinnedChangelogPath);
      expect(recovery.checkpoint.closureContract.changelogNumber).toBe(CHANGELOG_NUMBER);
    }
  });

  test("type fixtures reject widened checkpoint and closure-identity shapes", async () => {
    await loadFixtureJson();
    const checkpoint = JSON.parse(JSON.stringify(checkpointV1Fixture)) as SmokeEvidenceCheckpointV1;
    const identity = JSON.parse(JSON.stringify(identityFixture)) as Task545ClosureIdentity;
    // @ts-expect-error schemaVersion is the literal 1
    const widenedVersion: SmokeEvidenceCheckpointV1 = { ...checkpoint, schemaVersion: 2 };
    const widenedState: SmokeEvidenceCheckpointV1 = {
      ...checkpoint,
      // @ts-expect-error phase1.state is the literal owner_review_required
      phase1: { state: "owner_approved", generatedAt: "2026-08-14T00:00:00.000Z" },
    };
    // @ts-expect-error profile is a literal union
    const widenedProfile: SmokeEvidenceCheckpointV1 = { ...checkpoint, profile: "full" };
    // @ts-expect-error a plain checkpoint is not a verified checkpoint
    const notVerified: VerifiedTask545Checkpoint = checkpoint;
    const widenedPath: Task545ClosureIdentity = {
      ...identity,
      // @ts-expect-error pinnedChangelogPath must match the canonical template
      pinnedChangelogPath: "docs/other.md",
    };
    // @ts-expect-error metadata_recovery requires durableState file-only|both
    const wrongDurable: Task545ClosureResume = {
      state: "metadata_recovery",
      checkpoint: checkpoint as VerifiedTask545Checkpoint,
      closureIdentity: { ...identity, durableState: "none" },
      delta: recoveryDeltaFixture,
    };
    // @ts-expect-error metadata_recovery requires the delta field
    const missingDelta: Task545ClosureResume = {
      state: "metadata_recovery",
      checkpoint: checkpoint as VerifiedTask545Checkpoint,
      closureIdentity: { ...identity, durableState: "both" },
    };
    // @ts-expect-error frozen requires durableState none
    const frozenWrong: Task545ClosureResume = {
      state: "frozen",
      checkpoint: checkpoint as VerifiedTask545Checkpoint,
      closureIdentity: { ...identity, durableState: "both" },
    };
    void widenedVersion;
    void widenedState;
    void widenedProfile;
    void notVerified;
    void widenedPath;
    void wrongDurable;
    void missingDelta;
    void frozenWrong;
  });
});

describe("fixture schema sanity", () => {
  test("fixture files load and satisfy the discriminant shapes", async () => {
    await loadFixtureJson();
    expect(checkpointV1Fixture.schemaVersion).toBe(1);
    expect(checkpointV1Fixture.phase1.state).toBe("owner_review_required");
    expect(identityFixture.durableState).toBe("both");
    expect(recoveryDeltaFixture.pass).toBe(true);
    expect(recoveryDeltaFixture.changedPaths).toContain(identityFixture.pinnedChangelogPath);
  });
});
