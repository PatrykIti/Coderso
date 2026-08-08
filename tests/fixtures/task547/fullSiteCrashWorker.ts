import { db } from "../../../core/db/client";
import {
  applyFullSitePackage,
  type ApplyFullSitePackageInput,
} from "../../../core/services/kits/fullSiteInstall/execute";
import {
  readFullSiteDurableAfterSnapshotV1,
  DURABLE_CREATE_ID_KINDS,
} from "../../../core/services/kits/fullSiteInstall/staging";
import type {
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
  FullSiteReservedRunInitializationInput,
} from "../../../core/services/kits/fullSiteInstallTypes";
import { normalizeFullSitePackageForWrite } from "../../../core/services/kits/fullSitePackage/normalize";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";
import { createRunInitialization } from "../../../core/services/kits/legacyInstallRunPersistence/runInitialization";

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TARGET_KINDS = new Set<FullSiteInstallResourceKind>(DURABLE_CREATE_ID_KINDS);
const REQUEST_KEYS = new Set(["mode", "package", "actorId", "target"]);
const TARGET_KEYS = new Set(["kind", "key", "phase"]);

type WorkerMode =
  "native_committed" | "initialization_transaction_open" | "initialization_committed";

type WorkerRequest = Readonly<{
  mode: WorkerMode;
  package: ApplyFullSitePackageInput["package"];
  actorId: string;
  target: Readonly<{
    kind: Exclude<FullSiteInstallResourceKind, "setting">;
    key: string;
    phase: "staged" | "complete";
  }>;
}>;

type WorkerMarker =
  | Readonly<{
      phase: "native_committed";
      runId: string;
      kind: Exclude<FullSiteInstallResourceKind, "setting">;
      key: string;
      intendedId: string;
      durablePhase: "staged" | "complete";
    }>
  | Readonly<{
      phase: "initialization_transaction_open" | "initialization_committed";
      runId: string;
      itemCount: number;
    }>;

const isDirectPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean => {
  const ownKeys = Reflect.ownKeys(value);
  return (
    ownKeys.length === keys.size && ownKeys.every((key) => typeof key === "string" && keys.has(key))
  );
};

class BoundedLineReader {
  readonly #iterator: AsyncIterator<unknown> = process.stdin[Symbol.asyncIterator]();
  #pending = new Uint8Array();

  async readLine(limit = MAX_INPUT_BYTES): Promise<string> {
    while (true) {
      const newline = this.#pending.indexOf(10);
      if (newline >= 0) {
        const line = this.#pending.slice(0, newline);
        this.#pending = this.#pending.slice(newline + 1);
        return new TextDecoder("utf-8", { fatal: true }).decode(line);
      }
      if (this.#pending.byteLength >= limit) throw new Error("worker_input_too_large");
      const next = await this.#iterator.next();
      if (next.done) throw new Error("worker_input_closed");
      if (!(next.value instanceof Uint8Array)) throw new Error("worker_input_invalid");
      if (this.#pending.byteLength + next.value.byteLength > limit) {
        throw new Error("worker_input_too_large");
      }
      const merged = new Uint8Array(this.#pending.byteLength + next.value.byteLength);
      merged.set(this.#pending);
      merged.set(next.value, this.#pending.byteLength);
      this.#pending = merged;
    }
  }
}

const readRequest = async (lines: BoundedLineReader): Promise<WorkerRequest> => {
  const parsed: unknown = JSON.parse(await lines.readLine());
  if (!isDirectPlainObject(parsed) || !hasExactKeys(parsed, REQUEST_KEYS)) {
    throw new Error("worker_request_invalid");
  }
  const mode = Reflect.get(parsed, "mode");
  const actorId = Reflect.get(parsed, "actorId");
  const target = Reflect.get(parsed, "target");
  if (
    (mode !== "native_committed" &&
      mode !== "initialization_transaction_open" &&
      mode !== "initialization_committed") ||
    typeof actorId !== "string" ||
    !UUID_PATTERN.test(actorId) ||
    !isDirectPlainObject(target) ||
    !hasExactKeys(target, TARGET_KEYS)
  ) {
    throw new Error("worker_request_invalid");
  }
  const kind = Reflect.get(target, "kind");
  const key = Reflect.get(target, "key");
  const phase = Reflect.get(target, "phase");
  if (
    typeof kind !== "string" ||
    !TARGET_KINDS.has(kind as FullSiteInstallResourceKind) ||
    kind === "setting" ||
    typeof key !== "string" ||
    key.length === 0 ||
    (phase !== "staged" && phase !== "complete")
  ) {
    throw new Error("worker_request_invalid");
  }
  return Object.freeze({
    mode,
    package: normalizeFullSitePackageForWrite(Reflect.get(parsed, "package")),
    actorId,
    target: Object.freeze({
      kind: kind as Exclude<FullSiteInstallResourceKind, "setting">,
      key,
      phase,
    }),
  });
};

const writeMarker = async (marker: WorkerMarker): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    process.stdout.write(`${JSON.stringify(marker)}\n`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
};

const waitForRelease = async (lines: BoundedLineReader): Promise<void> => {
  const command = await lines.readLine(64);
  if (command !== "release") throw new Error("worker_release_invalid");
};

const createTransactionOpenInitialization = (
  lines: BoundedLineReader,
  readActiveInput: () => FullSiteReservedRunInitializationInput | null
) => {
  type TransactionCallback = Parameters<typeof db.transaction>[0];
  type TransactionHandle = Parameters<TransactionCallback>[0];
  const crashDatabase = {
    transaction: async (execute: (tx: TransactionHandle) => Promise<unknown>) =>
      db.transaction(
        async (tx) => {
          const result = await execute(tx);
          const active = readActiveInput();
          if (!active) throw new Error("worker_initialization_context_missing");
          await writeMarker({
            phase: "initialization_transaction_open",
            runId: active.ownerRunId,
            itemCount: active.items.length,
          });
          await waitForRelease(lines);
          return result;
        },
        { isolationLevel: "read committed" }
      ),
  } as unknown as NonNullable<Parameters<typeof createRunInitialization>[0]>;
  return createRunInitialization(crashDatabase);
};

const createCrashLedger = (
  request: WorkerRequest,
  lines: BoundedLineReader
): FullSiteInstallLedgerPort => {
  const durable = createLegacyInstallLedger();
  let markerWritten = false;
  let activeInitialization: FullSiteReservedRunInitializationInput | null = null;
  const transactionOpen = createTransactionOpenInitialization(lines, () => activeInitialization);

  return {
    ...durable,
    async initializeReservedRun(input) {
      activeInitialization = input;
      if (request.mode === "initialization_transaction_open") {
        return transactionOpen.initializeReservedRun(input);
      }
      const result = await durable.initializeReservedRun(input);
      if (request.mode === "initialization_committed" && !markerWritten) {
        markerWritten = true;
        await writeMarker({
          phase: "initialization_committed",
          runId: input.ownerRunId,
          itemCount: input.items.length,
        });
        await waitForRelease(lines);
      }
      return result;
    },
    async recordItem(input) {
      const after = readFullSiteDurableAfterSnapshotV1(input.afterSnapshot);
      if (
        request.mode === "native_committed" &&
        !markerWritten &&
        input.kind === request.target.kind &&
        input.key === request.target.key &&
        input.operation === "create" &&
        input.status === "success" &&
        after?.recovery.phase === request.target.phase
      ) {
        markerWritten = true;
        await writeMarker({
          phase: "native_committed",
          runId: input.runId,
          kind: request.target.kind,
          key: request.target.key,
          intendedId: after.id,
          durablePhase: request.target.phase,
        });
        await waitForRelease(lines);
      }
      return durable.recordItem(input);
    },
  };
};

const main = async (): Promise<void> => {
  const lines = new BoundedLineReader();
  const request = await readRequest(lines);
  const ledger = createCrashLedger(request, lines);
  await applyFullSitePackage(
    {
      package: request.package,
      actorId: request.actorId,
      allowSettingTakeover: true,
    },
    { ledger }
  );
  throw new Error("worker_crash_barrier_not_reached");
};

try {
  await main();
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : "worker_failed");
  process.exitCode = 1;
}
