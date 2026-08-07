import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { SmokeError } from "../../contracts";
import type { LifecycleResource, RuntimeLifecycle } from "../../lifecycle";
import type { ProcessSupervisor } from "../../process-supervisor";
import {
  MAX_WORKER_FRAME_BYTES,
  assertPlainJsonObject,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerPoolCounters,
} from "../../workers/contracts";
import { WorkerPool, type WorkerProfileSpec } from "../../workers/pool";
import {
  TASK540_OPERATION_PROFILE_IDS,
  type Task540OperationProfileId,
} from "./operations/contracts";
import { task540OperationDescriptor } from "./operations/registry";
import {
  routeTask540Operation,
  type Task540RoutableOperation,
} from "./suite/runtime/operation-router";
import { createTask540WorkerRegistry } from "./worker-entry";
import { TASK540_AUTH_PREPARE_DESCRIPTOR, TASK540_AUTH_RESTORE_DESCRIPTOR } from "./auth-window";
import { buildTask540BaselineDispatches } from "./cleanup-batches";
import { TASK540_PRODUCTION_HANDLER_ARTIFACT } from "./production-handlers";
import {
  createTask540WorkerDescriptors,
  type Task540CleanupBatchInput,
  type Task540CleanupBatchOutput,
} from "./worker-operations";

export interface PersistentBunBridgeDispatch {
  readonly descriptor: Task540RoutableOperation;
  readonly environment: Readonly<Record<string, string>>;
  readonly executablePath: string;
  readonly executionBoundaryObserver: (() => void | Promise<void>) | null;
  readonly input: PlainJsonObject;
  readonly rootPath: string;
}

export interface PersistentBunBridgeCleanupMetadata {
  readonly logicalId: string;
  readonly resourceKey: string;
  readonly kind: string;
  readonly operation: "provenance" | "delete" | "absence";
  readonly identifier: PlainJsonValue;
  readonly ownershipSha256: string;
}

export interface PersistentBunBridgeBatchItem extends PersistentBunBridgeDispatch {
  readonly logicalId: string;
  readonly cleanup: PersistentBunBridgeCleanupMetadata | null;
}

export interface PersistentBunBridgeBatchDispatch {
  readonly kind: "baseline" | "cleanup";
  readonly wave: number;
  readonly items: readonly PersistentBunBridgeBatchItem[];
}

export interface PersistentBunBridgeDispatcher {
  (dispatch: PersistentBunBridgeDispatch): Promise<PlainJsonValue>;
  dispatchBatch(dispatch: PersistentBunBridgeBatchDispatch): Promise<readonly PlainJsonValue[]>;
}

export type PersistentBunBridgeInstaller = (
  dispatcher: PersistentBunBridgeDispatcher
) => () => void;

function canonicalEnvironment(environment: Readonly<Record<string, string>>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(environment).sort(([left], [right]) => left.localeCompare(right))
    )
  );
}

export function task540PersistentFailureToken(operationId: string): string {
  const slug = operationId
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 50)
    .replace(/_+$/u, "");
  if (slug.length === 0) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 worker operation ID is invalid");
  }
  return `wf540_worker_${slug}`;
}

export class Task540PersistentBridge implements LifecycleResource {
  readonly name = "task-540-persistent-bridge";
  readonly #root: string;
  readonly #processes: ProcessSupervisor;
  readonly #entryFile: string;
  readonly #coreRoot: string;
  readonly #environments = new Map<Task540OperationProfileId, Readonly<Record<string, string>>>();
  readonly #environmentDigests = new Map<Task540OperationProfileId, string>();
  readonly #uninstall: () => void;
  #pool: WorkerPool | null = null;
  #executablePath: string | null = null;
  #closed = false;
  #fastAuthPrepared = false;
  #fastAuthRestored = false;

  private constructor(input: {
    readonly root: string;
    readonly entryFile: string;
    readonly coreRoot: string;
    readonly processes: ProcessSupervisor;
    readonly lifecycle: RuntimeLifecycle;
    readonly install: PersistentBunBridgeInstaller;
  }) {
    this.#root = input.root;
    this.#coreRoot = input.coreRoot;
    this.#entryFile = input.entryFile;
    this.#processes = input.processes;
    const dispatcher = ((dispatch: PersistentBunBridgeDispatch) =>
      this.dispatch(dispatch)) as PersistentBunBridgeDispatcher;
    dispatcher.dispatchBatch = (dispatch) => this.dispatchBatch(dispatch);
    this.#uninstall = input.install(dispatcher);
    input.lifecycle.register(this);
  }

  static async create(input: {
    readonly root: string;
    readonly processes: ProcessSupervisor;
    readonly lifecycle: RuntimeLifecycle;
    readonly install: PersistentBunBridgeInstaller;
  }): Promise<Task540PersistentBridge> {
    const [root, coreRoot, entryFile] = await Promise.all([
      realpath(input.root),
      realpath(resolve(input.root, "core")),
      realpath(resolve(input.root, "scripts/runtime-smoke/adapters/task-540/worker-entry.ts")),
    ]);
    if (root !== input.root) {
      throw new SmokeError("smoke_argument_invalid", "TASK-540 bridge root is not canonical");
    }
    return new Task540PersistentBridge({ ...input, root, coreRoot, entryFile });
  }

  counters(): WorkerPoolCounters {
    return (
      this.#pool?.counters() ?? {
        starts: 0,
        requests: 0,
        reconnects: 0,
        databaseBatches: 0,
        statements: 0,
        rows: 0,
      }
    );
  }

  async dispatch(dispatch: PersistentBunBridgeDispatch): Promise<PlainJsonValue> {
    if (this.#closed || dispatch.rootPath !== this.#root) {
      throw new SmokeError("smoke_process_failed", "TASK-540 persistent bridge is unavailable");
    }
    const profileId = dispatch.descriptor.envProfileId as Task540OperationProfileId;
    if (!TASK540_OPERATION_PROFILE_IDS.includes(profileId)) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 bridge profile is unregistered");
    }
    assertPlainJsonObject(dispatch.input, "TASK-540 persistent bridge input");
    const alias = routeTask540Operation(dispatch.descriptor);
    this.#bindEnvironment(profileId, dispatch.environment);
    const pool = await this.#poolFor(dispatch.executablePath);
    try {
      return await pool.dispatch(
        task540OperationDescriptor(alias),
        dispatch.input,
        dispatch.executionBoundaryObserver
      );
    } catch (error) {
      // The operation ID is catalog-owned and contains no request or result data. Projecting it
      // into the legacy bounded diagnostic keeps worker failures actionable without exposing the
      // private exception, input, database row, or environment.
      throw new SmokeError("smoke_process_failed", task540PersistentFailureToken(alias.handlerId), {
        cause: error,
      });
    }
  }

  async dispatchBatch(
    dispatch: PersistentBunBridgeBatchDispatch
  ): Promise<readonly PlainJsonValue[]> {
    if (
      this.#closed ||
      !Number.isSafeInteger(dispatch.wave) ||
      dispatch.wave < 0 ||
      dispatch.items.length === 0 ||
      dispatch.items.length > 128
    ) {
      throw new SmokeError("smoke_process_failed", "TASK-540 persistent batch is unavailable");
    }
    const executablePaths = new Set(dispatch.items.map(({ executablePath }) => executablePath));
    const rootPaths = new Set(dispatch.items.map(({ rootPath }) => rootPath));
    if (executablePaths.size !== 1 || rootPaths.size !== 1 || !rootPaths.has(this.#root)) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 persistent batch authority drifted");
    }
    const resolvedItems = dispatch.items.map((item) => {
      const profileId = item.descriptor.envProfileId as Task540OperationProfileId;
      if (!TASK540_OPERATION_PROFILE_IDS.includes(profileId)) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 batch profile is unregistered");
      }
      assertPlainJsonObject(item.input, "TASK-540 persistent batch input");
      const alias = routeTask540Operation(item.descriptor);
      this.#bindEnvironment(profileId, item.environment);
      return { item, alias, profileId };
    });
    const pool = await this.#poolFor(dispatch.items[0]!.executablePath);
    try {
      if (dispatch.kind === "baseline") {
        if (resolvedItems.some(({ item }) => item.cleanup !== null)) {
          throw new SmokeError("smoke_output_invalid", "TASK-540 baseline batch metadata drifted");
        }
        const plans = buildTask540BaselineDispatches(
          resolvedItems.map(({ item, alias, profileId }) => ({
            logicalId: item.logicalId,
            operationId: alias.operationId,
            profileId,
            input: item.input,
          })),
          TASK540_PRODUCTION_HANDLER_ARTIFACT
        );
        const outputs = [] as Array<{
          readonly logicalId: string;
          readonly output: PlainJsonValue;
        }>;
        for (const plan of plans) {
          const output = (await pool.dispatch(plan.descriptor, plan.input)) as unknown as {
            readonly results: readonly {
              readonly logicalId: string;
              readonly output: PlainJsonValue;
            }[];
            readonly statements: number;
            readonly rows: number;
          };
          pool.recordDatabaseBatch(output.statements, output.rows);
          outputs.push(...output.results);
        }
        const byLogicalId = new Map(outputs.map((result) => [result.logicalId, result.output]));
        if (byLogicalId.size !== dispatch.items.length) {
          throw new SmokeError("smoke_output_invalid", "TASK-540 baseline batch result drifted");
        }
        return Object.freeze(
          dispatch.items.map(({ logicalId }) => {
            const output = byLogicalId.get(logicalId);
            if (output === undefined) {
              throw new SmokeError("smoke_output_invalid", "TASK-540 baseline result is absent");
            }
            return output;
          })
        );
      }
      if (
        resolvedItems.some(
          ({ profileId, item }) => profileId !== "database" || item.cleanup === null
        )
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 cleanup batch metadata drifted");
      }
      const descriptors = createTask540WorkerDescriptors(TASK540_PRODUCTION_HANDLER_ARTIFACT);
      const input = Object.freeze({
        wave: dispatch.wave,
        items: Object.freeze(resolvedItems.map(({ item }) => Object.freeze({ ...item.cleanup! }))),
      }) as Task540CleanupBatchInput;
      const output = (await pool.dispatch(
        descriptors.cleanupDatabase,
        input
      )) as unknown as Task540CleanupBatchOutput;
      pool.recordDatabaseBatch(output.statements, output.rows);
      const byLogicalId = new Map(
        output.results.map((result) => [result.logicalId, result.output])
      );
      if (byLogicalId.size !== dispatch.items.length) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 cleanup batch result drifted");
      }
      return Object.freeze(
        dispatch.items.map(({ logicalId }) => {
          const value = byLogicalId.get(logicalId);
          if (value === undefined) {
            throw new SmokeError("smoke_output_invalid", "TASK-540 cleanup result is absent");
          }
          return value;
        })
      );
    } catch (error) {
      throw new SmokeError("smoke_process_failed", "wf540_worker_batch", { cause: error });
    }
  }

  async prepareFastAuthWindow(input: {
    readonly environment: Readonly<Record<string, string>>;
    readonly executablePath: string;
  }): Promise<void> {
    if (this.#fastAuthPrepared || this.#closed) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 fast auth window is unavailable");
    }
    this.#bindEnvironment("database", input.environment);
    const pool = await this.#poolFor(input.executablePath);
    await pool.dispatch(TASK540_AUTH_PREPARE_DESCRIPTOR, {});
    this.#fastAuthPrepared = true;
  }

  async restoreFastAuthWindow(): Promise<void> {
    if (!this.#fastAuthPrepared || this.#fastAuthRestored) return;
    const pool = this.#pool;
    if (pool === null) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-540 auth worker is absent");
    }
    await pool.dispatch(TASK540_AUTH_RESTORE_DESCRIPTOR, {});
    this.#fastAuthRestored = true;
  }

  async closePrivilegedProfiles(): Promise<void> {
    if (this.#closed) {
      throw new SmokeError("smoke_process_failed", "TASK-540 persistent bridge is unavailable");
    }
    await this.#pool?.closePrivilegedProfiles();
  }

  #bindEnvironment(
    profileId: Task540OperationProfileId,
    environment: Readonly<Record<string, string>>
  ): void {
    const digest = canonicalEnvironment(environment);
    const previous = this.#environmentDigests.get(profileId);
    if (previous !== undefined && previous !== digest) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 worker environment drifted");
    }
    if (previous === undefined) {
      this.#environments.set(profileId, Object.freeze({ ...environment }));
      this.#environmentDigests.set(profileId, digest);
    }
  }

  async #poolFor(executablePath: string): Promise<WorkerPool> {
    const canonicalExecutable = await realpath(executablePath);
    if (this.#executablePath !== null && canonicalExecutable !== this.#executablePath) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 Bun executable drifted");
    }
    if (this.#pool !== null) return this.#pool;
    this.#executablePath = canonicalExecutable;
    const registry = createTask540WorkerRegistry("database");
    const profiles: WorkerProfileSpec[] = TASK540_OPERATION_PROFILE_IDS.map((profileId) => ({
      profileId,
      databaseBearing: profileId !== "schema-only",
      privileged: !new Set<Task540OperationProfileId>(["schema-only", "database"]).has(profileId),
      entryFile: this.#entryFile,
      // Static handlers resolve storage and plugin paths from core's process.cwd(), matching the
      // runtime authority used by the product services they call.
      cwd: this.#coreRoot,
      family: `task540-worker-${profileId}`,
      // Preserve the canonical bridge's 540 s per-operation ceiling. The worker client owns the
      // whole request frame, so a shorter generic timeout would turn a valid legacy DB operation
      // into an uncertain mutation and change cleanup semantics.
      requestTimeoutMs: 540_000,
      maximumFrameBytes: MAX_WORKER_FRAME_BYTES,
      environment: () => {
        const environment = this.#environments.get(profileId);
        if (environment === undefined) {
          throw new SmokeError("smoke_output_invalid", "TASK-540 worker environment is absent");
        }
        return environment;
      },
    }));
    this.#pool = await WorkerPool.create({
      root: this.#root,
      executable: canonicalExecutable,
      supervisor: this.#processes,
      registry,
      profiles,
    });
    return this.#pool;
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#uninstall();
    let restoreFailure: unknown = null;
    try {
      await this.restoreFastAuthWindow();
    } catch (error) {
      restoreFailure = error;
    }
    await this.#pool?.close();
    if (restoreFailure !== null) throw restoreFailure;
  }

  async proveAbsent(): Promise<boolean> {
    return (
      this.#closed &&
      (!this.#fastAuthPrepared || this.#fastAuthRestored) &&
      (this.#pool === null || (await this.#pool.proveAbsent()))
    );
  }
}
