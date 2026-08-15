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
import { Task492ProductionHandlers } from "./production-handlers";

export const TASK492_WORKER_PROFILE_ID = "task-492-db";
export const TASK492_WORKER_OPERATION_IDS = Object.freeze([
  "task-492/bootstrap",
  "task-492/read",
  "task-492/cleanup",
  "task-492/prove",
] as const);

export interface Task492RecoveryAuthority extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly profile: "fast" | "certification";
  readonly recoveryKey: string;
}

export interface Task492AdminCredential extends PlainJsonObject {
  readonly email: string;
  readonly password: string;
}

export interface Task492BootstrapInput extends PlainJsonObject {
  readonly authority: Task492RecoveryAuthority;
  readonly admin: Task492AdminCredential;
}

export interface Task492BootstrapOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly adminPath: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task492ReadInput extends PlainJsonObject {
  readonly authority: Task492RecoveryAuthority;
  readonly expectedWebhookUrl: string;
  readonly expectedRecipients: readonly string[];
}

export interface Task492ReadOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly webhookUrlMatches: true;
  readonly webhookSecretEncryptedAtRest: true;
  readonly recipientsMatch: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task492CleanupOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly sessionsRemoved: number;
  readonly auditRowsRemoved: number;
  readonly accessLogsRemoved: number;
  readonly userRolesRemoved: number;
  readonly usersRemoved: number;
  readonly rolesRemoved: number;
  readonly preIdentityAbsenceProved: true;
  readonly identityAbsenceProved: true;
  readonly settingsRestored: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task492ProofOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly fixturesAbsent: true;
  readonly identitiesAbsent: true;
  readonly settingsRestored: true;
  readonly receiptAbsent: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task492WorkerHandlers {
  bootstrap(input: Task492BootstrapInput): Promise<Task492BootstrapOutput>;
  read(input: Task492ReadInput): Promise<Task492ReadOutput>;
  cleanup(input: Task492RecoveryAuthority): Promise<Task492CleanupOutput>;
  prove(input: Task492RecoveryAuthority): Promise<Task492ProofOutput>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

const MARKER = /^[a-f0-9]{12,32}$/u;
const EMAIL = /^task492-[a-f0-9]{12,32}-admin@smoke\.invalid$/u;
const PASSWORD = /^[A-Za-z0-9_-]{24,128}$/u;
const RECOVERY_KEY = /^[A-Za-z0-9_-]{43}$/u;
const ADMIN_PATH = /^\/[A-Za-z0-9._/-]+$/u;
const WEBHOOK_URL = /^https:\/\/example\.test\/wf560-492-[a-z0-9-]+$/u;
const MAX_PASSWORD_PEPPER_BYTES = 8 * 1024;

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

function recoveryAuthority(value: unknown): Task492RecoveryAuthority {
  const authority = exactObject(
    value,
    ["schemaVersion", "runMarker", "profile", "recoveryKey"],
    "TASK-492 recovery authority"
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
    fail("TASK-492 recovery authority is invalid");
  }
  return Object.freeze(authority as unknown as Task492RecoveryAuthority);
}

function adminCredential(value: unknown): Task492AdminCredential {
  const admin = exactObject(value, ["email", "password"], "TASK-492 admin credential");
  if (
    typeof admin.email !== "string" ||
    !EMAIL.test(admin.email) ||
    typeof admin.password !== "string" ||
    !PASSWORD.test(admin.password)
  ) {
    fail("TASK-492 admin credential is invalid");
  }
  return Object.freeze(admin as unknown as Task492AdminCredential);
}

function bootstrapInput(value: unknown): Task492BootstrapInput {
  const input = exactObject(value, ["authority", "admin"], "TASK-492 bootstrap input");
  const authority = recoveryAuthority(input.authority);
  const admin = adminCredential(input.admin);
  if (admin.email !== `task492-${authority.runMarker}-admin@smoke.invalid`) {
    fail("TASK-492 admin marker drifted");
  }
  return Object.freeze({ authority, admin });
}

function readInput(value: unknown): Task492ReadInput {
  const input = exactObject(
    value,
    ["authority", "expectedWebhookUrl", "expectedRecipients"],
    "TASK-492 read input"
  );
  const authority = recoveryAuthority(input.authority);
  if (
    typeof input.expectedWebhookUrl !== "string" ||
    !WEBHOOK_URL.test(input.expectedWebhookUrl) ||
    !Array.isArray(input.expectedRecipients) ||
    input.expectedRecipients.length > 8 ||
    input.expectedRecipients.some(
      (recipient) =>
        typeof recipient !== "string" || recipient.length === 0 || recipient.length > 320
    )
  ) {
    fail("TASK-492 read input is invalid");
  }
  return Object.freeze({
    authority,
    expectedWebhookUrl: input.expectedWebhookUrl,
    expectedRecipients: Object.freeze([...input.expectedRecipients]),
  } as Task492ReadInput);
}

function output(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  const result = exactObject(value, keys, label);
  if (result.schemaVersion !== 1) fail(`${label} schema version drifted`);
  requireInteger(result.statements, 1, `${label} statements`);
  requireInteger(result.rows, 0, `${label} rows`);
  return result;
}

function bootstrapOutput(value: unknown): Task492BootstrapOutput {
  const result = output(
    value,
    ["schemaVersion", "runMarker", "adminPath", "statements", "rows"],
    "TASK-492 bootstrap output"
  ) as unknown as Task492BootstrapOutput;
  if (
    typeof result.runMarker !== "string" ||
    !MARKER.test(result.runMarker) ||
    typeof result.adminPath !== "string" ||
    !ADMIN_PATH.test(result.adminPath)
  ) {
    fail("TASK-492 bootstrap output is invalid");
  }
  return result;
}

function readOutput(value: unknown): Task492ReadOutput {
  const result = output(
    value,
    [
      "schemaVersion",
      "webhookUrlMatches",
      "webhookSecretEncryptedAtRest",
      "recipientsMatch",
      "statements",
      "rows",
    ],
    "TASK-492 read output"
  ) as unknown as Task492ReadOutput;
  if (
    result.webhookUrlMatches !== true ||
    result.webhookSecretEncryptedAtRest !== true ||
    result.recipientsMatch !== true
  ) {
    fail("TASK-492 read proof failed");
  }
  return result;
}

function cleanupOutput(value: unknown): Task492CleanupOutput {
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
      "settingsRestored",
      "statements",
      "rows",
    ],
    "TASK-492 cleanup output"
  ) as unknown as Task492CleanupOutput;
  for (const key of [
    "sessionsRemoved",
    "auditRowsRemoved",
    "accessLogsRemoved",
    "userRolesRemoved",
    "usersRemoved",
    "rolesRemoved",
  ] as const) {
    requireInteger(result[key], 0, `TASK-492 ${key}`);
  }
  if (
    result.preIdentityAbsenceProved !== true ||
    result.identityAbsenceProved !== true ||
    result.settingsRestored !== true
  ) {
    fail("TASK-492 cleanup absence proof failed");
  }
  return result;
}

function proofOutput(value: unknown): Task492ProofOutput {
  const result = output(
    value,
    [
      "schemaVersion",
      "fixturesAbsent",
      "identitiesAbsent",
      "settingsRestored",
      "receiptAbsent",
      "statements",
      "rows",
    ],
    "TASK-492 proof output"
  ) as unknown as Task492ProofOutput;
  if (
    result.fixturesAbsent !== true ||
    result.identitiesAbsent !== true ||
    result.settingsRestored !== true ||
    result.receiptAbsent !== true
  ) {
    fail("TASK-492 terminal proof failed");
  }
  return result;
}

const OPERATION_DIGEST = createHash("sha256").update("task-492-worker-v1").digest("hex");

function descriptor(
  operationId: (typeof TASK492_WORKER_OPERATION_IDS)[number],
  retryClass: "mutation" | "idempotent-read"
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId: TASK492_WORKER_PROFILE_ID,
    inputSchemaId: `${operationId.replaceAll("/", "-")}-input-v1`,
    outputSchemaId: `${operationId.replaceAll("/", "-")}-output-v1`,
    sourceSha256: createHash("sha256").update(`${OPERATION_DIGEST}\0${operationId}`).digest("hex"),
    retryClass,
    maxInputBytes: 128 * 1024,
    maxOutputBytes: 128 * 1024,
  });
}

export const TASK492_WORKER_DESCRIPTORS = Object.freeze({
  bootstrap: descriptor("task-492/bootstrap", "mutation"),
  read: descriptor("task-492/read", "idempotent-read"),
  cleanup: descriptor("task-492/cleanup", "mutation"),
  prove: descriptor("task-492/prove", "idempotent-read"),
});

function definition<TInput extends PlainJsonObject, TOutput extends PlainJsonObject>(
  descriptorInput: WorkerOperationDescriptor,
  validateInput: (value: unknown) => TInput,
  validateOutput: (value: unknown) => TOutput,
  execute: (input: TInput) => Promise<TOutput>
): WorkerOperationDefinition<TInput, TOutput> {
  return Object.freeze({ ...descriptorInput, validateInput, validateOutput, execute });
}

export function createTask492WorkerRegistry(
  handlers: Task492WorkerHandlers = new Task492ProductionHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      definition(TASK492_WORKER_DESCRIPTORS.bootstrap, bootstrapInput, bootstrapOutput, (input) =>
        handlers.bootstrap(input)
      ),
      definition(TASK492_WORKER_DESCRIPTORS.read, readInput, readOutput, (input) =>
        handlers.read(input)
      ),
      definition(TASK492_WORKER_DESCRIPTORS.cleanup, recoveryAuthority, cleanupOutput, (input) =>
        handlers.cleanup(input)
      ),
      definition(TASK492_WORKER_DESCRIPTORS.prove, recoveryAuthority, proofOutput, (input) =>
        handlers.prove(input)
      ),
    ],
    { close: () => handlers.close(), proveAbsent: () => handlers.proveAbsent() }
  );
}

export function createTask492RecoveryAuthority(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly recoveryKey: string;
}): Task492RecoveryAuthority {
  return recoveryAuthority(Object.freeze({ schemaVersion: 1, ...input }));
}

export function createTask492BootstrapInput(input: {
  readonly authority: Task492RecoveryAuthority;
  readonly email: string;
  readonly password: string;
}): Task492BootstrapInput {
  return bootstrapInput(
    Object.freeze({
      authority: input.authority,
      admin: Object.freeze({ email: input.email, password: input.password }),
    })
  );
}

export function createTask492ReadInput(input: {
  readonly authority: Task492RecoveryAuthority;
  readonly expectedWebhookUrl: string;
  readonly expectedRecipients: readonly string[];
}): Task492ReadInput {
  return readInput(
    Object.freeze({
      authority: input.authority,
      expectedWebhookUrl: input.expectedWebhookUrl,
      expectedRecipients: input.expectedRecipients,
    })
  );
}

export function assertTask492WorkerDescriptorParity(
  descriptors: readonly WorkerOperationDescriptor[]
): void {
  const actual = descriptors.map(({ operationId }) => operationId).sort();
  const expected = [...TASK492_WORKER_OPERATION_IDS].sort();
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index]))
    fail("TASK-492 worker descriptors drifted");
  for (const entry of descriptors)
    assertSha256(entry.sourceSha256, "TASK-492 worker descriptor hash");
}

function requiredEnvironment(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new WorkerProtocolError("TASK-492 worker environment is incomplete");
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
    throw new WorkerProtocolError("TASK-492 worker password pepper is invalid");
  }
  return value;
}

/**
 * The database worker receives the server's bounded password pepper and PII
 * keys, never browser credentials or secrets from the smoke run.
 */
export function projectTask492WorkerEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const passwordPepper = optionalPasswordPepper(source);
  return Object.freeze({
    PATH: requiredEnvironment(source, "PATH"),
    DATABASE_URL: requiredEnvironment(source, "DATABASE_URL"),
    ...(passwordPepper === null ? {} : { AUTH_PASSWORD_PEPPER: passwordPepper }),
    // The worker creates and reconciles the smoke admin through the app's
    // canonical PII email fields (HMAC email, hash and encrypted variants),
    // so it needs the same PII keys the Admin login flow resolves.
    PII_HASH_KEY: requiredEnvironment(source, "PII_HASH_KEY"),
    PII_ENC_KEY: requiredEnvironment(source, "PII_ENC_KEY"),
    DB_POOL_MAX: "1",
  });
}

function task492WorkerProfiles(
  root: string,
  source: NodeJS.ProcessEnv
): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: TASK492_WORKER_PROFILE_ID,
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-492/worker-entry.ts",
        "TASK-492 worker entry"
      ),
      cwd: root,
      family: "task492-worker-db",
      requestTimeoutMs: 120_000,
      maximumFrameBytes: 1024 * 1024,
      environment: () => projectTask492WorkerEnvironment(source),
    }),
  ]);
}

export async function createTask492WorkerPool(
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
    profiles: task492WorkerProfiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}
