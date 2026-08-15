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
import { Task491ProductionHandlers } from "./db-operations";

export const TASK491_WORKER_PROFILE_ID = "task-491-db";

export const TASK491_WORKER_OPERATION_IDS = Object.freeze([
  "task-491/install",
  "task-491/checkpoint",
  "task-491/cleanup",
  "task-491/prove",
] as const);

export type Task491WorkerOperationId = (typeof TASK491_WORKER_OPERATION_IDS)[number];

export interface Task491InstallInput extends PlainJsonObject {
  readonly nonce: string;
}

export interface Task491CheckpointInput extends PlainJsonObject {
  readonly scenarioId: string;
}

export interface Task491InstallOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly sourceRunId: string;
  readonly gaId: string;
  readonly sentryId: string;
  readonly measurementId: string;
  readonly installedDigest: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task491CheckpointOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly stateDigest: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task491CleanupOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly deletedRows: number;
  readonly remainingRows: number;
  readonly idDigest: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task491ProofOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly cleanupDone: boolean;
  readonly remainingRows: number;
  readonly statements: number;
  readonly rows: number;
}

type Task491WorkerOutput =
  Task491InstallOutput | Task491CheckpointOutput | Task491CleanupOutput | Task491ProofOutput;

export interface Task491WorkerHandlers {
  install(input: Task491InstallInput): Promise<Task491InstallOutput>;
  checkpoint(input: Task491CheckpointInput): Promise<Task491CheckpointOutput>;
  cleanup(): Promise<Task491CleanupOutput>;
  prove(): Promise<Task491ProofOutput>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

const NONCE = /^[a-f0-9]{12,32}$/u;
const SCENARIO = /^[a-z0-9][a-z0-9-]{1,79}$/u;
const TOKEN = /^[a-z][a-z0-9-]{1,63}$/u;

function fail(message: string): never {
  throw new WorkerProtocolError(message);
}

function installInput(value: unknown): Task491InstallInput {
  if (!isPlainObject(value)) fail("TASK-491 install input is invalid");
  assertExactKeys(value, ["nonce"], "TASK-491 install input");
  if (typeof value.nonce !== "string" || !NONCE.test(value.nonce)) {
    fail("TASK-491 install nonce is invalid");
  }
  return value as unknown as Task491InstallInput;
}

function checkpointInput(value: unknown): Task491CheckpointInput {
  if (!isPlainObject(value)) fail("TASK-491 checkpoint input is invalid");
  assertExactKeys(value, ["scenarioId"], "TASK-491 checkpoint input");
  if (typeof value.scenarioId !== "string" || !SCENARIO.test(value.scenarioId)) {
    fail("TASK-491 checkpoint scenario is invalid");
  }
  return value as unknown as Task491CheckpointInput;
}

function emptyInput(value: unknown): PlainJsonObject {
  if (!isPlainObject(value)) fail("TASK-491 worker input is invalid");
  assertExactKeys(value, [], "TASK-491 worker input");
  return value as PlainJsonObject;
}

function outputObject(value: unknown, keys: readonly string[], label: string): PlainJsonObject {
  if (!isPlainObject(value)) fail(`${label} is invalid`);
  assertExactKeys(value, keys, label);
  assertPlainJsonObject(value, label);
  if (value.schemaVersion !== 1) fail(`${label} version drifted`);
  return value as PlainJsonObject;
}

function integer(value: unknown, minimum: number, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail(label);
  return value as number;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(label);
  return value;
}

function validateInstallOutput(value: unknown): Task491InstallOutput {
  const output = outputObject(
    value,
    [
      "schemaVersion",
      "sourceRunId",
      "gaId",
      "sentryId",
      "measurementId",
      "installedDigest",
      "statements",
      "rows",
    ],
    "TASK-491 install output"
  ) as unknown as Task491InstallOutput;
  if (typeof output.sourceRunId !== "string" || !NONCE.test(output.sourceRunId)) {
    fail("TASK-491 install run ID is invalid");
  }
  if (typeof output.gaId !== "string" || !TOKEN.test(output.gaId)) {
    fail("TASK-491 install GA id is invalid");
  }
  if (typeof output.sentryId !== "string" || !TOKEN.test(output.sentryId)) {
    fail("TASK-491 install Sentry id is invalid");
  }
  if (typeof output.measurementId !== "string" || !output.measurementId.startsWith("G-")) {
    fail("TASK-491 install measurement id is invalid");
  }
  assertSha256(output.installedDigest, "TASK-491 installed digest");
  integer(output.statements, 1, "TASK-491 install statement count");
  integer(output.rows, 0, "TASK-491 install row count");
  return output;
}

function validateCheckpointOutput(value: unknown): Task491CheckpointOutput {
  const output = outputObject(
    value,
    ["schemaVersion", "scenarioId", "stateDigest", "statements", "rows"],
    "TASK-491 checkpoint output"
  ) as unknown as Task491CheckpointOutput;
  if (typeof output.scenarioId !== "string" || !SCENARIO.test(output.scenarioId)) {
    fail("TASK-491 checkpoint scenario is invalid");
  }
  assertSha256(output.stateDigest, "TASK-491 checkpoint digest");
  integer(output.statements, 1, "TASK-491 checkpoint statement count");
  integer(output.rows, 0, "TASK-491 checkpoint row count");
  return output;
}

function validateCleanupOutput(value: unknown): Task491CleanupOutput {
  const output = outputObject(
    value,
    ["schemaVersion", "deletedRows", "remainingRows", "idDigest", "statements", "rows"],
    "TASK-491 cleanup output"
  ) as unknown as Task491CleanupOutput;
  integer(output.deletedRows, 0, "TASK-491 cleanup deleted count");
  integer(output.remainingRows, 0, "TASK-491 cleanup remaining count");
  assertSha256(output.idDigest, "TASK-491 cleanup ID digest");
  if (output.remainingRows !== 0) fail("TASK-491 cleanup absence proof failed");
  integer(output.statements, 1, "TASK-491 cleanup statement count");
  integer(output.rows, 0, "TASK-491 cleanup row count");
  return output;
}

function validateProofOutput(value: unknown): Task491ProofOutput {
  const output = outputObject(
    value,
    ["schemaVersion", "cleanupDone", "remainingRows", "statements", "rows"],
    "TASK-491 proof output"
  ) as unknown as Task491ProofOutput;
  boolean(output.cleanupDone, "TASK-491 proof cleanup flag");
  integer(output.remainingRows, 0, "TASK-491 proof remaining count");
  integer(output.statements, 1, "TASK-491 proof statement count");
  integer(output.rows, 0, "TASK-491 proof row count");
  return output;
}

const OPERATION_DIGEST = createHash("sha256")
  .update(JSON.stringify({ version: 1, operations: TASK491_WORKER_OPERATION_IDS }))
  .digest("hex");

function operationDescriptor(
  operationId: Task491WorkerOperationId,
  retryClass: "idempotent-read" | "mutation"
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId: TASK491_WORKER_PROFILE_ID,
    inputSchemaId: `${operationId.replace("/", "-")}-input-v1`,
    outputSchemaId: `${operationId.replace("/", "-")}-output-v1`,
    sourceSha256: createHash("sha256")
      .update(OPERATION_DIGEST)
      .update("\0")
      .update(operationId)
      .digest("hex"),
    retryClass,
    maxInputBytes: 32 * 1024,
    maxOutputBytes: 128 * 1024,
  });
}

export const TASK491_WORKER_DESCRIPTORS = Object.freeze({
  install: operationDescriptor("task-491/install", "mutation"),
  checkpoint: operationDescriptor("task-491/checkpoint", "idempotent-read"),
  cleanup: operationDescriptor("task-491/cleanup", "mutation"),
  prove: operationDescriptor("task-491/prove", "idempotent-read"),
});

function definition<TInput extends PlainJsonObject, TOutput extends Task491WorkerOutput>(
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

export function createTask491WorkerRegistry(
  handlers: Task491WorkerHandlers = new Task491ProductionHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      definition(TASK491_WORKER_DESCRIPTORS.install, installInput, validateInstallOutput, (input) =>
        handlers.install(input)
      ),
      definition(
        TASK491_WORKER_DESCRIPTORS.checkpoint,
        checkpointInput,
        validateCheckpointOutput,
        (input) => handlers.checkpoint(input)
      ),
      definition(TASK491_WORKER_DESCRIPTORS.cleanup, emptyInput, validateCleanupOutput, () =>
        handlers.cleanup()
      ),
      definition(TASK491_WORKER_DESCRIPTORS.prove, emptyInput, validateProofOutput, () =>
        handlers.prove()
      ),
    ],
    {
      close: () => handlers.close(),
      proveAbsent: () => handlers.proveAbsent(),
    }
  );
}

function parseProfile(args: readonly string[]): string {
  if (args.length !== 2 || args[0] !== "--profile" || args[1] !== TASK491_WORKER_PROFILE_ID) {
    throw new SmokeError("smoke_argument_invalid", "TASK-491 worker profile is invalid");
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
    registry: createTask491WorkerRegistry(),
    input: process.stdin as unknown as WorkerEntryInput,
    output: { write: writeStdout } as WorkerEntryOutput,
    maximumFrameBytes: MAX_WORKER_FRAME_BYTES,
  });
}

if (import.meta.main) {
  void main().catch(() => {
    process.stderr.write('{"code":"task491_worker_failed"}\n');
    process.exitCode = 1;
  });
}

export function assertTask491WorkerDescriptorParity(
  descriptors: readonly WorkerOperationDescriptor[]
): void {
  const expected = [...TASK491_WORKER_OPERATION_IDS].sort();
  const actual = descriptors.map(({ operationId }) => operationId).sort();
  if (
    descriptors.length !== TASK491_WORKER_OPERATION_IDS.length ||
    actual.some((operationId, index) => operationId !== expected[index])
  ) {
    throw new WorkerProtocolError("TASK-491 worker descriptor set drifted");
  }
  for (const descriptor of descriptors) {
    assertWorkerToken(descriptor.operationId, "TASK-491 operation ID");
    assertSha256(descriptor.sourceSha256, "TASK-491 operation digest");
    assertPlainJson(descriptor as unknown as PlainJsonValue, "TASK-491 operation descriptor");
  }
}
