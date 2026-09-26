import { describe, expect, test } from "bun:test";

import type { Task551L11L03EvidenceProofV1 } from "../../../_docs/_workflows/lib/task-551-contract.mjs";

import {
  TASK551_05_L02_LINE_COUNT_PATHS,
  TASK551_05_L02_PROVENANCE,
  TASK551_05_L02_VALIDATION_PATHS,
  TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS,
  TASK551_PLANNED_BUN_PATHS,
  TASK551_PHASE_CLOSED_ALLOWLIST,
  TASK551_PHASE_DISCOVERY_ALLOWLIST,
  TASK551_PHASE_IMPORT_CLOSURE,
  TASK551_PHASE_LINE_COUNT_PATHS,
  TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE,
  TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS,
  TASK551_PHASE_PROVENANCE,
  TASK551_PHASE_VALIDATION_PATHS,
  captureTask551L01MaterializationBarrier,
  captureTask551MaterializedWorktreeSnapshot,
  captureTask551PreSpawnWorktreeSnapshot,
  deriveTask551ClosedWorktreeSet,
  requireExactActivePhaseSnapshotBeforeSpawn,
  requireTask551L01MaterializationBarrierBeforeL02,
  requireTask551LiteralUniquePaths,
  requireTask551PredecessorWorktreeSnapshotBeforeSpawn,
  task551CurrentWorktreeDigest,
  task551FullProvenanceClosureForSpawn,
  task551L11BarrierCurrentWorktreeDigest,
  writeTask551EvidenceFileIfAbsent,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import {
  auditSnapshot,
  barrierFixtures,
  digestFor,
  sha,
  worktree,
} from "./task551WorkflowContractsFixtures.js";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Condition extends true> = Condition;

describe("TASK-551 current-worktree snapshot contract", () => {
  test("types the durable writer digest directly into the L03 proof handoff", () => {
    const matches: Assert<
      Equal<
        Awaited<ReturnType<typeof writeTask551EvidenceFileIfAbsent>>["digest"],
        Task551L11L03EvidenceProofV1["acceptedEvidenceDigest"]
      >
    > = true;
    expect(matches).toBe(true);
  });

  test("derives immutable-worktree projections without commit terminology", () => {
    expect(TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS.get("l01")).toEqual([
      "tests/bun-lane-manifest.json",
    ]);
    expect(TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE.get("l01")).toContain(
      "tests/bun-lane-manifest.json"
    );
    expect(deriveTask551ClosedWorktreeSet(["l01"])).toContain("tests/bun-lane-manifest.json");
    expect(deriveTask551ClosedWorktreeSet(["05-l02"])).not.toContain(
      ".tmp/task-551/task489-predecessor-v1.json"
    );
    expect(TASK551_05_L02_PROVENANCE?.phase).toBe("05-l02");
    expect(TASK551_05_L02_VALIDATION_PATHS).toEqual(TASK551_PHASE_IMPORT_CLOSURE.get("05-l02"));
    expect(TASK551_05_L02_LINE_COUNT_PATHS).toEqual(TASK551_PHASE_CLOSED_ALLOWLIST.get("05-l02"));
  });

  test("allows absent active L03 paths before its dispatcher, then captures and rechecks them", () => {
    const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
    const absentActive = [...TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!, auxiliary];
    const before = worktree({ absent: absentActive });
    const predecessor = captureTask551PreSpawnWorktreeSnapshot("l03", auditSnapshot, before);
    expect(predecessor.activeDigests).toEqual([]);
    expect(predecessor.predecessorDigests.map(({ path }) => path)).not.toContain(auxiliary);
    expect(requireTask551PredecessorWorktreeSnapshotBeforeSpawn("l03", predecessor, before)).toBe(
      true
    );

    const after = worktree({ absent: [auxiliary] });
    const materialized = captureTask551MaterializedWorktreeSnapshot("l03", predecessor, after);
    expect(materialized.activeDigests.map((entry) => entry.path)).toEqual(
      TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE.get("l03")
    );
    expect(materialized.predecessorDigests.map(({ path }) => path)).not.toContain(auxiliary);
    expect(
      requireExactActivePhaseSnapshotBeforeSpawn(
        "l03",
        materialized.activeDigests,
        after,
        materialized
      )
    ).toBe(true);
  });

  test("excludes the direct L01 auxiliary gate from every successor snapshot and delta allowance", () => {
    const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
    for (const phase of ["l03", "l04", "l02", "05-l02"]) {
      const predecessor = captureTask551PreSpawnWorktreeSnapshot(
        phase,
        auditSnapshot,
        worktree({ absent: [auxiliary] })
      );
      expect(predecessor.predecessorDigests.map(({ path }) => path)).not.toContain(auxiliary);
      expect(() =>
        captureTask551PreSpawnWorktreeSnapshot(
          phase,
          auditSnapshot,
          worktree({ deltaPaths: [auxiliary] })
        )
      ).toThrow(/foreign_delta/);
    }
  });

  test("fails closed on task graph, predecessor, active, symlink, and foreign-delta drift", () => {
    const baseline = worktree();
    const predecessor = captureTask551PreSpawnWorktreeSnapshot("l03", auditSnapshot, baseline);
    const active = captureTask551MaterializedWorktreeSnapshot("l03", predecessor, baseline);
    const predecessorPath = TASK551_PHASE_IMPORT_CLOSURE.get("l01")![0]!;
    const activePath = TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE.get("l03")![0]!;

    expect(() =>
      captureTask551PreSpawnWorktreeSnapshot(
        "l03",
        auditSnapshot,
        worktree({ taskDigest: sha("changed-task") })
      )
    ).toThrow(/task_graph_byte_drift/);
    expect(() =>
      requireTask551PredecessorWorktreeSnapshotBeforeSpawn(
        "l03",
        predecessor,
        worktree({ drift: { [predecessorPath]: sha("drift") } })
      )
    ).toThrow(/byte_drift/);
    expect(() =>
      requireExactActivePhaseSnapshotBeforeSpawn(
        "l03",
        active.activeDigests,
        worktree({ drift: { [activePath]: sha("drift") } }),
        active
      )
    ).toThrow(/byte_drift/);
    expect(() =>
      captureTask551PreSpawnWorktreeSnapshot(
        "l03",
        auditSnapshot,
        worktree({ symlinks: [predecessorPath] })
      )
    ).toThrow(/not_regular/);
    expect(() =>
      captureTask551PreSpawnWorktreeSnapshot(
        "l03",
        auditSnapshot,
        worktree({ deltaPaths: ["core/foreign.ts"] })
      )
    ).toThrow(/foreign_delta/);
  });

  test("uses literal exact path sets and a separate predecessor closure", () => {
    expect(task551FullProvenanceClosureForSpawn("l02")).toEqual([
      "sidecar",
      "l01",
      "l03",
      "l04",
      "l02",
    ]);
    const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
    const capabilitySafetyPaths = [
      "scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts",
    ];
    expect(TASK551_PHASE_PROVENANCE.find(({ phase }) => phase === "l01")?.ownedFiles).toEqual(
      expect.arrayContaining(capabilitySafetyPaths)
    );
    for (const projection of [
      TASK551_PHASE_IMPORT_CLOSURE,
      TASK551_PHASE_DISCOVERY_ALLOWLIST,
      TASK551_PHASE_CLOSED_ALLOWLIST,
      TASK551_PHASE_VALIDATION_PATHS,
      TASK551_PHASE_LINE_COUNT_PATHS,
    ])
      expect(projection.get("l01")).toEqual(
        expect.arrayContaining([auxiliary, ...capabilitySafetyPaths])
      );
    expect(TASK551_PLANNED_BUN_PATHS).toHaveLength(9);
    expect(TASK551_PLANNED_BUN_PATHS).not.toContain(auxiliary);
    expect(TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS).toEqual([
      "tests/perf/database-query-inventory.test.ts",
      "tests/integration/server/task551BunLaneMembership.test.ts",
      "tests/perf/task551FixtureTargetBootstrap.test.ts",
      "tests/perf/database-query-baseline.test.ts",
      "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
      "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
      "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts",
      "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts",
      "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts",
    ]);
    expect(TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS).not.toContain(auxiliary);
    expect(() =>
      requireTask551LiteralUniquePaths(["tests/a.test.ts", "tests/a.test.ts"], "test")
    ).toThrow(/duplicate_path/);
    expect(() => requireTask551LiteralUniquePaths(["../tests/a.test.ts"], "test")).toThrow(
      /traversal/
    );
    expect(() => requireTask551LiteralUniquePaths(["tests//a.test.ts"], "test")).toThrow(
      /traversal/
    );
  });

  test("keeps the direct L01 auxiliary gate out of every L11 barrier receipt and snapshot", () => {
    const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
    const capabilitySafetyPaths = [
      "scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts",
    ];
    for (const projection of [
      TASK551_PHASE_IMPORT_CLOSURE,
      TASK551_PHASE_CLOSED_ALLOWLIST,
      TASK551_PHASE_VALIDATION_PATHS,
      TASK551_PHASE_LINE_COUNT_PATHS,
    ])
      expect(projection.get("l01")).toEqual(
        expect.arrayContaining([auxiliary, ...capabilitySafetyPaths])
      );

    const baseline = barrierFixtures(),
      changed = barrierFixtures({ auxiliaryDrift: true });
    const baselineState = captureTask551L01MaterializationBarrier(baseline.input);
    const changedState = captureTask551L01MaterializationBarrier(changed.input);
    expect(changedState.beforeWorktreeDigest).toBe(baselineState.beforeWorktreeDigest);
    expect(changedState.afterWorktreeDigest).toBe(baselineState.afterWorktreeDigest);
    expect(task551L11BarrierCurrentWorktreeDigest(changed.before)).toBe(
      baselineState.beforeWorktreeDigest
    );
    expect(task551CurrentWorktreeDigest(changed.before)).not.toBe(
      baselineState.beforeWorktreeDigest
    );
    expect(changedState.l01ActiveSnapshot.activeDigests.map(({ path }) => path)).toEqual(
      expect.arrayContaining(capabilitySafetyPaths)
    );
    for (const snapshot of [
      changedState.l03ActiveSnapshot,
      changedState.l04ActiveSnapshot,
      changedState.l01ActiveSnapshot,
      changedState.l02PredecessorSnapshot,
    ]) {
      expect(
        [...snapshot.predecessorDigests, ...snapshot.activeDigests].map(({ path }) => path)
      ).not.toContain(auxiliary);
    }

    const invalidL01 = Object.freeze({
      ...changedState.l01ActiveSnapshot,
      activeDigests: Object.freeze(
        [...changedState.l01ActiveSnapshot.activeDigests, digestFor(changed.after, auxiliary)].sort(
          (left, right) => left.path.localeCompare(right.path)
        )
      ),
    });
    expect(() =>
      requireTask551L01MaterializationBarrierBeforeL02(
        Object.freeze({ ...changedState, l01ActiveSnapshot: invalidL01 }),
        changed.after
      )
    ).toThrow(/barrier_state_invalid/);
    expect(() =>
      captureTask551L01MaterializationBarrier(
        barrierFixtures({ auxiliaryDrift: true, auxiliaryDelta: true }).input
      )
    ).toThrow(/foreign_delta/);
  });
});
