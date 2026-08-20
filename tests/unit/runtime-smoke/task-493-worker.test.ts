import { expect, test } from "bun:test";

import {
  buildTask493CleanupLedger,
  buildTask493CleanupPlans,
  assertTask493FixtureAbsence,
  Task493ProductionHandlers,
} from "../../../scripts/runtime-smoke/adapters/task-493/production-handlers";

import {
  TASK493_WORKER_DESCRIPTORS,
  TASK493_WORKER_OPERATION_IDS,
  assertTask493FixtureMatrix,
  assertTask493WorkerDescriptorParity,
  createTask493InstallInput,
  createTask493RecoveryAuthority,
  createTask493WorkerRegistry,
  projectTask493WorkerEnvironment,
  type Task493CleanupOutput,
  type Task493InstallOutput,
  type Task493ProofOutput,
  type Task493ReadOutput,
  type Task493RecoveryAuthority,
  type Task493WorkerHandlers,
} from "../../../scripts/runtime-smoke/adapters/task-493/worker-operations";
import {
  buildTask493FixtureSpecs,
  task493FixtureSitemapPath,
  task493FixtureUrl,
} from "../../../scripts/runtime-smoke/adapters/task-493/browser-actions";

const marker = "b".repeat(24);
const recoveryKey = Buffer.alloc(32, 9).toString("base64url");
const authority = createTask493RecoveryAuthority({
  profile: "fast",
  runMarker: marker,
  recoveryKey,
});

const installedOutput: Task493InstallOutput = {
  schemaVersion: 1,
  runMarker: marker,
  fixtures: buildTask493FixtureSpecs("fast").map((fixture) => ({
    scenarioId: fixture.scenarioId,
    variantId: fixture.variantId,
    url: task493FixtureUrl(marker, fixture),
  })),
  statements: 4,
  rows: 28,
};

const cleanup: Task493CleanupOutput = {
  schemaVersion: 1,
  seoIndexedPagesRemoved: 7,
  seoSearchMetricsRemoved: 7,
  seoSearchQueriesRemoved: 7,
  seoSitemapSubmissionsRemoved: 7,
  preIdentityAbsenceProved: true,
  identityAbsenceProved: true,
  settingsRestored: true,
  statements: 20,
  rows: 28,
};

const proof: Task493ProofOutput = {
  schemaVersion: 1,
  fixturesAbsent: true,
  identitiesAbsent: true,
  settingsRestored: true,
  statements: 3,
  rows: 0,
};

function handlers(): Task493WorkerHandlers {
  let closed = false;
  return {
    async install() {
      return installedOutput;
    },
    async read(input) {
      return {
        schemaVersion: 1,
        url: input.url,
        indexingState: "INDEXED",
        impressions: 50,
        clicks: 3,
        query: "task493 safe fixture projection",
        sitemapUrl: input.url.replace(/^https?:\/\/[^/]+/u, ""),
        statements: 1,
        rows: 2,
      } satisfies Task493ReadOutput;
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

test("TASK-493 worker owns the four strict registered operations and never returns recovery material", async () => {
  const registry = createTask493WorkerRegistry(handlers());
  expect(registry.ids()).toEqual([...TASK493_WORKER_OPERATION_IDS].sort());
  assertTask493WorkerDescriptorParity(registry.descriptors());
  const input = createTask493InstallInput({
    profile: "fast",
    runMarker: marker,
    recoveryKey,
  });
  const output = await registry.executeOneShot(TASK493_WORKER_DESCRIPTORS.install, input);
  expect(output).toMatchObject({
    schemaVersion: 1,
    runMarker: marker,
    fixtures: expect.any(Array),
  });
  expect(JSON.stringify(output)).not.toContain(recoveryKey);
  await expect(
    registry.executeOneShot(TASK493_WORKER_DESCRIPTORS.install, { ...input, unknown: true })
  ).rejects.toThrow("unknown or missing fields");
  await registry.close();
  expect(await registry.proveAbsent()).toBe(true);
});

test("TASK-493 production handler closes its database client once and fails closed", async () => {
  let closeCalls = 0;
  let signalDatabaseClose: (() => void) | undefined;
  const databaseCloseStarted = new Promise<void>((resolve) => {
    signalDatabaseClose = resolve;
  });
  let releaseClose: (() => void) | undefined;
  const closeStarted = new Promise<void>((resolve) => {
    releaseClose = resolve;
  });
  const handlers = new Task493ProductionHandlers(async () => {
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
  const failedHandlers = new Task493ProductionHandlers(async () => {
    failedCloseCalls += 1;
    throw new Error("database shutdown failed");
  });
  await expect(failedHandlers.close()).rejects.toThrow("database shutdown failed");
  expect(failedCloseCalls).toBe(1);
  expect(await failedHandlers.proveAbsent()).toBe(false);
});

test("TASK-493 worker rejects exact fixture-matrix drift", async () => {
  const registry = createTask493WorkerRegistry(handlers());
  const input = createTask493InstallInput({
    profile: "certification",
    runMarker: marker,
    recoveryKey,
  });
  const missingScenario = input.fixtures.filter(
    ({ scenarioId }) => scenarioId !== "search-performance-read"
  );
  const swappedVariant = input.fixtures.map((fixture, index, all) =>
    index === 0 ? { ...fixture, variantId: all[1]!.variantId } : fixture
  );
  const duplicatedScenario = input.fixtures.map((fixture, index) =>
    index === 4 ? { ...fixture, scenarioId: input.fixtures[0]!.scenarioId } : fixture
  );
  for (const fixtures of [missingScenario, swappedVariant, duplicatedScenario]) {
    await expect(
      registry.executeOneShot(TASK493_WORKER_DESCRIPTORS.install, { ...input, fixtures })
    ).rejects.toThrow("fixture matrix");
  }
  expect(() => assertTask493FixtureMatrix("certification", input.fixtures)).not.toThrow();
  expect(() => assertTask493FixtureMatrix("fast", input.fixtures)).toThrow("fixture matrix");
  const firstUrl = task493FixtureUrl(marker, buildTask493FixtureSpecs("fast")[0]!);
  const read = await registry.executeOneShot(TASK493_WORKER_DESCRIPTORS.read, { url: firstUrl });
  expect(read).toMatchObject({ url: firstUrl, indexingState: "INDEXED", rows: 2 });
  await expect(
    registry.executeOneShot(TASK493_WORKER_DESCRIPTORS.read, { url: "https://evil.example/x" })
  ).rejects.toThrow("read URL");
  await expect(
    registry.executeOneShot(TASK493_WORKER_DESCRIPTORS.read, { url: `/task493-${marker}-x.xml` })
  ).rejects.toThrow("read URL");
});

test("TASK-493 fixture absence proof rejects every remaining SEO row", () => {
  const clean = {
    seoIndexedPages: [],
    seoSearchMetrics: [],
    seoSearchQueries: [],
    seoSitemapSubmissions: [],
  };
  expect(() => assertTask493FixtureAbsence(clean)).not.toThrow();
  for (const table of [
    "seoIndexedPages",
    "seoSearchMetrics",
    "seoSearchQueries",
    "seoSitemapSubmissions",
  ] as const) {
    expect(() => assertTask493FixtureAbsence({ ...clean, [table]: [{}] })).toThrow(
      "fixture absence"
    );
  }
});

test("TASK-493 cleanup derives the single FK-safe wave-0 authority from the shared ledger", () => {
  const fixtures = buildTask493FixtureSpecs("fast").map((fixture) => ({
    scenarioId: fixture.scenarioId,
    variantId: fixture.variantId,
    url: task493FixtureUrl(marker, fixture),
    sitemapUrl: task493FixtureSitemapPath(marker, fixture),
  }));
  const ledger = buildTask493CleanupLedger({ marker, fixtures });
  const plans = buildTask493CleanupPlans(ledger);
  expect(ledger.entries).toHaveLength(28);
  expect(plans.map(({ batchId, wave }) => `${wave}:${batchId}`)).toEqual([
    "0:cleanup/task-493-db/wave-0",
  ]);
  expect(plans[0]!.resources).toHaveLength(28);
  const kinds = plans[0]!.resources.map(({ kind }) => kind);
  expect(kinds.filter((kind) => kind === "seo-indexed-page")).toHaveLength(7);
  expect(kinds.filter((kind) => kind === "seo-search-metric")).toHaveLength(7);
  expect(kinds.filter((kind) => kind === "seo-search-query")).toHaveLength(7);
  expect(kinds.filter((kind) => kind === "seo-sitemap-submission")).toHaveLength(7);
});

test("TASK-493 worker environment carries only the bounded DB keys and never browser credentials", () => {
  const environment = projectTask493WorkerEnvironment({
    PATH: "/usr/bin",
    DATABASE_URL: "postgres://private",
    CODERSO_PLAYWRIGHT_EMAIL: "admin@example.test",
    CODERSO_PLAYWRIGHT_PASSWORD: "synthetic-password",
    AUTH_PASSWORD_PEPPER: "private-pepper",
    PII_HASH_KEY: "hash-key-12345678901234567890123456789012",
    PII_ENC_KEY: "enc-key-12345678901234567890123456789012",
  });
  expect(environment).toEqual({
    PATH: "/usr/bin",
    DATABASE_URL: "postgres://private",
    DB_POOL_MAX: "1",
  });
  expect(JSON.stringify(environment)).not.toContain("synthetic-password");
  expect(JSON.stringify(environment)).not.toContain("private-pepper");
  expect(JSON.stringify(environment)).not.toContain("hash-key");
  expect(JSON.stringify(environment)).not.toContain("admin@example.test");
  expect(() =>
    projectTask493WorkerEnvironment({
      PATH: "/usr/bin",
      DATABASE_URL: "postgres://private",
      DB_POOL_MAX: "1",
    })
  ).not.toThrow();
  expect(() =>
    projectTask493WorkerEnvironment({
      PATH: "/usr/bin",
      DATABASE_URL: "postgres://private\0secret",
    })
  ).toThrow("worker environment is incomplete");
  expect(() =>
    projectTask493WorkerEnvironment({
      PATH: "/usr/bin",
    })
  ).toThrow("worker environment is incomplete");
});

test("TASK-493 cleanup and terminal proof validators require removal and terminal absence", async () => {
  const registry = createTask493WorkerRegistry(handlers());
  expect(
    await registry.executeOneShot(TASK493_WORKER_DESCRIPTORS.cleanup, authority)
  ).toMatchObject({
    seoIndexedPagesRemoved: 7,
    seoSearchMetricsRemoved: 7,
    seoSearchQueriesRemoved: 7,
    seoSitemapSubmissionsRemoved: 7,
    preIdentityAbsenceProved: true,
    identityAbsenceProved: true,
  });
  expect(await registry.executeOneShot(TASK493_WORKER_DESCRIPTORS.prove, authority)).toMatchObject({
    fixturesAbsent: true,
    identitiesAbsent: true,
  });
  await expect(
    registry.executeOneShot(TASK493_WORKER_DESCRIPTORS.cleanup, {
      ...authority,
      replay: true,
    })
  ).rejects.toThrow("unknown or missing fields");
});
