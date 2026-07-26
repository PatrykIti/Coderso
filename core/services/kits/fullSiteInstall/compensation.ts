import type {
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerItem,
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
} from "../fullSiteInstallTypes";
import type { JsonObject } from "../fullSitePackage/types";
import { isDeepStrictEqual } from "node:util";
import { deleteContentType } from "../../content/typeService";
import { deleteEntry } from "../../content/entryService";
import { deleteDetailPageDocument } from "../../content/detailPageDocumentService";
import { deleteListingQuery } from "../../content/listingQueriesService";
import { deleteListingTemplate } from "../../content/listingTemplatesService";
import { deleteForm } from "../../forms/formsService";
import { deleteMenu } from "../../menus/menuService";
import { deletePage } from "../../pages/pageService";
import { deletePageTemplate } from "../../pages/pageTemplateLibraryService";
import {
  applySettingsBatch,
  restoreSettingsBatchRaw,
} from "../../settings/settingsService";
import {
  FULL_SITE_RESOURCE_ADAPTERS,
  isLifecycleCapablePublishKind,
} from "./adapters";

export type RollbackResourceAdapter = {
  deleteById(id: string, actorId: string): Promise<void>;
  restoreById(id: string, desired: JsonObject, actorId: string): Promise<void>;
  applyBatch?(
    items: readonly {
      operation: "create" | "update";
      id: string;
      beforeDesired: JsonObject | null;
    }[],
    actorId: string
  ): Promise<void>;
};

export type FullSiteRollbackAdapters = Record<
  FullSiteInstallResourceKind,
  RollbackResourceAdapter
>;

const deleteOperations: Record<FullSiteInstallResourceKind, (id: string) => Promise<unknown>> = {
  content_type: deleteContentType,
  form: deleteForm,
  page_template: deletePageTemplate,
  listing_template: deleteListingTemplate,
  content_entry: deleteEntry,
  listing_query: deleteListingQuery,
  detail_page: deleteDetailPageDocument,
  page: deletePage,
  menu: deleteMenu,
  setting: async (id) =>
    applySettingsBatch([{ key: id, operation: "delete" }]),
};

const nativeRollbackAdapter = (kind: FullSiteInstallResourceKind): RollbackResourceAdapter => ({
  async deleteById(id) {
    const result = await deleteOperations[kind](id);
    if (result === null || result === false) throw new Error(`${kind}_rollback_delete_failed`);
  },
  async restoreById(id, desired, actorId) {
    const adapter = FULL_SITE_RESOURCE_ADAPTERS[kind];
    const applyInput = {
      operation: "update" as const,
      currentId: id,
      key: kind === "setting" ? id : "",
      desired,
      actorId,
    };
    const result = isLifecycleCapablePublishKind(kind)
      ? await adapter.applyStaged(applyInput)
      : await adapter.applyDesired(applyInput);
    if (result.id !== id) throw new Error(`${kind}_rollback_identity_mismatch`);
    if (isLifecycleCapablePublishKind(kind) && desired.status === "published") {
      await adapter.publish(id, actorId);
    }
  },
});

const settingRollbackAdapter: RollbackResourceAdapter = {
  ...nativeRollbackAdapter("setting"),
  async applyBatch(items) {
    await restoreSettingsBatchRaw(
      items.map((item) => {
        if (item.operation === "create") {
          return { key: item.id, operation: "delete" as const };
        }
        if (!item.beforeDesired || !Object.prototype.hasOwnProperty.call(item.beforeDesired, "value")) {
          throw new Error("site_package_rollback_missing_before");
        }
        return {
          key: item.id,
          operation: "set" as const,
          value: item.beforeDesired.value,
        };
      })
    );
  },
};

const rollbackAdapters = Object.fromEntries(
  (
    [
      "content_type",
      "form",
      "page_template",
      "listing_template",
      "content_entry",
      "listing_query",
      "detail_page",
      "page",
      "menu",
      "setting",
    ] as const
  ).map((kind) => [kind, nativeRollbackAdapter(kind)])
) as FullSiteRollbackAdapters;

rollbackAdapters.setting = settingRollbackAdapter;

export const FULL_SITE_ROLLBACK_ADAPTERS = rollbackAdapters;

const snapshot = (
  item: FullSiteInstallLedgerItem,
  side: "beforeSnapshot" | "afterSnapshot"
): { id: string; desired: JsonObject } => {
  const value = item[side];
  if (
    !value ||
    typeof value.id !== "string" ||
    !value.desired ||
    Array.isArray(value.desired) ||
    typeof value.desired !== "object"
  ) {
    throw new Error(`site_package_rollback_missing_${side === "beforeSnapshot" ? "before" : "after"}`);
  }
  return { id: value.id, desired: value.desired as JsonObject };
};

export const compensateItems = async (input: {
  items: readonly FullSiteInstallLedgerItem[];
  actorId: string;
  adapters: FullSiteRollbackAdapters;
  ledger?: FullSiteInstallLedgerPort;
  rollbackRunId?: string;
  packageKey?: string;
  resolveCurrentResource?: FullSiteCurrentResourceResolver;
  completedIdentities?: ReadonlySet<string>;
}): Promise<{ attempted: number; recovered: number }> => {
  const ordered = [...input.items]
    .filter((item) => item.status === "success" && item.operation !== "noop")
    .sort(
      (left, right) =>
        right.position - left.position ||
        left.kind.localeCompare(right.kind) ||
        left.key.localeCompare(right.key)
    )
    .filter(
      (item) => !input.completedIdentities?.has(`${item.kind}:${item.key}`)
    );
  const failures: Error[] = [];
  let attempted = 0;
  let recovered = 0;

  const recordOutcome = async (
    item: FullSiteInstallLedgerItem,
    status: "success" | "failed",
    error?: Error
  ) => {
    if (!input.ledger || !input.rollbackRunId) return;
    try {
      await input.ledger.recordItem({
        runId: input.rollbackRunId,
        position: item.position,
        kind: item.kind,
        key: item.key,
        operation: item.operation,
        status,
        beforeSnapshot: item.afterSnapshot,
        afterSnapshot: item.beforeSnapshot,
        error: error?.message ?? null,
      });
    } catch (ledgerError) {
      failures.push(
        ledgerError instanceof Error
          ? ledgerError
          : new Error("site_package_rollback_ledger_failed")
      );
    }
  };

  const readRecoveryState = async (
    item: FullSiteInstallLedgerItem,
    after: { id: string; desired: JsonObject },
    before: { id: string; desired: JsonObject } | null
  ): Promise<"pending" | "recovered" | "conflict"> => {
    if (!input.resolveCurrentResource) return "pending";
    const current = await input.resolveCurrentResource(
      item.kind,
      { key: item.key, desired: after.desired },
      after.id
    );
    if (item.operation === "create" && !current) return "recovered";
    if (
      item.operation === "update" &&
      before &&
      current?.id === before.id &&
      isDeepStrictEqual(current.desired, before.desired)
    ) {
      return "recovered";
    }
    if (
      current?.id === after.id &&
      isDeepStrictEqual(current.desired, after.desired)
    ) {
      return "pending";
    }
    return "conflict";
  };

  const settings = ordered.filter((item) => item.kind === "setting");
  let settingsNativeRestoreFailed = false;
  if (settings.length > 0) {
    const pending: Array<{
      item: FullSiteInstallLedgerItem;
      after: { id: string; desired: JsonObject };
      before: { id: string; desired: JsonObject } | null;
    }> = [];
    const failedSettingItems: FullSiteInstallLedgerItem[] = [];
    let settingsConflict: Error | null = null;
    for (const item of settings) {
      try {
        const after = snapshot(item, "afterSnapshot");
        const before =
          item.operation === "update" ? snapshot(item, "beforeSnapshot") : null;
        if (before && before.id !== after.id) {
          throw new Error("site_package_rollback_identity_mismatch");
        }
        const state = await readRecoveryState(item, after, before);
        if (state === "recovered") {
          recovered += 1;
          await recordOutcome(item, "success");
        } else if (state === "conflict") {
          settingsConflict = new Error("site_package_rollback_conflict");
          failedSettingItems.push(item);
        } else {
          pending.push({ item, after, before });
        }
      } catch (error) {
        settingsConflict =
          error instanceof Error ? error : new Error("site_package_rollback_failed");
        failedSettingItems.push(item);
      }
    }
    if (settingsConflict) {
      settingsNativeRestoreFailed = true;
      failures.push(settingsConflict);
      for (const entry of pending) {
        await recordOutcome(entry.item, "failed", settingsConflict);
      }
      for (const item of failedSettingItems) {
        await recordOutcome(item, "failed", settingsConflict);
      }
    } else if (pending.length > 0) {
      attempted += pending.length;
      try {
        const batch = input.adapters.setting.applyBatch;
        if (batch) {
          await batch(
            pending.map(({ item, after, before }) => ({
              operation: item.operation as "create" | "update",
              id: after.id,
              beforeDesired: before?.desired ?? null,
            })),
            input.actorId
          );
        } else {
          for (const { item, after, before } of pending) {
            if (item.operation === "create") {
              await input.adapters.setting.deleteById(after.id, input.actorId);
            } else if (before) {
              await input.adapters.setting.restoreById(
                before.id,
                before.desired,
                input.actorId
              );
            }
          }
        }
        for (const entry of pending) await recordOutcome(entry.item, "success");
      } catch (error) {
        settingsNativeRestoreFailed = true;
        const failure =
          error instanceof Error ? error : new Error("site_package_rollback_failed");
        failures.push(failure);
        for (const entry of pending) {
          await recordOutcome(entry.item, "failed", failure);
        }
      }
    }
  }

  // Site-shell settings can point at every downstream resource. If their
  // atomic restore did not commit, deleting those dependencies would leave
  // the currently active shell dangling. Leave them untouched for a durable
  // retry after the settings stage can be restored safely.
  if (settingsNativeRestoreFailed) {
    throw failures[0] ?? new Error("site_package_rollback_failed");
  }

  for (const item of ordered.filter((candidate) => candidate.kind !== "setting")) {
    try {
      const after = snapshot(item, "afterSnapshot");
      const before =
        item.operation === "update" ? snapshot(item, "beforeSnapshot") : null;
      if (before && before.id !== after.id) {
        throw new Error("site_package_rollback_identity_mismatch");
      }
      const state = await readRecoveryState(item, after, before);
      if (state === "recovered") {
        recovered += 1;
        await recordOutcome(item, "success");
        continue;
      }
      if (state === "conflict") {
        throw new Error("site_package_rollback_conflict");
      }
      attempted += 1;
      if (item.operation === "create") {
        await input.adapters[item.kind].deleteById(after.id, input.actorId);
      } else if (before) {
        await input.adapters[item.kind].restoreById(before.id, before.desired, input.actorId);
      }
      await recordOutcome(item, "success");
    } catch (error) {
      const failure =
        error instanceof Error ? error : new Error("site_package_rollback_failed");
      failures.push(failure);
      await recordOutcome(item, "failed", failure);
    }
  }

  if (failures.length > 0) throw failures[0];
  return { attempted, recovered };
};
