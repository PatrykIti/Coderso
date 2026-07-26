import { planFullSiteInstall } from "../fullSiteInstallPlanner";
import type {
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerItem,
  FullSiteInstallLedgerPort,
  FullSiteInstallPlan,
  FullSiteInstallPlanItem,
  FullSiteInstallResourceKind,
} from "../fullSiteInstallTypes";
import type { FullSitePackageV1, JsonObject } from "../fullSitePackage/types";
import { defaultLegacyInstallLedger } from "../legacyInstallRunPersistence";
import {
  FULL_SITE_RESOURCE_ADAPTERS,
  isLifecycleCapablePublishKind,
  type AdapterApplyInput,
  type AdapterApplyResult,
  type ResourceAdapter,
} from "./adapters";
import {
  compensateItems,
  FULL_SITE_ROLLBACK_ADAPTERS,
  type FullSiteRollbackAdapters,
} from "./compensation";
import { createFullSiteCurrentResourceResolver } from "./currentResourceResolver";
import {
  assertInstalledSnapshotCurrent,
  assertPlanItemCurrent,
  preflightFullSitePlan,
  resolveFullSiteRefs,
  validateFullSiteOperation,
} from "./preflight";
import { fullSitePackageFingerprint, initializeFullSiteSaga, makeSagaSnapshot } from "./staging";
import { toSafeFullSiteErrorCode } from "../fullSiteInstallTypes";

export type ApplyFullSitePackageInput = {
  package: FullSitePackageV1;
  actorId: string;
  dryRun?: boolean;
  allowSettingTakeover?: boolean;
};

export type FullSiteInstallExecutorDeps = {
  ledger?: FullSiteInstallLedgerPort;
  resolveCurrentResource?: FullSiteCurrentResourceResolver;
  adapters?: Record<FullSiteInstallResourceKind, ResourceAdapter>;
  rollbackAdapters?: FullSiteRollbackAdapters;
};

export type AppliedFullSiteResource = {
  identity: string;
  id: string | null;
  operation: FullSiteInstallPlanItem["operation"];
};

export type ApplyFullSitePackageResult = {
  runId: string;
  resources: AppliedFullSiteResource[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const assertActorUuid = (actorId: string): void => {
  if (!UUID_PATTERN.test(actorId)) throw new Error("site_package_actor_invalid");
};

const stagedDesired = (operation: FullSiteInstallPlanItem, desired: JsonObject): JsonObject =>
  isLifecycleCapablePublishKind(operation.kind)
    ? ({ ...desired, status: "draft" } as JsonObject)
    : desired;

const beforeSnapshot = (operation: FullSiteInstallPlanItem): JsonObject | null =>
  operation.currentId && operation.currentDesired
    ? { id: operation.currentId, desired: operation.currentDesired }
    : null;

const toApplyInput = (
  operation: FullSiteInstallPlanItem,
  desired: JsonObject,
  actorId: string
): AdapterApplyInput => ({
  operation: operation.currentId ? "update" : "create",
  currentId: operation.currentId,
  key: operation.key,
  desired,
  actorId,
});

const applyOperation = async (
  operation: FullSiteInstallPlanItem,
  desired: JsonObject,
  actorId: string,
  adapter: ResourceAdapter
): Promise<AdapterApplyResult> => {
  const applyInput = toApplyInput(operation, desired, actorId);
  return isLifecycleCapablePublishKind(operation.kind)
    ? adapter.applyStaged(applyInput)
    : adapter.applyDesired(applyInput);
};

const recordPlanItem = async (input: {
  ledger: FullSiteInstallLedgerPort;
  runId: string;
  operation: FullSiteInstallPlanItem;
  status: "planned" | "success";
  afterSnapshot: JsonObject | null;
}) => {
  await input.ledger.recordItem({
    runId: input.runId,
    position: input.operation.position,
    kind: input.operation.kind,
    key: input.operation.key,
    operation: input.operation.operation,
    status: input.status,
    beforeSnapshot: beforeSnapshot(input.operation),
    afterSnapshot: input.afterSnapshot,
  });
};

const dryRunInstall = async (input: {
  plan: FullSiteInstallPlan;
  actorId: string;
  ledger: FullSiteInstallLedgerPort;
  runId: string;
  adapters: Record<FullSiteInstallResourceKind, ResourceAdapter>;
}): Promise<AppliedFullSiteResource[]> => {
  const ids = new Map<string, string>();
  input.plan.operations.forEach((operation, index) => {
    ids.set(
      operation.identity,
      operation.currentId ?? `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
    );
  });
  const resources: AppliedFullSiteResource[] = [];
  for (const operation of input.plan.operations) {
    const desired = resolveFullSiteRefs(operation.desired, ids) as JsonObject;
    const normalized = await validateFullSiteOperation({
      operation,
      plan: input.plan,
      desired,
      actorId: input.actorId,
      adapter: input.adapters[operation.kind],
    });
    await recordPlanItem({
      ledger: input.ledger,
      runId: input.runId,
      operation,
      status: "planned",
      afterSnapshot:
        operation.operation === "noop" && operation.currentId
          ? { id: operation.currentId, desired: normalized }
          : null,
    });
    resources.push({
      identity: operation.identity,
      id: operation.currentId,
      operation: operation.operation,
    });
  }
  return resources;
};

const mergeCompletedItems = (
  persisted: readonly FullSiteInstallLedgerItem[],
  memory: readonly FullSiteInstallLedgerItem[]
) => [
  ...new Map(
    [...persisted, ...memory].map((item) => [`${item.position}:${item.kind}:${item.key}`, item])
  ).values(),
];

const applyFullSitePackageUnlocked = async (
  input: ApplyFullSitePackageInput,
  overrides: FullSiteInstallExecutorDeps = {}
): Promise<ApplyFullSitePackageResult> => {
  assertActorUuid(input.actorId);
  const ledger = overrides.ledger ?? defaultLegacyInstallLedger;
  const resolveCurrentResource =
    overrides.resolveCurrentResource ??
    createFullSiteCurrentResourceResolver(input.package.key, ledger);
  const adapters = overrides.adapters ?? FULL_SITE_RESOURCE_ADAPTERS;
  const rollbackAdapters = overrides.rollbackAdapters ?? FULL_SITE_ROLLBACK_ADAPTERS;
  const plan = await planFullSiteInstall(input.package, {
    ledger,
    resolveCurrentResource,
    allowSettingTakeover: input.allowSettingTakeover,
    normalizeDesired: async ({ kind, key, currentId, desired }) =>
      (await adapters[kind].validateDesired({
        operation: "update",
        currentId,
        key,
        desired,
        actorId: input.actorId,
      })) ?? desired,
  });

  // Every owning native normalizer runs before the ledger or any domain row is
  // written. Actual IDs are validated again immediately before each mutation.
  await preflightFullSitePlan({ plan, actorId: input.actorId, adapters });

  const run = await ledger.createRun({
    packageKey: input.package.key,
    actorId: input.actorId,
    dryRun: Boolean(input.dryRun),
    options: {
      fullSitePackage: true,
      packageFingerprint: fullSitePackageFingerprint(input.package),
      allowSettingTakeover: input.allowSettingTakeover === true,
    },
  });
  if (input.dryRun) {
    try {
      const resources = await dryRunInstall({
        plan,
        actorId: input.actorId,
        ledger,
        runId: run.id,
        adapters,
      });
      await ledger.finalizeRun({ runId: run.id, status: "success" });
      return { runId: run.id, resources };
    } catch (error) {
      await ledger.finalizeRun({
        runId: run.id,
        status: "failed",
        error: error instanceof Error ? error.message : "site_package_apply_failed",
      });
      throw error;
    }
  }

  const installedIds = new Map<string, string>();
  const staged: Array<{
    operation: FullSiteInstallPlanItem;
    id: string;
    desired: JsonObject;
    completedItem: FullSiteInstallLedgerItem;
  }> = [];
  const resources: AppliedFullSiteResource[] = [];
  const completed: FullSiteInstallLedgerItem[] = [];

  try {
    await initializeFullSiteSaga({ ledger, runId: run.id, plan });
    for (const operation of plan.operations.filter((candidate) => candidate.kind !== "setting")) {
      const resolved = resolveFullSiteRefs(operation.desired, installedIds) as JsonObject;
      const desired = await validateFullSiteOperation({
        operation,
        plan,
        desired: resolved,
        actorId: input.actorId,
        adapter: adapters[operation.kind],
      });
      await assertPlanItemCurrent({
        operation,
        resolvedDesired: desired,
        resolveCurrentResource,
      });

      if (operation.operation === "noop") {
        if (!operation.currentId) throw new Error("site_package_invalid");
        installedIds.set(operation.identity, operation.currentId);
        resources.push({
          identity: operation.identity,
          id: operation.currentId,
          operation: "noop",
        });
        await recordPlanItem({
          ledger,
          runId: run.id,
          operation,
          status: "success",
          afterSnapshot: { id: operation.currentId, desired },
        });
        continue;
      }

      const preparedDesired = stagedDesired(operation, desired);
      await ledger.recordItem({
        runId: run.id,
        position: operation.position,
        kind: operation.kind,
        key: operation.key,
        operation: operation.operation,
        status: "planned",
        beforeSnapshot: beforeSnapshot(operation),
        afterSnapshot: makeSagaSnapshot({
          id: operation.currentId,
          desired: preparedDesired,
          phase: "prepared",
          intendedDesired: desired,
        }),
        error: null,
      });

      const result = await applyOperation(
        operation,
        desired,
        input.actorId,
        adapters[operation.kind]
      );
      installedIds.set(operation.identity, result.id);
      resources.push({
        identity: operation.identity,
        id: result.id,
        operation: operation.operation,
      });
      const completedItem: FullSiteInstallLedgerItem = {
        position: operation.position,
        kind: operation.kind,
        key: operation.key,
        operation: operation.operation,
        status: "success",
        beforeSnapshot: beforeSnapshot(operation),
        afterSnapshot: makeSagaSnapshot({
          id: result.id,
          desired: stagedDesired(operation, result.desired),
          phase: isLifecycleCapablePublishKind(operation.kind) ? "staged" : "complete",
          intendedDesired: result.desired,
        }),
      };
      if (isLifecycleCapablePublishKind(operation.kind)) {
        staged.push({
          operation,
          id: result.id,
          desired: result.desired,
          completedItem,
        });
      }
      // Memory evidence precedes persistence so a ledger-write failure still
      // compensates the native mutation.
      completed.push(completedItem);
      await ledger.recordItem({ runId: run.id, ...completedItem });
    }

    for (const item of staged) {
      if (item.operation.desired.status !== "published") continue;
      const stagedDesired = { ...item.desired, status: "draft" } as JsonObject;
      await assertInstalledSnapshotCurrent({
        operation: item.operation,
        id: item.id,
        desired: stagedDesired,
        resolveCurrentResource,
      });
      await adapters[item.operation.kind].publish(item.id, input.actorId);
      item.completedItem.afterSnapshot = makeSagaSnapshot({
        id: item.id,
        desired: item.desired,
        phase: "complete",
        intendedDesired: item.desired,
      });
      await ledger.recordItem({ runId: run.id, ...item.completedItem });
    }

    const settingOperations = plan.operations.filter((candidate) => candidate.kind === "setting");
    const settingInputs: Array<{
      operation: FullSiteInstallPlanItem;
      desired: JsonObject;
      input: AdapterApplyInput;
    }> = [];
    for (const operation of settingOperations) {
      const resolved = resolveFullSiteRefs(operation.desired, installedIds) as JsonObject;
      const desired = await validateFullSiteOperation({
        operation,
        plan,
        desired: resolved,
        actorId: input.actorId,
        adapter: adapters.setting,
      });
      await assertPlanItemCurrent({
        operation,
        resolvedDesired: desired,
        resolveCurrentResource,
      });
      settingInputs.push({
        operation,
        desired,
        input: toApplyInput(operation, desired, input.actorId),
      });
    }

    const settingMutations = settingInputs.filter(
      ({ operation }) => operation.operation !== "noop"
    );
    for (const entry of settingMutations) {
      await ledger.recordItem({
        runId: run.id,
        position: entry.operation.position,
        kind: "setting",
        key: entry.operation.key,
        operation: entry.operation.operation,
        status: "planned",
        beforeSnapshot: beforeSnapshot(entry.operation),
        afterSnapshot: makeSagaSnapshot({
          id: entry.operation.currentId ?? entry.operation.key,
          desired: entry.desired,
          phase: "prepared",
          intendedDesired: entry.desired,
        }),
        error: null,
      });
    }
    const settingResults =
      settingMutations.length === 0
        ? []
        : adapters.setting.applyBatch
          ? await adapters.setting.applyBatch(settingMutations.map((entry) => entry.input))
          : await Promise.all(
              settingMutations.map((entry) => adapters.setting.applyDesired(entry.input))
            );
    if (settingResults.length !== settingMutations.length) {
      throw new Error("setting_batch_write_failed");
    }

    const resultByIdentity = new Map(
      settingMutations.map((entry, index) => [entry.operation.identity, settingResults[index]!])
    );
    const preparedSettings = settingInputs.map((entry) => {
      const result =
        entry.operation.operation === "noop"
          ? {
              id: entry.operation.currentId ?? entry.operation.key,
              desired: entry.desired,
            }
          : resultByIdentity.get(entry.operation.identity);
      if (!result) throw new Error("setting_batch_write_failed");
      const ledgerItem: FullSiteInstallLedgerItem = {
        position: entry.operation.position,
        kind: "setting",
        key: entry.operation.key,
        operation: entry.operation.operation,
        status: "success",
        beforeSnapshot: beforeSnapshot(entry.operation),
        afterSnapshot: makeSagaSnapshot({
          id: result.id,
          desired: result.desired,
          phase: "complete",
          intendedDesired: result.desired,
        }),
      };
      return { entry, result, ledgerItem };
    });
    // The native batch is already committed. Capture every mutation in memory
    // before the first ledger write so any persistence failure restores the
    // whole settings stage, not just the prefix recorded so far.
    completed.push(
      ...preparedSettings
        .filter(({ entry }) => entry.operation.operation !== "noop")
        .map(({ ledgerItem }) => ledgerItem)
    );
    for (const { entry, result, ledgerItem } of preparedSettings) {
      if (entry.operation.operation === "noop") {
        await assertPlanItemCurrent({
          operation: entry.operation,
          resolvedDesired: entry.desired,
          resolveCurrentResource,
        });
      }
      installedIds.set(entry.operation.identity, result.id);
      resources.push({
        identity: entry.operation.identity,
        id: result.id,
        operation: entry.operation.operation,
      });
      await ledger.recordItem({ runId: run.id, ...ledgerItem });
    }

    await ledger.finalizeRun({ runId: run.id, status: "success" });
    return { runId: run.id, resources };
  } catch (error) {
    const code = toSafeFullSiteErrorCode(error, "site_package_apply_failed");
    let finalError = code;
    if (completed.length > 0) {
      let rollbackRunId: string | null = null;
      try {
        let compensationComplete = false;
        let completedIdentities = new Set<string>();
        if (ledger.claimRollbackRun) {
          const claim = await ledger.claimRollbackRun({
            sourceRunId: run.id,
            packageKey: input.package.key,
            actorId: input.actorId,
            options: { automaticCompensation: true, fullSitePackage: true },
          });
          if (claim.state === "busy") {
            throw new Error("site_package_rollback_in_progress");
          }
          rollbackRunId = claim.id;
          compensationComplete = claim.state === "complete";
          if (!compensationComplete) {
            completedIdentities = new Set(
              (await ledger.listItems(claim.id))
                .filter((item) => item.status === "success")
                .map((item) => `${item.kind}:${item.key}`)
            );
          }
        } else {
          rollbackRunId = (
            await ledger.createRollbackRun({
              sourceRunId: run.id,
              packageKey: input.package.key,
              actorId: input.actorId,
              options: { automaticCompensation: true },
            })
          ).id;
        }
        if (!compensationComplete) {
          const persisted = await ledger.listItems(run.id);
          await compensateItems({
            items: mergeCompletedItems(persisted, completed),
            actorId: input.actorId,
            adapters: rollbackAdapters,
            ledger,
            rollbackRunId,
            packageKey: input.package.key,
            resolveCurrentResource,
            completedIdentities,
          });
          await ledger.finalizeRun({
            runId: rollbackRunId,
            status: "success",
          });
        }
        finalError = code;
      } catch (compensationError) {
        const compensationCode = toSafeFullSiteErrorCode(
          compensationError,
          "site_package_compensation_failed"
        );
        if (rollbackRunId) {
          await ledger.finalizeRun({
            runId: rollbackRunId,
            status: "failed",
            error: compensationCode,
          });
        }
        finalError = compensationCode;
      }
    }
    await ledger.finalizeRun({
      runId: run.id,
      status: "failed",
      error: finalError,
    });
    throw error;
  }
};

export const applyFullSitePackage = async (
  input: ApplyFullSitePackageInput,
  overrides: FullSiteInstallExecutorDeps = {}
): Promise<ApplyFullSitePackageResult> => {
  // Invalid actors must fail before the default lock port opens a DB session.
  assertActorUuid(input.actorId);
  const ledger = overrides.ledger ?? defaultLegacyInstallLedger;
  const execute = () => applyFullSitePackageUnlocked(input, { ...overrides, ledger });
  return ledger.withPackageLock ? ledger.withPackageLock(input.package.key, execute) : execute();
};
