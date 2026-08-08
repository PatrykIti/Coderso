import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

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
import {
  TASK547_MUTABLE_RESOURCE_SLOTS,
  TASK547_MUTATION_SLOTS,
  TASK547_SUBMISSION_MARKER_KEYS,
  Task547ProductionHandlers,
  type Task547MutableResourceSlot,
} from "./fixture";

export { TASK547_MUTABLE_RESOURCE_SLOTS, type Task547MutableResourceSlot } from "./fixture";

export const TASK547_WORKER_PROFILE_ID = "task-547-db";

export const TASK547_WORKER_OPERATION_IDS = Object.freeze([
  "task-547/install",
  "task-547/checkpoint",
  "task-547/cleanup",
  "task-547/reset",
  "task-547/rollback",
  "task-547/prove",
] as const);

export type Task547WorkerOperationId = (typeof TASK547_WORKER_OPERATION_IDS)[number];

export interface Task547InstallInput extends PlainJsonObject {
  readonly nonce: string;
}

export interface Task547CheckpointInput extends PlainJsonObject {
  readonly scenarioId: string;
  readonly submissionIds: readonly string[];
  readonly resourceSlots: readonly Task547MutableResourceSlot[];
}

export interface Task547InstallOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly sourceRunId: string;
  readonly actorId: string;
  readonly publicFormId: string;
  readonly internalFormId: string;
  readonly homePageId: string;
  readonly projectsPageId: string;
  readonly contactPageId: string;
  readonly apiKeySecret: string;
  readonly markers: Readonly<{
    readonly publicContact: string;
    readonly internalSession: string;
    readonly internalApiKey: string;
    readonly formDesign: string;
    readonly pageEditor: string;
  }>;
  readonly installedDigest: string;
  readonly lifecycle: Readonly<{
    readonly stagedThenPublished: readonly string[];
    readonly directPublished: readonly string[];
    readonly statusless: readonly string[];
    readonly enabledOnlyOnAction: boolean;
  }>;
  readonly statements: number;
  readonly rows: number;
}

export interface Task547CheckpointOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly attachedCount: number;
  readonly attachedDigest: string;
  readonly resourceDigest: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task547CleanupOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly deletedSubmissions: number;
  readonly deletedActionRuns: number;
  readonly markerDigest: string;
  readonly idDigest: string;
  readonly remainingSubmissionRows: readonly PlainJsonValue[];
  readonly remainingTempArtifacts: readonly PlainJsonValue[];
  readonly statements: number;
  readonly rows: number;
}

export interface Task547ResetOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly restoredSlots: readonly string[];
  readonly stateDigest: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task547RollbackOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly officialRollbackCalls: 1;
  readonly priorSettingsRestored: true;
  readonly resourceAbsenceProved: true;
  readonly rollbackDigest: string;
  readonly statements: number;
  readonly rows: number;
}

export interface Task547ProofOutput extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly cleanupDone: boolean;
  readonly resetDone: boolean;
  readonly rollbackDone: boolean;
  readonly officialRollbackCalls: number;
  readonly remainingSubmissionRows: readonly PlainJsonValue[];
  readonly remainingTempArtifacts: readonly PlainJsonValue[];
  readonly priorSettingsRestored: boolean;
  readonly statements: number;
  readonly rows: number;
}

type Task547WorkerOutput =
  | Task547InstallOutput
  | Task547CheckpointOutput
  | Task547CleanupOutput
  | Task547ResetOutput
  | Task547RollbackOutput
  | Task547ProofOutput;

export interface Task547WorkerHandlers {
  install(input: Task547InstallInput): Promise<Task547InstallOutput>;
  checkpoint(input: Task547CheckpointInput): Promise<Task547CheckpointOutput>;
  cleanup(): Promise<Task547CleanupOutput>;
  reset(): Promise<Task547ResetOutput>;
  rollback(): Promise<Task547RollbackOutput>;
  prove(): Promise<Task547ProofOutput>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const NONCE = /^[a-f0-9]{12,32}$/u;
const SCENARIO = /^[a-z0-9][a-z0-9-]{1,79}$/u;
const MAX_SUBMISSION_IDS = 5;

function fail(message: string): never {
  throw new WorkerProtocolError(message);
}

function requireUuid(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !UUID.test(value)) fail(`${label} is invalid`);
}

function requireInteger(value: unknown, minimum: number, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail(`${label} is invalid`);
}

function emptyInput(value: unknown): PlainJsonObject {
  if (!isPlainObject(value)) fail("TASK-547 worker input is invalid");
  assertExactKeys(value, [], "TASK-547 worker input");
  return value as PlainJsonObject;
}

function installInput(value: unknown): Task547InstallInput {
  if (!isPlainObject(value)) fail("TASK-547 install input is invalid");
  assertExactKeys(value, ["nonce"], "TASK-547 install input");
  if (typeof value.nonce !== "string" || !NONCE.test(value.nonce)) {
    fail("TASK-547 install nonce is invalid");
  }
  return value as unknown as Task547InstallInput;
}

function checkpointInput(value: unknown): Task547CheckpointInput {
  if (!isPlainObject(value)) fail("TASK-547 checkpoint input is invalid");
  assertExactKeys(
    value,
    ["scenarioId", "submissionIds", "resourceSlots"],
    "TASK-547 checkpoint input"
  );
  if (
    typeof value.scenarioId !== "string" ||
    !SCENARIO.test(value.scenarioId) ||
    !Array.isArray(value.submissionIds) ||
    value.submissionIds.length > MAX_SUBMISSION_IDS ||
    value.submissionIds.some((id) => typeof id !== "string" || !UUID.test(id)) ||
    new Set(value.submissionIds).size !== value.submissionIds.length ||
    !Array.isArray(value.resourceSlots) ||
    value.resourceSlots.some(
      (slot) =>
        typeof slot !== "string" ||
        !TASK547_MUTABLE_RESOURCE_SLOTS.includes(slot as Task547MutableResourceSlot)
    ) ||
    new Set(value.resourceSlots).size !== value.resourceSlots.length ||
    JSON.stringify(value.resourceSlots) !==
      JSON.stringify(TASK547_MUTATION_SLOTS[value.scenarioId] ?? []) ||
    value.submissionIds.length !== (TASK547_SUBMISSION_MARKER_KEYS[value.scenarioId]?.length ?? 0)
  ) {
    fail("TASK-547 checkpoint contract drifted");
  }
  return value as unknown as Task547CheckpointInput;
}

function outputObject(value: unknown, keys: readonly string[], label: string): PlainJsonObject {
  if (!isPlainObject(value)) fail(`${label} is invalid`);
  assertExactKeys(value, keys, label);
  assertPlainJsonObject(value, label);
  if (value.schemaVersion !== 1) fail(`${label} version drifted`);
  requireInteger(value.statements, 1, `${label} statement count`);
  requireInteger(value.rows, 0, `${label} row count`);
  return value as PlainJsonObject;
}

function validateInstallOutput(value: unknown): Task547InstallOutput {
  const output = outputObject(
    value,
    [
      "schemaVersion",
      "sourceRunId",
      "actorId",
      "publicFormId",
      "internalFormId",
      "homePageId",
      "projectsPageId",
      "contactPageId",
      "apiKeySecret",
      "markers",
      "installedDigest",
      "lifecycle",
      "statements",
      "rows",
    ],
    "TASK-547 install output"
  ) as unknown as Task547InstallOutput;
  for (const [label, id] of [
    ["source run", output.sourceRunId],
    ["actor", output.actorId],
    ["public form", output.publicFormId],
    ["internal form", output.internalFormId],
    ["home page", output.homePageId],
    ["projects page", output.projectsPageId],
    ["contact page", output.contactPageId],
  ] as const) {
    requireUuid(id, `TASK-547 ${label} ID`);
  }
  if (typeof output.apiKeySecret !== "string" || output.apiKeySecret.length < 24) {
    fail("TASK-547 API key secret is invalid");
  }
  assertSha256(output.installedDigest, "TASK-547 installed digest");
  if (!isPlainObject(output.markers) || !isPlainObject(output.lifecycle)) {
    fail("TASK-547 install material output is invalid");
  }
  assertExactKeys(
    output.markers,
    ["publicContact", "internalSession", "internalApiKey", "formDesign", "pageEditor"],
    "TASK-547 markers"
  );
  if (
    Object.values(output.markers).some(
      (marker) => typeof marker !== "string" || !/^wf547-[a-z-]+-[a-f0-9]{12,32}$/u.test(marker)
    ) ||
    new Set(Object.values(output.markers)).size !== 5
  ) {
    fail("TASK-547 markers are invalid");
  }
  assertExactKeys(
    output.lifecycle,
    ["stagedThenPublished", "directPublished", "statusless", "enabledOnlyOnAction"],
    "TASK-547 lifecycle output"
  );
  if (
    !isDeepStrictEqual(output.lifecycle, {
      stagedThenPublished: ["page", "entry", "detail_page", "menu"],
      directPublished: ["form"],
      statusless: ["listing_template"],
      enabledOnlyOnAction: true,
    })
  ) {
    fail("TASK-547 lifecycle output drifted");
  }
  return output;
}

function validateCheckpointOutput(value: unknown): Task547CheckpointOutput {
  const output = outputObject(
    value,
    [
      "schemaVersion",
      "scenarioId",
      "attachedCount",
      "attachedDigest",
      "resourceDigest",
      "statements",
      "rows",
    ],
    "TASK-547 checkpoint output"
  ) as unknown as Task547CheckpointOutput;
  if (!SCENARIO.test(output.scenarioId)) fail("TASK-547 checkpoint scenario is invalid");
  requireInteger(output.attachedCount, 0, "TASK-547 attached count");
  assertSha256(output.attachedDigest, "TASK-547 attached digest");
  assertSha256(output.resourceDigest, "TASK-547 resource digest");
  return output;
}

function validateCleanupOutput(value: unknown): Task547CleanupOutput {
  const output = outputObject(
    value,
    [
      "schemaVersion",
      "deletedSubmissions",
      "deletedActionRuns",
      "markerDigest",
      "idDigest",
      "remainingSubmissionRows",
      "remainingTempArtifacts",
      "statements",
      "rows",
    ],
    "TASK-547 cleanup output"
  ) as unknown as Task547CleanupOutput;
  requireInteger(output.deletedSubmissions, 0, "TASK-547 deleted submission count");
  requireInteger(output.deletedActionRuns, 0, "TASK-547 deleted action-run count");
  assertSha256(output.markerDigest, "TASK-547 marker digest");
  assertSha256(output.idDigest, "TASK-547 submission ID digest");
  if (output.remainingSubmissionRows.length !== 0 || output.remainingTempArtifacts.length !== 0) {
    fail("TASK-547 cleanup absence proof failed");
  }
  return output;
}

function validateResetOutput(value: unknown): Task547ResetOutput {
  const output = outputObject(
    value,
    ["schemaVersion", "restoredSlots", "stateDigest", "statements", "rows"],
    "TASK-547 reset output"
  ) as unknown as Task547ResetOutput;
  if (
    !Array.isArray(output.restoredSlots) ||
    output.restoredSlots.some(
      (slot) => !TASK547_MUTABLE_RESOURCE_SLOTS.includes(slot as Task547MutableResourceSlot)
    ) ||
    new Set(output.restoredSlots).size !== output.restoredSlots.length
  ) {
    fail("TASK-547 reset slots are invalid");
  }
  assertSha256(output.stateDigest, "TASK-547 reset digest");
  return output;
}

function validateRollbackOutput(value: unknown): Task547RollbackOutput {
  const output = outputObject(
    value,
    [
      "schemaVersion",
      "officialRollbackCalls",
      "priorSettingsRestored",
      "resourceAbsenceProved",
      "rollbackDigest",
      "statements",
      "rows",
    ],
    "TASK-547 rollback output"
  ) as unknown as Task547RollbackOutput;
  if (
    output.officialRollbackCalls !== 1 ||
    output.priorSettingsRestored !== true ||
    output.resourceAbsenceProved !== true
  ) {
    fail("TASK-547 rollback proof drifted");
  }
  assertSha256(output.rollbackDigest, "TASK-547 rollback digest");
  return output;
}

function validateProofOutput(value: unknown): Task547ProofOutput {
  const output = outputObject(
    value,
    [
      "schemaVersion",
      "cleanupDone",
      "resetDone",
      "rollbackDone",
      "officialRollbackCalls",
      "remainingSubmissionRows",
      "remainingTempArtifacts",
      "priorSettingsRestored",
      "statements",
      "rows",
    ],
    "TASK-547 proof output"
  ) as unknown as Task547ProofOutput;
  if (
    typeof output.cleanupDone !== "boolean" ||
    typeof output.resetDone !== "boolean" ||
    typeof output.rollbackDone !== "boolean" ||
    !Number.isSafeInteger(output.officialRollbackCalls) ||
    !Array.isArray(output.remainingSubmissionRows) ||
    !Array.isArray(output.remainingTempArtifacts) ||
    typeof output.priorSettingsRestored !== "boolean"
  ) {
    fail("TASK-547 proof output drifted");
  }
  return output;
}

const OPERATION_DIGEST = createHash("sha256")
  .update(JSON.stringify({ version: 1, operations: TASK547_WORKER_OPERATION_IDS }))
  .digest("hex");

function operationDescriptor(
  operationId: Task547WorkerOperationId,
  retryClass: "idempotent-read" | "mutation"
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId: TASK547_WORKER_PROFILE_ID,
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

export const TASK547_WORKER_DESCRIPTORS = Object.freeze({
  install: operationDescriptor("task-547/install", "mutation"),
  checkpoint: operationDescriptor("task-547/checkpoint", "idempotent-read"),
  cleanup: operationDescriptor("task-547/cleanup", "mutation"),
  reset: operationDescriptor("task-547/reset", "mutation"),
  rollback: operationDescriptor("task-547/rollback", "mutation"),
  prove: operationDescriptor("task-547/prove", "idempotent-read"),
});

function definition<TInput extends PlainJsonObject, TOutput extends Task547WorkerOutput>(
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

export function createTask547WorkerRegistry(
  handlers: Task547WorkerHandlers = new Task547ProductionHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      definition(TASK547_WORKER_DESCRIPTORS.install, installInput, validateInstallOutput, (input) =>
        handlers.install(input)
      ),
      definition(
        TASK547_WORKER_DESCRIPTORS.checkpoint,
        checkpointInput,
        validateCheckpointOutput,
        (input) => handlers.checkpoint(input)
      ),
      definition(TASK547_WORKER_DESCRIPTORS.cleanup, emptyInput, validateCleanupOutput, () =>
        handlers.cleanup()
      ),
      definition(TASK547_WORKER_DESCRIPTORS.reset, emptyInput, validateResetOutput, () =>
        handlers.reset()
      ),
      definition(TASK547_WORKER_DESCRIPTORS.rollback, emptyInput, validateRollbackOutput, () =>
        handlers.rollback()
      ),
      definition(TASK547_WORKER_DESCRIPTORS.prove, emptyInput, validateProofOutput, () =>
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
  if (args.length !== 2 || args[0] !== "--profile" || args[1] !== TASK547_WORKER_PROFILE_ID) {
    throw new SmokeError("smoke_argument_invalid", "TASK-547 worker profile is invalid");
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
    registry: createTask547WorkerRegistry(),
    input: process.stdin as unknown as WorkerEntryInput,
    output: { write: writeStdout } as WorkerEntryOutput,
    maximumFrameBytes: MAX_WORKER_FRAME_BYTES,
  });
}

if (import.meta.main) {
  void main().catch(() => {
    process.stderr.write('{"code":"task547_worker_failed"}\n');
    process.exitCode = 1;
  });
}

export function assertTask547WorkerDescriptorParity(
  descriptors: readonly WorkerOperationDescriptor[]
): void {
  const expected = [...TASK547_WORKER_OPERATION_IDS].sort();
  const actual = descriptors.map(({ operationId }) => operationId).sort();
  if (
    descriptors.length !== TASK547_WORKER_OPERATION_IDS.length ||
    actual.some((operationId, index) => operationId !== expected[index])
  ) {
    throw new WorkerProtocolError("TASK-547 worker descriptor set drifted");
  }
  for (const descriptor of descriptors) {
    assertWorkerToken(descriptor.operationId, "TASK-547 operation ID");
    assertSha256(descriptor.sourceSha256, "TASK-547 operation digest");
    assertPlainJson(descriptor as unknown as PlainJsonValue, "TASK-547 operation descriptor");
  }
}
