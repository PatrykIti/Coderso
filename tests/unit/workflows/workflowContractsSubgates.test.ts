import { describe, expect, test } from "bun:test";

import { runTask551ImplementWorkflowForTests } from "../../../_docs/_workflows/task-551-implement.mjs";
import { type Worktree, clearEvidencePreflight } from "./task551WorkflowContractsFixtures.js";
import {
  classifierResult,
  l02EvidenceInput,
  l02ExecutionFixture,
  l02States,
} from "./task551WorkflowExecutionFixtures.js";

describe("TASK-551 L02 injected subgates", () => {
  test("parses the L02-only prerequisite and orders classifier then reviewed transition", async () => {
    const fixture = await l02ExecutionFixture(),
      states = l02States(fixture.snapshot),
      events: string[] = [];
    let current: Worktree = states.before;
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [fixture.node.id],
      phase: "l02",
      testExecutionSession: fixture.session,
      currentWorktreeSnapshotProvider: async () => current,
      leafDispatcher: async () => {
        events.push("leaf");
        current = states.afterLeaf;
        return { changedPaths: states.leafChanges };
      },
      gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) => {
        events.push(gate.operation);
        return {
          exitCode: 0,
          signalCode: null,
          timedOut: false,
          overflowed: false,
          discoveredTestCount: gate.kind === "test" ? 1 : null,
        };
      },
      evidencePreflight: async () => {
        events.push("preflight");
        return clearEvidencePreflight;
      },
      l02PreBarrierMaterializer: async () => {
        events.push("materializer");
        return states.materializer;
      },
      classifierBarrierRunner: async () => {
        events.push("classifier");
        current = states.afterClassifier;
        return classifierResult(states.before, states.afterClassifier);
      },
      l02ReviewedTransitionRunner: async () => {
        events.push("review");
        return true;
      },
      ...l02EvidenceInput(),
    });
    expect(fixture.node.workflowPrerequisites).toEqual(["TASK-551-11:compatibility-bootstrap@v2"]);
    expect(fixture.node.subgates.map(({ kind }) => kind)).toEqual([
      "classifier-materialization",
      "reviewed-pair-transition",
    ]);
    expect(result.pass).toBe(true);
    for (const callback of ["materializer", "classifier", "review"])
      expect(events[events.indexOf(callback) - 1]).toBe("preflight");
    expect(events.indexOf("review")).toBeGreaterThan(events.indexOf("freeze-large"));
    expect(events.indexOf("review")).toBeLessThan(events.indexOf("check-small"));
  });

  test("keeps the direct L01 auxiliary gate out of actual L03-to-L02 successor state", async () => {
    const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
    const fixture = await l02ExecutionFixture([auxiliary]),
      states = l02States(fixture.snapshot, [auxiliary]);
    let current: Worktree = states.before;
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [fixture.node.id],
      phase: "l02",
      testExecutionSession: fixture.session,
      currentWorktreeSnapshotProvider: async () => current,
      leafDispatcher: async () => {
        current = states.afterLeaf;
        return { changedPaths: states.leafChanges };
      },
      gateRunner: async ({ gate }: { gate: { kind: string } }) => ({
        exitCode: 0,
        signalCode: null,
        timedOut: false,
        overflowed: false,
        discoveredTestCount: gate.kind === "test" ? 1 : null,
      }),
      l02PreBarrierMaterializer: async () => states.materializer,
      classifierBarrierRunner: async () => {
        current = states.afterClassifier;
        return classifierResult(states.before, states.afterClassifier);
      },
      l02ReviewedTransitionRunner: async () => true,
      ...l02EvidenceInput(),
    });
    expect(result.pass).toBe(true);
  });

  test("stops at the reviewed transition with zero check dispatches", async () => {
    const fixture = await l02ExecutionFixture(),
      states = l02States(fixture.snapshot),
      events: string[] = [];
    let current: Worktree = states.before;
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [fixture.node.id],
      phase: "l02",
      testExecutionSession: fixture.session,
      currentWorktreeSnapshotProvider: async () => current,
      leafDispatcher: async () => {
        current = states.afterLeaf;
        return { changedPaths: states.leafChanges };
      },
      gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) => {
        events.push(gate.operation);
        return {
          exitCode: 0,
          signalCode: null,
          timedOut: false,
          overflowed: false,
          discoveredTestCount: gate.kind === "test" ? 1 : null,
        };
      },
      l02PreBarrierMaterializer: async () => states.materializer,
      classifierBarrierRunner: async () => {
        current = states.afterClassifier;
        return classifierResult(states.before, states.afterClassifier);
      },
      l02ReviewedTransitionRunner: async () => false,
      ...l02EvidenceInput(),
    });
    expect(result).toMatchObject({
      pass: false,
      code: "task551_l02_reviewed_transition_failed",
      gateId: "command:check-small",
    });
    expect(events.filter((event) => event.startsWith("check-"))).toEqual([]);
  });

  test("preflights the L02 prefix fixer immediately before its injected invocation", async () => {
    const fixture = await l02ExecutionFixture(),
      states = l02States(fixture.snapshot);
    let current: Worktree = states.before;
    let preflightCount = 0,
      preflightCountAtFix = 0;
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [fixture.node.id],
      phase: "l02",
      testExecutionSession: fixture.session,
      maxFixRounds: 1,
      currentWorktreeSnapshotProvider: async () => current,
      leafDispatcher: async () => {
        current = states.afterLeaf;
        return { changedPaths: states.leafChanges };
      },
      gateRunner: async ({ gate }: { gate: { kind: string } }) => ({
        exitCode: 1,
        signalCode: null,
        timedOut: false,
        overflowed: false,
        discoveredTestCount: gate.kind === "test" ? 1 : null,
      }),
      evidencePreflight: async () => {
        preflightCount += 1;
        return clearEvidencePreflight;
      },
      fixAgent: async () => {
        preflightCountAtFix = preflightCount;
        return { status: "error" };
      },
      l02PreBarrierMaterializer: async () => states.materializer,
      classifierBarrierRunner: async () => {
        current = states.afterClassifier;
        return classifierResult(states.before, states.afterClassifier);
      },
      l02ReviewedTransitionRunner: async () => true,
      ...l02EvidenceInput(),
    });
    expect(result.pass).toBe(false);
    expect(preflightCountAtFix).toBe(3);
  });
});
