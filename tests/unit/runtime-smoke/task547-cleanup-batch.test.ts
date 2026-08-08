import { expect, test } from "bun:test";

import {
  createTask547CleanupResources,
  finalizeTask547ResourcesNeverThrow,
  preserveTask547PrimaryFailure,
} from "../../../scripts/runtime-smoke/adapters/task-547/cleanup";
import { TASK547_WORKER_DESCRIPTORS } from "../../../scripts/runtime-smoke/adapters/task-547/worker-operations";
import { SmokeError } from "../../../scripts/runtime-smoke/contracts";
import { RuntimeLifecycle, type LifecycleResource } from "../../../scripts/runtime-smoke/lifecycle";
import type {
  PlainJsonObject,
  WorkerOperationDescriptor,
} from "../../../scripts/runtime-smoke/workers/contracts";
import type { WorkerPool } from "../../../scripts/runtime-smoke/workers/pool";

const hash = "b".repeat(64);

class OrderedResource implements LifecycleResource {
  readonly name: string;
  readonly #order: string[];
  #closed = false;

  constructor(name: string, order: string[]) {
    this.name = name;
    this.#order = order;
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#order.push(this.name);
    this.#closed = true;
  }

  async proveAbsent(): Promise<boolean> {
    return this.#closed;
  }
}

test("TASK-547 finalization batches cleanup, reset, rollback and terminal absence proof in order", async () => {
  const order: string[] = [];
  const batches: Array<[number, number]> = [];
  const outputs: Record<string, PlainJsonObject> = {
    "task-547/cleanup": {
      schemaVersion: 1,
      deletedSubmissions: 5,
      deletedActionRuns: 2,
      markerDigest: hash,
      idDigest: hash,
      remainingSubmissionRows: [],
      remainingTempArtifacts: [],
      statements: 3,
      rows: 7,
    },
    "task-547/reset": {
      schemaVersion: 1,
      restoredSlots: ["form", "home-page"],
      stateDigest: hash,
      statements: 2,
      rows: 2,
    },
    "task-547/rollback": {
      schemaVersion: 1,
      officialRollbackCalls: 1,
      priorSettingsRestored: true,
      resourceAbsenceProved: true,
      rollbackDigest: hash,
      statements: 4,
      rows: 4,
    },
    "task-547/prove": {
      schemaVersion: 1,
      cleanupDone: true,
      resetDone: true,
      rollbackDone: true,
      officialRollbackCalls: 1,
      remainingSubmissionRows: [],
      remainingTempArtifacts: [],
      priorSettingsRestored: true,
      statements: 1,
      rows: 0,
    },
  };
  const workers = {
    async dispatch(descriptor: WorkerOperationDescriptor) {
      order.push(descriptor.operationId);
      const output = outputs[descriptor.operationId];
      if (output === undefined) throw new Error("unexpected operation");
      return output;
    },
    recordDatabaseBatch(statements: number, rows: number) {
      batches.push([statements, rows]);
    },
  } as unknown as WorkerPool;
  const lifecycle = new RuntimeLifecycle();
  const cleanup = createTask547CleanupResources({
    lifecycle,
    workers,
    descriptors: TASK547_WORKER_DESCRIPTORS,
  });
  const finalization = await finalizeTask547ResourcesNeverThrow({
    browser: new OrderedResource("browser", order),
    workspace: new OrderedResource("workspace", order),
    server: new OrderedResource("server", order),
    cleanup,
    workers,
    proofDescriptor: TASK547_WORKER_DESCRIPTORS.prove,
  });
  expect(finalization.failures).toEqual([]);
  expect(finalization.proof).not.toBeNull();
  expect(order).toEqual([
    "browser",
    "workspace",
    "server",
    "task-547/cleanup",
    "task-547/reset",
    "task-547/rollback",
    "task-547/prove",
  ]);
  expect(batches).toEqual([
    [3, 7],
    [2, 2],
    [4, 4],
    [1, 0],
  ]);
});

test("TASK-547 cleanup failure preserves the original failure code", () => {
  const primary = new SmokeError("smoke_process_failed", "browser failed");
  const preserved = preserveTask547PrimaryFailure(
    primary,
    [{ resource: "rollback", phase: "close", error: new Error("rollback failed") }],
    null
  );
  expect(preserved).toBeInstanceOf(SmokeError);
  expect((preserved as SmokeError).code).toBe("smoke_process_failed");
});
