import { getSetting, setSetting, type ContentRouteSetting } from "../settings/settingsService";
import {
  createContentType,
  getContentTypeBySlug,
  updateContentType,
} from "../content/typeService";
import {
  createCustomScreen,
  listCustomScreens,
  updateCustomScreen,
} from "../customScreens/customScreenService";
import type { CustomScreenBinding } from "../customScreens/customScreenSchemas";
import {
  createListingQuery,
  listListingQueries,
  updateListingQuery,
} from "../content/listingQueriesService";
import {
  createListingTemplate,
  listListingTemplates,
  updateListingTemplate,
} from "../content/listingTemplatesService";
import {
  createPage,
  getPageBySlug,
  publishPage,
  updatePage,
} from "../pages/pageService";
import {
  createForm,
  listForms,
  setFormFields,
  updateForm,
} from "../forms/formsService";
import type { FormFieldInput } from "../forms/validation";
import { normalizeSitePath } from "../../site/cache/siteCache";
import { logAudit } from "../audit/auditService";
import type { WidgetBlock } from "../../widgets/types";
import type {
  AssistantActionDryRunResult,
  AssistantActionExecuteResult,
  AssistantActionExecutionItem,
  AssistantActionPlan,
  AssistantActionPreviewChange,
  AssistantContentRouteUpsertAction,
  AssistantContentTypeUpsertAction,
  AssistantCustomScreenUpsertAction,
  AssistantFormUpsertAction,
  AssistantListingQueryUpsertAction,
  AssistantListingTemplateUpsertAction,
  AssistantPageUpsertAction,
  AssistantPlannedAction,
  AssistantSiteKitInstallAction,
  AssistantSiteKitRecommendAction,
  AssistantSiteKitValidateAction,
} from "./actionPlanTypes";
import { createPreviewChange } from "./actionDiffService";
import { isAssistantActionPlan } from "./actionPlanTypes";
import {
  createAssistantActionRegistry,
  getAssistantActionHandler,
} from "./actionRegistry";
import {
  executeGuidedSiteBuilder,
  previewGuidedSiteBuilderPlan,
  validateGuidedSiteBuilderRun,
} from "./siteBuilderExecutor";
import {
  getAssistantActionExecutionByIdempotencyKey,
  hashAssistantActionPlan,
  saveAssistantActionExecutionResult,
} from "./actionExecutionStore";

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
      if (item.operation === "noop") summary.noop += 1;
      return summary;
    },
    {
      create: 0,
      update: 0,
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
}) => ({
  blocks: [
    ...(input.listingFilters
      ? [
          {
            id: "catalog-listing-filters",
            type: "listing-filters",
            variant: "default",
            data: {
              listingQueryId: input.listingQueryId,
              title: input.listingFilters.title,
              description: input.listingFilters.description,
              autoApply: input.listingFilters.autoApply,
              showSearch: input.listingFilters.showSearch,
              searchPlaceholder: input.listingFilters.searchPlaceholder,
              searchLabel: input.listingFilters.searchLabel,
              applyLabel: input.listingFilters.applyLabel,
              facets: input.listingFilters.facets,
              resolved: {
                listingQueryId: input.listingQueryId,
                metrics: [],
                searchQuery: "",
                rejectedTokens: [],
              },
            },
          },
        ]
      : []),
    {
      id: "catalog-content-list",
      type: "content-list",
      variant: "cards",
      data: {
        source: {
          mode: "listing",
          listingQueryId: input.listingQueryId,
          listingTemplateId: input.listingTemplateId,
          statusScope: "published",
          limit: 9,
          sort: "title-asc",
        },
        fields: {
          showImage: true,
          showExcerpt: true,
          showMeta: true,
          showCta: true,
        },
        emptyState: {
          title: "No catalog items yet",
          description: "Add your first catalog entry in Coderso to populate this page.",
        },
        style: {
          columns: input.contentListStyle?.columns ?? "3",
          gap: "md",
          cardStyle: input.contentListStyle?.cardStyle ?? "outlined",
          ctaLabel: input.ctaLabel,
          backgroundColor: "var(--color-bg)",
          borderColor: "var(--color-border)",
          textColor: "var(--color-text)",
        },
        resolved: {
          items: [],
          total: 0,
          sourceTypeId: "",
          sourceTypeSlug: "",
          listingQueryId: input.listingQueryId,
          listingTemplateId: input.listingTemplateId,
          resolvedAt: "",
          runtime: {
            rejectedTokens: [],
            searchQuery: "",
            page: 1,
          },
        },
      },
    },
    ...(input.formEmbed
      ? [
          {
            id: "catalog-inquiry-form",
            type: "form-embed",
            variant: "standard",
            data: {
              formId: input.formEmbed.formId,
              title: input.formEmbed.title,
              description: input.formEmbed.description,
              submitLabel: input.formEmbed.submitLabel,
              successMessage: input.formEmbed.successMessage,
              layout: {
                alignment: "start",
                width: "lg",
                spacing: "md",
                buttonAlignment: "start",
              },
              style: {
                background: "transparent",
                surface: "var(--color-bg)",
                borderColor: "var(--color-border)",
                borderWidth: "1",
                radius: "md",
                inputSize: "md",
              },
              fields: {
                showLabels: true,
                showRequiredIndicator: true,
              },
            },
          },
        ]
      : []),
  ],
  settings: {
    showInNav: true,
    seo: {
      title: input.introTitle,
      description: input.introBody,
    },
  },
});

type ActionExecutorDeps = {
  getSetting: typeof getSetting;
  setSetting: typeof setSetting;
  getContentTypeBySlug: typeof getContentTypeBySlug;
  createContentType: typeof createContentType;
  updateContentType: typeof updateContentType;
  listCustomScreens: typeof listCustomScreens;
  createCustomScreen: typeof createCustomScreen;
  updateCustomScreen: typeof updateCustomScreen;
  listListingQueries: typeof listListingQueries;
  createListingQuery: typeof createListingQuery;
  updateListingQuery: typeof updateListingQuery;
  listListingTemplates: typeof listListingTemplates;
  createListingTemplate: typeof createListingTemplate;
  updateListingTemplate: typeof updateListingTemplate;
  getPageBySlug: typeof getPageBySlug;
  createPage: typeof createPage;
  updatePage: typeof updatePage;
  publishPage: typeof publishPage;
  listForms: typeof listForms;
  createForm: typeof createForm;
  updateForm: typeof updateForm;
  setFormFields: typeof setFormFields;
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
  updateContentType,
  listCustomScreens,
  createCustomScreen,
  updateCustomScreen,
  listListingQueries,
  createListingQuery,
  updateListingQuery,
  listListingTemplates,
  createListingTemplate,
  updateListingTemplate,
  getPageBySlug,
  createPage,
  updatePage,
  publishPage,
  listForms,
  createForm,
  updateForm,
  setFormFields,
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
  const current =
    ((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
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

const buildCustomScreenPreview = async (
  action: AssistantCustomScreenUpsertAction,
  deps: ActionExecutorDeps
) => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  const existing = contentType
    ? (await deps.listCustomScreens()).find(
        (entry) =>
          entry.contentTypeId === contentType.id && entry.name === action.input.name
      ) ?? null
    : null;

  return createPreviewChange({
    action,
    targetType: "custom-screen",
    targetKey: action.input.name,
    summary: `${existing ? "Update" : "Create"} custom screen "${action.input.name}"`,
    warnings: contentType
      ? []
      : ["The content type does not exist yet and will be created earlier in the plan."],
    beforeValue: existing,
    nextValue: action.input,
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

const buildFormPreview = async (
  action: AssistantFormUpsertAction,
  deps: ActionExecutorDeps
) => {
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

const buildPagePreview = async (
  action: AssistantPageUpsertAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getPageBySlug(action.input.slug);
  return createPreviewChange({
    action,
    targetType: "page",
    targetKey: action.input.slug,
    summary: `${existing ? "Update" : "Create"} catalog page ${action.input.slug}`,
    beforeValue: existing
      ? {
          id: existing.id,
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
        }
      : null,
    nextValue: {
      title: action.input.title,
      slug: action.input.slug,
      status: action.input.status,
    },
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

const buildSiteKitValidatePreview = async (
  action: AssistantSiteKitValidateAction
) =>
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

const mergeContentRoute = (
  current: ContentRouteSetting[],
  nextRoute: ContentRouteSetting
) => {
  const filtered = current.filter((entry) => entry.type !== nextRoute.type);
  return [...filtered, nextRoute].sort((left, right) => left.type.localeCompare(right.type));
};

const executeContentRouteAction = async (
  action: AssistantContentRouteUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const current =
    ((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
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
    adminHref: "/admin/coderso/engine",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Content type already matched the planned schema."
        : "Content type is ready for house project entries.",
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
      ? `/admin/coderso/custom-screens/${encodeURIComponent(record.id)}/entries`
      : "/admin/coderso/custom-screens",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Dedicated admin screen already matched the plan."
        : "Dedicated House Projects screen is ready in Coderso.",
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
    adminHref: "/admin/coderso/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing query already matched the plan."
        : "Catalog listing query is ready for the public page.",
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
    adminHref: "/admin/coderso/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing template already matched the plan."
        : "Grid template is ready for house project cards.",
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
    adminHref: `/admin/coderso/forms/${encodeURIComponent(form.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Inquiry form already matched the plan."
        : "Inquiry form is ready for catalog pages.",
  };
};

const executePageAction = async (
  action: AssistantPageUpsertAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getPageBySlug(action.input.slug);
  const currentCatalogSource = readCatalogBlockSource(existing);
  const currentFormSource = readFormEmbedSource(existing);
  const listingQueries = await deps.listListingQueries();
  const listingTemplates = await deps.listListingTemplates();
  const forms = action.input.formEmbed ? await deps.listForms() : [];

  const listingQuery =
    listingQueries.find((entry) => entry.name === action.input.listingQueryName) ??
    (currentCatalogSource?.listingQueryId
      ? listingQueries.find((entry) => entry.id === currentCatalogSource.listingQueryId)
      : null) ??
    null;
  const listingTemplate =
    listingTemplates.find((entry) => entry.slug === action.input.listingTemplateSlug) ??
    (currentCatalogSource?.listingTemplateId
      ? listingTemplates.find((entry) => entry.id === currentCatalogSource.listingTemplateId)
      : null) ??
    null;
  const form = action.input.formEmbed
    ? forms.find((entry) => entry.name === action.input.formEmbed?.formName) ??
      (currentFormSource?.formId ? forms.find((entry) => entry.id === currentFormSource.formId) : null) ??
      null
    : null;

  if (!listingQuery || !listingTemplate || (action.input.formEmbed && !form)) {
    throw new Error("assistant_action_dependency_missing");
  }

  const data = buildCatalogPageData({
    introTitle: action.input.introTitle,
    introBody: action.input.introBody,
    listingQueryId: listingQuery.id,
    listingTemplateId: listingTemplate.id,
    ctaLabel: action.input.ctaLabel,
    contentListStyle: action.input.contentListStyle,
    listingFilters: action.input.listingFilters,
    formEmbed: form && action.input.formEmbed
      ? {
          formId: form.id,
          title: action.input.formEmbed.title,
          description: action.input.formEmbed.description,
          submitLabel: action.input.formEmbed.submitLabel,
          successMessage: action.input.formEmbed.successMessage,
        }
      : null,
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
    adminHref: "/admin/coderso/solution-kits",
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
    adminHref: "/admin/coderso/solution-kits",
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
    adminHref: "/admin/coderso/solution-kits",
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
  "form.upsert": {
    preview: (action, ctx) =>
      action.type === "form.upsert"
        ? buildFormPreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "form.upsert"
        ? executeFormAction(action, preview, ctx.deps)
        : unexpectedAction(),
  },
  "page.upsert": {
    preview: (action, ctx) =>
      action.type === "page.upsert"
        ? buildPagePreview(action, ctx.deps)
        : unexpectedAction(),
    execute: (action, preview, ctx) =>
      action.type === "page.upsert"
        ? executePageAction(action, preview, ctx.actorId, ctx.deps)
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
    readyToExecute: plan.status === "ready" && plan.questions.length === 0,
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
    : executionCache.get(input.idempotencyKey)?.result ?? null;
  if (cached) {
    return cached;
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

  await deps.logAudit({
    actorId: input.actorId,
    action: "assistant.actions.execute",
    targetType: "assistant-action-plan",
    targetId: plan.id,
    metadata: {
      actionIds: plan.actions.map((action) => action.id),
      summary,
    },
  });

  const result: AssistantActionExecuteResult = {
    plan,
    preview,
    results,
    summary,
  };

  if (deps.saveExecutionResult) {
    await deps.saveExecutionResult({
      idempotencyKey: input.idempotencyKey,
      actorId: input.actorId,
      planId: plan.id,
      planHash,
      result,
    });
  } else {
    executionCache.set(input.idempotencyKey, {
      result,
      savedAt: Date.now(),
    });
  }

  return result;
};
