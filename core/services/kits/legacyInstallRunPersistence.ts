import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { solutionKitInstallItems, solutionKitInstallRuns } from "../../db/schema";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { logAudit } from "../audit/auditService";
import { getSolutionKitFromCatalog } from "./solutionKitsCatalog";
import type { SolutionKitDefinition, SolutionKitId } from "./solutionKitTypes";
import { asRecord, planOperations } from "./legacyInstallPlanning";
import type {
  ApplySolutionKitInstallInput,
  JsonRecord,
  QueryExecutor,
  RollbackSolutionKitInstallInput,
  SolutionKitInstallItemOperation,
  SolutionKitInstallItemStatus,
  SolutionKitInstallMode,
  SolutionKitInstallResourceType,
  SolutionKitInstallResult,
  SolutionKitInstallRunRecord,
  SolutionKitInstallStatus,
} from "./legacyInstallPlanning";
import { executeInstallOperation } from "./legacyInstallResourceHandlers";
import { executeRollbackForItem } from "./legacyInstallRollback";
import type { FullSiteInstallLedgerPort, FullSiteInstallResourceKind } from "./fullSiteInstallTypes";
import { toSafeFullSiteErrorCode } from "./fullSiteInstallTypes";
import type { JsonObject } from "./fullSitePackage/types";
import {
  createOwnedRunFinalization,
  finalizeInstallRun,
} from "./legacyInstallRunPersistence/dryRunTerminalization";
import {
  buildSummary,
  createLegacyInstallReadPersistence,
  listSolutionKitInstallItems,
  normalizeItemRow,
  normalizeRunRow,
} from "./legacyInstallRunPersistence/readPersistence";
import { createRunInitialization } from "./legacyInstallRunPersistence/runInitialization";
import { withFullSiteInstallLocks } from "./legacyInstallRunLocks";
export {
  buildManagedResourceEvidenceBatchQuery,
  buildManagedResourceEvidenceQuery,
  buildSummary,
  findManagedResourceEvidence,
  findManagedResourceEvidenceBatch,
  listSolutionKitInstallItems,
  MANAGED_EVIDENCE_LATERAL_REQUEST_LIMIT,
  normalizeItemRow,
  normalizeRunRow,
} from "./legacyInstallRunPersistence/readPersistence";
export { finalizeInstallRun } from "./legacyInstallRunPersistence/dryRunTerminalization";
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

const toFullSiteRun = (run: SolutionKitInstallRunRecord) => ({
  id: run.id,
  packageKey: run.kitId,
  mode: run.mode,
  status: run.status,
  rollbackOfRunId: run.rollbackOfRunId,
  options: run.options as JsonObject,
});

export type FullSiteInstallTransactionLockRuntime = {
  runTransaction<T>(execute: (lock: FullSiteInstallTransactionLock) => Promise<T>): Promise<T>;
  endClient(): Promise<void>;
};

export type FullSiteInstallTransactionLock = {
  acquireGlobal(): Promise<void>;
  acquirePackage(): Promise<void>;
};

/**
 * Holds transaction-scoped locks around work performed through the application's
 * regular pool. The lock transaction owns no product writes; keeping it open is
 * enough to pin one PgBouncer backend until the complete package lifecycle ends.
 */
export const runFullSiteInstallTransactionLockLifecycle = async <T>(
  runtime: FullSiteInstallTransactionLockRuntime,
  execute: () => Promise<T>
): Promise<T> => {
  let outcome: { ok: true; value: T } | { ok: false; error: unknown };
  try {
    outcome = {
      ok: true,
      value: await runtime.runTransaction(async (lock) => {
        await lock.acquireGlobal();
        await lock.acquirePackage();
        return execute();
      }),
    };
  } catch (error) {
    outcome = { ok: false, error };
  }

  let cleanupError: unknown;
  try {
    await runtime.endClient();
  } catch (error) {
    cleanupError = error;
  }
  if (!outcome.ok) throw outcome.error;
  if (cleanupError) throw cleanupError;
  return outcome.value;
};

export { withFullSiteInstallLocks } from "./legacyInstallRunLocks"; // backward-compatible re-export
export const createLegacyInstallLedger = (): FullSiteInstallLedgerPort => ({
  ...createLegacyInstallReadPersistence(),
  ...createRunInitialization(),
  ...createOwnedRunFinalization(),
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
    await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        await tx
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
              ...(rollbackActionWasSupplied
                ? { rollbackAction: input.rollbackAction ?? null }
                : {}),
              error: safeError,
              updatedAt: now,
            },
          });
      },
      { isolationLevel: "read committed" }
    );
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
});

export const defaultLegacyInstallLedger = createLegacyInstallLedger();

export type { FullSiteInstallLedgerPort, FullSiteInstallResourceKind };
