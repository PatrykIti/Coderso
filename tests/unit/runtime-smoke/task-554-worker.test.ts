import { expect, test } from "bun:test";

import {
  buildTask554CleanupLedger,
  buildTask554CleanupPlans,
  assertTask554PreIdentityAbsence,
  Task554AdminPathLease,
  Task554ProductionHandlers,
  type Task554ProductionHandlerDependencies,
} from "../../../scripts/runtime-smoke/adapters/task-554/production-handlers";
import {
  TASK554_WORKER_DESCRIPTORS,
  TASK554_WORKER_OPERATION_IDS,
  assertTask554FixtureMatrix,
  assertTask554WorkerDescriptorParity,
  createTask554InstallInput,
  createTask554WorkerRegistry,
  projectTask554WorkerEnvironment,
  type Task554CleanupOutput,
  type Task554InstallOutput,
  type Task554ProofOutput,
  type Task554ReadOutput,
  type Task554WorkerHandlers,
} from "../../../scripts/runtime-smoke/adapters/task-554/worker-operations";
import { buildTask554FixtureSpecs } from "../../../scripts/runtime-smoke/adapters/task-554/browser-actions";

const uuid = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const marker = "a".repeat(24);
const credentials = Object.freeze([
  Object.freeze({
    kind: "writer" as const,
    email: `task554-${marker}-writer@smoke.invalid`,
    password: "a".repeat(32),
  }),
  Object.freeze({
    kind: "publisher" as const,
    email: `task554-${marker}-publisher@smoke.invalid`,
    password: "b".repeat(32),
  }),
]);

const install: Task554InstallOutput = {
  schemaVersion: 1,
  runMarker: marker,
  actors: [
    { kind: "writer", userId: uuid(1), roleId: uuid(2) },
    { kind: "publisher", userId: uuid(3), roleId: uuid(4) },
  ],
  fixtures: buildTask554FixtureSpecs("fast").map((fixture, index) => ({
    scenarioId: fixture.scenarioId,
    variantId: fixture.variantId,
    postId: uuid(index + 5),
  })),
  statements: 4,
  rows: 11,
};

const cleanup: Task554CleanupOutput = {
  schemaVersion: 1,
  postChildrenRemoved: 0,
  accessLogsRemoved: 1,
  loginAuditRowsRemoved: 1,
  sessionsRemoved: 2,
  userRolesRemoved: 2,
  postsRemoved: 7,
  usersRemoved: 2,
  rolesRemoved: 2,
  preIdentityAbsenceProved: true,
  identityAbsenceProved: true,
  settingsRestored: true,
  statements: 17,
  rows: 17,
};

const proof: Task554ProofOutput = {
  schemaVersion: 1,
  fixturesAbsent: true,
  identitiesAbsent: true,
  settingsRestored: true,
  statements: 3,
  rows: 0,
};

function createAdminPathDependencies(
  initialValue: string | null,
  hashPassword: Task554ProductionHandlerDependencies["hashPassword"] = async () => {
    throw new Error("fixture hash failure");
  }
): Readonly<{
  readonly adminPathApplied: Promise<void>;
  readonly dependencies: Task554ProductionHandlerDependencies;
  readonly events: string[];
  readonly readValue: () => string | null;
}> {
  let value = initialValue;
  const events: string[] = [];
  let resolveAdminPathApplied: (() => void) | undefined;
  const adminPathApplied = new Promise<void>((resolve) => {
    resolveAdminPathApplied = resolve;
  });
  const dependencies: Task554ProductionHandlerDependencies = {
    async closeDatabase() {
      events.push("close-database");
    },
    async deleteSetting() {
      events.push("delete-setting");
      value = null;
    },
    async getSettingRecord() {
      events.push("get-setting");
      return value === null ? null : { value };
    },
    hashPassword,
    async setSetting(_key, nextValue) {
      events.push("set-setting");
      if (typeof nextValue !== "string") throw new Error("unexpected fixture setting value");
      value = nextValue;
      if (nextValue === "/admin") resolveAdminPathApplied?.();
    },
  };
  return Object.freeze({ adminPathApplied, dependencies, events, readValue: () => value });
}

function handlers(): Task554WorkerHandlers {
  let closed = false;
  return {
    async install() {
      return install;
    },
    async read(input) {
      return {
        schemaVersion: 1,
        postId: input.postId,
        status: "draft",
        scheduledAt: null,
        seoDescription: "safe fixture projection",
        statements: 1,
        rows: 1,
      } satisfies Task554ReadOutput;
    },
    async cleanup() {
      return cleanup;
    },
    async prove() {
      return proof;
    },
    async close() {
      closed = true;
    },
    async proveAbsent() {
      return closed;
    },
  };
}

test("TASK-554 worker owns the four strict registered operations and never returns credentials", async () => {
  const registry = createTask554WorkerRegistry(handlers());
  expect(registry.ids()).toEqual([...TASK554_WORKER_OPERATION_IDS].sort());
  assertTask554WorkerDescriptorParity(registry.descriptors());
  const input = createTask554InstallInput({
    profile: "fast",
    runMarker: marker,
    actors: credentials,
  });
  const output = await registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.install, input);
  expect(output).toMatchObject({
    schemaVersion: 1,
    runMarker: marker,
    fixtures: expect.any(Array),
  });
  expect(JSON.stringify(output)).not.toContain(credentials[0].password);
  expect(JSON.stringify(output)).not.toContain(credentials[1].password);
  await expect(
    registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.install, { ...input, unknown: true })
  ).rejects.toThrow("unknown or missing fields");
  await registry.close();
  expect(await registry.proveAbsent()).toBe(true);
});

test("TASK-554 production handler closes its database client once and fails closed", async () => {
  let closeCalls = 0;
  let signalDatabaseClose: (() => void) | undefined;
  const databaseCloseStarted = new Promise<void>((resolve) => {
    signalDatabaseClose = resolve;
  });
  let releaseClose: (() => void) | undefined;
  const closeStarted = new Promise<void>((resolve) => {
    releaseClose = resolve;
  });
  const handlers = new Task554ProductionHandlers(async () => {
    closeCalls += 1;
    signalDatabaseClose?.();
    await closeStarted;
  });

  const firstClose = handlers.close();
  const secondClose = handlers.close();
  await databaseCloseStarted;
  expect(closeCalls).toBe(1);
  expect(await handlers.proveAbsent()).toBe(false);
  releaseClose?.();
  await Promise.all([firstClose, secondClose]);
  expect(closeCalls).toBe(1);
  expect(await handlers.proveAbsent()).toBe(true);

  let failedCloseCalls = 0;
  const failedHandlers = new Task554ProductionHandlers(async () => {
    failedCloseCalls += 1;
    throw new Error("database shutdown failed");
  });
  await expect(failedHandlers.close()).rejects.toThrow("database shutdown failed");
  await expect(failedHandlers.close()).rejects.toThrow("database shutdown failed");
  expect(failedCloseCalls).toBe(1);
  expect(await failedHandlers.proveAbsent()).toBe(false);
});

test("TASK-554 admin path lease restores its exact existing snapshot during cleanup", async () => {
  const fixture = createAdminPathDependencies("/admin-panel");
  const lease = new Task554AdminPathLease(fixture.dependencies);

  await lease.apply();
  expect(fixture.readValue()).toBe("/admin");
  await lease.restore();

  expect(fixture.readValue()).toBe("/admin-panel");
  expect(lease.active).toBe(false);
  expect(lease.restored).toBe(true);
});

test("TASK-554 failed install restores existing and absent admin path snapshots", async () => {
  const installInput = createTask554InstallInput({
    profile: "fast",
    runMarker: marker,
    actors: credentials,
  });
  for (const baseline of ["/admin-panel", null] as const) {
    const fixture = createAdminPathDependencies(baseline);
    const handler = new Task554ProductionHandlers(fixture.dependencies);

    await expect(handler.install(installInput)).rejects.toThrow("fixture hash failure");
    expect(fixture.readValue()).toBe(baseline);
    expect(fixture.events).toEqual(
      baseline === null
        ? ["get-setting", "set-setting", "delete-setting", "get-setting"]
        : ["get-setting", "set-setting", "set-setting", "get-setting"]
    );
    await handler.close();
    expect(await handler.proveAbsent()).toBe(true);
  }
});

test("TASK-554 close restores an active admin path lease before closing the database", async () => {
  const installInput = createTask554InstallInput({
    profile: "fast",
    runMarker: marker,
    actors: credentials,
  });
  for (const baseline of ["/admin-panel", null] as const) {
    let rejectHash: ((error: Error) => void) | undefined;
    const hashPending = new Promise<string>((_resolve, reject) => {
      rejectHash = reject;
    });
    const fixture = createAdminPathDependencies(baseline, async () => hashPending);
    const handler = new Task554ProductionHandlers(fixture.dependencies);
    const installing = handler.install(installInput);
    await fixture.adminPathApplied;

    await handler.close();
    rejectHash?.(new Error("fixture hash cancellation"));
    await expect(installing).rejects.toThrow("fixture hash cancellation");
    expect(fixture.readValue()).toBe(baseline);
    expect(fixture.events.at(-1)).toBe("close-database");
    expect(await handler.proveAbsent()).toBe(true);
  }
});

test("TASK-554 shutdown preserves restoration and database failures without proving absence", async () => {
  let rejectHash: ((error: Error) => void) | undefined;
  const hashPending = new Promise<string>((_resolve, reject) => {
    rejectHash = reject;
  });
  const fixture = createAdminPathDependencies("/admin-panel", async () => hashPending);
  const handler = new Task554ProductionHandlers({
    ...fixture.dependencies,
    async closeDatabase() {
      throw new Error("fixture database close failure");
    },
    async setSetting(key, value) {
      if (value === "/admin") return fixture.dependencies.setSetting(key, value);
      throw new Error("fixture setting restoration failure");
    },
  });
  const installing = handler.install(
    createTask554InstallInput({ profile: "fast", runMarker: marker, actors: credentials })
  );
  await fixture.adminPathApplied;

  await expect(handler.close()).rejects.toBeInstanceOf(AggregateError);
  rejectHash?.(new Error("fixture hash cancellation"));
  await installing.catch((error: unknown) => {
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toContainEqual(
      expect.objectContaining({ message: "fixture hash cancellation" })
    );
  });
  expect(await handler.proveAbsent()).toBe(false);
});

test("TASK-554 worker rejects credential and exact fixture-matrix drift", async () => {
  const registry = createTask554WorkerRegistry(handlers());
  const input = createTask554InstallInput({
    profile: "certification",
    runMarker: marker,
    actors: credentials,
  });
  await expect(
    registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.install, {
      ...input,
      actors: [credentials[0]],
    })
  ).rejects.toThrow("actor identity set");
  const missingScenario = input.fixtures.filter(
    ({ scenarioId }) => scenarioId !== "publisher-archive"
  );
  const swappedVariant = input.fixtures.map((fixture, index, all) =>
    index === 0 ? { ...fixture, variantId: all[1]!.variantId } : fixture
  );
  const duplicatedScenario = input.fixtures.map((fixture, index) =>
    index === 4 ? { ...fixture, scenarioId: input.fixtures[0]!.scenarioId } : fixture
  );
  for (const fixtures of [missingScenario, swappedVariant, duplicatedScenario]) {
    await expect(
      registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.install, { ...input, fixtures })
    ).rejects.toThrow("fixture matrix");
  }
  expect(() => assertTask554FixtureMatrix("certification", input.fixtures)).not.toThrow();
  expect(() => assertTask554FixtureMatrix("fast", input.fixtures)).toThrow("fixture matrix");
  const read = await registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.read, { postId: uuid(5) });
  expect(read).toMatchObject({ postId: uuid(5), status: "draft", rows: 1 });
  await expect(
    registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.read, { postId: "not-a-uuid" })
  ).rejects.toThrow("post ID");
});

test("TASK-554 pre-identity proof rejects every remaining Post child relation", () => {
  const clean = {
    posts: [],
    accessLogs: [],
    auditLogs: [],
    postTermAssignments: [],
    postPreviewTokens: [],
    postRevisions: [],
    sessions: [],
    userRoles: [],
  };
  expect(() => assertTask554PreIdentityAbsence(clean)).not.toThrow();
  for (const child of ["postTermAssignments", "postPreviewTokens", "postRevisions"] as const) {
    expect(() => assertTask554PreIdentityAbsence({ ...clean, [child]: [{}] })).toThrow(
      "pre-identity absence"
    );
  }
});

test("TASK-554 cleanup derives the five applied FK-safe authorities from the shared ledger", () => {
  const fixtures = buildTask554FixtureSpecs("fast").map((fixture, index) => ({
    scenarioId: fixture.scenarioId,
    variantId: fixture.variantId,
    postId: uuid(index + 5),
  }));
  const ledger = buildTask554CleanupLedger({ marker, actors: install.actors, fixtures });
  const plans = buildTask554CleanupPlans(ledger);
  expect(ledger.entries).toHaveLength(26);
  expect(plans.map(({ batchId, wave }) => `${wave}:${batchId}`)).toEqual([
    "0:cleanup/task-554-db/wave-0",
    "1:cleanup/task-554-db/wave-1",
    "2:cleanup/task-554-db/wave-2",
    "3:cleanup/task-554-db/wave-3",
    "4:cleanup/task-554-db/wave-4",
  ]);
  expect(plans.map(({ resources }) => resources.length)).toEqual([13, 7, 2, 2, 2]);
  expect(plans[0]!.resources.map(({ kind }) => kind)).toContain("post-child");
  expect(plans[2]!.resources.map(({ kind }) => kind)).toEqual(["user-role", "user-role"]);
});

test("TASK-554 worker environment carries only the bounded server pepper needed for login parity", () => {
  const withoutPepper = projectTask554WorkerEnvironment({
    PATH: "/usr/bin",
    DATABASE_URL: "postgres://private",
    CODERSO_PLAYWRIGHT_EMAIL: "synthetic@example.test",
    CODERSO_PLAYWRIGHT_PASSWORD: "synthetic-password",
    PII_HASH_KEY: "private",
  });
  expect(withoutPepper).toEqual({
    PATH: "/usr/bin",
    DATABASE_URL: "postgres://private",
    DB_POOL_MAX: "1",
  });
  const withPepper = projectTask554WorkerEnvironment({
    PATH: "/usr/bin",
    DATABASE_URL: "postgres://private",
    AUTH_PASSWORD_PEPPER: "task554-private-pepper",
    CODERSO_PLAYWRIGHT_PASSWORD: "synthetic-password",
  });
  expect(withPepper).toEqual({
    PATH: "/usr/bin",
    DATABASE_URL: "postgres://private",
    AUTH_PASSWORD_PEPPER: "task554-private-pepper",
    DB_POOL_MAX: "1",
  });
  expect(JSON.stringify(withPepper)).not.toContain("synthetic-password");
  expect(() =>
    projectTask554WorkerEnvironment({
      PATH: "/usr/bin",
      DATABASE_URL: "postgres://private",
      AUTH_PASSWORD_PEPPER: "invalid\0pepper",
    })
  ).toThrow("password pepper");
});

test("TASK-554 cleanup and terminal proof validators require pre-identity and terminal absence", async () => {
  const registry = createTask554WorkerRegistry(handlers());
  expect(await registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.cleanup, {})).toMatchObject({
    preIdentityAbsenceProved: true,
    identityAbsenceProved: true,
  });
  expect(await registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.prove, {})).toMatchObject({
    fixturesAbsent: true,
    identitiesAbsent: true,
  });
  await expect(
    registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.cleanup, { replay: true })
  ).rejects.toThrow("unknown or missing fields");
});
