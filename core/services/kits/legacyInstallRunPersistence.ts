import { and, asc, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { db } from "../../db/client";
import { solutionKitInstallItems, solutionKitInstallRuns } from "../../db/schema";
import {
  acquireNativeCmsWriterFence,
  assertNativeCmsWriterOwnerContextAbsent,
  createNativeCmsWriterOwnerLease,
  markNativeCmsWriterOwnerLost,
  revokeNativeCmsWriterOwnerLease,
  runWithNativeCmsWriterOwnerContext,
  NATIVE_CMS_WRITER_FENCE_KEY,
  NATIVE_CMS_WRITER_FENCE_NAMESPACE,
  NATIVE_CMS_WRITER_FENCE_OPTION_KEY,
  type NativeCmsWriterOwnerLease,
} from "../../db/nativeCmsWriterFence";
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
import type {
  FullSiteInstallLockContext,
  FullSiteInstallLockReservation,
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
} from "./fullSiteInstallTypes";
import { readStrictInitializationPlanV1, toSafeFullSiteErrorCode } from "./fullSiteInstallTypes";
import { createDiagnosticCollector, readPackageKey } from "./fullSitePackage/schema";
import { PACKAGE_LIMITS, type JsonObject, type JsonValue } from "./fullSitePackage/types";
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

const FULL_SITE_PACKAGE_LOCK_NAMESPACE = 547;

const requireCanonicalPackageKey = (value: string): string => {
  const diagnostics = createDiagnosticCollector();
  const packageKey = readPackageKey(value, "$.key", diagnostics);
  const batch = diagnostics.read();
  if (batch.overflowed || batch.diagnostics.length > 0) {
    throw new Error("site_package_invalid");
  }
  if (packageKey !== value) throw new Error("site_package_invalid");
  return packageKey;
};

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reservationAuthorities = new WeakSet<object>();

const canonicalJson = (value: JsonValue): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const cloneReservationJson = (value: unknown, seen = new Set<object>()): JsonValue => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
  if (!value || typeof value !== "object" || seen.has(value))
    throw new Error("site_package_invalid");
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      const output = value.map((item, index) => {
        if (!Object.prototype.hasOwnProperty.call(value, index))
          throw new Error("site_package_invalid");
        return cloneReservationJson(item, seen);
      });
      return output;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string")) {
      throw new Error("site_package_invalid");
    }
    const output: JsonObject = {};
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (
        !("value" in descriptor) ||
        descriptor.enumerable !== true ||
        key === NATIVE_CMS_WRITER_FENCE_OPTION_KEY
      )
        throw new Error("site_package_invalid");
      output[key] = cloneReservationJson(descriptor.value, seen);
    }
    return output;
  } finally {
    seen.delete(value);
  }
};

const readLockReservation = (
  value: FullSiteInstallLockReservation
): FullSiteInstallLockReservation => {
  try {
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
    const expected =
      value.intent === "apply"
        ? ["intent", "packageKey", "actorId", "dryRun", "options"]
        : ["intent", "packageKey", "actorId", "sourceRunId", "options"];
    if (
      Object.keys(value).length !== expected.length ||
      Object.keys(value).some((key) => !expected.includes(key))
    )
      throw new Error();
    const packageKey = requireCanonicalPackageKey(value.packageKey);
    if (!UUID_PATTERN.test(value.actorId)) throw new Error();
    const options = cloneReservationJson(value.options);
    if (!options || Array.isArray(options) || typeof options !== "object") throw new Error();
    if (value.intent === "apply") {
      if (typeof value.dryRun !== "boolean") throw new Error();
      return Object.freeze({ ...value, packageKey, options });
    }
    if (value.intent !== "explicit_rollback" || !UUID_PATTERN.test(value.sourceRunId))
      throw new Error();
    return Object.freeze({ ...value, packageKey, options });
  } catch {
    throw new Error("site_package_invalid");
  }
};

const mintReservationAuthority = (): object => {
  const authority = Object.freeze({});
  reservationAuthorities.add(authority);
  return authority;
};

const publicRequestOptions = (value: unknown): JsonObject => {
  const options =
    value && !Array.isArray(value) && typeof value === "object"
      ? { ...(value as Record<string, JsonValue>) }
      : {};
  delete options[NATIVE_CMS_WRITER_FENCE_OPTION_KEY];
  delete options.initializationPlanV1;
  return options;
};

const OWNER_RESERVATION_SELECTION = {
  id: solutionKitInstallRuns.id,
  kitId: solutionKitInstallRuns.kitId,
  mode: solutionKitInstallRuns.mode,
  status: solutionKitInstallRuns.status,
  actorId: solutionKitInstallRuns.actorId,
  rollbackOfRunId: solutionKitInstallRuns.rollbackOfRunId,
  options: solutionKitInstallRuns.options,
} as const;

type ReservedOwnerRow = Pick<
  typeof solutionKitInstallRuns.$inferSelect,
  "id" | "kitId" | "mode" | "status" | "actorId" | "rollbackOfRunId" | "options"
>;

const deriveResumePhase = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  owner: ReservedOwnerRow
): Promise<"reserved" | "initialized"> => {
  const items = await tx
    .select()
    .from(solutionKitInstallItems)
    .where(eq(solutionKitInstallItems.runId, owner.id))
    .orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.id))
    .limit(PACKAGE_LIMITS.resourcesTotal + 1);
  if (items.length > PACKAGE_LIMITS.resourcesTotal)
    throw new Error("native_cms_writer_recovery_required");
  const rawPlan = (owner.options as Record<string, unknown>).initializationPlanV1;
  if (rawPlan === undefined && items.length === 0) return "reserved";
  let plan;
  try {
    plan = readStrictInitializationPlanV1(rawPlan);
  } catch {
    throw new Error("native_cms_writer_recovery_required");
  }
  if (
    plan.length !== items.length ||
    items.some((item, index) => {
      const expected = plan[index];
      return (
        item.position !== expected.position ||
        item.resourceType !== expected.kind ||
        item.resourceKey !== expected.key ||
        item.operation !== expected.operation
      );
    })
  )
    throw new Error("native_cms_writer_recovery_required");
  return "initialized";
};

const reserveOrTakeOverActualOwner = async (
  input: FullSiteInstallLockReservation,
  authority: object
): Promise<
  Readonly<{
    lease: NativeCmsWriterOwnerLease;
    context: FullSiteInstallLockContext;
  }>
> => {
  if (!reservationAuthorities.delete(authority)) throw new Error("native_cms_writer_fence_failed");
  return db.transaction(
    async (tx) => {
      const candidates = await tx
        .select(OWNER_RESERVATION_SELECTION)
        .from(solutionKitInstallRuns)
        .where(sql`${solutionKitInstallRuns.options} ? ${NATIVE_CMS_WRITER_FENCE_OPTION_KEY}`)
        .orderBy(asc(solutionKitInstallRuns.createdAt), asc(solutionKitInstallRuns.id))
        .limit(2)
        .for("update");
      if (candidates.length > 1) throw new Error("native_cms_writer_recovery_required");
      const generation = randomUUID();
      let owner: ReservedOwnerRow | undefined = candidates[0];
      let interruptedApplySource: ReservedOwnerRow | undefined;
      if (owner) {
        if (
          input.intent === "explicit_rollback" &&
          owner.id === input.sourceRunId &&
          owner.kitId === input.packageKey &&
          owner.mode === "apply" &&
          owner.status === "running" &&
          owner.rollbackOfRunId === null &&
          typeof owner.actorId === "string" &&
          UUID_PATTERN.test(owner.actorId)
        ) {
          interruptedApplySource = owner;
          owner = undefined;
        } else {
          const expectedMode =
            input.intent === "apply" ? (input.dryRun ? "dry_run" : "apply") : "rollback";
          if (
            owner.kitId !== input.packageKey ||
            owner.mode !== expectedMode ||
            owner.status !== "running" ||
            owner.actorId !== input.actorId ||
            (input.intent === "explicit_rollback" && owner.rollbackOfRunId !== input.sourceRunId) ||
            canonicalJson(publicRequestOptions(owner.options)) !== canonicalJson(input.options)
          ) {
            throw new Error("site_package_recovery_conflict");
          }
          const resumePhase = input.intent === "apply" ? await deriveResumePhase(tx, owner) : null;
          const [updated] = await tx
            .update(solutionKitInstallRuns)
            .set({
              options: {
                ...(owner.options as JsonObject),
                [NATIVE_CMS_WRITER_FENCE_OPTION_KEY]: { schemaVersion: 1, generation },
              },
              updatedAt: new Date(),
            })
            .where(eq(solutionKitInstallRuns.id, owner.id))
            .returning(OWNER_RESERVATION_SELECTION);
          if (!updated) throw new Error("native_cms_writer_fence_failed");
          owner = updated;
          const lease = createNativeCmsWriterOwnerLease(owner.id, generation);
          return Object.freeze({
            lease,
            context:
              input.intent === "apply"
                ? Object.freeze({
                    intent: "apply" as const,
                    ownerRunId: owner.id,
                    resumePhase: resumePhase!,
                  })
                : Object.freeze({ intent: "explicit_rollback" as const, ownerRunId: owner.id }),
          });
        }
      }

      if (input.intent === "explicit_rollback") {
        const [source] = await tx
          .select(OWNER_RESERVATION_SELECTION)
          .from(solutionKitInstallRuns)
          .where(eq(solutionKitInstallRuns.id, input.sourceRunId))
          .limit(1)
          .for("update");
        if (
          !source ||
          source.kitId !== input.packageKey ||
          source.mode !== "apply" ||
          !["running", "success", "failed"].includes(source.status)
        ) {
          throw new Error("site_package_rollback_invalid_source");
        }
        const existing = await tx
          .select(OWNER_RESERVATION_SELECTION)
          .from(solutionKitInstallRuns)
          .where(
            and(
              eq(solutionKitInstallRuns.rollbackOfRunId, source.id),
              eq(solutionKitInstallRuns.mode, "rollback")
            )
          )
          .orderBy(asc(solutionKitInstallRuns.createdAt), asc(solutionKitInstallRuns.id));
        if (existing.some((run) => run.status === "success")) {
          throw new Error("site_package_already_rolled_back");
        }
        owner = existing.find((run) => run.status === "running" || run.status === "failed");
        if (
          owner &&
          (owner.actorId !== input.actorId ||
            canonicalJson(publicRequestOptions(owner.options)) !== canonicalJson(input.options))
        ) {
          throw new Error("site_package_recovery_conflict");
        }
        if (interruptedApplySource) {
          if (source.id !== interruptedApplySource.id) {
            throw new Error("native_cms_writer_recovery_required");
          }
          const sourceOptions = { ...(source.options as JsonObject) };
          delete sourceOptions[NATIVE_CMS_WRITER_FENCE_OPTION_KEY];
          const [unmarked] = await tx
            .update(solutionKitInstallRuns)
            .set({
              options: sourceOptions,
              updatedAt: new Date(),
            })
            .where(eq(solutionKitInstallRuns.id, source.id))
            .returning({ id: solutionKitInstallRuns.id });
          if (!unmarked) throw new Error("native_cms_writer_fence_failed");
        }
      }
      const ownerId = owner?.id ?? randomUUID();
      const options = {
        ...(owner ? (owner.options as JsonObject) : input.options),
        [NATIVE_CMS_WRITER_FENCE_OPTION_KEY]: { schemaVersion: 1, generation },
      };
      if (owner) {
        const [updated] = await tx
          .update(solutionKitInstallRuns)
          .set({
            status: "running",
            error: null,
            finishedAt: null,
            options,
            updatedAt: new Date(),
          })
          .where(eq(solutionKitInstallRuns.id, owner.id))
          .returning(OWNER_RESERVATION_SELECTION);
        if (!updated) throw new Error("native_cms_writer_fence_failed");
        owner = updated;
      } else {
        const [created] = await tx
          .insert(solutionKitInstallRuns)
          .values({
            id: ownerId,
            kitId: input.packageKey,
            mode: input.intent === "apply" ? (input.dryRun ? "dry_run" : "apply") : "rollback",
            status: "running",
            actorId: input.actorId,
            rollbackOfRunId: input.intent === "explicit_rollback" ? input.sourceRunId : null,
            options,
            summary: {},
            error: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            finishedAt: null,
          })
          .returning(OWNER_RESERVATION_SELECTION);
        if (!created) throw new Error("native_cms_writer_fence_failed");
        owner = created;
      }
      const lease = createNativeCmsWriterOwnerLease(owner.id, generation);
      return Object.freeze({
        lease,
        context:
          input.intent === "apply"
            ? Object.freeze({
                intent: "apply" as const,
                ownerRunId: owner.id,
                resumePhase: "reserved" as const,
              })
            : Object.freeze({ intent: "explicit_rollback" as const, ownerRunId: owner.id }),
      });
    },
    { isolationLevel: "read committed" }
  );
};

export const withFullSiteInstallLocks = async <T>(
  reservation: FullSiteInstallLockReservation,
  execute: (context: FullSiteInstallLockContext) => Promise<T>
): Promise<T> => {
  assertNativeCmsWriterOwnerContextAbsent();
  const input = readLockReservation(reservation);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  let lease: NativeCmsWriterOwnerLease | null = null;
  let callbackPromise: Promise<T> | null = null;
  let signalClosed: (() => void) | null = null;
  const closed = new Promise<never>((_resolve, reject) => {
    signalClosed = () => reject(new Error("native_cms_writer_fence_lost"));
  });
  const lockClient = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    onclose: () => {
      if (lease) markNativeCmsWriterOwnerLost(lease);
      signalClosed?.();
    },
  });
  let primary: Error | null = null;
  let result: Readonly<{ value: T }> | null = null;
  try {
    const holder = lockClient.begin(async (lockTransaction) => {
      await lockTransaction`select pg_advisory_xact_lock(${NATIVE_CMS_WRITER_FENCE_NAMESPACE}, ${NATIVE_CMS_WRITER_FENCE_KEY})`;
      await lockTransaction`select pg_advisory_xact_lock(${FULL_SITE_PACKAGE_LOCK_NAMESPACE}, hashtext(${input.packageKey}))`;
      const authority = mintReservationAuthority();
      const reserved = await reserveOrTakeOverActualOwner(input, authority);
      lease = reserved.lease;
      callbackPromise = runWithNativeCmsWriterOwnerContext(lease, () => execute(reserved.context));
      const value = await callbackPromise;
      revokeNativeCmsWriterOwnerLease(lease);
      return { value };
    });
    result = await Promise.race([holder, closed]);
  } catch (error) {
    primary =
      error instanceof Error
        ? new Error(error.message)
        : new Error("native_cms_writer_fence_failed");
  }
  if (callbackPromise) {
    try {
      await callbackPromise;
    } catch (error) {
      if (!primary) {
        primary =
          error instanceof Error
            ? new Error(error.message)
            : new Error("native_cms_writer_fence_failed");
      }
    }
  }
  try {
    await lockClient.end();
  } catch {
    if (!primary) primary = new Error("native_cms_writer_fence_failed");
  }
  if (primary) throw primary;
  if (!result) throw new Error("native_cms_writer_fence_failed");
  return result.value;
};

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
