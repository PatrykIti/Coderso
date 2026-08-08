import type {
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerPort,
  FullSiteInstallRun,
} from "../fullSiteInstallTypes";
import { defaultLegacyInstallLedger } from "../legacyInstallRunPersistence";
import type { JsonObject } from "../fullSitePackage/types";
import { FULL_SITE_ROLLBACK_ADAPTERS, type FullSiteRollbackAdapters } from "./adapters";
import { compensateItems } from "./compensation";
import { createFullSiteCurrentResourceResolver } from "./currentResourceResolver";
import { requireDesiredOwnedRunFinalization } from "./execute";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RollbackFullSiteInstallInput = Readonly<{
  sourceRunId: string;
  actorId: string;
  ledger?: FullSiteInstallLedgerPort;
  adapters?: FullSiteRollbackAdapters;
  resolveCurrentResource?: FullSiteCurrentResourceResolver;
}>;

const assertRollbackSource = (source: FullSiteInstallRun): void => {
  if (
    source.mode !== "apply" ||
    source.rollbackOfRunId !== null ||
    (source.status !== "running" && source.status !== "success" && source.status !== "failed") ||
    source.options?.fullSitePackage !== true
  ) {
    throw new Error("site_package_rollback_invalid_source");
  }
};

const assertOwnedRollback = (
  rollback: FullSiteInstallRun | null,
  source: FullSiteInstallRun,
  ownerRunId: string
): void => {
  if (
    !rollback ||
    rollback.id !== ownerRunId ||
    rollback.mode !== "rollback" ||
    rollback.status !== "running" ||
    rollback.rollbackOfRunId !== source.id ||
    rollback.packageKey !== source.packageKey
  ) {
    throw new Error("site_package_rollback_invalid_source");
  }
};

export const rollbackFullSiteInstall = async (
  input: RollbackFullSiteInstallInput
): Promise<{ runId: string }> => {
  if (!UUID_PATTERN.test(input.actorId)) throw new Error("site_package_actor_invalid");
  const ledger = input.ledger ?? defaultLegacyInstallLedger;
  const routedSource = await ledger.getRun(input.sourceRunId);
  if (!routedSource) throw new Error("site_package_run_not_found");
  assertRollbackSource(routedSource);
  const automatic = await ledger.findAutomaticCompensationRun?.(routedSource.id);
  if (automatic?.status === "success") throw new Error("site_package_already_rolled_back");
  if (routedSource.status === "failed" && !automatic) {
    throw new Error("site_package_rollback_invalid_source");
  }
  const options: JsonObject = automatic
    ? { automaticCompensation: true, fullSitePackage: true }
    : { fullSitePackage: true };

  return ledger.withPackageLock(
    {
      intent: "explicit_rollback",
      packageKey: routedSource.packageKey,
      actorId: input.actorId,
      sourceRunId: routedSource.id,
      options,
    },
    async (context) => {
      if (context.intent !== "explicit_rollback") throw new Error("site_package_invalid");
      const currentSource = await ledger.getRun(routedSource.id);
      if (!currentSource) throw new Error("site_package_run_not_found");
      assertRollbackSource(currentSource);
      if (currentSource.packageKey !== routedSource.packageKey) {
        throw new Error("site_package_rollback_invalid_source");
      }
      assertOwnedRollback(
        await ledger.getRun(context.ownerRunId),
        currentSource,
        context.ownerRunId
      );
      const adapters = input.adapters ?? FULL_SITE_ROLLBACK_ADAPTERS;
      await compensateItems({
        items: await ledger.listRawItems(currentSource.id),
        priorOutcomes: await ledger.listRawItems(context.ownerRunId),
        currentSource,
        actorId: input.actorId,
        adapters,
        ledger,
        rollbackRunId: context.ownerRunId,
        resolveCurrentResource:
          input.resolveCurrentResource ??
          createFullSiteCurrentResourceResolver(currentSource.packageKey, ledger),
      });
      await requireDesiredOwnedRunFinalization(ledger, {
        ownerRunId: context.ownerRunId,
        status: "success",
        error: null,
        interruptedApplySource:
          currentSource.status === "running"
            ? {
                runId: currentSource.id,
                status: "failed",
                error: "site_package_apply_interrupted",
              }
            : null,
      });
      return { runId: context.ownerRunId };
    }
  );
};
