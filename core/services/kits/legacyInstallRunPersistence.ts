import { aliasedTable, and, asc, desc, eq, exists, inArray, notExists, or, sql } from "drizzle-orm";
import postgres from "postgres";
import { db } from "../../db/client";
import { solutionKitInstallItems, solutionKitInstallRuns } from "../../db/schema";
import { logAudit } from "../audit/auditService";
import { getSolutionKitFromCatalog } from "./solutionKitsCatalog";
import type { SolutionKitDefinition, SolutionKitId } from "./solutionKitTypes";
import { asRecord, isRecord, planOperations } from "./legacyInstallPlanning";
import type {
  ApplySolutionKitInstallInput,
  JsonRecord,
  QueryExecutor,
  RollbackSolutionKitInstallInput,
  SolutionKitInstallItemOperation,
  SolutionKitInstallItemRecord,
  SolutionKitInstallItemRow,
  SolutionKitInstallItemStatus,
  SolutionKitInstallMode,
  SolutionKitInstallResourceType,
  SolutionKitInstallResult,
  SolutionKitInstallRunRecord,
  SolutionKitInstallRunRow,
  SolutionKitInstallStatus,
  SolutionKitInstallSummary,
} from "./legacyInstallPlanning";
import { executeInstallOperation } from "./legacyInstallResourceHandlers";
import { executeRollbackForItem } from "./legacyInstallRollback";
import type {
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
  ManagedResourceEvidence,
} from "./fullSiteInstallTypes";
import { toSafeFullSiteErrorCode } from "./fullSiteInstallTypes";
import { DiagnosticCollector, readPackageKey } from "./fullSitePackage/schema";
import type { JsonObject } from "./fullSitePackage/types";

export const normalizeRunRow = (row: SolutionKitInstallRunRow): SolutionKitInstallRunRecord => ({
  id: row.id,
  kitId: row.kitId,
  mode: row.mode as SolutionKitInstallMode,
  status: row.status as SolutionKitInstallStatus,
  actorId: row.actorId,
  rollbackOfRunId: row.rollbackOfRunId,
  options: asRecord(row.options),
  summary: asRecord(row.summary),
  error: row.error,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  finishedAt: row.finishedAt,
});

export const normalizeItemRow = (row: SolutionKitInstallItemRow): SolutionKitInstallItemRecord => ({
  id: row.id,
  runId: row.runId,
  position: row.position,
  resourceType: row.resourceType as SolutionKitInstallResourceType,
  resourceKey: row.resourceKey,
  operation: row.operation as SolutionKitInstallItemOperation,
  status: row.status as SolutionKitInstallItemStatus,
  beforeSnapshot: isRecord(row.beforeSnapshot) ? (row.beforeSnapshot as JsonRecord) : null,
  afterSnapshot: isRecord(row.afterSnapshot) ? (row.afterSnapshot as JsonRecord) : null,
  rollbackAction: (row.rollbackAction ?? null) as JsonRecord | null,
  error: row.error,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const buildSummary = (
  items: Pick<SolutionKitInstallItemRecord, "operation" | "status">[]
): SolutionKitInstallSummary => {
  const summary: SolutionKitInstallSummary = {
    total: 0,
    success: 0,
    failed: 0,
    planned: 0,
    skipped: 0,
    operations: {
      create: 0,
      update: 0,
      noop: 0,
      delete: 0,
      restore: 0,
    },
  };

  for (const item of items) {
    summary.total += 1;
    summary.operations[item.operation] += 1;
    if (item.status === "success") summary.success += 1;
    if (item.status === "failed") summary.failed += 1;
    if (item.status === "planned") summary.planned += 1;
    if (item.status === "skipped") summary.skipped += 1;
  }
  return summary;
};

export const resolveKitDefinition = (kitId: SolutionKitId, override?: SolutionKitDefinition) => {
  if (override) return override;
  const kit = getSolutionKitFromCatalog(kitId);
  if (!kit) throw new Error("solution_kit_not_found");
  return kit;
};

export const createInstallRun = async (input: {
  kitId: string;
  mode: SolutionKitInstallMode;
  actorId?: string | null;
  rollbackOfRunId?: string | null;
  options?: JsonRecord;
}) => {
  const [row] = await db
    .insert(solutionKitInstallRuns)
    .values({
      kitId: input.kitId,
      mode: input.mode,
      status: "running",
      actorId: input.actorId ?? null,
      rollbackOfRunId: input.rollbackOfRunId ?? null,
      options: input.options ?? {},
      summary: {},
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      finishedAt: null,
    })
    .returning();
  if (!row) throw new Error("solution_kit_install_run_create_failed");
  return normalizeRunRow(row);
};

export const appendInstallItem = async (
  runId: string,
  input: {
    position: number;
    resourceType: SolutionKitInstallResourceType;
    resourceKey: string;
    operation: SolutionKitInstallItemOperation;
    status: SolutionKitInstallItemStatus;
    beforeSnapshot?: JsonRecord | null;
    afterSnapshot?: JsonRecord | null;
    rollbackAction?: JsonRecord | null;
    error?: string | null;
  }
) => {
  const [row] = await db
    .insert(solutionKitInstallItems)
    .values({
      runId,
      position: input.position,
      resourceType: input.resourceType,
      resourceKey: input.resourceKey,
      operation: input.operation,
      status: input.status,
      beforeSnapshot: input.beforeSnapshot ?? null,
      afterSnapshot: input.afterSnapshot ?? null,
      rollbackAction: input.rollbackAction ?? null,
      error: input.error ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  if (!row) throw new Error("solution_kit_install_item_create_failed");
  return normalizeItemRow(row);
};

export const finalizeInstallRun = async (
  runId: string,
  input: {
    status: SolutionKitInstallStatus;
    summary: SolutionKitInstallSummary;
    error?: string | null;
  }
) => {
  const [row] = await db
    .update(solutionKitInstallRuns)
    .set({
      status: input.status,
      summary: input.summary,
      error: input.error ?? null,
      updatedAt: new Date(),
      finishedAt: new Date(),
    })
    .where(eq(solutionKitInstallRuns.id, runId))
    .returning();
  if (!row) throw new Error("solution_kit_install_run_finalize_failed");
  return normalizeRunRow(row);
};

export async function listSolutionKitInstallRuns(options?: {
  kitId?: string;
  mode?: SolutionKitInstallMode;
  limit?: number;
}) {
  const filters = [];
  if (options?.kitId) filters.push(eq(solutionKitInstallRuns.kitId, options.kitId));
  if (options?.mode) filters.push(eq(solutionKitInstallRuns.mode, options.mode));

  const limit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(Math.round(options.limit), 200))
      : 50;

  const rows = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(solutionKitInstallRuns.createdAt))
    .limit(limit);

  return rows.map(normalizeRunRow);
}

export async function getSolutionKitInstallRun(runId: string) {
  const [row] = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(eq(solutionKitInstallRuns.id, runId));
  return row ? normalizeRunRow(row) : null;
}

export async function listSolutionKitInstallItems(runId: string) {
  const rows = await db
    .select()
    .from(solutionKitInstallItems)
    .where(eq(solutionKitInstallItems.runId, runId))
    .orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.createdAt));

  return rows.map(normalizeItemRow);
}

export async function applySolutionKitInstall(
  input: ApplySolutionKitInstallInput
): Promise<SolutionKitInstallResult> {
  const definition = resolveKitDefinition(input.kitId, input.kitDefinitionOverride);
  const operations = planOperations(definition.resourceBlueprint);
  const mode: SolutionKitInstallMode = input.dryRun ? "dry_run" : "apply";
  const continueOnError = input.continueOnError ?? true;
  const run = await defaultLegacyInstallLedger.createRun({
    packageKey: definition.id,
    dryRun: Boolean(input.dryRun),
    actorId: input.actorId ?? null,
    options: {
      continueOnError,
      operationCount: operations.length,
      ...asRecord(input.runOptions),
    },
  });

  let failureCount = 0;

  for (const operation of operations) {
    try {
      const result = input.dryRun
        ? await executeInstallOperation(db, operation, true)
        : await db.transaction((tx) =>
            executeInstallOperation(tx as QueryExecutor, operation, false)
          );

      await defaultLegacyInstallLedger.recordItem({
        runId: run.id,
        position: operation.position,
        kind: operation.resourceType,
        key: operation.resourceKey,
        operation: result.operation,
        status: input.dryRun ? "planned" : "success",
        beforeSnapshot: result.beforeSnapshot as JsonObject | null,
        afterSnapshot: result.afterSnapshot as JsonObject | null,
        rollbackAction: result.rollbackAction as JsonObject | null,
        error: null,
      });
    } catch (error) {
      failureCount += 1;
      const message = error instanceof Error ? error.message : "solution_kit_operation_failed";
      await defaultLegacyInstallLedger.recordItem({
        runId: run.id,
        position: operation.position,
        kind: operation.resourceType,
        key: operation.resourceKey,
        operation: "noop",
        status: "failed",
        beforeSnapshot: null,
        afterSnapshot: null,
        error: message,
      });
      if (!continueOnError) break;
    }
  }

  const items = await listSolutionKitInstallItems(run.id);
  const summary = buildSummary(items);
  const finalStatus: SolutionKitInstallStatus = failureCount > 0 ? "failed" : "success";
  await defaultLegacyInstallLedger.finalizeRun({
    runId: run.id,
    status: finalStatus,
    error: failureCount > 0 ? `failed_operations:${failureCount}` : null,
  });
  const finalizedRun = await getSolutionKitInstallRun(run.id);
  if (!finalizedRun) throw new Error("solution_kit_install_run_not_found");

  await logAudit({
    actorId: input.actorId ?? null,
    action: "solution_kits.apply",
    targetType: "solution_kit",
    targetId: definition.id,
    metadata: {
      runId: finalizedRun.id,
      mode,
      status: finalizedRun.status,
      summary,
    },
  });

  return {
    run: finalizedRun,
    items,
    summary,
  };
}

export const resolveRollbackSourceRun = async (input: RollbackSolutionKitInstallInput) => {
  if (input.sourceRunId) {
    const [row] = await db
      .select()
      .from(solutionKitInstallRuns)
      .where(eq(solutionKitInstallRuns.id, input.sourceRunId));
    if (!row) throw new Error("solution_kit_install_run_not_found");
    if (row.mode !== "apply") throw new Error("solution_kit_rollback_invalid_source");
    return normalizeRunRow(row);
  }

  if (!input.kitId) throw new Error("solution_kit_rollback_source_required");

  const [row] = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(
      and(
        eq(solutionKitInstallRuns.kitId, input.kitId),
        eq(solutionKitInstallRuns.mode, "apply"),
        eq(solutionKitInstallRuns.status, "success")
      )
    )
    .orderBy(desc(solutionKitInstallRuns.createdAt))
    .limit(1);

  if (!row) throw new Error("solution_kit_rollback_source_not_found");
  return normalizeRunRow(row);
};

export async function rollbackSolutionKitInstall(
  input: RollbackSolutionKitInstallInput
): Promise<SolutionKitInstallResult> {
  const sourceRun = await resolveRollbackSourceRun(input);
  const sourceItems = await listSolutionKitInstallItems(sourceRun.id);
  const continueOnError = input.continueOnError ?? true;
  const rollbackRun = await defaultLegacyInstallLedger.createRollbackRun({
    sourceRunId: sourceRun.id,
    packageKey: sourceRun.kitId,
    actorId: input.actorId ?? null,
    options: {
      sourceRunId: sourceRun.id,
      continueOnError,
      operationCount: sourceItems.length,
    },
  });

  let failureCount = 0;

  const ordered = [...sourceItems].sort((left, right) => right.position - left.position);

  for (let index = 0; index < ordered.length; index += 1) {
    const sourceItem = ordered[index];
    try {
      const result = await db.transaction((tx) =>
        executeRollbackForItem(tx as QueryExecutor, sourceItem)
      );
      if (result.status === "failed") failureCount += 1;

      await defaultLegacyInstallLedger.recordItem({
        runId: rollbackRun.id,
        position: index,
        kind: sourceItem.resourceType as FullSiteInstallResourceKind,
        key: sourceItem.resourceKey,
        operation: result.operation,
        status: result.status,
        beforeSnapshot: result.beforeSnapshot as JsonObject | null,
        afterSnapshot: result.afterSnapshot as JsonObject | null,
        rollbackAction: result.rollbackAction as JsonObject | null,
        error: result.error,
      });

      if (result.status === "failed" && !continueOnError) break;
    } catch (error) {
      failureCount += 1;
      const message =
        error instanceof Error ? error.message : "solution_kit_rollback_operation_failed";

      await defaultLegacyInstallLedger.recordItem({
        runId: rollbackRun.id,
        position: index,
        kind: sourceItem.resourceType as FullSiteInstallResourceKind,
        key: sourceItem.resourceKey,
        operation: "restore",
        status: "failed",
        beforeSnapshot: null,
        afterSnapshot: null,
        error: message,
      });
      if (!continueOnError) break;
    }
  }

  const items = await listSolutionKitInstallItems(rollbackRun.id);
  const summary = buildSummary(items);
  const finalStatus: SolutionKitInstallStatus = failureCount > 0 ? "failed" : "success";
  await defaultLegacyInstallLedger.finalizeRun({
    runId: rollbackRun.id,
    status: finalStatus,
    error: failureCount > 0 ? `failed_operations:${failureCount}` : null,
  });
  const finalizedRun = await getSolutionKitInstallRun(rollbackRun.id);
  if (!finalizedRun) throw new Error("solution_kit_install_run_not_found");

  await logAudit({
    actorId: input.actorId ?? null,
    action: "solution_kits.rollback",
    targetType: "solution_kit_install_run",
    targetId: sourceRun.id,
    metadata: {
      rollbackRunId: finalizedRun.id,
      status: finalizedRun.status,
      summary,
    },
  });

  return {
    run: finalizedRun,
    items,
    summary,
  };
}

type PersistedResourceType = typeof solutionKitInstallItems.$inferSelect.resourceType;

const readSnapshotId = (value: unknown): string | null =>
  isRecord(value) && typeof value.id === "string" ? value.id : null;

const readDesiredSnapshot = (value: unknown): JsonObject =>
  isRecord(value) && isRecord(value.desired)
    ? (value.desired as JsonObject)
    : isRecord(value)
      ? (value as JsonObject)
      : {};

export const buildManagedResourceEvidenceQuery = (input: {
  packageKey: string;
  kind: FullSiteInstallResourceKind;
  key: string;
}) => {
  const candidateItem = aliasedTable(solutionKitInstallItems, "managed_candidate_item");
  const candidateRun = aliasedTable(solutionKitInstallRuns, "managed_candidate_run");
  const rollbackRun = aliasedTable(solutionKitInstallRuns, "managed_rollback_run");
  const rollbackItem = aliasedTable(solutionKitInstallItems, "managed_rollback_item");
  const candidateItemId = sql<string>`${candidateItem.id}`.as("candidate_item_id");
  const candidateItemCreatedAt = sql<Date>`${candidateItem.createdAt}`.as(
    "candidate_item_created_at"
  );
  const candidateItemForRun = db
    .select({ candidateItemId, candidateItemCreatedAt })
    .from(candidateItem)
    .where(
      and(
        eq(candidateItem.runId, candidateRun.id),
        eq(candidateItem.resourceType, input.kind as PersistedResourceType),
        eq(candidateItem.resourceKey, input.key),
        eq(candidateItem.status, "success"),
        inArray(candidateItem.operation, ["create", "update"])
      )
    )
    .orderBy(desc(candidateItemCreatedAt), desc(candidateItemId))
    .limit(1)
    .as("managed_candidate_item_for_run");
  const matchingSuccessfulRollbackItem = db
    .select({ one: sql<number>`1` })
    .from(rollbackItem)
    .where(
      and(
        eq(rollbackItem.runId, rollbackRun.id),
        eq(rollbackItem.resourceType, input.kind as PersistedResourceType),
        eq(rollbackItem.resourceKey, input.key),
        eq(rollbackItem.status, "success")
      )
    );
  const invalidatingRollbackRun = db
    .select({ one: sql<number>`1` })
    .from(rollbackRun)
    .where(
      and(
        eq(rollbackRun.rollbackOfRunId, candidateRun.id),
        eq(rollbackRun.mode, "rollback"),
        or(eq(rollbackRun.status, "success"), exists(matchingSuccessfulRollbackItem))
      )
    );
  const candidateRunId = sql<string>`${candidateRun.id}`.as("candidate_run_id");
  const winner = db
    .select({
      candidateRunId,
      candidateItemId: candidateItemForRun.candidateItemId,
      candidateItemCreatedAt: candidateItemForRun.candidateItemCreatedAt,
    })
    .from(candidateRun)
    .innerJoinLateral(candidateItemForRun, sql`true`)
    .where(
      and(
        eq(candidateRun.kitId, input.packageKey),
        eq(candidateRun.mode, "apply"),
        eq(candidateRun.status, "success"),
        notExists(invalidatingRollbackRun)
      )
    )
    .orderBy(
      desc(candidateRun.createdAt),
      desc(candidateRun.updatedAt),
      desc(candidateRunId),
      desc(candidateItemForRun.candidateItemCreatedAt),
      desc(candidateItemForRun.candidateItemId)
    )
    .limit(1)
    .as("managed_resource_winner");

  return db
    .select({
      runId: winner.candidateRunId,
      afterSnapshot: solutionKitInstallItems.afterSnapshot,
    })
    .from(winner)
    .innerJoin(solutionKitInstallItems, eq(solutionKitInstallItems.id, winner.candidateItemId));
};

export const findManagedResourceEvidence = async (input: {
  packageKey: string;
  kind: FullSiteInstallResourceKind;
  key: string;
}): Promise<ManagedResourceEvidence | null> => {
  const [row] = await buildManagedResourceEvidenceQuery(input);
  if (!row) return null;
  const resourceId = readSnapshotId(row.afterSnapshot);
  if (!resourceId) return null;
  return {
    runId: row.runId,
    resourceId,
    desired: readDesiredSnapshot(row.afterSnapshot),
    successful: true,
    rolledBack: false,
  };
};

const toFullSiteRun = (run: SolutionKitInstallRunRecord) => ({
  id: run.id,
  packageKey: run.kitId,
  mode: run.mode,
  status: run.status,
  rollbackOfRunId: run.rollbackOfRunId,
  options: run.options as JsonObject,
});

const FULL_SITE_PACKAGE_LOCK_NAMESPACE = 547;
const GLOBAL_FULL_SITE_LOCK_NAMESPACE = 548;
const GLOBAL_FULL_SITE_LOCK_KEY = 0;
const FULL_SITE_LOCK_RELEASE_FAILED = "site_package_lock_release_failed";

const requireCanonicalPackageKey = (value: string): string => {
  const diagnostics = new DiagnosticCollector();
  const packageKey = readPackageKey(value, "$.key", diagnostics);
  try {
    diagnostics.throwIfAny();
  } catch {
    throw new Error("site_package_invalid");
  }
  if (packageKey !== value) throw new Error("site_package_invalid");
  return packageKey;
};

export type FullSiteInstallLockSession = {
  acquireGlobal(): Promise<void>;
  acquirePackage(): Promise<void>;
  releasePackage(): Promise<boolean>;
  releaseGlobal(): Promise<boolean>;
  releaseReservation(): void | Promise<void>;
};

export type FullSiteInstallLockRuntime = {
  reserveSession(): Promise<FullSiteInstallLockSession>;
  endClient(): Promise<void>;
};

/**
 * Runs the lock lifecycle independently from the postgres.js adapter so every
 * cleanup branch remains deterministic and directly testable. An operation or
 * acquisition failure stays authoritative over later cleanup failures.
 */
export const runFullSiteInstallLockLifecycle = async <T>(
  runtime: FullSiteInstallLockRuntime,
  execute: () => Promise<T>
): Promise<T> => {
  let session: FullSiteInstallLockSession | null = null;
  let globalAcquired = false;
  let packageAcquired = false;
  let outcome: { ok: true; value: T } | { ok: false; error: unknown };
  let cleanupError: unknown;
  const cleanUp = async (action: () => void | Promise<void>) => {
    try {
      await action();
    } catch (error) {
      cleanupError ??= error;
    }
  };

  try {
    session = await runtime.reserveSession();
    await session.acquireGlobal();
    globalAcquired = true;
    await session.acquirePackage();
    packageAcquired = true;
    outcome = { ok: true, value: await execute() };
  } catch (error) {
    outcome = { ok: false, error };
  } finally {
    const cleanupSession = session;
    if (packageAcquired && cleanupSession) {
      await cleanUp(async () => {
        if (!(await cleanupSession.releasePackage()))
          throw new Error(FULL_SITE_LOCK_RELEASE_FAILED);
      });
    }
    if (globalAcquired && cleanupSession) {
      await cleanUp(async () => {
        if (!(await cleanupSession.releaseGlobal())) throw new Error(FULL_SITE_LOCK_RELEASE_FAILED);
      });
    }
    if (cleanupSession) await cleanUp(() => cleanupSession.releaseReservation());
    await cleanUp(() => runtime.endClient());
  }

  // Preserve the callback/acquisition error even if one or more cleanup steps failed.
  if (!outcome.ok) throw outcome.error;
  if (cleanupError) throw cleanupError;
  return outcome.value;
};

export const withFullSiteInstallLocks = async <T>(
  packageKey: string,
  execute: () => Promise<T>
): Promise<T> => {
  const canonicalPackageKey = requireCanonicalPackageKey(packageKey);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const lockClient = postgres(databaseUrl, { max: 1, max_lifetime: null });

  return runFullSiteInstallLockLifecycle(
    {
      reserveSession: async () => {
        const lockSession = await lockClient.reserve();
        return {
          acquireGlobal: async () => {
            await lockSession`
              select pg_advisory_lock(
                ${GLOBAL_FULL_SITE_LOCK_NAMESPACE},
                ${GLOBAL_FULL_SITE_LOCK_KEY}
              )
            `;
          },
          acquirePackage: async () => {
            await lockSession`
              select pg_advisory_lock(
                ${FULL_SITE_PACKAGE_LOCK_NAMESPACE},
                hashtext(${canonicalPackageKey})
              )
            `;
          },
          releasePackage: async () => {
            const [row] = await lockSession<{ unlocked: boolean }[]>`
              select pg_advisory_unlock(
                ${FULL_SITE_PACKAGE_LOCK_NAMESPACE},
                hashtext(${canonicalPackageKey})
              ) as unlocked
            `;
            return row?.unlocked === true;
          },
          releaseGlobal: async () => {
            const [row] = await lockSession<{ unlocked: boolean }[]>`
              select pg_advisory_unlock(
                ${GLOBAL_FULL_SITE_LOCK_NAMESPACE},
                ${GLOBAL_FULL_SITE_LOCK_KEY}
              ) as unlocked
            `;
            return row?.unlocked === true;
          },
          releaseReservation: () => lockSession.release(),
        };
      },
      endClient: () => lockClient.end(),
    },
    execute
  );
};

export const createLegacyInstallLedger = (): FullSiteInstallLedgerPort => ({
  withPackageLock: withFullSiteInstallLocks,
  async createRun(input) {
    return createInstallRun({
      kitId: input.packageKey,
      mode: input.dryRun ? "dry_run" : "apply",
      actorId: input.actorId,
      options: input.options ?? {},
    });
  },
  async recordItem(input) {
    const operation =
      input.operation === "conflict"
        ? "noop"
        : (input.operation as SolutionKitInstallItemOperation);
    const now = new Date();
    const safeError = input.error
      ? toSafeFullSiteErrorCode(input.error, "solution_kit_operation_failed")
      : null;
    const rollbackActionWasSupplied = input.rollbackAction !== undefined;
    await db
      .insert(solutionKitInstallItems)
      .values({
        runId: input.runId,
        position: input.position,
        resourceType: input.kind as SolutionKitInstallResourceType,
        resourceKey: input.key,
        operation,
        status: input.status,
        beforeSnapshot: input.beforeSnapshot,
        afterSnapshot: input.afterSnapshot,
        rollbackAction: input.rollbackAction ?? null,
        error: safeError,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          solutionKitInstallItems.runId,
          solutionKitInstallItems.resourceType,
          solutionKitInstallItems.resourceKey,
        ],
        set: {
          position: input.position,
          operation,
          status: input.status,
          beforeSnapshot: input.beforeSnapshot,
          afterSnapshot: input.afterSnapshot,
          ...(rollbackActionWasSupplied ? { rollbackAction: input.rollbackAction ?? null } : {}),
          error: safeError,
          updatedAt: now,
        },
      });
  },
  async finalizeRun(input) {
    const items = await listSolutionKitInstallItems(input.runId);
    await finalizeInstallRun(input.runId, {
      status: input.status,
      summary: buildSummary(items),
      error: input.error
        ? toSafeFullSiteErrorCode(input.error, "solution_kit_install_failed")
        : null,
    });
  },
  async getRun(runId) {
    const run = await getSolutionKitInstallRun(runId);
    return run ? toFullSiteRun(run) : null;
  },
  async patchRunMetadata(input) {
    const safeError = input.error
      ? toSafeFullSiteErrorCode(input.error, "solution_kit_install_failed")
      : null;
    const updated = await db
      .update(solutionKitInstallRuns)
      .set({
        status: input.status,
        summary: input.summary,
        error: safeError,
        options: input.options,
        updatedAt: new Date(),
      })
      .where(eq(solutionKitInstallRuns.id, input.runId))
      .returning({ id: solutionKitInstallRuns.id });
    return updated.length > 0;
  },
  async findLatestSuccessfulApplyRun(packageKey) {
    const [row] = await db
      .select()
      .from(solutionKitInstallRuns)
      .where(
        and(
          eq(solutionKitInstallRuns.kitId, packageKey),
          eq(solutionKitInstallRuns.mode, "apply"),
          eq(solutionKitInstallRuns.status, "success")
        )
      )
      .orderBy(desc(solutionKitInstallRuns.createdAt), desc(solutionKitInstallRuns.id))
      .limit(1);
    return row ? toFullSiteRun(normalizeRunRow(row)) : null;
  },
  async listItems(runId) {
    const items = await listSolutionKitInstallItems(runId);
    return items
      .filter(
        (item) =>
          item.operation === "create" || item.operation === "update" || item.operation === "noop"
      )
      .map((item) => ({
        position: item.position,
        kind: item.resourceType as FullSiteInstallResourceKind,
        key: item.resourceKey,
        operation: item.operation as "create" | "update" | "noop",
        status: item.status,
        beforeSnapshot: item.beforeSnapshot as JsonObject | null,
        afterSnapshot: item.afterSnapshot as JsonObject | null,
        rollbackAction: item.rollbackAction as JsonObject | null,
        error: item.error,
      }));
  },
  async createRollbackRun(input) {
    return createInstallRun({
      kitId: input.packageKey,
      mode: "rollback",
      actorId: input.actorId,
      rollbackOfRunId: input.sourceRunId,
      options: input.options ?? {},
    });
  },
  async claimRollbackRun(input) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.sourceRunId}))`);
      const existing = await tx
        .select()
        .from(solutionKitInstallRuns)
        .where(
          and(
            eq(solutionKitInstallRuns.rollbackOfRunId, input.sourceRunId),
            eq(solutionKitInstallRuns.mode, "rollback")
          )
        )
        .orderBy(asc(solutionKitInstallRuns.createdAt), asc(solutionKitInstallRuns.id));
      const automatic = input.options?.automaticCompensation === true;
      const compatible = existing.filter(
        (run) => (asRecord(run.options).automaticCompensation === true) === automatic
      );
      const completed = compatible.find((run) => run.status === "success");
      if (completed) return { id: completed.id, state: "complete" as const };
      const active = compatible.find((run) => run.status === "running");
      if (active) {
        if (!input.resumeRunning) return { id: active.id, state: "busy" as const };
        const [claimed] = await tx
          .update(solutionKitInstallRuns)
          .set({
            actorId: input.actorId,
            error: null,
            finishedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(solutionKitInstallRuns.id, active.id))
          .returning({ id: solutionKitInstallRuns.id });
        if (!claimed) throw new Error("site_package_rollback_claim_failed");
        return { id: claimed.id, state: "resumed" as const };
      }
      const resumable = compatible.find((run) => run.status === "failed");
      if (resumable) {
        const [claimed] = await tx
          .update(solutionKitInstallRuns)
          .set({
            status: "running",
            actorId: input.actorId,
            error: null,
            finishedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(solutionKitInstallRuns.id, resumable.id))
          .returning({ id: solutionKitInstallRuns.id });
        if (!claimed) throw new Error("site_package_rollback_claim_failed");
        return { id: claimed.id, state: "resumed" as const };
      }
      if (input.resumeOnly) {
        throw new Error("site_package_compensation_not_recoverable");
      }
      const [created] = await tx
        .insert(solutionKitInstallRuns)
        .values({
          kitId: input.packageKey,
          mode: "rollback",
          status: "running",
          actorId: input.actorId,
          rollbackOfRunId: input.sourceRunId,
          options: input.options ?? { fullSitePackage: true },
          summary: {},
          error: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          finishedAt: null,
        })
        .returning({ id: solutionKitInstallRuns.id });
      if (!created) throw new Error("site_package_rollback_claim_failed");
      return { id: created.id, state: "created" as const };
    });
  },
  async findAutomaticCompensationRun(sourceRunId) {
    const rows = await db
      .select()
      .from(solutionKitInstallRuns)
      .where(
        and(
          eq(solutionKitInstallRuns.rollbackOfRunId, sourceRunId),
          eq(solutionKitInstallRuns.mode, "rollback")
        )
      )
      .orderBy(asc(solutionKitInstallRuns.createdAt), asc(solutionKitInstallRuns.id));
    const row = rows.find(
      (candidate) => asRecord(candidate.options).automaticCompensation === true
    );
    return row ? toFullSiteRun(normalizeRunRow(row)) : null;
  },
  async hasSuccessfulRollback(sourceRunId) {
    const rows = await db
      .select({ id: solutionKitInstallRuns.id })
      .from(solutionKitInstallRuns)
      .where(
        and(
          eq(solutionKitInstallRuns.rollbackOfRunId, sourceRunId),
          eq(solutionKitInstallRuns.mode, "rollback"),
          eq(solutionKitInstallRuns.status, "success")
        )
      )
      .limit(1);
    return rows.length > 0;
  },
  findManagedResourceEvidence,
});

export const defaultLegacyInstallLedger = createLegacyInstallLedger();

export type { FullSiteInstallLedgerPort, FullSiteInstallResourceKind };
