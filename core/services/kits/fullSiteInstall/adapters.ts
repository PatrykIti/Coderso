import {
  contentTypeAdapter,
  formAdapter,
  listingQueryAdapter,
  listingTemplateAdapter,
  pageTemplateAdapter,
  settingAdapter,
} from "./aggregateAdapters";
import type { FullSiteInstallResourceKind } from "../fullSiteInstallTypes";
import type {
  FullSiteResourceAdapterRegistry,
  FullSiteRollbackAdapters,
  RollbackResourceAdapter,
} from "./adapterTypes";
import {
  contentEntryAdapter,
  detailPageAdapter,
  menuAdapter,
  pageAdapter,
} from "./lifecycleAdapters";

export { createFormResourceAdapter, type FormResourceAdapterDeps } from "./aggregateAdapters";
export {
  createContentEntryResourceAdapter,
  createMenuResourceAdapter,
  createPageResourceAdapter,
  type ContentEntryResourceAdapterDeps,
  type MenuResourceAdapterDeps,
  type PageResourceAdapterDeps,
} from "./lifecycleAdapters";
export {
  LIFECYCLE_CAPABLE_PUBLISH_KINDS,
  assertFullSiteSagaAdapterApplyInput,
  isFullSiteSagaAdapterApplyInput,
  isLifecycleCapablePublishKind,
} from "./adapterTypes";
export type {
  AdapterApplyInput,
  AdapterApplyResult,
  DeleteSnapshotAtomicInput,
  FullSiteNativeReversal,
  FullSiteNativeSnapshot,
  FullSitePreparedNativeTargets,
  FullSiteResourceAdapterRegistry,
  FullSiteRollbackAdapters,
  FullSiteSagaAdapterApplyInput,
  FullSiteSagaAdapterPrepareInput,
  FullSiteSettingsApplyBatchInput,
  LifecycleCapablePublishKind,
  PublishSnapshotAtomicInput,
  ResourceAdapter,
  RollbackResourceAdapter,
  RestoreSnapshotAtomicInput,
  ReverseSettingsBatchInput,
} from "./adapterTypes";

export const FULL_SITE_RESOURCE_ADAPTERS = Object.freeze({
  content_type: contentTypeAdapter,
  form: formAdapter,
  page_template: pageTemplateAdapter,
  listing_template: listingTemplateAdapter,
  content_entry: contentEntryAdapter,
  listing_query: listingQueryAdapter,
  detail_page: detailPageAdapter,
  page: pageAdapter,
  menu: menuAdapter,
  setting: settingAdapter,
}) satisfies Readonly<FullSiteResourceAdapterRegistry>;

const ROLLBACK_NOT_FOUND_CODES: Readonly<
  Record<Exclude<FullSiteInstallResourceKind, "setting">, string>
> = Object.freeze({
  content_type: "content_type_not_found",
  form: "form_not_found",
  page_template: "page_template_not_found",
  listing_template: "listing_template_not_found",
  content_entry: "content_entry_not_found",
  listing_query: "listing_query_not_found",
  detail_page: "detail_page_not_found",
  page: "page_not_found",
  menu: "menu_not_found",
});

const rollbackAdapter = (
  kind: Exclude<FullSiteInstallResourceKind, "setting">
): RollbackResourceAdapter => {
  const adapter = FULL_SITE_RESOURCE_ADAPTERS[kind];
  return Object.freeze({
    async captureSnapshotByIdOrNull(id: string) {
      try {
        return await adapter.captureSnapshotById(id);
      } catch (error) {
        if (error instanceof Error && error.message === ROLLBACK_NOT_FOUND_CODES[kind]) {
          return null;
        }
        throw error;
      }
    },
    deleteSnapshotAtomic: adapter.deleteSnapshotAtomic,
    restoreSnapshotAtomic: adapter.restoreSnapshotAtomic,
  });
};

const settingRollbackAdapter: FullSiteRollbackAdapters["setting"] = Object.freeze({
  async captureSnapshotByIdOrNull(id: string) {
    return FULL_SITE_RESOURCE_ADAPTERS.setting.captureSnapshotById(id);
  },
  deleteSnapshotAtomic: FULL_SITE_RESOURCE_ADAPTERS.setting.deleteSnapshotAtomic,
  restoreSnapshotAtomic: FULL_SITE_RESOURCE_ADAPTERS.setting.restoreSnapshotAtomic,
  reverseSettingsBatch: FULL_SITE_RESOURCE_ADAPTERS.setting.reverseSettingsBatch,
});

export const FULL_SITE_ROLLBACK_ADAPTERS: Readonly<FullSiteRollbackAdapters> = Object.freeze({
  content_type: rollbackAdapter("content_type"),
  form: rollbackAdapter("form"),
  page_template: rollbackAdapter("page_template"),
  listing_template: rollbackAdapter("listing_template"),
  content_entry: rollbackAdapter("content_entry"),
  listing_query: rollbackAdapter("listing_query"),
  detail_page: rollbackAdapter("detail_page"),
  page: rollbackAdapter("page"),
  menu: rollbackAdapter("menu"),
  setting: settingRollbackAdapter,
});
