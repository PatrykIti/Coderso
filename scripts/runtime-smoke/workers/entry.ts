import { SmokeError } from "../contracts";
import {
  SELF_TEST_WORKER_PROFILE_IDS,
  WorkerOperationRegistry,
  createSelfTestWorkerRegistry,
} from "./operation-registry";
import { createWorkerRequestDecoder, encodeWorkerFrame } from "./protocol";
import { DEFAULT_WORKER_FRAME_BYTES, WorkerProtocolError, assertWorkerToken } from "./contracts";

export interface WorkerEntryInput extends AsyncIterable<Uint8Array | string> {}

export interface WorkerEntryOutput {
  write(bytes: Uint8Array): Promise<void>;
}

export interface WorkerEntryOptions {
  readonly profileId: string;
  readonly registry: WorkerOperationRegistry;
  readonly input: WorkerEntryInput;
  readonly output: WorkerEntryOutput;
  readonly maximumFrameBytes?: number;
}

export async function runWorkerEntry(options: WorkerEntryOptions): Promise<void> {
  assertWorkerToken(options.profileId, "worker profile ID");
  const maximumFrameBytes = options.maximumFrameBytes ?? DEFAULT_WORKER_FRAME_BYTES;
  const decoder = createWorkerRequestDecoder(maximumFrameBytes);
  let expectedRequestId = 1;
  try {
    for await (const chunk of options.input) {
      for (const request of decoder.push(chunk)) {
        if (request.requestId !== expectedRequestId) {
          throw new WorkerProtocolError("worker request IDs are replayed, skipped, or reordered");
        }
        expectedRequestId += 1;
        const definition = options.registry.require(request.operationId);
        encodeWorkerFrame(
          request,
          Math.min(definition.maxInputBytes ?? maximumFrameBytes, maximumFrameBytes)
        );
        const response = await options.registry.execute(options.profileId, request);
        await options.output.write(
          encodeWorkerFrame(
            response,
            Math.min(definition.maxOutputBytes ?? maximumFrameBytes, maximumFrameBytes)
          )
        );
      }
    }
    decoder.finish();
  } finally {
    await options.registry.close();
    if (!(await options.registry.proveAbsent())) {
      throw new WorkerProtocolError("worker registry resources remain active");
    }
  }
}

function parseMainProfile(args: readonly string[]): string {
  if (args.length !== 2 || args[0] !== "--profile") {
    throw new SmokeError("smoke_argument_invalid", "worker entry arguments are invalid");
  }
  const profileId = args[1];
  assertWorkerToken(profileId, "worker profile ID");
  if (
    !SELF_TEST_WORKER_PROFILE_IDS.includes(
      profileId as (typeof SELF_TEST_WORKER_PROFILE_IDS)[number]
    )
  ) {
    throw new SmokeError("smoke_argument_invalid", "worker entry profile is not registered");
  }
  return profileId;
}

async function writeStdout(bytes: Uint8Array): Promise<void> {
  await new Promise<void>((resolveWrite, rejectWrite) => {
    process.stdout.write(bytes, (error) => (error ? rejectWrite(error) : resolveWrite()));
  });
}

async function main(): Promise<void> {
  const profileId = parseMainProfile(Bun.argv.slice(2));
  await runWorkerEntry({
    profileId,
    registry: createSelfTestWorkerRegistry(),
    input: process.stdin as unknown as WorkerEntryInput,
    output: { write: writeStdout },
  });
}

if (import.meta.main) {
  void main().catch(() => {
    process.stderr.write('{"code":"runtime_smoke_worker_failed"}\n');
    process.exitCode = 1;
  });
}
