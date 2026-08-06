import { expect, test } from "bun:test";
import path from "node:path";
import {
  compileTask540BrowserDispatchPlan,
  TASK_540_EXPECTED_BROWSER_TOTALS,
  type Task540SegmentPlanSource,
} from "../../../scripts/runtime-smoke/adapters/task-540/browser-segments";
import { createTask540BrowserExecutor } from "../../../scripts/runtime-smoke/adapters/task-540/browser-executor";
import {
  buildBatchRunCodeSource,
  materializedSourceBytes,
} from "../../../scripts/runtime-smoke/browser/action-frames";
import { MAX_BROWSER_RUN_CODE_ARG_BYTES } from "../../../scripts/runtime-smoke/browser/contracts";
import { splitMaterializedSegment } from "../../../scripts/runtime-smoke/browser/segment-compiler";
import { successFrame } from "../../../scripts/runtime-smoke/browser/protocol";

interface PlanModule {
  readonly buildTask540SmokePlan: (input: { readonly nonce: string }) => Task540SegmentPlanSource;
}

const root = path.resolve(import.meta.dir, "../../..");

test("TASK-540 manifest compiles to exact 47 batches plus 28 standalone dispatches", async () => {
  const module: PlanModule = await import(
    path.join(root, "_docs/_workflows/task-540-smoke/contract/plan.mjs")
  );
  const plan = module.buildTask540SmokePlan({ nonce: "0123456789ab" });
  const compiled = compileTask540BrowserDispatchPlan(plan);
  expect(compiled).toMatchObject({
    logicalBrowserActions: 420,
    runCodeActions: 392,
    runCodeBatches: 47,
    standaloneActions: 28,
    physicalDispatches: 75,
  });
  expect(TASK_540_EXPECTED_BROWSER_TOTALS).toEqual({
    actions: 496,
    browser: 420,
    runtime: 76,
    runCode: 392,
    runCodeBatchesBeforeSizeSplits: 47,
    standalone: 28,
    dispatchesBeforeSizeSplits: 75,
  });
  const runCode = compiled.dispatches.filter(({ kind }) => kind === "run-code");
  const countsByScenario = Object.fromEntries(
    [...new Set(runCode.map(({ scenarioId }) => scenarioId))].map((scenarioId) => [
      scenarioId,
      runCode
        .filter((dispatch) => dispatch.scenarioId === scenarioId)
        .map((dispatch) => (dispatch.kind === "run-code" ? dispatch.actionIds.length : 0)),
    ])
  );
  expect(countsByScenario).toEqual({
    setup: [3, 1, 1, 1],
    "button-image": [5, 23, 19, 5, 8, 3, 1, 6],
    "tabs-content": [7, 8, 6, 6, 13, 6],
    "tabs-keyboard-aria": [8, 20, 7],
    "space-selection": [22, 6],
    "dirty-guards": [7, 24, 8, 6],
    "related-retry-cache": [4, 14, 3, 10, 3, 9],
    "responsive-users": [36, 2, 4, 1, 13, 7, 6, 5, 15, 14, 6, 6],
    cleanup: [1, 3],
  });
  const browserIds = compiled.dispatches.flatMap((dispatch) =>
    dispatch.kind === "run-code" ? dispatch.actionIds : [dispatch.actionId]
  );
  expect(browserIds).toEqual(
    plan.actionManifest
      .filter(({ executable }) => executable.type !== "runtime-operation")
      .map(({ id }) => id)
  );

  const oversized = runCode.find(
    (dispatch) =>
      dispatch.kind === "run-code" && dispatch.actionIds[0] === "bi-006-bound-open-primary"
  );
  if (oversized?.kind !== "run-code") throw new Error("expected TASK-540 bi-006 segment");
  const materialized = oversized.actionIds.map((actionId) => ({
    actionId,
    source: `async () => ${JSON.stringify("x".repeat(20_000))}`,
  }));
  const partitions = splitMaterializedSegment(
    oversized,
    materializedSourceBytes(oversized, materialized)
  );
  expect(partitions.length).toBeGreaterThan(1);
  expect(partitions.flatMap(({ actionIds }) => actionIds)).toEqual(oversized.actionIds);
  let offset = 0;
  for (const partition of partitions) {
    const actions = materialized.slice(offset, offset + partition.actionIds.length);
    offset += partition.actionIds.length;
    const source = buildBatchRunCodeSource({
      expectation: {
        runId: "wf540-size-test",
        manifestSha256: "b".repeat(64),
        scenarioId: partition.scenarioId,
        segmentId: partition.segmentId,
        actionIds: partition.actionIds,
      },
      actions,
    });
    expect(Buffer.byteLength(source)).toBeLessThanOrEqual(MAX_BROWSER_RUN_CODE_ARG_BYTES);
  }
});

test("TASK-540 browser executor preserves logical order and proof ownership across size splits", async () => {
  const manifestSha256 = "a".repeat(64);
  const dispatchPlan = {
    schemaVersion: 1 as const,
    dispatches: [
      {
        schemaVersion: 1 as const,
        kind: "run-code" as const,
        segmentId: "segment-0001",
        scenarioId: "scenario",
        actionIds: ["a", "b", "c"],
        estimatedSourceBytes: 0,
      },
    ],
    logicalBrowserActions: 3,
    runCodeActions: 3,
    runCodeBatches: 1,
    standaloneActions: 0,
    physicalDispatches: 1,
  };
  const events: string[] = [];
  const proofBySegment = new Map<string, object>();
  const executor = createTask540BrowserExecutor({
    dispatchPlan,
    runId: "run-1",
    manifestSha256,
    async materializeSegment(segment) {
      return {
        segment,
        actions: segment.actionIds.map((actionId) => ({ actionId, source: "async () => true" })),
      };
    },
    splitMaterializedSegment(materialized) {
      const partitions = [
        materialized.segment.actionIds.slice(0, 2),
        materialized.segment.actionIds.slice(2),
      ];
      return partitions.map((actionIds, index) => ({
        segment: {
          ...materialized.segment,
          segmentId: `${materialized.segment.segmentId}-part-0${index + 1}`,
          actionIds,
        },
        actions: materialized.actions.slice(index === 0 ? 0 : 2, index === 0 ? 2 : 3),
      }));
    },
    async dispatchSegment(materialized, frameExpectation) {
      events.push(`dispatch:${materialized.segment.segmentId}`);
      const proof = {};
      proofBySegment.set(materialized.segment.segmentId, proof);
      return {
        frames: frameExpectation.actionIds.map((_, index) =>
          successFrame({ expectation: frameExpectation, sequence: index + 1, output: index + 1 })
        ),
        proof,
      };
    },
    async projectFrame(request, frame, proof) {
      const segmentId = request.actionId === "c" ? "segment-0001-part-02" : "segment-0001-part-01";
      expect(proof).toBe(proofBySegment.get(segmentId));
      events.push(`project:${request.actionId}:${segmentId}`);
      return frame.actionId;
    },
    async executeStandalone() {
      throw new Error("unexpected standalone action");
    },
  });
  expect(
    await executor.executePrepared({ actionId: "a", executableType: "browser-run-code" })
  ).toBe("a");
  expect(events).toEqual([
    "dispatch:segment-0001-part-01",
    "dispatch:segment-0001-part-02",
    "project:a:segment-0001-part-01",
  ]);
  expect(
    await executor.executePrepared({ actionId: "b", executableType: "browser-run-code" })
  ).toBe("b");
  expect(
    await executor.executePrepared({ actionId: "c", executableType: "browser-run-code" })
  ).toBe("c");
  expect(events).toEqual([
    "dispatch:segment-0001-part-01",
    "dispatch:segment-0001-part-02",
    "project:a:segment-0001-part-01",
    "project:b:segment-0001-part-01",
    "project:c:segment-0001-part-02",
  ]);
  expect(() => executor.assertDrained()).not.toThrow();
});

test("TASK-540 command authority projects two logical receipts from one physical batch", async () => {
  interface AuthorityRequest {
    readonly action: TaskAction;
    readonly program: "playwright-cli";
    readonly args: readonly string[];
    readonly sequence: number;
    readonly operation: string;
    readonly routeKey: null;
    readonly assertionName: null;
    readonly displayArgs: readonly string[];
    readonly stdoutDiscarded: false;
  }
  interface TaskAction {
    readonly id: string;
    readonly kind: string;
    readonly scenario: string;
    readonly pageId: string;
    readonly tabIndex: number;
    readonly executable: { readonly type: "browser-run-code" };
    readonly repositoryMutationPolicy: { readonly mode: "none"; readonly paths: readonly [] };
  }
  interface CommandAuthority {
    executeBatchProgram(input: {
      readonly attributionAction: TaskAction;
      readonly actions: readonly TaskAction[];
      readonly args: readonly string[];
      readonly cwd: string;
      readonly env: Readonly<Record<string, string>>;
    }): Promise<{ readonly proof: object; readonly stdout: Buffer; readonly stderr: Buffer }>;
    projectBatchActionResult(input: {
      readonly proof: object;
      readonly request: AuthorityRequest;
      readonly stdout: Buffer;
      readonly terminal?: boolean;
    }): { readonly receipt: { readonly sequence: number; readonly stdoutSha256: string } };
  }
  interface AuthorityModule {
    readonly createCommandAuthorityRuntime: (input: {
      readonly failureBoundary: Record<string, (...args: never[]) => unknown>;
      readonly runRetainedProcessGroup: () => Promise<object>;
    }) => { readonly LocalCommandAuthority: new (input: object) => CommandAuthority };
  }
  const module: AuthorityModule = await import(
    path.join(root, "_docs/_workflows/task-540-smoke/runtime/command-authority.mjs")
  );
  let physicalCalls = 0;
  const retained = async (): Promise<object> => {
    physicalCalls += 1;
    return Object.freeze({
      completion: Object.freeze({ code: 0, signal: null }),
      timedOut: false,
      spawnError: false,
      stdout: Object.freeze({ bytes: Buffer.from('"batch\\n"\n'), exceeded: false }),
      stderr: Object.freeze({ bytes: Buffer.alloc(0), exceeded: false }),
      termination: Object.freeze({ absent: true }),
    });
  };
  const noFrame = (): null => null;
  const failureBoundary = {
    classifyPrivateAuthSettlementFailureFrame: noFrame,
    classifyPrivateDirtyNavigationFailureFrame: noFrame,
    classifyPrivateToneOpenFailureFrame: noFrame,
    classifyPrivateToneSelectFailureFrame: noFrame,
    createPrivateAuthSettlementFailure: () => new Error("auth"),
    createPrivateDirtyNavigationFailure: () => new Error("dirty"),
    createPrivateToneOpenFailure: () => new Error("tone-open"),
    createPrivateToneSelectFailure: () => new Error("tone-select"),
    failPrivateAuthSettlementStage: (
      _action: never,
      _failureClass: never,
      _details: never,
      fallback: string
    ): never => {
      throw new Error(fallback);
    },
  };
  const { LocalCommandAuthority } = module.createCommandAuthorityRuntime({
    failureBoundary: failureBoundary as unknown as Record<string, (...args: never[]) => unknown>,
    runRetainedProcessGroup: retained,
  });
  const clean = Object.freeze({ paths: Object.freeze([]), hashes: Object.freeze({}) });
  const authority = new LocalCommandAuthority({
    root,
    assertSafeEvidence: () => undefined,
    snapshotRepository: async () => clean,
    sensitiveValues: [],
  });
  const makeAction = (id: string): TaskAction => ({
    id,
    kind: "click",
    scenario: "scenario",
    pageId: "admin",
    tabIndex: 0,
    executable: { type: "browser-run-code" },
    repositoryMutationPolicy: { mode: "none", paths: [] },
  });
  const first = makeAction("first");
  const second = makeAction("second");
  const physical = await authority.executeBatchProgram({
    attributionAction: first,
    actions: [first, second],
    args: ["-s=wf540smoke", "--raw", "run-code", "async () => true"],
    cwd: root,
    env: {},
  });
  const request = (action: TaskAction, sequence: number): AuthorityRequest => ({
    action,
    program: "playwright-cli",
    args: ["-s=wf540smoke", "--raw", "run-code", "async () => true"],
    sequence,
    operation: "click",
    routeKey: null,
    assertionName: null,
    displayArgs: ["-s=wf540smoke", "--raw", `run-code/${action.id}`],
    stdoutDiscarded: false,
  });
  expect(() =>
    authority.projectBatchActionResult({
      proof: physical.proof,
      request: request(second, 2),
      stdout: Buffer.from('{"ok":true}\n'),
    })
  ).toThrow();
  const firstResult = authority.projectBatchActionResult({
    proof: physical.proof,
    request: request(first, 1),
    stdout: Buffer.from('{"ok":true}\n'),
  });
  const secondResult = authority.projectBatchActionResult({
    proof: physical.proof,
    request: request(second, 2),
    stdout: Buffer.from('{"ok":true}\n'),
    terminal: true,
  });
  expect([firstResult.receipt.sequence, secondResult.receipt.sequence]).toEqual([1, 2]);
  expect(firstResult.receipt.stdoutSha256).toBe(secondResult.receipt.stdoutSha256);
  expect(physicalCalls).toBe(1);
  expect(() =>
    authority.projectBatchActionResult({
      proof: physical.proof,
      request: request(second, 2),
      stdout: Buffer.from('{"ok":true}\n'),
    })
  ).toThrow();
});
