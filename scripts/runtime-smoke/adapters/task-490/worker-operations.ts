// TASK-490 worker contracts: strict operation descriptors, validators, the
// suite-scoped Bun/DB worker registry, and the lazy profile-scoped worker pool.
// The worker only creates/reconciles/removes the run's OWN scoped fixture rows
// (role, admin actor, form, form fields, submission) and reads the derived
// site.adminPath; it never touches other rows and never returns secrets.

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
import { Task490ProductionHandlers } from "./production-handlers";

export const TASK490_WORKER_PROFILE_ID = "task-490-db";
export const TASK490_WORKER_OPERATION_IDS = Object.freeze([
  "task-490/install",
  "task-490/cleanup",
  "task-490/prove",
] as const);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MARKER = /^[a-f0-9]{12,32}$/u;
const EMAIL = /^task490-[a-f0-9]{12,32}-admin@smoke\.invalid$/u;
const PASSWORD = /^[A-Za-z0-9_-]{24,128}$/u;
const RECOVERY_KEY = /^[A-Za-z0-9_-]{43}$/u;
const ADMIN_PATH = /^\/[A-Za-z0-9._~/-]{0,127}$/u;
const MAX_PASSWORD_PEPPER_BYTES = 8 * 1024;

export interface Task490RecoveryAuthority extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly profile: "fast" | "certification";
  readonly recoveryKey: string;
}

export interface Task490ActorCredential extends PlainJsonObject {
  readonly email: string;
  readonly password: string;
}

export interface Task490InstallInput extends PlainJsonObject {
  readonly authority: Task490RecoveryAuthority;
  readonly credential: Task490ActorCredential;
}

export interface Task490InstallOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly adminPath: string;
  readonly roleId: string;
  readonly userId: string;
  readonly formId: string;
  readonly submissionId: string;
  readonly fieldIds: readonly string[];
  readonly statements: number;
  readonly rows: number;
}

export interface Task490CleanupOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly formsRemoved: number;
  readonly formFieldsRemoved: number;
  readonly submissionsRemoved: number;
  readonly sessionsRemoved: number;
  readonly auditLogsRemoved: number;
  readonly accessLogsRemoved: number;
  readonly userRolesRemoved: number;
  readonly usersRemoved: number;
  readonly rolesRemoved: number;
  readonly fixtureAbsenceProved: true;
  readonly identityAbsenceProved: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task490ProofOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly fixturesAbsent: true;
  readonly identitiesAbsent: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task490WorkerHandlers {
  install(input: Task490InstallInput): Promise<Task490InstallOutput>;
  cleanup(input: Task490RecoveryAuthority): Promise<Task490CleanupOutput>;
  prove(input: Task490RecoveryAuthority): Promise<Task490ProofOutput>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

function fail(message: string): never {
  throw new WorkerProtocolError(message);
}

function requireUuid(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !UUID.test(value)) fail(`${label} is invalid`);
}

function requireInteger(value: unknown, minimum: number, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail(`${label} is invalid`);
}

function exactObject(value: unknown, keys: readonly string[], label: string): PlainJsonObject {
  if (!isPlainObject(value)) fail(`${label} is invalid`);
  assertExactKeys(value, keys, label);
  assertPlainJsonObject(value, label);
  return value;
}

function recoveryAuthority(value: unknown): Task490RecoveryAuthority {
  const authority = exactObject(
    value,
    ["schemaVersion", "runMarker", "profile", "recoveryKey"],
    "TASK-490 recovery authority"
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
    fail("TASK-490 recovery authority is invalid");
  }
  return Object.freeze(authority as unknown as Task490RecoveryAuthority);
}

function actorCredential(value: unknown): Task490ActorCredential {
  const credential = exactObject(value, ["email", "password"], "TASK-490 actor credential");
  if (
    typeof credential.email !== "string" ||
    !EMAIL.test(credential.email) ||
    typeof credential.password !== "string" ||
    !PASSWORD.test(credential.password)
  ) {
    fail("TASK-490 actor credential is invalid");
  }
  return Object.freeze(credential as unknown as Task490ActorCredential);
}

function installInput(value: unknown): Task490InstallInput {
  const input = exactObject(value, ["authority", "credential"], "TASK-490 install input");
  const authority = recoveryAuthority(input.authority);
  const credential = actorCredential(input.credential);
  if (credential.email !== `task490-${authority.runMarker}-admin@smoke.invalid`) {
    fail("TASK-490 actor marker drifted");
  }
  return Object.freeze({ authority, credential });
}

function output(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  const result = exactObject(value, keys, label);
  if (result.schemaVersion !== 1) fail(`${label} schema version drifted`);
  requireInteger(result.statements, 1, `${label} statements`);
  requireInteger(result.rows, 0, `${label} rows`);
  return result;
}

function installOutput(value: unknown): Task490InstallOutput {
  const result = output(
    value,
    [
      "schemaVersion",
      "runMarker",
      "adminPath",
      "roleId",
      "userId",
      "formId",
      "submissionId",
      "fieldIds",
      "statements",
      "rows",
    ],
    "TASK-490 install output"
  ) as unknown as Task490InstallOutput;
  if (
    typeof result.runMarker !== "string" ||
    !MARKER.test(result.runMarker) ||
    typeof result.adminPath !== "string" ||
    !ADMIN_PATH.test(result.adminPath)
  ) {
    fail("TASK-490 install output identity is invalid");
  }
  requireUuid(result.roleId, "TASK-490 role ID");
  requireUuid(result.userId, "TASK-490 user ID");
  requireUuid(result.formId, "TASK-490 form ID");
  requireUuid(result.submissionId, "TASK-490 submission ID");
  if (
    !Array.isArray(result.fieldIds) ||
    result.fieldIds.length !== 3 ||
    result.fieldIds.some((value) => typeof value !== "string" || !UUID.test(value)) ||
    new Set(result.fieldIds).size !== 3
  ) {
    fail("TASK-490 field IDs are invalid");
  }
  return result;
}

function cleanupOutput(value: unknown): Task490CleanupOutput {
  const result = output(
    value,
    [
      "schemaVersion",
      "formsRemoved",
      "formFieldsRemoved",
      "submissionsRemoved",
      "sessionsRemoved",
      "auditLogsRemoved",
      "accessLogsRemoved",
      "userRolesRemoved",
      "usersRemoved",
      "rolesRemoved",
      "fixtureAbsenceProved",
      "identityAbsenceProved",
      "statements",
      "rows",
    ],
    "TASK-490 cleanup output"
  ) as unknown as Task490CleanupOutput;
  for (const key of [
    "formsRemoved",
    "formFieldsRemoved",
    "submissionsRemoved",
    "sessionsRemoved",
    "auditLogsRemoved",
    "accessLogsRemoved",
    "userRolesRemoved",
    "usersRemoved",
    "rolesRemoved",
  ] as const)
    requireInteger(result[key], 0, `TASK-490 ${key}`);
  if (result.fixtureAbsenceProved !== true || result.identityAbsenceProved !== true) {
    fail("TASK-490 cleanup absence proof failed");
  }
  return result;
}

function proofOutput(value: unknown): Task490ProofOutput {
  const result = output(
    value,
    ["schemaVersion", "fixturesAbsent", "identitiesAbsent", "statements", "rows"],
    "TASK-490 proof output"
  ) as unknown as Task490ProofOutput;
  if (result.fixturesAbsent !== true || result.identitiesAbsent !== true) {
    fail("TASK-490 terminal proof failed");
  }
  return result;
}

const OPERATION_DIGEST = createHash("sha256").update("task-490-worker-v1").digest("hex");

function descriptor(
  operationId: (typeof TASK490_WORKER_OPERATION_IDS)[number],
  retryClass: "mutation" | "idempotent-read"
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId: TASK490_WORKER_PROFILE_ID,
    inputSchemaId: `${operationId.replaceAll("/", "-")}-input-v1`,
    outputSchemaId: `${operationId.replaceAll("/", "-")}-output-v1`,
    sourceSha256: createHash("sha256").update(`${OPERATION_DIGEST}\0${operationId}`).digest("hex"),
    retryClass,
    maxInputBytes: 64 * 1024,
    maxOutputBytes: 64 * 1024,
  });
}

export const TASK490_WORKER_DESCRIPTORS = Object.freeze({
  install: descriptor("task-490/install", "mutation"),
  cleanup: descriptor("task-490/cleanup", "mutation"),
  prove: descriptor("task-490/prove", "idempotent-read"),
});

function definition<TInput extends PlainJsonObject, TOutput extends PlainJsonObject>(
  descriptorInput: WorkerOperationDescriptor,
  validateInput: (value: unknown) => TInput,
  validateOutput: (value: unknown) => TOutput,
  execute: (input: TInput) => Promise<TOutput>
): WorkerOperationDefinition<TInput, TOutput> {
  return Object.freeze({ ...descriptorInput, validateInput, validateOutput, execute });
}

export function createTask490WorkerRegistry(
  handlers: Task490WorkerHandlers = new Task490ProductionHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      definition(TASK490_WORKER_DESCRIPTORS.install, installInput, installOutput, (input) =>
        handlers.install(input)
      ),
      definition(TASK490_WORKER_DESCRIPTORS.cleanup, recoveryAuthority, cleanupOutput, (input) =>
        handlers.cleanup(input)
      ),
      definition(TASK490_WORKER_DESCRIPTORS.prove, recoveryAuthority, proofOutput, (input) =>
        handlers.prove(input)
      ),
    ],
    { close: () => handlers.close(), proveAbsent: () => handlers.proveAbsent() }
  );
}

export function createTask490RecoveryAuthority(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly recoveryKey: string;
}): Task490RecoveryAuthority {
  return recoveryAuthority(Object.freeze({ schemaVersion: 1, ...input }));
}

export function createTask490InstallInput(input: {
  readonly authority: Task490RecoveryAuthority;
  readonly credential: Task490ActorCredential;
}): Task490InstallInput {
  return installInput(Object.freeze({ authority: input.authority, credential: input.credential }));
}

export function assertTask490WorkerDescriptorParity(
  descriptors: readonly WorkerOperationDescriptor[]
): void {
  const actual = descriptors.map(({ operationId }) => operationId).sort();
  const expected = [...TASK490_WORKER_OPERATION_IDS].sort();
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index]))
    fail("TASK-490 worker descriptors drifted");
  for (const entry of descriptors)
    assertSha256(entry.sourceSha256, "TASK-490 worker descriptor hash");
}

function requiredEnvironment(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new WorkerProtocolError("TASK-490 worker environment is incomplete");
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
    throw new WorkerProtocolError("TASK-490 worker password pepper is invalid");
  }
  return value;
}

/** The database worker receives the server's bounded password pepper, never browser credentials. */
export function projectTask490WorkerEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const passwordPepper = optionalPasswordPepper(source);
  return Object.freeze({
    PATH: requiredEnvironment(source, "PATH"),
    DATABASE_URL: requiredEnvironment(source, "DATABASE_URL"),
    ...(passwordPepper === null ? {} : { AUTH_PASSWORD_PEPPER: passwordPepper }),
    // The worker creates the fixture actor through the app's canonical PII
    // email fields (HMAC email, hash and encrypted variants), so it needs the
    // same PII keys the Admin login flow resolves.
    PII_HASH_KEY: requiredEnvironment(source, "PII_HASH_KEY"),
    PII_ENC_KEY: requiredEnvironment(source, "PII_ENC_KEY"),
    DB_POOL_MAX: "1",
  });
}

function task490WorkerProfiles(
  root: string,
  source: NodeJS.ProcessEnv
): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: TASK490_WORKER_PROFILE_ID,
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-490/worker-entry.ts",
        "TASK-490 worker entry"
      ),
      cwd: root,
      family: "task490-worker-db",
      requestTimeoutMs: 120_000,
      maximumFrameBytes: 1024 * 1024,
      environment: () => projectTask490WorkerEnvironment(source),
    }),
  ]);
}

export async function createTask490WorkerPool(
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
    profiles: task490WorkerProfiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}
