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
import { Task487ProductionHandlers } from "./production-handlers";

export const TASK487_WORKER_PROFILE_ID = "task-487-db";
export const TASK487_WORKER_OPERATION_IDS = Object.freeze([
  "task-487/install",
  "task-487/cleanup",
  "task-487/prove",
] as const);

export interface Task487RecoveryAuthority extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly profile: "fast" | "certification";
  readonly recoveryKey: string;
}

export interface Task487ActorCredentials extends PlainJsonObject {
  readonly email: string;
  readonly password: string;
}

export interface Task487InstallInput extends PlainJsonObject {
  readonly authority: Task487RecoveryAuthority;
  readonly actor: Task487ActorCredentials;
}

export interface Task487InstallOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly adminPath: string;
  readonly botProtectionEnabled: boolean;
  readonly typeId: string;
  readonly typeSlug: string;
  readonly actor: Readonly<{ readonly userId: string; readonly roleId: string }>;
  readonly statements: number;
  readonly rows: number;
}

export interface Task487CleanupOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly revisionsRemoved: number;
  readonly entriesRemoved: number;
  readonly typesRemoved: number;
  readonly sessionsRemoved: number;
  readonly userRolesRemoved: number;
  readonly usersRemoved: number;
  readonly absenceProved: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task487ProofOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly fixturesAbsent: true;
  readonly actorAbsent: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task487WorkerHandlers {
  install(input: Task487InstallInput): Promise<Task487InstallOutput>;
  cleanup(input: Task487RecoveryAuthority): Promise<Task487CleanupOutput>;
  prove(input: Task487RecoveryAuthority): Promise<Task487ProofOutput>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MARKER = /^[a-f0-9]{12,32}$/u;
const EMAIL = /^task487-[a-f0-9]{12,32}-admin@smoke\.invalid$/u;
const PASSWORD = /^[A-Za-z0-9_-]{24,128}$/u;
const RECOVERY_KEY = /^[A-Za-z0-9_-]{43}$/u;
const MAX_PASSWORD_PEPPER_BYTES = 8 * 1024;
const ADMIN_PATH = /^\/(?:[A-Za-z0-9._~-]+\/)*[A-Za-z0-9._~-]*$/u;

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

function actorCredentials(value: unknown): Task487ActorCredentials {
  const actor = exactObject(value, ["email", "password"], "TASK-487 actor credential");
  if (
    typeof actor.email !== "string" ||
    !EMAIL.test(actor.email) ||
    typeof actor.password !== "string" ||
    !PASSWORD.test(actor.password)
  )
    fail("TASK-487 actor credential is invalid");
  return Object.freeze(actor as unknown as Task487ActorCredentials);
}

function recoveryAuthority(value: unknown): Task487RecoveryAuthority {
  const authority = exactObject(
    value,
    ["schemaVersion", "runMarker", "profile", "recoveryKey"],
    "TASK-487 recovery authority"
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
    fail("TASK-487 recovery authority is invalid");
  }
  return Object.freeze(authority as unknown as Task487RecoveryAuthority);
}

function installInput(value: unknown): Task487InstallInput {
  const input = exactObject(value, ["authority", "actor"], "TASK-487 install input");
  const authority = recoveryAuthority(input.authority);
  const actor = actorCredentials(input.actor);
  if (actor.email !== `task487-${authority.runMarker}-admin@smoke.invalid`) {
    fail("TASK-487 actor marker drifted");
  }
  return Object.freeze({ authority, actor });
}

function output(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  const result = exactObject(value, keys, label);
  if (result.schemaVersion !== 1) fail(`${label} schema version drifted`);
  requireInteger(result.statements, 1, `${label} statements`);
  requireInteger(result.rows, 0, `${label} rows`);
  return result;
}

function installOutput(value: unknown): Task487InstallOutput {
  const result = output(
    value,
    [
      "schemaVersion",
      "runMarker",
      "adminPath",
      "botProtectionEnabled",
      "typeId",
      "typeSlug",
      "actor",
      "statements",
      "rows",
    ],
    "TASK-487 install output"
  ) as unknown as Task487InstallOutput;
  if (
    typeof result.runMarker !== "string" ||
    !MARKER.test(result.runMarker) ||
    typeof result.adminPath !== "string" ||
    !ADMIN_PATH.test(result.adminPath) ||
    result.adminPath.length > 128 ||
    typeof result.botProtectionEnabled !== "boolean" ||
    result.botProtectionEnabled !== false ||
    !isPlainObject(result.actor)
  )
    fail("TASK-487 install output is invalid");
  assertExactKeys(result.actor, ["userId", "roleId"], "TASK-487 actor output");
  requireUuid(result.actor.userId, "TASK-487 actor user ID");
  requireUuid(result.actor.roleId, "TASK-487 actor role ID");
  requireUuid(result.typeId, "TASK-487 content type ID");
  if (
    typeof result.typeSlug !== "string" ||
    !new RegExp(`^task487-${result.runMarker}-post$`, "u").test(result.typeSlug)
  ) {
    fail("TASK-487 content type identity drifted");
  }
  return result;
}

function cleanupOutput(value: unknown): Task487CleanupOutput {
  const result = output(
    value,
    [
      "schemaVersion",
      "revisionsRemoved",
      "entriesRemoved",
      "typesRemoved",
      "sessionsRemoved",
      "userRolesRemoved",
      "usersRemoved",
      "absenceProved",
      "statements",
      "rows",
    ],
    "TASK-487 cleanup output"
  ) as unknown as Task487CleanupOutput;
  for (const key of [
    "revisionsRemoved",
    "entriesRemoved",
    "typesRemoved",
    "sessionsRemoved",
    "userRolesRemoved",
    "usersRemoved",
  ] as const)
    requireInteger(result[key], 0, `TASK-487 ${key}`);
  if (result.absenceProved !== true) fail("TASK-487 cleanup absence proof failed");
  return result;
}

function proofOutput(value: unknown): Task487ProofOutput {
  const result = output(
    value,
    ["schemaVersion", "fixturesAbsent", "actorAbsent", "statements", "rows"],
    "TASK-487 proof output"
  ) as unknown as Task487ProofOutput;
  if (result.fixturesAbsent !== true || result.actorAbsent !== true)
    fail("TASK-487 terminal proof failed");
  return result;
}

const OPERATION_DIGEST = createHash("sha256").update("task-487-worker-v1").digest("hex");

function descriptor(
  operationId: (typeof TASK487_WORKER_OPERATION_IDS)[number],
  retryClass: "mutation" | "idempotent-read"
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId: TASK487_WORKER_PROFILE_ID,
    inputSchemaId: `${operationId.replaceAll("/", "-")}-input-v1`,
    outputSchemaId: `${operationId.replaceAll("/", "-")}-output-v1`,
    sourceSha256: createHash("sha256").update(`${OPERATION_DIGEST}\0${operationId}`).digest("hex"),
    retryClass,
    maxInputBytes: 128 * 1024,
    maxOutputBytes: 128 * 1024,
  });
}

export const TASK487_WORKER_DESCRIPTORS = Object.freeze({
  install: descriptor("task-487/install", "mutation"),
  cleanup: descriptor("task-487/cleanup", "mutation"),
  prove: descriptor("task-487/prove", "idempotent-read"),
});

function definition<TInput extends PlainJsonObject, TOutput extends PlainJsonObject>(
  descriptorInput: WorkerOperationDescriptor,
  validateInput: (value: unknown) => TInput,
  validateOutput: (value: unknown) => TOutput,
  execute: (input: TInput) => Promise<TOutput>
): WorkerOperationDefinition<TInput, TOutput> {
  return Object.freeze({ ...descriptorInput, validateInput, validateOutput, execute });
}

export function createTask487WorkerRegistry(
  handlers: Task487WorkerHandlers = new Task487ProductionHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      definition(TASK487_WORKER_DESCRIPTORS.install, installInput, installOutput, (input) =>
        handlers.install(input)
      ),
      definition(TASK487_WORKER_DESCRIPTORS.cleanup, recoveryAuthority, cleanupOutput, (input) =>
        handlers.cleanup(input)
      ),
      definition(TASK487_WORKER_DESCRIPTORS.prove, recoveryAuthority, proofOutput, (input) =>
        handlers.prove(input)
      ),
    ],
    { close: () => handlers.close(), proveAbsent: () => handlers.proveAbsent() }
  );
}

export function createTask487InstallInput(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly recoveryKey: string;
  readonly actor: Task487ActorCredentials;
}): Task487InstallInput {
  return installInput(
    Object.freeze({
      authority: Object.freeze({
        schemaVersion: 1,
        runMarker: input.runMarker,
        profile: input.profile,
        recoveryKey: input.recoveryKey,
      }),
      actor: input.actor,
    })
  );
}

export function createTask487RecoveryAuthority(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly recoveryKey: string;
}): Task487RecoveryAuthority {
  return recoveryAuthority(Object.freeze({ schemaVersion: 1, ...input }));
}

export function assertTask487WorkerDescriptorParity(
  descriptors: readonly WorkerOperationDescriptor[]
): void {
  const actual = descriptors.map(({ operationId }) => operationId).sort();
  const expected = [...TASK487_WORKER_OPERATION_IDS].sort();
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index]))
    fail("TASK-487 worker descriptors drifted");
  for (const entry of descriptors)
    assertSha256(entry.sourceSha256, "TASK-487 worker descriptor hash");
}

function requiredEnvironment(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new WorkerProtocolError("TASK-487 worker environment is incomplete");
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
    throw new WorkerProtocolError("TASK-487 worker password pepper is invalid");
  }
  return value;
}

/**
 * The database worker receives the server's bounded password pepper and PII
 * keys so the fixture admin user it creates logs in through the same canonical
 * hash/encryption the Admin login flow verifies. Browser credentials never
 * enter the worker: the adapter keeps the password for the auth helper.
 */
export function projectTask487WorkerEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const passwordPepper = optionalPasswordPepper(source);
  return Object.freeze({
    PATH: requiredEnvironment(source, "PATH"),
    DATABASE_URL: requiredEnvironment(source, "DATABASE_URL"),
    ...(passwordPepper === null ? {} : { AUTH_PASSWORD_PEPPER: passwordPepper }),
    PII_HASH_KEY: requiredEnvironment(source, "PII_HASH_KEY"),
    PII_ENC_KEY: requiredEnvironment(source, "PII_ENC_KEY"),
    DB_POOL_MAX: "1",
  });
}

function task487WorkerProfiles(
  root: string,
  source: NodeJS.ProcessEnv
): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: TASK487_WORKER_PROFILE_ID,
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-487/worker-entry.ts",
        "TASK-487 worker entry"
      ),
      cwd: root,
      family: "task487-worker-db",
      requestTimeoutMs: 120_000,
      maximumFrameBytes: 1024 * 1024,
      environment: () => projectTask487WorkerEnvironment(source),
    }),
  ]);
}

export async function createTask487WorkerPool(
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
    profiles: task487WorkerProfiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}
