import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import { WorkerProtocolError } from "../../../scripts/runtime-smoke/workers/contracts";
import type { PlainJsonValue } from "../../../scripts/runtime-smoke/workers/contracts";
import {
  TASK_488_AUTH_FAST_WINDOW_SECONDS,
  TASK_488_AUTH_MINIMUM_REQUESTS,
  TASK_488_WORKER_DESCRIPTORS,
  TASK_488_WORKER_OPERATION_IDS,
  assertTask488WorkerDescriptorParity,
  createTask488WorkerRegistry,
  type Task488AuthPrepareOutput,
  type Task488AuthRestoreOutput,
  type Task488WorkerHandlers,
} from "../../../scripts/runtime-smoke/adapters/task-488/worker-operations";
import { restoreTask488AuthWindowNeverThrow } from "../../../scripts/runtime-smoke/adapters/task-488/cleanup";
import type { WorkerPool } from "../../../scripts/runtime-smoke/workers/pool";

const MARKER = "a1b2c3d4e5f6";
const BAD_MARKER = "not-a-marker!";

const CANONICAL_PREPARE: Task488AuthPrepareOutput = Object.freeze({
  schemaVersion: 1,
  prepared: true,
  changed: true,
  windowSeconds: TASK_488_AUTH_FAST_WINDOW_SECONDS,
  maxRequests: TASK_488_AUTH_MINIMUM_REQUESTS,
});

const CANONICAL_RESTORE: Task488AuthRestoreOutput = Object.freeze({
  schemaVersion: 1,
  restored: true,
});

function stubHandlers(overrides: Partial<Task488WorkerHandlers> = {}): Task488WorkerHandlers {
  return {
    install: async () => {
      throw new WorkerProtocolError("stub install is not under test");
    },
    cleanup: async () => {
      throw new WorkerProtocolError("stub cleanup is not under test");
    },
    prove: async () => {
      throw new WorkerProtocolError("stub prove is not under test");
    },
    prepareAuthWindow: async () => CANONICAL_PREPARE,
    restoreAuthWindow: async () => CANONICAL_RESTORE,
    close: async () => undefined,
    proveAbsent: async () => true,
    ...overrides,
  };
}

test("TASK-488 auth-window operations are part of the canonical worker operation set", () => {
  expect([...TASK_488_WORKER_OPERATION_IDS].sort()).toEqual(
    [
      "task-488/auth-window/prepare",
      "task-488/auth-window/restore",
      "task-488/cleanup",
      "task-488/install",
      "task-488/prove",
    ].sort()
  );
  expect(TASK_488_WORKER_DESCRIPTORS.authPrepare.operationId).toBe("task-488/auth-window/prepare");
  expect(TASK_488_WORKER_DESCRIPTORS.authRestore.operationId).toBe("task-488/auth-window/restore");
  expect(TASK_488_WORKER_DESCRIPTORS.authPrepare.retryClass).toBe("mutation");
  expect(TASK_488_WORKER_DESCRIPTORS.authRestore.retryClass).toBe("mutation");
  expect(TASK_488_WORKER_DESCRIPTORS.authPrepare.profileId).toBe("task-488-db");
  expect(TASK_488_WORKER_DESCRIPTORS.authRestore.profileId).toBe("task-488-db");
});

test("TASK-488 registry registers every operation and passes descriptor parity", () => {
  const registry = createTask488WorkerRegistry(stubHandlers());
  expect(registry.ids()).toEqual([...TASK_488_WORKER_OPERATION_IDS].sort());
  assertTask488WorkerDescriptorParity(registry.descriptors());
});

test("TASK-488 auth-window descriptors are stable, sha256-pinned contracts", () => {
  const { authPrepare, authRestore } = TASK_488_WORKER_DESCRIPTORS;
  const operationDigest = (operationId: string) =>
    createHash("sha256").update(`task-488/${operationId}-v1`).digest("hex");
  expect(authPrepare.sourceSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(authPrepare.sourceSha256).toBe(operationDigest("task-488/auth-window/prepare"));
  expect(authPrepare.inputSchemaId).toBe("task-488-auth-window-prepare-input-v1");
  expect(authPrepare.outputSchemaId).toBe("task-488-auth-window-prepare-output-v1");
  expect(authRestore.sourceSha256).toBe(operationDigest("task-488/auth-window/restore"));
  expect(authRestore.inputSchemaId).toBe("task-488-auth-window-restore-input-v1");
  expect(authRestore.outputSchemaId).toBe("task-488-auth-window-restore-output-v1");
});

test("TASK-488 auth prepare executes through the registry with the canonical marker", async () => {
  const registry = createTask488WorkerRegistry(stubHandlers());
  const output = (await registry.executeOneShot(
    TASK_488_WORKER_DESCRIPTORS.authPrepare,
    Object.freeze({ marker: MARKER })
  )) as PlainJsonValue;
  expect(output).toEqual(CANONICAL_PREPARE);
});

test("TASK-488 auth prepare rejects malformed markers and unknown keys", async () => {
  const registry = createTask488WorkerRegistry(stubHandlers());
  for (const input of [
    Object.freeze({ marker: BAD_MARKER }),
    Object.freeze({ marker: "" }),
    Object.freeze({ marker: MARKER, extra: true }),
    Object.freeze({}),
  ]) {
    expect(
      registry
        .executeOneShot(TASK_488_WORKER_DESCRIPTORS.authPrepare, input)
        .then(() => "accepted")
        .catch(() => "rejected")
    ).resolves.toBe("rejected");
  }
});

test("TASK-488 auth prepare rejects a drifted output envelope", async () => {
  const registry = createTask488WorkerRegistry(
    stubHandlers({
      prepareAuthWindow: async () =>
        Object.freeze({
          schemaVersion: 1,
          prepared: true,
          changed: true,
          windowSeconds: 0,
          maxRequests: TASK_488_AUTH_MINIMUM_REQUESTS,
        }) as unknown as Task488AuthPrepareOutput,
    })
  );
  await expect(
    registry.executeOneShot(
      TASK_488_WORKER_DESCRIPTORS.authPrepare,
      Object.freeze({ marker: MARKER })
    )
  ).rejects.toBeInstanceOf(WorkerProtocolError);
});

test("TASK-488 auth restore executes through the registry and rejects drift", async () => {
  const registry = createTask488WorkerRegistry(stubHandlers());
  const output = (await registry.executeOneShot(
    TASK_488_WORKER_DESCRIPTORS.authRestore,
    Object.freeze({ marker: MARKER })
  )) as PlainJsonValue;
  expect(output).toEqual(CANONICAL_RESTORE);
  const drifted = createTask488WorkerRegistry(
    stubHandlers({
      restoreAuthWindow: async () =>
        Object.freeze({ schemaVersion: 1, restored: false }) as unknown as Task488AuthRestoreOutput,
    })
  );
  await expect(
    drifted.executeOneShot(
      TASK_488_WORKER_DESCRIPTORS.authRestore,
      Object.freeze({ marker: MARKER })
    )
  ).rejects.toBeInstanceOf(WorkerProtocolError);
});

test("TASK-488 auth restore input validation matches the prepare contract", async () => {
  const registry = createTask488WorkerRegistry(stubHandlers());
  for (const input of [
    Object.freeze({ marker: BAD_MARKER }),
    Object.freeze({ marker: MARKER, nope: 1 }),
    Object.freeze({}),
  ]) {
    await expect(
      registry.executeOneShot(TASK_488_WORKER_DESCRIPTORS.authRestore, input)
    ).rejects.toThrow();
  }
});

test("TASK-488 auth-window restore is never-throw and records dispatch failures", async () => {
  const failingWorkers = {
    dispatch: async () => {
      throw new WorkerProtocolError("stub dispatch failure");
    },
  } as unknown as WorkerPool;
  const failures = await restoreTask488AuthWindowNeverThrow({
    workers: failingWorkers,
    descriptor: TASK_488_WORKER_DESCRIPTORS.authRestore,
    marker: MARKER,
  });
  expect(failures).toHaveLength(1);
  expect(failures[0].resource).toBe("task488-auth-window-restore");
  expect(failures[0].phase).toBe("close");
});

test("TASK-488 auth-window restore returns no failures when the dispatch succeeds", async () => {
  const succeedingWorkers = {
    dispatch: async () => CANONICAL_RESTORE,
  } as unknown as WorkerPool;
  const failures = await restoreTask488AuthWindowNeverThrow({
    workers: succeedingWorkers,
    descriptor: TASK_488_WORKER_DESCRIPTORS.authRestore,
    marker: MARKER,
  });
  expect(failures).toEqual([]);
});
