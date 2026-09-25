// TASK-551-11 author-audit workflow tests (single owner: TASK-551-11 sidecar).
// Lane convention for tests/unit/workflows/* is Bun (`bun test`). These tests
// are fully injected: no real child process, filesystem write, or canonical
// evidence-root access. They write only to unique mkdtemp directories (in the
// grounding fixture below) and never to the repo tree.
import { describe, expect, test } from "bun:test";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  TASK551_RECONCILE_SCOPE,
  deriveTask551AuditScopes,
  evaluateTask551DriftRound,
  normalizeTask551AuditResult,
  planTask551Reaudit,
  preflightTask551AuthorAuditDispatch,
  requireTask551ProductionDispatchTaskSnapshot,
  requireTask551AuthoredScope,
  requireTask551ResearchGrounding,
  requireTask551TestDispatchTaskSnapshotForTests,
  runTask551AuthorAuditWorkflow,
  runTask551AuthorAuditWorkflowForTests,
  runTask551DriftAuditRound,
} from "../../../_docs/_workflows/task-551-author-audit.mjs";
import { runTask551BoundedChild } from "../../../_docs/_workflows/task-551-fix.mjs";
import {
  TASK551_CHILD_FAILURE_CODES,
  TASK551_CHILD_DIAGNOSTIC_MAX_BYTES,
  TASK551_L02_REQUIRED_SUBGATES,
  TASK551_PHASE_IMPORT_CLOSURE,
  TASK551_PHASE_RUNTIME_OUTPUTS,
  TASK551_WORKFLOW_COMPATIBILITY_PREREQUISITE,
  createTask551TaskGraphSnapshot,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const ALL_PHASES = ["sidecar", "l01", "l03", "l04", "l02", "05-l02"] as const;
function fullDiscovery(): Record<string, string[]> {
  const discovered: Record<string, string[]> = {};
  for (const phase of ALL_PHASES) {
    discovered[phase] = [...TASK551_PHASE_IMPORT_CLOSURE.get(phase)!];
  }
  return discovered;
}
type Finding = {
  severity: "HIGH" | "MEDIUM" | "LOW";
  area: string;
  finding: string;
  evidence: string;
};
function completed(findings: Finding[] = []) {
  return { status: "completed" as const, findings };
}
const lowFinding: Finding = {
  severity: "LOW",
  area: "docs",
  finding: "minor wording drift",
  evidence: "_docs/_TASKS/TASK-551.md:42",
};
const highFinding: Finding = {
  severity: "HIGH",
  area: "ownership",
  finding: "two writers own one file",
  evidence: "scripts/task-551-database-baseline.ts:17",
};
// Fake Bun-like spawn API with doc-required parity:
// spawn(argv, opts) -> { pid, stdout, stderr, exited: Promise<number>, signalCode? }
type FakeProc = {
  pid: number;
  stdout: AsyncIterable<Uint8Array>;
  stderr: AsyncIterable<Uint8Array>;
  exited: Promise<number>;
  signalCode?: string | null;
};
type SpawnCall = { argv: string[]; opts: Record<string, unknown> };
function fakeStream(chunks: Uint8Array[]): AsyncIterable<Uint8Array> {
  let index = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<Uint8Array>> {
          if (index < chunks.length) {
            const value = chunks[index++]!;
            return Promise.resolve({ value, done: false });
          }
          return Promise.resolve({ done: true, value: undefined });
        },
      };
    },
  };
}
/** A stream that never yields nor ends: exercises the hard-timeout branch. */
function hangingStream(): AsyncIterable<Uint8Array> {
  return {
    [Symbol.asyncIterator]() {
      return {
        next: () => new Promise<IteratorResult<Uint8Array>>(() => undefined),
      };
    },
  };
}
function makeFakeSpawn(overrides: Partial<FakeProc> = {}) {
  const calls: SpawnCall[] = [];
  const signals: string[] = [];
  const proc: FakeProc = {
    pid: 4321,
    stdout: fakeStream([]),
    stderr: fakeStream([]),
    exited: Promise.resolve(0),
    signalCode: null,
    ...overrides,
  };
  const spawn = (argv: string[], opts: Record<string, unknown>): FakeProc => {
    calls.push({ argv, opts });
    return proc;
  };
  return { spawn, calls, signals };
}
const CHILD_BASE = {
  bunExecutablePath: "/usr/local/bin/bun-real",
  env: { TASK551_FIXTURE_BOOTSTRAP_SENTINEL: "s3nt1n3l" },
  cwd: "/repo",
};
const L03_CHECK_CHILD = Object.freeze({
  commandContextId: "TASK-551-01-L03:single/bootstrap-check",
  logicalCommandId: "l03-check",
  discovery: Object.freeze({ kind: "not-applicable", discoveredTestCount: null, positive: false }),
});
const L03_FOCUSED_CHILD = Object.freeze({
  commandContextId: "TASK-551-01-L03:single/focused-static-test",
  logicalCommandId: "l03-focused-test",
  discovery: Object.freeze({ kind: "test-paths", discoveredTestCount: 1, positive: true }),
});
const L03_INITIALIZE_CHILD = Object.freeze({
  commandContextId: "TASK-551-01-L03:single/bootstrap-initialize",
  logicalCommandId: "l03-initialize",
  discovery: Object.freeze({ kind: "not-applicable", discoveredTestCount: null, positive: false }),
});
const L02_FREEZE_SMALL_CHILD = Object.freeze({
  commandContextId: "TASK-551-01-L02:single/freeze-small",
  logicalCommandId: "l02-freeze",
  discovery: Object.freeze({ kind: "not-applicable", discoveredTestCount: null, positive: false }),
});
async function uniqueTempDir(label: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), `task551-author-audit-${label}-`));
}
async function currentTask551DispatchSnapshot() {
  const taskDirectory = new URL("../../../_docs/_TASKS/", import.meta.url);
  const names = (await readdir(taskDirectory))
    .filter((name) => /^TASK-551(?:[-_].*)?\.md$/u.test(name))
    .sort();
  return {
    sourceHead: "7bc41f75b9de972ce3ee4d794cf5fce14e08c5cb",
    taskFiles: await Promise.all(
      names.map(async (name) => ({
        path: `_docs/_TASKS/${name}`,
        text: await readFile(new URL(name, taskDirectory), "utf8"),
      }))
    ),
  };
}
async function currentTask551TaskSnapshot() {
  const { taskFiles } = await currentTask551DispatchSnapshot();
  const graph = createTask551TaskGraphSnapshot(
    taskFiles.map((file) => ({
      path: file.path,
      sha256: createHash("sha256").update(file.text, "utf8").digest("hex"),
    }))
  );
  return { taskGraphDigest: graph.taskGraphDigest, taskFileDigests: graph.taskFileDigests };
}
function mutateTask551DispatchSnapshot(
  snapshot: Awaited<ReturnType<typeof currentTask551DispatchSnapshot>>,
  suffix: string,
  current: string,
  replacement: string
) {
  let changed = false;
  const taskFiles = snapshot.taskFiles.map((file) => {
    if (!file.path.endsWith(suffix)) return file;
    changed = true;
    return { ...file, text: file.text.replace(current, replacement) };
  });
  if (!changed) throw new Error(`missing task fixture: ${suffix}`);
  return { ...snapshot, taskFiles };
}
async function runFixtureGit(repo: string, args: string[]) {
  await new Promise<void>((resolve, reject) =>
    execFile("git", args, { cwd: repo }, (error) => (error === null ? resolve() : reject(error)))
  );
}
type FixtureGitRuntime = {
  testRepoRoot: string;
  gitCommandTransport: ({
    argv,
    cwd,
  }: {
    argv: readonly string[];
    cwd: string;
  }) => Promise<{ exitCode: number; stdout: Uint8Array; stderr: Uint8Array }>;
};
async function withTask551GitRepo<T>(
  transform: (
    files: Awaited<ReturnType<typeof currentTask551DispatchSnapshot>>["taskFiles"]
  ) => Awaited<ReturnType<typeof currentTask551DispatchSnapshot>>["taskFiles"] = (files) => files,
  afterCommit: ((repo: string) => Promise<void>) | null = null,
  use: (runtime: FixtureGitRuntime) => Promise<T>
) {
  const repo = await uniqueTempDir("git");
  try {
    const files = transform((await currentTask551DispatchSnapshot()).taskFiles);
    for (const file of files) {
      const destination = path.join(repo, file.path);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, file.text);
    }
    // A single committed product path lets the test prove dirty source paths are
    // irrelevant here; every other future phase source deliberately stays absent.
    const productPath = path.join(repo, "scripts/task-551-fixture-target-bootstrap.ts");
    await mkdir(path.dirname(productPath), { recursive: true });
    await writeFile(productPath, "fixture\n");
    await runFixtureGit(repo, ["init", "--quiet"]);
    await runFixtureGit(repo, ["add", "--all"]);
    await runFixtureGit(repo, [
      "-c",
      "user.email=task551@example.invalid",
      "-c",
      "user.name=Task 551",
      "commit",
      "--quiet",
      "-m",
      "fixture",
    ]);
    if (afterCommit !== null) await afterCommit(repo);
    return await use({
      testRepoRoot: repo,
      gitCommandTransport: ({ argv, cwd }) =>
        new Promise((resolve) =>
          execFile(argv[0]!, argv.slice(1), { cwd, encoding: "buffer" }, (error, stdout, stderr) =>
            resolve({
              exitCode: error === null ? 0 : typeof error?.code === "number" ? error.code : 1,
              stdout: Buffer.from(stdout ?? []),
              stderr: Buffer.from(stderr ?? []),
            })
          )
        ),
    });
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
}
// ---------------------------------------------------------------------------
// Research grounding and audit-scope derivation
// ---------------------------------------------------------------------------
describe("research grounding and audit scopes", () => {
  test("audit scope universe equals the sorted union of phase import closures", () => {
    const expected = [...new Set([...TASK551_PHASE_IMPORT_CLOSURE.values()].flat())].sort();
    expect(deriveTask551AuditScopes()).toEqual(expected);
    // runtime outputs stay outside every tracked set
    for (const outputs of TASK551_PHASE_RUNTIME_OUTPUTS.values()) {
      for (const output of outputs) {
        expect(deriveTask551AuditScopes()).not.toContain(output);
      }
    }
  });
  test("grounding accepts the current task-file graph snapshot and exact declared scopes", async () => {
    expect(
      requireTask551ResearchGrounding({
        taskSnapshot: await currentTask551TaskSnapshot(),
        discoveredByPhase: fullDiscovery(),
      })
    ).toBe(true);
  });
  test("grounding rejects a missing per-phase discovery set", async () => {
    const discovered = fullDiscovery();
    const taskSnapshot = await currentTask551TaskSnapshot();
    delete discovered.l03;
    expect(() =>
      requireTask551ResearchGrounding({ taskSnapshot, discoveredByPhase: discovered })
    ).toThrow(/grounding_discovery_missing:l03/);
  });
  test("grounding rejects an extra declared path (exact membership, not substring)", async () => {
    const discovered = fullDiscovery();
    const taskSnapshot = await currentTask551TaskSnapshot();
    discovered.sidecar.push("scripts/extra-task551-file.ts");
    expect(() =>
      requireTask551ResearchGrounding({ taskSnapshot, discoveredByPhase: discovered })
    ).toThrow(/allowlist_mismatch/);
  });
  test("grounding rejects an incomplete current task-file snapshot", async () => {
    const snapshot = await currentTask551TaskSnapshot();
    expect(() =>
      requireTask551ResearchGrounding({
        taskSnapshot: { ...snapshot, taskFileDigests: snapshot.taskFileDigests.slice(1) },
        discoveredByPhase: fullDiscovery(),
      })
    ).toThrow(/grounding_task_snapshot_invalid/);
  });
  test("authored scope must equal the owning phase closed allowlist exactly", () => {
    const owned = TASK551_PHASE_IMPORT_CLOSURE.get("sidecar")!;
    // exact closed-allowlist membership passes for the owning phase
    expect(requireTask551AuthoredScope("sidecar", [...owned])).toBe(true);
    // any foreign or missing path fails closed
    expect(() => requireTask551AuthoredScope("sidecar", ["scripts/rogue.ts"])).toThrow(
      /allowlist_mismatch/
    );
    expect(() => requireTask551AuthoredScope("sidecar", owned.slice(1))).toThrow(
      /allowlist_mismatch/
    );
    expect(() => requireTask551AuthoredScope("nope", [])).toThrow(/phase_unknown/);
  });
  test("test scaffolding writes only inside a unique temp directory", async () => {
    const dir = await uniqueTempDir("scratch");
    const file = path.join(dir, "probe.json");
    await writeFile(file, "{}\n", "utf8");
    expect(file.startsWith(tmpdir())).toBe(true);
  });
  test("author-audit preflight derives the current graph without returning source text", async () => {
    const plan = preflightTask551AuthorAuditDispatch(await currentTask551DispatchSnapshot());
    expect(plan.inventory).toEqual({
      taskFileCount: 41,
      childTaskCount: 11,
      leafTaskCount: 29,
      occurrenceCount: 33,
    });
    expect(plan.dispatchOrder.slice(0, 4).map((entry) => entry.id)).toEqual([
      "TASK-551-01-L01:initial",
      "TASK-551-01-L03:single",
      "TASK-551-01-L04:single",
      "TASK-551-01-L02:single",
    ]);
    expect(plan.dispatchOrder.at(-1)?.id).toBe("TASK-551-10-L02:single");
    expect(new Set(plan.dispatchOrder.map((entry) => entry.id)).size).toBe(33);
    expect(plan.dispatchOrder[1]?.dependsOn).toEqual(["TASK-551-01-L01:initial"]);
    const l02 = plan.dispatchOrder.find((entry) => entry.id === "TASK-551-01-L02:single");
    expect(l02?.workflowPrerequisites).toEqual([TASK551_WORKFLOW_COMPATIBILITY_PREREQUISITE]);
    expect(l02?.subgates).toEqual(TASK551_L02_REQUIRED_SUBGATES);
    expect(Object.isFrozen(l02?.subgates)).toBe(true);
    expect(Object.isFrozen(l02?.subgates[0])).toBe(true);
    expect(Object.isFrozen(l02?.subgates[1])).toBe(true);
    expect(Object.isFrozen(l02?.subgates[0]?.afterCommandIds)).toBe(true);
    expect(Object.isFrozen(l02?.subgates[0]?.barrier)).toBe(true);
    expect(
      plan.dispatchOrder.find((entry) => entry.id === "TASK-551-01-L03:single")?.subgates
    ).toEqual([]);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.dispatchOrder[0]!)).toBe(true);
    expect(JSON.stringify(plan)).not.toContain("Workflow Dispatch Envelope");
    const [authorAudit, facade] = await Promise.all([
      readFile(
        new URL("../../../_docs/_workflows/task-551-author-audit.mjs", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL("../../../_docs/_workflows/lib/task-551-contract.mjs", import.meta.url),
        "utf8"
      ),
    ]);
    expect(authorAudit).toMatch(/from "\.\/lib\/task-551-dispatch-contract\.mjs"/);
    expect(facade).not.toMatch(/from "\.\/task-551-dispatch-contract\.mjs"/);
  });
  test("author-audit preflight rejects duplicate JSON keys and cross-owner allowlists", async () => {
    const snapshot = await currentTask551DispatchSnapshot();
    const duplicate = mutateTask551DispatchSnapshot(
      snapshot,
      "TASK-551-01-L03-Isolated-Fixture-Target-Bootstrap.md",
      '"taskId": "TASK-551-01-L03",',
      '"taskId": "TASK-551-01-L03",\n  "taskId": "TASK-551-01-L03",'
    );
    expect(() => preflightTask551AuthorAuditDispatch(duplicate)).toThrow(/duplicate_or_magic_key/);
    const graphDuplicate = mutateTask551DispatchSnapshot(
      snapshot,
      "TASK-551_Scalable_Database_Query_And_Cache_Optimization.md",
      '"version": 1,',
      '"version": 1,\n  "version": 1,'
    );
    expect(() => preflightTask551AuthorAuditDispatch(graphDuplicate)).toThrow(
      /duplicate_or_magic_key/
    );
    const unknown = mutateTask551DispatchSnapshot(
      snapshot,
      "TASK-551-01-L03-Isolated-Fixture-Target-Bootstrap.md",
      '"schema": "coderso.task551.workflow-dispatch@v1",',
      '"schema": "coderso.task551.workflow-dispatch@v1",\n  "rogue": true,'
    );
    expect(() => preflightTask551AuthorAuditDispatch(unknown)).toThrow(/envelope_keys/);
    const l03File = snapshot.taskFiles.find((file) =>
      file.path.endsWith("TASK-551-01-L03-Isolated-Fixture-Target-Bootstrap.md")
    )!;
    const escapedFence = l03File.text
      .match(/```json\n[\s\S]*?\n```/u)![0]
      .replace(
        "coderso.task551.workflow-dispatch@v1",
        "coderso.task551.workflow-dispatch\\u0040v1"
      );
    expect(() =>
      preflightTask551AuthorAuditDispatch({
        ...snapshot,
        taskFiles: snapshot.taskFiles.map((file) =>
          file === l03File ? { ...file, text: `${file.text}\n${escapedFence}` } : file
        ),
      })
    ).toThrow(/dispatch_leaf_envelope/);
    expect(() =>
      preflightTask551AuthorAuditDispatch(
        mutateTask551DispatchSnapshot(
          snapshot,
          "TASK-551_Scalable_Database_Query_And_Cache_Optimization.md",
          "workflow-dispatch-graph@v1",
          "workflow-dispatch-graph@v2"
        )
      )
    ).toThrow(/json_schema_unsupported/);
    expect(() =>
      preflightTask551AuthorAuditDispatch(
        mutateTask551DispatchSnapshot(
          snapshot,
          "TASK-551-01-L03-Isolated-Fixture-Target-Bootstrap.md",
          "workflow-dispatch@v1",
          "workflow-dispatch@v2"
        )
      )
    ).toThrow(/json_schema_unsupported/);
    expect(() =>
      preflightTask551AuthorAuditDispatch(
        mutateTask551DispatchSnapshot(
          snapshot,
          "TASK-551-01-L03-Isolated-Fixture-Target-Bootstrap.md",
          "# TASK-551-01-L03:",
          "# TASK-551-01-L02:"
        )
      )
    ).toThrow(/metadata_mismatch/);
    const collision = mutateTask551DispatchSnapshot(
      snapshot,
      "TASK-551-01-L03-Isolated-Fixture-Target-Bootstrap.md",
      '"scripts/task-551-fixture-target-bootstrap.ts",',
      '"scripts/task551QueryInventory/bunLane.ts",'
    );
    expect(() => preflightTask551AuthorAuditDispatch(collision)).toThrow(/allowlist_cross_owner/);
    const alteredSubgate = mutateTask551DispatchSnapshot(
      snapshot,
      "TASK-551-01-L02-Small-Large-Fixtures-Baselines-And-Budgets.md",
      '"beforeCommandId": "core-lint-types"',
      '"beforeCommandId": "core-lint"'
    );
    expect(() => preflightTask551AuthorAuditDispatch(alteredSubgate)).toThrow(
      /envelope_subgate_boundary/
    );
    const rewiredGraph = mutateTask551DispatchSnapshot(
      snapshot,
      "TASK-551_Scalable_Database_Query_And_Cache_Optimization.md",
      '"dependsOn": ["TASK-551-01-L03:single"]',
      '"dependsOn": ["TASK-551-01-L01:initial"]'
    );
    const rewiredSnapshot = {
      ...rewiredGraph,
      taskFiles: rewiredGraph.taskFiles.map((file) =>
        file.path.endsWith(
          "TASK-551-01-L04-Archive-Preserving-Freeze-Candidate-Generation-Bootstrap.md"
        )
          ? {
              ...file,
              text: file.text.replaceAll("TASK-551-01-L03:single", "TASK-551-01-L01:initial"),
            }
          : file
      ),
    };
    expect(
      preflightTask551AuthorAuditDispatch(rewiredSnapshot).dispatchOrder.find(
        (entry) => entry.id === "TASK-551-01-L04:single"
      )?.dependsOn
    ).toEqual(["TASK-551-01-L01:initial"]);
    expect(() => preflightTask551AuthorAuditDispatch(rewiredGraph)).toThrow(
      /envelope_dependencies/
    );
    const invalidOccurrenceGroup = {
      ...snapshot,
      taskFiles: snapshot.taskFiles.map((file) =>
        file.path.endsWith("TASK-551_Scalable_Database_Query_And_Cache_Optimization.md")
          ? {
              ...file,
              text: file.text
                .replaceAll("TASK-551-01-L01:initial", "TASK-551-01-L01:single")
                .replace('"occurrenceId": "initial"', '"occurrenceId": "single"'),
            }
          : file
      ),
    };
    expect(() => preflightTask551AuthorAuditDispatch(invalidOccurrenceGroup)).toThrow(
      /graph_occurrence_group/
    );
    const missingLeaf = {
      ...snapshot,
      taskFiles: snapshot.taskFiles.filter(
        (file) =>
          !file.path.endsWith("TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md")
      ),
    };
    expect(() => preflightTask551AuthorAuditDispatch(missingLeaf)).toThrow(
      /graph_envelope_task_set/
    );
  });
});
// ---------------------------------------------------------------------------
// Clean-round rule
// ---------------------------------------------------------------------------
describe("clean-round rule", () => {
  const SCOPES = ["a.ts", "b.ts"];
  test("all complete results with only LOW findings pass", () => {
    const evaluation = evaluateTask551DriftRound(
      [...SCOPES, TASK551_RECONCILE_SCOPE],
      [
        { scope: "a.ts", ...completed([lowFinding]) },
        { scope: "b.ts", ...completed() },
        { scope: TASK551_RECONCILE_SCOPE, ...completed() },
      ]
    );
    expect(evaluation.valid).toBe(true);
    expect(evaluation.pass).toBe(true);
    expect(evaluation.blockingFindings).toEqual([]);
  });
  test("a missing result makes the round invalid (false-clean)", () => {
    const evaluation = evaluateTask551DriftRound(
      [...SCOPES, TASK551_RECONCILE_SCOPE],
      [
        { scope: "a.ts", ...completed() },
        { scope: TASK551_RECONCILE_SCOPE, ...completed() },
      ]
    );
    expect(evaluation.valid).toBe(false);
    expect(evaluation.pass).toBe(false);
    expect(evaluation.missingScopes).toEqual(["b.ts"]);
  });
  test("a timed-out agent invalidates the round even with zero findings", () => {
    const evaluation = evaluateTask551DriftRound(
      [...SCOPES, TASK551_RECONCILE_SCOPE],
      [
        { scope: "a.ts", status: "timeout", findings: [] },
        { scope: "b.ts", ...completed() },
        { scope: TASK551_RECONCILE_SCOPE, ...completed() },
      ]
    );
    expect(evaluation.valid).toBe(false);
    expect(evaluation.pass).toBe(false);
    expect(evaluation.invalidScopes).toEqual(["a.ts:timeout"]);
  });
  test("HIGH and MEDIUM findings block; LOW does not", () => {
    for (const severity of ["HIGH", "MEDIUM"] as const) {
      const evaluation = evaluateTask551DriftRound(
        ["a.ts", TASK551_RECONCILE_SCOPE],
        [
          { scope: "a.ts", ...completed([{ ...lowFinding, severity }]) },
          { scope: TASK551_RECONCILE_SCOPE, ...completed() },
        ]
      );
      expect(evaluation.valid).toBe(true);
      expect(evaluation.pass).toBe(false);
      expect(evaluation.blockingFindings[0]!.severity).toBe(severity);
    }
  });
  test("malformed payloads normalize to malformed, never silently pass", () => {
    expect(normalizeTask551AuditResult(null, "x").status).toBe("malformed");
    expect(normalizeTask551AuditResult({ status: "completed" }, "x").status).toBe("malformed");
    expect(normalizeTask551AuditResult({ status: "completed", findings: [{}] }, "x").status).toBe(
      "malformed"
    );
    expect(
      normalizeTask551AuditResult(
        { status: "completed", findings: [{ ...lowFinding, evidence: "no line ref" }] },
        "x"
      ).status
    ).toBe("malformed");
    expect(
      normalizeTask551AuditResult(
        { status: "completed", findings: [{ ...lowFinding, severity: "CRITICAL" }] },
        "x"
      ).status
    ).toBe("malformed");
  });
  test("audit payloads reject inherited and rogue fields", () => {
    const inherited = Object.create({ status: "completed" });
    inherited.findings = [];
    expect(normalizeTask551AuditResult(inherited, "x").status).toBe("malformed");
    expect(
      normalizeTask551AuditResult({ status: "completed", findings: [], rogue: 1 }, "x").status
    ).toBe("malformed");
    const finding = Object.create({ evidence: "x.ts:1" });
    finding.severity = "LOW";
    finding.area = "docs";
    finding.finding = "drift";
    expect(
      normalizeTask551AuditResult({ status: "completed", findings: [finding] }, "x").status
    ).toBe("malformed");
  });
  test("author-audit maxRounds is finite, integral, and capped", async () => {
    for (const maxRounds of [0, 4, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(runTask551AuthorAuditWorkflow({ maxRounds })).rejects.toThrow(
        /author_audit_max_rounds_invalid/
      );
    }
  });
});
// ---------------------------------------------------------------------------
// Targeted re-audit planning
// ---------------------------------------------------------------------------
describe("targeted re-audit planning", () => {
  test("verified HIGH finding reruns only affected + changed scopes plus fresh reconcile", () => {
    const evaluation = evaluateTask551DriftRound(
      ["a.ts", "b.ts", TASK551_RECONCILE_SCOPE],
      [
        { scope: "a.ts", ...completed([highFinding]) },
        { scope: "b.ts", ...completed() },
        { scope: TASK551_RECONCILE_SCOPE, ...completed() },
      ]
    );
    const plan = planTask551Reaudit(evaluation, ["c.ts"]);
    expect(plan.requireFreshReconcile).toBe(true);
    expect(plan.rerunScopes).toEqual([TASK551_RECONCILE_SCOPE, "a.ts", "c.ts"].sort());
    // clean receipt b.ts is NOT replayed
    expect(plan.rerunScopes).not.toContain("b.ts");
  });
  test("a passing round plans no re-audit", () => {
    const evaluation = evaluateTask551DriftRound(
      ["a.ts", TASK551_RECONCILE_SCOPE],
      [
        { scope: "a.ts", ...completed([lowFinding]) },
        { scope: TASK551_RECONCILE_SCOPE, ...completed() },
      ]
    );
    expect(planTask551Reaudit(evaluation)).toEqual({
      rerunScopes: [],
      requireFreshReconcile: false,
    });
  });
});
// ---------------------------------------------------------------------------
// Orchestrated drift rounds over injected agents
// ---------------------------------------------------------------------------
describe("drift-round orchestration", () => {
  const SCOPES = deriveTask551AuditScopes();
  test("one complete clean round passes with a reconcile result", async () => {
    const auditAgent = (_scope: string) => ({
      status: "completed" as const,
      findings: [] as const,
    });
    const reconcileAgent = (_results: readonly unknown[]) => ({
      status: "completed" as const,
      findings: [] as const,
    });
    const evaluation = await runTask551DriftAuditRound({
      scopes: SCOPES.slice(0, 5),
      auditAgent,
      reconcileAgent,
      timeoutMs: 1_000,
    });
    expect(evaluation.valid).toBe(true);
    expect(evaluation.pass).toBe(true);
    expect(evaluation.missingScopes).toEqual([]);
  });
  test("a throwing audit agent becomes a captured error result, round invalid", async () => {
    const auditAgent = (scope: string) => {
      if (scope === SCOPES[0]) throw new Error("agent crashed");
      return { status: "completed" as const, findings: [] as const };
    };
    const evaluation = await runTask551DriftAuditRound({
      scopes: SCOPES.slice(0, 3),
      auditAgent,
      reconcileAgent: () => ({ status: "completed" as const, findings: [] as const }),
      timeoutMs: 1_000,
    });
    expect(evaluation.valid).toBe(false);
    expect(evaluation.pass).toBe(false);
    expect(evaluation.invalidScopes).toContain(`${SCOPES[0]}:error`);
  });
  test("reconcile receives an immutable snapshot, not mutable agent result objects", async () => {
    let snapshot: unknown;
    const evaluation = await runTask551DriftAuditRound({
      scopes: SCOPES.slice(0, 2),
      auditAgent: (scope) => ({
        status: "completed" as const,
        findings: scope === SCOPES[0] ? [lowFinding] : [],
      }),
      reconcileAgent: (results) => {
        snapshot = results;
        expect(Object.isFrozen(results)).toBe(true);
        expect(Object.isFrozen(results[0])).toBe(true);
        expect(Object.isFrozen(results[0]!.findings)).toBe(true);
        expect(() => Array.prototype.push.call(results, {})).toThrow();
        expect(() => Array.prototype.push.call(results[0]!.findings, {})).toThrow();
        return { status: "completed" as const, findings: [] as const };
      },
      timeoutMs: 1_000,
    });
    expect(evaluation.pass).toBe(true);
    expect(snapshot).toBeDefined();
  });
  test("an agent exceeding the bounded timeout is captured as timeout, not a pass", async () => {
    const slowAgent = (): Promise<{ status: "completed"; findings: readonly Finding[] }> =>
      new Promise(() => setTimeout(() => undefined, 250));
    const evaluation = await runTask551DriftAuditRound({
      scopes: [SCOPES[0]],
      auditAgent: slowAgent,
      reconcileAgent: () => ({ status: "completed" as const, findings: [] as const }),
      timeoutMs: 20,
    });
    expect(evaluation.valid).toBe(false);
    expect(evaluation.invalidScopes).toEqual([`${SCOPES[0]}:timeout`]);
  });
  test("workflow rejects caller-supplied authority and returns no task source", async () => {
    let calls = 0;
    const agents = {
      discoveredByPhase: fullDiscovery(),
      auditAgent: () => {
        calls += 1;
        return completed();
      },
      reconcileAgent: () => {
        calls += 1;
        return completed();
      },
    };
    await expect(runTask551AuthorAuditWorkflow({ ...agents, head: {} })).rejects.toThrow(
      /snapshot_authority_forbidden/
    );
    await expect(
      runTask551AuthorAuditWorkflow({
        ...agents,
        taskSnapshot: await currentTask551DispatchSnapshot(),
      })
    ).rejects.toThrow(/snapshot_authority_forbidden/);
    await expect(
      runTask551AuthorAuditWorkflow({ ...agents, gitCommandTransport: async () => ({}) })
    ).rejects.toThrow(/input_unknown_key/);
    expect(calls).toBe(0);
    await withTask551GitRepo(undefined, null, async (fixture) => {
      const outcome = await runTask551AuthorAuditWorkflowForTests({ ...agents, ...fixture });
      expect(outcome.pass).toBe(true);
      expect(outcome.dispatch.inventory.occurrenceCount).toBe(33);
      expect(JSON.stringify(outcome.dispatch)).not.toContain("Workflow Dispatch Envelope");
    });
  });
  test("permit-bound task snapshots are copied, realm-bound, source-free, and stale-safe", async () => {
    await withTask551GitRepo(undefined, null, async (fixture) => {
      const agents = {
        discoveredByPhase: fullDiscovery(),
        auditAgent: () => completed(),
        reconcileAgent: () => completed(),
        ...fixture,
      };
      const first = await runTask551AuthorAuditWorkflowForTests(agents);
      expect(first.pass).toBe(true);

      const snapshot = requireTask551TestDispatchTaskSnapshotForTests(first.dispatch);
      const expected = {
        taskGraphDigest: snapshot.taskGraphDigest,
        taskFileDigests: snapshot.taskFileDigests.map(({ path: taskPath, sha256 }) => ({
          path: taskPath,
          sha256,
        })),
      };
      expect(createTask551TaskGraphSnapshot(snapshot.taskFileDigests).taskGraphDigest).toBe(
        snapshot.taskGraphDigest
      );
      expect(snapshot.taskFileDigests.map(({ path: taskPath }) => taskPath)).toEqual(
        first.dispatch.taskFiles.map(({ path: taskPath }) => taskPath).sort()
      );
      expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
      expect(Object.keys(snapshot).sort()).toEqual(["taskFileDigests", "taskGraphDigest"]);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.taskFileDigests)).toBe(true);
      expect(Object.isFrozen(snapshot.taskFileDigests[0]!)).toBe(true);
      expect(JSON.stringify(snapshot)).not.toContain("Workflow Dispatch Envelope");
      expect(JSON.stringify(snapshot)).not.toContain("coderso.task551.workflow-dispatch");
      expect(() =>
        Object.defineProperty(snapshot, "taskGraphDigest", { value: "0".repeat(64) })
      ).toThrow();
      expect(() =>
        Object.defineProperty(snapshot.taskFileDigests[0]!, "sha256", { value: "0".repeat(64) })
      ).toThrow();
      expect(requireTask551TestDispatchTaskSnapshotForTests(first.dispatch)).toEqual(expected);

      expect(() => requireTask551TestDispatchTaskSnapshotForTests(Object.freeze({}))).toThrow(
        /test_author_audit_task_snapshot_untrusted/
      );
      expect(() => requireTask551ProductionDispatchTaskSnapshot(first.dispatch)).toThrow(
        /author_audit_task_snapshot_untrusted/
      );

      const second = await runTask551AuthorAuditWorkflowForTests(agents);
      expect(second.pass).toBe(true);
      expect(() => requireTask551TestDispatchTaskSnapshotForTests(first.dispatch)).toThrow(
        /test_author_audit_task_snapshot_untrusted_stale/
      );
      expect(requireTask551TestDispatchTaskSnapshotForTests(second.dispatch)).toEqual(expected);
    });
  });
  test("test runtime uses its fixture root; sourceHead is parser compatibility only", async () => {
    await withTask551GitRepo(undefined, null, async (fixture) => {
      const calls: Array<{ argv: readonly string[]; env: Record<string, string>; shell: boolean }> =
        [];
      const compatibleHead = "a".repeat(40);
      const outcome = await runTask551AuthorAuditWorkflowForTests({
        discoveredByPhase: fullDiscovery(),
        auditAgent: () => completed(),
        reconcileAgent: () => completed(),
        gitCommandTransport: async (request) => {
          calls.push(request);
          if (request.argv.includes("HEAD^{commit}")) {
            return {
              exitCode: 0,
              stdout: Buffer.from(`${compatibleHead}\n`),
              stderr: Buffer.alloc(0),
            };
          }
          return fixture.gitCommandTransport(request);
        },
        testRepoRoot: fixture.testRepoRoot,
      });
      expect(outcome.pass).toBe(true);
      expect(outcome.dispatch.sourceHead).toBe(compatibleHead);
      expect(calls.length).toBe(2);
      for (const call of calls) {
        expect(path.isAbsolute(call.argv[0]!)).toBe(true);
        expect(call.argv.slice(1, 8)).toEqual([
          "--no-pager",
          "-c",
          "core.pager=cat",
          "-c",
          "credential.helper=",
          "-c",
          "core.askPass=",
        ]);
        expect(call.shell).toBe(false);
        expect(Object.getPrototypeOf(call.env)).toBe(null);
        expect(Object.keys(call.env).sort()).toEqual(
          [
            "GIT_ASKPASS",
            "GIT_CONFIG_COUNT",
            "GIT_CONFIG_GLOBAL",
            "GIT_CONFIG_NOSYSTEM",
            "GIT_CONFIG_SYSTEM",
            "GIT_PAGER",
            "GIT_TERMINAL_PROMPT",
            "HOME",
            "LANG",
            "LC_ALL",
            "PAGER",
          ].sort()
        );
        expect(Object.hasOwn(call.env, "PATH")).toBe(false);
        expect(Object.hasOwn(call.env, "GIT_DIR")).toBe(false);
      }
      expect(
        calls.some((call) => call.argv.includes("cat-file") || call.argv.includes("status"))
      ).toBe(false);
    });
  });
  test("capture rejects a changed reported fixture root before agents", async () => {
    const agents = () => {
      throw new Error("agent must not run");
    };
    await withTask551GitRepo(undefined, null, async (fixture) => {
      await expect(
        runTask551AuthorAuditWorkflowForTests({
          discoveredByPhase: fullDiscovery(),
          auditAgent: agents,
          reconcileAgent: agents,
          gitCommandTransport: async (request) => {
            if (request.argv.includes("--show-toplevel")) {
              return {
                exitCode: 0,
                stdout: Buffer.from("/unexpected-root\n"),
                stderr: Buffer.alloc(0),
              };
            }
            return fixture.gitCommandTransport(request);
          },
          testRepoRoot: fixture.testRepoRoot,
        })
      ).rejects.toThrow(/capture_root_mismatch/);
    });
  });
  test("capture accepts current task bytes while product paths may be dirty or untracked", async () => {
    await withTask551GitRepo(
      undefined,
      async (repo) => {
        const parentPath = path.join(
          repo,
          "_docs/_TASKS/TASK-551_Scalable_Database_Query_And_Cache_Optimization.md"
        );
        const parent = await readFile(parentPath, "utf8");
        await writeFile(
          parentPath,
          parent.replace("**Status:** ⏳ To Do", "**Status:** 🚧 In Progress")
        );
        await writeFile(
          path.join(repo, "scripts/task-551-fixture-target-bootstrap.ts"),
          "dirty fixture\n"
        );
        await writeFile(
          path.join(repo, "scripts/untracked-product-source.ts"),
          "untracked fixture\n"
        );
      },
      async (fixture) => {
        const outcome = await runTask551AuthorAuditWorkflowForTests({
          discoveredByPhase: fullDiscovery(),
          auditAgent: () => completed(),
          reconcileAgent: () => completed(),
          ...fixture,
        });
        expect(outcome.pass).toBe(true);
        expect(outcome.dispatch.taskFiles.find((file) => file.taskId === "TASK-551")?.status).toBe(
          "🚧 In Progress"
        );
      }
    );
  });
  test("capture fails closed on a missing, symlinked, or post-capture-drifted task file", async () => {
    const missingPath = "_docs/_TASKS/TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md";
    const taskFile = (repo: string) => path.join(repo, missingPath);
    const input = (
      fixture: FixtureGitRuntime,
      auditAgent: (
        scope: string
      ) => ReturnType<typeof completed> | Promise<ReturnType<typeof completed>> = () => completed()
    ) =>
      runTask551AuthorAuditWorkflowForTests({
        discoveredByPhase: fullDiscovery(),
        auditAgent,
        reconcileAgent: () => completed(),
        ...fixture,
      });
    await withTask551GitRepo(
      undefined,
      async (repo) => rm(taskFile(repo)),
      async (fixture) => {
        await expect(input(fixture)).rejects.toThrow(/graph_envelope_task_set/);
      }
    );
    await withTask551GitRepo(
      undefined,
      async (repo) => {
        await rm(taskFile(repo));
        await symlink("TASK-551_Scalable_Database_Query_And_Cache_Optimization.md", taskFile(repo));
      },
      async (fixture) => {
        await expect(input(fixture)).rejects.toThrow(/capture_task_file_not_regular/);
      }
    );
    let mutated = false;
    await withTask551GitRepo(undefined, null, async (fixture) => {
      await expect(
        input(fixture, async () => {
          if (!mutated) {
            mutated = true;
            const file = taskFile(fixture.testRepoRoot);
            await writeFile(file, `${await readFile(file, "utf8")}\n`);
          }
          return completed();
        })
      ).rejects.toThrow(/task551_task_graph_byte_drift/);
    });
    expect(mutated).toBe(true);
  });
  test("workflow loop: HIGH in round one, targeted re-audit passes in round two", async () => {
    await withTask551GitRepo(undefined, null, async (fixture) => {
      const failingScope = SCOPES[3];
      const seenScopes = new Map<string, number>();
      const outcome = await runTask551AuthorAuditWorkflowForTests({
        discoveredByPhase: fullDiscovery(),
        ...fixture,
        auditAgent: (scope) => ({
          status: "completed",
          findings:
            scope === failingScope &&
            (seenScopes.set(scope, (seenScopes.get(scope) ?? 0) + 1), seenScopes.get(scope) === 1)
              ? [highFinding]
              : [],
        }),
        reconcileAgent: () => completed(),
        timeoutMs: 1_000,
        maxRounds: 3,
      });
      expect(outcome.rounds).toBe(2);
      expect(outcome.pass).toBe(true);
      expect(outcome.dispatch.inventory.occurrenceCount).toBe(33);
      expect(Object.isFrozen(outcome.dispatch)).toBe(true);
    });
  });
  test("workflow fails closed when a blocking finding persists to maxRounds", async () => {
    await withTask551GitRepo(undefined, null, async (fixture) => {
      const outcome = await runTask551AuthorAuditWorkflowForTests({
        discoveredByPhase: fullDiscovery(),
        ...fixture,
        auditAgent: () => completed([highFinding]),
        reconcileAgent: () => completed(),
        timeoutMs: 1_000,
        maxRounds: 2,
      });
      expect(outcome.pass).toBe(false);
      expect(outcome.evaluation?.blockingFindings.length).toBeGreaterThan(0);
    });
  });
});
// ---------------------------------------------------------------------------
// Bounded child execution with injected fake Bun APIs
// ---------------------------------------------------------------------------
type DiagnosticCarrier = Error & { task551Diagnostic?: Record<string, unknown> };
function patchProcessKill(impl: (pid: number, signal?: string) => boolean): () => void {
  const original = process.kill;
  (process as unknown as { kill: typeof impl }).kill = impl;
  return () => {
    (process as unknown as { kill: unknown }).kill = original;
  };
}
describe("bounded child execution", () => {
  test("zero exit passes and replaces ONLY the leading literal bun token", async () => {
    const fake = makeFakeSpawn();
    const result = await runTask551BoundedChild({
      ...CHILD_BASE,
      ...L03_CHECK_CHILD,
      spawn: fake.spawn,
    });
    expect(result.status).toBe("passed");
    expect(result.result).toBe("zero_exit");
    expect(result.exitCode).toBe(0);
    expect(fake.calls.length).toBe(1);
    expect(fake.calls[0]!.argv[0]).toBe("/usr/local/bin/bun-real");
    expect(fake.calls[0]!.argv.slice(1)).toEqual([
      "--env-file=/dev/null",
      "scripts/task-551-fixture-target-bootstrap.ts",
      "--check",
    ]);
    expect(fake.calls[0]!.opts.env).toEqual(CHILD_BASE.env);
    expect(fake.calls[0]!.opts.stdin).toBe("ignore");
    // The detached option is pinned exactly per platform so POSIX children
    // always form their own process group.
    expect(fake.calls[0]!.opts.detached).toBe(process.platform !== "win32");
    // Successful runs are never killed.
    expect(result.killStrategy).toBe("none");
  });
  test("normal nonzero exit returns failed without killing the child", async () => {
    const fake = makeFakeSpawn({ exited: Promise.resolve(3) });
    const result = await runTask551BoundedChild({
      ...CHILD_BASE,
      ...L03_FOCUSED_CHILD,
      spawn: fake.spawn,
    });
    expect(result.status).toBe("failed");
    expect(result.result).toBe("nonzero_exit");
    expect(result.exitCode).toBe(3);
  });
  test("unknown context, command mismatch, and profile misuse fail before any spawn", async () => {
    const fake = makeFakeSpawn();
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        ...L03_CHECK_CHILD,
        commandContextId: "made-up-command",
        spawn: fake.spawn,
      })
    ).rejects.toThrow(/command_context_unknown/);
    await expect(
      runTask551BoundedChild({ ...CHILD_BASE, ...L02_FREEZE_SMALL_CHILD, spawn: fake.spawn })
    ).rejects.toThrow(/command_profile_missing/);
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        ...L03_INITIALIZE_CHILD,
        profile: "small",
        spawn: fake.spawn,
      })
    ).rejects.toThrow(/command_profile_not_allowed/);
    expect(fake.calls.length).toBe(0);
  });
  test("relative bun executable or non-string env fails closed before spawn", async () => {
    const fake = makeFakeSpawn();
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        bunExecutablePath: "bun",
        ...L03_CHECK_CHILD,
        spawn: fake.spawn,
      })
    ).rejects.toThrow(/bun_executable_not_absolute/);
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        env: { KEY: 42 as unknown as string },
        ...L03_CHECK_CHILD,
        spawn: fake.spawn,
      })
    ).rejects.toThrow(/env_value_not_string/);
    expect(fake.calls.length).toBe(0);
  });
  test("output overflow throws the fixed overflow code and SIGTERMs the process group", async () => {
    const bigChunk = new Uint8Array(64 * 1024);
    const fake = makeFakeSpawn({ stdout: fakeStream([bigChunk, bigChunk, bigChunk]) });
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        ...L03_CHECK_CHILD,
        spawn: fake.spawn,
        maxOutputBytes: 64 * 1024,
      })
    ).rejects.toThrow(TASK551_CHILD_FAILURE_CODES.overflow);
  });
  test("overflow teardown pins killStrategy process_group and attaches a capped redacted diagnostic", async () => {
    const filler = new TextEncoder().encode(`${"A".repeat(120)}\n`);
    const secretLine = "API_TOKEN=supersecretvalue must not survive\n";
    const maskedLine = "ATTEMPT=9\n";
    const lastChunk = new TextEncoder().encode(`${"B".repeat(40)}\n${secretLine}${maskedLine}`);
    const fake = makeFakeSpawn({
      stdout: fakeStream([filler, filler, lastChunk]),
      stderr: fakeStream([lastChunk]),
    });
    let thrown: DiagnosticCarrier | undefined;
    const restoreKill = patchProcessKill(() => true); // negative-pid group kill succeeds
    try {
      thrown = (await runTask551BoundedChild({
        ...CHILD_BASE,
        ...L03_CHECK_CHILD,
        spawn: fake.spawn,
        maxOutputBytes: 200,
      }).catch((error: DiagnosticCarrier) => error)) as DiagnosticCarrier;
    } finally {
      restoreKill();
    }
    expect(thrown!.message).toBe(TASK551_CHILD_FAILURE_CODES.overflow);
    expect(thrown!.task551Diagnostic).toBeDefined();
    const diagnostic = thrown!.task551Diagnostic!;
    expect(diagnostic.code).toBe(TASK551_CHILD_FAILURE_CODES.overflow);
    // Exercised teardown path asserted EXACTLY: SIGTERM group kill succeeded.
    expect(diagnostic.killStrategy).toBe("process_group");
    const serialized = JSON.stringify(diagnostic);
    expect(Buffer.byteLength(serialized)).toBeLessThanOrEqual(TASK551_CHILD_DIAGNOSTIC_MAX_BYTES);
    // Credential-looking lines never survive into the diagnostic payload.
    expect(serialized).not.toContain("supersecretvalue");
    // Env-style assignments that do survive are masked.
    expect(String(diagnostic.stderrTail)).toContain("ATTEMPT=[redacted]");
  });
  test("a hanging child hits the hard timeout and is killed via the process group", async () => {
    const fake = makeFakeSpawn({ exited: new Promise<number>(() => undefined) });
    await expect(
      runTask551BoundedChild({
        ...CHILD_BASE,
        ...L03_CHECK_CHILD,
        spawn: fake.spawn,
        timeoutMs: 30,
        killGraceMs: 20,
      })
    ).rejects.toThrow(TASK551_CHILD_FAILURE_CODES.timeout);
  });
  test("timeout teardown pins the exact killStrategy per exercised path", async () => {
    const cases: Array<{
      name: string;
      impl: (pid: number, signal?: string) => boolean;
      expected: string;
    }> = [
      { name: "process_group", impl: () => true, expected: "process_group" },
      {
        name: "root_pid_fallback",
        impl: (pid) => {
          if (pid < 0) throw new Error("ESRCH");
          return true;
        },
        expected: "root_pid_fallback",
      },
      {
        name: "already_gone",
        impl: () => {
          throw new Error("ESRCH");
        },
        expected: "already_gone",
      },
    ];
    for (const testCase of cases) {
      const fake = makeFakeSpawn({
        stdout: hangingStream(),
        stderr: hangingStream(),
        exited: new Promise<number>(() => undefined),
      });
      let thrown: DiagnosticCarrier | undefined;
      const restoreKill = patchProcessKill(testCase.impl);
      try {
        thrown = (await runTask551BoundedChild({
          ...CHILD_BASE,
          ...L03_CHECK_CHILD,
          spawn: fake.spawn,
          timeoutMs: 30,
          killGraceMs: 20,
        }).catch((error: DiagnosticCarrier) => error)) as DiagnosticCarrier;
      } finally {
        restoreKill();
      }
      expect(thrown!.message).toBe(TASK551_CHILD_FAILURE_CODES.timeout);
      const diagnostic = thrown!.task551Diagnostic!;
      expect(diagnostic.code).toBe(TASK551_CHILD_FAILURE_CODES.timeout);
      // Hard-timeout branch (streams never ended), not the exit-await branch.
      expect(diagnostic.phase).toBe("timeout");
      expect(diagnostic.killStrategy).toBe(testCase.expected);
      expect(Buffer.byteLength(JSON.stringify(diagnostic))).toBeLessThanOrEqual(
        TASK551_CHILD_DIAGNOSTIC_MAX_BYTES
      );
    }
    // taskkill_tree is win32-only and cannot be exercised on POSIX runners;
    // it stays pinned by the platform branch in killTask551ProcessGroup.
  });
  test("spawn failure throws the fixed redacted spawn code", async () => {
    const spawn = (): FakeProc => {
      throw new Error("enoent");
    };
    let thrown: DiagnosticCarrier | undefined;
    await runTask551BoundedChild({ ...CHILD_BASE, ...L03_CHECK_CHILD, spawn }).catch(
      (error: DiagnosticCarrier) => {
        thrown = error;
      }
    );
    expect(thrown!.message).toBe(TASK551_CHILD_FAILURE_CODES.spawn);
    // Even pre-spawn failures carry a capped, empty-tailed diagnostic.
    const diagnostic = thrown!.task551Diagnostic!;
    expect(diagnostic.stdoutTail).toBe("");
    expect(diagnostic.stderrTail).toBe("");
    expect(diagnostic.killStrategy).toBe("none");
  });
  test("signal-terminated child reports failed with the observed signal code", async () => {
    const fake = makeFakeSpawn({ exited: Promise.resolve(143), signalCode: "SIGTERM" });
    const result = await runTask551BoundedChild({
      ...CHILD_BASE,
      ...L03_CHECK_CHILD,
      spawn: fake.spawn,
    });
    expect(result.status).toBe("failed");
    expect(result.signalCode).toBe("SIGTERM");
  });
});
