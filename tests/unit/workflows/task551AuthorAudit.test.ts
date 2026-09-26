// TASK-551-11 author-audit workflow tests (single owner: TASK-551-11 sidecar).
// Lane convention for tests/unit/workflows/* is Bun (`bun test`). These tests
// are fully injected: no real child process, filesystem write, or canonical
// evidence-root access. They write only to unique mkdtemp directories (in the
// grounding fixture below) and never to the repo tree.
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  TASK551_RECONCILE_SCOPE,
  deriveTask551AuditScopes,
  evaluateTask551DriftRound,
  normalizeTask551AuditResult,
  planTask551Reaudit,
  preflightTask551AuthorAuditDispatch,
  requireTask551AuthoredScope,
  requireTask551ResearchGrounding,
  runTask551AuthorAuditWorkflow,
} from "../../../_docs/_workflows/task-551-author-audit.mjs";
import {
  TASK551_L02_REQUIRED_SUBGATES,
  TASK551_PHASE_IMPORT_CLOSURE,
  TASK551_PHASE_RUNTIME_OUTPUTS,
  TASK551_WORKFLOW_COMPATIBILITY_PREREQUISITE,
  createTask551TaskGraphSnapshot,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import {
  completed,
  currentTask551DispatchSnapshot,
  fullDiscovery,
  highFinding,
  lowFinding,
  uniqueTempDir,
} from "./task551AuthorAuditFixtures.js";

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
