import { expect, test } from "bun:test";
import { resolve } from "node:path";

import {
  assertTask547WorkerDescriptorParity,
  createTask547WorkerRegistry,
  TASK547_WORKER_DESCRIPTORS,
  TASK547_WORKER_OPERATION_IDS,
  type Task547WorkerHandlers,
} from "../../../scripts/runtime-smoke/adapters/task-547/worker-operations";
import { WORKER_PROTOCOL_VERSION } from "../../../scripts/runtime-smoke/workers/contracts";
import {
  decodeWorkerResponseLine,
  encodeWorkerFrame,
} from "../../../scripts/runtime-smoke/workers/protocol";
import {
  createTask547WorkerPool,
  projectTask547WorkerEnvironment,
} from "../../../scripts/runtime-smoke/adapters/task-547/fixture";
import {
  RuntimeLifecycle,
  type RuntimeSmokeContext,
} from "../../../scripts/runtime-smoke/lifecycle";
import {
  ProcessSupervisor,
  type ProcessSpec,
} from "../../../scripts/runtime-smoke/process-supervisor";
import { TimingRecorder } from "../../../scripts/runtime-smoke/timing";

const ids = Array.from(
  { length: 7 },
  (_value, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
);
const hash = "a".repeat(64);
let closed = false;

const handlers: Task547WorkerHandlers = {
  async install() {
    return {
      schemaVersion: 1,
      sourceRunId: ids[0]!,
      actorId: ids[1]!,
      publicFormId: ids[2]!,
      internalFormId: ids[3]!,
      homePageId: ids[4]!,
      projectsPageId: ids[5]!,
      contactPageId: ids[6]!,
      apiKeySecret: "task547-secret-that-is-at-least-24-bytes",
      markers: {
        publicContact: "wf547-public-contact-aaaaaaaaaaaa",
        internalSession: "wf547-internal-session-aaaaaaaaaaaa",
        internalApiKey: "wf547-internal-api-aaaaaaaaaaaa",
        formDesign: "wf547-form-design-aaaaaaaaaaaa",
        pageEditor: "wf547-page-editor-aaaaaaaaaaaa",
      },
      installedDigest: hash,
      lifecycle: {
        stagedThenPublished: ["page", "entry", "detail_page", "menu"],
        directPublished: ["form"],
        statusless: ["listing_template"],
        enabledOnlyOnAction: true,
      },
      statements: 2,
      rows: 7,
    };
  },
  async checkpoint(input) {
    return {
      schemaVersion: 1,
      scenarioId: input.scenarioId,
      attachedCount: input.submissionIds.length,
      attachedDigest: hash,
      resourceDigest: hash,
      statements: 1,
      rows: input.submissionIds.length,
    };
  },
  async cleanup() {
    return {
      schemaVersion: 1,
      deletedSubmissions: 5,
      deletedActionRuns: 2,
      markerDigest: hash,
      idDigest: hash,
      remainingSubmissionRows: [],
      remainingTempArtifacts: [],
      statements: 3,
      rows: 7,
    };
  },
  async reset() {
    return {
      schemaVersion: 1,
      restoredSlots: ["form"],
      stateDigest: hash,
      statements: 1,
      rows: 1,
    };
  },
  async rollback() {
    return {
      schemaVersion: 1,
      officialRollbackCalls: 1,
      priorSettingsRestored: true,
      resourceAbsenceProved: true,
      rollbackDigest: hash,
      statements: 2,
      rows: 1,
    };
  },
  async prove() {
    return {
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
    };
  },
  async close() {
    closed = true;
  },
  async proveAbsent() {
    return closed;
  },
};

test("TASK-547 worker registry owns one bounded DB profile and strict operation set", async () => {
  const registry = createTask547WorkerRegistry(handlers);
  expect(registry.ids()).toEqual([...TASK547_WORKER_OPERATION_IDS].sort());
  assertTask547WorkerDescriptorParity(registry.descriptors());
  const installed = await registry.executeOneShot(TASK547_WORKER_DESCRIPTORS.install, {
    nonce: "aaaaaaaaaaaa",
  });
  expect(installed).toMatchObject({ schemaVersion: 1, installedDigest: hash });
  const checkpoint = await registry.executeOneShot(TASK547_WORKER_DESCRIPTORS.checkpoint, {
    scenarioId: "home-desktop-effects",
    submissionIds: [],
    resourceSlots: [],
  });
  expect(checkpoint).toMatchObject({ scenarioId: "home-desktop-effects", attachedCount: 0 });
  await expect(
    registry.executeOneShot(TASK547_WORKER_DESCRIPTORS.install, {
      nonce: "aaaaaaaaaaaa",
      unknown: true,
    })
  ).rejects.toThrow("unknown or missing fields");
  await registry.close();
  expect(await registry.proveAbsent()).toBe(true);
});

test("TASK-547 checkpoint validation rejects unregistered mutation and submission shapes", async () => {
  const registry = createTask547WorkerRegistry(handlers);
  await expect(
    registry.executeOneShot(TASK547_WORKER_DESCRIPTORS.checkpoint, {
      scenarioId: "contact-form",
      submissionIds: [],
      resourceSlots: [],
    })
  ).rejects.toThrow("contract drifted");
  await expect(
    registry.executeOneShot(TASK547_WORKER_DESCRIPTORS.checkpoint, {
      scenarioId: "form-design-author-light",
      submissionIds: [],
      resourceSlots: ["home-page"],
    })
  ).rejects.toThrow("contract drifted");
  await expect(
    registry.executeOneShot(TASK547_WORKER_DESCRIPTORS.checkpoint, {
      scenarioId: "page-editor-publish-front-parity",
      submissionIds: ["11111111-1111-4111-8111-111111111111"],
      resourceSlots: [],
    })
  ).rejects.toThrow("contract drifted");
});

test("TASK-547 install output survives canonical worker frame key ordering", async () => {
  const registry = createTask547WorkerRegistry(handlers);
  const output = await handlers.install({ nonce: "aaaaaaaaaaaa" });
  const encoded = encodeWorkerFrame(
    {
      protocol: WORKER_PROTOCOL_VERSION,
      requestId: 1,
      ok: true,
      output,
    },
    128 * 1024
  );
  const decoded = decodeWorkerResponseLine(encoded.subarray(0, encoded.byteLength - 1), 128 * 1024);
  if (!decoded.ok) throw new Error("task_547_worker_round_trip_failed");

  expect(() =>
    registry.validateDescriptor(TASK547_WORKER_DESCRIPTORS.install).validateOutput(decoded.output)
  ).not.toThrow();
});

test("TASK-547 worker maps the canonical repository admin identity without inheriting its password", () => {
  const projected = projectTask547WorkerEnvironment({
    PATH: "/usr/bin",
    DATABASE_URL: "postgres://private",
    PII_HASH_KEY: "private-hash",
    PII_ENC_KEY: "private-encryption",
    MEDIA_SECRET_MASTER_KEY: "private-media",
    ADMIN_EMAIL: "admin@example.test",
    ADMIN_PASSWORD: "must-not-reach-db-worker",
    UNRELATED_SECRET: "must-not-reach-db-worker",
  });
  expect(projected.CODERSO_PLAYWRIGHT_EMAIL).toBe("admin@example.test");
  expect(projected.DB_POOL_MAX).toBe("1");
  expect(projected).not.toHaveProperty("ADMIN_EMAIL");
  expect(projected).not.toHaveProperty("ADMIN_PASSWORD");
  expect(projected).not.toHaveProperty("UNRELATED_SECRET");
});

test("TASK-547 worker profile reaches bounded process supervision with a valid request timeout", async () => {
  class RejectingSupervisor extends ProcessSupervisor {
    started = false;

    override async start(_spec: ProcessSpec): Promise<never> {
      this.started = true;
      throw new Error("bounded-before-spawn");
    }
  }

  const root = resolve(import.meta.dir, "../../..");
  const lifecycle = new RuntimeLifecycle();
  const processes = new RejectingSupervisor(root);
  lifecycle.register(processes);
  const context: RuntimeSmokeContext = {
    input: {
      command: "run",
      suite: "task-547",
      profile: "fast",
      session: "wf547-timeout-test",
    },
    root,
    lifecycle,
    timing: new TimingRecorder(),
    processes,
    repository: {} as RuntimeSmokeContext["repository"],
  };
  const workers = await createTask547WorkerPool(context, createTask547WorkerRegistry(handlers), {
    PATH: process.env.PATH,
    DATABASE_URL: "postgres://private",
    PII_HASH_KEY: "private-hash",
    PII_ENC_KEY: "private-encryption",
    MEDIA_SECRET_MASTER_KEY: "private-media",
    ADMIN_EMAIL: "admin@example.test",
  });

  await expect(workers.forProfile("task-547-db")).rejects.toThrow("bounded-before-spawn");
  expect(processes.started).toBe(true);
  expect((await lifecycle.closeAllNeverThrow()).pass).toBe(true);
});
