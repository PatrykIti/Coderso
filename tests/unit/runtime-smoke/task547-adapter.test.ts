import { expect, test } from "bun:test";

import adapter, {
  assertExactTask547Invocation,
  projectTask547AdapterResult,
  runTask547Adapter,
} from "../../../scripts/runtime-smoke/adapters/task-547";
import { assertTask547SafeProjection } from "../../../scripts/runtime-smoke/adapters/task-547/assertions";
import type { Task547FinalCleanupProof } from "../../../scripts/runtime-smoke/adapters/task-547/cleanup";
import type { RuntimeSmokeContext } from "../../../scripts/runtime-smoke/lifecycle";
import type { WorkerPool } from "../../../scripts/runtime-smoke/workers/pool";

const hash = "d".repeat(64);

const proof: Task547FinalCleanupProof = {
  submissions: {
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
  reset: {
    schemaVersion: 1,
    restoredSlots: ["form", "home-page", "projects-page", "contact-page"],
    stateDigest: hash,
    statements: 4,
    rows: 4,
  },
  rollback: {
    schemaVersion: 1,
    officialRollbackCalls: 1,
    priorSettingsRestored: true,
    resourceAbsenceProved: true,
    rollbackDigest: hash,
    statements: 4,
    rows: 4,
  },
  terminal: {
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

test("TASK-547 adapter is registered for identical fast and certification contracts", () => {
  expect(adapter.suiteId).toBe("task-547");
  expect(adapter.supportedProfiles).toEqual(["fast", "certification"]);
});

test("TASK-547 adapter rejects invocation drift before repository or runtime side effects", async () => {
  let snapshots = 0;
  const base = {
    input: {
      command: "run",
      suite: "task-547",
      profile: "fast",
      session: "wf547-adapter",
    },
    repository: {
      async snapshot() {
        snapshots += 1;
        throw new Error("must not run");
      },
    },
  } as unknown as RuntimeSmokeContext;
  for (const input of [
    { ...base.input, suite: "task-540" },
    { ...base.input, profile: "other" },
    { ...base.input, command: "start" },
    { ...base.input, unknown: true },
  ]) {
    await expect(runTask547Adapter({ ...base, input } as never)).rejects.toThrow();
  }
  expect(snapshots).toBe(0);
  expect(() => assertExactTask547Invocation(base.input)).not.toThrow();
});

test("TASK-547 adapter projects only aggregate cleanup and shared worker counters", () => {
  const workers = {
    counters: () => ({
      starts: 1,
      requests: 24,
      reconnects: 0,
      databaseBatches: 23,
      statements: 42,
      rows: 19,
    }),
  } as unknown as WorkerPool;
  const result = projectTask547AdapterResult({
    accepted: {
      scenarios: Array.from({ length: 18 }, (_value, index) => ({
        id: `scenario-${index + 1}`,
        pass: true,
        elapsedMs: index + 1,
      })),
      observations: [],
      consoleErrors: [],
      pageErrors: [],
    },
    screenshots: Array.from({ length: 18 }, (_value, index) => ({
      path: `_docs/_workflows/_smoke/task-547/screenshots/shot-${index + 1}.png`,
      sha256: String(index).padStart(64, "0"),
    })),
    proof,
    workers,
    repositorySnapshots: 2,
  });
  expect(result).toMatchObject({
    pass: true,
    serverUp: true,
    cleanup: {
      deletedSubmissions: 5,
      deletedActionRuns: 2,
      restoredResourceSlots: 4,
      officialRollbackCalls: 1,
      workerStarts: 1,
      workerRequests: 24,
      repositorySnapshots: 2,
    },
  });
  assertTask547SafeProjection(result, ["private-api-key", "private-marker"]);
  expect(() =>
    assertTask547SafeProjection({ result, leaked: "private-api-key" }, ["private-api-key"])
  ).toThrow("private material");
});
