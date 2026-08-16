import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import { WorkerProtocolError } from "../../../scripts/runtime-smoke/workers/contracts";
import type { PlainJsonValue } from "../../../scripts/runtime-smoke/workers/contracts";
import {
  TASK491_WORKER_DESCRIPTORS,
  TASK491_WORKER_OPERATION_IDS,
  assertTask491WorkerDescriptorParity,
  createTask491WorkerRegistry,
  type Task491AuthPrepareOutput,
  type Task491AuthRestoreOutput,
  type Task491WorkerHandlers,
} from "../../../scripts/runtime-smoke/adapters/task-491/worker-operations";

const MARKER = "a1b2c3d4e5f6";
const BAD_MARKER = "not-a-marker!";

const CANONICAL_PREPARE: Task491AuthPrepareOutput = Object.freeze({
  schemaVersion: 1,
  prepared: true,
  changed: true,
  windowSeconds: 5,
  maxRequests: 10,
});

const CANONICAL_RESTORE: Task491AuthRestoreOutput = Object.freeze({
  schemaVersion: 1,
  restored: true,
});

function stubHandlers(overrides: Partial<Task491WorkerHandlers> = {}): Task491WorkerHandlers {
  return {
    install: async () => {
      throw new WorkerProtocolError("stub install is not under test");
    },
    checkpoint: async () => {
      throw new WorkerProtocolError("stub checkpoint is not under test");
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

test("TASK-491 auth-window operations are part of the canonical worker operation set", () => {
  expect([...TASK491_WORKER_OPERATION_IDS].sort()).toEqual(
    [
      "task-491/auth-window/prepare",
      "task-491/auth-window/restore",
      "task-491/checkpoint",
      "task-491/cleanup",
      "task-491/install",
      "task-491/prove",
    ].sort()
  );
  expect(TASK491_WORKER_DESCRIPTORS.authPrepare.operationId).toBe("task-491/auth-window/prepare");
  expect(TASK491_WORKER_DESCRIPTORS.authRestore.operationId).toBe("task-491/auth-window/restore");
  expect(TASK491_WORKER_DESCRIPTORS.authPrepare.retryClass).toBe("mutation");
  expect(TASK491_WORKER_DESCRIPTORS.authRestore.retryClass).toBe("mutation");
  expect(TASK491_WORKER_DESCRIPTORS.authPrepare.profileId).toBe("task-491-db");
  expect(TASK491_WORKER_DESCRIPTORS.authRestore.profileId).toBe("task-491-db");
});

test("TASK-491 registry registers every operation and passes descriptor parity", () => {
  const registry = createTask491WorkerRegistry(stubHandlers());
  expect(registry.ids()).toEqual([...TASK491_WORKER_OPERATION_IDS].sort());
  assertTask491WorkerDescriptorParity(registry.descriptors());
});

test("TASK-491 auth-window descriptors are stable, sha256-pinned contracts", () => {
  const { authPrepare, authRestore } = TASK491_WORKER_DESCRIPTORS;
  const operationDigest = createHash("sha256")
    .update(JSON.stringify({ version: 1, operations: TASK491_WORKER_OPERATION_IDS }))
    .digest("hex");
  const pinned = (operationId: string) =>
    createHash("sha256").update(`${operationDigest}\0${operationId}`).digest("hex");
  expect(authPrepare.sourceSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(authPrepare.sourceSha256).toBe(pinned("task-491/auth-window/prepare"));
  expect(authPrepare.inputSchemaId).toBe("task-491-auth-window-prepare-input-v1");
  expect(authPrepare.outputSchemaId).toBe("task-491-auth-window-prepare-output-v1");
  expect(authRestore.sourceSha256).toBe(pinned("task-491/auth-window/restore"));
  expect(authRestore.inputSchemaId).toBe("task-491-auth-window-restore-input-v1");
  expect(authRestore.outputSchemaId).toBe("task-491-auth-window-restore-output-v1");
});

test("TASK-491 auth prepare executes through the registry with the canonical marker", async () => {
  const registry = createTask491WorkerRegistry(stubHandlers());
  const output = (await registry.executeOneShot(
    TASK491_WORKER_DESCRIPTORS.authPrepare,
    Object.freeze({ marker: MARKER })
  )) as PlainJsonValue;
  expect(output).toEqual(CANONICAL_PREPARE);
});

test("TASK-491 auth prepare rejects malformed markers and unknown keys", async () => {
  const registry = createTask491WorkerRegistry(stubHandlers());
  for (const input of [
    Object.freeze({ marker: BAD_MARKER }),
    Object.freeze({ marker: "" }),
    Object.freeze({ marker: MARKER, extra: true }),
    Object.freeze({}),
  ]) {
    expect(
      registry
        .executeOneShot(TASK491_WORKER_DESCRIPTORS.authPrepare, input)
        .then(() => "accepted")
        .catch(() => "rejected")
    ).resolves.toBe("rejected");
  }
});

test("TASK-491 auth prepare rejects a drifted output envelope", async () => {
  const registry = createTask491WorkerRegistry(
    stubHandlers({
      prepareAuthWindow: async () =>
        Object.freeze({
          schemaVersion: 1,
          prepared: true,
          changed: true,
          windowSeconds: 0,
          maxRequests: 10,
        }) as unknown as Task491AuthPrepareOutput,
    })
  );
  await expect(
    registry.executeOneShot(
      TASK491_WORKER_DESCRIPTORS.authPrepare,
      Object.freeze({ marker: MARKER })
    )
  ).rejects.toBeInstanceOf(WorkerProtocolError);
});

test("TASK-491 auth restore executes through the registry and rejects drift", async () => {
  const registry = createTask491WorkerRegistry(stubHandlers());
  const output = (await registry.executeOneShot(
    TASK491_WORKER_DESCRIPTORS.authRestore,
    Object.freeze({ marker: MARKER })
  )) as PlainJsonValue;
  expect(output).toEqual(CANONICAL_RESTORE);
  const drifted = createTask491WorkerRegistry(
    stubHandlers({
      restoreAuthWindow: async () =>
        Object.freeze({ schemaVersion: 1, restored: false }) as unknown as Task491AuthRestoreOutput,
    })
  );
  await expect(
    drifted.executeOneShot(
      TASK491_WORKER_DESCRIPTORS.authRestore,
      Object.freeze({ marker: MARKER })
    )
  ).rejects.toBeInstanceOf(WorkerProtocolError);
});

test("TASK-491 auth restore input validation matches the prepare contract", async () => {
  const registry = createTask491WorkerRegistry(stubHandlers());
  for (const input of [
    Object.freeze({ marker: BAD_MARKER }),
    Object.freeze({ marker: MARKER, nope: 1 }),
    Object.freeze({}),
  ]) {
    await expect(
      registry.executeOneShot(TASK491_WORKER_DESCRIPTORS.authRestore, input)
    ).rejects.toThrow();
  }
});
