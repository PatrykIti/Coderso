import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

import { SmokeError } from "../../contracts";
import { MAX_WORKER_FRAME_BYTES } from "../../workers/contracts";
import type { WorkerEntryInput, WorkerEntryOutput } from "../../workers/entry";
import { runWorkerEntry } from "../../workers/entry";
import { TASK511_WORKER_PROFILE_ID, createTask511WorkerRegistry } from "./worker-operations";

function parseProfile(args: readonly string[]): string {
  if (args.length !== 2 || args[0] !== "--profile" || args[1] !== TASK511_WORKER_PROFILE_ID) {
    throw new SmokeError("smoke_argument_invalid", "TASK-511 worker profile is invalid");
  }
  return args[1];
}

async function writeStdout(bytes: Uint8Array): Promise<void> {
  await new Promise<void>((resolveWrite, rejectWrite) => {
    process.stdout.write(bytes, (error) => (error ? rejectWrite(error) : resolveWrite()));
  });
}

export async function runTask511WorkerEntry(args: readonly string[]): Promise<void> {
  const profileId = parseProfile(args);
  await realpath(resolve(import.meta.dir, "../../../.."));
  await runWorkerEntry({
    profileId,
    registry: createTask511WorkerRegistry(),
    input: process.stdin as unknown as WorkerEntryInput,
    output: { write: writeStdout } as WorkerEntryOutput,
    maximumFrameBytes: MAX_WORKER_FRAME_BYTES,
  });
}

if (import.meta.main) {
  void runTask511WorkerEntry(Bun.argv.slice(2)).catch(() => {
    process.stderr.write('{"code":"task511_worker_failed"}\n');
    process.exitCode = 1;
  });
}
