import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { SmokeError, assertExactKeys, isPlainObject } from "../../contracts";
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
  TASK540_SOURCE_CATALOG,
  TASK540_SOURCE_PROFILE_IDS,
  type Task540SourceEntry,
  type Task540SourceProfileId,
  type Task540SourceRequest,
} from "./source-catalog";
import { Task540SourceExecutor } from "./source-executor";
import { Task540AuthWindowController } from "./auth-window";
import { createTask540ProductionWorkerHandlers } from "./production-handlers";
import { createTask540WorkerOperationDefinitions } from "./worker-operations";

const INPUT_SCHEMA_ID = "task-540-source-request-v1";
const OUTPUT_SCHEMA_ID = "task-540-source-output-v1";

export function task540SourceWorkerDescriptor(
  entry: Task540SourceEntry
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId: entry.sourceId,
    profileId: entry.profileId,
    inputSchemaId: INPUT_SCHEMA_ID,
    outputSchemaId: OUTPUT_SCHEMA_ID,
    sourceSha256: entry.sourceSha256,
    retryClass: "mutation" as const,
    maxInputBytes: MAX_WORKER_FRAME_BYTES,
    maxOutputBytes: MAX_WORKER_FRAME_BYTES,
  });
}

function validateSourceRequest(value: unknown): PlainJsonObject {
  if (!isPlainObject(value)) {
    throw new WorkerProtocolError("TASK-540 worker source request is invalid");
  }
  assertExactKeys(
    value,
    ["operationId", "profileId", "sourceSha256", "input"],
    "TASK-540 worker source request"
  );
  assertWorkerToken(value.operationId, "TASK-540 source operation ID");
  assertWorkerToken(value.profileId, "TASK-540 source profile ID");
  assertSha256(value.sourceSha256, "TASK-540 source digest");
  assertPlainJsonObject(value.input, "TASK-540 source input");
  return value as PlainJsonObject;
}

function validateSourceOutput(value: unknown): PlainJsonValue {
  assertPlainJson(value, "TASK-540 worker source output");
  return value;
}

export function createTask540SourceWorkerRegistry(
  coreRoot: string,
  executor = new Task540SourceExecutor(coreRoot),
  authWindow = new Task540AuthWindowController()
): WorkerOperationRegistry {
  let closed = false;
  const definitions: WorkerOperationDefinition[] = TASK540_SOURCE_CATALOG.entries().map(
    (entry): WorkerOperationDefinition => ({
      ...task540SourceWorkerDescriptor(entry),
      validateInput: validateSourceRequest,
      validateOutput: validateSourceOutput,
      async execute(input): Promise<PlainJsonValue> {
        return executor.execute(input as unknown as Task540SourceRequest);
      },
    })
  );
  definitions.push(
    ...createTask540WorkerOperationDefinitions(createTask540ProductionWorkerHandlers(executor))
  );
  definitions.push(...authWindow.definitions());
  return new WorkerOperationRegistry(definitions, {
    async close(): Promise<void> {
      try {
        await executor.close();
      } finally {
        if (executor.counters().databaseModuleLoads === 0) {
          await authWindow.closeDatabaseIfOwned();
        }
        closed = true;
      }
    },
    async proveAbsent(): Promise<boolean> {
      const counters = executor.counters();
      return (
        closed &&
        authWindow.isRestored() &&
        (counters.databaseModuleLoads === 0 || counters.databaseCloseCalls === 1) &&
        counters.maximumConcurrentExecutions <= 1
      );
    },
  });
}

function parseProfile(args: readonly string[]): Task540SourceProfileId {
  if (args.length !== 2 || args[0] !== "--profile") {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 worker arguments are invalid");
  }
  const profileId = args[1];
  if (
    profileId === undefined ||
    !TASK540_SOURCE_PROFILE_IDS.includes(profileId as Task540SourceProfileId)
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 worker profile is unregistered");
  }
  return profileId as Task540SourceProfileId;
}

async function writeStdout(bytes: Uint8Array): Promise<void> {
  await new Promise<void>((resolveWrite, rejectWrite) => {
    process.stdout.write(bytes, (error) => (error ? rejectWrite(error) : resolveWrite()));
  });
}

async function main(): Promise<void> {
  const profileId = parseProfile(Bun.argv.slice(2));
  const root = await realpath(resolve(import.meta.dir, "../../../.."));
  const coreRoot = await realpath(resolve(root, "core"));
  await runWorkerEntry({
    profileId,
    registry: createTask540SourceWorkerRegistry(coreRoot),
    input: process.stdin as unknown as WorkerEntryInput,
    output: { write: writeStdout } as WorkerEntryOutput,
    maximumFrameBytes: MAX_WORKER_FRAME_BYTES,
  });
}

if (import.meta.main) {
  void main().catch(() => {
    process.stderr.write('{"code":"task540_worker_failed"}\n');
    process.exitCode = 1;
  });
}
