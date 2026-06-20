import { isDeepStrictEqual } from "node:util";

import { getSetting, setSetting } from "../settings/settingsService";
import type { ContentRouteSetting } from "../settings/settingsContracts";
import {
  createContentType,
  getContentType,
  deleteContentType,
  getContentTypeBySlug,
  updateContentType,
  type ContentTypeRecord,
  type CreateContentTypeInput,
  type UpdateContentTypeInput,
} from "../content/typeService";
import { mergeContentTypeSchemaFields } from "../content/contentTypeSchemaFields";
import {
  createCustomScreen,
  deleteCustomScreen,
  getCustomScreen,
  listCustomScreens,
  updateCustomScreen,
} from "../customScreens/customScreenService";
import {
  getCustomScreenEditorViewBindings,
  getCustomScreenEditorViewBlocks,
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenBinding,
} from "../customScreens/customScreenSchemas";
import {
  createListingQuery,
  deleteListingQuery,
  listListingQueries,
  updateListingQuery,
} from "../content/listingQueriesService";
import {
  createListingTemplate,
  deleteListingTemplate,
  listListingTemplates,
  updateListingTemplate,
} from "../content/listingTemplatesService";
import {
  getDetailPageDocument,
  prepareDetailPageDocumentUpsert,
  upsertDetailPageDocument,
} from "../content/detailPageDocumentService";
import type { DetailPageDocument } from "../content/detailPageTypes";
import {
  createEntry,
  deleteEntry,
  getEntry,
  getEntryBySlug,
  publishEntry,
  updateEntry,
  updateEntryMetadata,
} from "../content/entryService";
import {
  createPage,
  deletePage,
  getPage,
  getPageBySlug,
  listPages,
  publishPage,
  unpublishPage,
  updatePage,
} from "../pages/pageService";
import {
  deleteSeoDocument,
  getSeoDocument,
  getSeoDocumentByTarget,
  updateSeoDocumentById,
  upsertSeoDocument,
} from "../seo/seoService";
import {
  deleteWidgetTemplate,
  getWidgetTemplate,
  listWidgetTemplates,
  updateWidgetTemplate,
} from "../widgets/widgetTemplateService";
import { normalizeWidgetTemplateSettings } from "../widgets/widgetTemplateSettings";
import {
  countFormSubmissions,
  createForm,
  deleteForm,
  getForm,
  listForms,
  setFormFields,
  updateForm,
} from "../forms/formsService";
import { listFormActions, setFormActions } from "../forms/formActionsService";
import {
  createMenu,
  deleteMenuItem,
  listMenus,
  listMenuItems,
  replaceMenuItems,
  updateMenu,
  type MenuItemInput,
} from "../menus/menuService";
import { getMediaById } from "../media/mediaService";
import type { MenuItemNode, MenuItemRecord } from "../menus/treeBuilder";
import type { FormFieldInput } from "../forms/validation";
import { normalizeSitePath } from "../../site/cache/siteCache";
import { logAudit } from "../audit/auditService";
import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import { normalizeWidgetBlock } from "../../widgets/validator";
import type { WidgetBlock } from "../../widgets/types";
import { composeBlueprintPageData } from "./blueprints/blueprintPageSectionComposer";
import { isCuratedMediaUrl } from "../media/curatedMediaProfiles";
import { normalizePageCollectionLink, type PageCollectionLink } from "../pages/pageCollectionLink";
import type { PageSectionV2 } from "../pages/pageDocumentV2";
import type {
  AssistantActionDryRunResult,
  AssistantActionExecuteResult,
  AssistantActionExecutionItem,
  AssistantActionPlan,
  AssistantActionPreviewChange,
  AssistantContentRouteUpsertAction,
  AssistantContentTypeFieldAddAction,
  AssistantContentTypeUpsertAction,
  AssistantContentTypeDeleteAction,
  AssistantCustomScreenUpsertAction,
  AssistantCustomScreenDeleteAction,
  AssistantCustomScreenUpdateAction,
  AssistantCustomScreenWidgetPatchAction,
  AssistantEntryUpsertDraftAction,
  AssistantEntryDeleteAction,
  AssistantEntrySampleCreateAction,
  AssistantEntryUpdateAction,
  AssistantFormUpsertAction,
  AssistantFormDeleteAction,
  AssistantFormArchiveAction,
  AssistantFormUpdateAction,
  AssistantFormAutomationUpsertAction,
  AssistantDetailPageUpsertAction,
  AssistantListingQueryFiltersPatchAction,
  AssistantListingQueryDeleteAction,
  AssistantListingQueryUpdateAction,
  AssistantListingQueryUpsertAction,
  AssistantListingTemplateCardPatchAction,
  AssistantListingTemplateDeleteAction,
  AssistantListingTemplateUpdateAction,
  AssistantListingTemplateUpsertAction,
  AssistantMediaReferenceAttachAction,
  AssistantMenuItemDeleteAction,
  AssistantMenuItemUpdateAction,
  AssistantMenuItemUpsertAction,
  AssistantMenuUpsertAction,
  AssistantPageUpdateAction,
  AssistantPageUpsertAction,
  AssistantPageDeleteAction,
  AssistantWidgetTemplateDeleteAction,
  AssistantWidgetTemplateUpdateAction,
  AssistantWidgetTemplateBlockPatchAction,
  AssistantPlannedAction,
  AssistantResourceIdInput,
  AssistantSamePlanLocator,
  AssistantSeoDocumentDeleteAction,
  AssistantSeoDocumentUpdateAction,
  AssistantSeoDocumentUpsertAction,
  AssistantSiteKitInstallAction,
  AssistantSiteKitRecommendAction,
  AssistantSiteKitValidateAction,
} from "./actionPlanTypes";
import { createPreviewChange } from "./actionDiffService";
import { isAssistantActionPlan } from "./actionPlanTypes";
import { createAssistantActionRegistry, getAssistantActionHandler } from "./actionRegistry";
import {
  executeGuidedSiteBuilder,
  previewGuidedSiteBuilderPlan,
  validateGuidedSiteBuilderRun,
} from "./siteBuilderExecutor";
import {
  getAssistantActionExecutionByIdempotencyKey,
  hashAssistantActionPlan,
  saveAssistantActionExecutionResult,
  withAssistantActionExecutionReplayMetadata,
} from "./actionExecutionStore";
import { recordAssistantActionMetric } from "./assistantMetrics";
import { buildAssistantUndoManifestItems } from "./actionUndoManifest";
import { applyPageWidgetDataPatch } from "./pageWidgetPatch";

type ExecutionCacheEntry = {
  result: AssistantActionExecuteResult;
  actorId: string;
  planId: string;
  planHash: string;
  savedAt: number;
};

const executionCache = new Map<string, ExecutionCacheEntry>();
const executionCacheTtlMs = 15 * 60 * 1000;

const cleanupExecutionCache = (now = Date.now()) => {
  for (const [key, value] of executionCache.entries()) {
    if (now - value.savedAt > executionCacheTtlMs) {
      executionCache.delete(key);
    }
  }
};

const readMemoryExecutionResult = (input: {
  idempotencyKey: string;
  actorId: string;
  planId: string;
  planHash: string;
}) => {
  const cached = executionCache.get(input.idempotencyKey);
  if (!cached) return null;
  if (
    cached.actorId !== input.actorId ||
    cached.planId !== input.planId ||
    cached.planHash !== input.planHash
  ) {
    throw new Error("assistant_action_idempotency_conflict");
  }
  return cached.result;
};

const countExecutionOperations = (items: AssistantActionExecutionItem[]) =>
  items.reduce(
    (summary, item) => {
      if (item.status === "failed") {
        summary.failed += 1;
        return summary;
      }
      if (item.operation === "create") summary.create += 1;
      if (item.operation === "update") summary.update += 1;
      if (item.operation === "delete") summary.delete += 1;
      if (item.operation === "noop") summary.noop += 1;
      return summary;
    },
    {
      create: 0,
      update: 0,
      delete: 0,
      noop: 0,
      failed: 0,
    }
  );

const hasCuratedMediaUrl = (value: unknown): boolean => {
  if (isCuratedMediaUrl(value)) return true;
  if (Array.isArray(value)) return value.some((item) => hasCuratedMediaUrl(item));
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some((item) => hasCuratedMediaUrl(item));
};

const reconcileLaunchReadinessAfterExecution = (
  plan: AssistantActionPlan,
  results: AssistantActionExecutionItem[]
): AssistantActionPlan => {
  const metadata = plan.metadata;
  const launchReadiness = metadata?.launchReadiness;
  if (!launchReadiness) return plan;

  const successfulActionIds = new Set(
    results.filter((result) => result.status === "success").map((result) => result.actionId)
  );
  const successfulActions = plan.actions.filter((action) => successfulActionIds.has(action.id));
  const successfulSiteKitInstall = results.some(
    (result) =>
      result.type === "site-kit.install" &&
      result.status === "success" &&
      result.details?.siteKit?.validation?.status === "ok"
  );
  const successfulTypeCount = (type: AssistantPlannedAction["type"]) =>
    successfulActions.filter((action) => action.type === type).length;
  const successfulPages = new Set(
    successfulActions
      .filter((action) => action.type === "page.upsert")
      .map((action) => (action.type === "page.upsert" ? action.input.slug : null))
      .filter((slug): slug is string => Boolean(slug))
  );
  const successfulSampleCounts = successfulActions.reduce<Record<string, number>>((acc, action) => {
    if (action.type !== "entry.sample.create") return acc;
    acc[action.input.contentTypeSlug] = (acc[action.input.contentTypeSlug] ?? 0) + 1;
    return acc;
  }, {});
  const successfulPageSeoCount = successfulActions.filter(
    (action) => action.type === "seo.document.upsert" && action.input.targetType === "page"
  ).length;
  const successfulEntrySamplesWithSeo = successfulActions.filter(
    (action) => action.type === "entry.sample.create" && action.input.seo
  ).length;
  const successfulPagesWithCuratedMedia = successfulActions.filter(
    (action) => action.type === "page.upsert" && hasCuratedMediaUrl(action.input.sections)
  );
  const successfulCuratedMediaPageSlugs = new Set(
    successfulPagesWithCuratedMedia
      .map((action) => (action.type === "page.upsert" ? action.input.slug : null))
      .filter((slug): slug is string => Boolean(slug))
  );
  const plannedPagesWithCuratedMedia = plan.actions.filter(
    (action) => action.type === "page.upsert" && hasCuratedMediaUrl(action.input.sections)
  );
  const successfulEntrySamplesWithCuratedMedia = successfulActions.filter(
    (action) =>
      action.type === "entry.sample.create" && hasCuratedMediaUrl(action.input.values.coverImageUrl)
  );
  const successfulCuratedSampleCounts = successfulEntrySamplesWithCuratedMedia.reduce<
    Record<string, number>
  >((acc, action) => {
    if (action.type !== "entry.sample.create") return acc;
    acc[action.input.contentTypeSlug] = (acc[action.input.contentTypeSlug] ?? 0) + 1;
    return acc;
  }, {});
  const plannedEntrySamplesWithCuratedMedia = plan.actions.filter(
    (action) =>
      action.type === "entry.sample.create" && hasCuratedMediaUrl(action.input.values.coverImageUrl)
  );
  const plannedCuratedSampleCounts = plannedEntrySamplesWithCuratedMedia.reduce<
    Record<string, number>
  >((acc, action) => {
    if (action.type !== "entry.sample.create") return acc;
    acc[action.input.contentTypeSlug] = (acc[action.input.contentTypeSlug] ?? 0) + 1;
    return acc;
  }, {});
  const allRequiredPagesSatisfied = launchReadiness.requiredPages.every((slug) =>
    successfulPages.has(slug)
  );
  const allSampleMinimumsSatisfied = Object.entries(launchReadiness.minimumPublishedEntries).every(
    ([contentTypeSlug, minimum]) => (successfulSampleCounts[contentTypeSlug] ?? 0) >= minimum
  );
  const catalogCount = launchReadiness.requiredCatalogs.length;
  const allCatalogResourcesSatisfied =
    successfulTypeCount("content-type.upsert") >= catalogCount &&
    successfulTypeCount("detail-page.upsert") >= catalogCount &&
    successfulTypeCount("setting.content-route.upsert") >= catalogCount &&
    successfulTypeCount("listing-query.upsert") >= catalogCount &&
    successfulTypeCount("listing-template.upsert") >= catalogCount;
  const navigationSatisfied =
    successfulTypeCount("menu.upsert") >= 2 &&
    successfulTypeCount("menu.item.upsert") >= launchReadiness.requiredPages.length * 2;
  const seoSatisfied =
    successfulPageSeoCount >= launchReadiness.requiredPages.length &&
    successfulEntrySamplesWithSeo >=
      Object.values(launchReadiness.minimumPublishedEntries).reduce(
        (sum, minimum) => sum + minimum,
        0
      );
  const requiredMediaPages = launchReadiness.requiredMediaPages ?? [];
  const requiredMediaPagesSatisfied =
    requiredMediaPages.length > 0 &&
    requiredMediaPages.every((slug) => successfulCuratedMediaPageSlugs.has(slug));
  const allCuratedMediaPagesSatisfied =
    requiredMediaPagesSatisfied &&
    plannedPagesWithCuratedMedia.every((action) => successfulActionIds.has(action.id));
  const allCuratedMediaSamplesSatisfied =
    Object.entries(launchReadiness.minimumPublishedEntries).every(
      ([contentTypeSlug, minimum]) =>
        (plannedCuratedSampleCounts[contentTypeSlug] ?? 0) >= minimum &&
        (successfulCuratedSampleCounts[contentTypeSlug] ?? 0) >= minimum
    ) && plannedEntrySamplesWithCuratedMedia.every((action) => successfulActionIds.has(action.id));
  const mediaSatisfied =
    allCuratedMediaPagesSatisfied &&
    allCuratedMediaSamplesSatisfied &&
    successfulPagesWithCuratedMedia.length === plannedPagesWithCuratedMedia.length;

  const checks = launchReadiness.checks.map((check) => {
    if (check.status === "gated") return check;
    const satisfied = successfulSiteKitInstall
      ? check.id !== "media"
      : check.id === "pages"
        ? allRequiredPagesSatisfied
        : check.id === "catalogs"
          ? allCatalogResourcesSatisfied
          : check.id === "public-content"
            ? allSampleMinimumsSatisfied
            : check.id === "navigation-footer"
              ? navigationSatisfied
              : check.id === "seo"
                ? seoSatisfied
                : check.id === "media"
                  ? mediaSatisfied
                  : false;
    return {
      ...check,
      status: satisfied ? ("satisfied" as const) : ("pending_execute" as const),
    };
  });

  return {
    ...plan,
    metadata: {
      ...metadata,
      launchReadiness: {
        ...launchReadiness,
        checks,
      },
    },
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readCatalogBlockSource = (page: unknown) => {
  if (!isRecord(page)) return null;
  const sourceData = isRecord(page.currentData)
    ? page.currentData
    : isRecord(page.publishedData)
      ? page.publishedData
      : null;
  if (!sourceData) return null;
  const sections = Array.isArray(sourceData.sections) ? sourceData.sections : [];
  const blocks = sections.flatMap((section) =>
    isRecord(section) && Array.isArray(section.blocks) ? section.blocks : []
  );

  for (const block of blocks) {
    if (!isRecord(block)) continue;
    const props = isRecord(block.props) ? block.props : {};
    const listingQueryId = readString(props.queryId) ?? readString(props.listingQueryId);
    const listingTemplateId = readString(props.templateId) ?? readString(props.listingTemplateId);
    if (!listingQueryId && !listingTemplateId) continue;
    return { listingQueryId, listingTemplateId };
  }

  return null;
};

const readStoredPageCollectionLink = (page: unknown) => {
  if (!isRecord(page)) return null;
  const sourceData = isRecord(page.currentData)
    ? page.currentData
    : isRecord(page.publishedData)
      ? page.publishedData
      : null;
  if (!sourceData) return null;
  const settings = isRecord(sourceData.settings) ? sourceData.settings : {};
  return normalizePageCollectionLink(settings.collectionLink) ?? null;
};

const readPageCatalogSource = (page: unknown) => {
  const stored = readStoredPageCollectionLink(page);
  const blocks = readCatalogBlockSource(page);
  if (!stored && !blocks) return null;
  return {
    listingQueryId: stored?.listingQueryId ?? blocks?.listingQueryId ?? null,
    listingTemplateId: stored?.listingTemplateId ?? blocks?.listingTemplateId ?? null,
    contentTypeId: stored?.contentTypeId ?? null,
  };
};

const readFormEmbedSource = (page: unknown) => {
  if (!isRecord(page)) return null;
  const sourceData = isRecord(page.currentData)
    ? page.currentData
    : isRecord(page.publishedData)
      ? page.publishedData
      : null;
  if (!sourceData) return null;
  const sections = Array.isArray(sourceData.sections) ? sourceData.sections : [];
  const blocks = sections.flatMap((section) =>
    isRecord(section) && Array.isArray(section.blocks) ? section.blocks : []
  );

  for (const block of blocks) {
    if (!isRecord(block)) continue;
    if (block.type !== "form") continue;
    const props = isRecord(block.props) ? block.props : {};
    const formId = readString(props.formId);
    if (formId) return { formId };
  }

  return null;
};

type ListingResourceReferenceTarget = {
  listingQueryId?: string | null;
  listingTemplateId?: string | null;
};

type ListingResourceReference = {
  containerType: "page" | "widget-template";
  containerId: string;
  containerName: string;
  adminHref: string;
};

const valueReferencesListingResource = (value: unknown, target: ListingResourceReferenceTarget) => {
  const visited = new WeakSet<object>();
  let inspected = 0;
  const maxInspected = 5_000;

  const walk = (node: unknown): boolean => {
    inspected += 1;
    if (inspected > maxInspected) return false;
    if (!node || typeof node !== "object") return false;
    if (visited.has(node)) return false;
    visited.add(node);

    if (Array.isArray(node)) {
      return node.some(walk);
    }

    const record = node as Record<string, unknown>;
    const listingQueryId = readString(record.listingQueryId);
    const listingTemplateId = readString(record.listingTemplateId);
    if (target.listingQueryId && listingQueryId === target.listingQueryId) return true;
    if (target.listingTemplateId && listingTemplateId === target.listingTemplateId) return true;

    return Object.values(record).some(walk);
  };

  return walk(value);
};

const collectListingResourceReferences = async (
  target: ListingResourceReferenceTarget,
  deps: ActionExecutorDeps
) => {
  const references: ListingResourceReference[] = [];
  const pages = await deps.listPages();
  const pageRecords = await Promise.all(pages.map((page) => deps.getPage(page.id)));
  for (const page of pageRecords) {
    if (!page) continue;
    const currentData = isRecord(page.currentData) ? page.currentData : null;
    const publishedData = isRecord(page.publishedData) ? page.publishedData : null;
    if (
      valueReferencesListingResource(currentData, target) ||
      valueReferencesListingResource(publishedData, target)
    ) {
      references.push({
        containerType: "page",
        containerId: page.id,
        containerName: page.title,
        adminHref: `/admin/pages/${encodeURIComponent(page.id)}`,
      });
    }
  }

  const widgetTemplates = await deps.listWidgetTemplates();
  for (const template of widgetTemplates) {
    if (
      valueReferencesListingResource(template.blocks, target) ||
      valueReferencesListingResource(template.settings, target)
    ) {
      references.push({
        containerType: "widget-template",
        containerId: template.id,
        containerName: template.name,
        adminHref: `/admin/advanced/widgets/templates/${encodeURIComponent(template.id)}`,
      });
    }
  }

  return references;
};

const formatListingReferenceSummary = (references: ListingResourceReference[]) => {
  const pageCount = references.filter((entry) => entry.containerType === "page").length;
  const templateCount = references.filter(
    (entry) => entry.containerType === "widget-template"
  ).length;
  return [
    pageCount > 0 ? `${pageCount} page${pageCount === 1 ? "" : "s"}` : null,
    templateCount > 0 ? `${templateCount} widget template${templateCount === 1 ? "" : "s"}` : null,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" and ");
};

const buildCatalogPageData = (input: {
  introTitle: string;
  introBody: string;
  sections?: PageSectionV2[];
  listingQueryId: string;
  listingTemplateId: string;
  ctaLabel: string;
  contentListStyle?: {
    columns?: "1" | "2" | "3";
    cardStyle?: "outlined" | "elevated" | "minimal";
  };
  listingFilters?: {
    title: string;
    description: string;
    autoApply: boolean;
    showSearch: boolean;
    searchPlaceholder: string;
    searchLabel: string;
    applyLabel: string;
    facets: Array<Record<string, unknown>>;
  } | null;
  formEmbed?: {
    formId: string;
    title: string;
    description: string;
    submitLabel: string;
    successMessage: string;
  } | null;
  collectionLink?: PageCollectionLink | null;
}) =>
  composeBlueprintPageData({
    introTitle: input.introTitle,
    introBody: input.introBody,
    sections: input.sections,
    listingQueryId: input.listingQueryId,
    listingTemplateId: input.listingTemplateId,
    ctaLabel: input.ctaLabel,
    contentListStyle: input.contentListStyle,
    listingFilters: input.listingFilters,
    formEmbed: input.formEmbed,
    collectionLink: input.collectionLink,
  });

const buildSimplePageData = (input: {
  introTitle: string;
  introBody: string;
  sections?: PageSectionV2[];
  formEmbed?: {
    formId: string;
    title: string;
    description: string;
    submitLabel: string;
    successMessage: string;
  } | null;
  collectionLink?: PageCollectionLink | null;
}) =>
  composeBlueprintPageData({
    introTitle: input.introTitle,
    introBody: input.introBody,
    sections: input.sections,
    formEmbed: input.formEmbed,
    collectionLink: input.collectionLink,
  });

const readListingQueryContentTypeId = (listingQuery: unknown) => {
  if (!isRecord(listingQuery)) return null;
  const query = isRecord(listingQuery.query) ? listingQuery.query : {};
  const sourceConfig = isRecord(query.sourceConfig) ? query.sourceConfig : {};
  return readString(sourceConfig.contentTypeId);
};

const resolveAssistantPageCollectionLink = async (input: {
  action: AssistantPageUpsertAction;
  existing: unknown;
  simplePageMode: boolean;
  listingQuery: unknown;
  listingTemplate: unknown;
  deps: Pick<ActionExecutorDeps, "getContentTypeBySlug">;
}): Promise<PageCollectionLink | null> => {
  const existingCollectionLink = readStoredPageCollectionLink(input.existing);
  const requested = input.action.input.collectionLink;

  if (!requested) {
    if (existingCollectionLink) return existingCollectionLink;
    if (input.simplePageMode) return null;

    const contentTypeId = readListingQueryContentTypeId(input.listingQuery);
    if (!contentTypeId) return null;

    return {
      contentTypeId,
      pageRole: "canonical-list-page",
      ...(isRecord(input.listingQuery) && typeof input.listingQuery.id === "string"
        ? { listingQueryId: input.listingQuery.id }
        : {}),
      ...(isRecord(input.listingTemplate) && typeof input.listingTemplate.id === "string"
        ? { listingTemplateId: input.listingTemplate.id }
        : {}),
    };
  }

  const requestedContentTypeId = readString(requested.contentTypeId);
  const requestedContentTypeSlug = readString(requested.contentTypeSlug);
  const requestedListingQueryId = readString(requested.listingQueryId);
  const requestedListingTemplateId = readString(requested.listingTemplateId);
  const requestedListingQueryName = readString(requested.listingQueryName);
  const requestedListingTemplateSlug = readString(requested.listingTemplateSlug);
  const resolvedListingQueryId =
    isRecord(input.listingQuery) && typeof input.listingQuery.id === "string"
      ? input.listingQuery.id
      : null;
  const resolvedListingTemplateId =
    isRecord(input.listingTemplate) && typeof input.listingTemplate.id === "string"
      ? input.listingTemplate.id
      : null;
  if (requestedListingQueryId && !input.listingQuery) {
    throw new Error("assistant_action_dependency_missing");
  }
  if (requestedListingTemplateId && !input.listingTemplate) {
    throw new Error("assistant_action_dependency_missing");
  }
  if (requestedListingQueryName && !input.listingQuery) {
    throw new Error("assistant_action_dependency_missing");
  }
  if (requestedListingTemplateSlug && !input.listingTemplate) {
    throw new Error("assistant_action_dependency_missing");
  }
  if (
    requestedListingQueryId &&
    resolvedListingQueryId &&
    requestedListingQueryId !== resolvedListingQueryId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  if (
    requestedListingTemplateId &&
    resolvedListingTemplateId &&
    requestedListingTemplateId !== resolvedListingTemplateId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const requestedContentType =
    !requestedContentTypeId && requestedContentTypeSlug
      ? await input.deps.getContentTypeBySlug(requestedContentTypeSlug)
      : null;
  const requestedResolvedContentTypeId = requestedContentTypeId ?? requestedContentType?.id ?? null;
  const listingQueryContentTypeId = readListingQueryContentTypeId(input.listingQuery);
  if (
    requestedResolvedContentTypeId &&
    listingQueryContentTypeId &&
    requestedResolvedContentTypeId !== listingQueryContentTypeId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const contentTypeId =
    requestedResolvedContentTypeId ??
    listingQueryContentTypeId ??
    existingCollectionLink?.contentTypeId ??
    null;
  if (!contentTypeId) {
    throw new Error("assistant_action_dependency_missing");
  }

  const compositionKey = requested.compositionKey ?? existingCollectionLink?.compositionKey ?? null;

  return {
    contentTypeId,
    pageRole: requested.pageRole,
    ...(compositionKey ? { compositionKey } : {}),
    ...(requestedListingQueryId
      ? { listingQueryId: requestedListingQueryId }
      : resolvedListingQueryId
        ? { listingQueryId: resolvedListingQueryId }
        : existingCollectionLink?.listingQueryId
          ? { listingQueryId: existingCollectionLink.listingQueryId }
          : {}),
    ...(requestedListingTemplateId
      ? { listingTemplateId: requestedListingTemplateId }
      : resolvedListingTemplateId
        ? { listingTemplateId: resolvedListingTemplateId }
        : existingCollectionLink?.listingTemplateId
          ? { listingTemplateId: existingCollectionLink.listingTemplateId }
          : {}),
  };
};

type ActionExecutorDeps = {
  getSetting: typeof getSetting;
  setSetting: typeof setSetting;
  getContentType: typeof getContentType;
  getContentTypeBySlug: (slug: string) => Promise<ContentTypeRecord | null>;
  getDetailPageDocument: typeof getDetailPageDocument;
  prepareDetailPageDocumentUpsert: typeof prepareDetailPageDocumentUpsert;
  upsertDetailPageDocument: typeof upsertDetailPageDocument;
  createContentType: (input: CreateContentTypeInput) => Promise<ContentTypeRecord>;
  deleteContentType: (id: string) => Promise<ContentTypeRecord | null>;
  updateContentType: (
    id: string,
    input: UpdateContentTypeInput
  ) => Promise<ContentTypeRecord | null>;
  listCustomScreens: typeof listCustomScreens;
  createCustomScreen: typeof createCustomScreen;
  updateCustomScreen: typeof updateCustomScreen;
  getCustomScreen: typeof getCustomScreen;
  deleteCustomScreen: typeof deleteCustomScreen;
  listListingQueries: typeof listListingQueries;
  createListingQuery: typeof createListingQuery;
  deleteListingQuery: typeof deleteListingQuery;
  updateListingQuery: typeof updateListingQuery;
  listListingTemplates: typeof listListingTemplates;
  createListingTemplate: typeof createListingTemplate;
  deleteListingTemplate: typeof deleteListingTemplate;
  updateListingTemplate: typeof updateListingTemplate;
  getPageBySlug: typeof getPageBySlug;
  getPage: typeof getPage;
  listPages: typeof listPages;
  createPage: typeof createPage;
  deletePage: typeof deletePage;
  updatePage: typeof updatePage;
  publishPage: typeof publishPage;
  unpublishPage: typeof unpublishPage;
  getWidgetTemplate: typeof getWidgetTemplate;
  listWidgetTemplates: typeof listWidgetTemplates;
  deleteWidgetTemplate: typeof deleteWidgetTemplate;
  updateWidgetTemplate: typeof updateWidgetTemplate;
  getForm: typeof getForm;
  listForms: typeof listForms;
  countFormSubmissions: typeof countFormSubmissions;
  createForm: typeof createForm;
  deleteForm: typeof deleteForm;
  updateForm: typeof updateForm;
  setFormFields: typeof setFormFields;
  listFormActions: typeof listFormActions;
  setFormActions: typeof setFormActions;
  getEntryBySlug: typeof getEntryBySlug;
  createEntry: typeof createEntry;
  deleteEntry: typeof deleteEntry;
  updateEntry: typeof updateEntry;
  publishEntry: typeof publishEntry;
  updateEntryMetadata: typeof updateEntryMetadata;
  getEntry: typeof getEntry;
  listMenus: typeof listMenus;
  createMenu: typeof createMenu;
  updateMenu: typeof updateMenu;
  deleteMenuItem: typeof deleteMenuItem;
  listMenuItems: typeof listMenuItems;
  replaceMenuItems: typeof replaceMenuItems;
  getSeoDocument: typeof getSeoDocument;
  deleteSeoDocument: typeof deleteSeoDocument;
  getSeoDocumentByTarget: typeof getSeoDocumentByTarget;
  updateSeoDocumentById: typeof updateSeoDocumentById;
  upsertSeoDocument: typeof upsertSeoDocument;
  getMediaById: typeof getMediaById;
  logAudit: typeof logAudit;
  previewSiteKitPlan: typeof previewGuidedSiteBuilderPlan;
  executeSiteKit: typeof executeGuidedSiteBuilder;
  validateSiteKitRun: typeof validateGuidedSiteBuilderRun;
  getExecutionResult?: typeof getAssistantActionExecutionByIdempotencyKey;
  saveExecutionResult?: typeof saveAssistantActionExecutionResult;
};

type CustomScreenRecord = Awaited<ReturnType<ActionExecutorDeps["listCustomScreens"]>>[number];
type ListingQueryRecord = Awaited<ReturnType<ActionExecutorDeps["listListingQueries"]>>[number];

const findListingQueryNameMatches = async (
  name: string,
  deps: ActionExecutorDeps
): Promise<ListingQueryRecord[]> =>
  (await deps.listListingQueries()).filter((entry) => entry.name === name);

const listingQueryNameConflict = (
  name: string
): AssistantActionPreviewChange["conflicts"][number] => ({
  code: "assistant_action_dependency_conflict",
  severity: "error",
  message: `Listing query name "${name}" is not unique. Re-run planning with an exact listing query id before updating it.`,
});

const defaultDeps: ActionExecutorDeps = {
  getSetting,
  setSetting,
  getContentType,
  getContentTypeBySlug,
  getDetailPageDocument,
  prepareDetailPageDocumentUpsert,
  upsertDetailPageDocument,
  createContentType,
  deleteContentType,
  updateContentType,
  listCustomScreens,
  createCustomScreen,
  updateCustomScreen,
  getCustomScreen,
  deleteCustomScreen,
  listListingQueries,
  createListingQuery,
  deleteListingQuery,
  updateListingQuery,
  listListingTemplates,
  createListingTemplate,
  deleteListingTemplate,
  updateListingTemplate,
  getPageBySlug,
  getPage,
  listPages,
  createPage,
  deletePage,
  updatePage,
  publishPage,
  unpublishPage,
  getWidgetTemplate,
  listWidgetTemplates,
  deleteWidgetTemplate,
  updateWidgetTemplate,
  getForm,
  listForms,
  countFormSubmissions,
  createForm,
  deleteForm,
  updateForm,
  setFormFields,
  listFormActions,
  setFormActions,
  getEntryBySlug,
  createEntry,
  deleteEntry,
  updateEntry,
  publishEntry,
  updateEntryMetadata,
  getEntry,
  listMenus,
  createMenu,
  updateMenu,
  deleteMenuItem,
  listMenuItems,
  replaceMenuItems,
  getSeoDocument,
  deleteSeoDocument,
  getSeoDocumentByTarget,
  updateSeoDocumentById,
  upsertSeoDocument,
  getMediaById,
  logAudit,
  previewSiteKitPlan: previewGuidedSiteBuilderPlan,
  executeSiteKit: executeGuidedSiteBuilder,
  validateSiteKitRun: validateGuidedSiteBuilderRun,
  getExecutionResult: getAssistantActionExecutionByIdempotencyKey,
  saveExecutionResult: saveAssistantActionExecutionResult,
};

const findExistingCustomScreenForUpsert = async (
  action: AssistantCustomScreenUpsertAction,
  deps: ActionExecutorDeps
): Promise<{
  contentType: ContentTypeRecord | null;
  existing: CustomScreenRecord | null;
  conflicts: AssistantActionPreviewChange["conflicts"];
}> => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  if (!contentType) {
    return { contentType: null, existing: null, conflicts: [] };
  }

  const role = action.input.collectionRole ?? null;
  const compositionKey = action.input.compositionKey ?? null;
  const screens = (await deps.listCustomScreens()).filter(
    (entry) => entry.contentTypeId === contentType.id
  );
  const metadataCandidates = role
    ? screens.filter(
        (entry) =>
          entry.collectionRole === role && (entry.compositionKey ?? null) === compositionKey
      )
    : [];
  const nameCandidates = screens.filter((entry) => entry.name === action.input.name);
  const legacyNameCandidates = role
    ? nameCandidates.filter(
        (entry) => entry.collectionRole === null && (entry.compositionKey ?? null) === null
      )
    : nameCandidates;
  const hasConflictingMetadataName =
    role &&
    metadataCandidates.length === 0 &&
    nameCandidates.length !== legacyNameCandidates.length;
  const candidates =
    metadataCandidates.length > 0
      ? metadataCandidates
      : hasConflictingMetadataName
        ? []
        : legacyNameCandidates;

  if (hasConflictingMetadataName) {
    return {
      contentType,
      existing: null,
      conflicts: [
        {
          code: "assistant_action_dependency_conflict",
          severity: "error",
          message: `Custom screen "${action.input.name}" already belongs to another composition; choose the exact collection screen before composing an update.`,
        },
      ],
    };
  }

  if (candidates.length > 1) {
    return {
      contentType,
      existing: null,
      conflicts: [
        {
          code: "assistant_action_dependency_conflict",
          severity: "error",
          message: `Custom screen target for "${action.input.name}" is ambiguous; choose the exact collection screen before composing an update.`,
        },
      ],
    };
  }

  return {
    contentType,
    existing: candidates[0] ?? null,
    conflicts: [],
  };
};

const assertAssistantActionPlan = (value: unknown): AssistantActionPlan => {
  if (!isAssistantActionPlan(value)) {
    throw new Error("assistant_action_plan_invalid");
  }
  return value;
};

const buildContentRoutePreview = async (
  action: AssistantContentRouteUpsertAction,
  deps: ActionExecutorDeps
) => {
  const current = ((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
  const existing = current.find((entry) => entry.type === action.input.typeSlug) ?? null;
  const nextValue = buildContentRouteRecord(existing, action.input);
  const warnings =
    action.input.listPath !== normalizeSitePath(action.input.detailPath.replace("/:slug", ""))
      ? [
          "The public catalog page stays separate from the system list route so custom page content is not shadowed by runtime list routing.",
        ]
      : [];

  return createPreviewChange({
    action,
    targetType: "content-route",
    targetKey: action.input.typeSlug,
    summary: `${existing ? "Update" : "Create"} content route ${action.input.detailPath}`,
    warnings,
    beforeValue: existing,
    nextValue,
  });
};

const buildContentTypePreview = async (
  action: AssistantContentTypeUpsertAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  return createPreviewChange({
    action,
    targetType: "content-type",
    targetKey: action.input.slug,
    summary: `${existing ? "Update" : "Create"} content type "${action.input.name}"`,
    beforeValue: existing
      ? {
          name: existing.name,
          slug: existing.slug,
          schema: existing.schema,
        }
      : null,
    nextValue: action.input,
  });
};

const buildContentTypeFieldAddPreview = async (
  action: AssistantContentTypeFieldAddAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  const matches = existing?.id === action.input.id && existing.name === action.input.name;
  let nextSchema: Record<string, unknown> | null = null;
  const conflicts: AssistantActionPreviewChange["conflicts"] = [];
  if (!existing || !matches) {
    conflicts.push({
      code: "assistant_action_dependency_missing",
      severity: "error",
      message: existing
        ? "Content type no longer matches the planned field-add target."
        : "Content type was not found.",
    });
  } else {
    try {
      nextSchema = mergeContentTypeSchemaFields(
        existing.schema as Record<string, unknown>,
        action.input.fields
      );
    } catch (error) {
      conflicts.push({
        code: "assistant_action_dependency_conflict",
        severity: "error",
        message:
          error instanceof Error && error.message === "content_type_field_conflict"
            ? "One or more planned fields already exist on this content type."
            : "Planned fields cannot be merged into the current content type schema.",
      });
    }
  }

  return createPreviewChange({
    action,
    targetType: "content-type",
    targetKey: action.input.slug,
    operation: "update",
    summary: `Add ${action.input.fields.length} field(s) to content type "${action.input.name}"`,
    conflicts,
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
          schema: existing.schema,
        }
      : null,
    nextValue:
      existing && nextSchema
        ? {
            id: existing.id,
            name: existing.name,
            slug: existing.slug,
            schema: nextSchema,
          }
        : null,
  });
};

const buildContentTypeDeletePreview = async (
  action: AssistantContentTypeDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  const matches = existing?.id === action.input.id && existing.name === action.input.name;
  const entryCount = Math.max(0, Math.floor(action.input.expectedEntryCount ?? 0));
  return createPreviewChange({
    action,
    targetType: "content-type",
    targetKey: action.input.slug,
    operation: "delete",
    summary: `Delete content type "${action.input.name}"`,
    warnings:
      entryCount > 0
        ? [`This content type has ${entryCount} entries and cannot be safely deleted alone.`]
        : [],
    conflicts:
      existing && matches && entryCount === 0
        ? []
        : [
            {
              code:
                entryCount > 0
                  ? "assistant_action_dependency_conflict"
                  : "assistant_action_dependency_missing",
              severity: "error",
              message:
                entryCount > 0
                  ? "Content type still has entries and needs a broader reviewed delete plan."
                  : existing
                    ? "Content type no longer matches the planned delete target."
                    : "Content type was not found.",
            },
          ],
    beforeValue: existing ? { id: existing.id, name: existing.name, slug: existing.slug } : null,
    nextValue: null,
  });
};

const buildCustomScreenPreview = async (
  action: AssistantCustomScreenUpsertAction,
  deps: ActionExecutorDeps
) => {
  const { contentType, existing, conflicts } = await findExistingCustomScreenForUpsert(
    action,
    deps
  );
  const existingDefinition = existing
    ? normalizeCustomScreenDefinitionForRead({
        definition: existing.definition,
        schemaVersion: existing.schemaVersion,
        blocks: existing.blocks,
        bindings: existing.bindings,
      })
    : null;
  const comparableExisting = existing
    ? {
        name: existing.name,
        contentTypeSlug: action.input.contentTypeSlug,
        status: existing.status,
        collectionRole: existing.collectionRole ?? null,
        compositionKey: existing.compositionKey ?? null,
        showInSidebar: existing.showInSidebar,
        sidebarLabel: existing.sidebarLabel,
        blocks: existingDefinition
          ? getCustomScreenEditorViewBlocks(existingDefinition)
          : existing.blocks,
        bindings: existingDefinition
          ? getCustomScreenEditorViewBindings(existingDefinition)
          : existing.bindings,
      }
    : null;
  const nextValue = {
    ...action.input,
    collectionRole: action.input.collectionRole ?? null,
    compositionKey: action.input.compositionKey ?? null,
  };

  return createPreviewChange({
    action,
    targetType: "custom-screen",
    targetKey: action.input.name,
    summary: `${existing ? "Update" : "Create"} custom screen "${action.input.name}"`,
    warnings: contentType
      ? []
      : ["The content type does not exist yet and will be created earlier in the plan."],
    conflicts,
    beforeValue: comparableExisting,
    nextValue,
  });
};

const buildCustomScreenDeletePreview = async (
  action: AssistantCustomScreenDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getCustomScreen(action.input.id);
  const nameMatches = existing?.name === action.input.name;
  const prefix = action.input.expectedNamePrefix?.trim() ?? "";
  const prefixMatches =
    !prefix || existing?.name.toLowerCase().startsWith(prefix.toLowerCase()) === true;
  const conflicts =
    existing && nameMatches && prefixMatches
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error" as const,
            message: existing
              ? "Custom screen no longer matches the planned delete target."
              : "Custom screen was not found.",
          },
        ];

  return createPreviewChange({
    action,
    targetType: "custom-screen",
    targetKey: action.input.name,
    operation: "delete",
    summary: `Delete custom screen "${action.input.name}"`,
    warnings:
      existing?.showInSidebar === true
        ? ["This active custom screen is shown in the Coderso sidebar."]
        : [],
    conflicts,
    beforeValue: existing,
    nextValue: null,
  });
};

const findCustomScreenBinding = (
  bindings: CustomScreenBinding[],
  target: NonNullable<AssistantCustomScreenUpdateAction["input"]["patch"]["binding"]>
) =>
  bindings.find(
    (binding) =>
      binding.widgetId === target.widgetId &&
      binding.propPath === target.propPath &&
      binding.field === target.field
  ) ?? null;

const applyCustomScreenUpdatePatch = (
  existing: Awaited<ReturnType<typeof getCustomScreen>>,
  patch: AssistantCustomScreenUpdateAction["input"]["patch"]
) => {
  if (!existing) return null;
  const bindings = [...existing.bindings];
  if (patch.binding) {
    const index = bindings.findIndex(
      (binding) =>
        binding.widgetId === patch.binding?.widgetId &&
        binding.propPath === patch.binding?.propPath &&
        binding.field === patch.binding?.field
    );
    if (index < 0) return null;
    bindings[index] = {
      ...bindings[index]!,
      mode: patch.binding.mode,
    };
  }
  return {
    name: patch.name ?? existing.name,
    status: patch.status ?? existing.status,
    collectionRole:
      patch.collectionRole !== undefined ? patch.collectionRole : existing.collectionRole,
    compositionKey:
      patch.compositionKey !== undefined ? patch.compositionKey : existing.compositionKey,
    showInSidebar: patch.showInSidebar !== undefined ? patch.showInSidebar : existing.showInSidebar,
    sidebarLabel: patch.sidebarLabel !== undefined ? patch.sidebarLabel : existing.sidebarLabel,
    bindings,
  };
};

const buildCustomScreenUpdatePreview = async (
  action: AssistantCustomScreenUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getCustomScreen(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedContentTypeId = action.input.expectedContentTypeId?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    (!expectedStatus || existing.status === expectedStatus) &&
    (!expectedContentTypeId || existing.contentTypeId === expectedContentTypeId);
  const binding =
    existing && action.input.patch.binding
      ? findCustomScreenBinding(existing.bindings, action.input.patch.binding)
      : null;
  const nextValue =
    existing && matches ? applyCustomScreenUpdatePatch(existing, action.input.patch) : null;
  const conflictMessage =
    existing && matches && action.input.patch.binding && !binding
      ? "Custom screen binding target was not found."
      : existing
        ? "Custom screen no longer matches the planned update target."
        : "Custom screen was not found.";

  return createPreviewChange({
    action,
    targetType: "custom-screen",
    targetKey: action.input.name,
    summary: `Update custom screen "${action.input.name}"`,
    conflicts:
      existing && matches && nextValue
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: conflictMessage,
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          status: existing.status,
          showInSidebar: existing.showInSidebar,
          sidebarLabel: existing.sidebarLabel,
          bindings: existing.bindings.map((item) => ({
            widgetId: item.widgetId,
            propPath: item.propPath,
            field: item.field,
            mode: item.mode,
          })),
        }
      : null,
    nextValue,
  });
};

const buildCustomScreenWidgetPatchPreview = async (
  action: AssistantCustomScreenWidgetPatchAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getCustomScreen(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const matches =
    existing?.name === action.input.name && (!expectedStatus || existing.status === expectedStatus);
  const patch =
    existing && matches
      ? applyPageWidgetDataPatch(existing.blocks, {
          blockId: action.input.blockId,
          expectedBlockType: action.input.expectedBlockType,
          dataPath: action.input.dataPath,
          value: action.input.value,
        })
      : null;
  const conflictMessage =
    patch?.status === "missing_block"
      ? "Selected custom screen widget block was not found."
      : patch?.status === "type_mismatch"
        ? "Selected custom screen widget block type changed."
        : patch?.status === "missing_path"
          ? "Selected custom screen widget block data path does not exist."
          : existing
            ? "Custom screen no longer matches the planned widget patch target."
            : "Custom screen was not found.";

  return createPreviewChange({
    action,
    targetType: "custom-screen",
    targetKey: `${action.input.name}/${action.input.blockId}/${action.input.dataPath.join(".")}`,
    summary: `Patch custom screen block "${action.input.blockId}"`,
    conflicts:
      existing && matches && patch?.status === "ok"
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: conflictMessage,
            },
          ],
    beforeValue:
      existing && patch?.status === "ok"
        ? {
            blockId: action.input.blockId,
            dataPath: action.input.dataPath,
            value: patch.beforeValue,
          }
        : null,
    nextValue:
      existing && patch?.status === "ok"
        ? {
            blockId: action.input.blockId,
            dataPath: action.input.dataPath,
            value: patch.nextValue,
          }
        : null,
  });
};

const buildListingQueryPreview = async (
  action: AssistantListingQueryUpsertAction,
  deps: ActionExecutorDeps
) => {
  const matches = await findListingQueryNameMatches(action.input.name, deps);
  const existing = matches.length === 1 ? matches[0] : null;
  const ambiguousMatches = matches.length > 1;
  return createPreviewChange({
    action,
    targetType: "listing-query",
    targetKey: action.input.name,
    summary: `${matches.length > 0 ? "Update" : "Create"} listing query "${action.input.name}"`,
    conflicts: ambiguousMatches ? [listingQueryNameConflict(action.input.name)] : [],
    beforeValue: ambiguousMatches ? matches : existing,
    nextValue: action.input,
  });
};

const buildListingQueryDeletePreview = async (
  action: AssistantListingQueryDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingQueries()).find((entry) => entry.id === action.input.id) ?? null;
  const matches = existing?.name === action.input.name;
  const references = existing
    ? await collectListingResourceReferences({ listingQueryId: existing.id }, deps)
    : [];
  const referenceSummary = formatListingReferenceSummary(references);

  return createPreviewChange({
    action,
    targetType: "listing-query",
    targetKey: action.input.name,
    operation: "delete",
    summary: `Delete listing query "${action.input.name}"`,
    warnings:
      references.length > 0
        ? [`This listing query is still referenced by ${referenceSummary}.`]
        : [],
    conflicts:
      existing && matches && references.length === 0
        ? []
        : [
            {
              code:
                references.length > 0
                  ? "assistant_action_dependency_conflict"
                  : "assistant_action_dependency_missing",
              severity: "error",
              message:
                references.length > 0
                  ? "Listing query is still referenced by reviewed page or widget template data."
                  : existing
                    ? "Listing query no longer matches the planned delete target."
                    : "Listing query was not found.",
            },
          ],
    beforeValue: existing
      ? { id: existing.id, name: existing.name, description: existing.description }
      : null,
    nextValue: null,
  });
};

const buildListingQueryFiltersPatchPreview = async (
  action: AssistantListingQueryFiltersPatchAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingQueries()).find(
      (entry) => entry.name === action.input.listingQueryName
    ) ?? null;
  const nextQuery = existing
    ? {
        ...existing.query,
        filters: action.input.filters,
      }
    : null;

  return createPreviewChange({
    action,
    targetType: "listing-query",
    targetKey: action.input.listingQueryName,
    summary: `Patch filters for listing query "${action.input.listingQueryName}"`,
    warnings: existing ? [] : ["The listing query does not exist."],
    conflicts: existing
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error",
            message: "Listing query is required before filters can be patched.",
          },
        ],
    beforeValue: existing?.query ?? null,
    nextValue: nextQuery,
  });
};

const buildListingQueryUpdatePreview = async (
  action: AssistantListingQueryUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingQueries()).find((entry) => entry.id === action.input.id) ?? null;
  const nextQuery = existing
    ? {
        ...existing.query,
        sourceConfig: {
          ...(isRecord(existing.query.sourceConfig) ? existing.query.sourceConfig : {}),
          ...(action.input.patch.includeDrafts !== undefined
            ? { includeDrafts: action.input.patch.includeDrafts }
            : {}),
        },
        pagination: {
          ...(isRecord(existing.query.pagination) ? existing.query.pagination : {}),
          ...(action.input.patch.limit !== undefined ? { limit: action.input.patch.limit } : {}),
        },
      }
    : null;
  const nextValue = existing
    ? {
        name: action.input.patch.name ?? existing.name,
        description:
          action.input.patch.description !== undefined
            ? action.input.patch.description
            : existing.description,
        query: nextQuery,
      }
    : null;

  return createPreviewChange({
    action,
    targetType: "listing-query",
    targetKey: action.input.name,
    summary: `Update listing query "${action.input.name}"`,
    conflicts:
      existing && existing.name === action.input.name
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Listing query no longer matches the planned update target."
                : "Listing query was not found.",
            },
          ],
    beforeValue: existing
      ? { name: existing.name, description: existing.description, query: existing.query }
      : null,
    nextValue,
  });
};

const buildListingTemplatePreview = async (
  action: AssistantListingTemplateUpsertAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.slug === action.input.slug) ?? null;
  return createPreviewChange({
    action,
    targetType: "listing-template",
    targetKey: action.input.slug,
    summary: `${existing ? "Update" : "Create"} listing template "${action.input.name}"`,
    beforeValue: existing,
    nextValue: action.input,
  });
};

const buildListingTemplateDeletePreview = async (
  action: AssistantListingTemplateDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.id === action.input.id) ?? null;
  const expectedLayout = action.input.expectedLayout?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    existing.slug === action.input.slug &&
    (!expectedLayout || existing.layout === expectedLayout);
  const references = existing
    ? await collectListingResourceReferences({ listingTemplateId: existing.id }, deps)
    : [];
  const referenceSummary = formatListingReferenceSummary(references);

  return createPreviewChange({
    action,
    targetType: "listing-template",
    targetKey: action.input.slug,
    operation: "delete",
    summary: `Delete listing template "${action.input.name}"`,
    warnings:
      references.length > 0
        ? [`This listing template is still referenced by ${referenceSummary}.`]
        : [],
    conflicts:
      existing && matches && references.length === 0
        ? []
        : [
            {
              code:
                references.length > 0
                  ? "assistant_action_dependency_conflict"
                  : "assistant_action_dependency_missing",
              severity: "error",
              message:
                references.length > 0
                  ? "Listing template is still referenced by reviewed page or widget template data."
                  : existing
                    ? "Listing template no longer matches the planned delete target."
                    : "Listing template was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
          layout: existing.layout,
        }
      : null,
    nextValue: null,
  });
};

const buildListingTemplateCardPatchPreview = async (
  action: AssistantListingTemplateCardPatchAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find(
      (entry) => entry.slug === action.input.listingTemplateSlug
    ) ?? null;
  const nextConfig = existing
    ? {
        ...existing.config,
        card: action.input.card,
      }
    : null;

  return createPreviewChange({
    action,
    targetType: "listing-template",
    targetKey: action.input.listingTemplateSlug,
    summary: `Patch card config for listing template "${action.input.listingTemplateSlug}"`,
    warnings: existing ? [] : ["The listing template does not exist."],
    conflicts: existing
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error",
            message: "Listing template is required before card config can be patched.",
          },
        ],
    beforeValue: existing?.config ?? null,
    nextValue: nextConfig,
  });
};

const buildListingTemplateUpdatePreview = async (
  action: AssistantListingTemplateUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.id === action.input.id) ?? null;
  const expectedLayout = action.input.expectedLayout?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    existing.slug === action.input.slug &&
    (!expectedLayout || existing.layout === expectedLayout);
  const nextConfig =
    existing && action.input.patch.card
      ? {
          ...existing.config,
          card: action.input.patch.card,
        }
      : (existing?.config ?? null);

  return createPreviewChange({
    action,
    targetType: "listing-template",
    targetKey: action.input.slug,
    summary: `Update listing template "${action.input.name}"`,
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Listing template no longer matches the planned update target."
                : "Listing template was not found.",
            },
          ],
    beforeValue: existing,
    nextValue: existing
      ? {
          name: action.input.patch.name ?? existing.name,
          slug: action.input.patch.slug ?? existing.slug,
          description:
            action.input.patch.description !== undefined
              ? action.input.patch.description
              : existing.description,
          layout: action.input.patch.layout ?? existing.layout,
          config: nextConfig,
        }
      : null,
  });
};

const normalizeAssistantPagePatchBlock = (block: WidgetBlock) => {
  ensureRuntimeWidgetsRegistered();
  return normalizeWidgetBlock(block);
};

const buildFormAutomationPreview = async (
  action: AssistantFormAutomationUpsertAction,
  deps: ActionExecutorDeps
) => {
  const form = (await deps.listForms()).find((entry) => entry.id === action.input.formId) ?? null;
  const actions = form ? await deps.listFormActions(action.input.formId) : [];
  const existing = actions.find((entry) => entry.id === action.input.action.id) ?? null;
  const nextActions = existing
    ? actions.map((entry) => (entry.id === action.input.action.id ? action.input.action : entry))
    : [...actions, { ...action.input.action, orderIndex: actions.length }];

  return createPreviewChange({
    action,
    targetType: "form-action",
    targetKey: `${action.input.formId}/${action.input.action.id}`,
    summary: `${existing ? "Update" : "Create"} form automation "${action.input.action.label}"`,
    warnings: form ? [] : ["The form does not exist."],
    conflicts: form
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error",
            message: "Form is required before automation can be updated.",
          },
        ],
    beforeValue: form
      ? {
          actions,
        }
      : null,
    nextValue: form
      ? {
          actions: nextActions,
        }
      : null,
  });
};

const buildFormPreview = async (action: AssistantFormUpsertAction, deps: ActionExecutorDeps) => {
  const existing =
    (await deps.listForms()).find((entry) => entry.slug === action.input.slug) ?? null;
  return createPreviewChange({
    action,
    targetType: "form",
    targetKey: action.input.slug,
    summary: `${existing ? "Update" : "Create"} form "${action.input.name}"`,
    beforeValue: existing,
    nextValue: action.input,
  });
};

const buildFormDeletePreview = async (
  action: AssistantFormDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getForm(action.input.id);
  const submissionCount = existing ? await deps.countFormSubmissions(existing.id) : 0;
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    existing.slug === action.input.slug &&
    (!expectedStatus || existing.status === expectedStatus);

  return createPreviewChange({
    action,
    targetType: "form",
    targetKey: action.input.slug,
    operation: "delete",
    summary: `Delete form "${action.input.name}"`,
    warnings:
      submissionCount > 0
        ? [
            `This form has ${submissionCount} submission${submissionCount === 1 ? "" : "s"} and cannot be safely hard-deleted.`,
          ]
        : [],
    conflicts:
      existing && matches && submissionCount === 0
        ? []
        : [
            {
              code:
                submissionCount > 0
                  ? "assistant_action_dependency_conflict"
                  : "assistant_action_dependency_missing",
              severity: "error",
              message:
                submissionCount > 0
                  ? "Form submissions must be retained; archive the form instead of hard-deleting it."
                  : existing
                    ? "Form no longer matches the planned delete target."
                    : "Form was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
          status: existing.status,
          submissionCount,
        }
      : null,
    nextValue: null,
  });
};

const buildFormArchivePreview = async (
  action: AssistantFormArchiveAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getForm(action.input.id);
  const submissionCount = existing ? await deps.countFormSubmissions(existing.id) : 0;
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    existing.slug === action.input.slug &&
    (!expectedStatus || existing.status === expectedStatus || existing.status === "archived");
  const beforeValue = existing
    ? {
        id: existing.id,
        name: existing.name,
        slug: existing.slug,
        status: existing.status,
        submissionCount,
      }
    : null;
  const nextValue = existing
    ? {
        id: existing.id,
        name: existing.name,
        slug: existing.slug,
        status: "archived",
        submissionCount,
      }
    : null;

  return createPreviewChange({
    action,
    targetType: "form",
    targetKey: action.input.slug,
    summary: `Archive form "${action.input.name}"`,
    warnings:
      submissionCount > 0
        ? ["Existing submissions are retained and submission payloads are not exposed."]
        : [],
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Form no longer matches the planned archive target."
                : "Form was not found.",
            },
          ],
    beforeValue,
    nextValue,
  });
};

const buildFormUpdatePreview = async (
  action: AssistantFormUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getForm(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    existing.slug === action.input.slug &&
    (!expectedStatus || existing.status === expectedStatus);

  return createPreviewChange({
    action,
    targetType: "form",
    targetKey: action.input.slug,
    summary: `Update form "${action.input.name}"`,
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Form no longer matches the planned update target."
                : "Form was not found.",
            },
          ],
    beforeValue: existing,
    nextValue: existing ? { ...existing, ...action.input.patch } : null,
  });
};

const buildEntryUpsertDraftPreview = async (
  action: AssistantEntryUpsertDraftAction,
  deps: ActionExecutorDeps
) => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  const existing = contentType
    ? await deps.getEntryBySlug(contentType.id, action.input.slug)
    : null;

  return createPreviewChange({
    action,
    targetType: "entry",
    targetKey: `${action.input.contentTypeSlug}/${action.input.slug}`,
    summary: `${existing ? "Update" : "Create"} draft entry "${action.input.title}"`,
    warnings: contentType
      ? []
      : ["The content type does not exist yet and must be created earlier in the plan."],
    dependencies: [
      {
        actionId: null,
        targetType: "content-type",
        targetKey: action.input.contentTypeSlug,
        optional: false,
      },
    ],
    beforeValue: existing
      ? {
          title: existing.title,
          slug: existing.slug,
          data: existing.data,
        }
      : null,
    nextValue: {
      title: action.input.title,
      slug: action.input.slug,
      data: action.input.values,
    },
  });
};

const buildEntryPublicHref = async (
  contentTypeSlug: string,
  entrySlug: string,
  deps: ActionExecutorDeps
) => {
  const routes = ((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
  const route = routes.find((entry) => entry.type === contentTypeSlug && entry.enabled);
  if (!route?.detailPath) return null;
  return normalizeSitePath(route.detailPath.replace(":slug", entrySlug));
};

const readEntrySeoForPreview = async (entryId: string | null, deps: ActionExecutorDeps) =>
  entryId ? await deps.getSeoDocumentByTarget("entry", entryId) : null;

const buildEntrySampleCreatePreview = async (
  action: AssistantEntrySampleCreateAction,
  deps: ActionExecutorDeps
) => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  const existing = contentType
    ? await deps.getEntryBySlug(contentType.id, action.input.slug)
    : null;
  const existingSeo = await readEntrySeoForPreview(existing?.id ?? null, deps);
  const existingSeoRecord = existingSeo as Record<string, unknown> | null;
  const seoMatches =
    action.input.seo === undefined ||
    (Boolean(existingSeo) &&
      Object.entries(action.input.seo).every(([key, value]) => existingSeoRecord?.[key] === value));
  const beforeValue = existing
    ? {
        title: existing.title,
        slug: existing.slug,
        status: existing.status,
        data: existing.data,
        seo: existingSeo
          ? {
              title: existingSeo.title,
              description: existingSeo.description,
              canonicalUrl: existingSeo.canonicalUrl,
              robots: existingSeo.robots,
            }
          : null,
      }
    : null;
  const nextValue = {
    title: action.input.title,
    slug: action.input.slug,
    status: action.input.status,
    data: action.input.values,
    seo: action.input.seo ?? null,
  };
  const operation =
    existing &&
    existing.status === "published" &&
    existing.title === action.input.title &&
    existing.slug === action.input.slug &&
    isDeepStrictEqual(existing.data, action.input.values) &&
    seoMatches
      ? "noop"
      : undefined;

  return createPreviewChange({
    action,
    targetType: "entry",
    targetKey: `${action.input.contentTypeSlug}/${action.input.slug}`,
    operation,
    summary: `${existing ? "Update" : "Create"} public sample entry "${action.input.title}"`,
    warnings: contentType
      ? ["Publishing this sample entry may make it visible on the public site."]
      : ["The content type does not exist yet and must be created earlier in the plan."],
    dependencies: [
      {
        actionId: null,
        targetType: "content-type",
        targetKey: action.input.contentTypeSlug,
        optional: false,
      },
    ],
    beforeValue,
    nextValue,
  });
};

const buildEntryDeletePreview = async (
  action: AssistantEntryDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getEntry(action.input.id);
  const contentType = action.input.contentTypeSlug
    ? await deps.getContentTypeBySlug(action.input.contentTypeSlug)
    : null;
  const matches =
    Boolean(existing) &&
    (!action.input.expectedTitle || existing?.title === action.input.expectedTitle) &&
    (!action.input.expectedSlug || existing?.slug === action.input.expectedSlug) &&
    (!action.input.expectedStatus || existing?.status === action.input.expectedStatus) &&
    (!contentType || existing?.typeId === contentType.id);

  return createPreviewChange({
    action,
    targetType: "entry",
    targetKey: action.input.expectedSlug ?? action.input.id,
    operation: "delete",
    summary: `Delete entry "${action.input.expectedTitle ?? action.input.id}"`,
    warnings:
      existing?.status === "published"
        ? ["This entry is published and may be visible on the public site."]
        : [],
    conflicts: matches
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error",
            message: existing
              ? "Entry no longer matches the planned delete target."
              : "Entry was not found.",
          },
        ],
    beforeValue: existing
      ? {
          id: existing.id,
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
          typeId: existing.typeId,
        }
      : null,
    nextValue: null,
  });
};

const buildEntryUpdatePreview = async (
  action: AssistantEntryUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getEntry(action.input.id);
  const contentType = action.input.contentTypeSlug
    ? await deps.getContentTypeBySlug(action.input.contentTypeSlug)
    : null;
  const matches =
    Boolean(existing) &&
    (!action.input.expectedTitle || existing?.title === action.input.expectedTitle) &&
    (!action.input.expectedSlug || existing?.slug === action.input.expectedSlug) &&
    (!action.input.expectedStatus || existing?.status === action.input.expectedStatus) &&
    (!contentType || existing?.typeId === contentType.id);

  return createPreviewChange({
    action,
    targetType: "entry",
    targetKey: action.input.expectedSlug ?? action.input.id,
    summary: `Update entry "${action.input.expectedTitle ?? action.input.id}"`,
    warnings:
      action.input.patch.status === "published"
        ? ["Publishing this entry may make it visible on the public site."]
        : [],
    conflicts: matches
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error",
            message: existing
              ? "Entry no longer matches the planned update target."
              : "Entry was not found.",
          },
        ],
    beforeValue: existing
      ? {
          id: existing.id,
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
          data: existing.data,
          seo: existing.seo,
        }
      : null,
    nextValue: existing
      ? {
          title: action.input.patch.title ?? existing.title,
          slug: action.input.patch.slug ?? existing.slug,
          status: action.input.patch.status ?? existing.status,
          data: action.input.patch.values
            ? { ...existing.data, ...action.input.patch.values }
            : existing.data,
          seo: action.input.patch.seo
            ? { ...(existing.seo ?? {}), ...action.input.patch.seo }
            : existing.seo,
        }
      : null,
  });
};

const flattenMenuNodes = (nodes: MenuItemNode[]): MenuItemRecord[] =>
  nodes.flatMap((node) => {
    const { children: _children, ...record } = node;
    return [record, ...flattenMenuNodes(node.children)];
  });

const findMenuItemForAction = (items: MenuItemRecord[], action: AssistantMenuItemUpsertAction) =>
  items.find((item) => item.href === action.input.href) ?? null;

const collectMenuItemDeleteIds = (items: MenuItemRecord[], itemId: string) => {
  const deleteIds = new Set([itemId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.parentId && deleteIds.has(item.parentId) && !deleteIds.has(item.id)) {
        deleteIds.add(item.id);
        changed = true;
      }
    }
  }
  return deleteIds;
};

const buildMenuUpsertPreview = async (
  action: AssistantMenuUpsertAction,
  deps: ActionExecutorDeps
) => {
  const existing = await findMenuByLocation(action.input.location, deps);
  const nextValue = {
    ...(existing ? { id: existing.id } : {}),
    name: action.input.name,
    location: action.input.location,
    status: action.input.status,
  };

  return createPreviewChange({
    action,
    targetType: "menu",
    targetKey: action.input.location,
    summary: `${existing ? "Update" : "Create"} menu "${action.input.name}"`,
    dependencies: [
      {
        actionId: null,
        targetType: "permission",
        targetKey: "menus:write",
        optional: false,
      },
    ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          location: existing.location,
          status: existing.status,
        }
      : null,
    nextValue,
  });
};

const buildNextMenuItem = (
  action: AssistantMenuItemUpsertAction,
  existing: MenuItemRecord | null,
  orderIndex: number
): MenuItemInput => ({
  ...(existing ? { id: existing.id } : {}),
  label: action.input.label,
  href: action.input.href,
  pageId: null,
  parentId:
    action.input.parentId !== undefined ? action.input.parentId : (existing?.parentId ?? null),
  orderIndex: action.input.orderIndex ?? existing?.orderIndex ?? orderIndex,
  settings: action.input.settings ?? existing?.settings ?? {},
});

const buildMenuItemPreview = async (
  action: AssistantMenuItemUpsertAction,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const locator = await buildLocatorPreviewDependency(action.input.menuId, "menu", deps, ctx);
  const menuId = locator.resolvedId;
  const existingItems = menuId ? flattenMenuNodes(await deps.listMenuItems(menuId)) : [];
  const existing = findMenuItemForAction(existingItems, action);
  const nextValue = buildNextMenuItem(action, existing, existingItems.length);
  const targetKey = `${resourceIdInputKey(action.input.menuId)}/${action.input.href}`;

  return createPreviewChange({
    action,
    targetType: "menu-item",
    targetKey,
    summary: `${existing ? "Update" : "Create"} menu item "${action.input.label}"`,
    dependencies: [
      locator.dependency,
      {
        actionId: null,
        targetType: "permission",
        targetKey: "menus:write",
        optional: false,
      },
    ],
    beforeValue: existing,
    nextValue,
  });
};

const resolveActionResultPreviewResourceId = async (
  locator: Extract<AssistantSamePlanLocator, { kind: "action-result" }>,
  planned: AssistantPlannedAction | null,
  deps: ActionExecutorDeps
) => {
  if (locator.resourceType === "menu" && planned?.type === "menu.upsert") {
    return (await findMenuByLocation(planned.input.location, deps))?.id ?? null;
  }
  return null;
};

const resolveMenuItemExecutionOperation = (
  preview: AssistantActionPreviewChange,
  existing: MenuItemRecord | null,
  nextItem: MenuItemInput
): AssistantActionPreviewChange["operation"] => {
  if (!existing) return preview.operation === "noop" ? "noop" : "create";
  return isDeepStrictEqual(existing, nextItem) ? "noop" : "update";
};

const buildMenuItemDeletePreview = async (
  action: AssistantMenuItemDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existingItems = flattenMenuNodes(await deps.listMenuItems(action.input.menuId));
  const existing = existingItems.find((item) => item.id === action.input.itemId) ?? null;
  const deleteIds = existing
    ? collectMenuItemDeleteIds(existingItems, existing.id)
    : new Set<string>();
  const matches =
    existing?.label === action.input.label &&
    (action.input.expectedHref === undefined || existing.href === action.input.expectedHref) &&
    (action.input.expectedParentId === undefined ||
      existing.parentId === action.input.expectedParentId);

  return createPreviewChange({
    action,
    targetType: "menu-item",
    targetKey: `${action.input.menuId}/${action.input.itemId}`,
    operation: "delete",
    summary: `Delete menu item "${action.input.label}"`,
    warnings:
      deleteIds.size > 1
        ? [
            `This menu item has ${deleteIds.size - 1} nested child item(s) that will also be removed.`,
          ]
        : [],
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Menu item no longer matches the planned delete target."
                : "Menu item was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          label: existing.label,
          href: existing.href,
          pageId: existing.pageId,
          parentId: existing.parentId,
          deleteIds: [...deleteIds].sort((left, right) => left.localeCompare(right)),
        }
      : null,
    nextValue: existing
      ? {
          remainingItems: existingItems.length - deleteIds.size,
        }
      : null,
  });
};

const buildMenuItemUpdatePreview = async (
  action: AssistantMenuItemUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existingItems = flattenMenuNodes(await deps.listMenuItems(action.input.menuId));
  const existing = existingItems.find((item) => item.id === action.input.itemId) ?? null;
  const matches =
    existing?.label === action.input.label &&
    (action.input.expectedHref === undefined || existing.href === action.input.expectedHref) &&
    (action.input.expectedParentId === undefined ||
      existing.parentId === action.input.expectedParentId);
  const nextValue = existing
    ? {
        ...existing,
        ...action.input.patch,
      }
    : null;

  return createPreviewChange({
    action,
    targetType: "menu-item",
    targetKey: `${action.input.menuId}/${action.input.itemId}`,
    summary: `Update menu item "${action.input.label}"`,
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Menu item no longer matches the planned update target."
                : "Menu item was not found.",
            },
          ],
    beforeValue: existing,
    nextValue,
  });
};

const normalizeSeoSlugForAction = (value: string | null | undefined) => {
  if (!value) return null;
  return value.startsWith("/") ? value : `/${value}`;
};

const normalizePageActionSlug = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  return normalizeSitePath(trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
};

const isSamePlanLocator = (value: AssistantResourceIdInput): value is AssistantSamePlanLocator =>
  typeof value !== "string";

const resourceIdInputKey = (value: AssistantResourceIdInput) => {
  if (!isSamePlanLocator(value)) return value;
  if (value.kind === "action-result") {
    return `${value.resourceType}:${value.actionId}:${value.field}`;
  }
  if (value.kind === "stable-location") return `menu:${value.location}`;
  if (value.resourceType === "content-type") return `content-type:${value.slug}`;
  if (value.resourceType === "page") return `page:${value.slug}`;
  return `entry:${value.contentTypeSlug}/${value.slug}`;
};

const findPriorPlannedStableSlugAction = (
  locator: Extract<AssistantSamePlanLocator, { kind: "stable-slug" }>,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const actions = ctx.planActions?.slice(0, ctx.actionIndex ?? 0) ?? [];
  return (
    actions.find((action) => {
      if (locator.resourceType === "content-type") {
        return action.type === "content-type.upsert" && action.input.slug === locator.slug;
      }
      if (locator.resourceType === "page") {
        return action.type === "page.upsert" && action.input.slug === locator.slug;
      }
      if (locator.resourceType !== "entry") return false;
      return (
        (action.type === "entry.sample.create" || action.type === "entry.upsert-draft") &&
        action.input.contentTypeSlug === locator.contentTypeSlug &&
        action.input.slug === locator.slug
      );
    }) ?? null
  );
};

const findPriorActionResultDependency = (
  locator: Extract<AssistantSamePlanLocator, { kind: "action-result" }>,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const actions = ctx.planActions?.slice(0, ctx.actionIndex ?? 0) ?? [];
  return actions.find((action) => action.id === locator.actionId) ?? null;
};

const findPriorPlannedListingQueryAction = (
  name: string | null | undefined,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const normalizedName = name?.trim();
  if (!normalizedName) return null;
  const actions = ctx.planActions?.slice(0, ctx.actionIndex ?? 0) ?? [];
  return (
    actions.find(
      (action) => action.type === "listing-query.upsert" && action.input.name === normalizedName
    ) ?? null
  );
};

const findPriorPlannedListingTemplateAction = (
  slug: string | null | undefined,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const normalizedSlug = slug?.trim();
  if (!normalizedSlug) return null;
  const actions = ctx.planActions?.slice(0, ctx.actionIndex ?? 0) ?? [];
  return (
    actions.find(
      (action) => action.type === "listing-template.upsert" && action.input.slug === normalizedSlug
    ) ?? null
  );
};

const findPriorPlannedFormAction = (
  name: string | null | undefined,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const normalizedName = name?.trim();
  if (!normalizedName) return null;
  const actions = ctx.planActions?.slice(0, ctx.actionIndex ?? 0) ?? [];
  return (
    actions.find(
      (action) => action.type === "form.upsert" && action.input.name === normalizedName
    ) ?? null
  );
};

const resolveStableSlugResourceId = async (
  locator: Extract<AssistantSamePlanLocator, { kind: "stable-slug" }>,
  deps: ActionExecutorDeps
) => {
  if (locator.resourceType === "content-type") {
    const contentType = await deps.getContentTypeBySlug(locator.slug);
    return contentType?.id ?? null;
  }
  if (locator.resourceType === "page") {
    const page = await deps.getPageBySlug(locator.slug);
    return page?.id ?? null;
  }
  if (locator.resourceType !== "entry") return null;
  const contentType = await deps.getContentTypeBySlug(locator.contentTypeSlug);
  if (!contentType) return null;
  const entry = await deps.getEntryBySlug(contentType.id, locator.slug);
  return entry?.id ?? null;
};

const findMenuByLocation = async (location: string, deps: ActionExecutorDeps) =>
  (await deps.listMenus()).find((menu) => menu.location === location) ?? null;

const resolveResourceIdInput = async (
  targetId: AssistantResourceIdInput,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "priorResults">
) => {
  if (!isSamePlanLocator(targetId)) return targetId;
  if (targetId.kind === "stable-slug") {
    const resolved = await resolveStableSlugResourceId(targetId, deps);
    if (resolved) return resolved;
    throw new Error("assistant_action_locator_unresolved");
  }
  if (targetId.kind === "stable-location") {
    const resolved = await findMenuByLocation(targetId.location, deps);
    if (resolved) return resolved.id;
    throw new Error("assistant_action_locator_unresolved");
  }
  const result = ctx.priorResults?.get(targetId.actionId) ?? null;
  if (
    result?.status === "success" &&
    result.targetType === targetId.resourceType &&
    result.resourceId
  ) {
    return result.resourceId;
  }
  throw new Error("assistant_action_locator_unresolved");
};

const buildLocatorPreviewDependency = async (
  targetId: AssistantResourceIdInput,
  targetType: "content-type" | "page" | "entry" | "menu" | "detail-page",
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  if (!isSamePlanLocator(targetId)) {
    return {
      resolvedId: targetId,
      pending: false,
      dependency: {
        actionId: null,
        targetType,
        targetKey: targetId,
        optional: false,
      },
    };
  }

  if (targetId.kind === "stable-slug") {
    if (targetId.resourceType !== targetType) {
      return {
        resolvedId: null,
        pending: false,
        dependency: {
          actionId: null,
          targetType: targetId.resourceType,
          targetKey: resourceIdInputKey(targetId),
          optional: false,
        },
      };
    }
    const resolvedId = await resolveStableSlugResourceId(targetId, deps);
    const planned = resolvedId ? null : findPriorPlannedStableSlugAction(targetId, ctx);
    return {
      resolvedId,
      pending: Boolean(planned),
      dependency: {
        actionId: planned?.id ?? null,
        targetType: targetId.resourceType,
        targetKey: resourceIdInputKey(targetId),
        optional: false,
      },
    };
  }

  if (targetId.kind === "stable-location") {
    const resolved = await findMenuByLocation(targetId.location, deps);
    return {
      resolvedId: resolved?.id ?? null,
      pending: false,
      dependency: {
        actionId: null,
        targetType: targetId.resourceType,
        targetKey: resourceIdInputKey(targetId),
        optional: false,
      },
    };
  }

  const planned = findPriorActionResultDependency(targetId, ctx);
  const resolvedId = await resolveActionResultPreviewResourceId(targetId, planned, deps);
  return {
    resolvedId,
    pending: Boolean(planned && targetId.resourceType === targetType && !resolvedId),
    dependency: {
      actionId: targetId.actionId,
      targetType: targetId.resourceType,
      targetKey: resourceIdInputKey(targetId),
      optional: false,
    },
  };
};

const loadSeoActionTarget = async (
  action: AssistantSeoDocumentUpsertAction & { input: { targetId: string } },
  deps: ActionExecutorDeps
) => {
  if (action.input.targetType === "page") {
    const page = await deps.getPage(action.input.targetId);
    return page
      ? {
          id: page.id,
          title: page.title,
          slug: normalizeSeoSlugForAction(page.slug),
        }
      : null;
  }
  const entry = await deps.getEntry(action.input.targetId);
  return entry
    ? {
        id: entry.id,
        title: entry.title,
        slug: normalizeSeoSlugForAction(entry.slug),
      }
    : null;
};

const buildSeoNextValue = (
  action: AssistantSeoDocumentUpsertAction & { input: { targetId: string } },
  existing: Awaited<ReturnType<typeof getSeoDocumentByTarget>>,
  target: { title: string; slug: string | null }
) => ({
  targetType: action.input.targetType,
  targetId: action.input.targetId,
  slug:
    action.input.seo.slug !== undefined
      ? normalizeSeoSlugForAction(action.input.seo.slug)
      : (existing?.slug ?? target.slug),
  title:
    action.input.seo.title !== undefined
      ? action.input.seo.title
      : (existing?.title ?? target.title),
  description:
    action.input.seo.description !== undefined
      ? action.input.seo.description
      : (existing?.description ?? null),
  canonicalUrl:
    action.input.seo.canonicalUrl !== undefined
      ? action.input.seo.canonicalUrl
      : (existing?.canonicalUrl ?? null),
  robots:
    action.input.seo.robots !== undefined ? action.input.seo.robots : (existing?.robots ?? null),
});

const buildSeoDocumentPreview = async (
  action: AssistantSeoDocumentUpsertAction,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const locator = await buildLocatorPreviewDependency(
    action.input.targetId,
    action.input.targetType,
    deps,
    ctx
  );
  const resolvedAction = locator.resolvedId
    ? {
        ...action,
        input: {
          ...action.input,
          targetId: locator.resolvedId,
        },
      }
    : null;
  const target = resolvedAction ? await loadSeoActionTarget(resolvedAction, deps) : null;
  const existing = target
    ? await deps.getSeoDocumentByTarget(action.input.targetType, target.id)
    : null;
  const nextValue =
    target && resolvedAction
      ? buildSeoNextValue(resolvedAction, existing, target)
      : {
          targetType: action.input.targetType,
          targetId: resourceIdInputKey(action.input.targetId),
          ...action.input.seo,
        };
  const targetKey = `${action.input.targetType}/${resourceIdInputKey(action.input.targetId)}`;

  return createPreviewChange({
    action,
    targetType: "seo-document",
    targetKey,
    summary: `${existing ? "Update" : "Create"} SEO document for ${targetKey}`,
    warnings: target || locator.pending ? [] : ["The SEO target does not exist."],
    dependencies: [locator.dependency],
    conflicts:
      target || locator.pending
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: "SEO target is required before the document can be updated.",
            },
          ],
    beforeValue: existing
      ? {
          targetType: existing.targetType,
          targetId: existing.targetId,
          slug: existing.slug,
          title: existing.title,
          description: existing.description,
          canonicalUrl: existing.canonicalUrl,
          robots: existing.robots,
        }
      : null,
    nextValue,
  });
};

const buildSeoDocumentDeletePreview = async (
  action: AssistantSeoDocumentDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getSeoDocument(action.input.id);
  const expectedSlug = action.input.expectedSlug
    ? normalizeSeoSlugForAction(action.input.expectedSlug)
    : null;
  const matches =
    existing?.targetType === action.input.targetType &&
    existing.targetId === action.input.targetId &&
    (!expectedSlug || normalizeSeoSlugForAction(existing.slug) === expectedSlug) &&
    (!action.input.expectedTitle || existing.title === action.input.expectedTitle);

  return createPreviewChange({
    action,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${action.input.targetId}`,
    operation: "delete",
    summary: `Delete SEO document for ${action.input.targetType} ${action.input.targetId}`,
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "SEO document no longer matches the planned delete target."
                : "SEO document was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          targetType: existing.targetType,
          targetId: existing.targetId,
          slug: existing.slug,
          title: existing.title,
          status: existing.status,
        }
      : null,
    nextValue: null,
  });
};

const buildSeoDocumentUpdatePreview = async (
  action: AssistantSeoDocumentUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getSeoDocument(action.input.id);
  const expectedSlug = action.input.expectedSlug
    ? normalizeSeoSlugForAction(action.input.expectedSlug)
    : null;
  const matches =
    existing?.targetType === action.input.targetType &&
    existing.targetId === action.input.targetId &&
    (!expectedSlug || normalizeSeoSlugForAction(existing.slug) === expectedSlug) &&
    (!action.input.expectedTitle || existing.title === action.input.expectedTitle);

  return createPreviewChange({
    action,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${action.input.targetId}`,
    summary: `Update SEO document for ${action.input.targetType} ${action.input.targetId}`,
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "SEO document no longer matches the planned update target."
                : "SEO document was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          title: existing.title,
          description: existing.description,
          canonicalUrl: existing.canonicalUrl,
          robots: existing.robots,
        }
      : null,
    nextValue: existing ? { ...existing, ...action.input.patch } : null,
  });
};

const attachMediaReferenceValue = (currentValue: unknown, mediaId: string) => {
  if (Array.isArray(currentValue)) {
    const existing = currentValue.filter((item): item is string => typeof item === "string");
    return existing.includes(mediaId) ? existing : [...existing, mediaId];
  }
  return mediaId;
};

const buildMediaReferenceNextData = (
  action: AssistantMediaReferenceAttachAction,
  currentData: Record<string, unknown>
) => ({
  ...currentData,
  [action.input.field]: attachMediaReferenceValue(
    currentData[action.input.field],
    action.input.mediaId
  ),
});

const buildMediaReferencePreview = async (
  action: AssistantMediaReferenceAttachAction,
  deps: ActionExecutorDeps
) => {
  const [media, entry] = await Promise.all([
    deps.getMediaById(action.input.mediaId),
    deps.getEntry(action.input.targetId),
  ]);
  const currentData = entry?.data ?? {};
  const nextData = entry ? buildMediaReferenceNextData(action, currentData) : null;
  const warnings = [
    ...(media ? [] : ["The media asset does not exist."]),
    ...(entry ? [] : ["The entry target does not exist."]),
  ];

  return createPreviewChange({
    action,
    targetType: "media-reference",
    targetKey: `${action.input.targetType}/${action.input.targetId}/${action.input.field}`,
    summary: `Attach media ${action.input.mediaId} to entry field "${action.input.field}"`,
    warnings,
    dependencies: [
      {
        actionId: null,
        targetType: "media",
        targetKey: action.input.mediaId,
        optional: false,
      },
      {
        actionId: null,
        targetType: action.input.targetType,
        targetKey: action.input.targetId,
        optional: false,
      },
    ],
    conflicts:
      media && entry
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message:
                "Media asset and entry target are required before the reference can be attached.",
            },
          ],
    beforeValue: entry
      ? {
          field: action.input.field,
          value: currentData[action.input.field] ?? null,
        }
      : null,
    nextValue: entry
      ? {
          field: action.input.field,
          value: nextData?.[action.input.field] ?? null,
        }
      : action.input,
  });
};

const buildPagePreview = async (action: AssistantPageUpsertAction, ctx: ActionHandlerContext) => {
  const deps = ctx.deps;
  const existing = await deps.getPageBySlug(action.input.slug);
  const simplePageMode =
    Boolean(action.input.sections) ||
    !action.input.listingQueryName ||
    !action.input.listingTemplateSlug;
  const existingData = isRecord(existing?.currentData) ? existing.currentData : {};
  const existingCollectionLink = readStoredPageCollectionLink(existing);
  const currentCatalogSource = readPageCatalogSource(existing);
  const listingQueries = await deps.listListingQueries();
  const listingTemplates = await deps.listListingTemplates();
  const requestedListingQueryName =
    action.input.listingQueryName ?? action.input.collectionLink?.listingQueryName ?? null;
  const requestedListingTemplateSlug =
    action.input.listingTemplateSlug ?? action.input.collectionLink?.listingTemplateSlug ?? null;
  const requestedListingQueryId = action.input.collectionLink?.listingQueryId ?? null;
  const requestedListingTemplateId = action.input.collectionLink?.listingTemplateId ?? null;
  const listingQueryById = requestedListingQueryId
    ? (listingQueries.find((entry) => entry.id === requestedListingQueryId) ?? null)
    : null;
  const listingQueryByName = requestedListingQueryName
    ? (listingQueries.find((entry) => entry.name === requestedListingQueryName) ?? null)
    : null;
  const plannedListingQuery = listingQueryByName
    ? null
    : findPriorPlannedListingQueryAction(requestedListingQueryName, ctx);
  if (
    requestedListingQueryId &&
    listingQueryByName &&
    listingQueryByName.id !== requestedListingQueryId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const listingQueryFromCurrent = currentCatalogSource?.listingQueryId
    ? (listingQueries.find((entry) => entry.id === currentCatalogSource.listingQueryId) ?? null)
    : null;
  const listingQuery = listingQueryById ?? listingQueryByName ?? listingQueryFromCurrent;
  const listingTemplateById = requestedListingTemplateId
    ? (listingTemplates.find((entry) => entry.id === requestedListingTemplateId) ?? null)
    : null;
  const listingTemplateBySlug = requestedListingTemplateSlug
    ? (listingTemplates.find((entry) => entry.slug === requestedListingTemplateSlug) ?? null)
    : null;
  const plannedListingTemplate = listingTemplateBySlug
    ? null
    : findPriorPlannedListingTemplateAction(requestedListingTemplateSlug, ctx);
  if (
    requestedListingTemplateId &&
    listingTemplateBySlug &&
    listingTemplateBySlug.id !== requestedListingTemplateId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const listingTemplateFromCurrent = currentCatalogSource?.listingTemplateId
    ? (listingTemplates.find((entry) => entry.id === currentCatalogSource.listingTemplateId) ??
      null)
    : null;
  const listingTemplate =
    listingTemplateById ?? listingTemplateBySlug ?? listingTemplateFromCurrent;
  const forms = action.input.formEmbed ? await deps.listForms() : [];
  const form = action.input.formEmbed
    ? (forms.find((entry) => entry.name === action.input.formEmbed?.formName) ??
      (readFormEmbedSource(existing)?.formId
        ? forms.find((entry) => entry.id === readFormEmbedSource(existing)?.formId)
        : null) ??
      null)
    : null;
  const plannedForm = form
    ? null
    : findPriorPlannedFormAction(action.input.formEmbed?.formName, ctx);
  const dependencies: AssistantActionPreviewChange["dependencies"] = [
    ...(requestedListingQueryName
      ? [
          {
            actionId: plannedListingQuery?.id ?? null,
            targetType: "listing-query",
            targetKey: requestedListingQueryName,
            optional: false,
          },
        ]
      : []),
    ...(requestedListingTemplateSlug
      ? [
          {
            actionId: plannedListingTemplate?.id ?? null,
            targetType: "listing-template",
            targetKey: requestedListingTemplateSlug,
            optional: false,
          },
        ]
      : []),
    ...(action.input.formEmbed
      ? [
          {
            actionId: plannedForm?.id ?? null,
            targetType: "form",
            targetKey: action.input.formEmbed.formName,
            optional: false,
          },
        ]
      : []),
  ];
  const hasPendingDependencies = Boolean(
    plannedListingQuery || plannedListingTemplate || plannedForm
  );
  const dependencyConflicts =
    (!simplePageMode &&
      ((!listingQuery && !plannedListingQuery) || (!listingTemplate && !plannedListingTemplate))) ||
    (action.input.formEmbed && !form && !plannedForm)
      ? [
          {
            code: "assistant_action_dependency_missing" as const,
            severity: "error" as const,
            message:
              "Page dependencies could not be resolved for this preview. Re-run planning after the linked resources exist.",
          },
        ]
      : [];
  let resolvedCollectionLink = existingCollectionLink;
  if (dependencyConflicts.length === 0 && !hasPendingDependencies) {
    try {
      resolvedCollectionLink = await resolveAssistantPageCollectionLink({
        action,
        existing,
        simplePageMode,
        listingQuery,
        listingTemplate,
        deps,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "assistant_action_dependency_missing") {
          return createPreviewChange({
            action,
            targetType: "page",
            targetKey: action.input.slug,
            summary: `${existing ? "Update" : "Create"} catalog page ${action.input.slug}`,
            conflicts: [
              {
                code: "assistant_action_dependency_missing",
                severity: "error",
                message:
                  "Page dependencies could not be resolved for this preview. Re-run planning after the linked resources exist.",
              },
            ],
            beforeValue: existing
              ? {
                  title: existing.title,
                  slug: existing.slug,
                  status: existing.status,
                  ...(simplePageMode
                    ? {
                        sections: Array.isArray(existingData.sections) ? existingData.sections : [],
                        formEmbed: action.input.formEmbed ?? null,
                        collectionLink: existingCollectionLink,
                      }
                    : {}),
                }
              : null,
            nextValue: null,
          });
        }
        if (error.message === "assistant_action_dependency_conflict") {
          return createPreviewChange({
            action,
            targetType: "page",
            targetKey: action.input.slug,
            summary: `${existing ? "Update" : "Create"} catalog page ${action.input.slug}`,
            conflicts: [
              {
                code: "assistant_action_dependency_conflict",
                severity: "error",
                message:
                  "Collection-link locators disagree with the linked listing resources and must be reconciled before execution.",
              },
            ],
            beforeValue: existing
              ? {
                  title: existing.title,
                  slug: existing.slug,
                  status: existing.status,
                  ...(simplePageMode
                    ? {
                        sections: Array.isArray(existingData.sections) ? existingData.sections : [],
                        formEmbed: action.input.formEmbed ?? null,
                        collectionLink: existingCollectionLink,
                      }
                    : {}),
                }
              : null,
            nextValue: null,
          });
        }
      }
      throw error;
    }
  }
  const nextValue = simplePageMode
    ? {
        title: action.input.title,
        slug: action.input.slug,
        status: action.input.status,
        sections: action.input.sections ?? [],
        formEmbed: action.input.formEmbed ?? null,
        collectionLink: resolvedCollectionLink,
      }
    : {
        title: action.input.title,
        slug: action.input.slug,
        status: action.input.status,
        listingQueryName: action.input.listingQueryName,
        listingTemplateSlug: action.input.listingTemplateSlug,
        contentListStyle: action.input.contentListStyle,
        listingFilters: action.input.listingFilters,
        formEmbed: action.input.formEmbed,
        collectionLink: resolvedCollectionLink,
      };
  return createPreviewChange({
    action,
    targetType: "page",
    targetKey: action.input.slug,
    summary: `${existing ? "Update" : "Create"} catalog page ${action.input.slug}`,
    conflicts: dependencyConflicts,
    dependencies,
    beforeValue: existing
      ? {
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
          ...(simplePageMode
            ? {
                sections: Array.isArray(existingData.sections) ? existingData.sections : [],
                formEmbed: action.input.formEmbed ?? null,
                collectionLink: existingCollectionLink,
              }
            : {}),
        }
      : null,
    nextValue,
  });
};

const summarizeDetailPageDocument = (document: DetailPageDocument) => ({
  id: document.id,
  name: document.name,
  status: document.status,
  contentTypeId: document.contentTypeId,
  contentTypeSlug: document.contentTypeSlug,
  titlePattern: document.titlePattern,
  blocksCount: document.blocks.length,
  bindingsCount: document.bindings.length,
  relatedCount: document.related?.length ?? 0,
  publicImpact:
    document.status === "published" ? "published-detail-template" : "draft-detail-template",
});

const resolveDetailPageActionDocument = async (
  action: AssistantDetailPageUpsertAction,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "priorResults">
) => {
  if (action.input.contentTypeId === undefined) return action.input.document;
  const contentTypeId = await resolveResourceIdInput(action.input.contentTypeId, deps, ctx);
  return {
    ...action.input.document,
    contentTypeId,
  };
};

const buildDetailPagePreview = async (
  action: AssistantDetailPageUpsertAction,
  ctx: ActionHandlerContext
) => {
  const targetKey = action.input.document.id;
  const contentTypeDependency =
    action.input.contentTypeId === undefined
      ? null
      : await buildLocatorPreviewDependency(
          action.input.contentTypeId,
          "content-type",
          ctx.deps,
          ctx
        );

  if (contentTypeDependency?.pending) {
    const existing = await ctx.deps.getDetailPageDocument(action.input.document.id);
    return createPreviewChange({
      action,
      targetType: "detail-page",
      targetKey,
      summary: `${existing ? "Update" : "Create"} detail template ${action.input.document.name}`,
      dependencies: [contentTypeDependency.dependency],
      beforeValue: existing ? summarizeDetailPageDocument(existing.currentDocument) : null,
      nextValue: summarizeDetailPageDocument(action.input.document),
    });
  }

  if (contentTypeDependency && !contentTypeDependency.resolvedId) {
    return createPreviewChange({
      action,
      targetType: "detail-page",
      targetKey,
      summary: `Create/update detail template ${action.input.document.name}`,
      dependencies: [contentTypeDependency.dependency],
      conflicts: [
        {
          code: "assistant_action_locator_unresolved",
          severity: "error",
          message: "The detail template content type locator could not be resolved.",
        },
      ],
      beforeValue: null,
      nextValue: summarizeDetailPageDocument(action.input.document),
    });
  }

  const document =
    contentTypeDependency?.resolvedId !== undefined && contentTypeDependency.resolvedId !== null
      ? {
          ...action.input.document,
          contentTypeId: contentTypeDependency.resolvedId,
        }
      : action.input.document;

  try {
    const prepared = await ctx.deps.prepareDetailPageDocumentUpsert({
      document,
      expectedExistingId: action.input.expectedExistingId,
    });

    return createPreviewChange({
      action,
      targetType: "detail-page",
      targetKey,
      summary: `${prepared.existing ? "Update" : "Create"} detail template ${prepared.document.name}`,
      dependencies: [
        {
          actionId: null,
          targetType: "content-type",
          targetKey: prepared.contentType.id,
          optional: false,
        },
      ],
      beforeValue: prepared.existing
        ? summarizeDetailPageDocument(prepared.existing.currentDocument)
        : null,
      nextValue: summarizeDetailPageDocument(prepared.document),
    });
  } catch (error) {
    const code =
      error instanceof Error &&
      (error.message === "detail_page_conflict" ||
        error.message === "detail_page_content_type_mismatch")
        ? error.message
        : "detail_page_invalid";
    const message =
      code === "detail_page_conflict"
        ? "expectedExistingId does not match the detail template id being upserted."
        : code === "detail_page_content_type_mismatch"
          ? "The existing detail template id belongs to a different content type."
          : "The detail template document or its linked content type is invalid.";

    return createPreviewChange({
      action,
      targetType: "detail-page",
      targetKey,
      summary: `Create/update detail template ${action.input.document.name}`,
      conflicts: [
        {
          code,
          severity: "error",
          message,
        },
      ],
      dependencies: [
        {
          actionId: null,
          targetType: "content-type",
          targetKey: action.input.document.contentTypeId,
          optional: false,
        },
      ],
      beforeValue: null,
      nextValue: summarizeDetailPageDocument(action.input.document),
    });
  }
};

const applyPageUpdatePatch = (
  currentData: Record<string, unknown>,
  patch: AssistantPageUpdateAction["input"]["patch"]
) => {
  const currentSettings = isRecord(currentData.settings) ? currentData.settings : {};
  const settingsPatch = patch.settings;
  if (!settingsPatch) return currentData;
  const nextSettings = { ...currentSettings };
  if (settingsPatch.template !== undefined) nextSettings.template = settingsPatch.template;
  if (settingsPatch.showInNav !== undefined) nextSettings.showInNav = settingsPatch.showInNav;
  if (settingsPatch.revisionRetention !== undefined) {
    nextSettings.revisionRetention = settingsPatch.revisionRetention;
  }
  if (settingsPatch.seo !== undefined) {
    const currentSeo = isRecord(nextSettings.seo) ? nextSettings.seo : {};
    nextSettings.seo = {
      ...currentSeo,
      ...settingsPatch.seo,
    };
  }
  return {
    ...currentData,
    settings: nextSettings,
  };
};

const buildPageUpdatePreview = async (
  action: AssistantPageUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getPage(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const existingSlug = normalizePageActionSlug(existing?.slug);
  const expectedSlug = normalizePageActionSlug(action.input.slug);
  const currentData = isRecord(existing?.currentData) ? existing.currentData : {};
  const nextData = existing ? applyPageUpdatePatch(currentData, action.input.patch) : null;
  const nextValue = existing
    ? {
        title: action.input.patch.title ?? existing.title,
        slug: action.input.patch.slug ?? existing.slug,
        status: action.input.patch.status ?? existing.status,
        settings: isRecord(nextData?.settings) ? nextData.settings : {},
      }
    : null;
  const matches =
    existing?.title === action.input.title &&
    existingSlug === expectedSlug &&
    (!expectedStatus || existing.status === expectedStatus);

  return createPreviewChange({
    action,
    targetType: "page",
    targetKey: action.input.slug,
    summary: `Update page "${action.input.title}"`,
    warnings:
      action.input.patch.status === "published"
        ? ["Publishing this page may make the latest page data visible on the public site."]
        : [],
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Page no longer matches the planned update target."
                : "Page was not found.",
            },
          ],
    beforeValue: existing
      ? {
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
          settings: currentData.settings ?? null,
        }
      : null,
    nextValue,
  });
};

const buildPageDeletePreview = async (
  action: AssistantPageDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getPage(action.input.id);
  const existingSlug = normalizePageActionSlug(existing?.slug);
  const expectedSlug = normalizePageActionSlug(action.input.slug);
  const matches = existing?.title === action.input.title && existingSlug === expectedSlug;
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const statusMatches = !expectedStatus || existing?.status === expectedStatus;

  return createPreviewChange({
    action,
    targetType: "page",
    targetKey: action.input.slug,
    operation: "delete",
    summary: `Delete page "${action.input.title}"`,
    warnings:
      existing?.status === "published"
        ? ["This page is published and may be visible on the public site."]
        : [],
    conflicts:
      existing && matches && statusMatches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Page no longer matches the planned delete target."
                : "Page was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
        }
      : null,
    nextValue: null,
  });
};

const buildWidgetTemplateDeletePreview = async (
  action: AssistantWidgetTemplateDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const matches = existing?.name === action.input.name;
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedCategory = action.input.expectedCategory?.trim() ?? "";
  const statusMatches = !expectedStatus || existing?.status === expectedStatus;
  const categoryMatches = !expectedCategory || existing?.category === expectedCategory;

  return createPreviewChange({
    action,
    targetType: "widget-template",
    targetKey: action.input.name,
    operation: "delete",
    summary: `Delete widget template "${action.input.name}"`,
    warnings: [
      "This reusable widget template may be referenced by pages or other templates.",
      ...(existing?.status === "published" ? ["This widget template is published."] : []),
    ],
    conflicts:
      existing && matches && statusMatches && categoryMatches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Widget template no longer matches the planned delete target."
                : "Widget template was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          status: existing.status,
          category: existing.category,
        }
      : null,
    nextValue: null,
  });
};

const applyWidgetTemplateSettingsPatch = (
  settings: unknown,
  patch: NonNullable<AssistantWidgetTemplateUpdateAction["input"]["patch"]["settings"]>
) => {
  const normalized = normalizeWidgetTemplateSettings(settings);
  return {
    ...normalized,
    layout: {
      ...normalized.layout,
      wrapper: {
        ...normalized.layout.wrapper,
        ...(patch.wrapperContainer !== undefined ? { container: patch.wrapperContainer } : {}),
      },
      sections: {
        ...normalized.layout.sections,
        ...(patch.sectionGap !== undefined ? { gap: patch.sectionGap } : {}),
      },
    },
  };
};

const applyWidgetTemplateUpdatePatch = (
  existing: Awaited<ReturnType<typeof getWidgetTemplate>>,
  patch: AssistantWidgetTemplateUpdateAction["input"]["patch"]
) => {
  if (!existing) return null;
  return {
    name: patch.name ?? existing.name,
    description:
      patch.description !== undefined ? patch.description : (existing.description ?? null),
    category: patch.category ?? existing.category,
    status: (patch.status ?? existing.status) as "draft" | "published",
    settings: patch.settings
      ? applyWidgetTemplateSettingsPatch(existing.settings, patch.settings)
      : existing.settings,
  };
};

const buildWidgetTemplateUpdatePreview = async (
  action: AssistantWidgetTemplateUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedCategory = action.input.expectedCategory?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    (!expectedStatus || existing.status === expectedStatus) &&
    (!expectedCategory || existing.category === expectedCategory);
  const nextValue = applyWidgetTemplateUpdatePatch(existing, action.input.patch);

  return createPreviewChange({
    action,
    targetType: "widget-template",
    targetKey: action.input.name,
    summary: `Update widget template "${action.input.name}"`,
    warnings:
      existing?.status === "published" || action.input.patch.status === "published"
        ? ["This reusable widget template may affect pages that reference it."]
        : [],
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Widget template no longer matches the planned update target."
                : "Widget template was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          description: existing.description,
          category: existing.category,
          status: existing.status,
          settings: existing.settings,
        }
      : null,
    nextValue,
  });
};

const buildWidgetTemplateBlockPatchPreview = async (
  action: AssistantWidgetTemplateBlockPatchAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const matches =
    existing?.name === action.input.name && (!expectedStatus || existing.status === expectedStatus);
  const patch =
    existing && matches
      ? applyPageWidgetDataPatch(existing.blocks, {
          blockId: action.input.blockId,
          expectedBlockType: action.input.expectedBlockType,
          dataPath: action.input.dataPath,
          value: action.input.value,
        })
      : null;
  const conflictMessage =
    patch?.status === "missing_block"
      ? "Selected widget template block was not found."
      : patch?.status === "type_mismatch"
        ? "Selected widget template block type changed."
        : patch?.status === "missing_path"
          ? "Selected widget template block data path does not exist."
          : existing
            ? "Widget template no longer matches the planned block patch target."
            : "Widget template was not found.";

  return createPreviewChange({
    action,
    targetType: "widget-template",
    targetKey: `${action.input.name}/${action.input.blockId}/${action.input.dataPath.join(".")}`,
    summary: `Patch widget template block "${action.input.blockId}"`,
    warnings:
      existing?.status === "published"
        ? ["This reusable widget template may affect pages that reference it."]
        : [],
    conflicts:
      existing && matches && patch?.status === "ok"
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: conflictMessage,
            },
          ],
    beforeValue:
      existing && patch?.status === "ok"
        ? {
            blockId: action.input.blockId,
            dataPath: action.input.dataPath,
            value: patch.beforeValue,
          }
        : null,
    nextValue:
      existing && patch?.status === "ok"
        ? {
            blockId: action.input.blockId,
            dataPath: action.input.dataPath,
            value: patch.nextValue,
          }
        : null,
  });
};

const buildSiteKitRecommendPreview = async (
  action: AssistantSiteKitRecommendAction,
  deps: ActionExecutorDeps
) => {
  const preview = deps.previewSiteKitPlan(action.input);
  return createPreviewChange({
    action,
    targetType: "site-kit",
    targetKey: preview.selectedKitId,
    summary: `Recommend site kit "${preview.selectedKitTitle}"`,
    beforeValue: preview.selectedKitId,
    nextValue: preview.selectedKitId,
    details: {
      siteKit: {
        plan: preview,
      },
    },
  });
};

const buildSiteKitInstallPreview = async (
  action: AssistantSiteKitInstallAction,
  deps: ActionExecutorDeps
) => {
  const preview = deps.previewSiteKitPlan(action.input);
  return createPreviewChange({
    action,
    targetType: "site-kit",
    targetKey: preview.selectedKitId,
    summary: `Install site kit "${preview.selectedKitTitle}" with ${preview.enabledStepIds.length} selected step(s)`,
    beforeValue: null,
    nextValue: {
      selectedKitId: preview.selectedKitId,
      enabledStepIds: preview.enabledStepIds,
      dryRun: action.input.dryRun === true,
    },
    details: {
      siteKit: {
        plan: preview,
      },
    },
  });
};

const buildSiteKitValidatePreview = async (action: AssistantSiteKitValidateAction) =>
  createPreviewChange({
    action,
    targetType: "site-kit-run",
    targetKey: action.input.runId,
    summary: `Validate site kit run ${action.input.runId}`,
    beforeValue: action.input.runId,
    nextValue: action.input.runId,
  });

type ActionHandlerContext = {
  deps: ActionExecutorDeps;
  actorId: string;
  planActions?: AssistantPlannedAction[];
  actionIndex?: number;
  priorResults?: Map<string, AssistantActionExecutionItem>;
};

type AssistantActionHandler = {
  preview: (
    action: AssistantPlannedAction,
    ctx: ActionHandlerContext
  ) => Promise<AssistantActionPreviewChange>;
  execute: (
    action: AssistantPlannedAction,
    preview: AssistantActionPreviewChange,
    ctx: ActionHandlerContext
  ) => Promise<AssistantActionExecutionItem>;
};

const unexpectedAction = (): never => {
  throw new Error("assistant_action_unsupported");
};

const mergeContentRoute = (current: ContentRouteSetting[], nextRoute: ContentRouteSetting) => {
  const filtered = current.filter((entry) => entry.type !== nextRoute.type);
  return [...filtered, nextRoute].sort((left, right) => left.type.localeCompare(right.type));
};

const buildContentRouteRecord = (
  existing: ContentRouteSetting | null,
  input: AssistantContentRouteUpsertAction["input"]
): ContentRouteSetting => ({
  type: input.typeSlug,
  listPath: input.listPath,
  detailPath: input.detailPath,
  enabled: input.enabled,
  ...(Object.prototype.hasOwnProperty.call(input, "detailPageId")
    ? { detailPageId: input.detailPageId ?? null }
    : existing && Object.prototype.hasOwnProperty.call(existing, "detailPageId")
      ? { detailPageId: existing.detailPageId ?? null }
      : {}),
});

const executeContentRouteAction = async (
  action: AssistantContentRouteUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const current = ((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
  const existing = current.find((entry) => entry.type === action.input.typeSlug) ?? null;
  const nextRoute = buildContentRouteRecord(existing, action.input);

  if (preview.operation !== "noop") {
    await deps.setSetting("site.contentRoutes", mergeContentRoute(current, nextRoute));
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "content-route",
    targetKey: action.input.typeSlug,
    operation: preview.operation,
    status: "success",
    resourceId: action.input.typeSlug,
    adminHref: "/admin/settings/site",
    publicHref: action.input.detailPath.replace(":slug", "example-project"),
    message:
      preview.operation === "noop"
        ? "Public detail route already matched the desired contract."
        : "Public detail route updated.",
  };
};

const executeContentTypeAction = async (
  action: AssistantContentTypeUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  const record =
    preview.operation === "create"
      ? await deps.createContentType(action.input)
      : preview.operation === "update" && existing
        ? await deps.updateContentType(existing.id, {
            name: action.input.name,
            slug: action.input.slug,
            schema: action.input.schema,
          })
        : existing;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "content-type",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/engine",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Content type already matched the planned schema."
        : "Content type is ready.",
  };
};

const executeContentTypeFieldAddAction = async (
  action: AssistantContentTypeFieldAddAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  if (!existing || existing.id !== action.input.id || existing.name !== action.input.name) {
    throw new Error("assistant_action_dependency_missing");
  }
  const nextSchema = mergeContentTypeSchemaFields(
    existing.schema as Record<string, unknown>,
    action.input.fields
  );
  const record =
    preview.operation === "noop"
      ? existing
      : await deps.updateContentType(existing.id, {
          schema: nextSchema,
        });
  if (!record) throw new Error("assistant_action_dependency_missing");
  return {
    actionId: action.id,
    type: action.type,
    targetType: "content-type",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: `/admin/advanced/engine/${encodeURIComponent(record.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Content type already had the planned fields."
        : "Content type fields were updated.",
  };
};

const executeContentTypeDeleteAction = async (
  action: AssistantContentTypeDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const entryCount = Math.max(0, Math.floor(action.input.expectedEntryCount ?? 0));
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  if (
    !existing ||
    existing.id !== action.input.id ||
    existing.name !== action.input.name ||
    entryCount > 0
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const deleted = await deps.deleteContentType(existing.id);
  if (!deleted) throw new Error("assistant_action_dependency_missing");
  return {
    actionId: action.id,
    type: action.type,
    targetType: "content-type",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/engine",
    publicHref: null,
    message: `Deleted content type "${deleted.name}".`,
  };
};

const executeCustomScreenAction = async (
  action: AssistantCustomScreenUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const { contentType, existing, conflicts } = await findExistingCustomScreenForUpsert(
    action,
    deps
  );
  if (!contentType) {
    throw new Error("assistant_action_dependency_missing");
  }
  if (conflicts.length > 0) {
    throw new Error("assistant_action_dependency_conflict");
  }

  const record =
    preview.operation === "create"
      ? await deps.createCustomScreen({
          name: action.input.name,
          contentTypeId: contentType.id,
          status: action.input.status,
          collectionRole: action.input.collectionRole ?? null,
          compositionKey: action.input.compositionKey ?? null,
          showInSidebar: action.input.showInSidebar,
          sidebarLabel: action.input.sidebarLabel,
          blocks: action.input.blocks as unknown as WidgetBlock[],
          bindings: action.input.bindings as unknown as CustomScreenBinding[],
        })
      : preview.operation === "update" && existing
        ? await deps.updateCustomScreen(existing.id, {
            name: action.input.name,
            contentTypeId: contentType.id,
            status: action.input.status,
            collectionRole: action.input.collectionRole ?? null,
            compositionKey: action.input.compositionKey ?? null,
            showInSidebar: action.input.showInSidebar,
            sidebarLabel: action.input.sidebarLabel,
            blocks: action.input.blocks as unknown as WidgetBlock[],
            bindings: action.input.bindings as unknown as CustomScreenBinding[],
          })
        : existing;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "custom-screen",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: record
      ? `/admin/advanced/custom-screens/${encodeURIComponent(record.id)}/entries`
      : "/admin/advanced/custom-screens",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Dedicated admin screen already matched the plan."
        : "Dedicated House Projects screen is ready in Coderso.",
  };
};

const executeCustomScreenDeleteAction = async (
  action: AssistantCustomScreenDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getCustomScreen(action.input.id);
  const prefix = action.input.expectedNamePrefix?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    (prefix && !existing.name.toLowerCase().startsWith(prefix.toLowerCase()))
  ) {
    throw new Error("assistant_action_dependency_missing");
  }

  const deleted = await deps.deleteCustomScreen(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "custom-screen",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/custom-screens",
    publicHref: null,
    message: `Deleted custom screen "${deleted.name}".`,
  };
};

const executeCustomScreenUpdateAction = async (
  action: AssistantCustomScreenUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getCustomScreen(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedContentTypeId = action.input.expectedContentTypeId?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    (expectedStatus && existing.status !== expectedStatus) ||
    (expectedContentTypeId && existing.contentTypeId !== expectedContentTypeId)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const nextValue = applyCustomScreenUpdatePatch(existing, action.input.patch);
  if (!nextValue) throw new Error("assistant_action_dependency_missing");
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateCustomScreen(existing.id, {
          name: nextValue.name,
          status: nextValue.status,
          collectionRole: nextValue.collectionRole,
          compositionKey: nextValue.compositionKey,
          showInSidebar: nextValue.showInSidebar,
          sidebarLabel: nextValue.sidebarLabel,
          bindings: nextValue.bindings,
        });
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "custom-screen",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/advanced/custom-screens/${encodeURIComponent(updated.id)}/entries`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Custom screen already matched the planned patch."
        : `Updated custom screen "${updated.name}".`,
  };
};

const executeCustomScreenWidgetPatchAction = async (
  action: AssistantCustomScreenWidgetPatchAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getCustomScreen(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    (expectedStatus && existing.status !== expectedStatus)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const patch = applyPageWidgetDataPatch(existing.blocks, {
    blockId: action.input.blockId,
    expectedBlockType: action.input.expectedBlockType,
    dataPath: action.input.dataPath,
    value: action.input.value,
  });
  if (patch.status !== "ok") throw new Error("assistant_action_dependency_missing");
  normalizeAssistantPagePatchBlock(patch.block!);
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateCustomScreen(existing.id, {
          blocks: patch.blocks,
        });
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "custom-screen",
    targetKey: `${action.input.name}/${action.input.blockId}/${action.input.dataPath.join(".")}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/advanced/custom-screens/${encodeURIComponent(updated.id)}/entries`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Custom screen widget block already matched the planned patch."
        : `Patched custom screen widget block "${action.input.blockId}".`,
  };
};

const executeListingQueryAction = async (
  action: AssistantListingQueryUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  if (!contentType) {
    throw new Error("assistant_action_dependency_missing");
  }

  const matches = await findListingQueryNameMatches(action.input.name, deps);
  if (matches.length > 1) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const existing = matches[0] ?? null;
  const payload = {
    name: action.input.name,
    description: action.input.description,
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: contentType.id,
        includeDrafts: action.input.includeDrafts,
      },
      filters: [],
      sort: action.input.sort,
      pagination: {
        limit: action.input.limit,
        offset: 0,
      },
      fields: action.input.fields,
    },
  };

  const record =
    preview.operation === "create"
      ? await deps.createListingQuery(payload)
      : preview.operation === "update" && existing
        ? await deps.updateListingQuery(existing.id, payload)
        : existing;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-query",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing query already matched the plan."
        : "Catalog listing query is ready for the public page.",
  };
};

const executeListingQueryDeleteAction = async (
  action: AssistantListingQueryDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing =
    (await deps.listListingQueries()).find((entry) => entry.id === action.input.id) ?? null;
  if (!existing || existing.name !== action.input.name) {
    throw new Error("assistant_action_dependency_missing");
  }
  const references = await collectListingResourceReferences({ listingQueryId: existing.id }, deps);
  if (references.length > 0) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const deleted = await deps.deleteListingQuery(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-query",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message: `Deleted listing query "${existing.name}".`,
  };
};

const executeListingQueryFiltersPatchAction = async (
  action: AssistantListingQueryFiltersPatchAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingQueries()).find(
      (entry) => entry.name === action.input.listingQueryName
    ) ?? null;
  if (!existing) {
    throw new Error("assistant_action_dependency_missing");
  }

  const nextQuery = {
    ...existing.query,
    filters: action.input.filters,
  };
  const record =
    preview.operation === "noop"
      ? existing
      : await deps.updateListingQuery(existing.id, {
          query: nextQuery,
        });

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-query",
    targetKey: action.input.listingQueryName,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing query filters already matched the planned patch."
        : "Listing query filters are updated.",
  };
};

const executeListingQueryUpdateAction = async (
  action: AssistantListingQueryUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing =
    (await deps.listListingQueries()).find((entry) => entry.id === action.input.id) ?? null;
  if (!existing || existing.name !== action.input.name) {
    throw new Error("assistant_action_dependency_missing");
  }
  const nextQuery = {
    ...existing.query,
    sourceConfig: {
      ...(isRecord(existing.query.sourceConfig) ? existing.query.sourceConfig : {}),
      ...(action.input.patch.includeDrafts !== undefined
        ? { includeDrafts: action.input.patch.includeDrafts }
        : {}),
    },
    pagination: {
      ...(isRecord(existing.query.pagination) ? existing.query.pagination : {}),
      ...(action.input.patch.limit !== undefined ? { limit: action.input.patch.limit } : {}),
    },
  };
  const record =
    preview.operation === "noop"
      ? existing
      : await deps.updateListingQuery(existing.id, {
          name: action.input.patch.name ?? existing.name,
          description:
            action.input.patch.description !== undefined
              ? action.input.patch.description
              : existing.description,
          query: nextQuery,
        });
  if (!record) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-query",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing query already matched the planned patch."
        : `Updated listing query "${record.name}".`,
  };
};

const executeListingTemplateAction = async (
  action: AssistantListingTemplateUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.slug === action.input.slug) ?? null;
  const payload = {
    name: action.input.name,
    slug: action.input.slug,
    description: action.input.description,
    layout: action.input.layout,
    config: action.input.config,
  };
  const record =
    preview.operation === "create"
      ? await deps.createListingTemplate(payload)
      : preview.operation === "update" && existing
        ? await deps.updateListingTemplate(existing.id, payload)
        : existing;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-template",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing template already matched the plan."
        : "Grid template is ready for house project cards.",
  };
};

const executeListingTemplateDeleteAction = async (
  action: AssistantListingTemplateDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.id === action.input.id) ?? null;
  const expectedLayout = action.input.expectedLayout?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    existing.slug !== action.input.slug ||
    (expectedLayout && existing.layout !== expectedLayout)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const references = await collectListingResourceReferences(
    {
      listingTemplateId: existing.id,
    },
    deps
  );
  if (references.length > 0) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const deleted = await deps.deleteListingTemplate(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-template",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message: `Deleted listing template "${deleted.name}".`,
  };
};

const executeListingTemplateCardPatchAction = async (
  action: AssistantListingTemplateCardPatchAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find(
      (entry) => entry.slug === action.input.listingTemplateSlug
    ) ?? null;
  if (!existing) {
    throw new Error("assistant_action_dependency_missing");
  }

  const nextConfig = {
    ...existing.config,
    card: action.input.card,
  };
  const record =
    preview.operation === "noop"
      ? existing
      : await deps.updateListingTemplate(existing.id, {
          config: nextConfig,
        });

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-template",
    targetKey: action.input.listingTemplateSlug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing template card config already matched the planned patch."
        : "Listing template card config is updated.",
  };
};

const executeListingTemplateUpdateAction = async (
  action: AssistantListingTemplateUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.id === action.input.id) ?? null;
  const expectedLayout = action.input.expectedLayout?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    existing.slug !== action.input.slug ||
    (expectedLayout && existing.layout !== expectedLayout)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const config = action.input.patch.card
    ? { ...existing.config, card: action.input.patch.card }
    : existing.config;
  const record =
    preview.operation === "noop"
      ? existing
      : await deps.updateListingTemplate(existing.id, {
          name: action.input.patch.name ?? existing.name,
          slug: action.input.patch.slug ?? existing.slug,
          description:
            action.input.patch.description !== undefined
              ? action.input.patch.description
              : existing.description,
          layout: action.input.patch.layout ?? existing.layout,
          config,
        });
  if (!record) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-template",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing template already matched the planned patch."
        : `Updated listing template "${record.name}".`,
  };
};

const executeFormAutomationAction = async (
  action: AssistantFormAutomationUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const form = (await deps.listForms()).find((entry) => entry.id === action.input.formId) ?? null;
  if (!form) {
    throw new Error("assistant_action_dependency_missing");
  }
  const actions = await deps.listFormActions(action.input.formId);
  const existing = actions.find((entry) => entry.id === action.input.action.id) ?? null;
  const nextActions = existing
    ? actions.map((entry) => (entry.id === action.input.action.id ? action.input.action : entry))
    : [...actions, { ...action.input.action, orderIndex: actions.length }];
  const saved =
    preview.operation === "noop"
      ? actions
      : await deps.setFormActions(action.input.formId, nextActions);
  const record = saved.find((entry) => entry.id === action.input.action.id) ?? null;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "form-action",
    targetKey: `${action.input.formId}/${action.input.action.id}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: `/admin/advanced/forms/${encodeURIComponent(action.input.formId)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Form automation already matched the planned action."
        : "Form automation is updated.",
  };
};

const executeFormAction = async (
  action: AssistantFormUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listForms()).find((entry) => entry.slug === action.input.slug) ?? null;
  const payload = {
    name: action.input.name,
    slug: action.input.slug,
    status: action.input.status,
    description: action.input.description,
    successMessage: action.input.successMessage,
    submissionAccess: action.input.submissionAccess,
  };
  const form =
    preview.operation === "create"
      ? await deps.createForm(payload)
      : preview.operation === "update" && existing
        ? await deps.updateForm(existing.id, payload)
        : existing;

  if (!form) {
    throw new Error("assistant_action_dependency_missing");
  }

  if (preview.operation !== "noop") {
    await deps.setFormFields(form.id, action.input.fields as unknown as FormFieldInput[]);
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "form",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: form.id,
    adminHref: `/admin/advanced/forms/${encodeURIComponent(form.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Inquiry form already matched the plan."
        : "Inquiry form is ready for catalog pages.",
  };
};

const executeFormDeleteAction = async (
  action: AssistantFormDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getForm(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    existing.slug !== action.input.slug ||
    (expectedStatus && existing.status !== expectedStatus)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const submissionCount = await deps.countFormSubmissions(existing.id);
  if (submissionCount > 0) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const deleted = await deps.deleteForm(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "form",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/forms",
    publicHref: null,
    message: `Deleted form "${deleted.name}".`,
  };
};

const executeFormArchiveAction = async (
  action: AssistantFormArchiveAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getForm(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    existing.slug !== action.input.slug ||
    (expectedStatus && existing.status !== expectedStatus && existing.status !== "archived")
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const archived =
    existing.status === "archived"
      ? existing
      : await deps.updateForm(existing.id, { status: "archived" });
  if (!archived) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "form",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: archived.id,
    adminHref: `/admin/advanced/forms/${encodeURIComponent(archived.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? `Form "${archived.name}" was already archived.`
        : `Archived form "${archived.name}".`,
  };
};

const executeFormUpdateAction = async (
  action: AssistantFormUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getForm(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    existing.slug !== action.input.slug ||
    (expectedStatus && existing.status !== expectedStatus)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateForm(existing.id, action.input.patch);
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "form",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/advanced/forms/${encodeURIComponent(updated.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Form already matched the planned patch."
        : `Updated form "${updated.name}".`,
  };
};

const executeEntryUpsertDraftAction = async (
  action: AssistantEntryUpsertDraftAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
) => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  if (!contentType) {
    throw new Error("assistant_action_dependency_missing");
  }

  const existing = await deps.getEntryBySlug(contentType.id, action.input.slug);
  const record =
    preview.operation === "create"
      ? await deps.createEntry(contentType.id, {
          title: action.input.title,
          slug: action.input.slug,
          data: action.input.values,
          authorId: actorId,
        })
      : preview.operation === "update" && existing
        ? await deps.updateEntry(existing.id, {
            title: action.input.title,
            slug: action.input.slug,
            data: action.input.values,
          })
        : existing;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "entry",
    targetKey: `${action.input.contentTypeSlug}/${action.input.slug}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: record
      ? `/admin/advanced/entries/${encodeURIComponent(action.input.contentTypeSlug)}/${encodeURIComponent(record.id)}`
      : "/admin/advanced/entries",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Draft entry already matched the planned data."
        : "Draft entry is ready in Coderso Entries.",
  };
};

const executeEntrySampleCreateAction = async (
  action: AssistantEntrySampleCreateAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
) => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  if (!contentType) {
    throw new Error("assistant_action_dependency_missing");
  }

  const existing = await deps.getEntryBySlug(contentType.id, action.input.slug);
  const needsEntryUpdate =
    !existing ||
    existing.title !== action.input.title ||
    existing.slug !== action.input.slug ||
    !isDeepStrictEqual(existing.data, action.input.values);

  const upserted =
    preview.operation === "create"
      ? await deps.createEntry(contentType.id, {
          title: action.input.title,
          slug: action.input.slug,
          data: action.input.values,
          authorId: actorId,
        })
      : preview.operation === "update" && existing && needsEntryUpdate
        ? await deps.updateEntry(existing.id, {
            title: action.input.title,
            slug: action.input.slug,
            data: action.input.values,
          })
        : existing;
  if (!upserted) throw new Error("assistant_action_dependency_missing");

  if (action.input.seo && preview.operation !== "noop") {
    await deps.updateEntryMetadata(upserted.id, { seo: action.input.seo }, actorId);
  }

  const record =
    preview.operation === "noop" ? upserted : await deps.publishEntry(upserted.id, actorId);
  if (!record) throw new Error("assistant_action_dependency_missing");
  const publicHref = await buildEntryPublicHref(action.input.contentTypeSlug, record.slug, deps);

  return {
    actionId: action.id,
    type: action.type,
    targetType: "entry",
    targetKey: `${action.input.contentTypeSlug}/${action.input.slug}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: `/admin/advanced/entries/${encodeURIComponent(action.input.contentTypeSlug)}/${encodeURIComponent(record.id)}`,
    publicHref,
    message:
      preview.operation === "noop"
        ? "Public sample entry already matched the planned data."
        : "Public sample entry is published.",
  };
};

const executeEntryDeleteAction = async (
  action: AssistantEntryDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getEntry(action.input.id);
  const contentType = action.input.contentTypeSlug
    ? await deps.getContentTypeBySlug(action.input.contentTypeSlug)
    : null;
  if (
    !existing ||
    (action.input.expectedTitle && existing.title !== action.input.expectedTitle) ||
    (action.input.expectedSlug && existing.slug !== action.input.expectedSlug) ||
    (action.input.expectedStatus && existing.status !== action.input.expectedStatus) ||
    (contentType && existing.typeId !== contentType.id)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const deleted = await deps.deleteEntry(existing.id);
  if (!deleted) throw new Error("assistant_action_dependency_missing");
  return {
    actionId: action.id,
    type: action.type,
    targetType: "entry",
    targetKey: action.input.expectedSlug ?? action.input.id,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: action.input.contentTypeSlug
      ? `/admin/advanced/entries/${encodeURIComponent(action.input.contentTypeSlug)}`
      : "/admin/advanced/entries",
    publicHref: null,
    message: `Deleted entry "${deleted.title}".`,
  };
};

const executeEntryUpdateAction = async (
  action: AssistantEntryUpdateAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getEntry(action.input.id);
  const contentType = action.input.contentTypeSlug
    ? await deps.getContentTypeBySlug(action.input.contentTypeSlug)
    : null;
  if (
    !existing ||
    (action.input.expectedTitle && existing.title !== action.input.expectedTitle) ||
    (action.input.expectedSlug && existing.slug !== action.input.expectedSlug) ||
    (action.input.expectedStatus && existing.status !== action.input.expectedStatus) ||
    (contentType && existing.typeId !== contentType.id)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const data = action.input.patch.values
    ? { ...existing.data, ...action.input.patch.values }
    : existing.data;
  const entry =
    preview.operation === "noop"
      ? existing
      : await deps.updateEntry(existing.id, {
          title: action.input.patch.title ?? existing.title,
          slug: action.input.patch.slug ?? existing.slug,
          data,
        });
  if (!entry) throw new Error("assistant_action_dependency_missing");
  const metadata =
    action.input.patch.status || action.input.patch.seo
      ? await deps.updateEntryMetadata(
          entry.id,
          {
            status: action.input.patch.status,
            seo: action.input.patch.seo,
          },
          actorId
        )
      : entry;
  if (!metadata) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "entry",
    targetKey: action.input.expectedSlug ?? action.input.id,
    operation: preview.operation,
    status: "success" as const,
    resourceId: metadata.id,
    adminHref: action.input.contentTypeSlug
      ? `/admin/advanced/entries/${encodeURIComponent(action.input.contentTypeSlug)}/${encodeURIComponent(metadata.id)}`
      : "/admin/advanced/entries",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Entry already matched the planned patch."
        : `Updated entry "${metadata.title}".`,
  };
};

const executeMenuUpsertAction = async (
  action: AssistantMenuUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await findMenuByLocation(action.input.location, deps);
  const record =
    preview.operation === "create"
      ? await deps.createMenu(action.input)
      : preview.operation === "update" && existing
        ? await deps.updateMenu(existing.id, action.input)
        : existing;
  if (!record) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "menu",
    targetKey: action.input.location,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: `/admin/menus/${encodeURIComponent(record.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Menu already matched the planned location."
        : `Menu "${record.name}" is ready.`,
  };
};

const executeMenuItemAction = async (
  action: AssistantMenuItemUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "priorResults">
) => {
  const menuId = await resolveResourceIdInput(action.input.menuId, deps, ctx);
  const existingItems = flattenMenuNodes(await deps.listMenuItems(menuId));
  const existing = findMenuItemForAction(existingItems, action);
  const nextItem = buildNextMenuItem(action, existing, existingItems.length);
  const operation = resolveMenuItemExecutionOperation(preview, existing, nextItem);
  const nextItems =
    operation === "create"
      ? [...existingItems, nextItem]
      : operation === "update"
        ? existingItems.map((item) => (existing && item.id === existing.id ? nextItem : item))
        : existingItems;

  const tree =
    operation === "noop"
      ? await deps.listMenuItems(menuId)
      : await deps.replaceMenuItems(menuId, nextItems);
  const saved =
    flattenMenuNodes(tree).find((item) => item.href === action.input.href) ?? existing ?? null;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "menu-item",
    targetKey: `${menuId}/${action.input.href}`,
    operation,
    status: "success" as const,
    resourceId: saved?.id ?? null,
    adminHref: `/admin/menus/${encodeURIComponent(menuId)}`,
    publicHref: action.input.href,
    message:
      operation === "noop"
        ? "Menu item already matched the planned navigation link."
        : "Menu item is ready in navigation.",
  };
};

const executeMenuItemDeleteAction = async (
  action: AssistantMenuItemDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existingItems = flattenMenuNodes(await deps.listMenuItems(action.input.menuId));
  const existing = existingItems.find((item) => item.id === action.input.itemId) ?? null;
  if (
    !existing ||
    existing.label !== action.input.label ||
    (action.input.expectedHref !== undefined && existing.href !== action.input.expectedHref) ||
    (action.input.expectedParentId !== undefined &&
      existing.parentId !== action.input.expectedParentId)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const deleted = await deps.deleteMenuItem(action.input.menuId, action.input.itemId);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "menu-item",
    targetKey: `${action.input.menuId}/${action.input.itemId}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.deleted.id,
    adminHref: `/admin/menus/${encodeURIComponent(action.input.menuId)}`,
    publicHref: deleted.deleted.href,
    message: `Deleted menu item "${deleted.deleted.label}".`,
  };
};

const executeMenuItemUpdateAction = async (
  action: AssistantMenuItemUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existingItems = flattenMenuNodes(await deps.listMenuItems(action.input.menuId));
  const existing = existingItems.find((item) => item.id === action.input.itemId) ?? null;
  if (
    !existing ||
    existing.label !== action.input.label ||
    (action.input.expectedHref !== undefined && existing.href !== action.input.expectedHref) ||
    (action.input.expectedParentId !== undefined &&
      existing.parentId !== action.input.expectedParentId)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const nextItems = existingItems.map((item) =>
    item.id === existing.id
      ? {
          ...item,
          ...action.input.patch,
        }
      : item
  );
  const tree =
    preview.operation === "noop"
      ? await deps.listMenuItems(action.input.menuId)
      : await deps.replaceMenuItems(action.input.menuId, nextItems);
  const saved = flattenMenuNodes(tree).find((item) => item.id === existing.id) ?? null;
  if (!saved) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "menu-item",
    targetKey: `${action.input.menuId}/${action.input.itemId}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: saved.id,
    adminHref: `/admin/menus/${encodeURIComponent(action.input.menuId)}`,
    publicHref: saved.href,
    message:
      preview.operation === "noop"
        ? "Menu item already matched the planned patch."
        : `Updated menu item "${saved.label}".`,
  };
};

const executeSeoDocumentAction = async (
  action: AssistantSeoDocumentUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "priorResults">
) => {
  const resolvedTargetId = await resolveResourceIdInput(action.input.targetId, deps, ctx);
  const resolvedAction = {
    ...action,
    input: {
      ...action.input,
      targetId: resolvedTargetId,
    },
  };
  const target = await loadSeoActionTarget(resolvedAction, deps);
  if (!target) {
    throw new Error("assistant_action_dependency_missing");
  }

  const existing = await deps.getSeoDocumentByTarget(action.input.targetType, resolvedTargetId);
  const nextValue = buildSeoNextValue(resolvedAction, existing, target);
  const record = preview.operation === "noop" ? existing : await deps.upsertSeoDocument(nextValue);

  return {
    actionId: action.id,
    type: action.type,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${resolvedTargetId}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: record ? `/admin/seo/${encodeURIComponent(record.id)}` : "/admin/seo",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "SEO document already matched the planned metadata."
        : "SEO document is ready.",
  };
};

const executeSeoDocumentDeleteAction = async (
  action: AssistantSeoDocumentDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getSeoDocument(action.input.id);
  const expectedSlug = action.input.expectedSlug
    ? normalizeSeoSlugForAction(action.input.expectedSlug)
    : null;
  if (
    !existing ||
    existing.targetType !== action.input.targetType ||
    existing.targetId !== action.input.targetId ||
    (expectedSlug && normalizeSeoSlugForAction(existing.slug) !== expectedSlug) ||
    (action.input.expectedTitle && existing.title !== action.input.expectedTitle)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const deleted = await deps.deleteSeoDocument(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${action.input.targetId}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/seo",
    publicHref: null,
    message: `Deleted SEO document for ${deleted.targetType} ${deleted.targetId}.`,
  };
};

const executeSeoDocumentUpdateAction = async (
  action: AssistantSeoDocumentUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getSeoDocument(action.input.id);
  const expectedSlug = action.input.expectedSlug
    ? normalizeSeoSlugForAction(action.input.expectedSlug)
    : null;
  if (
    !existing ||
    existing.targetType !== action.input.targetType ||
    existing.targetId !== action.input.targetId ||
    (expectedSlug && normalizeSeoSlugForAction(existing.slug) !== expectedSlug) ||
    (action.input.expectedTitle && existing.title !== action.input.expectedTitle)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateSeoDocumentById(existing.id, action.input.patch);
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${action.input.targetId}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/seo/${encodeURIComponent(updated.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "SEO document already matched the planned patch."
        : `Updated SEO document for ${updated.targetType} ${updated.targetId}.`,
  };
};

const executeMediaReferenceAction = async (
  action: AssistantMediaReferenceAttachAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const [media, entry] = await Promise.all([
    deps.getMediaById(action.input.mediaId),
    deps.getEntry(action.input.targetId),
  ]);
  if (!media || !entry) {
    throw new Error("assistant_action_dependency_missing");
  }

  const nextData = buildMediaReferenceNextData(action, entry.data);
  const record =
    preview.operation === "noop"
      ? entry
      : await deps.updateEntry(entry.id, {
          data: nextData,
        });

  return {
    actionId: action.id,
    type: action.type,
    targetType: "media-reference",
    targetKey: `${action.input.targetType}/${action.input.targetId}/${action.input.field}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/entries",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Media reference already matched the planned field value."
        : "Media reference is attached to the entry draft.",
  };
};

const executePageAction = async (
  action: AssistantPageUpsertAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getPageBySlug(action.input.slug);
  const currentCatalogSource = readPageCatalogSource(existing);
  const currentFormSource = readFormEmbedSource(existing);
  const listingQueries = await deps.listListingQueries();
  const listingTemplates = await deps.listListingTemplates();
  const forms = action.input.formEmbed ? await deps.listForms() : [];
  const requestedListingQueryName =
    action.input.listingQueryName ?? action.input.collectionLink?.listingQueryName ?? null;
  const requestedListingTemplateSlug =
    action.input.listingTemplateSlug ?? action.input.collectionLink?.listingTemplateSlug ?? null;
  const requestedListingQueryId = action.input.collectionLink?.listingQueryId ?? null;
  const requestedListingTemplateId = action.input.collectionLink?.listingTemplateId ?? null;
  const simplePageMode =
    !requestedListingQueryName &&
    !requestedListingTemplateSlug &&
    !requestedListingQueryId &&
    !requestedListingTemplateId;
  const listingQueryById = requestedListingQueryId
    ? (listingQueries.find((entry) => entry.id === requestedListingQueryId) ?? null)
    : null;
  const listingQueryByName = requestedListingQueryName
    ? (listingQueries.find((entry) => entry.name === requestedListingQueryName) ?? null)
    : null;
  if (
    requestedListingQueryId &&
    listingQueryByName &&
    listingQueryByName.id !== requestedListingQueryId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const listingQueryFromCurrent = currentCatalogSource?.listingQueryId
    ? (listingQueries.find((entry) => entry.id === currentCatalogSource.listingQueryId) ?? null)
    : null;
  const listingQuery = listingQueryById ?? listingQueryByName ?? listingQueryFromCurrent;
  const listingTemplateById = requestedListingTemplateId
    ? (listingTemplates.find((entry) => entry.id === requestedListingTemplateId) ?? null)
    : null;
  const listingTemplateBySlug = requestedListingTemplateSlug
    ? (listingTemplates.find((entry) => entry.slug === requestedListingTemplateSlug) ?? null)
    : null;
  if (
    requestedListingTemplateId &&
    listingTemplateBySlug &&
    listingTemplateBySlug.id !== requestedListingTemplateId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const listingTemplateFromCurrent = currentCatalogSource?.listingTemplateId
    ? (listingTemplates.find((entry) => entry.id === currentCatalogSource.listingTemplateId) ??
      null)
    : null;
  const listingTemplate =
    listingTemplateById ?? listingTemplateBySlug ?? listingTemplateFromCurrent;
  const form = action.input.formEmbed
    ? (forms.find((entry) => entry.name === action.input.formEmbed?.formName) ??
      (currentFormSource?.formId
        ? forms.find((entry) => entry.id === currentFormSource.formId)
        : null) ??
      null)
    : null;

  if (
    (!simplePageMode && (!listingQuery || !listingTemplate)) ||
    (action.input.formEmbed && !form)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }

  const resolvedFormEmbed =
    form && action.input.formEmbed
      ? {
          formId: form.id,
          title: action.input.formEmbed.title,
          description: action.input.formEmbed.description,
          submitLabel: action.input.formEmbed.submitLabel,
          successMessage: action.input.formEmbed.successMessage,
        }
      : null;
  const resolvedCollectionLink = await resolveAssistantPageCollectionLink({
    action,
    existing,
    simplePageMode,
    listingQuery,
    listingTemplate,
    deps,
  });
  const data = simplePageMode
    ? buildSimplePageData({
        introTitle: action.input.introTitle,
        introBody: action.input.introBody,
        sections: action.input.sections,
        formEmbed: resolvedFormEmbed,
        collectionLink: resolvedCollectionLink,
      })
    : buildCatalogPageData({
        introTitle: action.input.introTitle,
        introBody: action.input.introBody,
        listingQueryId: listingQuery!.id,
        listingTemplateId: listingTemplate!.id,
        ctaLabel: action.input.ctaLabel ?? "Read more",
        contentListStyle: action.input.contentListStyle,
        listingFilters: action.input.listingFilters,
        sections: action.input.sections,
        formEmbed: resolvedFormEmbed,
        collectionLink: resolvedCollectionLink,
      });

  const page =
    preview.operation === "create"
      ? await deps.createPage({
          title: action.input.title,
          slug: action.input.slug,
          data,
          authorId: actorId,
        })
      : preview.operation === "update" && existing
        ? await deps.updatePage(existing.id, {
            title: action.input.title,
            slug: action.input.slug,
            data,
          })
        : existing;

  const pageId = page?.id ?? existing?.id ?? null;
  if (!pageId) {
    throw new Error("assistant_action_dependency_missing");
  }

  if (action.input.status === "published") {
    await deps.publishPage(pageId, actorId, data);
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "page",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: pageId,
    adminHref: `/admin/pages/${encodeURIComponent(pageId)}`,
    publicHref: action.input.slug,
    message:
      preview.operation === "noop"
        ? "Catalog page already matched the plan."
        : "Public catalog page is ready at /projekty-domow.",
  };
};

const executeDetailPageAction = async (
  action: AssistantDetailPageUpsertAction,
  preview: AssistantActionPreviewChange,
  ctx: ActionHandlerContext
): Promise<AssistantActionExecutionItem> => {
  const document = await resolveDetailPageActionDocument(action, ctx.deps, ctx);
  const prepared = await ctx.deps.prepareDetailPageDocumentUpsert({
    document,
    expectedExistingId: action.input.expectedExistingId,
  });
  const targetKey = `${prepared.contentType.slug}/${prepared.document.id}`;
  const beforeRecord = prepared.existing;
  const record =
    preview.operation === "noop"
      ? prepared.existing
      : (
          await ctx.deps.upsertDetailPageDocument({
            document: prepared.document,
            expectedExistingId: action.input.expectedExistingId,
          })
        ).record;

  const finalRecord = record ?? beforeRecord;
  if (!finalRecord) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "detail-page",
    targetKey,
    operation: preview.operation,
    status: "success",
    resourceId: finalRecord.id,
    adminHref: `/admin/advanced/engine/${encodeURIComponent(
      prepared.contentType.id
    )}/collection/detail-template/${encodeURIComponent(finalRecord.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Detail template already matched the planned document."
        : `Detail template "${finalRecord.name}" is ready for ${prepared.contentType.slug}.`,
  };
};

const executePageUpdateAction = async (
  action: AssistantPageUpdateAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getPage(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const existingSlug = normalizePageActionSlug(existing?.slug);
  const expectedSlug = normalizePageActionSlug(action.input.slug);
  if (
    !existing ||
    existing.title !== action.input.title ||
    existingSlug !== expectedSlug ||
    (expectedStatus && existing.status !== expectedStatus)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }

  const currentData = isRecord(existing.currentData) ? existing.currentData : {};
  const nextData = applyPageUpdatePatch(currentData, action.input.patch);
  const nextTitle = action.input.patch.title ?? existing.title;
  const nextSlug = action.input.patch.slug ?? existing.slug;
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updatePage(existing.id, {
          title: nextTitle,
          slug: nextSlug,
          data: nextData,
        });
  if (!updated) throw new Error("assistant_action_dependency_missing");

  const statusPatch = action.input.patch.status;
  const shouldRefreshPublishedPage =
    statusPatch === "published" ||
    (!statusPatch && expectedStatus === "published" && updated.status === "published");
  const publishedSourceData = isRecord(existing.publishedData)
    ? existing.publishedData
    : currentData;
  const publishData =
    statusPatch === "published"
      ? nextData
      : applyPageUpdatePatch(publishedSourceData, action.input.patch);
  const record = shouldRefreshPublishedPage
    ? await deps.publishPage(updated.id, actorId, publishData)
    : statusPatch === "draft" && updated.status === "published"
      ? await deps.unpublishPage(updated.id)
      : updated;
  if (!record) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "page",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: `/admin/pages/${encodeURIComponent(record.id)}`,
    publicHref: record.status === "published" ? record.slug : null,
    message:
      preview.operation === "noop"
        ? "Page metadata already matched the planned patch."
        : `Updated page "${record.title}".`,
  };
};

const executePageDeleteAction = async (
  action: AssistantPageDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getPage(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.title !== action.input.title ||
    normalizePageActionSlug(existing.slug) !== normalizePageActionSlug(action.input.slug) ||
    (expectedStatus && existing.status !== expectedStatus)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }

  const deleted = await deps.deletePage(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "page",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/pages",
    publicHref: null,
    message: `Deleted page "${deleted.title}".`,
  };
};

const executeWidgetTemplateDeleteAction = async (
  action: AssistantWidgetTemplateDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedCategory = action.input.expectedCategory?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    (expectedStatus && existing.status !== expectedStatus) ||
    (expectedCategory && existing.category !== expectedCategory)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }

  const deleted = await deps.deleteWidgetTemplate(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "widget-template",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/widgets",
    publicHref: null,
    message: `Deleted widget template "${deleted.name}".`,
  };
};

const executeWidgetTemplateUpdateAction = async (
  action: AssistantWidgetTemplateUpdateAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedCategory = action.input.expectedCategory?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    (expectedStatus && existing.status !== expectedStatus) ||
    (expectedCategory && existing.category !== expectedCategory)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const nextValue = applyWidgetTemplateUpdatePatch(existing, action.input.patch);
  if (!nextValue) throw new Error("assistant_action_dependency_missing");
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateWidgetTemplate(
          existing.id,
          {
            name: nextValue.name,
            description: nextValue.description,
            category: nextValue.category,
            status: nextValue.status,
            settings: nextValue.settings,
          },
          actorId
        );
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "widget-template",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/advanced/widgets/templates/${encodeURIComponent(updated.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Widget template already matched the planned patch."
        : `Updated widget template "${updated.name}".`,
  };
};

const executeWidgetTemplateBlockPatchAction = async (
  action: AssistantWidgetTemplateBlockPatchAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    (expectedStatus && existing.status !== expectedStatus)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const patch = applyPageWidgetDataPatch(existing.blocks, {
    blockId: action.input.blockId,
    expectedBlockType: action.input.expectedBlockType,
    dataPath: action.input.dataPath,
    value: action.input.value,
  });
  if (patch.status !== "ok") throw new Error("assistant_action_dependency_missing");
  normalizeAssistantPagePatchBlock(patch.block!);
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateWidgetTemplate(
          existing.id,
          {
            blocks: patch.blocks,
          },
          actorId
        );
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "widget-template",
    targetKey: `${action.input.name}/${action.input.blockId}/${action.input.dataPath.join(".")}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/advanced/widgets/templates/${encodeURIComponent(updated.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Widget template block already matched the planned patch."
        : `Patched widget template block "${action.input.blockId}".`,
  };
};

const executeSiteKitRecommendAction = async (
  action: AssistantSiteKitRecommendAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const plan = deps.previewSiteKitPlan(action.input);
  return {
    actionId: action.id,
    type: action.type,
    targetType: "site-kit",
    targetKey: plan.selectedKitId,
    operation: preview.operation,
    status: "success",
    resourceId: plan.selectedKitId,
    adminHref: "/admin/advanced/solution-kits",
    publicHref: null,
    message: `Recommended ${plan.selectedKitTitle} for the requested setup.`,
    details: {
      siteKit: {
        plan,
      },
    },
  };
};

const executeSiteKitInstallAction = async (
  action: AssistantSiteKitInstallAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const execution = await deps.executeSiteKit({
    businessType: action.input.businessType,
    goals: [...action.input.goals],
    locale: action.input.locale,
    region: action.input.region,
    siteName: action.input.siteName,
    preferredKitId: action.input.preferredKitId,
    selectedKitId: action.input.selectedKitId,
    enabledStepIds: action.input.enabledStepIds ? [...action.input.enabledStepIds] : undefined,
    advancedRuntimeOverrides: action.input.advancedRuntimeOverrides,
    dryRun: action.input.dryRun,
    continueOnError: action.input.continueOnError,
    settingsPatch: action.input.settingsPatch,
    notes: action.input.notes,
    actorId,
  });

  return {
    actionId: action.id,
    type: action.type,
    targetType: "site-kit",
    targetKey: execution.selectedKitId,
    operation: preview.operation,
    status: "success",
    resourceId: execution.execution.run.id,
    adminHref: "/admin/advanced/solution-kits",
    publicHref: null,
    message: `Site kit ${execution.selectedKitTitle} finished with ${execution.validation.status} validation status.`,
    details: {
      siteKit: {
        plan: execution,
        execution,
        validation: execution.validation,
      },
    },
  };
};

const executeSiteKitValidateAction = async (
  action: AssistantSiteKitValidateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const validation = await deps.validateSiteKitRun(action.input);
  return {
    actionId: action.id,
    type: action.type,
    targetType: "site-kit-run",
    targetKey: action.input.runId,
    operation: preview.operation,
    status: "success",
    resourceId: action.input.runId,
    adminHref: "/admin/advanced/solution-kits",
    publicHref: null,
    message: `Site kit run validation finished with ${validation.status} status.`,
    details: {
      siteKit: {
        validation,
      },
    },
  };
};

const actionHandlers = createAssistantActionRegistry<AssistantActionHandler>({
  "setting.content-route.upsert": {
    preview: (action, ctx) =>
      action.type === "setting.content-route.upsert"
        ? buildContentRoutePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "setting.content-route.upsert"
        ? executeContentRouteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "content-type.upsert": {
    preview: (action, ctx) =>
      action.type === "content-type.upsert"
        ? buildContentTypePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "content-type.upsert"
        ? executeContentTypeAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "content-type.field.add": {
    preview: (action, ctx) =>
      action.type === "content-type.field.add"
        ? buildContentTypeFieldAddPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "content-type.field.add"
        ? executeContentTypeFieldAddAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "content-type.delete": {
    preview: (action, ctx) =>
      action.type === "content-type.delete"
        ? buildContentTypeDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "content-type.delete"
        ? executeContentTypeDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.upsert": {
    preview: (action, ctx) =>
      action.type === "custom-screen.upsert"
        ? buildCustomScreenPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.upsert"
        ? executeCustomScreenAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.delete": {
    preview: (action, ctx) =>
      action.type === "custom-screen.delete"
        ? buildCustomScreenDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.delete"
        ? executeCustomScreenDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.update": {
    preview: (action, ctx) =>
      action.type === "custom-screen.update"
        ? buildCustomScreenUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.update"
        ? executeCustomScreenUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "custom-screen.widget.patch": {
    preview: (action, ctx) =>
      action.type === "custom-screen.widget.patch"
        ? buildCustomScreenWidgetPatchPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "custom-screen.widget.patch"
        ? executeCustomScreenWidgetPatchAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-query.upsert": {
    preview: (action, ctx) =>
      action.type === "listing-query.upsert"
        ? buildListingQueryPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-query.upsert"
        ? executeListingQueryAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-query.delete": {
    preview: (action, ctx) =>
      action.type === "listing-query.delete"
        ? buildListingQueryDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-query.delete"
        ? executeListingQueryDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-query.update": {
    preview: (action, ctx) =>
      action.type === "listing-query.update"
        ? buildListingQueryUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-query.update"
        ? executeListingQueryUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-query.filters.patch": {
    preview: (action, ctx) =>
      action.type === "listing-query.filters.patch"
        ? buildListingQueryFiltersPatchPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-query.filters.patch"
        ? executeListingQueryFiltersPatchAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-template.upsert": {
    preview: (action, ctx) =>
      action.type === "listing-template.upsert"
        ? buildListingTemplatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-template.upsert"
        ? executeListingTemplateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-template.delete": {
    preview: (action, ctx) =>
      action.type === "listing-template.delete"
        ? buildListingTemplateDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-template.delete"
        ? executeListingTemplateDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-template.update": {
    preview: (action, ctx) =>
      action.type === "listing-template.update"
        ? buildListingTemplateUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-template.update"
        ? executeListingTemplateUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "listing-template.card.patch": {
    preview: (action, ctx) =>
      action.type === "listing-template.card.patch"
        ? buildListingTemplateCardPatchPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "listing-template.card.patch"
        ? executeListingTemplateCardPatchAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "form.automation.upsert": {
    preview: (action, ctx) =>
      action.type === "form.automation.upsert"
        ? buildFormAutomationPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "form.automation.upsert"
        ? executeFormAutomationAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "form.upsert": {
    preview: (action, ctx) =>
      action.type === "form.upsert" ? buildFormPreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "form.upsert"
        ? executeFormAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "form.delete": {
    preview: (action, ctx) =>
      action.type === "form.delete" ? buildFormDeletePreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "form.delete"
        ? executeFormDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "form.archive": {
    preview: (action, ctx) =>
      action.type === "form.archive"
        ? buildFormArchivePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "form.archive"
        ? executeFormArchiveAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "form.update": {
    preview: (action, ctx) =>
      action.type === "form.update" ? buildFormUpdatePreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "form.update"
        ? executeFormUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "entry.upsert-draft": {
    preview: (action, ctx) =>
      action.type === "entry.upsert-draft"
        ? buildEntryUpsertDraftPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "entry.upsert-draft"
        ? executeEntryUpsertDraftAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "entry.sample.create": {
    preview: (action, ctx) =>
      action.type === "entry.sample.create"
        ? buildEntrySampleCreatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "entry.sample.create"
        ? executeEntrySampleCreateAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "entry.delete": {
    preview: (action, ctx) =>
      action.type === "entry.delete"
        ? buildEntryDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "entry.delete"
        ? executeEntryDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "entry.update": {
    preview: (action, ctx) =>
      action.type === "entry.update"
        ? buildEntryUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "entry.update"
        ? executeEntryUpdateAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "menu.upsert": {
    preview: (action, ctx) =>
      action.type === "menu.upsert" ? buildMenuUpsertPreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "menu.upsert"
        ? executeMenuUpsertAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "menu.item.upsert": {
    preview: (action, ctx) =>
      action.type === "menu.item.upsert"
        ? buildMenuItemPreview(action, ctx.deps, ctx)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "menu.item.upsert"
        ? executeMenuItemAction(action, preview, ctx.deps, ctx)
        : unexpectedAction(),
  },
  "menu.item.delete": {
    preview: (action, ctx) =>
      action.type === "menu.item.delete"
        ? buildMenuItemDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "menu.item.delete"
        ? executeMenuItemDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "menu.item.update": {
    preview: (action, ctx) =>
      action.type === "menu.item.update"
        ? buildMenuItemUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "menu.item.update"
        ? executeMenuItemUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "seo.document.upsert": {
    preview: (action, ctx) =>
      action.type === "seo.document.upsert"
        ? buildSeoDocumentPreview(action, ctx.deps, ctx)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "seo.document.upsert"
        ? executeSeoDocumentAction(action, preview, ctx.deps, ctx)
        : unexpectedAction(),
  },
  "seo.document.delete": {
    preview: (action, ctx) =>
      action.type === "seo.document.delete"
        ? buildSeoDocumentDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "seo.document.delete"
        ? executeSeoDocumentDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "seo.document.update": {
    preview: (action, ctx) =>
      action.type === "seo.document.update"
        ? buildSeoDocumentUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "seo.document.update"
        ? executeSeoDocumentUpdateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "media.reference.attach": {
    preview: (action, ctx) =>
      action.type === "media.reference.attach"
        ? buildMediaReferencePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "media.reference.attach"
        ? executeMediaReferenceAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "page.upsert": {
    preview: (action, ctx) =>
      action.type === "page.upsert" ? buildPagePreview(action, ctx) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "page.upsert"
        ? executePageAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "detail-page.upsert": {
    preview: (action, ctx) =>
      action.type === "detail-page.upsert"
        ? buildDetailPagePreview(action, ctx)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "detail-page.upsert"
        ? executeDetailPageAction(action, preview, ctx)
        : unexpectedAction(),
  },
  "page.update": {
    preview: (action, ctx) =>
      action.type === "page.update" ? buildPageUpdatePreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "page.update"
        ? executePageUpdateAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "page.delete": {
    preview: (action, ctx) =>
      action.type === "page.delete" ? buildPageDeletePreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "page.delete"
        ? executePageDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "widget-template.delete": {
    preview: (action, ctx) =>
      action.type === "widget-template.delete"
        ? buildWidgetTemplateDeletePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "widget-template.delete"
        ? executeWidgetTemplateDeleteAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "widget-template.update": {
    preview: (action, ctx) =>
      action.type === "widget-template.update"
        ? buildWidgetTemplateUpdatePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "widget-template.update"
        ? executeWidgetTemplateUpdateAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "widget-template.block.patch": {
    preview: (action, ctx) =>
      action.type === "widget-template.block.patch"
        ? buildWidgetTemplateBlockPatchPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "widget-template.block.patch"
        ? executeWidgetTemplateBlockPatchAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "site-kit.recommend": {
    preview: (action, ctx) =>
      action.type === "site-kit.recommend"
        ? buildSiteKitRecommendPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "site-kit.recommend"
        ? executeSiteKitRecommendAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "site-kit.install": {
    preview: (action, ctx) =>
      action.type === "site-kit.install"
        ? buildSiteKitInstallPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "site-kit.install"
        ? executeSiteKitInstallAction(action, preview, ctx.actorId, ctx.deps)
        : unexpectedAction(),
  },
  "site-kit.validate": {
    preview: (action) =>
      action.type === "site-kit.validate"
        ? buildSiteKitValidatePreview(action)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "site-kit.validate"
        ? executeSiteKitValidateAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
});

const buildPreviewForAction = async (
  action: AssistantPlannedAction,
  deps: ActionExecutorDeps,
  planActions: AssistantPlannedAction[] = [],
  actionIndex = 0
): Promise<AssistantActionPreviewChange> =>
  getAssistantActionHandler(actionHandlers, action.type).preview(action, {
    deps,
    actorId: "",
    planActions,
    actionIndex,
  });

const hasBlockingPreviewConflicts = (changes: AssistantActionPreviewChange[]) =>
  changes.some((change) => change.conflicts.some((conflict) => conflict.severity === "error"));

export const dryRunAssistantActionPlan = async (
  input: { plan: AssistantActionPlan },
  deps: ActionExecutorDeps = defaultDeps
): Promise<AssistantActionDryRunResult> => {
  const plan = assertAssistantActionPlan(input.plan);
  const changes: AssistantActionPreviewChange[] = [];
  for (const [index, action] of plan.actions.entries()) {
    changes.push(await buildPreviewForAction(action, deps, plan.actions, index));
  }

  return {
    plan,
    changes,
    warnings: changes.flatMap((change) => change.warnings),
    readyToExecute:
      plan.status === "ready" &&
      plan.questions.length === 0 &&
      plan.actions.length > 0 &&
      !hasBlockingPreviewConflicts(changes),
  };
};

const executeAction = async (
  action: AssistantPlannedAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex" | "priorResults">
): Promise<AssistantActionExecutionItem> =>
  getAssistantActionHandler(actionHandlers, action.type).execute(action, preview, {
    deps,
    actorId,
    planActions: ctx.planActions,
    actionIndex: ctx.actionIndex,
    priorResults: ctx.priorResults,
  });

export const executeAssistantActionPlan = async (
  input: {
    plan: AssistantActionPlan;
    actorId: string;
    idempotencyKey: string;
  },
  deps: ActionExecutorDeps = defaultDeps
): Promise<AssistantActionExecuteResult> => {
  const plan = assertAssistantActionPlan(input.plan);
  if (!input.actorId?.trim()) {
    throw new Error("assistant_action_actor_required");
  }
  if (!input.idempotencyKey?.trim()) {
    throw new Error("assistant_action_idempotency_required");
  }

  const planHash = hashAssistantActionPlan(plan);
  cleanupExecutionCache();
  const cached = deps.getExecutionResult
    ? await deps.getExecutionResult({
        idempotencyKey: input.idempotencyKey,
        actorId: input.actorId,
        planId: plan.id,
        planHash,
      })
    : readMemoryExecutionResult({
        idempotencyKey: input.idempotencyKey,
        actorId: input.actorId,
        planId: plan.id,
        planHash,
      });
  if (cached) {
    recordAssistantActionMetric({
      failedCount: cached.summary.failed,
      replayed: true,
    });
    return withAssistantActionExecutionReplayMetadata(cached, true);
  }

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  if (!preview.readyToExecute) {
    throw new Error("assistant_action_plan_not_ready");
  }

  const results: AssistantActionExecutionItem[] = [];
  const priorResults = new Map<string, AssistantActionExecutionItem>();
  for (const [index, change] of preview.changes.entries()) {
    const action = plan.actions.find((entry) => entry.id === change.actionId);
    if (!action) {
      throw new Error("assistant_action_plan_invalid");
    }
    try {
      const result = await executeAction(action, change, input.actorId, deps, {
        planActions: plan.actions,
        actionIndex: index,
        priorResults,
      });
      results.push(result);
      priorResults.set(action.id, result);
    } catch (error) {
      const result: AssistantActionExecutionItem = {
        actionId: action.id,
        type: action.type,
        targetType: change.targetType,
        targetKey: change.targetKey,
        operation: change.operation,
        status: "failed",
        resourceId: null,
        adminHref: null,
        publicHref: null,
        message: error instanceof Error ? error.message : "Assistant action failed.",
        errorCode: error instanceof Error ? error.message : "assistant_action_failed",
      };
      results.push(result);
      priorResults.set(action.id, result);
    }
  }

  const summary = countExecutionOperations(results);
  const idempotency = {
    replayed: false,
    scope: "actor_plan_hash" as const,
  };
  recordAssistantActionMetric({
    failedCount: summary.failed,
    replayed: false,
  });

  await deps.logAudit({
    actorId: input.actorId,
    action: "assistant.actions.execute",
    targetType: "assistant-action-plan",
    targetId: plan.id,
    metadata: {
      actionIds: plan.actions.map((action) => action.id),
      idempotency,
      summary,
    },
  });

  const executedPlan = reconcileLaunchReadinessAfterExecution(plan, results);
  const result: AssistantActionExecuteResult = {
    plan: executedPlan,
    preview,
    results,
    idempotency,
    summary,
  };
  const undoItems = buildAssistantUndoManifestItems({ plan, preview, results });

  if (deps.saveExecutionResult) {
    await deps.saveExecutionResult({
      idempotencyKey: input.idempotencyKey,
      actorId: input.actorId,
      planId: plan.id,
      planHash,
      result,
      undoItems,
    });
  } else {
    executionCache.set(input.idempotencyKey, {
      result,
      actorId: input.actorId,
      planId: plan.id,
      planHash,
      savedAt: Date.now(),
    });
  }

  return result;
};
