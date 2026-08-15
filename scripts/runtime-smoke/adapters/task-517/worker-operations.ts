import { createHash, randomBytes } from "node:crypto";

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
  TASK517_FIXTURE_KINDS,
  buildTask517FixtureSpecs,
  deriveTask517FixtureSpec,
  type Task517FixtureKind,
} from "./browser-actions";
import { Task517ProductionHandlers } from "./production-handlers";

export const TASK517_WORKER_PROFILE_ID = "task-517-db";
export const TASK517_WORKER_OPERATION_IDS = Object.freeze([
  "task-517/install",
  "task-517/read",
  "task-517/cleanup",
  "task-517/prove",
] as const);

export interface Task517RecoveryAuthority extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly profile: "fast" | "certification";
  readonly recoveryKey: string;
}

export interface Task517AdminCredentials extends PlainJsonObject {
  readonly email: string;
  readonly password: string;
}

export interface Task517FixtureSpec extends PlainJsonObject {
  readonly fixtureId: string;
  readonly kind: Task517FixtureKind;
  readonly slug: string;
  readonly title: string;
  readonly bodyMarker: string;
  readonly accessPassword: string | null;
}

export interface Task517InstallInput extends PlainJsonObject {
  readonly authority: Task517RecoveryAuthority;
  readonly admin: Task517AdminCredentials;
  readonly fixtures: readonly Task517FixtureSpec[];
}

export interface Task517InstalledFixture extends PlainJsonObject {
  readonly fixtureId: string;
  readonly kind: Task517FixtureKind;
  readonly entryId: string;
  readonly typeId: string;
}

export interface Task517InstallOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly adminUserId: string;
  readonly roleId: string;
  readonly contentTypeId: string;
  readonly contentTypeSlug: string;
  readonly adminPath: string;
  readonly fixtures: readonly Task517InstalledFixture[];
  readonly statements: number;
  readonly rows: number;
}

export interface Task517ReadInput extends PlainJsonObject {
  readonly authority: Task517RecoveryAuthority;
  readonly fixtureIds: readonly string[];
}

export interface Task517ReadFixture extends PlainJsonObject {
  readonly fixtureId: string;
  readonly kind: Task517FixtureKind;
  readonly visibility: "public" | "private" | "password";
  readonly status: "draft" | "published";
  readonly published: boolean;
  readonly hasAccessPassword: boolean;
  readonly title: string;
  readonly slug: string;
  readonly bodyMarker: string;
}

export interface Task517ReadOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly fixtures: readonly Task517ReadFixture[];
  readonly statements: number;
  readonly rows: number;
}

export interface Task517CleanupOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly accessLogsRemoved: number;
  readonly loginAuditRowsRemoved: number;
  readonly sessionsRemoved: number;
  readonly userRolesRemoved: number;
  readonly entriesRemoved: number;
  readonly contentTypesRemoved: number;
  readonly usersRemoved: number;
  readonly rolesRemoved: number;
  readonly preIdentityAbsenceProved: true;
  readonly identityAbsenceProved: true;
  readonly settingsRestored: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task517ProofOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly fixturesAbsent: true;
  readonly identitiesAbsent: true;
  readonly settingsRestored: true;
  readonly statements: number;
  readonly rows: number;
}

export interface Task517WorkerHandlers {
  install(input: Task517InstallInput): Promise<Task517InstallOutput>;
  read(input: Task517ReadInput): Promise<Task517ReadOutput>;
  cleanup(input: Task517RecoveryAuthority): Promise<Task517CleanupOutput>;
  prove(input: Task517RecoveryAuthority): Promise<Task517ProofOutput>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MARKER = /^[a-f0-9]{12,32}$/u;
const EMAIL = /^task517-[a-f0-9]{12,32}-admin@smoke\.invalid$/u;
const PASSWORD = /^[A-Za-z0-9_-]{24,128}$/u;
const RECOVERY_KEY = /^[A-Za-z0-9_-]{43}$/u;
const SLUG = /^task517-(public|private|pass-a|pass-b)-[a-f0-9]{12,32}$/u;
const FIXTURE_ID = /^task-517-fixture-[1-4]$/u;
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

function adminCredential(value: unknown): Task517AdminCredentials {
  const actor = exactObject(value, ["email", "password"], "TASK-517 admin credential");
  if (
    typeof actor.email !== "string" ||
    !EMAIL.test(actor.email) ||
    typeof actor.password !== "string" ||
    !PASSWORD.test(actor.password)
  ) {
    fail("TASK-517 admin credential is invalid");
  }
  return Object.freeze(actor as unknown as Task517AdminCredentials);
}

function fixtureSpec(value: unknown): Task517FixtureSpec {
  const entry = exactObject(
    value,
    ["fixtureId", "kind", "slug", "title", "bodyMarker", "accessPassword"],
    "TASK-517 fixture spec"
  );
  if (
    typeof entry.fixtureId !== "string" ||
    !FIXTURE_ID.test(entry.fixtureId) ||
    typeof entry.kind !== "string" ||
    !TASK517_FIXTURE_KINDS.includes(entry.kind as Task517FixtureKind) ||
    typeof entry.slug !== "string" ||
    !SLUG.test(entry.slug) ||
    typeof entry.title !== "string" ||
    !entry.title.startsWith("TASK-517 ") ||
    entry.title.length > 128 ||
    typeof entry.bodyMarker !== "string" ||
    !MARKER.test(entry.bodyMarker) ||
    entry.title.includes(entry.bodyMarker) ||
    (typeof entry.accessPassword !== "string" && entry.accessPassword !== null) ||
    (entry.accessPassword !== null && !PASSWORD.test(entry.accessPassword))
  ) {
    fail("TASK-517 fixture spec is invalid");
  }
  return Object.freeze(entry as unknown as Task517FixtureSpec);
}

function recoveryAuthority(value: unknown): Task517RecoveryAuthority {
  const authority = exactObject(
    value,
    ["schemaVersion", "runMarker", "profile", "recoveryKey"],
    "TASK-517 recovery authority"
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
    fail("TASK-517 recovery authority is invalid");
  }
  return Object.freeze(authority as unknown as Task517RecoveryAuthority);
}

type Task517FixtureIdentity = Readonly<{
  readonly fixtureId: string;
  readonly kind: Task517FixtureKind;
}>;

function hasExactFixtureMatrix(fixtures: readonly Task517FixtureIdentity[]): boolean {
  const expected = buildTask517FixtureSpecs();
  return (
    fixtures.length === expected.length &&
    fixtures.every(
      (fixtureValue, index) =>
        fixtureValue.fixtureId === expected[index]?.fixtureId &&
        fixtureValue.kind === expected[index]?.kind
    )
  );
}

export function assertTask517FixtureMatrix(fixtures: readonly Task517FixtureIdentity[]): void {
  if (!hasExactFixtureMatrix(fixtures)) fail("TASK-517 fixture matrix is invalid");
}

function installInput(value: unknown): Task517InstallInput {
  const input = exactObject(value, ["authority", "admin", "fixtures"], "TASK-517 install input");
  const authority = recoveryAuthority(input.authority);
  if (!Array.isArray(input.fixtures)) fail("TASK-517 install input is invalid");
  const admin = adminCredential(input.admin);
  if (!EMAIL.test(admin.email) || !admin.email.startsWith(`task517-${authority.runMarker}-`)) {
    fail("TASK-517 admin marker drifted");
  }
  const fixtures = input.fixtures.map(fixtureSpec);
  assertTask517FixtureMatrix(fixtures);
  const kinds = fixtures.map(({ kind }) => kind).join(",");
  if (kinds !== "public,private,password-a,password-b") {
    fail("TASK-517 fixture kind order drifted");
  }
  for (const entry of fixtures) {
    const expected = deriveTask517FixtureSpec(authority.runMarker, entry.fixtureId);
    if (
      entry.slug !== expected.slug ||
      entry.title !== expected.title ||
      entry.bodyMarker !== expected.bodyMarker ||
      entry.accessPassword !== expected.accessPassword
    ) {
      fail("TASK-517 fixture spec drifted");
    }
  }
  return Object.freeze({ authority, admin, fixtures });
}

function installedFixture(value: unknown): Task517InstalledFixture {
  const entry = exactObject(
    value,
    ["fixtureId", "kind", "entryId", "typeId"],
    "TASK-517 installed fixture"
  );
  if (
    typeof entry.fixtureId !== "string" ||
    !FIXTURE_ID.test(entry.fixtureId) ||
    typeof entry.kind !== "string" ||
    !TASK517_FIXTURE_KINDS.includes(entry.kind as Task517FixtureKind)
  ) {
    fail("TASK-517 installed fixture is invalid");
  }
  requireUuid(entry.entryId, "TASK-517 installed fixture entryId");
  requireUuid(entry.typeId, "TASK-517 installed fixture typeId");
  return Object.freeze(entry as unknown as Task517InstalledFixture);
}

function installOutput(value: unknown): Task517InstallOutput {
  const output = exactObject(
    value,
    [
      "schemaVersion",
      "runMarker",
      "adminUserId",
      "roleId",
      "contentTypeId",
      "contentTypeSlug",
      "adminPath",
      "fixtures",
      "statements",
      "rows",
    ],
    "TASK-517 install output"
  );
  if (output.schemaVersion !== 1) fail("TASK-517 install output schema drifted");
  if (typeof output.runMarker !== "string" || !MARKER.test(output.runMarker)) {
    fail("TASK-517 install output marker is invalid");
  }
  requireUuid(output.adminUserId, "TASK-517 install output adminUserId");
  requireUuid(output.roleId, "TASK-517 install output roleId");
  requireUuid(output.contentTypeId, "TASK-517 install output contentTypeId");
  if (
    typeof output.contentTypeSlug !== "string" ||
    !/^task517-[a-f0-9]{12,32}$/u.test(output.contentTypeSlug) ||
    typeof output.adminPath !== "string" ||
    !/^\/[a-z0-9-]{3,40}$/u.test(output.adminPath)
  ) {
    fail("TASK-517 install output paths are invalid");
  }
  if (!Array.isArray(output.fixtures)) fail("TASK-517 install output fixtures are invalid");
  const fixtures = output.fixtures.map(installedFixture);
  assertTask517FixtureMatrix(fixtures);
  requireInteger(output.statements, 1, "TASK-517 install output statements");
  requireInteger(output.rows, 1, "TASK-517 install output rows");
  return Object.freeze({ ...output, fixtures }) as unknown as Task517InstallOutput;
}

function readInput(value: unknown): Task517ReadInput {
  const input = exactObject(value, ["authority", "fixtureIds"], "TASK-517 read input");
  recoveryAuthority(input.authority);
  if (
    !Array.isArray(input.fixtureIds) ||
    input.fixtureIds.length !== 4 ||
    input.fixtureIds.some((id) => typeof id !== "string" || !FIXTURE_ID.test(id)) ||
    new Set(input.fixtureIds).size !== 4
  ) {
    fail("TASK-517 read fixture set is invalid");
  }
  return Object.freeze(input as unknown as Task517ReadInput);
}

function readFixture(value: unknown): Task517ReadFixture {
  const entry = exactObject(
    value,
    [
      "fixtureId",
      "kind",
      "visibility",
      "status",
      "published",
      "hasAccessPassword",
      "title",
      "slug",
      "bodyMarker",
    ],
    "TASK-517 read fixture"
  );
  if (
    typeof entry.fixtureId !== "string" ||
    !FIXTURE_ID.test(entry.fixtureId) ||
    typeof entry.kind !== "string" ||
    !TASK517_FIXTURE_KINDS.includes(entry.kind as Task517FixtureKind) ||
    (entry.visibility !== "public" &&
      entry.visibility !== "private" &&
      entry.visibility !== "password") ||
    (entry.status !== "draft" && entry.status !== "published") ||
    typeof entry.published !== "boolean" ||
    typeof entry.hasAccessPassword !== "boolean" ||
    typeof entry.title !== "string" ||
    typeof entry.slug !== "string" ||
    typeof entry.bodyMarker !== "string"
  ) {
    fail("TASK-517 read fixture is invalid");
  }
  return Object.freeze(entry as unknown as Task517ReadFixture);
}

function readOutput(value: unknown): Task517ReadOutput {
  const output = exactObject(
    value,
    ["schemaVersion", "fixtures", "statements", "rows"],
    "TASK-517 read output"
  );
  if (output.schemaVersion !== 1) fail("TASK-517 read output schema drifted");
  if (!Array.isArray(output.fixtures) || output.fixtures.length !== 4) {
    fail("TASK-517 read output fixtures are invalid");
  }
  const fixtures = output.fixtures.map(readFixture);
  assertTask517FixtureMatrix(fixtures);
  requireInteger(output.statements, 1, "TASK-517 read output statements");
  requireInteger(output.rows, 4, "TASK-517 read output rows");
  return Object.freeze({ ...output, fixtures }) as unknown as Task517ReadOutput;
}

function cleanupOutput(value: unknown): Task517CleanupOutput {
  const output = exactObject(
    value,
    [
      "schemaVersion",
      "accessLogsRemoved",
      "loginAuditRowsRemoved",
      "sessionsRemoved",
      "userRolesRemoved",
      "entriesRemoved",
      "contentTypesRemoved",
      "usersRemoved",
      "rolesRemoved",
      "preIdentityAbsenceProved",
      "identityAbsenceProved",
      "settingsRestored",
      "statements",
      "rows",
    ],
    "TASK-517 cleanup output"
  );
  if (
    output.schemaVersion !== 1 ||
    output.preIdentityAbsenceProved !== true ||
    output.identityAbsenceProved !== true ||
    output.settingsRestored !== true
  ) {
    fail("TASK-517 cleanup output is invalid");
  }
  requireInteger(output.accessLogsRemoved, 0, "TASK-517 cleanup accessLogsRemoved");
  requireInteger(output.loginAuditRowsRemoved, 0, "TASK-517 cleanup loginAuditRowsRemoved");
  requireInteger(output.sessionsRemoved, 0, "TASK-517 cleanup sessionsRemoved");
  requireInteger(output.userRolesRemoved, 0, "TASK-517 cleanup userRolesRemoved");
  requireInteger(output.entriesRemoved, 4, "TASK-517 cleanup entriesRemoved");
  requireInteger(output.contentTypesRemoved, 1, "TASK-517 cleanup contentTypesRemoved");
  requireInteger(output.usersRemoved, 1, "TASK-517 cleanup usersRemoved");
  requireInteger(output.rolesRemoved, 1, "TASK-517 cleanup rolesRemoved");
  requireInteger(output.statements, 1, "TASK-517 cleanup statements");
  requireInteger(output.rows, 1, "TASK-517 cleanup rows");
  return output as unknown as Task517CleanupOutput;
}

function proofOutput(value: unknown): Task517ProofOutput {
  const result = exactObject(
    value,
    [
      "schemaVersion",
      "fixturesAbsent",
      "identitiesAbsent",
      "settingsRestored",
      "statements",
      "rows",
    ],
    "TASK-517 proof output"
  ) as unknown as Task517ProofOutput;
  if (
    result.schemaVersion !== 1 ||
    result.fixturesAbsent !== true ||
    result.identitiesAbsent !== true ||
    result.settingsRestored !== true
  ) {
    fail("TASK-517 terminal proof failed");
  }
  return result;
}

const OPERATION_DIGEST = createHash("sha256").update("task-517-worker-v1").digest("hex");

function descriptor(
  operationId: (typeof TASK517_WORKER_OPERATION_IDS)[number],
  retryClass: "mutation" | "idempotent-read"
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId: TASK517_WORKER_PROFILE_ID,
    inputSchemaId: `${operationId.replaceAll("/", "-")}-input-v1`,
    outputSchemaId: `${operationId.replaceAll("/", "-")}-output-v1`,
    sourceSha256: createHash("sha256").update(`${OPERATION_DIGEST}\0${operationId}`).digest("hex"),
    retryClass,
    maxInputBytes: 128 * 1024,
    maxOutputBytes: 128 * 1024,
  });
}

export const TASK517_WORKER_DESCRIPTORS = Object.freeze({
  install: descriptor("task-517/install", "mutation"),
  read: descriptor("task-517/read", "idempotent-read"),
  cleanup: descriptor("task-517/cleanup", "mutation"),
  prove: descriptor("task-517/prove", "idempotent-read"),
});

function definition<TInput extends PlainJsonObject, TOutput extends PlainJsonObject>(
  descriptorInput: WorkerOperationDescriptor,
  validateInput: (value: unknown) => TInput,
  validateOutput: (value: unknown) => TOutput,
  execute: (input: TInput) => Promise<TOutput>
): WorkerOperationDefinition<TInput, TOutput> {
  return Object.freeze({ ...descriptorInput, validateInput, validateOutput, execute });
}

export function createTask517WorkerRegistry(
  handlers: Task517WorkerHandlers = new Task517ProductionHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      definition(TASK517_WORKER_DESCRIPTORS.install, installInput, installOutput, (input) =>
        handlers.install(input)
      ),
      definition(TASK517_WORKER_DESCRIPTORS.read, readInput, readOutput, (input) =>
        handlers.read(input)
      ),
      definition(TASK517_WORKER_DESCRIPTORS.cleanup, recoveryAuthority, cleanupOutput, (input) =>
        handlers.cleanup(input)
      ),
      definition(TASK517_WORKER_DESCRIPTORS.prove, recoveryAuthority, proofOutput, (input) =>
        handlers.prove(input)
      ),
    ],
    { close: () => handlers.close(), proveAbsent: () => handlers.proveAbsent() }
  );
}

export function createTask517InstallInput(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly recoveryKey: string;
  readonly admin: Task517AdminCredentials;
}): Task517InstallInput {
  const fixtures = buildTask517FixtureSpecs().map(({ fixtureId, kind }) =>
    Object.freeze({ ...deriveTask517FixtureSpec(input.runMarker, fixtureId), fixtureId, kind })
  );
  return installInput(
    Object.freeze({
      authority: Object.freeze({
        schemaVersion: 1,
        runMarker: input.runMarker,
        profile: input.profile,
        recoveryKey: input.recoveryKey,
      }),
      admin: input.admin,
      fixtures,
    })
  );
}

export function createTask517RecoveryAuthority(input: {
  readonly profile: "fast" | "certification";
  readonly runMarker: string;
  readonly recoveryKey: string;
}): Task517RecoveryAuthority {
  return recoveryAuthority(Object.freeze({ schemaVersion: 1, ...input }));
}

export function assertTask517WorkerDescriptorParity(
  descriptors: readonly WorkerOperationDescriptor[]
): void {
  const actual = descriptors.map(({ operationId }) => operationId).sort();
  const expected = [...TASK517_WORKER_OPERATION_IDS].sort();
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index]))
    fail("TASK-517 worker descriptors drifted");
  for (const entry of descriptors)
    assertSha256(entry.sourceSha256, "TASK-517 worker descriptor hash");
}

function requiredEnvironment(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new WorkerProtocolError("TASK-517 worker environment is incomplete");
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
    throw new WorkerProtocolError("TASK-517 worker password pepper is invalid");
  }
  return value;
}

/** The database worker receives the server's bounded password pepper, never browser credentials. */
export function projectTask517WorkerEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const passwordPepper = optionalPasswordPepper(source);
  return Object.freeze({
    PATH: requiredEnvironment(source, "PATH"),
    DATABASE_URL: requiredEnvironment(source, "DATABASE_URL"),
    ...(passwordPepper === null ? {} : { AUTH_PASSWORD_PEPPER: passwordPepper }),
    // The worker creates and reconciles the fixture admin through the app's
    // canonical PII email fields (HMAC email, hash and encrypted variants),
    // so it needs the same PII keys the Admin login flow resolves.
    PII_HASH_KEY: requiredEnvironment(source, "PII_HASH_KEY"),
    PII_ENC_KEY: requiredEnvironment(source, "PII_ENC_KEY"),
    DB_POOL_MAX: "1",
  });
}

function task517WorkerProfiles(
  root: string,
  source: NodeJS.ProcessEnv
): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: TASK517_WORKER_PROFILE_ID,
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-517/worker-entry.ts",
        "TASK-517 worker entry"
      ),
      cwd: root,
      family: "task517-worker-db",
      requestTimeoutMs: 120_000,
      maximumFrameBytes: 1024 * 1024,
      environment: () => projectTask517WorkerEnvironment(source),
    }),
  ]);
}

export async function createTask517WorkerPool(
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
    profiles: task517WorkerProfiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}

export function createTask517RunMarker(): string {
  return randomBytes(14).toString("hex");
}
