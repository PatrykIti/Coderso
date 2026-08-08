import type { WorkerEntryInput, WorkerEntryOutput } from "../../../workers/entry";
import { runWorkerEntry } from "../../../workers/entry";
import type { WorkerRegistryHooks } from "../../../workers/operation-registry";
import type { Task540OperationProfileId } from "./contracts";
import { createTask540OperationRegistry } from "./registry";

export async function runTask540OperationWorkerEntry(options: {
  readonly profileId: Task540OperationProfileId;
  readonly hooks?: WorkerRegistryHooks;
  readonly input: WorkerEntryInput;
  readonly output: WorkerEntryOutput;
  readonly maximumFrameBytes?: number;
}): Promise<void> {
  await runWorkerEntry({
    profileId: options.profileId,
    registry: createTask540OperationRegistry(options.hooks),
    input: options.input,
    output: options.output,
    ...(options.maximumFrameBytes === undefined
      ? {}
      : { maximumFrameBytes: options.maximumFrameBytes }),
  });
}
