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
  TASK554_SCENARIO_IDS,
  TASK554_VARIANTS,
  buildTask554FixtureSpecs,
  type Task554ActorKind,
  type Task554ScenarioId,
  type Task554VariantId,
} from "./browser-actions";
import { Task554ProductionHandlers } from "./production-handlers";

export const TASK554_WORKER_PROFILE_ID = "task-554-db";
export const TASK554_WORKER_OPERATION_IDS = Object.freeze([
  "task-554/install",
  "task-554/read",
  "task-554/cleanup",
  "task-554/prove",
] as const);

export interface Task554ActorCredentials extends PlainJsonObject {
  readonly kind: Task554ActorKind;
  readonly email: string;
  readonly password: string;
}

export interface Task554InstallInput extends PlainJsonObject {
  readonly runMarker: string;
  readonly actors: readonly Task554ActorCredentials[];
  readonly fixtures: readonly Task554FixtureInput[];
}

export interface Task554FixtureInput extends PlainJsonObject {
  readonly scenarioId: Task554ScenarioId;
  readonly variantId: Task554VariantId;
  readonly baseline: Readonly<{
    readonly status: string;
    readonly scheduledAt: string | null;
    readonly seoDescription: string;
  }>;
}

export interface Task554ReadInput extends PlainJsonObject {
  readonly postId: string;
}

export interface Task554InstallOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly actors: readonly Readonly<{
    readonly kind: Task554ActorKind;
    readonly userId: string;
    readonly roleId: string;
  }>[];
  readonly fixtures: readonly Readonly<{
    readonly scenarioId: Task554ScenarioId;
    readonly variantId: Task554VariantId;
    readonly postId: string;
  }>[];
  readonly statements: number;
  readonly rows: number;
}

export interface Task554ReadOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly postId: string;
  readonly status: "draft" | "published" | "scheduled" | "archived";
  readonly scheduledAt: string | null;
  readonly seoDescription: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task554CleanupOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly postChildrenRemoved: number;
  readonly accessLogsRemoved: number;
  readonly loginAuditRowsRemoved: number;
  readonly sessionsRemoved: number;
  readonly userRolesRemoved: number;
  readonly postsRemoved: number;
  readonly usersRemoved: number;
  readonly rolesRemoved: number;
  readonly preIdentityAbsenceProved: true;
  readonly identityAbsenceProved: true;
  readonly settingsRestored: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task554ProofOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly fixturesAbsent: true;
  readonly identitiesAbsent: true;
  readonly settingsRestored: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task554WorkerHandlers {
  install(input: Task554InstallInput): Promise<Task554InstallOutput>;
  read(input: Task554ReadInput): Promise<Task554ReadOutput>;
  cleanup(): Promise<Task554CleanupOutput>;
  prove(): Promise<Task554ProofOutput>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MARKER = /^[a-f0-9]{12,32}$/u;
const EMAIL = /^task554-[a-f0-9]{12,32}-(writer|publisher)@smoke\.invalid$/u;
const PASSWORD = /^[A-Za-z0-9_-]{24,128}$/u;
const STATUSES = new Set(["draft", "published", "scheduled", "archived"]);
const MAX_PASSWORD_PEPPER_BYTES = 8 * 1024;

function fail(message: string): never {
  throw new WorkerProtocolError(message);
}

function requireUuid(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !UUID.test(value)) fail(`${label} is invalid`);
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

function credential(value: unknown): Task554ActorCredentials {
  const actor = exactObject(value, ["kind", "email", "password"], "TASK-554 actor credential");
  if (
    (actor.kind !== "writer" && actor.kind !== "publisher") ||
    typeof actor.email !== "string" ||
    !EMAIL.test(actor.email) ||
    actor.email !== `task554-${actor.email.split("-")[1]}-${actor.kind}@smoke.invalid` ||
    typeof actor.password !== "string" ||
    !PASSWORD.test(actor.password)
  )
    fail("TASK-554 actor credential is invalid");
  return Object.freeze(actor as unknown as Task554ActorCredentials);
}

function fixture(value: unknown): Task554FixtureInput {
  const entry = exactObject(
    value,
    ["scenarioId", "variantId", "baseline"],
    "TASK-554 fixture input"
  );
  if (
    typeof entry.scenarioId !== "string" ||
    !TASK554_SCENARIO_IDS.includes(entry.scenarioId as Task554ScenarioId) ||
    typeof entry.variantId !== "string" ||
    !TASK554_VARIANTS.some(({ id }) => id === entry.variantId) ||
    !isPlainObject(entry.baseline)
  )
    fail("TASK-554 fixture input is invalid");
  assertExactKeys(
    entry.baseline,
    ["status", "scheduledAt", "seoDescription"],
    "TASK-554 fixture baseline"
  );
  if (
    !STATUSES.has(entry.baseline.status as string) ||
    (typeof entry.baseline.scheduledAt !== "string" && entry.baseline.scheduledAt !== null) ||
    (entry.baseline.status === "scheduled" && typeof entry.baseline.scheduledAt !== "string") ||
    (entry.baseline.status !== "scheduled" && entry.baseline.scheduledAt !== null) ||
    typeof entry.baseline.seoDescription !== "string" ||
    entry.baseline.seoDescription.length > 512
  )
    fail("TASK-554 fixture baseline is invalid");
  return Object.freeze(entry as unknown as Task554FixtureInput);
}

type Task554FixtureIdentity = Readonly<{
  readonly scenarioId: Task554ScenarioId;
  readonly variantId: Task554VariantId;
}>;

function hasExactFixtureMatrix(
  profile: "fast" | "certification",
  fixtures: readonly Task554FixtureIdentity[]
): boolean {
  const expected = buildTask554FixtureSpecs(profile);
  return (
    fixtures.length === expected.length &&
    fixtures.every(
      (fixtureValue, index) =>
        fixtureValue.scenarioId === expected[index]?.scenarioId &&
        fixtureValue.variantId === expected[index]?.variantId
    )
  );
}

export function inferTask554FixtureProfile(
  fixtures: readonly Task554FixtureIdentity[]
): "fast" | "certification" {
  if (hasExactFixtureMatrix("fast", fixtures)) return "fast";
  if (hasExactFixtureMatrix("certification", fixtures)) return "certification";
  fail("TASK-554 fixture matrix is invalid");
}

export function assertTask554FixtureMatrix(
  profile: "fast" | "certification",
  fixtures: readonly Task554FixtureIdentity[]
): void {
  if (!hasExactFixtureMatrix(profile, fixtures)) fail("TASK-554 fixture matrix is invalid");
}

function assertFixtureBaselines(
  profile: "fast" | "certification",
  fixtures: readonly Task554FixtureInput[]
): void {
  const expected = buildTask554FixtureSpecs(profile);
  if (
    fixtures.some(({ baseline }, index) => {
      const expectedBaseline = expected[index]?.baseline;
      return (
        expectedBaseline === undefined ||
        baseline.status !== expectedBaseline.status ||
        baseline.scheduledAt !== expectedBaseline.scheduledAt ||
        baseline.seoDescription !== expectedBaseline.seoDescription
      );
    })
  ) {
    fail("TASK-554 fixture baseline drifted");
  }
}

function installInput(value: unknown): Task554InstallInput {
  const input = exactObject(value, ["runMarker", "actors", "fixtures"], "TASK-554 install input");
  if (
    typeof input.runMarker !== "string" ||
    !MARKER.test(input.runMarker) ||
    !Array.isArray(input.actors) ||
    !Array.isArray(input.fixtures)
  ) {
    fail("TASK-554 install input is invalid");
  }
  const actors = input.actors.map(credential);
  if (
    actors.length !== 2 ||
    actors.map(({ kind }) => kind).join(",") !== "writer,publisher" ||
    new Set(actors.map(({ email }) => email)).size !== 2
  ) {
    fail("TASK-554 actor identity set is invalid");
  }
  if (
    actors.some((actor) => actor.email !== `task554-${input.runMarker}-${actor.kind}@smoke.invalid`)
  )
    fail("TASK-554 actor marker drifted");
  const fixtures = input.fixtures.map(fixture);
  const profile = inferTask554FixtureProfile(fixtures);
  assertFixtureBaselines(profile, fixtures);
  return Object.freeze({
    runMarker: input.runMarker,
    actors: Object.freeze(actors),
    fixtures: Object.freeze(fixtures),
  });
}

function readInput(value: unknown): Task554ReadInput {
  const input = exactObject(value, ["postId"], "TASK-554 read input");
  requireUuid(input.postId, "TASK-554 post ID");
  return Object.freeze(input as unknown as Task554ReadInput);
}

function emptyInput(value: unknown): PlainJsonObject {
  exactObject(value, [], "TASK-554 worker input");
  return Object.freeze({});
}

function output(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  const result = exactObject(value, keys, label);
  if (result.schemaVersion !== 1) fail(`${label} schema version drifted`);
  requireInteger(result.statements, 1, `${label} statements`);
  requireInteger(result.rows, 0, `${label} rows`);
  return result;
}

function installOutput(value: unknown): Task554InstallOutput {
  const result = output(
    value,
    ["schemaVersion", "runMarker", "actors", "fixtures", "statements", "rows"],
    "TASK-554 install output"
  ) as unknown as Task554InstallOutput;
  if (
    typeof result.runMarker !== "string" ||
    !MARKER.test(result.runMarker) ||
    !Array.isArray(result.actors) ||
    result.actors.length !== 2 ||
    !Array.isArray(result.fixtures)
  )
    fail("TASK-554 install output is invalid");
  for (const actor of result.actors) {
    if (!isPlainObject(actor)) fail("TASK-554 actor output is invalid");
    assertExactKeys(actor, ["kind", "userId", "roleId"], "TASK-554 actor output");
    if (actor.kind !== "writer" && actor.kind !== "publisher")
      fail("TASK-554 actor output kind is invalid");
    requireUuid(actor.userId, "TASK-554 actor user ID");
    requireUuid(actor.roleId, "TASK-554 actor role ID");
  }
  if (result.actors.map(({ kind }) => kind).join(",") !== "writer,publisher")
    fail("TASK-554 actor output order drifted");
  for (const entry of result.fixtures) {
    if (!isPlainObject(entry)) fail("TASK-554 fixture output is invalid");
    assertExactKeys(entry, ["scenarioId", "variantId", "postId"], "TASK-554 fixture output");
    if (
      !TASK554_SCENARIO_IDS.includes(entry.scenarioId as Task554ScenarioId) ||
      !TASK554_VARIANTS.some(({ id }) => id === entry.variantId)
    )
      fail("TASK-554 fixture output identity is invalid");
    requireUuid(entry.postId, "TASK-554 fixture post ID");
  }
  inferTask554FixtureProfile(result.fixtures);
  return result;
}

function readOutput(value: unknown): Task554ReadOutput {
  const result = output(
    value,
    ["schemaVersion", "postId", "status", "scheduledAt", "seoDescription", "statements", "rows"],
    "TASK-554 read output"
  ) as unknown as Task554ReadOutput;
  requireUuid(result.postId, "TASK-554 read post ID");
  if (
    !STATUSES.has(result.status) ||
    (typeof result.scheduledAt !== "string" && result.scheduledAt !== null) ||
    typeof result.seoDescription !== "string" ||
    result.seoDescription.length > 512
  )
    fail("TASK-554 read output is invalid");
  return result;
}

function cleanupOutput(value: unknown): Task554CleanupOutput {
  const result = output(
    value,
    [
      "schemaVersion",
      "postChildrenRemoved",
      "accessLogsRemoved",
      "loginAuditRowsRemoved",
      "sessionsRemoved",
      "userRolesRemoved",
      "postsRemoved",
      "usersRemoved",
      "rolesRemoved",
      "preIdentityAbsenceProved",
      "identityAbsenceProved",
      "settingsRestored",
      "statements",
      "rows",
    ],
    "TASK-554 cleanup output"
  ) as unknown as Task554CleanupOutput;
  for (const key of [
    "postChildrenRemoved",
    "accessLogsRemoved",
    "loginAuditRowsRemoved",
    "sessionsRemoved",
    "userRolesRemoved",
    "postsRemoved",
    "usersRemoved",
    "rolesRemoved",
  ] as const)
    requireInteger(result[key], 0, `TASK-554 ${key}`);
  if (
    result.preIdentityAbsenceProved !== true ||
    result.identityAbsenceProved !== true ||
    result.settingsRestored !== true
  )
    fail("TASK-554 cleanup absence proof failed");
  return result;
}

function proofOutput(value: unknown): Task554ProofOutput {
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
    "TASK-554 proof output"
  ) as unknown as Task554ProofOutput;
  if (
    result.fixturesAbsent !== true ||
    result.identitiesAbsent !== true ||
    result.settingsRestored !== true
  )
    fail("TASK-554 terminal proof failed");
  return result;
}

const OPERATION_DIGEST = createHash("sha256").update("task-554-worker-v1").digest("hex");

function descriptor(
  operationId: (typeof TASK554_WORKER_OPERATION_IDS)[number],
  retryClass: "mutation" | "idempotent-read"
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId: TASK554_WORKER_PROFILE_ID,
    inputSchemaId: `${operationId.replaceAll("/", "-")}-input-v1`,
    outputSchemaId: `${operationId.replaceAll("/", "-")}-output-v1`,
    sourceSha256: createHash("sha256").update(`${OPERATION_DIGEST}\0${operationId}`).digest("hex"),
    retryClass,
    maxInputBytes: 128 * 1024,
    maxOutputBytes: 128 * 1024,
  });
}

export const TASK554_WORKER_DESCRIPTORS = Object.freeze({
  install: descriptor("task-554/install", "mutation"),
  read: descriptor("task-554/read", "idempotent-read"),
  cleanup: descriptor("task-554/cleanup", "mutation"),
  prove: descriptor("task-554/prove", "idempotent-read"),
});

function definition<TInput extends PlainJsonObject, TOutput extends PlainJsonObject>(
  descriptorInput: WorkerOperationDescriptor,
  validateInput: (value: unknown) => TInput,
  validateOutput: (value: unknown) => TOutput,
  execute: (input: TInput) => Promise<TOutput>
): WorkerOperationDefinition<TInput, TOutput> {
  return Object.freeze({ ...descriptorInput, validateInput, validateOutput, execute });
}

export function createTask554WorkerRegistry(
  handlers: Task554WorkerHandlers = new Task554ProductionHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      definition(TASK554_WORKER_DESCRIPTORS.install, installInput, installOutput, (input) =>
        handlers.install(input)
      ),
      definition(TASK554_WORKER_DESCRIPTORS.read, readInput, readOutput, (input) =>
        handlers.read(input)
      ),
      definition(TASK554_WORKER_DESCRIPTORS.cleanup, emptyInput, cleanupOutput, () =>
        handlers.cleanup()
      ),
      definition(TASK554_WORKER_DESCRIPTORS.prove, emptyInput, proofOutput, () => handlers.prove()),
    ],
    { close: () => handlers.close(), proveAbsent: () => handlers.proveAbsent() }
  );
}

export function createTask554InstallInput(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly actors: readonly Task554ActorCredentials[];
}): Task554InstallInput {
  const fixtures = buildTask554FixtureSpecs(input.profile).map((entry) =>
    Object.freeze({ ...entry })
  );
  return installInput(
    Object.freeze({ runMarker: input.runMarker, actors: input.actors, fixtures })
  );
}

export function assertTask554WorkerDescriptorParity(
  descriptors: readonly WorkerOperationDescriptor[]
): void {
  const actual = descriptors.map(({ operationId }) => operationId).sort();
  const expected = [...TASK554_WORKER_OPERATION_IDS].sort();
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index]))
    fail("TASK-554 worker descriptors drifted");
  for (const entry of descriptors)
    assertSha256(entry.sourceSha256, "TASK-554 worker descriptor hash");
}

function requiredEnvironment(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new WorkerProtocolError("TASK-554 worker environment is incomplete");
  }
  return value;
}

function optionalPasswordPepper(source: NodeJS.ProcessEnv): string | null {
  const value = source.AUTH_PASSWORD_PEPPER;
  if (value === undefined) return null;
  if (
    typeof value !== "string" ||
    value.includes("\0") ||
    Buffer.byteLength(value) > MAX_PASSWORD_PEPPER_BYTES
  ) {
    throw new WorkerProtocolError("TASK-554 worker password pepper is invalid");
  }
  return value;
}

/** The database worker receives the server's bounded password pepper, never browser credentials. */
export function projectTask554WorkerEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const passwordPepper = optionalPasswordPepper(source);
  return Object.freeze({
    PATH: requiredEnvironment(source, "PATH"),
    DATABASE_URL: requiredEnvironment(source, "DATABASE_URL"),
    ...(passwordPepper === null ? {} : { AUTH_PASSWORD_PEPPER: passwordPepper }),
    DB_POOL_MAX: "1",
  });
}

function task554WorkerProfiles(
  root: string,
  source: NodeJS.ProcessEnv
): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: TASK554_WORKER_PROFILE_ID,
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-554/worker-entry.ts",
        "TASK-554 worker entry"
      ),
      cwd: root,
      family: "task554-worker-db",
      requestTimeoutMs: 120_000,
      maximumFrameBytes: 1024 * 1024,
      environment: () => projectTask554WorkerEnvironment(source),
    }),
  ]);
}

export async function createTask554WorkerPool(
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
    profiles: task554WorkerProfiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}
