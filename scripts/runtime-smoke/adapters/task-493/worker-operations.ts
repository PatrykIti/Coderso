import { createHash } from "node:crypto";

import { assertExactKeys, isPlainObject, resolveInsideRoot } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { resolveExecutableOnPath } from "../../process-supervisor";
import {
  WorkerProtocolError,
  assertPlainJsonObject,
  assertSha256,
  type PlainJsonObject,
  type WorkerOperationDefinition,
  type WorkerOperationDescriptor,
} from "../../workers/contracts";
import { WorkerOperationRegistry } from "../../workers/operation-registry";
import { WorkerPool, type WorkerProfileSpec } from "../../workers/pool";
import {
  TASK493_SCENARIO_IDS,
  TASK493_VARIANTS,
  buildTask493FixtureSpecs,
  task493FixtureUrl,
  type Task493ScenarioId,
  type Task493VariantId,
} from "./browser-actions";
import { Task493ProductionHandlers } from "./production-handlers";

export const TASK493_WORKER_PROFILE_ID = "task-493-db";
export const TASK493_WORKER_OPERATION_IDS = Object.freeze([
  "task-493/install",
  "task-493/read",
  "task-493/cleanup",
  "task-493/prove",
] as const);

export interface Task493RecoveryAuthority extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly profile: "fast" | "certification";
  readonly recoveryKey: string;
}

export interface Task493FixtureInput extends PlainJsonObject {
  readonly scenarioId: Task493ScenarioId;
  readonly variantId: Task493VariantId;
}

export interface Task493InstallInput extends PlainJsonObject {
  readonly authority: Task493RecoveryAuthority;
  readonly fixtures: readonly Task493FixtureInput[];
}

export interface Task493ReadInput extends PlainJsonObject {
  readonly url: string;
}

export interface Task493FixtureIdentityOutput extends PlainJsonObject {
  readonly scenarioId: Task493ScenarioId;
  readonly variantId: Task493VariantId;
  readonly url: string;
}

export interface Task493InstallOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly fixtures: readonly Task493FixtureIdentityOutput[];
  readonly statements: number;
  readonly rows: number;
}

export interface Task493ReadOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly url: string;
  readonly indexingState: "INDEXED";
  readonly impressions: number;
  readonly clicks: number;
  readonly query: string;
  readonly sitemapUrl: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task493CleanupOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly seoIndexedPagesRemoved: number;
  readonly seoSearchMetricsRemoved: number;
  readonly seoSearchQueriesRemoved: number;
  readonly seoSitemapSubmissionsRemoved: number;
  readonly preIdentityAbsenceProved: true;
  readonly identityAbsenceProved: true;
  readonly settingsRestored: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task493ProofOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly fixturesAbsent: true;
  readonly identitiesAbsent: true;
  readonly settingsRestored: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task493WorkerHandlers {
  install(input: Task493InstallInput): Promise<Task493InstallOutput>;
  read(input: Task493ReadInput): Promise<Task493ReadOutput>;
  cleanup(input: Task493RecoveryAuthority): Promise<Task493CleanupOutput>;
  prove(input: Task493RecoveryAuthority): Promise<Task493ProofOutput>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

const MARKER = /^[a-f0-9]{12,32}$/u;
const RECOVERY_KEY = /^[A-Za-z0-9_-]{43}$/u;
const FIXTURE_URL =
  /^http:\/\/127\.0\.0\.1:3000\/task493-[a-f0-9]{12,32}-[a-z0-9-]+-[a-z0-9-]+\.xml$/u;

function fail(message: string): never {
  throw new WorkerProtocolError(message);
}

function requireInteger(value: unknown, minimum: number, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail(`${label} is invalid`);
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  label: string
): Record<string, unknown> {
  if (!isPlainObject(value)) fail(`${label} is invalid`);
  assertExactKeys(value, keys, label);
  assertPlainJsonObject(value, label);
  return value;
}

function fixture(value: unknown): Task493FixtureInput {
  const entry = exactObject(value, ["scenarioId", "variantId"], "TASK-493 fixture input");
  if (
    typeof entry.scenarioId !== "string" ||
    !TASK493_SCENARIO_IDS.includes(entry.scenarioId as Task493ScenarioId) ||
    typeof entry.variantId !== "string" ||
    !TASK493_VARIANTS.some(({ id }) => id === entry.variantId)
  )
    fail("TASK-493 fixture input is invalid");
  return Object.freeze(entry as unknown as Task493FixtureInput);
}

function recoveryAuthority(value: unknown): Task493RecoveryAuthority {
  const authority = exactObject(
    value,
    ["schemaVersion", "runMarker", "profile", "recoveryKey"],
    "TASK-493 recovery authority"
  );
  if (
    authority.schemaVersion !== 1 ||
    typeof authority.runMarker !== "string" ||
    !MARKER.test(authority.runMarker) ||
    (authority.profile !== "fast" && authority.profile !== "certification") ||
    typeof authority.recoveryKey !== "string" ||
    !RECOVERY_KEY.test(authority.recoveryKey) ||
    Buffer.from(authority.recoveryKey, "base64url").length !== 32
  ) {
    fail("TASK-493 recovery authority is invalid");
  }
  return Object.freeze(authority as unknown as Task493RecoveryAuthority);
}

type Task493FixtureIdentity = Readonly<{
  readonly scenarioId: Task493ScenarioId;
  readonly variantId: Task493VariantId;
}>;

function hasExactFixtureMatrix(
  profile: "fast" | "certification",
  fixtures: readonly Task493FixtureIdentity[]
): boolean {
  const expected = buildTask493FixtureSpecs(profile);
  return (
    fixtures.length === expected.length &&
    fixtures.every(
      (fixtureValue, index) =>
        fixtureValue.scenarioId === expected[index]?.scenarioId &&
        fixtureValue.variantId === expected[index]?.variantId
    )
  );
}

export function inferTask493FixtureProfile(
  fixtures: readonly Task493FixtureIdentity[]
): "fast" | "certification" {
  if (hasExactFixtureMatrix("fast", fixtures)) return "fast";
  if (hasExactFixtureMatrix("certification", fixtures)) return "certification";
  fail("TASK-493 fixture matrix is invalid");
}

export function assertTask493FixtureMatrix(
  profile: "fast" | "certification",
  fixtures: readonly Task493FixtureIdentity[]
): void {
  if (!hasExactFixtureMatrix(profile, fixtures)) fail("TASK-493 fixture matrix is invalid");
}

function installInput(value: unknown): Task493InstallInput {
  const input = exactObject(value, ["authority", "fixtures"], "TASK-493 install input");
  const authority = recoveryAuthority(input.authority);
  if (!Array.isArray(input.fixtures)) fail("TASK-493 install input is invalid");
  const fixtures = input.fixtures.map(fixture);
  const profile = inferTask493FixtureProfile(fixtures);
  if (profile !== authority.profile) fail("TASK-493 recovery profile drifted");
  return Object.freeze({
    authority,
    fixtures: Object.freeze(fixtures),
  });
}

function readInput(value: unknown): Task493ReadInput {
  const input = exactObject(value, ["url"], "TASK-493 read input");
  if (typeof input.url !== "string" || !FIXTURE_URL.test(input.url))
    fail("TASK-493 read URL is invalid");
  return Object.freeze(input as unknown as Task493ReadInput);
}

function output(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  const result = exactObject(value, keys, label);
  if (result.schemaVersion !== 1) fail(`${label} schema version drifted`);
  requireInteger(result.statements, 1, `${label} statements`);
  requireInteger(result.rows, 0, `${label} rows`);
  return result;
}

function installOutput(value: unknown): Task493InstallOutput {
  const result = output(
    value,
    ["schemaVersion", "runMarker", "fixtures", "statements", "rows"],
    "TASK-493 install output"
  ) as unknown as Task493InstallOutput;
  if (typeof result.runMarker !== "string" || !MARKER.test(result.runMarker)) {
    fail("TASK-493 install output run marker is invalid");
  }
  if (!Array.isArray(result.fixtures)) fail("TASK-493 install output is invalid");
  for (const entry of result.fixtures) {
    if (!isPlainObject(entry)) fail("TASK-493 fixture output is invalid");
    assertExactKeys(entry, ["scenarioId", "variantId", "url"], "TASK-493 fixture output");
    if (
      !TASK493_SCENARIO_IDS.includes(entry.scenarioId as Task493ScenarioId) ||
      !TASK493_VARIANTS.some(({ id }) => id === entry.variantId) ||
      typeof entry.url !== "string" ||
      !FIXTURE_URL.test(entry.url) ||
      entry.url !== task493FixtureUrl(result.runMarker, entry as Task493FixtureInput)
    )
      fail("TASK-493 fixture output identity is invalid");
  }
  inferTask493FixtureProfile(result.fixtures);
  return result;
}

function readOutput(value: unknown): Task493ReadOutput {
  const result = output(
    value,
    [
      "schemaVersion",
      "url",
      "indexingState",
      "impressions",
      "clicks",
      "query",
      "sitemapUrl",
      "statements",
      "rows",
    ],
    "TASK-493 read output"
  ) as unknown as Task493ReadOutput;
  if (typeof result.url !== "string" || !FIXTURE_URL.test(result.url)) {
    fail("TASK-493 read output URL is invalid");
  }
  if (
    result.indexingState !== "INDEXED" ||
    !Number.isSafeInteger(result.impressions) ||
    result.impressions < 1 ||
    !Number.isSafeInteger(result.clicks) ||
    result.clicks < 1 ||
    typeof result.query !== "string" ||
    result.query.length === 0 ||
    typeof result.sitemapUrl !== "string" ||
    !result.sitemapUrl.startsWith("/")
  ) {
    fail("TASK-493 read output is invalid");
  }
  return result;
}

function cleanupOutput(value: unknown): Task493CleanupOutput {
  const result = output(
    value,
    [
      "schemaVersion",
      "seoIndexedPagesRemoved",
      "seoSearchMetricsRemoved",
      "seoSearchQueriesRemoved",
      "seoSitemapSubmissionsRemoved",
      "preIdentityAbsenceProved",
      "identityAbsenceProved",
      "settingsRestored",
      "statements",
      "rows",
    ],
    "TASK-493 cleanup output"
  ) as unknown as Task493CleanupOutput;
  for (const key of [
    "seoIndexedPagesRemoved",
    "seoSearchMetricsRemoved",
    "seoSearchQueriesRemoved",
    "seoSitemapSubmissionsRemoved",
  ] as const)
    requireInteger(result[key], 0, `TASK-493 ${key}`);
  if (
    result.preIdentityAbsenceProved !== true ||
    result.identityAbsenceProved !== true ||
    result.settingsRestored !== true
  )
    fail("TASK-493 cleanup absence proof failed");
  return result;
}

function proofOutput(value: unknown): Task493ProofOutput {
  const result = output(
    value,
    [
      "schemaVersion",
      "fixturesAbsent",
      "identitiesAbsent",
      "settingsRestored",
      "statements",
      "rows",
    ],
    "TASK-493 proof output"
  ) as unknown as Task493ProofOutput;
  if (
    result.fixturesAbsent !== true ||
    result.identitiesAbsent !== true ||
    result.settingsRestored !== true
  )
    fail("TASK-493 terminal proof failed");
  return result;
}

const OPERATION_DIGEST = createHash("sha256").update("task-493-worker-v1").digest("hex");

function descriptor(
  operationId: (typeof TASK493_WORKER_OPERATION_IDS)[number],
  retryClass: "mutation" | "idempotent-read"
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId: TASK493_WORKER_PROFILE_ID,
    inputSchemaId: `${operationId.replaceAll("/", "-")}-input-v1`,
    outputSchemaId: `${operationId.replaceAll("/", "-")}-output-v1`,
    sourceSha256: createHash("sha256").update(`${OPERATION_DIGEST}\0${operationId}`).digest("hex"),
    retryClass,
    maxInputBytes: 128 * 1024,
    maxOutputBytes: 128 * 1024,
  });
}

export const TASK493_WORKER_DESCRIPTORS = Object.freeze({
  install: descriptor("task-493/install", "mutation"),
  read: descriptor("task-493/read", "idempotent-read"),
  cleanup: descriptor("task-493/cleanup", "mutation"),
  prove: descriptor("task-493/prove", "idempotent-read"),
});

function definition<TInput extends PlainJsonObject, TOutput extends PlainJsonObject>(
  descriptorInput: WorkerOperationDescriptor,
  validateInput: (value: unknown) => TInput,
  validateOutput: (value: unknown) => TOutput,
  execute: (input: TInput) => Promise<TOutput>
): WorkerOperationDefinition<TInput, TOutput> {
  return Object.freeze({ ...descriptorInput, validateInput, validateOutput, execute });
}

export function createTask493WorkerRegistry(
  handlers: Task493WorkerHandlers = new Task493ProductionHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      definition(TASK493_WORKER_DESCRIPTORS.install, installInput, installOutput, (input) =>
        handlers.install(input)
      ),
      definition(TASK493_WORKER_DESCRIPTORS.read, readInput, readOutput, (input) =>
        handlers.read(input)
      ),
      definition(TASK493_WORKER_DESCRIPTORS.cleanup, recoveryAuthority, cleanupOutput, (input) =>
        handlers.cleanup(input)
      ),
      definition(TASK493_WORKER_DESCRIPTORS.prove, recoveryAuthority, proofOutput, (input) =>
        handlers.prove(input)
      ),
    ],
    { close: () => handlers.close(), proveAbsent: () => handlers.proveAbsent() }
  );
}

export function createTask493InstallInput(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly recoveryKey: string;
}): Task493InstallInput {
  const fixtures = buildTask493FixtureSpecs(input.profile).map((entry) =>
    Object.freeze({ ...entry })
  );
  return installInput(
    Object.freeze({
      authority: Object.freeze({
        schemaVersion: 1,
        runMarker: input.runMarker,
        profile: input.profile,
        recoveryKey: input.recoveryKey,
      }),
      fixtures,
    })
  );
}

export function createTask493RecoveryAuthority(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly recoveryKey: string;
}): Task493RecoveryAuthority {
  return recoveryAuthority(Object.freeze({ schemaVersion: 1, ...input }));
}

export function assertTask493WorkerDescriptorParity(
  descriptors: readonly WorkerOperationDescriptor[]
): void {
  const actual = descriptors.map(({ operationId }) => operationId).sort();
  const expected = [...TASK493_WORKER_OPERATION_IDS].sort();
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index]))
    fail("TASK-493 worker descriptors drifted");
  for (const entry of descriptors)
    assertSha256(entry.sourceSha256, "TASK-493 worker descriptor hash");
}

function requiredEnvironment(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new WorkerProtocolError("TASK-493 worker environment is incomplete");
  }
  return value;
}

/**
 * The database worker only touches SEO tables, the settings table, and the
 * native writer fence. It never creates users, so it needs no browser
 * credentials, PII keys, or password pepper.
 */
export function projectTask493WorkerEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  return Object.freeze({
    PATH: requiredEnvironment(source, "PATH"),
    DATABASE_URL: requiredEnvironment(source, "DATABASE_URL"),
    DB_POOL_MAX: "1",
  });
}

function task493WorkerProfiles(
  root: string,
  source: NodeJS.ProcessEnv
): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: TASK493_WORKER_PROFILE_ID,
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-493/worker-entry.ts",
        "TASK-493 worker entry"
      ),
      cwd: root,
      family: "task493-worker-db",
      requestTimeoutMs: 120_000,
      maximumFrameBytes: 1024 * 1024,
      environment: () => projectTask493WorkerEnvironment(source),
    }),
  ]);
}

export async function createTask493WorkerPool(
  context: RuntimeSmokeContext,
  registry: WorkerOperationRegistry,
  source: NodeJS.ProcessEnv = process.env
): Promise<WorkerPool> {
  const pathValue = requiredEnvironment(source, "PATH");
  return WorkerPool.create({
    root: context.root,
    executable: await resolveExecutableOnPath("bun", pathValue),
    supervisor: context.processes,
    registry,
    profiles: task493WorkerProfiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}
