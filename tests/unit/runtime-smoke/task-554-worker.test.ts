import { expect, test } from "bun:test";

import {
  buildTask554CleanupLedger,
  buildTask554CleanupPlans,
  assertTask554PreIdentityAbsence,
  Task554ProductionHandlers,
  type Task554FixtureInstallResult,
  type Task554FixtureRecoveryPersistence,
  type Task554ProductionHandlerDependencies,
  type Task554RemovalCounts,
} from "../../../scripts/runtime-smoke/adapters/task-554/production-handlers";
import {
  TASK554_ROUTING_SETTING_KEYS,
  Task554RoutingSettingsLease,
  assertTask554RecoveryReceipt,
  createTask554RecoveryReceipt,
  type Task554RoutingSettingKey,
  type Task554RoutingSettingRecord,
  type Task554RoutingSettingsLeaseState,
  type Task554RoutingSettingsOwnedRecord,
  type Task554RoutingSettingsPersistence,
  type Task554RoutingSettingsSnapshot,
} from "../../../scripts/runtime-smoke/adapters/task-554/routing-settings-lease";
import {
  TASK554_WORKER_DESCRIPTORS,
  TASK554_WORKER_OPERATION_IDS,
  assertTask554FixtureMatrix,
  assertTask554WorkerDescriptorParity,
  createTask554InstallInput,
  createTask554RecoveryAuthority,
  createTask554WorkerRegistry,
  projectTask554WorkerEnvironment,
  type Task554CleanupOutput,
  type Task554InstallOutput,
  type Task554ProofOutput,
  type Task554ReadOutput,
  type Task554RecoveryAuthority,
  type Task554WorkerHandlers,
} from "../../../scripts/runtime-smoke/adapters/task-554/worker-operations";
import { buildTask554FixtureSpecs } from "../../../scripts/runtime-smoke/adapters/task-554/browser-actions";

const uuid = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const marker = "a".repeat(24);
const recoveryKey = Buffer.alloc(32, 7).toString("base64url");
const authority = createTask554RecoveryAuthority({
  profile: "fast",
  runMarker: marker,
  recoveryKey,
});
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

const installedOutput: Task554InstallOutput = {
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

type RoutingFixtureRecord = Readonly<{
  readonly updatedAt: string;
  readonly valueJson: string;
  readonly version: string;
}>;

function cloneRoutingRecord(
  key: Task554RoutingSettingKey,
  record: RoutingFixtureRecord
): Task554RoutingSettingRecord {
  return Object.freeze({
    key,
    updatedAt: record.updatedAt,
    valueJson: record.valueJson,
  });
}

class InMemoryRoutingSettingsPersistence implements Task554RoutingSettingsPersistence {
  readonly #records = new Map<Task554RoutingSettingKey, RoutingFixtureRecord>();
  readonly #events: string[];
  #nextVersion = 0;
  readonly #receipts = new Map<
    string,
    Readonly<{
      readonly authority: Task554RecoveryAuthority;
      readonly state: Task554RoutingSettingsLeaseState;
    }>
  >();
  #signalApplied: (() => void) | undefined;
  readonly applied = new Promise<void>((resolve) => {
    this.#signalApplied = resolve;
  });

  constructor(
    records: Partial<
      Readonly<Record<Task554RoutingSettingKey, Omit<RoutingFixtureRecord, "version">>>
    >,
    events: string[]
  ) {
    this.#events = events;
    for (const key of TASK554_ROUTING_SETTING_KEYS) {
      const record = records[key];
      if (record !== undefined) {
        this.#records.set(key, {
          updatedAt: record.updatedAt,
          valueJson: record.valueJson,
          version: this.#version(),
        });
      }
    }
  }

  read(key: Task554RoutingSettingKey): RoutingFixtureRecord | null {
    const record = this.#records.get(key);
    return record === undefined
      ? null
      : Object.freeze({
          updatedAt: record.updatedAt,
          valueJson: record.valueJson,
          version: record.version,
        });
  }

  rewriteSameTarget(key: Task554RoutingSettingKey): void {
    const record = this.#records.get(key);
    if (record === undefined) throw new Error("fixture routing record is absent");
    this.#records.set(key, { ...record, version: this.#version() });
  }

  hasReceipt(inputAuthority = authority): boolean {
    return this.#receipts.has(inputAuthority.runMarker);
  }

  receiptState(inputAuthority = authority): Task554RoutingSettingsLeaseState {
    const receipt = this.#receipts.get(inputAuthority.runMarker);
    if (receipt === undefined) throw new Error("fixture receipt is absent");
    this.#assertAuthority(receipt.authority, inputAuthority);
    return receipt.state;
  }

  async applyTargets(inputAuthority = authority): Promise<void> {
    this.#events.push("apply-routing");
    if (this.#receipts.has(inputAuthority.runMarker)) throw new Error("fixture receipt exists");
    const snapshot = this.#snapshot();
    for (const key of TASK554_ROUTING_SETTING_KEYS) {
      this.#records.set(key, {
        updatedAt: `2030-01-01 00:00:00.${String(this.#nextVersion).padStart(6, "0")}`,
        valueJson: key === "site.adminPath" ? '"/admin"' : "null",
        version: this.#version(),
      });
    }
    this.#signalApplied?.();
    this.#receipts.set(inputAuthority.runMarker, {
      authority: inputAuthority,
      state: Object.freeze({ snapshot, owned: this.#owned() }),
    });
  }

  async inspectRecovery(inputAuthority = authority): Promise<"absent" | "recoverable"> {
    const receipt = this.#receipts.get(inputAuthority.runMarker);
    if (receipt === undefined) return "absent";
    this.#assertAuthority(receipt.authority, inputAuthority);
    return "recoverable";
  }

  invalidate(): void {
    this.#events.push("invalidate-routing");
  }

  async restoreIfOwned(inputAuthority = authority): Promise<"absent" | "restored"> {
    const receipt = this.#receipts.get(inputAuthority.runMarker);
    if (receipt === undefined) return "absent";
    this.#assertAuthority(receipt.authority, inputAuthority);
    const state = receipt.state;
    this.#events.push("restore-routing");
    for (const key of TASK554_ROUTING_SETTING_KEYS) {
      const current = this.#records.get(key);
      const owned = state.owned[key];
      if (
        current === undefined ||
        current.version !== owned.version ||
        current.updatedAt !== owned.record.updatedAt ||
        current.valueJson !== owned.record.valueJson
      ) {
        throw new Error("fixture routing ownership drift");
      }
    }
    for (const key of TASK554_ROUTING_SETTING_KEYS) {
      const baseline = state.snapshot[key];
      if (baseline === null) {
        this.#records.delete(key);
      } else {
        this.#records.set(key, {
          updatedAt: baseline.updatedAt,
          valueJson: baseline.valueJson,
          version: this.#version(),
        });
      }
    }
    this.#receipts.delete(inputAuthority.runMarker);
    return "restored";
  }

  async proveReceiptAbsent(inputAuthority = authority): Promise<boolean> {
    const receipt = this.#receipts.get(inputAuthority.runMarker);
    if (receipt === undefined) return true;
    this.#assertAuthority(receipt.authority, inputAuthority);
    return false;
  }

  #assertAuthority(expected: Task554RecoveryAuthority, actual: Task554RecoveryAuthority): void {
    if (
      expected.schemaVersion !== actual.schemaVersion ||
      expected.runMarker !== actual.runMarker ||
      expected.profile !== actual.profile ||
      expected.recoveryKey !== actual.recoveryKey
    ) {
      throw new Error("fixture recovery authority drift");
    }
  }

  #owned(): Readonly<Record<Task554RoutingSettingKey, Task554RoutingSettingsOwnedRecord>> {
    return Object.freeze(
      Object.fromEntries(
        TASK554_ROUTING_SETTING_KEYS.map((key) => {
          const record = this.#records.get(key);
          if (record === undefined) throw new Error("fixture routing owned record is absent");
          return [
            key,
            Object.freeze({ record: cloneRoutingRecord(key, record), version: record.version }),
          ];
        })
      ) as Record<Task554RoutingSettingKey, Task554RoutingSettingsOwnedRecord>
    );
  }

  #snapshot(): Task554RoutingSettingsSnapshot {
    return Object.freeze(
      Object.fromEntries(
        TASK554_ROUTING_SETTING_KEYS.map((key) => {
          const record = this.#records.get(key);
          return [key, record === undefined ? null : cloneRoutingRecord(key, record)];
        })
      ) as Record<Task554RoutingSettingKey, Task554RoutingSettingRecord | null>
    );
  }

  #version(): string {
    this.#nextVersion += 1;
    return `fixture-version-${this.#nextVersion}`;
  }
}

class InMemoryTask554FixtureRecovery implements Task554FixtureRecoveryPersistence {
  #state: "absent" | "complete" | "partial" = "absent";
  readonly #authority: Task554RecoveryAuthority;
  installCalls = 0;
  removeCalls = 0;
  readonly unrelatedRows = 1;

  constructor(inputAuthority = authority) {
    this.#authority = inputAuthority;
  }
  async install(
    input: Parameters<Task554FixtureRecoveryPersistence["install"]>[0],
    passwordHashes: readonly string[]
  ): Promise<Task554FixtureInstallResult> {
    this.#assertAuthority(input.authority);
    if (this.#state !== "absent" || passwordHashes.length !== 2) {
      throw new Error("fixture install drift");
    }
    this.installCalls += 1;
    this.#state = "complete";
    return Object.freeze({
      actors: input.actors.map(({ kind }, index) => ({
        kind,
        userId: uuid(index * 2 + 1),
        roleId: uuid(index * 2 + 2),
      })),
      fixtures: input.fixtures.map((fixture, index) => ({
        scenarioId: fixture.scenarioId,
        variantId: fixture.variantId,
        postId: uuid(index + 5),
      })),
      statements: 4,
      rows: 4 + input.fixtures.length,
    });
  }
  async inspect(inputAuthority: Task554RecoveryAuthority): Promise<"absent" | "complete"> {
    this.#assertAuthority(inputAuthority);
    if (this.#state === "partial") throw new Error("fixture recovery matrix is partial");
    return this.#state;
  }
  async remove(inputAuthority: Task554RecoveryAuthority): Promise<Task554RemovalCounts> {
    this.#assertAuthority(inputAuthority);
    if (this.#state !== "complete") throw new Error("fixture recovery matrix is not complete");
    this.removeCalls += 1;
    this.#state = "absent";
    return Object.freeze({
      postChildrenRemoved: cleanup.postChildrenRemoved,
      accessLogsRemoved: cleanup.accessLogsRemoved,
      loginAuditRowsRemoved: cleanup.loginAuditRowsRemoved,
      sessionsRemoved: cleanup.sessionsRemoved,
      userRolesRemoved: cleanup.userRolesRemoved,
      postsRemoved: cleanup.postsRemoved,
      usersRemoved: cleanup.usersRemoved,
      rolesRemoved: cleanup.rolesRemoved,
    });
  }
  markPartial(): void {
    this.#state = "partial";
  }
  #assertAuthority(actual: Task554RecoveryAuthority): void {
    if (
      actual.schemaVersion !== this.#authority.schemaVersion ||
      actual.runMarker !== this.#authority.runMarker ||
      actual.profile !== this.#authority.profile ||
      actual.recoveryKey !== this.#authority.recoveryKey
    ) {
      throw new Error("fixture recovery authority drift");
    }
  }
}

function createRoutingDependencies(
  records: Partial<
    Readonly<Record<Task554RoutingSettingKey, Omit<RoutingFixtureRecord, "version">>>
  >,
  hashPassword: Task554ProductionHandlerDependencies["hashPassword"] = async () => {
    throw new Error("fixture hash failure");
  }
): Readonly<{
  readonly dependencies: Task554ProductionHandlerDependencies;
  readonly events: string[];
  readonly fixtureRecovery: InMemoryTask554FixtureRecovery;
  readonly routing: InMemoryRoutingSettingsPersistence;
}> {
  const events: string[] = [];
  const routing = new InMemoryRoutingSettingsPersistence(records, events);
  const fixtureRecovery = new InMemoryTask554FixtureRecovery();
  const dependencies: Task554ProductionHandlerDependencies = {
    async closeDatabase() {
      events.push("close-database");
    },
    fixtureRecovery,
    hashPassword,
    afterFixtureCommit() {},
    routingSettings: routing,
    async getSecuritySettings() {
      events.push("get-security-settings");
      return {
        rateLimit: { enabled: true, buckets: {} as never },
      } as never;
    },
    async setSecuritySettings() {
      events.push("set-security-settings");
      return { rateLimit: { enabled: false, buckets: {} as never } } as never;
    },
  };
  return Object.freeze({ dependencies, events, fixtureRecovery, routing });
}

function handlers(): Task554WorkerHandlers {
  let closed = false;
  return {
    async install() {
      return installedOutput;
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
    recoveryKey,
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
  expect(JSON.stringify(output)).not.toContain(recoveryKey);
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

test("TASK-554 routing lease restores the exact three-setting snapshot", async () => {
  const baseline = {
    "site.adminPath": {
      updatedAt: "2026-08-10 12:34:56.123456",
      valueJson: '"/admin-panel"',
    },
    "site.adminBaseUrl": {
      updatedAt: "2026-08-10 12:34:57.234567",
      valueJson: '"https://admin.example.test"',
    },
    "site.publicBaseUrl": {
      updatedAt: "2026-08-10 12:34:58.345678",
      valueJson: '"https://www.example.test"',
    },
  } satisfies Partial<
    Readonly<Record<Task554RoutingSettingKey, Omit<RoutingFixtureRecord, "version">>>
  >;
  const fixture = createRoutingDependencies(baseline);
  const lease = new Task554RoutingSettingsLease(fixture.routing);

  await lease.apply(authority);
  expect(fixture.routing.read("site.adminPath")).toMatchObject({ valueJson: '"/admin"' });
  expect(fixture.routing.read("site.adminBaseUrl")).toMatchObject({ valueJson: "null" });
  expect(fixture.routing.read("site.publicBaseUrl")).toMatchObject({ valueJson: "null" });
  await lease.restore();

  for (const key of TASK554_ROUTING_SETTING_KEYS) {
    expect(fixture.routing.read(key)).toMatchObject(baseline[key]!);
  }
  expect(fixture.events).toEqual([
    "apply-routing",
    "invalidate-routing",
    "restore-routing",
    "invalidate-routing",
  ]);
  expect(lease.active).toBe(false);
  expect(lease.restored).toBe(true);
});

test("TASK-554 routing lease deletes absent baseline rows and rejects version ownership drift", async () => {
  const existing = {
    "site.adminPath": {
      updatedAt: "2026-08-10 12:34:56.123456",
      valueJson: '"/admin-panel"',
    },
  } satisfies Partial<
    Readonly<Record<Task554RoutingSettingKey, Omit<RoutingFixtureRecord, "version">>>
  >;
  const deletionFixture = createRoutingDependencies(existing);
  const deletionLease = new Task554RoutingSettingsLease(deletionFixture.routing);
  await deletionLease.apply(authority);
  await deletionLease.restore();
  expect(deletionFixture.routing.read("site.adminPath")).toMatchObject(existing["site.adminPath"]!);
  expect(deletionFixture.routing.read("site.adminBaseUrl")).toBeNull();
  expect(deletionFixture.routing.read("site.publicBaseUrl")).toBeNull();

  const driftFixture = createRoutingDependencies(existing);
  const driftLease = new Task554RoutingSettingsLease(driftFixture.routing);
  await driftLease.apply(authority);
  const owned = driftFixture.routing.read("site.adminPath")!;
  driftFixture.routing.rewriteSameTarget("site.adminPath");
  const drifted = driftFixture.routing.read("site.adminPath")!;
  expect(drifted).toMatchObject({
    updatedAt: owned.updatedAt,
    valueJson: owned.valueJson,
  });
  expect(drifted.version).not.toBe(owned.version);
  await expect(driftLease.restore()).rejects.toThrow("ownership drift");
  expect(driftFixture.routing.read("site.adminPath")).toEqual(drifted);
  expect(driftFixture.routing.read("site.adminBaseUrl")).toMatchObject({ valueJson: "null" });
  expect(driftFixture.routing.read("site.publicBaseUrl")).toMatchObject({ valueJson: "null" });
  expect(driftLease.active).toBe(true);
  expect(driftLease.restored).toBe(false);
});

test("TASK-554 routing lease restores after post-commit cache invalidation fails", async () => {
  const baseline = {
    "site.adminPath": {
      updatedAt: "2026-08-10 12:34:56.123456",
      valueJson: '"/admin-panel"',
    },
  } satisfies Partial<
    Readonly<Record<Task554RoutingSettingKey, Omit<RoutingFixtureRecord, "version">>>
  >;
  const fixture = createRoutingDependencies(baseline);
  let invalidateFailed = false;
  const persistence: Task554RoutingSettingsPersistence = {
    applyTargets: (inputAuthority) => fixture.routing.applyTargets(inputAuthority),
    inspectRecovery: (inputAuthority) => fixture.routing.inspectRecovery(inputAuthority),
    invalidate() {
      fixture.routing.invalidate();
      if (!invalidateFailed) {
        invalidateFailed = true;
        throw new Error("fixture cache invalidation failure");
      }
    },
    restoreIfOwned: (inputAuthority) => fixture.routing.restoreIfOwned(inputAuthority),
    proveReceiptAbsent: (inputAuthority) => fixture.routing.proveReceiptAbsent(inputAuthority),
  };
  const lease = new Task554RoutingSettingsLease(persistence);

  await expect(lease.apply(authority)).rejects.toThrow("cache invalidation failure");
  expect(lease.active).toBe(true);
  await lease.restore();

  expect(fixture.routing.read("site.adminPath")).toMatchObject(baseline["site.adminPath"]!);
  expect(fixture.routing.read("site.adminBaseUrl")).toBeNull();
  expect(fixture.routing.read("site.publicBaseUrl")).toBeNull();
  expect(lease.restored).toBe(true);
});

test("TASK-554 routing lease retains logical restoration when restore invalidation fails", async () => {
  const fixture = createRoutingDependencies({
    "site.adminPath": {
      updatedAt: "2026-08-10 12:34:56.123456",
      valueJson: '"/admin-panel"',
    },
  });
  let invalidationCalls = 0;
  const persistence: Task554RoutingSettingsPersistence = {
    applyTargets: (inputAuthority) => fixture.routing.applyTargets(inputAuthority),
    inspectRecovery: (inputAuthority) => fixture.routing.inspectRecovery(inputAuthority),
    invalidate() {
      fixture.routing.invalidate();
      invalidationCalls += 1;
      if (invalidationCalls === 2) {
        throw new Error("fixture restore cache invalidation failure");
      }
    },
    restoreIfOwned: (inputAuthority) => fixture.routing.restoreIfOwned(inputAuthority),
    proveReceiptAbsent: (inputAuthority) => fixture.routing.proveReceiptAbsent(inputAuthority),
  };
  const lease = new Task554RoutingSettingsLease(persistence);

  await lease.apply(authority);
  await expect(lease.restore()).rejects.toThrow("restore cache invalidation failure");
  expect(lease.active).toBe(false);
  expect(lease.restored).toBe(true);
  await expect(lease.restore()).rejects.toThrow("restore cache invalidation failure");
  expect(fixture.events.filter((event) => event === "restore-routing")).toHaveLength(1);
});

test("TASK-554 close preserves restore-invalidation failure without retrying the ownership CAS", async () => {
  const fixture = createRoutingDependencies({
    "site.adminPath": {
      updatedAt: "2026-08-10 12:34:56.123456",
      valueJson: '"/admin-panel"',
    },
  });
  let invalidationCalls = 0;
  const persistence: Task554RoutingSettingsPersistence = {
    applyTargets: (inputAuthority) => fixture.routing.applyTargets(inputAuthority),
    inspectRecovery: (inputAuthority) => fixture.routing.inspectRecovery(inputAuthority),
    invalidate() {
      fixture.routing.invalidate();
      invalidationCalls += 1;
      if (invalidationCalls === 2) {
        throw new Error("fixture restore cache invalidation failure");
      }
    },
    restoreIfOwned: (inputAuthority) => fixture.routing.restoreIfOwned(inputAuthority),
    proveReceiptAbsent: (inputAuthority) => fixture.routing.proveReceiptAbsent(inputAuthority),
  };
  const handler = new Task554ProductionHandlers({
    ...fixture.dependencies,
    routingSettings: persistence,
  });

  await expect(
    handler.install(
      createTask554InstallInput({
        profile: "fast",
        runMarker: marker,
        recoveryKey,
        actors: credentials,
      })
    )
  ).rejects.toBeInstanceOf(AggregateError);
  await expect(handler.close()).rejects.toThrow("restore cache invalidation failure");
  expect(fixture.events.filter((event) => event === "restore-routing")).toHaveLength(1);
  expect(fixture.events.at(-1)).toBe("close-database");
});

test("TASK-554 failed install restores existing and absent routing settings", async () => {
  const installInput = createTask554InstallInput({
    profile: "fast",
    runMarker: marker,
    recoveryKey,
    actors: credentials,
  });
  const existing = {
    "site.adminPath": {
      updatedAt: "2026-08-10 12:34:56.123456",
      valueJson: '"/admin-panel"',
    },
    "site.adminBaseUrl": {
      updatedAt: "2026-08-10 12:34:57.234567",
      valueJson: '"https://admin.example.test"',
    },
    "site.publicBaseUrl": {
      updatedAt: "2026-08-10 12:34:58.345678",
      valueJson: '"https://www.example.test"',
    },
  } satisfies Partial<
    Readonly<Record<Task554RoutingSettingKey, Omit<RoutingFixtureRecord, "version">>>
  >;
  const baselines: readonly Partial<
    Readonly<Record<Task554RoutingSettingKey, Omit<RoutingFixtureRecord, "version">>>
  >[] = [existing, {}];
  for (const baseline of baselines) {
    const fixture = createRoutingDependencies(baseline);
    const handler = new Task554ProductionHandlers(fixture.dependencies);

    await expect(handler.install(installInput)).rejects.toThrow("fixture hash failure");
    for (const key of TASK554_ROUTING_SETTING_KEYS) {
      const expected = baseline[key];
      const actual = fixture.routing.read(key);
      expected === undefined ? expect(actual).toBeNull() : expect(actual).toMatchObject(expected);
    }
    await handler.close();
    expect(await handler.proveAbsent()).toBe(true);
  }
});

test("TASK-554 close restores active routing settings before database close", async () => {
  let rejectHash: ((error: Error) => void) | undefined;
  const hashPending = new Promise<string>((_resolve, reject) => {
    rejectHash = reject;
  });
  const baseline = {
    "site.adminPath": {
      updatedAt: "2026-08-10 12:34:56.123456",
      valueJson: '"/admin-panel"',
    },
  } satisfies Partial<
    Readonly<Record<Task554RoutingSettingKey, Omit<RoutingFixtureRecord, "version">>>
  >;
  const fixture = createRoutingDependencies(baseline, async () => hashPending);
  const handler = new Task554ProductionHandlers(fixture.dependencies);
  const installing = handler.install(
    createTask554InstallInput({
      profile: "fast",
      runMarker: marker,
      recoveryKey,
      actors: credentials,
    })
  );
  await fixture.routing.applied;

  await handler.close();
  rejectHash?.(new Error("fixture hash cancellation"));
  await expect(installing).rejects.toThrow("fixture hash cancellation");
  expect(fixture.routing.read("site.adminPath")).toMatchObject(baseline["site.adminPath"]!);
  expect(fixture.events.indexOf("restore-routing")).toBeLessThan(
    fixture.events.indexOf("close-database")
  );
  expect(await handler.proveAbsent()).toBe(true);
});

test("TASK-554 shutdown aggregates routing restoration and database failures", async () => {
  let rejectHash: ((error: Error) => void) | undefined;
  const hashPending = new Promise<string>((_resolve, reject) => {
    rejectHash = reject;
  });
  const fixture = createRoutingDependencies(
    {
      "site.adminPath": {
        updatedAt: "2026-08-10 12:34:56.123456",
        valueJson: '"/admin-panel"',
      },
    },
    async () => hashPending
  );
  const failingRouting: Task554RoutingSettingsPersistence = {
    applyTargets: (inputAuthority) => fixture.routing.applyTargets(inputAuthority),
    inspectRecovery: (inputAuthority) => fixture.routing.inspectRecovery(inputAuthority),
    invalidate: () => fixture.routing.invalidate(),
    async restoreIfOwned() {
      throw new Error("fixture routing restoration failure");
    },
    proveReceiptAbsent: (inputAuthority) => fixture.routing.proveReceiptAbsent(inputAuthority),
  };
  const handler = new Task554ProductionHandlers({
    ...fixture.dependencies,
    async closeDatabase() {
      throw new Error("fixture database close failure");
    },
    routingSettings: failingRouting,
  });
  const installing = handler.install(
    createTask554InstallInput({
      profile: "fast",
      runMarker: marker,
      recoveryKey,
      actors: credentials,
    })
  );
  await fixture.routing.applied;

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

test("TASK-554 fresh handler recovers a lost install response and retains drift authority", async () => {
  const input = createTask554InstallInput({
    profile: "fast",
    runMarker: marker,
    recoveryKey,
    actors: credentials,
  });
  const fixture = createRoutingDependencies({}, async () => "fixture-password-hash");
  const first = new Task554ProductionHandlers(fixture.dependencies);
  await first.install(input);
  await first.close();
  expect(await first.proveAbsent()).toBe(false);
  expect(fixture.routing.hasReceipt()).toBe(true);
  const replacement = new Task554ProductionHandlers(fixture.dependencies);
  const recovered = await replacement.cleanup(authority);
  expect(recovered).toMatchObject({ postsRemoved: 7, settingsRestored: true, rows: 17 });
  expect(await replacement.prove(authority)).toMatchObject({ fixturesAbsent: true });
  await replacement.close();
  expect(await replacement.proveAbsent()).toBe(true);
  expect(fixture.fixtureRecovery.installCalls).toBe(1);
  expect(fixture.fixtureRecovery.removeCalls).toBe(1);
  expect(fixture.fixtureRecovery.unrelatedRows).toBe(1);
  expect(fixture.routing.hasReceipt()).toBe(false);
  for (const key of TASK554_ROUTING_SETTING_KEYS) expect(fixture.routing.read(key)).toBeNull();
  const drift = createRoutingDependencies({}, async () => "fixture-password-hash");
  const lost = new Task554ProductionHandlers(drift.dependencies);
  await lost.install(input);
  await lost.close();
  drift.fixtureRecovery.markPartial();
  const receipt = createTask554RecoveryReceipt(authority, drift.routing.receiptState());
  expect(() => assertTask554RecoveryReceipt(receipt, authority)).not.toThrow();
  const tampered = {
    ...receipt,
    snapshot: { ...receipt.snapshot, "site.adminPath": { valueJson: '"/drift"', updatedAt: "x" } },
  };
  expect(() => assertTask554RecoveryReceipt(tampered, authority)).toThrow("HMAC");
  const blocked = new Task554ProductionHandlers(drift.dependencies);
  await expect(blocked.cleanup(authority)).rejects.toThrow("matrix is partial");
  await blocked.close();
  expect(await blocked.proveAbsent()).toBe(false);
  expect(drift.fixtureRecovery.removeCalls).toBe(0);
  expect(drift.routing.hasReceipt()).toBe(true);
  expect(drift.events.filter((event) => event === "restore-routing")).toHaveLength(0);
  const postCommit = createRoutingDependencies({}, async () => "fixture-password-hash");
  const faulted = new Task554ProductionHandlers({
    ...postCommit.dependencies,
    afterFixtureCommit() {
      throw new Error("fixture post-commit response loss");
    },
  });
  await expect(faulted.install(input)).rejects.toThrow("post-commit response loss");
  await faulted.close();
  expect(await faulted.proveAbsent()).toBe(false);
  expect(postCommit.routing.hasReceipt()).toBe(true);
  expect(postCommit.events.filter((event) => event === "restore-routing")).toHaveLength(0);
  const cleanedResponseLost = createRoutingDependencies({}, async () => "fixture-password-hash");
  const installed = new Task554ProductionHandlers(cleanedResponseLost.dependencies);
  await installed.install(input);
  await installed.close();
  const cleaner = new Task554ProductionHandlers(cleanedResponseLost.dependencies);
  await cleaner.cleanup(authority); // Simulate losing the successful cleanup response.
  const prover = new Task554ProductionHandlers(cleanedResponseLost.dependencies);
  expect(await prover.prove(authority)).toMatchObject({ fixturesAbsent: true });
});

test("TASK-554 worker rejects credential and exact fixture-matrix drift", async () => {
  const registry = createTask554WorkerRegistry(handlers());
  const input = createTask554InstallInput({
    profile: "certification",
    runMarker: marker,
    recoveryKey,
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
  const ledger = buildTask554CleanupLedger({ marker, actors: installedOutput.actors, fixtures });
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

test("TASK-554 worker environment carries only the bounded PII keys and server pepper needed for login parity", () => {
  const withoutPepper = projectTask554WorkerEnvironment({
    PATH: "/usr/bin",
    DATABASE_URL: "postgres://private",
    CODERSO_PLAYWRIGHT_EMAIL: "synthetic@example.test",
    CODERSO_PLAYWRIGHT_PASSWORD: "synthetic-password",
    PII_HASH_KEY: "hash-key-12345678901234567890123456789012",
    PII_ENC_KEY: "enc-key-12345678901234567890123456789012",
  });
  expect(withoutPepper).toEqual({
    PATH: "/usr/bin",
    DATABASE_URL: "postgres://private",
    PII_HASH_KEY: "hash-key-12345678901234567890123456789012",
    PII_ENC_KEY: "enc-key-12345678901234567890123456789012",
    DB_POOL_MAX: "1",
  });
  const withPepper = projectTask554WorkerEnvironment({
    PATH: "/usr/bin",
    DATABASE_URL: "postgres://private",
    AUTH_PASSWORD_PEPPER: "task554-private-pepper",
    CODERSO_PLAYWRIGHT_PASSWORD: "synthetic-password",
    PII_HASH_KEY: "hash-key-12345678901234567890123456789012",
    PII_ENC_KEY: "enc-key-12345678901234567890123456789012",
  });
  expect(withPepper).toEqual({
    PATH: "/usr/bin",
    DATABASE_URL: "postgres://private",
    AUTH_PASSWORD_PEPPER: "task554-private-pepper",
    PII_HASH_KEY: "hash-key-12345678901234567890123456789012",
    PII_ENC_KEY: "enc-key-12345678901234567890123456789012",
    DB_POOL_MAX: "1",
  });
  expect(JSON.stringify(withPepper)).not.toContain("synthetic-password");
  expect(() =>
    projectTask554WorkerEnvironment({
      PATH: "/usr/bin",
      DATABASE_URL: "postgres://private",
      PII_HASH_KEY: "hash-key-12345678901234567890123456789012",
      PII_ENC_KEY: "enc-key-12345678901234567890123456789012",
      AUTH_PASSWORD_PEPPER: "invalid\0pepper",
    })
  ).toThrow("password pepper");
  expect(() =>
    projectTask554WorkerEnvironment({
      PATH: "/usr/bin",
      DATABASE_URL: "postgres://private",
      AUTH_PASSWORD_PEPPER: "task554-private-pepper",
    })
  ).toThrow("worker environment is incomplete");
});

test("TASK-554 cleanup and terminal proof validators require pre-identity and terminal absence", async () => {
  const registry = createTask554WorkerRegistry(handlers());
  expect(
    await registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.cleanup, authority)
  ).toMatchObject({
    preIdentityAbsenceProved: true,
    identityAbsenceProved: true,
  });
  expect(await registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.prove, authority)).toMatchObject({
    fixturesAbsent: true,
    identitiesAbsent: true,
  });
  await expect(
    registry.executeOneShot(TASK554_WORKER_DESCRIPTORS.cleanup, {
      ...authority,
      replay: true,
    })
  ).rejects.toThrow("unknown or missing fields");
});
