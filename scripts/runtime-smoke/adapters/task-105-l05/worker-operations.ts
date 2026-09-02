import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

import { SmokeError, resolveInsideRoot } from "../../contracts";
import { MAX_WORKER_FRAME_BYTES, type WorkerOperationDescriptor } from "../../workers/contracts";
import { runWorkerEntry, type WorkerEntryInput, type WorkerEntryOutput } from "../../workers/entry";
import { WorkerOperationRegistry } from "../../workers/operation-registry";
import { WorkerPool, type WorkerProfileSpec } from "../../workers/pool";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { resolveExecutableOnPath } from "../../process-supervisor";
import { createTask105L05FixtureWorkerDefinitions } from "./worker-fixture-operations";
import { createTask105L05RecoveryWorkerDefinitions } from "./worker-recovery-operations";

/**
 * TASK-105 L05 persistent-worker registry and entry boundary.
 *
 * Fixture and receipt mutation handlers are deliberately extracted into their
 * owned modules. This file retains only closed descriptors, strict registry
 * wiring, the bounded environment projection, and worker-pool lifecycle.
 */

export const TASK105_L05_WORKER_PROFILE_ID = "task-105-l05-db";

export const TASK105_L05_WORKER_OPERATION_IDS = Object.freeze([
  "task105l05.fixture.install",
  "task105l05.settings.apply",
  "task105l05.settings.restore",
  "task105l05.recovery.recover",
  "task105l05.recovery.prove-absent",
] as const);

export type Task105L05WorkerOperationId = (typeof TASK105_L05_WORKER_OPERATION_IDS)[number];

const TASK105_L05_OPERATION_DIGEST = "task105l05-worker-operations-v2";

function descriptor(
  operationId: Task105L05WorkerOperationId,
  retryClass: "mutation" | "idempotent-read",
  maxOutputBytes = 128 * 1024
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId: TASK105_L05_WORKER_PROFILE_ID,
    inputSchemaId: `${operationId.replaceAll(".", "-")}-input-v1`,
    outputSchemaId: `${operationId.replaceAll(".", "-")}-output-v1`,
    sourceSha256: createHash("sha256")
      .update(`${TASK105_L05_OPERATION_DIGEST}\0${operationId}`)
      .digest("hex"),
    retryClass,
    maxInputBytes: 128 * 1024,
    maxOutputBytes,
  });
}

export const TASK105_L05_WORKER_DESCRIPTORS = Object.freeze({
  install: descriptor("task105l05.fixture.install", "mutation"),
  settingsApply: descriptor("task105l05.settings.apply", "mutation", 4096),
  settingsRestore: descriptor("task105l05.settings.restore", "mutation", 4096),
  recover: descriptor("task105l05.recovery.recover", "mutation", 4096),
  proveAbsent: descriptor("task105l05.recovery.prove-absent", "idempotent-read", 4096),
});

export function createTask105L05WorkerRegistry(): WorkerOperationRegistry {
  return new WorkerOperationRegistry(
    [
      ...createTask105L05FixtureWorkerDefinitions(TASK105_L05_WORKER_DESCRIPTORS),
      ...createTask105L05RecoveryWorkerDefinitions(TASK105_L05_WORKER_DESCRIPTORS),
    ],
    {
      // A worker can report a clean exit only after its lazy database client is
      // closed. No database error is emitted on the protocol stdout channel.
      close: async () => {
        const { closeDatabase } = await import("../../../../core/db/client");
        await closeDatabase();
      },
      proveAbsent: async () => true,
    }
  );
}

/** Fixed allowlist; values are never logged or returned by this module. */
export function projectTask105L05WorkerEnvironment(
  source: NodeJS.ProcessEnv = process.env
): Readonly<Record<string, string>> {
  const environment: Record<string, string> = {
    PATH: source.PATH ?? "",
    DB_POOL_MAX: "1",
  };
  for (const key of [
    "DATABASE_URL",
    "AUTH_PASSWORD_PEPPER",
    "PII_HASH_KEY",
    "PII_ENC_KEY",
  ] as const) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) environment[key] = value;
  }
  return Object.freeze(environment);
}

export function task105L05WorkerProfiles(root: string): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: TASK105_L05_WORKER_PROFILE_ID,
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-105-l05/worker-operations.ts",
        "TASK-105 L05 worker entry"
      ),
      cwd: root,
      family: "task105l05-worker-db",
      requestTimeoutMs: 120_000,
      maximumFrameBytes: MAX_WORKER_FRAME_BYTES,
      environment: () => projectTask105L05WorkerEnvironment(process.env),
    }),
  ]);
}

export async function createTask105L05WorkerPool(
  context: RuntimeSmokeContext
): Promise<WorkerPool> {
  return WorkerPool.create({
    root: context.root,
    executable: await resolveExecutableOnPath("bun", process.env.PATH ?? ""),
    supervisor: context.processes,
    registry: createTask105L05WorkerRegistry(),
    profiles: task105L05WorkerProfiles(context.root),
  });
}

function parseTask105L05WorkerProfile(args: readonly string[]): string {
  if (args.length !== 2 || args[0] !== "--profile" || args[1] !== TASK105_L05_WORKER_PROFILE_ID) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L05 worker profile is invalid");
  }
  return args[1];
}

async function writeTask105L05WorkerStdout(bytes: Uint8Array): Promise<void> {
  await new Promise<void>((resolveWrite, rejectWrite) => {
    process.stdout.write(bytes, (error) => (error ? rejectWrite(error) : resolveWrite()));
  });
}

/**
 * The worker protocol fails closed on any stderr byte
 * (`WorkerClient` rejects the dispatch with "worker wrote unexpected stderr").
 * The app's outbound integration hub logs one machine-readable, secret-free
 * line — `integration_event_dispatch_failed { event, code }` — through
 * `console.warn` when a configured webhook target rejects delivery. The
 * fixture homepage publish (`page.published`) fires that hub fire-and-forget,
 * so on a database with configured integrations the warning can land after the
 * installing operation has already answered and kill the next dispatch. Drop
 * exactly that line inside the worker context; every other warning still
 * reaches stderr and fails the run.
 */
function silenceIntegrationDispatchWarning(): void {
  const originalWarn = console.warn;
  console.warn = (message?: unknown, ...rest: readonly unknown[]): void => {
    if (message === "integration_event_dispatch_failed") return;
    originalWarn(message as string, ...rest);
  };
}

export async function runTask105L05WorkerEntry(args: readonly string[]): Promise<void> {
  const profileId = parseTask105L05WorkerProfile(args);
  await realpath(resolve(import.meta.dir, "../../../.."));
  silenceIntegrationDispatchWarning();
  await runWorkerEntry({
    profileId,
    registry: createTask105L05WorkerRegistry(),
    input: process.stdin as unknown as WorkerEntryInput,
    output: { write: writeTask105L05WorkerStdout } as WorkerEntryOutput,
    maximumFrameBytes: MAX_WORKER_FRAME_BYTES,
  });
}

if (import.meta.main) {
  void runTask105L05WorkerEntry(Bun.argv.slice(2)).catch(() => {
    process.stderr.write('{"code":"task105_l05_worker_failed"}\n');
    process.exitCode = 1;
  });
}

// Keep legacy settings-lease imports stable while their DB implementation is
// owned by the extracted fixture-operations module.
export {
  deleteRuntimeSmokeSettingRow,
  listRuntimeSmokeSettingRows,
  writeRuntimeSmokeSettingRow,
} from "./worker-fixture-operations";
export type { Task105L05InstallInput, Task105L05InstallOutput } from "./worker-fixture-operations";
