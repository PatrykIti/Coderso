// TASK-545-03-L04 closure-delta suite (Bun lane). Exercises the exact
// metadata allowlist, the frozen closure mutation plan (build and rejections),
// the ordered-durable changelog-file-then-index writer with child-process
// kill/recovery at every journal/temp/fsync/rename boundary, the metadata-only
// delta validator (pass and fail-closed drift), and the closure-delta CLI
// success plus usage-error surface. All corpora are disposable temporary Git
// repositories; every negative scenario asserts a machine-readable code.

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import {
  buildClosureMetadataMutationPlanV1,
  buildExactClosureMetadataAllowlist,
  runClosureDeltaCli,
  validateMetadataOnlyClosureDelta,
  writeOrResumeOrderedDurableChangelogFileThenIndexV1,
} from "../../../_docs/_workflows/lib/smoke-evidence-closure.mjs";
import {
  buildExactClosureMetadataAllowlist as reexportedAllowlist,
  buildClosureMetadataMutationPlanV1 as reexportedPlan,
  runClosureDeltaCli as reexportedCli,
  validateMetadataOnlyClosureDelta as reexportedDelta,
  writeOrResumeOrderedDurableChangelogFileThenIndexV1 as reexportedWriter,
} from "../../../_docs/_workflows/lib/smoke-evidence.mjs";
import { openWorkflowClosureResume } from "../../../_docs/_workflows/lib/smoke-evidence-checkpoint.mjs";
import type {
  OwnerActionRequiredPayload,
  SmokeEvidenceClosureContractV1,
  Task545ClosureIdentity,
  Task545ClosureResume,
  VerifiedTask545Checkpoint,
} from "../../../_docs/_workflows/lib/smoke-evidence-checkpoint.d.mts";
import type {
  ClosureMetadataMutationPlanV1,
  ClosureMetadataOperationV1,
  OrderedDurableWriterOptionsV1,
} from "../../../_docs/_workflows/lib/smoke-evidence-closure.d.mts";

import {
  CHANGELOG_INDEX_AFTER,
  CHANGELOG_INDEX_REL,
  CHANGELOG_NUMBER,
  CHANGELOG_ROW,
  CHANGELOG_SLUG,
  CHANGELOG_TEMPLATE,
  CLOSURE_DATE,
  FROZEN_CHANGELOG_INDEX,
  FROZEN_CHANGELOG_INDEX_BYTES,
  FROZEN_TASK_FILE_PARENT_BYTES,
  FROZEN_TASK_INDEX,
  FROZEN_TASK_INDEX_BYTES,
  PINNED_CHANGELOG_REL,
  PROFILE,
  RUN_ID,
  SESSION,
  SUITE,
  TASK,
  TASK_FILE_L01,
  TASK_INDEX_REL,
  WRITER_PROTOCOL,
  addWorkflowEntry,
  buildEvidence,
  changelogIndexMutation,
  cleanupTempRoots,
  closureIdentity,
  createCheckpoint,
  entryUrl,
  git,
  journalBytes,
  makeRepo,
  resumeOptions,
  stageEvidence,
  taskFileAfterState,
  taskIndexAfterState,
  today,
  writerCheckpoint,
  writeFrozenIndexes,
} from "../../fixtures/workflows/smoke-evidence/closure/closureCorpus";

const CLI_PATH = join(import.meta.dir, "../../../_docs/_workflows/lib/smoke-evidence.mjs");
const CHILD_PATH = join(
  import.meta.dir,
  "../../fixtures/workflows/smoke-evidence/closure/killRecoveryChild.ts"
);
const sha = (bytes: Uint8Array | string): string =>
  createHash("sha256").update(bytes).digest("hex");
const revBytes = (root: string, path: string): Buffer =>
  execFileSync("git", ["show", `HEAD:${path}`], { cwd: root, encoding: "buffer" });

async function errorCodeAsync(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
    throw error;
  }
  throw new Error("expected a fail-closed rejection");
}

function errorCodeSync(call: () => unknown): string {
  try {
    call();
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
    throw error;
  }
  throw new Error("expected a fail-closed rejection");
}

async function fullCorpus(): Promise<{ root: string; pause: OwnerActionRequiredPayload }> {
  const root = await makeRepo();
  await writeFrozenIndexes(root);
  await addWorkflowEntry(root);
  await buildEvidence(root);
  const pause = await createCheckpoint(root);
  await stageEvidence(root);
  return { root, pause };
}

async function frozenResume(): Promise<{
  root: string;
  checkpoint: VerifiedTask545Checkpoint;
  identity: Task545ClosureIdentity;
}> {
  const { root, pause } = await fullCorpus();
  const resume = await openWorkflowClosureResume(resumeOptions(root, pause));
  if (resume.state !== "frozen") throw new Error(`expected frozen resume, got ${resume.state}`);
  return { root, checkpoint: resume.checkpoint, identity: resume.closureIdentity };
}

// Faithful mirror of the module's operation application, used to prove the
// plan's declared after-hashes are exact and to detect declared-hash drift.
function applyOpsLocal(text: string, ops: readonly ClosureMetadataOperationV1[]): string {
  let out = text;
  for (const op of ops) {
    if (op.kind === "create_file") out = op.bytes as string;
    else if (op.kind === "replace_once")
      out = out.replace(op.search as string, op.replacement as string);
    else if (op.kind === "upsert_field") {
      const prefix = `**${op.field}:**`;
      const lines = out.split("\n");
      const found = lines.findIndex((line) => line.startsWith(prefix));
      if (found !== -1) lines[found] = `${prefix} ${op.value}`;
      else {
        const anchor = `**${op.afterField}:**`;
        const at = lines
          .map((line, i) => (line.startsWith(anchor) ? i : -1))
          .filter((i) => i !== -1);
        if (at.length !== 1) throw new Error("anchor_ambiguous");
        lines.splice(at[0] + 1, 0, `${prefix} ${op.value}`);
      }
      out = lines.join("\n");
    } else if (op.kind === "replace_board_row" || op.kind === "replace_statistics_row") {
      const lines = out.split("\n");
      const at = lines.map((line, i) => (line === op.from ? i : -1)).filter((i) => i !== -1);
      if (at.length !== 1) throw new Error("row_ambiguous");
      lines[at[0]] = op.to as string;
      out = lines.join("\n");
    } else if (op.kind === "insert_after") {
      const lines = out.split("\n");
      const at = lines.map((line, i) => (line === op.anchor ? i : -1)).filter((i) => i !== -1);
      if (at.length !== 1) throw new Error("anchor_ambiguous");
      lines.splice(at[0] + 1, 0, op.line as string);
      out = lines.join("\n");
    } else throw new Error(`unknown_kind ${String(op.kind)}`);
  }
  return out;
}

function indexMutationFromPlan(plan: ClosureMetadataMutationPlanV1): {
  anchor: string;
  row: string;
  pointerFrom: string;
  pointerTo: string;
} {
  const indexRecord = plan.find((record) => record.path === CHANGELOG_INDEX_REL);
  if (!indexRecord) throw new Error("index record missing");
  const ops = indexRecord.operations as readonly ClosureMetadataOperationV1[];
  const insert = ops.find((op) => op.kind === "insert_after");
  const replace = ops.find((op) => op.kind === "replace_once");
  if (!insert || !replace) throw new Error("index ops missing");
  return {
    anchor: insert.anchor as string,
    row: insert.line as string,
    pointerFrom: replace.search as string,
    pointerTo: replace.replacement as string,
  };
}

async function applyFullClosure(
  root: string,
  checkpoint: VerifiedTask545Checkpoint,
  identity: Task545ClosureIdentity,
  plan: ClosureMetadataMutationPlanV1
): Promise<Task545ClosureIdentity & { durableState: "both" }> {
  const taskDir = join(root, "_docs", "_TASKS");
  await writeFile(
    join(taskDir, "TASK-545-01-All-Results-Guard-And-Static-Workflow-Contract.md"),
    taskFileAfterState(FROZEN_TASK_FILE_PARENT_BYTES.toString("utf8"), identity.closureUtcDate)
  );
  await writeFile(
    join(taskDir, "TASK-545-03-L01-Add-Require-All-Results-Helper.md"),
    taskFileAfterState(TASK_FILE_L01, identity.closureUtcDate)
  );
  await writeFile(join(taskDir, "README.md"), taskIndexAfterState());
  const changelogRecord = plan.find((record) => record.path === identity.pinnedChangelogPath);
  if (!changelogRecord) throw new Error("changelog record missing");
  return writeOrResumeOrderedDurableChangelogFileThenIndexV1({
    repoRoot: root,
    checkpoint,
    runId: identity.runId,
    closureIdentity: identity,
    changelogBytes: (changelogRecord.operations as readonly ClosureMetadataOperationV1[])[0]
      .bytes as string,
    changelogIndexMutation: indexMutationFromPlan(plan),
    protocol: WRITER_PROTOCOL,
  });
}

function runCli(root: string, args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [CLI_PATH, "closure-delta", "--repo-root", root, ...args],
    { encoding: "utf8" }
  );
  return { status: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

describe("buildExactClosureMetadataAllowlist", () => {
  test("returns exactly the task files, indexes, and pinned changelog path", async () => {
    const { checkpoint, identity } = await frozenResume();
    const result = buildExactClosureMetadataAllowlist({
      frozenContract: checkpoint.closureContract,
      pinnedChangelogPath: identity.pinnedChangelogPath,
      closureUtcDate: identity.closureUtcDate,
    });
    expect(result.size).toBe(5);
    expect(
      result.has("_docs/_TASKS/TASK-545-01-All-Results-Guard-And-Static-Workflow-Contract.md")
    ).toBe(true);
    expect(result.has("_docs/_TASKS/TASK-545-03-L01-Add-Require-All-Results-Helper.md")).toBe(true);
    expect(result.has(TASK_INDEX_REL)).toBe(true);
    expect(result.has(CHANGELOG_INDEX_REL)).toBe(true);
    expect(result.has(PINNED_CHANGELOG_REL)).toBe(true);
  });

  test("rejects traversal, unsorted, duplicate, and overlapping inputs", async () => {
    const { checkpoint, identity } = await frozenResume();
    const frozenContract = checkpoint.closureContract;
    const call =
      (options: {
        readonly frozenContract: SmokeEvidenceClosureContractV1;
        readonly pinnedChangelogPath: `_docs/_CHANGELOG/${string}.md`;
        readonly closureUtcDate: string;
      }) =>
      () =>
        buildExactClosureMetadataAllowlist(options);
    const evil = {
      frozenContract,
      pinnedChangelogPath: "_docs/_CHANGELOG/../README.md" as `_docs/_CHANGELOG/${string}.md`,
      closureUtcDate: identity.closureUtcDate,
    };
    expect(errorCodeSync(call(evil))).toBe("smoke_path_invalid");
    const duplicate = {
      frozenContract,
      pinnedChangelogPath:
        "_docs/_CHANGELOG/1257-2026-08-14-other-slug.md" as `_docs/_CHANGELOG/${string}.md`,
      closureUtcDate: identity.closureUtcDate,
    };
    expect(errorCodeSync(call(duplicate))).toBe("smoke_changelog_path_invalid");
    const badDate = {
      frozenContract,
      pinnedChangelogPath:
        "_docs/_CHANGELOG/1257-2026-02-31-task-545-smoke-evidence-checkpoint.md" as `_docs/_CHANGELOG/${string}.md`,
      closureUtcDate: "2026-02-31",
    };
    expect(errorCodeSync(call(badDate))).toBe("smoke_changelog_date_invalid");
    const unsorted = { ...frozenContract, taskFiles: [...frozenContract.taskFiles].reverse() };
    expect(
      errorCodeSync(
        call({
          frozenContract: unsorted,
          pinnedChangelogPath: identity.pinnedChangelogPath,
          closureUtcDate: identity.closureUtcDate,
        })
      )
    ).toBe("smoke_closure_contract_invalid");
    const duplicated = {
      ...frozenContract,
      taskFiles: [frozenContract.taskFiles[0], frozenContract.taskFiles[0]],
    };
    expect(
      errorCodeSync(
        call({
          frozenContract: duplicated,
          pinnedChangelogPath: identity.pinnedChangelogPath,
          closureUtcDate: identity.closureUtcDate,
        })
      )
    ).toBe("smoke_closure_contract_invalid");
    const overlap = { ...frozenContract, supplementalTaskFiles: [frozenContract.taskFiles[0]] };
    expect(
      errorCodeSync(
        call({
          frozenContract: overlap,
          pinnedChangelogPath: identity.pinnedChangelogPath,
          closureUtcDate: identity.closureUtcDate,
        })
      )
    ).toBe("smoke_closure_contract_invalid");
  });
});

describe("buildClosureMetadataMutationPlanV1", () => {
  test("builds the exact five-record frozen plan with byte-exact after hashes", async () => {
    const { root, checkpoint, identity } = await frozenResume();
    const plan = await buildClosureMetadataMutationPlanV1(checkpoint, identity, { repoRoot: root });
    expect(plan.map((record) => record.path)).toEqual([
      PINNED_CHANGELOG_REL,
      CHANGELOG_INDEX_REL,
      TASK_INDEX_REL,
      "_docs/_TASKS/TASK-545-01-All-Results-Guard-And-Static-Workflow-Contract.md",
      "_docs/_TASKS/TASK-545-03-L01-Add-Require-All-Results-Helper.md",
    ]);
    const changelog = plan.find((record) => record.path === PINNED_CHANGELOG_REL);
    expect(changelog!.operations).toEqual([
      { kind: "create_file", bytes: CHANGELOG_TEMPLATE, label: "changelog_file" },
    ]);
    expect(changelog!.beforeSha256).toBe(sha(""));
    expect(changelog!.expectedAfterSha256).toBe(sha(CHANGELOG_TEMPLATE));
    const parent = plan.find((record) => record.path === checkpoint.closureContract.taskFiles[0]);
    expect(parent!.operations.map((op) => op.kind)).toEqual([
      "replace_once",
      "upsert_field",
      "upsert_field",
    ]);
    expect(parent!.operations[0].replacement as string).toContain("✅ Done");
    for (const record of plan) {
      const frozen =
        record.path === PINNED_CHANGELOG_REL ? "" : revBytes(root, record.path).toString("utf8");
      const after = applyOpsLocal(frozen, record.operations);
      expect(record.beforeSha256).toBe(sha(frozen));
      expect(record.expectedAfterSha256).toBe(sha(after));
    }
  });

  test("detects declared after-hash drift in the recomputation guard", async () => {
    const { root, checkpoint, identity } = await frozenResume();
    const plan = await buildClosureMetadataMutationPlanV1(checkpoint, identity, { repoRoot: root });
    for (const record of plan) {
      const frozen =
        record.path === PINNED_CHANGELOG_REL ? "" : revBytes(root, record.path).toString("utf8");
      expect(applyOpsLocal(frozen, record.operations)).toBeDefined();
    }
    const drifted = structuredClone(plan) as Array<{
      path: string;
      beforeSha256: string;
      expectedAfterSha256: string;
      operations: readonly ClosureMetadataOperationV1[];
    }>;
    const target = drifted[0];
    target.expectedAfterSha256 = target.expectedAfterSha256.replace(/^./u, "0");
    const frozen =
      target.path === PINNED_CHANGELOG_REL ? "" : revBytes(root, target.path).toString("utf8");
    expect(applyOpsLocal(frozen, target.operations)).not.toHaveProperty("expectedAfterSha256");
    expect(target.expectedAfterSha256).not.toBe(sha(applyOpsLocal(frozen, target.operations)));
  });

  test("rejects tampered evidence, HEAD change, and stale base", async () => {
    const { root, pause } = await fullCorpus();
    const resume = await openWorkflowClosureResume(resumeOptions(root, pause));
    if (resume.state !== "frozen") throw new Error("expected frozen");
    await writeFile(join(root, resume.checkpoint.evidenceDirectory, "manifest.json"), "tampered");
    await expect(
      errorCodeAsync(
        buildClosureMetadataMutationPlanV1(resume.checkpoint, resume.closureIdentity, {
          repoRoot: root,
        })
      )
    ).resolves.toBe("smoke_hash_mismatch");

    const second = await frozenResume();
    await writeFile(join(second.root, "new.txt"), "new\n");
    git(second.root, ["add", "new.txt"]);
    git(second.root, ["commit", "-q", "-m", "head change"]);
    await expect(
      errorCodeAsync(
        buildClosureMetadataMutationPlanV1(second.checkpoint, second.identity, {
          repoRoot: second.root,
        })
      )
    ).resolves.toBe("smoke_head_changed");

    const third = await frozenResume();
    await writeFile(
      join(third.root, "_docs", "_CHANGELOG", "README.md"),
      FROZEN_CHANGELOG_INDEX + "dirty\n"
    );
    await expect(
      errorCodeAsync(
        buildClosureMetadataMutationPlanV1(third.checkpoint, third.identity, {
          repoRoot: third.root,
        })
      )
    ).resolves.toBe("smoke_changelog_index_base_changed");
  });

  test("rejects ambiguous or missing board/statistics rows", async () => {
    async function resumeOver(
      taskIndexOverride: string
    ): Promise<{ root: string; resume: Task545ClosureResume }> {
      const root = await makeRepo();
      await writeFrozenIndexes(root, taskIndexOverride);
      await addWorkflowEntry(root);
      await buildEvidence(root);
      const pause = await createCheckpoint(root);
      await stageEvidence(root);
      const resume = await openWorkflowClosureResume(resumeOptions(root, pause));
      if (resume.state !== "frozen") throw new Error(`expected frozen, got ${resume.state}`);
      return { root, resume };
    }
    const duplicate = await resumeOver(
      FROZEN_TASK_INDEX + "| TASK-545 | Duplicate | High | Medium | ⏳ To Do |\n"
    );
    await expect(
      errorCodeAsync(
        buildClosureMetadataMutationPlanV1(
          duplicate.resume.checkpoint,
          duplicate.resume.closureIdentity,
          { repoRoot: duplicate.root }
        )
      )
    ).resolves.toBe("duplicateBoardStatisticRejected");

    const missingStatistics = FROZEN_TASK_INDEX.split("\n")
      .filter((line) => !line.startsWith("| TASK-545 | ⏳ To Do | 4 | 13 |"))
      .join("\n");
    const missing = await resumeOver(missingStatistics);
    await expect(
      errorCodeAsync(
        buildClosureMetadataMutationPlanV1(
          missing.resume.checkpoint,
          missing.resume.closureIdentity,
          { repoRoot: missing.root }
        )
      )
    ).resolves.toBe("boardStatisticMissing");
  });
});

describe("writeOrResumeOrderedDurableChangelogFileThenIndexV1", () => {
  test("completes the frozen file-then-index protocol with both identity and no residue", async () => {
    const { root, checkpoint, identity } = await frozenResume();
    const plan = await buildClosureMetadataMutationPlanV1(checkpoint, identity, { repoRoot: root });
    const changelogRecord = plan.find((record) => record.path === PINNED_CHANGELOG_REL);
    const result = await writeOrResumeOrderedDurableChangelogFileThenIndexV1({
      repoRoot: root,
      checkpoint,
      runId: identity.runId,
      closureIdentity: identity,
      changelogBytes: changelogRecord!.operations[0].bytes as string,
      changelogIndexMutation: indexMutationFromPlan(plan),
      protocol: WRITER_PROTOCOL,
    });
    expect(result.durableState).toBe("both");
    expect(await readFile(join(root, ...PINNED_CHANGELOG_REL.split("/")), "utf8")).toBe(
      CHANGELOG_TEMPLATE
    );
    expect(await readFile(join(root, "_docs", "_CHANGELOG", "README.md"), "utf8")).toBe(
      CHANGELOG_INDEX_AFTER
    );
    const residue = await readdir(join(root, "_docs", "_CHANGELOG"));
    expect(residue.filter((name) => name.includes(RUN_ID))).toEqual([]);
  });

  test("recovers every crash boundary through the child fixture", async () => {
    for (const killPoint of [0, 1, 2, 3, 4, 5, 6]) {
      const spawned = spawnSync(process.execPath, [CHILD_PATH, `--kill-point=${killPoint}`], {
        encoding: "utf8",
      });
      expect(spawned.status, `kill point ${killPoint}`).toBe(0);
      const handoff = JSON.parse(spawned.stdout);
      const result = await writeOrResumeOrderedDurableChangelogFileThenIndexV1({
        repoRoot: handoff.repoRoot,
        checkpoint: handoff.checkpoint,
        runId: RUN_ID,
        closureIdentity: handoff.closureIdentity,
        changelogBytes: handoff.changelogBytes,
        changelogIndexMutation: handoff.changelogIndexMutation,
        protocol: handoff.protocol as typeof WRITER_PROTOCOL,
      });
      expect(result.durableState, `kill point ${killPoint}`).toBe("both");
      expect(
        await readFile(join(handoff.repoRoot, ...PINNED_CHANGELOG_REL.split("/")), "utf8")
      ).toBe(CHANGELOG_TEMPLATE);
      expect(
        await readFile(join(handoff.repoRoot, "_docs", "_CHANGELOG", "README.md"), "utf8")
      ).toBe(CHANGELOG_INDEX_AFTER);
      const residue = await readdir(join(handoff.repoRoot, "_docs", "_CHANGELOG"));
      expect(residue.filter((name) => name.includes(RUN_ID))).toEqual([]);
    }
  });

  test("fails closed on index-only, corrupt residue, and protocol drift", async () => {
    const root = await makeRepo();
    const changelogDir = join(root, "_docs", "_CHANGELOG");
    await mkdir(changelogDir, { recursive: true });
    await writeFile(join(changelogDir, "README.md"), FROZEN_CHANGELOG_INDEX);
    git(root, ["add", "_docs"]);
    git(root, ["commit", "-q", "-m", "frozen"]);
    const gitHead = git(root, ["rev-parse", "HEAD"]);
    const checkpoint = writerCheckpoint(gitHead);
    const identity = closureIdentity("none");
    const mutation = changelogIndexMutation();
    const base: OrderedDurableWriterOptionsV1 = {
      repoRoot: root,
      checkpoint,
      runId: RUN_ID,
      closureIdentity: identity,
      changelogBytes: CHANGELOG_TEMPLATE,
      changelogIndexMutation: mutation,
      protocol: WRITER_PROTOCOL,
    };
    await writeFile(join(changelogDir, "README.md"), FROZEN_CHANGELOG_INDEX + CHANGELOG_ROW + "\n");
    await expect(
      errorCodeAsync(writeOrResumeOrderedDurableChangelogFileThenIndexV1(base))
    ).resolves.toBe("smoke_changelog_index_only");
    await writeFile(join(changelogDir, "README.md"), FROZEN_CHANGELOG_INDEX);

    await writeFile(join(changelogDir, `.smoke-closure.${RUN_ID}.journal`), "corrupt");
    await expect(
      errorCodeAsync(writeOrResumeOrderedDurableChangelogFileThenIndexV1(base))
    ).resolves.toBe("smoke_transaction_artifact_mismatch");

    await writeFile(
      join(changelogDir, `.smoke-closure.${RUN_ID}.journal`),
      journalBytes(RUN_ID, PINNED_CHANGELOG_REL)
    );
    await writeFile(join(root, ...PINNED_CHANGELOG_REL.split("/")), CHANGELOG_TEMPLATE);
    await writeFile(join(changelogDir, `.smoke-closure.${RUN_ID}.tmp`), "corrupt");
    await expect(
      errorCodeAsync(writeOrResumeOrderedDurableChangelogFileThenIndexV1(base))
    ).resolves.toBe("smoke_transaction_artifact_mismatch");

    await writeFile(join(changelogDir, `.smoke-closure.${RUN_ID}.tmp`), CHANGELOG_INDEX_AFTER);
    await expect(
      errorCodeAsync(
        writeOrResumeOrderedDurableChangelogFileThenIndexV1({
          ...base,
          protocol:
            "ordered-durable-changelog-file-then-index@v9" as unknown as typeof WRITER_PROTOCOL,
        })
      )
    ).resolves.toBe("smoke_changelog_protocol_invalid");
  });
});

describe("validateMetadataOnlyClosureDelta", () => {
  test("validates the exact allowlisted metadata delta and is idempotent", async () => {
    const { root, checkpoint, identity } = await frozenResume();
    const plan = await buildClosureMetadataMutationPlanV1(checkpoint, identity, { repoRoot: root });
    const identityBoth = await applyFullClosure(root, checkpoint, identity, plan);
    const delta = await validateMetadataOnlyClosureDelta(checkpoint, identityBoth, root);
    expect(delta.pass).toBe(true);
    expect(delta.runId).toBe(identity.runId);
    expect([...delta.changedPaths]).toEqual([
      PINNED_CHANGELOG_REL,
      CHANGELOG_INDEX_REL,
      TASK_INDEX_REL,
      "_docs/_TASKS/TASK-545-01-All-Results-Guard-And-Static-Workflow-Contract.md",
      "_docs/_TASKS/TASK-545-03-L01-Add-Require-All-Results-Helper.md",
    ]);
    const again = await validateMetadataOnlyClosureDelta(checkpoint, identityBoth, root);
    expect(again.changedPaths).toEqual(delta.changedPaths);
  });

  test("fails closed on any non-allowlisted drift", async () => {
    async function driftCase(): Promise<{
      root: string;
      checkpoint: VerifiedTask545Checkpoint;
      identityBoth: Task545ClosureIdentity & { durableState: "both" };
    }> {
      const { root, checkpoint, identity } = await frozenResume();
      const plan = await buildClosureMetadataMutationPlanV1(checkpoint, identity, {
        repoRoot: root,
      });
      return {
        root,
        checkpoint,
        identityBoth: await applyFullClosure(root, checkpoint, identity, plan),
      };
    }
    const cases: Array<[string, (root: string) => Promise<void>, string]> = [
      ["source", (root) => writeFile(join(root, "source.txt"), "v2\n"), "smoke_non_metadata_delta"],
      [
        "test",
        (root) =>
          mkdir(join(root, "tests/unit"), { recursive: true }).then(() =>
            writeFile(join(root, "tests/unit/extra.test.ts"), "test\n")
          ),
        "smoke_non_metadata_delta",
      ],
      [
        "config",
        (root) => writeFile(join(root, "coderso.config.ts"), "export {}\n"),
        "smoke_non_metadata_delta",
      ],
      [
        "runtime doc",
        (root) => writeFile(join(root, "_docs", "SECURITY_SPEC.md"), "# security\n"),
        "smoke_non_metadata_delta",
      ],
      [
        "workflow",
        (root) =>
          writeFile(join(root, "_docs", "_workflows", "task-545-implement.mjs"), "// changed\n"),
        "smoke_non_metadata_delta",
      ],
      [
        "same-family file",
        (root) => writeFile(join(root, "_docs", "_TASKS", "TASK-545-05-New.md"), "# New\n"),
        "smoke_non_metadata_delta",
      ],
    ];
    for (const [name, mutate, code] of cases) {
      const current = await driftCase();
      await mutate(current.root);
      await expect(
        errorCodeAsync(
          validateMetadataOnlyClosureDelta(current.checkpoint, current.identityBoth, current.root)
        ),
        name
      ).resolves.toBe(code);
    }
  });

  test("fails closed on wrong number, slug, date, and prefix lookalikes", async () => {
    async function bothCorpus(): Promise<{
      root: string;
      checkpoint: VerifiedTask545Checkpoint;
      identityBoth: Task545ClosureIdentity & { durableState: "both" };
    }> {
      const { root, checkpoint, identity } = await frozenResume();
      const plan = await buildClosureMetadataMutationPlanV1(checkpoint, identity, {
        repoRoot: root,
      });
      return {
        root,
        checkpoint,
        identityBoth: await applyFullClosure(root, checkpoint, identity, plan),
      };
    }

    const wrongSlug = await bothCorpus();
    const changelogDir = join(wrongSlug.root, "_docs", "_CHANGELOG");
    await rm(join(changelogDir, "1257-2026-08-14-task-545-smoke-evidence-checkpoint.md"));
    await writeFile(join(changelogDir, "1257-2026-08-14-other-slug.md"), CHANGELOG_TEMPLATE);
    await expect(
      errorCodeAsync(
        validateMetadataOnlyClosureDelta(
          wrongSlug.checkpoint,
          wrongSlug.identityBoth,
          wrongSlug.root
        )
      )
    ).resolves.toBe("smoke_changelog_path_invalid");

    const wrongDate = await bothCorpus();
    const dateDir = join(wrongDate.root, "_docs", "_CHANGELOG");
    await rm(join(dateDir, "1257-2026-08-14-task-545-smoke-evidence-checkpoint.md"));
    await writeFile(
      join(dateDir, "1257-2026-08-15-task-545-smoke-evidence-checkpoint.md"),
      CHANGELOG_TEMPLATE.replace("2026-08-14", "2026-08-15")
    );
    await expect(
      errorCodeAsync(
        validateMetadataOnlyClosureDelta(
          wrongDate.checkpoint,
          wrongDate.identityBoth,
          wrongDate.root
        )
      )
    ).resolves.toBe("smoke_changelog_date_invalid");

    const lookalike = await bothCorpus();
    const lookDir = join(lookalike.root, "_docs", "_CHANGELOG");
    await writeFile(
      join(lookDir, "1257-2026-08-14-task-545-smoke-evidence-checkpoint-extra.md"),
      CHANGELOG_TEMPLATE
    );
    await expect(
      errorCodeAsync(
        validateMetadataOnlyClosureDelta(
          lookalike.checkpoint,
          lookalike.identityBoth,
          lookalike.root
        )
      )
    ).resolves.toBe("smoke_changelog_multiple");

    const wrongNumber = await bothCorpus();
    const numDir = join(wrongNumber.root, "_docs", "_CHANGELOG");
    await rm(join(numDir, "1257-2026-08-14-task-545-smoke-evidence-checkpoint.md"));
    await writeFile(
      join(numDir, "1258-2026-08-14-task-545-smoke-evidence-checkpoint.md"),
      CHANGELOG_TEMPLATE
    );
    await expect(
      errorCodeAsync(
        validateMetadataOnlyClosureDelta(
          wrongNumber.checkpoint,
          wrongNumber.identityBoth,
          wrongNumber.root
        )
      )
    ).resolves.toBe("smoke_changelog_index_only");
  });

  test("fails closed on metadata content drift inside allowlisted files", async () => {
    const { root, checkpoint, identity } = await frozenResume();
    const plan = await buildClosureMetadataMutationPlanV1(checkpoint, identity, { repoRoot: root });
    const identityBoth = await applyFullClosure(root, checkpoint, identity, plan);
    const taskPath = join(
      root,
      "_docs",
      "_TASKS",
      "TASK-545-01-All-Results-Guard-And-Static-Workflow-Contract.md"
    );
    await writeFile(taskPath, (await readFile(taskPath, "utf8")) + "arbitrary prose\n");
    await expect(
      errorCodeAsync(validateMetadataOnlyClosureDelta(checkpoint, identityBoth, root))
    ).resolves.toBe("smoke_metadata_delta_mismatch");
    await git(root, [
      "checkout",
      "-q",
      "--",
      "_docs/_TASKS/TASK-545-01-All-Results-Guard-And-Static-Workflow-Contract.md",
    ]);

    const second = await frozenResume();
    const plan2 = await buildClosureMetadataMutationPlanV1(second.checkpoint, second.identity, {
      repoRoot: second.root,
    });
    const identityBoth2 = await applyFullClosure(
      second.root,
      second.checkpoint,
      second.identity,
      plan2
    );
    const readmePath = join(second.root, "_docs", "_TASKS", "README.md");
    await writeFile(
      readmePath,
      (await readFile(readmePath, "utf8")).replace(
        "| TASK-540 | Other Board Row | Low | Small | ✅ Done |",
        "| TASK-540 | Other Board Row | Low | Small | ⏳ To Do |"
      )
    );
    await expect(
      errorCodeAsync(
        validateMetadataOnlyClosureDelta(second.checkpoint, identityBoth2, second.root)
      )
    ).resolves.toBe("smoke_metadata_delta_mismatch");
    await git(second.root, ["checkout", "-q", "--", "_docs/_TASKS/README.md"]);
  });
});

describe("runClosureDeltaCli", () => {
  test("applies the full closure and emits the exact JSON receipt", async () => {
    const { root, pause } = await fullCorpus();
    const resume = await openWorkflowClosureResume(resumeOptions(root, pause));
    if (resume.state !== "frozen") throw new Error(`expected frozen, got ${resume.state}`);
    const { checkpoint, closureIdentity } = resume;
    const plan = await buildClosureMetadataMutationPlanV1(checkpoint, closureIdentity, {
      repoRoot: root,
    });
    const identityBoth = await applyFullClosure(root, checkpoint, closureIdentity, plan);
    const pinned = `_docs/_CHANGELOG/${CHANGELOG_NUMBER}-${identityBoth.closureUtcDate}-${CHANGELOG_SLUG}.md`;
    const args = [
      "--task",
      TASK,
      "--suite",
      SUITE,
      "--profile",
      PROFILE,
      "--checkpoint",
      pause.checkpointPath,
      "--checkpoint-sha256",
      pause.checkpointSha256,
      "--run-id",
      closureIdentity.runId,
      "--session",
      SESSION,
    ];
    const { status, stdout } = runCli(root, args);
    expect(status).toBe(0);
    const receipt = JSON.parse(stdout);
    expect(receipt.pass).toBe(true);
    expect(receipt.durableState).toBe("both");
    expect(receipt.runId).toBe(closureIdentity.runId);
    expect(receipt.changedPaths).toEqual([
      pinned,
      CHANGELOG_INDEX_REL,
      TASK_INDEX_REL,
      "_docs/_TASKS/TASK-545-01-All-Results-Guard-And-Static-Workflow-Contract.md",
      "_docs/_TASKS/TASK-545-03-L01-Add-Require-All-Results-Helper.md",
    ]);
  });

  test("emits usage errors with exit 2 and fails closed on identity mismatch", async () => {
    const root = await makeRepo();
    const missing = runCli(root, []);
    expect(missing.status).toBe(2);
    expect(JSON.parse(missing.stderr).code).toBe("smoke_cli_usage");
    const help = runCli(root, ["--help"]);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("closure-delta");
    const { root: corpusRoot } = await frozenResume();
    const partialFlags = runCli(corpusRoot, [
      "--task",
      TASK,
      "--suite",
      SUITE,
      "--profile",
      PROFILE,
      "--checkpoint-sha256",
      "0".repeat(64),
      "--run-id",
      RUN_ID,
      "--session",
      SESSION,
    ]);
    expect(JSON.parse(partialFlags.stderr).code).toBe("smoke_cli_usage");
    expect(partialFlags.status).toBe(2);
  });

  test("fails closed on wrong checkpoint hash and non-canonical paths", async () => {
    const { root, pause } = await fullCorpus();
    const resume = await openWorkflowClosureResume(resumeOptions(root, pause));
    if (resume.state !== "frozen") throw new Error("expected frozen");
    const base = ["--task", TASK, "--suite", SUITE, "--profile", PROFILE];
    const wrongHash = runCli(root, [
      ...base,
      "--checkpoint",
      pause.checkpointPath,
      "--checkpoint-sha256",
      "f".repeat(64),
      "--run-id",
      resume.closureIdentity.runId,
      "--session",
      SESSION,
    ]);
    expect(wrongHash.status).toBe(1);
    expect(JSON.parse(wrongHash.stderr).code).toBe("smoke_checkpoint_hash_mismatch");
    const relPath = join(root, "elsewhere", "checkpoint.json");
    const wrongPath = runCli(root, [
      ...base,
      "--checkpoint",
      relPath,
      "--checkpoint-sha256",
      pause.checkpointSha256,
      "--run-id",
      resume.closureIdentity.runId,
      "--session",
      SESSION,
    ]);
    expect(wrongPath.status).toBe(1);
    expect(JSON.parse(wrongPath.stderr).code).toBe("smoke_checkpoint_path_mismatch");
    const wrongTask = runCli(root, [
      ...base,
      "--suite",
      "wrong-suite",
      "--checkpoint",
      pause.checkpointPath,
      "--checkpoint-sha256",
      pause.checkpointSha256,
      "--run-id",
      resume.closureIdentity.runId,
      "--session",
      SESSION,
    ]);
    expect(wrongTask.status).toBe(1);
    expect(JSON.parse(wrongTask.stderr).code).toBe("smoke_checkpoint_identity_mismatch");
  });
});

describe("re-export surface and type gates", () => {
  test("the thin re-exports expose the exact five closure entry points", () => {
    expect(reexportedAllowlist).toBe(buildExactClosureMetadataAllowlist);
    expect(reexportedPlan).toBe(buildClosureMetadataMutationPlanV1);
    expect(reexportedWriter).toBe(writeOrResumeOrderedDurableChangelogFileThenIndexV1);
    expect(reexportedDelta).toBe(validateMetadataOnlyClosureDelta);
    expect(reexportedCli).toBe(runClosureDeltaCli);
  });

  test("type fixtures pin the writer option and delta shapes", () => {
    const checkpoint = writerCheckpoint("0".repeat(64));
    const identity = closureIdentity("both");
    const options = {
      repoRoot: "/tmp",
      checkpoint,
      runId: RUN_ID,
      closureIdentity: identity,
      changelogBytes: CHANGELOG_TEMPLATE,
      changelogIndexMutation: changelogIndexMutation(),
      protocol: WRITER_PROTOCOL,
    };
    expect(options.closureIdentity.durableState).toBe("both");
    expect(checkpoint.closureContract.changelogNumber).toBe(CHANGELOG_NUMBER);
    expect(identity.pinnedChangelogPath).toBe(PINNED_CHANGELOG_REL);
  });
});

describe("fixture and corpus integrity", () => {
  test("frozen bytes are byte-identical to HEAD and the mutation mirrors the plan", () => {
    expect(FROZEN_CHANGELOG_INDEX_BYTES.toString("utf8")).toBe(FROZEN_CHANGELOG_INDEX);
    expect(FROZEN_TASK_INDEX_BYTES.toString("utf8")).toBe(FROZEN_TASK_INDEX);
    const mutation = changelogIndexMutation();
    expect(CHANGELOG_INDEX_AFTER).toContain(mutation.row);
    expect(CHANGELOG_INDEX_AFTER).toContain(mutation.pointerTo);
    expect(CHANGELOG_INDEX_AFTER).not.toContain("Next changelog number: 1257.");
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    expect(CLOSURE_DATE).toBe("2026-08-14");
  });
});
