import { asc, eq } from "drizzle-orm";

import { db } from "../../../db/client";
import {
  beginNativeCmsWriterOwnerClosing,
  lockNativeCmsWriterOwnerForTerminalRead,
  lockNativeCmsWriterOwnerForUpdate,
  NATIVE_CMS_WRITER_FENCE_OPTION_KEY,
  revokeNativeCmsWriterOwnerLease,
  type NativeCmsWriterOwnerLease,
} from "../../../db/nativeCmsWriterFence";
import { solutionKitInstallItems, solutionKitInstallRuns } from "../../../db/schema";
import type {
  FullSiteInstallLedgerPort,
  FullSiteOwnedRunFinalizationInput,
  FullSiteOwnedRunFinalizationResult,
} from "../fullSiteInstallTypes";
import { toSafeFullSiteErrorCode } from "../fullSiteInstallTypes";
import { PACKAGE_LIMITS, type JsonObject } from "../fullSitePackage/types";
import type { SolutionKitInstallStatus, SolutionKitInstallSummary } from "../legacyInstallPlanning";
import { buildSummary, normalizeItemRow, normalizeRunRow } from "./readPersistence";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROOT_KEYS = new Set([
  "ownerRunId",
  "status",
  "error",
  "automaticCompensation",
  "interruptedApplySource",
]);
const RELATED_KEYS = new Set(["runId", "status", "error"]);

const fail = (code = "site_package_invalid"): never => {
  throw new Error(code);
};

const dataRecord = (value: unknown): Record<string, unknown> => {
  if (!value || Array.isArray(value) || typeof value !== "object") fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string")) fail();
  for (const descriptor of Object.values(descriptors)) {
    if (!("value" in descriptor) || descriptor.enumerable !== true) fail();
  }
  return value as Record<string, unknown>;
};

const exactKeys = (record: Record<string, unknown>, allowed: ReadonlySet<string>): void => {
  if (Object.keys(record).some((key) => !allowed.has(key))) fail();
};

const readInput = (value: unknown): FullSiteOwnedRunFinalizationInput => {
  try {
    const input = dataRecord(value);
    exactKeys(input, ROOT_KEYS);
    const ownerRunId = Reflect.get(input, "ownerRunId");
    const status = Reflect.get(input, "status");
    const error = Reflect.get(input, "error");
    if (
      typeof ownerRunId !== "string" ||
      !UUID_PATTERN.test(ownerRunId) ||
      (status !== "success" && status !== "failed") ||
      (error !== null && typeof error !== "string")
    ) {
      fail();
    }
    const validatedOwnerRunId = ownerRunId as string;
    const validatedStatus = status as "success" | "failed";
    const validatedError = error as string | null;
    const automatic = Reflect.get(input, "automaticCompensation");
    const interrupted = Reflect.get(input, "interruptedApplySource");
    if (automatic != null && interrupted != null) fail();

    let automaticCompensation: FullSiteOwnedRunFinalizationInput["automaticCompensation"] = null;
    if (automatic != null) {
      const row = dataRecord(automatic);
      exactKeys(row, RELATED_KEYS);
      if (
        typeof row.runId !== "string" ||
        !UUID_PATTERN.test(row.runId) ||
        row.status !== "success" ||
        row.error !== null
      ) {
        fail();
      }
      const runId = row.runId as string;
      automaticCompensation = Object.freeze({
        runId,
        status: "success" as const,
        error: null,
      });
    }

    let interruptedApplySource: FullSiteOwnedRunFinalizationInput["interruptedApplySource"] = null;
    if (interrupted != null) {
      const row = dataRecord(interrupted);
      exactKeys(row, RELATED_KEYS);
      if (
        typeof row.runId !== "string" ||
        !UUID_PATTERN.test(row.runId) ||
        row.status !== "failed" ||
        row.error !== "site_package_apply_interrupted"
      ) {
        fail();
      }
      const runId = row.runId as string;
      interruptedApplySource = Object.freeze({
        runId,
        status: "failed" as const,
        error: "site_package_apply_interrupted" as const,
      });
    }

    return Object.freeze({
      ownerRunId: validatedOwnerRunId,
      status: validatedStatus,
      error: validatedError
        ? toSafeFullSiteErrorCode(validatedError, "solution_kit_install_failed")
        : null,
      automaticCompensation,
      interruptedApplySource,
    });
  } catch {
    return fail();
  }
};

const readOptions = (value: unknown): JsonObject => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("native_cms_writer_fence_failed");
  }
  return value as JsonObject;
};

const withoutFenceMarker = (value: unknown): JsonObject => {
  const options = { ...readOptions(value) };
  delete options[NATIVE_CMS_WRITER_FENCE_OPTION_KEY];
  return options;
};

const hasFenceMarker = (value: unknown): boolean =>
  Object.prototype.hasOwnProperty.call(readOptions(value), NATIVE_CMS_WRITER_FENCE_OPTION_KEY);

export const finalizeInstallRun = async (
  runId: string,
  input: Readonly<{
    status: SolutionKitInstallStatus;
    summary: SolutionKitInstallSummary;
    error?: string | null;
  }>
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

const summaryForRun = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  runId: string
) => {
  const rows = await tx
    .select()
    .from(solutionKitInstallItems)
    .where(eq(solutionKitInstallItems.runId, runId))
    .orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.id))
    .limit(PACKAGE_LIMITS.resourcesTotal + 1);
  if (rows.length > PACKAGE_LIMITS.resourcesTotal) {
    throw new Error("native_cms_writer_recovery_required");
  }
  return buildSummary(rows.map(normalizeItemRow));
};

const lockRelated = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  owner: typeof solutionKitInstallRuns.$inferSelect,
  input: FullSiteOwnedRunFinalizationInput
) => {
  if (input.automaticCompensation) {
    const [child] = await tx
      .select()
      .from(solutionKitInstallRuns)
      .where(eq(solutionKitInstallRuns.id, input.automaticCompensation.runId))
      .limit(1)
      .for("update");
    if (
      !child ||
      owner.mode !== "apply" ||
      child.mode !== "rollback" ||
      child.status !== "running" ||
      child.rollbackOfRunId !== owner.id ||
      hasFenceMarker(child.options)
    ) {
      throw new Error("site_package_recovery_conflict");
    }
    return Object.freeze({ kind: "automatic" as const, row: child });
  }
  if (input.interruptedApplySource) {
    const [source] = await tx
      .select()
      .from(solutionKitInstallRuns)
      .where(eq(solutionKitInstallRuns.id, input.interruptedApplySource.runId))
      .limit(1)
      .for("update");
    if (
      !source ||
      owner.mode !== "rollback" ||
      owner.rollbackOfRunId !== source.id ||
      source.mode !== "apply" ||
      source.status !== "running" ||
      hasFenceMarker(source.options)
    ) {
      throw new Error("site_package_recovery_conflict");
    }
    return Object.freeze({ kind: "interrupted" as const, row: source });
  }
  return null;
};

const writeRelatedTerminal = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  related: Awaited<ReturnType<typeof lockRelated>>
): Promise<void> => {
  if (!related) return;
  if (related.kind === "automatic") {
    await tx
      .update(solutionKitInstallRuns)
      .set({
        status: "success",
        error: null,
        summary: await summaryForRun(tx, related.row.id),
        updatedAt: new Date(),
        finishedAt: new Date(),
      })
      .where(eq(solutionKitInstallRuns.id, related.row.id));
    return;
  }
  await tx
    .update(solutionKitInstallRuns)
    .set({
      status: "failed",
      error: "site_package_apply_interrupted",
      summary: await summaryForRun(tx, related.row.id),
      updatedAt: new Date(),
      finishedAt: new Date(),
    })
    .where(eq(solutionKitInstallRuns.id, related.row.id));
};

const isTerminalRun = (run: typeof solutionKitInstallRuns.$inferSelect): boolean =>
  run.status !== "running" && !hasFenceMarker(run.options);

const isDesiredRelated = (
  run: typeof solutionKitInstallRuns.$inferSelect,
  input: FullSiteOwnedRunFinalizationInput
): boolean =>
  input.automaticCompensation
    ? run.id === input.automaticCompensation.runId && run.status === "success" && run.error === null
    : input.interruptedApplySource
      ? run.id === input.interruptedApplySource.runId &&
        run.status === "failed" &&
        run.error === "site_package_apply_interrupted"
      : true;

const validateRelatedShape = (
  owner: typeof solutionKitInstallRuns.$inferSelect,
  related: typeof solutionKitInstallRuns.$inferSelect | null,
  input: FullSiteOwnedRunFinalizationInput
): void => {
  if (!input.automaticCompensation && !input.interruptedApplySource) {
    if (related !== null) throw new Error("native_cms_writer_fence_failed");
    return;
  }
  if (!related) throw new Error("native_cms_writer_fence_failed");
  if (input.automaticCompensation) {
    if (
      owner.mode !== "apply" ||
      related.mode !== "rollback" ||
      related.rollbackOfRunId !== owner.id
    ) {
      throw new Error("native_cms_writer_fence_failed");
    }
  } else if (
    owner.mode !== "rollback" ||
    owner.rollbackOfRunId !== related.id ||
    related.mode !== "apply"
  ) {
    throw new Error("native_cms_writer_fence_failed");
  }
};

const rereadTerminal = async (
  database: Pick<typeof db, "transaction">,
  input: FullSiteOwnedRunFinalizationInput,
  lease: NativeCmsWriterOwnerLease
): Promise<FullSiteOwnedRunFinalizationResult> => {
  try {
    return await database.transaction(
      async (tx) => {
        const locked = await lockNativeCmsWriterOwnerForTerminalRead(tx, lease);
        if (locked.ownerRunId !== input.ownerRunId) {
          throw new Error("native_cms_writer_fence_failed");
        }
        const [owner] = await tx
          .select()
          .from(solutionKitInstallRuns)
          .where(eq(solutionKitInstallRuns.id, input.ownerRunId))
          .limit(1);
        if (!owner) throw new Error("native_cms_writer_fence_failed");
        const relatedId = input.automaticCompensation?.runId ?? input.interruptedApplySource?.runId;
        const [related] = relatedId
          ? await tx
              .select()
              .from(solutionKitInstallRuns)
              .where(eq(solutionKitInstallRuns.id, relatedId))
              .limit(1)
              .for("update")
          : [null];
        validateRelatedShape(owner, related ?? null, input);
        if (!isTerminalRun(owner) || (related && !isTerminalRun(related))) {
          throw new Error("native_cms_writer_fence_failed");
        }
        const desired =
          owner.status === input.status &&
          owner.error === input.error &&
          (!related || isDesiredRelated(related, input));
        return Object.freeze({
          outcome: desired ? ("desired_terminal" as const) : ("different_terminal" as const),
        });
      },
      { isolationLevel: "read committed" }
    );
  } catch {
    throw new Error("native_cms_writer_fence_failed");
  }
};

export const createOwnedRunFinalization = (
  database: Pick<typeof db, "transaction"> = db
): Pick<FullSiteInstallLedgerPort, "finalizeOwnedRun"> => ({
  async finalizeOwnedRun(value: unknown) {
    const input = readInput(value);
    const lease = beginNativeCmsWriterOwnerClosing();
    try {
      const result = await database.transaction(
        async (tx) => {
          const locked = await lockNativeCmsWriterOwnerForUpdate(tx, lease);
          if (locked.ownerRunId !== input.ownerRunId) {
            throw new Error("native_cms_writer_fence_lost");
          }
          const [owner] = await tx
            .select()
            .from(solutionKitInstallRuns)
            .where(eq(solutionKitInstallRuns.id, input.ownerRunId))
            .limit(1);
          if (!owner || owner.status !== "running") {
            throw new Error("native_cms_writer_fence_lost");
          }
          const related = await lockRelated(tx, owner, input);
          await writeRelatedTerminal(tx, related);
          await tx
            .update(solutionKitInstallRuns)
            .set({
              status: input.status,
              error: input.error,
              summary: await summaryForRun(tx, owner.id),
              options: withoutFenceMarker(owner.options),
              updatedAt: new Date(),
              finishedAt: new Date(),
            })
            .where(eq(solutionKitInstallRuns.id, owner.id));
          return Object.freeze({ outcome: "desired_terminal" as const });
        },
        { isolationLevel: "read committed" }
      );
      revokeNativeCmsWriterOwnerLease(lease);
      return result;
    } catch {
      const result = await rereadTerminal(database, input, lease);
      if (result.outcome === "desired_terminal") revokeNativeCmsWriterOwnerLease(lease);
      return result;
    }
  },
});
