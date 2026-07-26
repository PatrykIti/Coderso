import type {
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerItem,
  FullSiteInstallLedgerPort,
  FullSiteInstallRun,
} from "../fullSiteInstallTypes";
import { isDeepStrictEqual } from "node:util";
import { createFullSiteCurrentResourceResolver } from "./currentResourceResolver";
import type { JsonObject } from "../fullSitePackage/types";
import { defaultLegacyInstallLedger } from "../legacyInstallRunPersistence";
import {
  compensateItems,
  FULL_SITE_ROLLBACK_ADAPTERS,
  type FullSiteRollbackAdapters,
} from "./compensation";
import { recoverInterruptedSagaItems } from "./staging";
import { toSafeFullSiteErrorCode } from "../fullSiteInstallTypes";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RollbackFullSiteInstallInput = {
  sourceRunId: string;
  actorId: string;
  ledger?: FullSiteInstallLedgerPort;
  adapters?: FullSiteRollbackAdapters;
  resolveCurrentResource?: FullSiteCurrentResourceResolver;
};

const assertRollbackSource = (source: FullSiteInstallRun): void => {
  if (
    source.mode !== "apply" ||
    source.rollbackOfRunId ||
    (source.status !== "running" && source.status !== "success" && source.status !== "failed")
  ) {
    throw new Error("site_package_rollback_invalid_source");
  }
};

const reconstructAutomaticCompensationItems = (
  sourceItems: readonly FullSiteInstallLedgerItem[],
  rollbackItems: readonly FullSiteInstallLedgerItem[]
): FullSiteInstallLedgerItem[] => {
  const recovered = new Map<string, FullSiteInstallLedgerItem>();
  for (const item of rollbackItems) {
    recovered.set(`${item.position}:${item.kind}:${item.key}`, {
      ...item,
      status: "success",
      beforeSnapshot: item.afterSnapshot,
      afterSnapshot: item.beforeSnapshot,
      error: null,
    });
  }
  for (const item of sourceItems) {
    recovered.set(`${item.position}:${item.kind}:${item.key}`, item);
  }
  return [...recovered.values()];
};

const rollbackFullSiteInstallUnlocked = async (
  input: RollbackFullSiteInstallInput,
  ledger: FullSiteInstallLedgerPort,
  source: FullSiteInstallRun
): Promise<{ runId: string }> => {
  assertRollbackSource(source);

  const automaticCompensation =
    source.status === "failed" ? await ledger.findAutomaticCompensationRun?.(source.id) : null;
  const hasDurableSaga =
    source.options?.fullSitePackage === true &&
    typeof source.options.packageFingerprint === "string" &&
    /^[a-f0-9]{64}$/.test(source.options.packageFingerprint);
  if (
    (source.status === "running" || (source.status === "failed" && !automaticCompensation)) &&
    !hasDurableSaga
  ) {
    throw new Error("site_package_rollback_invalid_source");
  }
  if (
    automaticCompensation &&
    (automaticCompensation.mode !== "rollback" ||
      automaticCompensation.rollbackOfRunId !== source.id ||
      automaticCompensation.packageKey !== source.packageKey ||
      automaticCompensation.options?.automaticCompensation !== true)
  ) {
    throw new Error("site_package_rollback_invalid_source");
  }
  if (automaticCompensation?.status === "success") {
    throw new Error("site_package_already_rolled_back");
  }

  const persistedSourceItems = await ledger.listItems(source.id);
  const resolveCurrent =
    input.resolveCurrentResource ??
    createFullSiteCurrentResourceResolver(source.packageKey, ledger);
  const sourceItems =
    source.status === "running" || (source.status === "failed" && !automaticCompensation)
      ? await recoverInterruptedSagaItems({
          items: persistedSourceItems,
          resolveCurrentResource: resolveCurrent,
        })
      : persistedSourceItems;
  const validateCurrentItems = async (
    items: readonly FullSiteInstallLedgerItem[],
    completed: ReadonlySet<string>
  ) => {
    for (const item of items) {
      if (
        item.status !== "success" ||
        item.operation === "noop" ||
        completed.has(`${item.kind}:${item.key}`)
      ) {
        continue;
      }
      const after = item.afterSnapshot as { id?: unknown; desired?: unknown } | null;
      const before = item.beforeSnapshot as { id?: unknown; desired?: unknown } | null;
      if (
        !after ||
        typeof after.id !== "string" ||
        !after.desired ||
        Array.isArray(after.desired) ||
        typeof after.desired !== "object"
      ) {
        throw new Error("site_package_rollback_conflict");
      }
      const evidence =
        source.status === "success"
          ? await ledger.findManagedResourceEvidence({
              packageKey: source.packageKey,
              kind: item.kind,
              key: item.key,
            })
          : null;
      const current = await resolveCurrent(
        item.kind,
        {
          key: item.key,
          desired: after.desired as JsonObject,
        },
        after.id
      );
      const alreadyRecovered =
        (item.operation === "create" && !current) ||
        (item.operation === "update" &&
          before !== null &&
          typeof before.id === "string" &&
          before.id === after.id &&
          before.desired &&
          !Array.isArray(before.desired) &&
          typeof before.desired === "object" &&
          current?.id === before.id &&
          isDeepStrictEqual(current.desired, before.desired));
      // A prior attempt may have completed the native reversal and then failed
      // to persist its success item. The compensation pass will recognize and
      // durably record this exact recovered state without mutating it again.
      if (alreadyRecovered) continue;
      if (
        (source.status === "success" &&
          (evidence?.successful !== true ||
            evidence.rolledBack ||
            evidence.runId !== source.id ||
            evidence.resourceId !== after.id)) ||
        current?.id !== after.id ||
        !isDeepStrictEqual(current.desired, after.desired)
      ) {
        throw new Error("site_package_rollback_conflict");
      }
    }
  };

  let rollback: { id: string };
  let completed = new Set<string>();
  let items = sourceItems;
  if (ledger.claimRollbackRun) {
    const claim = await ledger.claimRollbackRun({
      sourceRunId: source.id,
      packageKey: source.packageKey,
      actorId: input.actorId,
      ...(automaticCompensation
        ? {
            options: { automaticCompensation: true, fullSitePackage: true },
            resumeOnly: true,
          }
        : {}),
      resumeRunning: true,
    });
    if (claim.state === "complete") throw new Error("site_package_already_rolled_back");
    if (claim.state === "busy") throw new Error("site_package_rollback_in_progress");
    if (automaticCompensation && claim.id !== automaticCompensation.id) {
      throw new Error("site_package_rollback_conflict");
    }
    rollback = { id: claim.id };
    const previous = await ledger.listItems(claim.id);
    if (automaticCompensation) {
      items = reconstructAutomaticCompensationItems(sourceItems, previous);
    }
    completed = new Set(
      previous.filter((item) => item.status === "success").map((item) => `${item.kind}:${item.key}`)
    );
    try {
      await validateCurrentItems(items, completed);
    } catch (error) {
      await ledger.finalizeRun({
        runId: rollback.id,
        status: "failed",
        error: toSafeFullSiteErrorCode(error, "site_package_rollback_failed"),
      });
      throw error;
    }
  } else {
    if (automaticCompensation) {
      throw new Error("site_package_compensation_not_recoverable");
    }
    if (await ledger.hasSuccessfulRollback(source.id)) {
      throw new Error("site_package_already_rolled_back");
    }
    await validateCurrentItems(items, completed);
    rollback = await ledger.createRollbackRun({
      sourceRunId: source.id,
      packageKey: source.packageKey,
      actorId: input.actorId,
      options: { fullSitePackage: true },
    });
  }

  try {
    await compensateItems({
      items,
      actorId: input.actorId,
      adapters: input.adapters ?? FULL_SITE_ROLLBACK_ADAPTERS,
      ledger,
      rollbackRunId: rollback.id,
      packageKey: source.packageKey,
      resolveCurrentResource: resolveCurrent,
      completedIdentities: completed,
    });
    await ledger.finalizeRun({ runId: rollback.id, status: "success" });
    if (source.status === "running") {
      await ledger.finalizeRun({
        runId: source.id,
        status: "failed",
        error: "site_package_apply_interrupted",
      });
    }
    return { runId: rollback.id };
  } catch (error) {
    await ledger.finalizeRun({
      runId: rollback.id,
      status: "failed",
      error: toSafeFullSiteErrorCode(error, "site_package_rollback_failed"),
    });
    throw error;
  }
};

export const rollbackFullSiteInstall = async (
  input: RollbackFullSiteInstallInput
): Promise<{ runId: string }> => {
  if (!UUID_PATTERN.test(input.actorId)) throw new Error("site_package_actor_invalid");
  const ledger = input.ledger ?? defaultLegacyInstallLedger;
  const source = await ledger.getRun(input.sourceRunId);
  if (!source) throw new Error("site_package_run_not_found");
  assertRollbackSource(source);
  const execute = async () => {
    const currentSource = await ledger.getRun(input.sourceRunId);
    if (!currentSource) throw new Error("site_package_run_not_found");
    if (currentSource.packageKey !== source.packageKey) {
      throw new Error("site_package_rollback_invalid_source");
    }
    return rollbackFullSiteInstallUnlocked(input, ledger, currentSource);
  };
  return ledger.withPackageLock ? ledger.withPackageLock(source.packageKey, execute) : execute();
};
