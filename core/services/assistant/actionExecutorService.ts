import { getSetting, setSetting, type ContentRouteSetting } from "../settings/settingsService";
import {
  createContentType,
  deleteContentType,
  getContentTypeBySlug,
  updateContentType,
  type ContentTypeRecord,
  type CreateContentTypeInput,
  type UpdateContentTypeInput,
} from "../content/typeService";
import {
  createCustomScreen,
  deleteCustomScreen,
  getCustomScreen,
  listCustomScreens,
  updateCustomScreen,
} from "../customScreens/customScreenService";
import type { CustomScreenBinding } from "../customScreens/customScreenSchemas";
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
  createEntry,
  deleteEntry,
  getEntry,
  getEntryBySlug,
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
  deleteMenuItem,
  listMenuItems,
  replaceMenuItems,
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
import { normalizePageCollectionLink, type PageCollectionLink } from "../pages/pageCollectionLink";
import type {
  AssistantActionDryRunResult,
  AssistantActionExecuteResult,
  AssistantActionExecutionItem,
  AssistantActionPlan,
  AssistantActionPreviewChange,
  AssistantContentRouteUpsertAction,
  AssistantContentTypeUpsertAction,
  AssistantContentTypeDeleteAction,
  AssistantCustomScreenUpsertAction,
  AssistantCustomScreenDeleteAction,
  AssistantCustomScreenUpdateAction,
  AssistantCustomScreenWidgetPatchAction,
  AssistantEntryUpsertDraftAction,
  AssistantEntryDeleteAction,
  AssistantEntryUpdateAction,
  AssistantFormUpsertAction,
  AssistantFormDeleteAction,
  AssistantFormArchiveAction,
  AssistantFormUpdateAction,
  AssistantFormAutomationUpsertAction,
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
  AssistantPageWidgetPatchAction,
  AssistantPageUpdateAction,
  AssistantPageUpsertAction,
  AssistantPageDeleteAction,
  AssistantWidgetTemplateDeleteAction,
  AssistantWidgetTemplateUpdateAction,
  AssistantWidgetTemplateBlockPatchAction,
  AssistantPlannedAction,
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
  const blocks = Array.isArray(sourceData.blocks) ? sourceData.blocks : [];

  for (const block of blocks) {
    if (!isRecord(block)) continue;
    if (block.type !== "content-list") continue;
    const data = isRecord(block.data) ? block.data : {};
    const source = isRecord(data.source) ? data.source : {};
    const listingQueryId = readString(source.listingQueryId);
    const listingTemplateId = readString(source.listingTemplateId);
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
  const blocks = Array.isArray(sourceData.blocks) ? sourceData.blocks : [];

  for (const block of blocks) {
    if (!isRecord(block)) continue;
    if (block.type !== "form-embed") continue;
    const data = isRecord(block.data) ? block.data : {};
    const formId = readString(data.formId);
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
  blocks?: WidgetBlock[];
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
    blocks: input.blocks,
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
  getContentTypeBySlug: (slug: string) => Promise<ContentTypeRecord | null>;
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
  updateEntryMetadata: typeof updateEntryMetadata;
  getEntry: typeof getEntry;
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

const defaultDeps: ActionExecutorDeps = {
  getSetting,
  setSetting,
  getContentTypeBySlug,
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
  updateEntryMetadata,
  getEntry,
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
  const nextValue = {
    type: action.input.typeSlug,
    listPath: action.input.listPath,
    detailPath: action.input.detailPath,
    enabled: action.input.enabled,
  };
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
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  const existing = contentType
    ? ((await deps.listCustomScreens()).find(
        (entry) => entry.contentTypeId === contentType.id && entry.name === action.input.name
      ) ?? null)
    : null;
  const comparableExisting = existing
    ? {
        name: existing.name,
        contentTypeSlug: action.input.contentTypeSlug,
        status: existing.status,
        showInSidebar: existing.showInSidebar,
        sidebarLabel: existing.sidebarLabel,
        blocks:
          "definition" in existing &&
          isRecord(existing.definition) &&
          isRecord(existing.definition.editorView) &&
          Array.isArray(existing.definition.editorView.blocks)
            ? (existing.definition.editorView.blocks as WidgetBlock[])
            : existing.blocks,
        bindings:
          "definition" in existing &&
          isRecord(existing.definition) &&
          isRecord(existing.definition.editorView) &&
          Array.isArray(existing.definition.editorView.bindings)
            ? (existing.definition.editorView.bindings as CustomScreenBinding[])
            : existing.bindings,
      }
    : null;

  return createPreviewChange({
    action,
    targetType: "custom-screen",
    targetKey: action.input.name,
    summary: `${existing ? "Update" : "Create"} custom screen "${action.input.name}"`,
    warnings: contentType
      ? []
      : ["The content type does not exist yet and will be created earlier in the plan."],
    beforeValue: comparableExisting,
    nextValue: action.input,
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
  const existing =
    (await deps.listListingQueries()).find((entry) => entry.name === action.input.name) ?? null;
  return createPreviewChange({
    action,
    targetType: "listing-query",
    targetKey: action.input.name,
    summary: `${existing ? "Update" : "Create"} listing query "${action.input.name}"`,
    beforeValue: existing,
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

const readPageBlocks = (page: unknown): WidgetBlock[] => {
  if (!isRecord(page)) return [];
  const data = isRecord(page.currentData) ? page.currentData : {};
  return Array.isArray(data.blocks) ? (data.blocks as WidgetBlock[]) : [];
};

const normalizeAssistantPagePatchBlock = (block: WidgetBlock) => {
  ensureRuntimeWidgetsRegistered();
  return normalizeWidgetBlock(block);
};

const applyPageWidgetPatch = (blocks: WidgetBlock[], patchBlock: WidgetBlock) => {
  const normalized = normalizeAssistantPagePatchBlock(patchBlock);
  const existingIndex = blocks.findIndex((block) => block?.id === normalized.id);
  if (existingIndex >= 0) {
    const next = [...blocks];
    next[existingIndex] = normalized;
    return next;
  }
  return [...blocks, normalized];
};

const buildPageWidgetPatchPreview = async (
  action: AssistantPageWidgetPatchAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getPageBySlug(action.input.pageSlug);
  const blocks = readPageBlocks(existing);
  if (action.input.operation === "patch-data") {
    const patch = existing ? applyPageWidgetDataPatch(blocks, action.input) : null;
    const conflictMessage =
      patch?.status === "missing_block"
        ? "Selected page widget block was not found."
        : patch?.status === "type_mismatch"
          ? "Selected page widget block type changed."
          : patch?.status === "missing_path"
            ? "Selected page widget data path does not exist."
            : "Page is required before widget block can be patched.";

    return createPreviewChange({
      action,
      targetType: "page",
      targetKey: `${action.input.pageSlug}/${action.input.blockId}/${action.input.dataPath.join(".")}`,
      summary: `Patch widget block "${action.input.blockId}" on page ${action.input.pageSlug}`,
      warnings: existing ? [] : ["The page does not exist."],
      conflicts:
        existing && patch?.status === "ok"
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
  }

  const nextBlocks = existing ? applyPageWidgetPatch(blocks, action.input.block) : [];

  return createPreviewChange({
    action,
    targetType: "page",
    targetKey: `${action.input.pageSlug}/${action.input.block.id}`,
    summary: `Upsert widget block "${action.input.block.id}" on page ${action.input.pageSlug}`,
    warnings: existing ? [] : ["The page does not exist."],
    conflicts: existing
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error",
            message: "Page is required before widget block can be patched.",
          },
        ],
    beforeValue: existing
      ? {
          blocks,
        }
      : null,
    nextValue: existing
      ? {
          blocks: nextBlocks,
        }
      : null,
  });
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
  deps: ActionExecutorDeps
) => {
  const existingItems = flattenMenuNodes(await deps.listMenuItems(action.input.menuId));
  const existing = findMenuItemForAction(existingItems, action);
  const nextValue = buildNextMenuItem(action, existing, existingItems.length);

  return createPreviewChange({
    action,
    targetType: "menu-item",
    targetKey: `${action.input.menuId}/${action.input.href}`,
    summary: `${existing ? "Update" : "Create"} menu item "${action.input.label}"`,
    dependencies: [
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

const loadSeoActionTarget = async (
  action: AssistantSeoDocumentUpsertAction,
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
  action: AssistantSeoDocumentUpsertAction,
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
  deps: ActionExecutorDeps
) => {
  const target = await loadSeoActionTarget(action, deps);
  const existing = target
    ? await deps.getSeoDocumentByTarget(action.input.targetType, action.input.targetId)
    : null;
  const nextValue = target
    ? buildSeoNextValue(action, existing, target)
    : {
        targetType: action.input.targetType,
        targetId: action.input.targetId,
        ...action.input.seo,
      };

  return createPreviewChange({
    action,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${action.input.targetId}`,
    summary: `${existing ? "Update" : "Create"} SEO document for ${action.input.targetType} ${action.input.targetId}`,
    warnings: target ? [] : ["The SEO target does not exist."],
    dependencies: [
      {
        actionId: null,
        targetType: action.input.targetType,
        targetKey: action.input.targetId,
        optional: false,
      },
    ],
    conflicts: target
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

const buildPagePreview = async (action: AssistantPageUpsertAction, deps: ActionExecutorDeps) => {
  const existing = await deps.getPageBySlug(action.input.slug);
  const simplePageMode =
    Boolean(action.input.blocks) ||
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
  const forms = action.input.formEmbed ? await deps.listForms() : [];
  const form = action.input.formEmbed
    ? (forms.find((entry) => entry.name === action.input.formEmbed?.formName) ??
      (readFormEmbedSource(existing)?.formId
        ? forms.find((entry) => entry.id === readFormEmbedSource(existing)?.formId)
        : null) ??
      null)
    : null;
  const dependencyConflicts =
    (!simplePageMode && (!listingQuery || !listingTemplate)) || (action.input.formEmbed && !form)
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
  if (dependencyConflicts.length === 0) {
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
                        blocks: Array.isArray(existingData.blocks) ? existingData.blocks : [],
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
                        blocks: Array.isArray(existingData.blocks) ? existingData.blocks : [],
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
        blocks: [
          ...(action.input.blocks ?? []).map(normalizeAssistantPagePatchBlock),
          ...(action.input.formEmbed
            ? [
                normalizeAssistantPagePatchBlock({
                  id: "lead-capture-form",
                  type: "form-embed",
                  data: {
                    ...(form ? { formId: form.id } : {}),
                    title: action.input.formEmbed.title,
                    description: action.input.formEmbed.description,
                    submitLabel: action.input.formEmbed.submitLabel,
                    successMessage: action.input.formEmbed.successMessage,
                  },
                }),
              ]
            : []),
        ],
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
    beforeValue: existing
      ? {
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
          ...(simplePageMode
            ? {
                blocks: Array.isArray(existingData.blocks) ? existingData.blocks : [],
                formEmbed: action.input.formEmbed ?? null,
                collectionLink: existingCollectionLink,
              }
            : {}),
        }
      : null,
    nextValue,
  });
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
    existing.slug === action.input.slug &&
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
  const matches = existing?.title === action.input.title && existing.slug === action.input.slug;
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

const executeContentRouteAction = async (
  action: AssistantContentRouteUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const current = ((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
  const nextRoute: ContentRouteSetting = {
    type: action.input.typeSlug,
    listPath: action.input.listPath,
    detailPath: action.input.detailPath,
    enabled: action.input.enabled,
  };

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
        : "Public detail route updated for house projects.",
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
        : "Content type is ready for house project entries.",
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
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  if (!contentType) {
    throw new Error("assistant_action_dependency_missing");
  }

  const existing =
    (await deps.listCustomScreens()).find(
      (entry) => entry.contentTypeId === contentType.id && entry.name === action.input.name
    ) ?? null;

  const record =
    preview.operation === "create"
      ? await deps.createCustomScreen({
          name: action.input.name,
          contentTypeId: contentType.id,
          status: action.input.status,
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

  const existing =
    (await deps.listListingQueries()).find((entry) => entry.name === action.input.name) ?? null;
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

const executePageWidgetPatchAction = async (
  action: AssistantPageWidgetPatchAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getPageBySlug(action.input.pageSlug);
  if (!existing) {
    throw new Error("assistant_action_dependency_missing");
  }
  const currentData = isRecord(existing.currentData) ? existing.currentData : {};
  const blocks = Array.isArray(currentData.blocks) ? (currentData.blocks as WidgetBlock[]) : [];
  let nextBlocks: WidgetBlock[];
  if (action.input.operation === "patch-data") {
    const patch = applyPageWidgetDataPatch(blocks, action.input);
    if (patch.status !== "ok") {
      throw new Error("assistant_action_dependency_missing");
    }
    normalizeAssistantPagePatchBlock(patch.block!);
    nextBlocks = patch.blocks;
  } else {
    nextBlocks = applyPageWidgetPatch(blocks, action.input.block);
  }
  const record =
    preview.operation === "noop"
      ? existing
      : await deps.updatePage(existing.id, {
          data: {
            ...currentData,
            blocks: nextBlocks,
          },
        });

  return {
    actionId: action.id,
    type: action.type,
    targetType: "page",
    targetKey:
      action.input.operation === "patch-data"
        ? `${action.input.pageSlug}/${action.input.blockId}/${action.input.dataPath.join(".")}`
        : `${action.input.pageSlug}/${action.input.block.id}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: record ? `/admin/pages/${encodeURIComponent(record.id)}` : "/admin/pages",
    publicHref: action.input.pageSlug,
    message:
      preview.operation === "noop"
        ? "Page widget block already matched the planned patch."
        : "Page widget block is updated.",
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

const executeMenuItemAction = async (
  action: AssistantMenuItemUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existingItems = flattenMenuNodes(await deps.listMenuItems(action.input.menuId));
  const existing = findMenuItemForAction(existingItems, action);
  const nextItem = buildNextMenuItem(action, existing, existingItems.length);
  const nextItems =
    preview.operation === "create"
      ? [...existingItems, nextItem]
      : existingItems.map((item) => (existing && item.id === existing.id ? nextItem : item));

  const tree =
    preview.operation === "noop"
      ? await deps.listMenuItems(action.input.menuId)
      : await deps.replaceMenuItems(action.input.menuId, nextItems);
  const saved =
    flattenMenuNodes(tree).find((item) => item.href === action.input.href) ?? existing ?? null;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "menu-item",
    targetKey: `${action.input.menuId}/${action.input.href}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: saved?.id ?? null,
    adminHref: `/admin/menus/${encodeURIComponent(action.input.menuId)}`,
    publicHref: action.input.href,
    message:
      preview.operation === "noop"
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
  deps: ActionExecutorDeps
) => {
  const target = await loadSeoActionTarget(action, deps);
  if (!target) {
    throw new Error("assistant_action_dependency_missing");
  }

  const existing = await deps.getSeoDocumentByTarget(
    action.input.targetType,
    action.input.targetId
  );
  const nextValue = buildSeoNextValue(action, existing, target);
  const record = preview.operation === "noop" ? existing : await deps.upsertSeoDocument(nextValue);

  return {
    actionId: action.id,
    type: action.type,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${action.input.targetId}`,
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
  const simplePageMode =
    Boolean(action.input.blocks) ||
    !action.input.listingQueryName ||
    !action.input.listingTemplateSlug;

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
        blocks: action.input.blocks,
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

const executePageUpdateAction = async (
  action: AssistantPageUpdateAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getPage(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.title !== action.input.title ||
    existing.slug !== action.input.slug ||
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
  const record =
    statusPatch === "published" && updated.status !== "published"
      ? await deps.publishPage(updated.id, actorId, nextData)
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
    existing.slug !== action.input.slug ||
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
  "page.widget.patch": {
    preview: (action, ctx) =>
      action.type === "page.widget.patch"
        ? buildPageWidgetPatchPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "page.widget.patch"
        ? executePageWidgetPatchAction(action, preview, ctx.deps)
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
  "menu.item.upsert": {
    preview: (action, ctx) =>
      action.type === "menu.item.upsert"
        ? buildMenuItemPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "menu.item.upsert"
        ? executeMenuItemAction(action, preview, ctx.deps)
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
        ? buildSeoDocumentPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "seo.document.upsert"
        ? executeSeoDocumentAction(action, preview, ctx.deps)
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
      action.type === "page.upsert" ? buildPagePreview(action, ctx.deps) : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "page.upsert"
        ? executePageAction(action, preview, ctx.actorId, ctx.deps)
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
  deps: ActionExecutorDeps
): Promise<AssistantActionPreviewChange> =>
  getAssistantActionHandler(actionHandlers, action.type).preview(action, {
    deps,
    actorId: "",
  });

export const dryRunAssistantActionPlan = async (
  input: { plan: AssistantActionPlan },
  deps: ActionExecutorDeps = defaultDeps
): Promise<AssistantActionDryRunResult> => {
  const plan = assertAssistantActionPlan(input.plan);
  const changes = await Promise.all(
    plan.actions.map((action) => buildPreviewForAction(action, deps))
  );

  return {
    plan,
    changes,
    warnings: changes.flatMap((change) => change.warnings),
    readyToExecute:
      plan.status === "ready" && plan.questions.length === 0 && plan.actions.length > 0,
  };
};

const executeAction = async (
  action: AssistantPlannedAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> =>
  getAssistantActionHandler(actionHandlers, action.type).execute(action, preview, {
    deps,
    actorId,
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
    : (executionCache.get(input.idempotencyKey)?.result ?? null);
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
  for (const change of preview.changes) {
    const action = plan.actions.find((entry) => entry.id === change.actionId);
    if (!action) {
      throw new Error("assistant_action_plan_invalid");
    }
    try {
      const result = await executeAction(action, change, input.actorId, deps);
      results.push(result);
    } catch (error) {
      results.push({
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
      });
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

  const result: AssistantActionExecuteResult = {
    plan,
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
      savedAt: Date.now(),
    });
  }

  return result;
};
