import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import { WorkerProtocolError } from "../../../scripts/runtime-smoke/workers/contracts";
import type { PlainJsonValue } from "../../../scripts/runtime-smoke/workers/contracts";
import {
  TASK490_WORKER_DESCRIPTORS,
  TASK490_WORKER_OPERATION_IDS,
  assertTask490WorkerDescriptorParity,
  createTask490WorkerRegistry,
  type Task490AuthPrepareOutput,
  type Task490AuthRestoreOutput,
  type Task490WorkerHandlers,
} from "../../../scripts/runtime-smoke/adapters/task-490/worker-operations";

const MARKER = "a1b2c3d4e5f6";
const BAD_MARKER = "not-a-marker!";

const CANONICAL_PREPARE: Task490AuthPrepareOutput = Object.freeze({
  schemaVersion: 1,
  prepared: true,
  changed: true,
  windowSeconds: 5,
  maxRequests: 10,
});

const CANONICAL_RESTORE: Task490AuthRestoreOutput = Object.freeze({
  schemaVersion: 1,
  restored: true,
});

function stubHandlers(overrides: Partial<Task490WorkerHandlers> = {}): Task490WorkerHandlers {
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

test("TASK-490 auth-window operations are part of the canonical worker operation set", () => {
  expect([...TASK490_WORKER_OPERATION_IDS].sort()).toEqual(
    [
      "task-490/auth-window/prepare",
      "task-490/auth-window/restore",
      "task-490/cleanup",
      "task-490/install",
      "task-490/prove",
    ].sort()
  );
  expect(TASK490_WORKER_DESCRIPTORS.authPrepare.operationId).toBe("task-490/auth-window/prepare");
  expect(TASK490_WORKER_DESCRIPTORS.authRestore.operationId).toBe("task-490/auth-window/restore");
  expect(TASK490_WORKER_DESCRIPTORS.authPrepare.retryClass).toBe("mutation");
  expect(TASK490_WORKER_DESCRIPTORS.authRestore.retryClass).toBe("mutation");
  expect(TASK490_WORKER_DESCRIPTORS.authPrepare.profileId).toBe("task-490-db");
  expect(TASK490_WORKER_DESCRIPTORS.authRestore.profileId).toBe("task-490-db");
});

test("TASK-490 registry registers every operation and passes descriptor parity", () => {
  const registry = createTask490WorkerRegistry(stubHandlers());
  expect(registry.ids()).toEqual([...TASK490_WORKER_OPERATION_IDS].sort());
  assertTask490WorkerDescriptorParity(registry.descriptors());
});

test("TASK-490 auth-window descriptors are stable, sha256-pinned contracts", () => {
  const { authPrepare, authRestore } = TASK490_WORKER_DESCRIPTORS;
  const operationDigest = createHash("sha256").update("task-490-worker-v1").digest("hex");
  const pinned = (operationId: string) =>
    createHash("sha256").update(`${operationDigest}\0${operationId}`).digest("hex");
  expect(authPrepare.sourceSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(authPrepare.sourceSha256).toBe(pinned("task-490/auth-window/prepare"));
  expect(authPrepare.inputSchemaId).toBe("task-490-auth-window-prepare-input-v1");
  expect(authPrepare.outputSchemaId).toBe("task-490-auth-window-prepare-output-v1");
  expect(authRestore.sourceSha256).toBe(pinned("task-490/auth-window/restore"));
  expect(authRestore.inputSchemaId).toBe("task-490-auth-window-restore-input-v1");
  expect(authRestore.outputSchemaId).toBe("task-490-auth-window-restore-output-v1");
});

test("TASK-490 auth prepare executes through the registry with the canonical marker", async () => {
  const registry = createTask490WorkerRegistry(stubHandlers());
  const output = (await registry.executeOneShot(
    TASK490_WORKER_DESCRIPTORS.authPrepare,
    Object.freeze({ marker: MARKER })
  )) as PlainJsonValue;
  expect(output).toEqual(CANONICAL_PREPARE);
});

test("TASK-490 auth prepare rejects malformed markers and unknown keys", async () => {
  const registry = createTask490WorkerRegistry(stubHandlers());
  for (const input of [
    Object.freeze({ marker: BAD_MARKER }),
    Object.freeze({ marker: "" }),
    Object.freeze({ marker: MARKER, extra: true }),
    Object.freeze({}),
  ]) {
    expect(
      registry
        .executeOneShot(TASK490_WORKER_DESCRIPTORS.authPrepare, input)
        .then(() => "accepted")
        .catch(() => "rejected")
    ).resolves.toBe("rejected");
  }
});

test("TASK-490 auth prepare rejects a drifted output envelope", async () => {
  const registry = createTask490WorkerRegistry(
    stubHandlers({
      prepareAuthWindow: async () =>
        Object.freeze({
          schemaVersion: 1,
          prepared: true,
          changed: true,
          windowSeconds: 0,
          maxRequests: 10,
        }) as unknown as Task490AuthPrepareOutput,
    })
  );
  await expect(
    registry.executeOneShot(
      TASK490_WORKER_DESCRIPTORS.authPrepare,
      Object.freeze({ marker: MARKER })
    )
  ).rejects.toBeInstanceOf(WorkerProtocolError);
});

test("TASK-490 auth restore executes through the registry and rejects drift", async () => {
  const registry = createTask490WorkerRegistry(stubHandlers());
  const output = (await registry.executeOneShot(
    TASK490_WORKER_DESCRIPTORS.authRestore,
    Object.freeze({ marker: MARKER })
  )) as PlainJsonValue;
  expect(output).toEqual(CANONICAL_RESTORE);
  const drifted = createTask490WorkerRegistry(
    stubHandlers({
      restoreAuthWindow: async () =>
        Object.freeze({ schemaVersion: 1, restored: false }) as unknown as Task490AuthRestoreOutput,
    })
  );
  await expect(
    drifted.executeOneShot(
      TASK490_WORKER_DESCRIPTORS.authRestore,
      Object.freeze({ marker: MARKER })
    )
  ).rejects.toBeInstanceOf(WorkerProtocolError);
});

test("TASK-490 auth restore input validation matches the prepare contract", async () => {
  const registry = createTask490WorkerRegistry(stubHandlers());
  for (const input of [
    Object.freeze({ marker: BAD_MARKER }),
    Object.freeze({ marker: MARKER, nope: 1 }),
    Object.freeze({}),
  ]) {
    await expect(
      registry.executeOneShot(TASK490_WORKER_DESCRIPTORS.authRestore, input)
    ).rejects.toThrow();
  }
});
