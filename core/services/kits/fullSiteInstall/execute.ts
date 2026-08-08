import { db } from "../../../db/client";
import { acquireNativeCmsWriterFence } from "../../../db/nativeCmsWriterFence";
import { planFullSiteInstall } from "../fullSiteInstallPlanner";
import type {
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerPort,
  FullSiteOwnedRunFinalizationInput,
  FullSiteOwnedRunFinalizationResult,
  FullSitePlanningSnapshotLoader,
} from "../fullSiteInstallTypes";
import { toSafeFullSiteErrorCode } from "../fullSiteInstallTypes";
import { buildReferencePlan, type PlannedPackageResource } from "../fullSitePackage/referenceGraph";
import type { FullSitePackageV1, JsonObject } from "../fullSitePackage/types";
import {
  defaultLegacyInstallLedger,
  findManagedResourceEvidenceBatch,
} from "../legacyInstallRunPersistence";
import {
  FULL_SITE_ROLLBACK_ADAPTERS,
  FULL_SITE_RESOURCE_ADAPTERS,
  type AdapterApplyInput,
  type FullSiteRollbackAdapters,
  type FullSiteResourceAdapterRegistry,
} from "./adapters";
import { compensateItems } from "./compensation";
import { createFullSiteCurrentResourceResolver } from "./currentResourceResolver";
import { executePreparedPlanWithDomainAtomicAdapters } from "./executePreparedSaga";
import { readFullSitePlanningResourcesBatch } from "./planningResourceBatchReader";
import { createFullSitePlanningSnapshotLoader } from "./planningSnapshot";
import {
  prepareFullSiteSaga,
  toInitializedLedgerItem,
  type PreparedFullSiteSaga,
} from "./preparedSaga";
import { fullSitePackageFingerprint, readFullSiteDurableAfterSnapshotV1 } from "./staging";

export type ApplyFullSitePackageInput = Readonly<{
  package: FullSitePackageV1;
  actorId: string;
  dryRun?: boolean;
  allowSettingTakeover?: boolean;
}>;

export type FullSiteInstallExecutorDeps = Readonly<{
  ledger?: FullSiteInstallLedgerPort;
  loadPlanningSnapshot?: FullSitePlanningSnapshotLoader;
  resolveCurrentResource?: FullSiteCurrentResourceResolver;
  adapters?: FullSiteResourceAdapterRegistry;
  rollbackAdapters?: FullSiteRollbackAdapters;
  generateId?: () => string;
}>;

export type AppliedFullSiteResource = Readonly<{
  identity: string;
  id: string;
  operation: "create" | "update" | "noop";
}>;

export type ApplyFullSitePackageResult = Readonly<{
  runId: string;
  resources: readonly AppliedFullSiteResource[];
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const assertActorUuid = (actorId: string): void => {
  if (!UUID_PATTERN.test(actorId)) throw new Error("site_package_actor_invalid");
};

const isDirectPlainObject = (value: unknown): value is Record<PropertyKey, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

export const assertExactOwnedRunFinalizationResult = (
  value: unknown
): FullSiteOwnedRunFinalizationResult => {
  if (!isDirectPlainObject(value)) throw new Error("native_cms_writer_fence_failed");
  const keys = Reflect.ownKeys(value);
  const outcome = Reflect.get(value, "outcome");
  if (
    keys.length !== 1 ||
    keys[0] !== "outcome" ||
    (outcome !== "desired_terminal" && outcome !== "different_terminal")
  ) {
    throw new Error("native_cms_writer_fence_failed");
  }
  return { outcome };
};

export const requireDesiredOwnedRunFinalization = async (
  ledger: Pick<FullSiteInstallLedgerPort, "finalizeOwnedRun">,
  input: FullSiteOwnedRunFinalizationInput
): Promise<void> => {
  const result = assertExactOwnedRunFinalizationResult(await ledger.finalizeOwnedRun(input));
  if (result.outcome !== "desired_terminal") {
    throw new Error("site_package_recovery_conflict");
  }
};

const reservationOptions = (input: ApplyFullSitePackageInput): JsonObject => ({
  fullSitePackage: true,
  packageFingerprint: fullSitePackageFingerprint(input.package),
  allowSettingTakeover: input.allowSettingTakeover === true,
  rollbackDependencySchemaVersion: 1,
});

const assertAtomicRegistry = (
  adapters: FullSiteResourceAdapterRegistry
): FullSiteResourceAdapterRegistry => {
  for (const adapter of Object.values(adapters)) {
    if (
      typeof adapter?.validateDesired !== "function" ||
      typeof adapter?.prepareNativeTargets !== "function" ||
      typeof adapter?.captureSnapshotById !== "function" ||
      typeof adapter?.deleteSnapshotAtomic !== "function" ||
      typeof adapter?.restoreSnapshotAtomic !== "function"
    ) {
      throw new Error("site_package_invalid");
    }
  }
  if (
    typeof adapters.setting.applySettingsBatchAtomic !== "function" ||
    typeof adapters.setting.reverseSettingsBatch !== "function"
  ) {
    throw new Error("site_package_invalid");
  }
  return adapters;
};

const createDefaultPlanningSnapshotLoader = (packageKey: string): FullSitePlanningSnapshotLoader =>
  createFullSitePlanningSnapshotLoader({
    packageKey,
    withReadTransaction: (read) =>
      db.transaction(
        async (tx) => {
          await acquireNativeCmsWriterFence(tx);
          return read({
            findEvidence: (input) => findManagedResourceEvidenceBatch(tx, input),
            readNative: (input) => readFullSitePlanningResourcesBatch(tx, input),
          });
        },
        { isolationLevel: "read committed" }
      ),
  });

const createPlanningNormalizer =
  (actorId: string, adapters: FullSiteResourceAdapterRegistry) =>
  async (
    input: Readonly<{
      kind: keyof FullSiteResourceAdapterRegistry;
      key: string;
      currentId: string;
      desired: JsonObject;
    }>
  ): Promise<JsonObject> => {
    const adapterInput: AdapterApplyInput = {
      operation: "update",
      currentId: input.currentId,
      key: input.key,
      desired: input.desired,
      actorId,
    };
    const normalized = await adapters[input.kind].validateDesired(adapterInput);
    return normalized ?? input.desired;
  };

const sagaResources = (saga: PreparedFullSiteSaga): readonly AppliedFullSiteResource[] =>
  saga.prepared.map((item) => ({
    identity: item.operation.identity,
    id: item.intendedId,
    operation: item.operation.operation,
  }));

const initializedResources = async (
  ledger: FullSiteInstallLedgerPort,
  ownerRunId: string
): Promise<readonly AppliedFullSiteResource[]> => {
  const items = await ledger.listItems(ownerRunId);
  return items.map((item) => {
    const durable = readFullSiteDurableAfterSnapshotV1(item.afterSnapshot);
    if (
      !durable ||
      (item.operation !== "create" && item.operation !== "update" && item.operation !== "noop")
    ) {
      throw new Error("site_package_recovery_invalid_source");
    }
    return {
      identity: `${item.kind}:${item.key}`,
      id: durable.id,
      operation: item.operation,
    };
  });
};

const mayFinalizePreNativeFailure = (code: string): boolean =>
  code === "site_package_ledger_initialization_failed" ||
  (!code.startsWith("native_cms_writer_") && code !== "site_package_recovery_requires_rollback");

const finalizeFailedOwnerPreservingPrimary = async (
  ledger: FullSiteInstallLedgerPort,
  ownerRunId: string,
  code: string
): Promise<void> => {
  try {
    await requireDesiredOwnedRunFinalization(ledger, {
      ownerRunId,
      status: "failed",
      error: code,
    });
  } catch {
    // The original deterministic failure remains authoritative.
  }
};

const compensateInitializedFullSiteOwner = async (
  input: Readonly<{
    ownerRunId: string;
    packageKey: string;
    actorId: string;
    safeApplyError: string;
    ledger: FullSiteInstallLedgerPort;
    adapters: FullSiteRollbackAdapters;
    resolveCurrentResource: FullSiteCurrentResourceResolver;
  }>
): Promise<void> => {
  if (!input.ledger.claimRollbackRun) {
    throw new Error("site_package_rollback_claim_failed");
  }
  const claim = await input.ledger.claimRollbackRun({
    sourceRunId: input.ownerRunId,
    packageKey: input.packageKey,
    actorId: input.actorId,
    options: { automaticCompensation: true, fullSitePackage: true },
    resumeRunning: true,
  });
  if (claim.state === "busy") throw new Error("site_package_rollback_in_progress");
  const currentSource = await input.ledger.getRun(input.ownerRunId);
  if (
    !currentSource ||
    currentSource.id !== input.ownerRunId ||
    currentSource.packageKey !== input.packageKey ||
    currentSource.mode !== "apply" ||
    currentSource.status !== "running"
  ) {
    throw new Error("site_package_recovery_invalid_source");
  }
  await compensateItems({
    items: await input.ledger.listRawItems(currentSource.id),
    priorOutcomes: await input.ledger.listRawItems(claim.id),
    currentSource,
    actorId: input.actorId,
    adapters: input.adapters,
    ledger: input.ledger,
    rollbackRunId: claim.id,
    resolveCurrentResource: input.resolveCurrentResource,
  });
  await requireDesiredOwnedRunFinalization(input.ledger, {
    ownerRunId: currentSource.id,
    status: "failed",
    error: input.safeApplyError,
    automaticCompensation: {
      runId: claim.id,
      status: "success",
      error: null,
    },
  });
};

const planAndPrepare = async (
  input: Readonly<{
    request: ApplyFullSitePackageInput;
    referencePlan: readonly PlannedPackageResource[];
    adapters: FullSiteResourceAdapterRegistry;
    ledger: FullSiteInstallLedgerPort;
    overrides: FullSiteInstallExecutorDeps;
  }>
): Promise<PreparedFullSiteSaga> => {
  const loadPlanningSnapshot =
    input.overrides.loadPlanningSnapshot ??
    createDefaultPlanningSnapshotLoader(input.request.package.key);
  const plan = await planFullSiteInstall(input.request.package, input.referencePlan, {
    loadPlanningSnapshot,
    normalizeDesired: createPlanningNormalizer(input.request.actorId, input.adapters),
    allowSettingTakeover: input.request.allowSettingTakeover,
  });
  return prepareFullSiteSaga({
    plan,
    referencePlan: input.referencePlan,
    adapters: input.adapters,
    actorId: input.request.actorId,
    generateId: input.overrides.generateId,
  });
};

export const applyFullSitePackage = async (
  input: ApplyFullSitePackageInput,
  overrides: FullSiteInstallExecutorDeps = {}
): Promise<ApplyFullSitePackageResult> => {
  assertActorUuid(input.actorId);
  const referencePlan = buildReferencePlan(input.package);
  const options = reservationOptions(input);
  const ledger = overrides.ledger ?? defaultLegacyInstallLedger;
  const dryRun = input.dryRun === true;

  return ledger.withPackageLock(
    {
      intent: "apply",
      packageKey: input.package.key,
      actorId: input.actorId,
      dryRun,
      options,
    },
    async (context) => {
      if (context.intent !== "apply") throw new Error("site_package_invalid");
      const adapters = assertAtomicRegistry(overrides.adapters ?? FULL_SITE_RESOURCE_ADAPTERS);
      const rollbackAdapters = overrides.rollbackAdapters ?? FULL_SITE_ROLLBACK_ADAPTERS;
      const resolveCurrentResource =
        overrides.resolveCurrentResource ??
        createFullSiteCurrentResourceResolver(input.package.key, ledger);

      if (context.resumePhase === "initialized") {
        if (dryRun) {
          const resources = await initializedResources(ledger, context.ownerRunId);
          await requireDesiredOwnedRunFinalization(ledger, {
            ownerRunId: context.ownerRunId,
            status: "success",
            error: null,
          });
          return { runId: context.ownerRunId, resources };
        }
        await compensateInitializedFullSiteOwner({
          ownerRunId: context.ownerRunId,
          packageKey: input.package.key,
          actorId: input.actorId,
          safeApplyError: "site_package_apply_interrupted",
          ledger,
          adapters: rollbackAdapters,
          resolveCurrentResource,
        });
        throw new Error("site_package_apply_interrupted");
      }

      let saga: PreparedFullSiteSaga;
      try {
        saga = await planAndPrepare({
          request: input,
          referencePlan,
          adapters,
          ledger,
          overrides,
        });
        await ledger.initializeReservedRun({
          ownerRunId: context.ownerRunId,
          packageKey: input.package.key,
          actorId: input.actorId,
          dryRun,
          options,
          items: saga.prepared.map(toInitializedLedgerItem),
        });
      } catch (primary) {
        const code = toSafeFullSiteErrorCode(primary);
        if (mayFinalizePreNativeFailure(code)) {
          await finalizeFailedOwnerPreservingPrimary(ledger, context.ownerRunId, code);
        }
        throw primary;
      }

      const resources = sagaResources(saga);
      if (dryRun) {
        await requireDesiredOwnedRunFinalization(ledger, {
          ownerRunId: context.ownerRunId,
          status: "success",
          error: null,
        });
        return { runId: context.ownerRunId, resources };
      }

      try {
        await executePreparedPlanWithDomainAtomicAdapters({
          saga,
          actorId: input.actorId,
          ownerRunId: context.ownerRunId,
          adapters,
          ledger,
        });
      } catch (primary) {
        await compensateInitializedFullSiteOwner({
          ownerRunId: context.ownerRunId,
          packageKey: input.package.key,
          actorId: input.actorId,
          safeApplyError: toSafeFullSiteErrorCode(primary),
          ledger,
          adapters: rollbackAdapters,
          resolveCurrentResource,
        });
        throw primary;
      }

      await requireDesiredOwnedRunFinalization(ledger, {
        ownerRunId: context.ownerRunId,
        status: "success",
        error: null,
      });
      return { runId: context.ownerRunId, resources };
    }
  );
};
