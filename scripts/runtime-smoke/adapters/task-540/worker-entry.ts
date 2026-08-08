import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { SmokeError } from "../../contracts";
import { MAX_WORKER_FRAME_BYTES } from "../../workers/contracts";
import type { WorkerEntryInput, WorkerEntryOutput } from "../../workers/entry";
import { runWorkerEntry } from "../../workers/entry";
import { WorkerOperationRegistry } from "../../workers/operation-registry";
import {
  TASK540_OPERATION_PROFILE_IDS,
  type Task540OperationProfileId,
} from "./operations/contracts";
import { createTask540OperationDefinitions } from "./operations/registry";
import { Task540AuthWindowController } from "./auth-window";
import { createTask540ProductionWorkerHandlers } from "./production-handlers";
import { createTask540WorkerOperationDefinitions } from "./worker-operations";

export function createTask540WorkerRegistry(
  profileId: Task540OperationProfileId,
  authWindow = new Task540AuthWindowController()
): WorkerOperationRegistry {
  let closed = false;
  let databaseClosed = false;
  return new WorkerOperationRegistry(
    [
      ...createTask540OperationDefinitions(),
      ...createTask540WorkerOperationDefinitions(createTask540ProductionWorkerHandlers()),
      ...authWindow.definitions(),
    ],
    {
      async close(): Promise<void> {
        try {
          if (!authWindow.isRestored()) await authWindow.restore();
        } finally {
          if (profileId !== "schema-only") {
            const { db } = await import("../../../../core/db/client");
            await db.$client.end({ timeout: 5 });
            databaseClosed = true;
          }
          closed = true;
        }
      },
      async proveAbsent(): Promise<boolean> {
        return closed && authWindow.isRestored() && (profileId === "schema-only" || databaseClosed);
      },
    }
  );
}

function parseProfile(args: readonly string[]): Task540OperationProfileId {
  if (args.length !== 2 || args[0] !== "--profile") {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 worker arguments are invalid");
  }
  const profileId = args[1];
  if (
    profileId === undefined ||
    !TASK540_OPERATION_PROFILE_IDS.includes(profileId as Task540OperationProfileId)
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 worker profile is unregistered");
  }
  return profileId as Task540OperationProfileId;
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
    registry: createTask540WorkerRegistry(profileId),
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
