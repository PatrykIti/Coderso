import { createHash, randomBytes } from "node:crypto";

import { inArray } from "drizzle-orm";

import { isPlainObject, resolveInsideRoot, SmokeError } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { resolveExecutableOnPath } from "../../process-supervisor";
import type { WorkerOperationDescriptor } from "../../workers/contracts";
import type { WorkerOperationRegistry } from "../../workers/operation-registry";
import { WorkerPool, type WorkerProfileSpec } from "../../workers/pool";
import {
  TASK491_GA_ID,
  TASK491_MEASUREMENT_ID,
  TASK491_SENTRY_DSN,
  TASK491_SENTRY_ID,
} from "./descriptors";
import type {
  Task491CheckpointInput,
  Task491CheckpointOutput,
  Task491CleanupOutput,
  Task491InstallInput,
  Task491InstallOutput,
  Task491ProofOutput,
  Task491WorkerHandlers,
} from "./worker-operations";

type ExpectedIntegrationState = Readonly<{
  readonly status: "connected" | "disconnected";
  readonly healthStatus: "unknown" | "healthy" | "issue";
  readonly measurementId?: string;
  readonly lastCheckedAt: "any" | "none";
  readonly lastError: string | null;
}>;

type ExpectedScenarioState = Readonly<{
  readonly ga: ExpectedIntegrationState;
  readonly sentry: ExpectedIntegrationState;
}>;

const EXPECTED_SCENARIO_STATES: Readonly<Record<string, ExpectedScenarioState>> = Object.freeze({
  "admin-login": Object.freeze({
    ga: Object.freeze({
      status: "disconnected",
      healthStatus: "unknown",
      lastCheckedAt: "none",
      lastError: null,
    }),
    sentry: Object.freeze({
      status: "connected",
      healthStatus: "unknown",
      lastCheckedAt: "none",
      lastError: null,
    }),
  }),
  "connect-ga-drawer": Object.freeze({
    ga: Object.freeze({
      status: "connected",
      healthStatus: "unknown",
      measurementId: TASK491_MEASUREMENT_ID,
      lastCheckedAt: "none",
      lastError: null,
    }),
    sentry: Object.freeze({
      status: "connected",
      healthStatus: "unknown",
      lastCheckedAt: "none",
      lastError: null,
    }),
  }),
  "health-states": Object.freeze({
    ga: Object.freeze({
      status: "connected",
      healthStatus: "healthy",
      lastCheckedAt: "any",
      lastError: null,
    }),
    sentry: Object.freeze({
      status: "connected",
      healthStatus: "issue",
      lastCheckedAt: "any",
      lastError: "dsn_invalid",
    }),
  }),
  "public-ga-tag": Object.freeze({
    ga: Object.freeze({
      status: "connected",
      healthStatus: "healthy",
      lastCheckedAt: "any",
      lastError: null,
    }),
    sentry: Object.freeze({
      status: "connected",
      healthStatus: "issue",
      lastCheckedAt: "any",
      lastError: "dsn_invalid",
    }),
  }),
  "dark-parity": Object.freeze({
    ga: Object.freeze({
      status: "connected",
      healthStatus: "healthy",
      lastCheckedAt: "any",
      lastError: null,
    }),
    sentry: Object.freeze({
      status: "connected",
      healthStatus: "issue",
      lastCheckedAt: "any",
      lastError: "dsn_invalid",
    }),
  }),
});

interface ObservedIntegrationRow {
  readonly id: string;
  readonly config: unknown;
  readonly status: string;
  readonly healthStatus: string;
  readonly lastCheckedAt: Date | null;
  readonly lastError: string | null;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function expectedMatches(expected: ExpectedIntegrationState, row: ObservedIntegrationRow): boolean {
  const config = isPlainObject(row.config) ? (row.config as Record<string, unknown>) : {};
  const measurementMatches =
    expected.measurementId === undefined || config.measurementId === expected.measurementId;
  const checkedMatches =
    expected.lastCheckedAt === "any" ? row.lastCheckedAt !== null : row.lastCheckedAt === null;
  return (
    row.status === expected.status &&
    row.healthStatus === expected.healthStatus &&
    measurementMatches &&
    checkedMatches &&
    row.lastError === expected.lastError
  );
}

function sanitizedState(row: ObservedIntegrationRow): Record<string, unknown> {
  return Object.freeze({
    id: row.id,
    status: row.status,
    healthStatus: row.healthStatus,
    measurementId: isPlainObject(row.config)
      ? ((row.config as Record<string, unknown>).measurementId ?? null)
      : null,
    lastCheckedAt: row.lastCheckedAt === null ? null : "checked",
    lastError: row.lastError,
  });
}

export class Task491ProductionHandlers implements Task491WorkerHandlers {
  #state: Task491InstallOutput | null = null;
  #cleanupOutput: Task491CleanupOutput | null = null;
  #proofOutput: Task491ProofOutput | null = null;
  #closed = false;

  async install(_input: Task491InstallInput): Promise<Task491InstallOutput> {
    if (this.#state !== null) throw new Error("task_491_fixture_already_installed");
    const { updateIntegration } =
      await import("../../../../core/services/integrations/integrationsService");
    // GA starts disconnected with an empty config; Sentry starts connected with
    // an invalid DSN so the manual health check deterministically reports Issue.
    await updateIntegration(TASK491_GA_ID, Object.freeze({ config: Object.freeze({}) }));
    await updateIntegration(
      TASK491_SENTRY_ID,
      Object.freeze({
        config: Object.freeze({ dsn: TASK491_SENTRY_DSN, environment: "smoke" }),
      })
    );
    const sourceRunId = randomBytes(12).toString("hex");
    const output = Object.freeze({
      schemaVersion: 1 as const,
      sourceRunId,
      gaId: TASK491_GA_ID,
      sentryId: TASK491_SENTRY_ID,
      measurementId: TASK491_MEASUREMENT_ID,
      installedDigest: digest(
        Object.freeze({ version: 1, sourceRunId, gaId: TASK491_GA_ID, sentryId: TASK491_SENTRY_ID })
      ),
      statements: 2,
      rows: 2,
    });
    this.#state = output;
    return output;
  }

  async checkpoint(input: Task491CheckpointInput): Promise<Task491CheckpointOutput> {
    const state = this.#requireState();
    const expected = EXPECTED_SCENARIO_STATES[input.scenarioId];
    if (expected === undefined) throw new Error("task_491_checkpoint_scenario_unregistered");
    const rows = await this.#readRows();
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ga = byId.get(state.gaId);
    const sentry = byId.get(state.sentryId);
    if (ga === undefined || sentry === undefined) {
      throw new Error("task_491_checkpoint_row_missing");
    }
    if (!expectedMatches(expected.ga, ga) || !expectedMatches(expected.sentry, sentry)) {
      throw new Error("task_491_checkpoint_state_mismatch");
    }
    const observed = Object.freeze({
      scenarioId: input.scenarioId,
      ga: sanitizedState(ga),
      sentry: sanitizedState(sentry),
    });
    return Object.freeze({
      schemaVersion: 1,
      scenarioId: input.scenarioId,
      stateDigest: digest(observed),
      statements: 1,
      rows: rows.length,
    });
  }

  async cleanup(): Promise<Task491CleanupOutput> {
    const state = this.#requireState();
    if (this.#cleanupOutput !== null) return this.#cleanupOutput;
    const { db } = await import("../../../../core/db/client");
    const { integrations } = await import("../../../../core/db/schema");
    const ids = Object.freeze([state.gaId, state.sentryId]);
    const mutation = await db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: integrations.id })
        .from(integrations)
        .where(inArray(integrations.id, [...ids]))
        .for("update");
      if (owned.length !== ids.length) {
        throw new Error("task_491_cleanup_provenance_incomplete");
      }
      const deleted =
        owned.length === 0
          ? []
          : await tx
              .delete(integrations)
              .where(inArray(integrations.id, [...ids]))
              .returning({ id: integrations.id });
      return Object.freeze({ owned, deleted });
    });
    const remaining = await this.#readRows();
    if (
      mutation.deleted.length !== ids.length ||
      remaining.length !== 0 ||
      remaining.some((row) => ids.includes(row.id))
    ) {
      throw new Error("task_491_cleanup_absence_incomplete");
    }
    const output = Object.freeze({
      schemaVersion: 1,
      deletedRows: mutation.deleted.length,
      remainingRows: remaining.length,
      idDigest: digest([...ids].sort()),
      statements: 3,
      rows: mutation.deleted.length + remaining.length,
    });
    this.#cleanupOutput = output;
    return output;
  }

  async prove(): Promise<Task491ProofOutput> {
    this.#requireState();
    if (this.#proofOutput !== null) return this.#proofOutput;
    const remaining = await this.#readRows();
    if (remaining.length !== 0) {
      throw new Error("task_491_proof_remaining_rows");
    }
    const output = Object.freeze({
      schemaVersion: 1,
      cleanupDone: this.#cleanupOutput !== null,
      remainingRows: remaining.length,
      statements: 1,
      rows: remaining.length,
    });
    this.#proofOutput = output;
    return output;
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#state !== null && this.#cleanupOutput === null) {
      await this.cleanup();
    }
    if (this.#state !== null && this.#proofOutput === null) {
      await this.prove();
    }
    const { closeDatabase } = await import("../../../../core/db/client");
    await closeDatabase();
  }

  async proveAbsent(): Promise<boolean> {
    return (
      this.#closed &&
      (this.#state === null || (this.#cleanupOutput !== null && this.#proofOutput !== null))
    );
  }

  #requireState(): Task491InstallOutput {
    if (this.#state === null) throw new Error("task_491_fixture_not_installed");
    return this.#state;
  }

  async #readRows(): Promise<readonly ObservedIntegrationRow[]> {
    const state = this.#requireState();
    const { db } = await import("../../../../core/db/client");
    const { integrations } = await import("../../../../core/db/schema");
    const rows = await db
      .select({
        id: integrations.id,
        config: integrations.config,
        status: integrations.status,
        healthStatus: integrations.healthStatus,
        lastCheckedAt: integrations.lastCheckedAt,
        lastError: integrations.lastError,
      })
      .from(integrations)
      .where(inArray(integrations.id, [state.gaId, state.sentryId]))
      .orderBy(integrations.id);
    return Object.freeze(
      rows.map((row) =>
        Object.freeze({
          id: row.id,
          config: row.config,
          status: row.status,
          healthStatus: row.healthStatus,
          lastCheckedAt: row.lastCheckedAt,
          lastError: row.lastError,
        })
      )
    );
  }
}

const REQUIRED_WORKER_ENVIRONMENT = Object.freeze([
  "DATABASE_URL",
  "PII_HASH_KEY",
  "PII_ENC_KEY",
  "MEDIA_SECRET_MASTER_KEY",
] as const);

const OPTIONAL_WORKER_ENVIRONMENT = Object.freeze([
  "AUTH_PASSWORD_PEPPER",
  "MEDIA_BASE_URL",
  "MEDIA_ALLOWED_MIME",
  "MEDIA_MAX_SIZE_BYTES",
  "THEMES_DIR",
  "PLUGINS_RUNTIME_DIR",
] as const);

function environmentValue(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new SmokeError("smoke_argument_invalid", "TASK-491 worker environment is incomplete");
  }
  return value;
}

export function projectTask491WorkerEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const output: Record<string, string> = {
    PATH: environmentValue(source, "PATH"),
    DB_POOL_MAX: "1",
  };
  for (const key of REQUIRED_WORKER_ENVIRONMENT) {
    output[key] = environmentValue(source, key);
  }
  for (const key of OPTIONAL_WORKER_ENVIRONMENT) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0 && !value.includes("\0")) {
      output[key] = value;
    }
  }
  return Object.freeze(output);
}

function task491WorkerProfiles(
  root: string,
  source: NodeJS.ProcessEnv
): readonly WorkerProfileSpec[] {
  return Object.freeze([
    Object.freeze({
      profileId: "task-491-db",
      databaseBearing: true,
      privileged: true,
      entryFile: resolveInsideRoot(
        root,
        "scripts/runtime-smoke/adapters/task-491/worker-operations.ts",
        "TASK-491 worker entry"
      ),
      cwd: root,
      family: "task491-worker-db",
      requestTimeoutMs: 9 * 60_000,
      maximumFrameBytes: 1024 * 1024,
      environment: () => projectTask491WorkerEnvironment(source),
    }),
  ]);
}

export async function createTask491WorkerPool(
  context: RuntimeSmokeContext,
  registry: WorkerOperationRegistry,
  source: NodeJS.ProcessEnv = process.env
): Promise<WorkerPool> {
  const pathValue = environmentValue(source, "PATH");
  return WorkerPool.create({
    root: context.root,
    executable: await resolveExecutableOnPath("bun", pathValue),
    supervisor: context.processes,
    registry,
    profiles: task491WorkerProfiles(context.root, source),
    lifecycle: context.lifecycle,
  });
}

export async function installTask491FixtureInBatches(
  workers: WorkerPool,
  descriptor: WorkerOperationDescriptor,
  nonce: string
): Promise<Task491InstallOutput> {
  const output = await workers.dispatch(descriptor, Object.freeze({ nonce }));
  return output as Task491InstallOutput;
}
