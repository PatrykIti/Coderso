import { realpath } from "node:fs/promises";
import type { LifecycleResource, RuntimeLifecycle } from "../lifecycle";
import type { ProcessSupervisor } from "../process-supervisor";
import {
  WorkerDispatchError,
  WorkerProtocolError,
  assertWorkerToken,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerOperationDescriptor,
  type WorkerPoolCounters,
} from "./contracts";
import { WorkerClient, type WorkerClientSpec } from "./client";
import type { WorkerOperationRegistry } from "./operation-registry";

export interface WorkerProfileSpec extends Omit<
  WorkerClientSpec,
  "root" | "profileId" | "executable" | "environment"
> {
  readonly profileId: string;
  readonly databaseBearing: boolean;
  readonly privileged?: boolean;
  readonly environment: Readonly<Record<string, string>> | (() => Readonly<Record<string, string>>);
}

export interface WorkerPoolOptions {
  readonly root: string;
  readonly executable: string;
  readonly supervisor: ProcessSupervisor;
  readonly registry: WorkerOperationRegistry;
  readonly profiles: readonly WorkerProfileSpec[];
  readonly lifecycle?: RuntimeLifecycle;
}

const EMPTY_COUNTERS: WorkerPoolCounters = Object.freeze({
  starts: 0,
  requests: 0,
  reconnects: 0,
  databaseBatches: 0,
  statements: 0,
  rows: 0,
});

export class WorkerPool implements LifecycleResource {
  readonly name = "runtime-smoke-worker-pool";
  readonly #root: string;
  readonly #executable: string;
  readonly #supervisor: ProcessSupervisor;
  readonly #registry: WorkerOperationRegistry;
  readonly #profiles = new Map<string, WorkerProfileSpec>();
  readonly #clients = new Map<string, WorkerClient>();
  readonly #ownedClients = new Set<WorkerClient>();
  readonly #starting = new Map<string, Promise<WorkerClient>>();
  #closed = false;
  #starts = 0;
  #reconnects = 0;
  #databaseBatches = 0;
  #statements = 0;
  #rows = 0;

  private constructor(options: WorkerPoolOptions, executable: string) {
    this.#root = options.root;
    this.#executable = executable;
    this.#supervisor = options.supervisor;
    this.#registry = options.registry;
    for (const profile of options.profiles) {
      assertWorkerToken(profile.profileId, "worker profile ID");
      if (this.#profiles.has(profile.profileId)) {
        throw new WorkerProtocolError("worker profile is duplicated");
      }
      if (
        profile.databaseBearing &&
        typeof profile.environment !== "function" &&
        profile.environment.DB_POOL_MAX !== "1"
      ) {
        throw new WorkerProtocolError("database worker profile must use DB_POOL_MAX=1");
      }
      this.#profiles.set(profile.profileId, Object.freeze({ ...profile }));
    }
    for (const descriptor of options.registry.descriptors()) {
      if (!this.#profiles.has(descriptor.profileId)) {
        throw new WorkerProtocolError("worker operation profile is not registered");
      }
    }
    options.lifecycle?.register(this);
  }

  static async create(options: WorkerPoolOptions): Promise<WorkerPool> {
    if (options.profiles.length === 0 || options.profiles.length > 32) {
      throw new WorkerProtocolError("worker profile registry has an invalid size");
    }
    const executable = await realpath(options.executable);
    return new WorkerPool(options, executable);
  }

  counters(): WorkerPoolCounters {
    const requests = [...this.#ownedClients].reduce((sum, client) => sum + client.requests, 0);
    if (
      this.#starts === 0 &&
      requests === 0 &&
      this.#reconnects === 0 &&
      this.#databaseBatches === 0 &&
      this.#statements === 0 &&
      this.#rows === 0
    ) {
      return EMPTY_COUNTERS;
    }
    return Object.freeze({
      starts: this.#starts,
      requests,
      reconnects: this.#reconnects,
      databaseBatches: this.#databaseBatches,
      statements: this.#statements,
      rows: this.#rows,
    });
  }

  async forProfile(profileId: string): Promise<WorkerClient> {
    if (this.#closed) throw new WorkerDispatchError("worker pool stopped admission", false);
    const existing = this.#clients.get(profileId);
    if (existing !== undefined) return existing;
    const inFlight = this.#starting.get(profileId);
    if (inFlight !== undefined) return inFlight;
    const profile = this.#profiles.get(profileId);
    if (profile === undefined) throw new WorkerProtocolError("worker profile is not registered");
    const environment =
      typeof profile.environment === "function" ? profile.environment() : profile.environment;
    if (profile.databaseBearing && environment.DB_POOL_MAX !== "1") {
      throw new WorkerProtocolError("database worker profile must use DB_POOL_MAX=1");
    }
    const starting = WorkerClient.start(this.#supervisor, this.#registry, {
      root: this.#root,
      executable: this.#executable,
      entryFile: profile.entryFile,
      cwd: profile.cwd,
      environment,
      profileId,
      family: profile.family,
      requestTimeoutMs: profile.requestTimeoutMs,
      maximumFrameBytes: profile.maximumFrameBytes,
    })
      .then(async (client) => {
        this.#ownedClients.add(client);
        if (this.#closed) {
          await client.close();
          throw new WorkerDispatchError("worker pool stopped admission", false);
        }
        this.#starts += 1;
        this.#clients.set(profileId, client);
        return client;
      })
      .finally(() => this.#starting.delete(profileId));
    this.#starting.set(profileId, starting);
    return starting;
  }

  async dispatch(
    descriptor: WorkerOperationDescriptor,
    input: PlainJsonObject,
    executionBoundaryObserver: (() => void | Promise<void>) | null = null
  ): Promise<PlainJsonValue> {
    const definition = this.#registry.validateDescriptor(descriptor);
    let attempt = 0;
    for (;;) {
      let client: WorkerClient | null = null;
      try {
        client = await this.forProfile(definition.profileId);
        const output = await client.dispatch(definition, input, executionBoundaryObserver);
        return output;
      } catch (error) {
        if (client !== null) {
          this.#clients.delete(definition.profileId);
          await client.invalidate();
        }
        const preDispatch = error instanceof WorkerDispatchError && !error.dispatched;
        if (definition.retryClass !== "idempotent-read" || !preDispatch || attempt >= 1)
          throw error;
        attempt += 1;
        this.#reconnects += 1;
      }
    }
  }

  recordDatabaseBatch(statements: number, rows: number): void {
    if (
      !Number.isSafeInteger(statements) ||
      statements <= 0 ||
      !Number.isSafeInteger(rows) ||
      rows < 0
    ) {
      throw new WorkerProtocolError("database batch counters are invalid");
    }
    this.#databaseBatches += 1;
    this.#statements += statements;
    this.#rows += rows;
  }

  async closeProfile(profileId: string): Promise<void> {
    const client = this.#clients.get(profileId);
    this.#clients.delete(profileId);
    if (client !== undefined) await client.close();
  }

  async closePrivilegedProfiles(): Promise<void> {
    for (const profile of this.#profiles.values()) {
      if (profile.privileged) await this.closeProfile(profile.profileId);
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    const starting = await Promise.allSettled(this.#starting.values());
    const started = starting.flatMap((outcome) =>
      outcome.status === "fulfilled" ? [outcome.value] : []
    );
    const clients = new Set([...this.#clients.values(), ...started]);
    this.#clients.clear();
    await Promise.all([...clients].map((client) => client.close()));
  }

  async proveAbsent(): Promise<boolean> {
    if (!this.#closed || this.#clients.size > 0 || this.#starting.size > 0) return false;
    const absence = await Promise.all(
      [...this.#ownedClients].map((client) => client.proveAbsent())
    );
    return absence.every(Boolean);
  }
}
