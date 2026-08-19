// TASK-467 worker contract: a uniquely scoped admin identity for the lazy
// widget editor smoke. The suite never reuses a seeded password; the worker
// creates an admin user + role per run and the cleanup/prove operations prove
// full absence afterward.
import { createHash } from "node:crypto";

import { assertExactKeys, isPlainObject, resolveInsideRoot, SmokeError } from "../../contracts";
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
import { Task467ProductionHandlers } from "./production-handlers";

export const TASK467_WORKER_PROFILE_ID = "task-467-db";
export const TASK467_WORKER_OPERATION_IDS = Object.freeze([
  "task-467/bootstrap",
  "task-467/cleanup",
  "task-467/prove",
] as const);

export interface Task467RecoveryAuthority extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly profile: "fast" | "certification";
  readonly recoveryKey: string;
}

export interface Task467AdminCredential extends PlainJsonObject {
  readonly email: string;
  readonly password: string;
}

export interface Task467BootstrapInput extends PlainJsonObject {
  readonly authority: Task467RecoveryAuthority;
  readonly admin: Task467AdminCredential;
}

export interface Task467BootstrapOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task467CleanupOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly sessionsRemoved: number;
  readonly auditRowsRemoved: number;
  readonly accessLogsRemoved: number;
  readonly userRolesRemoved: number;
  readonly usersRemoved: number;
  readonly rolesRemoved: number;
  readonly preIdentityAbsenceProved: true;
  readonly identityAbsenceProved: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task467ProofOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly identitiesAbsent: true;
  readonly receiptsAbsent: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task467WorkerHandlers {
  bootstrap(input: Task467BootstrapInput): Promise<Task467BootstrapOutput>;
  cleanup(input: Task467RecoveryAuthority): Promise<Task467CleanupOutput>;
  prove(input: Task467RecoveryAuthority): Promise<Task467ProofOutput>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

const MARKER = /^[a-f0-9]{12,32}$/u;
const EMAIL = /^task467-[a-f0-9]{12,32}-admin@smoke\.invalid$/u;
const PASSWORD = /^[A-Za-z0-9_-]{24,128}$/u;
const RECOVERY_KEY = /^[A-Za-z0-9_-]{43}$/u;

function fail(message: string): never {
  throw new WorkerProtocolError(message);
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

function requireInteger(value: unknown, minimum: number, label: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
    fail(`${label} is invalid`);
  }
}

function recoveryAuthority(value: unknown): Task467RecoveryAuthority {
  const authority = exactObject(
    value,
    ["schemaVersion", "runMarker", "profile", "recoveryKey"],
    "TASK-467 recovery authority"
  );
  if (
    authority.schemaVersion !== 1 ||
    typeof authority.runMarker !== "string" ||
    !MARKER.test(authority.runMarker) ||
    (authority.profile !== "fast" && authority.profile !== "certification") ||
    typeof authority.recoveryKey !== "string" ||
    !RECOVERY_KEY.test(authority.recoveryKey)
  ) {
    fail("TASK-467 recovery authority is invalid");
  }
  return Object.freeze(authority as unknown as Task467RecoveryAuthority);
}

function adminCredential(value: unknown): Task467AdminCredential {
  const admin = exactObject(value, ["email", "password"], "TASK-467 admin credential");
  if (
    typeof admin.email !== "string" ||
    !EMAIL.test(admin.email) ||
    typeof admin.password !== "string" ||
    !PASSWORD.test(admin.password)
  ) {
    fail("TASK-467 admin credential is invalid");
  }
  return Object.freeze(admin as unknown as Task467AdminCredential);
}

function bootstrapInput(value: unknown): Task467BootstrapInput {
  const input = exactObject(value, ["authority", "admin"], "TASK-467 bootstrap input");
  const authority = recoveryAuthority(input.authority);
  const admin = adminCredential(input.admin);
  return Object.freeze({ authority, admin });
}

function output(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  const result = exactObject(value, keys, label);
  if (result.schemaVersion !== 1) fail(`${label} schema version drifted`);
  requireInteger(result.statements, 1, `${label} statements`);
  requireInteger(result.rows, 0, `${label} rows`);
  return result;
}

function bootstrapOutput(value: unknown): Task467BootstrapOutput {
  const result = output(
    value,
    ["schemaVersion", "runMarker", "statements", "rows"],
    "TASK-467 bootstrap output"
  );
  if (typeof result.runMarker !== "string" || !MARKER.test(result.runMarker)) {
    fail("TASK-467 bootstrap output is invalid");
  }
  return Object.freeze(result as unknown as Task467BootstrapOutput);
}

function cleanupOutput(value: unknown): Task467CleanupOutput {
  const result = output(
    value,
    [
      "schemaVersion",
      "sessionsRemoved",
      "auditRowsRemoved",
      "accessLogsRemoved",
      "userRolesRemoved",
      "usersRemoved",
      "rolesRemoved",
      "preIdentityAbsenceProved",
      "identityAbsenceProved",
      "statements",
      "rows",
    ],
    "TASK-467 cleanup output"
  );
  for (const key of [
    "sessionsRemoved",
    "auditRowsRemoved",
    "accessLogsRemoved",
    "userRolesRemoved",
    "usersRemoved",
    "rolesRemoved",
  ] as const) {
    requireInteger(result[key], 0, `TASK-467 cleanup ${key}`);
  }
  if (result.preIdentityAbsenceProved !== true || result.identityAbsenceProved !== true) {
    fail("TASK-467 cleanup proof is incomplete");
  }
  return Object.freeze(result as unknown as Task467CleanupOutput);
}

function proofOutput(value: unknown): Task467ProofOutput {
  const result = output(
    value,
    ["schemaVersion", "identitiesAbsent", "receiptsAbsent", "statements", "rows"],
    "TASK-467 terminal proof"
  );
  if (result.identitiesAbsent !== true || result.receiptsAbsent !== true) {
    fail("TASK-467 terminal proof is incomplete");
  }
  return Object.freeze(result as unknown as Task467ProofOutput);
}

const OPERATION_DIGEST = createHash("sha256").update("task-467-worker-v1").digest("hex");

function descriptor(
  operationId: (typeof TASK467_WORKER_OPERATION_IDS)[number],
  retryClass: "mutation" | "idempotent-read"
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId: TASK467_WORKER_PROFILE_ID,
    inputSchemaId: `${operationId.replaceAll("/", "-")}-input-v1`,
    outputSchemaId: `${operationId.replaceAll("/", "-")}-output-v1`,
    sourceSha256: createHash("sha256").update(`${OPERATION_DIGEST}\0${operationId}`).digest("hex"),
    retryClass,
    maxInputBytes: 128 * 1024,
    maxOutputBytes: 128 * 1024,
  });
}

export const TASK467_WORKER_DESCRIPTORS = Object.freeze({
  bootstrap: descriptor("task-467/bootstrap", "mutation"),
  cleanup: descriptor("task-467/cleanup", "mutation"),
  prove: descriptor("task-467/prove", "idempotent-read"),
});

function definition<TInput extends PlainJsonObject, TOutput extends PlainJsonObject>(
  descriptorInput: WorkerOperationDescriptor,
  validateInput: (value: unknown) => TInput,
  validateOutput: (value: unknown) => TOutput,
  execute: (input: TInput) => Promise<TOutput>
): WorkerOperationDefinition<TInput, TOutput> {
  return Object.freeze({ ...descriptorInput, validateInput, validateOutput, execute });
}

export function createTask467WorkerRegistry(
  handlers: Task467WorkerHandlers = new Task467ProductionHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      definition(TASK467_WORKER_DESCRIPTORS.bootstrap, bootstrapInput, bootstrapOutput, (input) =>
        handlers.bootstrap(input)
      ),
      definition(TASK467_WORKER_DESCRIPTORS.cleanup, recoveryAuthority, cleanupOutput, (input) =>
        handlers.cleanup(input)
      ),
      definition(TASK467_WORKER_DESCRIPTORS.prove, recoveryAuthority, proofOutput, (input) =>
        handlers.prove(input)
      ),
    ],
    { close: () => handlers.close(), proveAbsent: () => handlers.proveAbsent() }
  );
}

export function createTask467RecoveryAuthority(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly recoveryKey: string;
}): Task467RecoveryAuthority {
  return recoveryAuthority(Object.freeze({ schemaVersion: 1, ...input }));
}

export function createTask467BootstrapInput(input: {
  readonly authority: Task467RecoveryAuthority;
  readonly email: string;
  readonly password: string;
}): Task467BootstrapInput {
  return bootstrapInput(
    Object.freeze({
      authority: input.authority,
      admin: Object.freeze({ email: input.email, password: input.password }),
    })
  );
}

export function assertTask467WorkerDescriptorParity(
  descriptors: readonly WorkerOperationDescriptor[]
): void {
  const actual = descriptors.map(({ operationId }) => operationId).sort();
  const expected = [...TASK467_WORKER_OPERATION_IDS].sort();
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) {
    fail("TASK-467 worker descriptors drifted");
  }
  for (const entry of descriptors)
    assertSha256(entry.sourceSha256, "TASK-467 worker descriptor hash");
}

function requiredEnvironment(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new WorkerProtocolError("TASK-467 worker environment is incomplete");
  }
  return value;
}

function optionalSecret(source: NodeJS.ProcessEnv, key: string): string | null {
  const value = source[key];
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new WorkerProtocolError(`TASK-467 worker environment secret ${key} is invalid`);
  }
  return value;
}

export function projectTask467WorkerEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const passwordPepper = optionalSecret(source, "AUTH_PASSWORD_PEPPER");
  const piiHashKey = optionalSecret(source, "PII_HASH_KEY");
  const piiEncKey = optionalSecret(source, "PII_ENC_KEY");
  const environment: Record<string, string> = {
    PATH: requiredEnvironment(source, "PATH"),
    DATABASE_URL: requiredEnvironment(source, "DATABASE_URL"),
    DB_POOL_MAX: "1",
  };
  if (passwordPepper !== null) environment.AUTH_PASSWORD_PEPPER = passwordPepper;
  if (piiHashKey !== null) environment.PII_HASH_KEY = piiHashKey;
  if (piiEncKey !== null) environment.PII_ENC_KEY = piiEncKey;
  return Object.freeze(environment);
}

function task467WorkerProfiles(
  root: string,
  source: NodeJS.ProcessEnv
): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: TASK467_WORKER_PROFILE_ID,
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-467/worker-entry.ts",
        "TASK-467 worker entry"
      ),
      cwd: root,
      family: "task467-worker-db",
      requestTimeoutMs: 120_000,
      maximumFrameBytes: 1024 * 1024,
      environment: () => projectTask467WorkerEnvironment(source),
    }),
  ]);
}

export async function createTask467WorkerPool(
  context: RuntimeSmokeContext,
  registry: WorkerOperationRegistry,
  source: NodeJS.ProcessEnv = process.env
): Promise<WorkerPool> {
  const pathValue = requiredEnvironment(source, "PATH");
  const executable = await resolveExecutableOnPath("bun", pathValue);
  if (executable.length === 0) {
    throw new SmokeError("smoke_process_failed", "TASK-467 bun executable is unavailable");
  }
  return WorkerPool.create({
    root: context.root,
    executable,
    supervisor: context.processes,
    registry,
    profiles: task467WorkerProfiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}
