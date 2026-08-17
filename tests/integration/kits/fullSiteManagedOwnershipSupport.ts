import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { acquireNativeCmsWriterFence } from "../../../core/db/nativeCmsWriterFence";
import {
  contentEntries,
  contentTypes,
  detailPageDocuments,
  formActions,
  forms,
  menuItems,
  menus,
  settings,
  solutionKitInstallItems,
  solutionKitInstallRuns,
} from "../../../core/db/schema";
import {
  normalizeFormActionsInput,
  type NormalizedFormAction,
} from "../../../core/services/forms/formActionsContract";
import { readFullSitePlanningResourcesBatch } from "../../../core/services/kits/fullSiteInstall/planningResourceBatchReader";
import { createFullSitePlanningSnapshotLoader } from "../../../core/services/kits/fullSiteInstall/planningSnapshot";
import { planFullSiteInstall } from "../../../core/services/kits/fullSiteInstallPlanner";
import type {
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
} from "../../../core/services/kits/fullSiteInstallTypes";
import { findManagedResourceEvidenceBatch } from "../../../core/services/kits/legacyInstallRunPersistence";
import type {
  FullSitePackageResources,
  FullSitePackageV1,
  JsonObject,
} from "../../../core/services/kits/fullSitePackage/types";
export const CLEANUP_FAILURE = "full_site_managed_ownership_cleanup_failed";
export type OwnedIds = {
  installItems: Set<string>;
  installRuns: Set<string>;
  formActions: Set<string>;
  forms: Set<string>;
  menuItems: Set<string>;
  menus: Set<string>;
  entries: Set<string>;
  detailPages: Set<string>;
  contentTypes: Set<string>;
};
export const createOwnedIds = (): OwnedIds => ({
  installItems: new Set(),
  installRuns: new Set(),
  formActions: new Set(),
  forms: new Set(),
  menuItems: new Set(),
  menus: new Set(),
  entries: new Set(),
  detailPages: new Set(),
  contentTypes: new Set(),
});
export const ownId = (ids: Set<string>, id: string = randomUUID()): string => {
  ids.add(id);
  return id;
};
export const cleanupOwnedIds = async (owned: OwnedIds): Promise<void> => {
  let cleanupFailed = false;
  const attempt = async (
    ids: ReadonlySet<string>,
    remove: (values: string[]) => Promise<unknown>
  ): Promise<void> => {
    if (ids.size === 0) return;
    try {
      await remove([...ids]);
    } catch {
      cleanupFailed = true;
    }
  };
  await attempt(owned.installItems, async (ids) =>
    db.delete(solutionKitInstallItems).where(inArray(solutionKitInstallItems.id, ids))
  );
  await attempt(owned.formActions, async (ids) =>
    db.delete(formActions).where(inArray(formActions.id, ids))
  );
  await attempt(owned.menuItems, async (ids) =>
    db.delete(menuItems).where(inArray(menuItems.id, ids))
  );
  await attempt(owned.entries, async (ids) =>
    db.delete(contentEntries).where(inArray(contentEntries.id, ids))
  );
  await attempt(owned.detailPages, async (ids) =>
    db.delete(detailPageDocuments).where(inArray(detailPageDocuments.id, ids))
  );
  await attempt(owned.installRuns, async (ids) =>
    db.delete(solutionKitInstallRuns).where(inArray(solutionKitInstallRuns.id, ids))
  );
  await attempt(owned.forms, async (ids) => db.delete(forms).where(inArray(forms.id, ids)));
  await attempt(owned.menus, async (ids) => db.delete(menus).where(inArray(menus.id, ids)));
  await attempt(owned.contentTypes, async (ids) =>
    db.delete(contentTypes).where(inArray(contentTypes.id, ids))
  );
  if (cleanupFailed) throw new Error(CLEANUP_FAILURE);
};
export const emptyResources = (): FullSitePackageResources => ({
  contentTypes: [],
  forms: [],
  pageTemplates: [],
  listingTemplates: [],
  entries: [],
  listingQueries: [],
  detailPages: [],
  pages: [],
  menus: [],
  settings: [],
});
export const packageFixture = (
  packageKey: string,
  add: (resources: FullSitePackageResources) => void
): FullSitePackageV1 => {
  const resources = emptyResources();
  add(resources);
  return {
    schemaVersion: 1,
    key: packageKey,
    metadata: { name: `Ownership ${packageKey}`, locale: "en" },
    resources,
  };
};
export const identityNormalizer = async ({ desired }: { desired: JsonObject }) => desired;
export const planPackage = (
  pkg: FullSitePackageV1,
  ledger: FullSiteInstallLedgerPort,
  resolveCurrentResource: FullSiteCurrentResourceResolver,
  allowSettingTakeover?: true,
  onSnapshotLoad?: () => void
) => {
  void ledger;
  void resolveCurrentResource;
  const loadSnapshot = createFullSitePlanningSnapshotLoader({
    packageKey: pkg.key,
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
  return planFullSiteInstall(pkg, {
    loadPlanningSnapshot: (resources) => {
      onSnapshotLoad?.();
      return loadSnapshot(resources);
    },
    normalizeDesired: identityNormalizer,
    ...(allowSettingTakeover ? { allowSettingTakeover } : {}),
  });
};
export const projectPersistedFormActions = (input: unknown): NormalizedFormAction[] =>
  normalizeFormActionsInput(input)
    .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
    .map((action, orderIndex) => ({ ...action, orderIndex }));
export const persistEvidence = async (input: {
  owned: OwnedIds;
  packageKey: string;
  kind: FullSiteInstallResourceKind;
  key: string;
  resourceId: string;
  desired?: JsonObject;
  operation?: "create" | "update" | "noop";
  itemStatus?: "planned" | "success" | "failed" | "skipped";
  runStatus?: "success" | "failed";
  runId?: string;
  itemId?: string;
}) => {
  const runId = ownId(input.owned.installRuns, input.runId);
  const itemId = ownId(input.owned.installItems, input.itemId);
  const timestamp = new Date();
  const runStatus = input.runStatus ?? "success";
  await db.insert(solutionKitInstallRuns).values({
    id: runId,
    kitId: input.packageKey,
    mode: "apply",
    status: runStatus,
    actorId: null,
    rollbackOfRunId: null,
    options: { fullSitePackage: true },
    summary: {},
    error: runStatus === "failed" ? "site_package_apply_failed" : null,
    createdAt: timestamp,
    updatedAt: timestamp,
    finishedAt: timestamp,
  });
  await db.insert(solutionKitInstallItems).values({
    id: itemId,
    runId,
    position: 0,
    resourceType: input.kind,
    resourceKey: input.key,
    operation: input.operation ?? "create",
    status: input.itemStatus ?? "success",
    beforeSnapshot: null,
    afterSnapshot: { id: input.resourceId, desired: input.desired ?? {} },
    rollbackAction: null,
    error: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return { id: runId, itemId };
};
export type PriorSetting = {
  value: typeof settings.$inferSelect.value;
  updatedAt: typeof settings.$inferSelect.updatedAt;
};
export const captureSetting = async (key: string): Promise<PriorSetting | null> => {
  const [priorSetting] = await db
    .select({ value: settings.value, updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.key, key));
  return priorSetting ?? null;
};
export const restoreSetting = async (
  key: string,
  priorSetting: PriorSetting | null
): Promise<void> => {
  if (priorSetting) {
    await db
      .insert(settings)
      .values({
        key,
        value: priorSetting.value,
        updatedAt: priorSetting.updatedAt,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: priorSetting.value, updatedAt: priorSetting.updatedAt },
      });
  } else {
    await db.delete(settings).where(eq(settings.key, key));
  }
};
