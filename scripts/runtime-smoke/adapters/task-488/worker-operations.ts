import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

import { assertExactKeys, isPlainObject, SmokeError } from "../../contracts";
import {
  MAX_WORKER_FRAME_BYTES,
  WorkerProtocolError,
  assertPlainJson,
  assertPlainJsonObject,
  assertSha256,
  assertWorkerToken,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerOperationDefinition,
  type WorkerOperationDescriptor,
} from "../../workers/contracts";
import type { WorkerEntryInput, WorkerEntryOutput } from "../../workers/entry";
import { runWorkerEntry } from "../../workers/entry";
import { WorkerOperationRegistry } from "../../workers/operation-registry";
import { Task488ProductionHandlers } from "./fixture";

export const TASK_488_WORKER_PROFILE_ID = "task-488-db";

export const TASK_488_WORKER_OPERATION_IDS = Object.freeze([
  "task-488/install",
  "task-488/cleanup",
  "task-488/prove",
] as const);

export type Task488WorkerOperationId = (typeof TASK_488_WORKER_OPERATION_IDS)[number];

export interface Task488InstallInput extends PlainJsonObject {
  readonly marker: string;
}

export interface Task488CleanupInput extends PlainJsonObject {
  readonly productSlug: string;
  readonly collectionSlug: string;
}

export interface Task488ProofInput extends PlainJsonObject {
  readonly productSlug: string;
  readonly collectionSlug: string;
  readonly adminPath: string;
}

export interface Task488InstallOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly adminPath: string;
  readonly marker: string;
  readonly productSlug: string;
  readonly collectionSlug: string;
  readonly productTitle: string;
  readonly collectionName: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task488CleanupOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly deletedProducts: number;
  readonly deletedCollections: number;
  readonly statements: number;
  readonly rows: number;
}

export interface Task488ProofOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly productAbsent: boolean;
  readonly collectionAbsent: boolean;
  readonly adminPathUnchanged: boolean;
  readonly adminPath: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task488WorkerHandlers {
  install(input: Task488InstallInput): Promise<Task488InstallOutput>;
  cleanup(input: Task488CleanupInput): Promise<Task488CleanupOutput>;
  prove(input: Task488ProofInput): Promise<Task488ProofOutput>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

const MARKER = /^[a-f0-9]{12}$/u;
const SLUG = /^[a-z0-9][a-z0-9-]{1,95}$/u;
const TITLE = /^[a-zA-Z0-9][a-zA-Z0-9 .-]{0,127}$/u;
const ADMIN_PATH = /^\/[a-zA-Z0-9._-]+$/u;

function fail(message: string): never {
  throw new WorkerProtocolError(message);
}

function requireSlug(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !SLUG.test(value)) fail(`${label} is invalid`);
}

function requireAdminPath(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !ADMIN_PATH.test(value)) fail(`${label} is invalid`);
}

function requireCount(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(`${label} is invalid`);
}

function installInput(value: unknown): Task488InstallInput {
  if (!isPlainObject(value)) fail("TASK-488 install input is invalid");
  assertExactKeys(value, ["marker"], "TASK-488 install input");
  if (typeof value.marker !== "string" || !MARKER.test(value.marker)) {
    fail("TASK-488 install marker is invalid");
  }
  return value as unknown as Task488InstallInput;
}

function cleanupInput(value: unknown): Task488CleanupInput {
  if (!isPlainObject(value)) fail("TASK-488 cleanup input is invalid");
  assertExactKeys(value, ["productSlug", "collectionSlug"], "TASK-488 cleanup input");
  requireSlug(value.productSlug, "TASK-488 product slug");
  requireSlug(value.collectionSlug, "TASK-488 collection slug");
  return value as unknown as Task488CleanupInput;
}

function proofInput(value: unknown): Task488ProofInput {
  if (!isPlainObject(value)) fail("TASK-488 proof input is invalid");
  assertExactKeys(value, ["productSlug", "collectionSlug", "adminPath"], "TASK-488 proof input");
  requireSlug(value.productSlug, "TASK-488 product slug");
  requireSlug(value.collectionSlug, "TASK-488 collection slug");
  requireAdminPath(value.adminPath, "TASK-488 admin path");
  return value as unknown as Task488ProofInput;
}

function outputObject(value: unknown, keys: readonly string[], label: string): PlainJsonObject {
  if (!isPlainObject(value)) fail(`${label} is invalid`);
  assertExactKeys(value, keys, label);
  assertPlainJsonObject(value, label);
  if (value.schemaVersion !== 1) fail(`${label} version drifted`);
  requireCount(value.statements, `${label} statement count`);
  requireCount(value.rows, `${label} row count`);
  return value as PlainJsonObject;
}

function validateInstallOutput(value: unknown): Task488InstallOutput {
  const output = outputObject(
    value,
    [
      "schemaVersion",
      "adminPath",
      "marker",
      "productSlug",
      "collectionSlug",
      "productTitle",
      "collectionName",
      "statements",
      "rows",
    ],
    "TASK-488 install output"
  ) as unknown as Task488InstallOutput;
  requireAdminPath(output.adminPath, "TASK-488 admin path");
  if (typeof output.marker !== "string" || !MARKER.test(output.marker)) {
    fail("TASK-488 install marker is invalid");
  }
  requireSlug(output.productSlug, "TASK-488 product slug");
  requireSlug(output.collectionSlug, "TASK-488 collection slug");
  if (typeof output.productTitle !== "string" || !TITLE.test(output.productTitle)) {
    fail("TASK-488 product title is invalid");
  }
  if (typeof output.collectionName !== "string" || !TITLE.test(output.collectionName)) {
    fail("TASK-488 collection name is invalid");
  }
  return output;
}

function validateCleanupOutput(value: unknown): Task488CleanupOutput {
  const output = outputObject(
    value,
    ["schemaVersion", "deletedProducts", "deletedCollections", "statements", "rows"],
    "TASK-488 cleanup output"
  ) as unknown as Task488CleanupOutput;
  requireCount(output.deletedProducts, "TASK-488 deleted product count");
  requireCount(output.deletedCollections, "TASK-488 deleted collection count");
  return output;
}

function validateProofOutput(value: unknown): Task488ProofOutput {
  const output = outputObject(
    value,
    [
      "schemaVersion",
      "productAbsent",
      "collectionAbsent",
      "adminPathUnchanged",
      "adminPath",
      "statements",
      "rows",
    ],
    "TASK-488 proof output"
  ) as unknown as Task488ProofOutput;
  if (
    typeof output.productAbsent !== "boolean" ||
    typeof output.collectionAbsent !== "boolean" ||
    typeof output.adminPathUnchanged !== "boolean"
  ) {
    fail("TASK-488 proof booleans are invalid");
  }
  requireAdminPath(output.adminPath, "TASK-488 admin path");
  return output;
}

export const TASK_488_WORKER_DESCRIPTORS = Object.freeze({
  install: operationDescriptor("task-488/install", "idempotent-read"),
  cleanup: operationDescriptor("task-488/cleanup", "mutation"),
  prove: operationDescriptor("task-488/prove", "idempotent-read"),
});

function operationDescriptor(
  operationId: string,
  retryClass: "idempotent-read" | "mutation"
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId: TASK_488_WORKER_PROFILE_ID,
    inputSchemaId: `${operationId.replaceAll("/", "-")}-input-v1`,
    outputSchemaId: `${operationId.replaceAll("/", "-")}-output-v1`,
    sourceSha256: createHash("sha256").update(`task-488/${operationId}-v1`).digest("hex"),
    retryClass,
    maxInputBytes: 256 * 1024,
    maxOutputBytes: 256 * 1024,
  });
}

function definition<TInput extends PlainJsonObject, TOutput extends PlainJsonValue>(
  descriptor: WorkerOperationDescriptor,
  validateInput: (value: unknown) => TInput,
  validateOutput: (value: unknown) => TOutput,
  execute: (input: TInput) => Promise<TOutput>
): WorkerOperationDefinition<TInput, TOutput> {
  return Object.freeze({
    ...descriptor,
    validateInput,
    validateOutput,
    execute: (input: TInput) => execute(input),
  });
}

export function createTask488WorkerRegistry(
  handlers: Task488WorkerHandlers = new Task488ProductionHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      definition(
        TASK_488_WORKER_DESCRIPTORS.install,
        installInput,
        validateInstallOutput,
        (input) => handlers.install(input)
      ),
      definition(
        TASK_488_WORKER_DESCRIPTORS.cleanup,
        cleanupInput,
        validateCleanupOutput,
        (input) => handlers.cleanup(input)
      ),
      definition(TASK_488_WORKER_DESCRIPTORS.prove, proofInput, validateProofOutput, (input) =>
        handlers.prove(input)
      ),
    ],
    {
      close: () => handlers.close(),
      proveAbsent: () => handlers.proveAbsent(),
    }
  );
}

function parseProfile(args: readonly string[]): string {
  if (args.length !== 2 || args[0] !== "--profile" || args[1] !== TASK_488_WORKER_PROFILE_ID) {
    throw new SmokeError("smoke_argument_invalid", "TASK-488 worker profile is invalid");
  }
  return args[1];
}

async function writeStdout(bytes: Uint8Array): Promise<void> {
  await new Promise<void>((resolveWrite, rejectWrite) => {
    process.stdout.write(bytes, (error) => (error ? rejectWrite(error) : resolveWrite()));
  });
}

async function main(): Promise<void> {
  const profileId = parseProfile(Bun.argv.slice(2));
  await realpath(resolve(import.meta.dir, "../../../.."));
  await runWorkerEntry({
    profileId,
    registry: createTask488WorkerRegistry(),
    input: process.stdin as unknown as WorkerEntryInput,
    output: { write: writeStdout } as WorkerEntryOutput,
    maximumFrameBytes: MAX_WORKER_FRAME_BYTES,
  });
}

if (import.meta.main) {
  void main().catch(() => {
    process.stderr.write('{"code":"task488_worker_failed"}\n');
    process.exitCode = 1;
  });
}

export function assertTask488WorkerDescriptorParity(
  descriptors: readonly WorkerOperationDescriptor[]
): void {
  const expected = [...TASK_488_WORKER_OPERATION_IDS].sort();
  const actual = descriptors.map(({ operationId }) => operationId).sort();
  if (
    descriptors.length !== TASK_488_WORKER_OPERATION_IDS.length ||
    actual.some((operationId, index) => operationId !== expected[index])
  ) {
    throw new WorkerProtocolError("TASK-488 worker descriptor set drifted");
  }
  for (const descriptor of descriptors) {
    assertWorkerToken(descriptor.operationId, "TASK-488 operation ID");
    assertSha256(descriptor.sourceSha256, "TASK-488 operation digest");
    assertPlainJson(descriptor as unknown as PlainJsonValue, "TASK-488 operation descriptor");
  }
}
