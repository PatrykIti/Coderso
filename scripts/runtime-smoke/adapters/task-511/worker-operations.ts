import { createHash } from "node:crypto";

import { assertExactKeys, isPlainObject, resolveInsideRoot } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { resolveExecutableOnPath } from "../../process-supervisor";
import {
  WorkerProtocolError,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerOperationDescriptor,
} from "../../workers/contracts";
import { WorkerOperationRegistry } from "../../workers/operation-registry";
import { WorkerPool, type WorkerProfileSpec } from "../../workers/pool";
import { Task511ProductionHandlers } from "./production-handlers";

export const TASK511_WORKER_PROFILE_ID = "task-511-db";
export const TASK511_WORKER_OPERATION_IDS = Object.freeze([
  "task-511/install",
  "task-511/cleanup",
  "task-511/prove",
] as const);

export interface Task511RecoveryAuthority extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly profile: "fast" | "certification";
  readonly recoveryKey: string;
}

export interface Task511ActorCredentials extends PlainJsonObject {
  readonly email: string;
  readonly password: string;
}

export interface Task511InstallInput extends PlainJsonObject {
  readonly authority: Task511RecoveryAuthority;
  readonly actor: Task511ActorCredentials;
}

export interface Task511InstallActor extends PlainJsonObject {
  readonly userId: string;
  readonly roleId: string;
}

export interface Task511InstallOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly adminPath: string;
  readonly scheduleEnabled: boolean;
  readonly actor: Task511InstallActor;
  readonly statements: number;
  readonly rows: number;
}

export interface Task511CleanupInput extends PlainJsonObject {
  readonly authority: Task511RecoveryAuthority;
  readonly backupIds: readonly string[];
}

export interface Task511CleanupOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly backupRowsRemoved: number;
  readonly artifactFilesRemoved: number;
  readonly scheduleRestored: boolean;
  readonly avatarSettingsRestored: boolean;
  readonly rateLimitRestored: boolean;
  readonly userRolesRemoved: number;
  readonly usersRemoved: number;
  readonly rolesRemoved: number;
  readonly preAbsenceProved: boolean;
  readonly postAbsenceProved: boolean;
  readonly statements: number;
  readonly rows: number;
}

export interface Task511ProofInput extends PlainJsonObject {
  readonly authority: Task511RecoveryAuthority;
  readonly backupIds: readonly string[];
}

export interface Task511ProofOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly backupsAbsent: boolean;
  readonly artifactsAbsent: boolean;
  readonly scheduleRestored: boolean;
  readonly avatarSettingsRestored: boolean;
  readonly rateLimitRestored: boolean;
  readonly actorAbsent: boolean;
  readonly statements: number;
  readonly rows: number;
}

export interface Task511WorkerHandlers {
  readonly install: (input: Task511InstallInput) => Promise<Task511InstallOutput>;
  readonly cleanup: (input: Task511CleanupInput) => Promise<Task511CleanupOutput>;
  readonly prove: (input: Task511ProofInput) => Promise<Task511ProofOutput>;
  readonly close: () => Promise<void>;
  readonly proveAbsent: () => Promise<boolean>;
}

const TASK511_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const TASK511_RUN_MARKER = /^[a-f0-9]{12,32}$/u;
const TASK511_RECOVERY_KEY = /^[A-Za-z0-9_-]{32,64}$/u;
const TASK511_ACTOR_EMAIL = /^task511-[a-f0-9]{12,32}-admin@smoke\.invalid$/u;
const TASK511_ACTOR_PASSWORD = /^[A-Za-z0-9_-]{32,64}$/u;
const TASK511_ADMIN_PATH = /^\/[a-z0-9][a-z0-9._-]{0,127}$/u;

function failure(message: string): never {
  throw new WorkerProtocolError(message);
}

function requireUuid(value: unknown, message: string): string {
  if (typeof value !== "string" || !TASK511_UUID.test(value)) failure(message);
  return value;
}

function requireCount(value: unknown, message: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    failure(message);
  }
  return value;
}

function requireBoolean(value: unknown, message: string): boolean {
  if (typeof value !== "boolean") failure(message);
  return value;
}

function requireStringList(value: unknown, message: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length > 64 ||
    value.some((entry) => typeof entry !== "string" || !TASK511_UUID.test(entry))
  ) {
    failure(message);
  }
  return Object.freeze([...value]);
}

export function assertTask511RecoveryAuthority(
  value: unknown
): asserts value is Task511RecoveryAuthority {
  if (!isPlainObject(value)) failure("task-511 recovery authority is invalid");
  assertExactKeys(
    value,
    ["profile", "recoveryKey", "runMarker", "schemaVersion"],
    "recovery authority"
  );
  if (value.schemaVersion !== 1) failure("task-511 recovery schema version drifted");
  if (value.profile !== "fast" && value.profile !== "certification") {
    failure("task-511 recovery profile is invalid");
  }
  if (typeof value.runMarker !== "string" || !TASK511_RUN_MARKER.test(value.runMarker)) {
    failure("task-511 recovery run marker is invalid");
  }
  if (typeof value.recoveryKey !== "string" || !TASK511_RECOVERY_KEY.test(value.recoveryKey)) {
    failure("task-511 recovery key is invalid");
  }
}

export function assertTask511ActorCredentials(
  value: unknown
): asserts value is Task511ActorCredentials {
  if (!isPlainObject(value)) failure("task-511 actor credentials are invalid");
  assertExactKeys(value, ["email", "password"], "actor credentials");
  if (typeof value.email !== "string" || !TASK511_ACTOR_EMAIL.test(value.email)) {
    failure("task-511 actor email is invalid");
  }
  if (typeof value.password !== "string" || !TASK511_ACTOR_PASSWORD.test(value.password)) {
    failure("task-511 actor password is invalid");
  }
}

export function assertTask511InstallInput(value: unknown): asserts value is Task511InstallInput {
  if (!isPlainObject(value)) failure("task-511 install input is invalid");
  assertExactKeys(value, ["actor", "authority"], "install input");
  assertTask511RecoveryAuthority(value.authority);
  assertTask511ActorCredentials(value.actor);
}

export function assertTask511InstallOutput(value: unknown): asserts value is Task511InstallOutput {
  if (!isPlainObject(value)) failure("task-511 install output is invalid");
  assertExactKeys(
    value,
    ["actor", "adminPath", "runMarker", "rows", "scheduleEnabled", "schemaVersion", "statements"],
    "install output"
  );
  if (value.schemaVersion !== 1) failure("task-511 install schema version drifted");
  if (typeof value.runMarker !== "string" || !TASK511_RUN_MARKER.test(value.runMarker)) {
    failure("task-511 install run marker drifted");
  }
  if (typeof value.adminPath !== "string" || !TASK511_ADMIN_PATH.test(value.adminPath)) {
    failure("task-511 install admin path drifted");
  }
  requireBoolean(value.scheduleEnabled, "task-511 install schedule flag drifted");
  const actor = value.actor;
  if (!isPlainObject(actor)) failure("task-511 install actor drifted");
  assertExactKeys(actor, ["roleId", "userId"], "install actor");
  requireUuid(actor.userId, "task-511 install actor user id drifted");
  requireUuid(actor.roleId, "task-511 install actor role id drifted");
  requireCount(value.statements, "task-511 install statement count drifted");
  requireCount(value.rows, "task-511 install row count drifted");
}

export function assertTask511CleanupInput(value: unknown): asserts value is Task511CleanupInput {
  if (!isPlainObject(value)) failure("task-511 cleanup input is invalid");
  assertExactKeys(value, ["authority", "backupIds"], "cleanup input");
  assertTask511RecoveryAuthority(value.authority);
  requireStringList(value.backupIds, "task-511 cleanup backup ids are invalid");
}

export function assertTask511CleanupOutput(value: unknown): asserts value is Task511CleanupOutput {
  if (!isPlainObject(value)) failure("task-511 cleanup output is invalid");
  assertExactKeys(
    value,
    [
      "artifactFilesRemoved",
      "avatarSettingsRestored",
      "backupRowsRemoved",
      "postAbsenceProved",
      "preAbsenceProved",
      "rateLimitRestored",
      "rolesRemoved",
      "rows",
      "scheduleRestored",
      "schemaVersion",
      "statements",
      "userRolesRemoved",
      "usersRemoved",
    ],
    "cleanup output"
  );
  if (value.schemaVersion !== 1) failure("task-511 cleanup schema version drifted");
  requireCount(value.backupRowsRemoved, "task-511 cleanup backup row count drifted");
  requireCount(value.artifactFilesRemoved, "task-511 cleanup artifact count drifted");
  requireBoolean(value.scheduleRestored, "task-511 cleanup schedule proof drifted");
  requireBoolean(value.avatarSettingsRestored, "task-511 cleanup avatar proof drifted");
  requireBoolean(value.rateLimitRestored, "task-511 cleanup rate limit proof drifted");
  requireCount(value.userRolesRemoved, "task-511 cleanup join count drifted");
  requireCount(value.usersRemoved, "task-511 cleanup user count drifted");
  requireCount(value.rolesRemoved, "task-511 cleanup role count drifted");
  requireBoolean(value.preAbsenceProved, "task-511 cleanup pre-absence proof drifted");
  requireBoolean(value.postAbsenceProved, "task-511 cleanup post-absence proof drifted");
  requireCount(value.statements, "task-511 cleanup statement count drifted");
  requireCount(value.rows, "task-511 cleanup row count drifted");
}

export function assertTask511ProofInput(value: unknown): asserts value is Task511ProofInput {
  if (!isPlainObject(value)) failure("task-511 proof input is invalid");
  assertExactKeys(value, ["authority", "backupIds"], "proof input");
  assertTask511RecoveryAuthority(value.authority);
  requireStringList(value.backupIds, "task-511 proof backup ids are invalid");
}

export function assertTask511ProofOutput(value: unknown): asserts value is Task511ProofOutput {
  if (!isPlainObject(value)) failure("task-511 proof output is invalid");
  assertExactKeys(
    value,
    [
      "actorAbsent",
      "artifactsAbsent",
      "avatarSettingsRestored",
      "backupsAbsent",
      "rateLimitRestored",
      "rows",
      "scheduleRestored",
      "schemaVersion",
      "statements",
    ],
    "proof output"
  );
  if (value.schemaVersion !== 1) failure("task-511 proof schema version drifted");
  requireBoolean(value.backupsAbsent, "task-511 proof backup absence drifted");
  requireBoolean(value.artifactsAbsent, "task-511 proof artifact absence drifted");
  requireBoolean(value.scheduleRestored, "task-511 proof schedule proof drifted");
  requireBoolean(value.avatarSettingsRestored, "task-511 proof avatar proof drifted");
  requireBoolean(value.rateLimitRestored, "task-511 proof rate limit proof drifted");
  requireBoolean(value.actorAbsent, "task-511 proof actor absence drifted");
  requireCount(value.statements, "task-511 proof statement count drifted");
  requireCount(value.rows, "task-511 proof row count drifted");
}

const OPERATION_DIGEST = createHash("sha256").update("task-511-worker-v1").digest("hex");

function task511OperationSha(operationId: string): string {
  return createHash("sha256").update(`${OPERATION_DIGEST}\0${operationId}`).digest("hex");
}

export const TASK511_WORKER_DESCRIPTORS: Readonly<{
  readonly install: WorkerOperationDescriptor;
  readonly cleanup: WorkerOperationDescriptor;
  readonly prove: WorkerOperationDescriptor;
}> = Object.freeze({
  install: Object.freeze({
    operationId: "task-511/install",
    profileId: TASK511_WORKER_PROFILE_ID,
    inputSchemaId: "task-511-install-input-v1",
    outputSchemaId: "task-511-install-output-v1",
    sourceSha256: task511OperationSha("task-511/install"),
    retryClass: "mutation",
    maxInputBytes: 8192,
    maxOutputBytes: 8192,
  }),
  cleanup: Object.freeze({
    operationId: "task-511/cleanup",
    profileId: TASK511_WORKER_PROFILE_ID,
    inputSchemaId: "task-511-cleanup-input-v1",
    outputSchemaId: "task-511-cleanup-output-v1",
    sourceSha256: task511OperationSha("task-511/cleanup"),
    retryClass: "mutation",
    maxInputBytes: 65536,
    maxOutputBytes: 8192,
  }),
  prove: Object.freeze({
    operationId: "task-511/prove",
    profileId: TASK511_WORKER_PROFILE_ID,
    inputSchemaId: "task-511-prove-input-v1",
    outputSchemaId: "task-511-prove-output-v1",
    sourceSha256: task511OperationSha("task-511/prove"),
    retryClass: "idempotent-read",
    maxInputBytes: 65536,
    maxOutputBytes: 8192,
  }),
});

export function createTask511RecoveryAuthority(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly recoveryKey: string;
}): Task511RecoveryAuthority {
  const authority = Object.freeze({
    schemaVersion: 1,
    runMarker: input.runMarker,
    profile: input.profile,
    recoveryKey: input.recoveryKey,
  });
  assertTask511RecoveryAuthority(authority);
  return authority;
}

export function createTask511InstallInput(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly recoveryKey: string;
  readonly actor: Task511ActorCredentials;
}): Task511InstallInput {
  const value = Object.freeze({
    authority: createTask511RecoveryAuthority({
      profile: input.profile,
      runMarker: input.runMarker,
      recoveryKey: input.recoveryKey,
    }),
    actor: Object.freeze({ email: input.actor.email, password: input.actor.password }),
  });
  assertTask511InstallInput(value);
  return value;
}

export function createTask511CleanupInput(input: {
  readonly authority: Task511RecoveryAuthority;
  readonly backupIds: readonly string[];
}): Task511CleanupInput {
  const value = Object.freeze({
    authority: input.authority,
    backupIds: Object.freeze([...input.backupIds]),
  });
  assertTask511CleanupInput(value);
  return value;
}

export function createTask511ProofInput(input: {
  readonly authority: Task511RecoveryAuthority;
  readonly backupIds: readonly string[];
}): Task511ProofInput {
  const value = Object.freeze({
    authority: input.authority,
    backupIds: Object.freeze([...input.backupIds]),
  });
  assertTask511ProofInput(value);
  return value;
}

export function createTask511WorkerRegistry(
  handlers: Task511WorkerHandlers = new Task511ProductionHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      {
        ...TASK511_WORKER_DESCRIPTORS.install,
        validateInput(value): PlainJsonObject {
          assertTask511InstallInput(value);
          return value as PlainJsonObject;
        },
        validateOutput(value): PlainJsonValue {
          assertTask511InstallOutput(value);
          return value as PlainJsonValue;
        },
        async execute(input): Promise<PlainJsonValue> {
          return (await handlers.install(input as Task511InstallInput)) as PlainJsonValue;
        },
      },
      {
        ...TASK511_WORKER_DESCRIPTORS.cleanup,
        validateInput(value): PlainJsonObject {
          assertTask511CleanupInput(value);
          return value as PlainJsonObject;
        },
        validateOutput(value): PlainJsonValue {
          assertTask511CleanupOutput(value);
          return value as PlainJsonValue;
        },
        async execute(input): Promise<PlainJsonValue> {
          return (await handlers.cleanup(input as Task511CleanupInput)) as PlainJsonValue;
        },
      },
      {
        ...TASK511_WORKER_DESCRIPTORS.prove,
        validateInput(value): PlainJsonObject {
          assertTask511ProofInput(value);
          return value as PlainJsonObject;
        },
        validateOutput(value): PlainJsonValue {
          assertTask511ProofOutput(value);
          return value as PlainJsonValue;
        },
        async execute(input): Promise<PlainJsonValue> {
          return (await handlers.prove(input as Task511ProofInput)) as PlainJsonValue;
        },
      },
    ],
    {
      async close(): Promise<void> {
        await handlers.close();
      },
      async proveAbsent(): Promise<boolean> {
        return handlers.proveAbsent();
      },
    }
  );
}

function requiredEnvironment(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    failure("task-511 worker environment is incomplete");
  }
  return value;
}

function optionalPasswordPepper(source: NodeJS.ProcessEnv): string | null {
  const value = source.AUTH_PASSWORD_PEPPER;
  if (value === undefined) return null;
  if (typeof value !== "string" || value.includes("\0") || Buffer.byteLength(value) > 256) {
    failure("task-511 worker password pepper is invalid");
  }
  return value;
}

/**
 * The database worker receives the server's bounded password pepper, never
 * browser credentials. It creates the fixture admin through the app's
 * canonical PII email fields and password hashing, so it needs the same
 * PII keys and password pepper the Admin login flow resolves.
 */
export function projectTask511WorkerEnvironment(
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

function task511WorkerProfiles(
  root: string,
  source: NodeJS.ProcessEnv
): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: TASK511_WORKER_PROFILE_ID,
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-511/worker-entry.ts",
        "TASK-511 worker entry"
      ),
      cwd: root,
      family: "task511-worker-db",
      requestTimeoutMs: 120_000,
      maximumFrameBytes: 1024 * 1024,
      environment: () => projectTask511WorkerEnvironment(source),
    }),
  ]);
}

export async function createTask511WorkerPool(
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
    profiles: task511WorkerProfiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}
