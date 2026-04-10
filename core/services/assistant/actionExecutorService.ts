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
  AssistantListingQueryUpsertAction,
  AssistantListingTemplateUpsertAction,
  AssistantPageUpsertAction,
  AssistantPlannedAction,
} from "./actionPlanTypes";
import { createPreviewChange } from "./actionDiffService";
import { isAssistantActionPlan } from "./actionPlanTypes";

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

const buildCatalogPageData = (input: {
  introTitle: string;
  introBody: string;
  listingQueryId: string;
  listingTemplateId: string;
  ctaLabel: string;
}) => ({
  blocks: [
    {
      id: "house-projects-catalog-list",
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
          title: "No house projects yet",
          description:
            "Add your first house project entry in Coderso > House Projects to populate the catalog.",
        },
        style: {
          columns: "3",
          gap: "md",
          cardStyle: "outlined",
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
        },
      },
    },
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
  logAudit: typeof logAudit;
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
  logAudit,
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

const buildPreviewForAction = async (
  action: AssistantPlannedAction,
  deps: ActionExecutorDeps
): Promise<AssistantActionPreviewChange> => {
  switch (action.type) {
    case "setting.content-route.upsert":
      return buildContentRoutePreview(action, deps);
    case "content-type.upsert":
      return buildContentTypePreview(action, deps);
    case "custom-screen.upsert":
      return buildCustomScreenPreview(action, deps);
    case "listing-query.upsert":
      return buildListingQueryPreview(action, deps);
    case "listing-template.upsert":
      return buildListingTemplatePreview(action, deps);
    case "page.upsert":
      return buildPagePreview(action, deps);
  }
};

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

const executePageAction = async (
  action: AssistantPageUpsertAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
) => {
  const listingQuery =
    (await deps.listListingQueries()).find((entry) => entry.name === action.input.listingQueryName) ??
    null;
  const listingTemplate =
    (await deps.listListingTemplates()).find(
      (entry) => entry.slug === action.input.listingTemplateSlug
    ) ?? null;

  if (!listingQuery || !listingTemplate) {
    throw new Error("assistant_action_dependency_missing");
  }

  const data = buildCatalogPageData({
    introTitle: action.input.introTitle,
    introBody: action.input.introBody,
    listingQueryId: listingQuery.id,
    listingTemplateId: listingTemplate.id,
    ctaLabel: action.input.ctaLabel,
  });

  const existing = await deps.getPageBySlug(action.input.slug);
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

const executeAction = async (
  action: AssistantPlannedAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  switch (action.type) {
    case "setting.content-route.upsert":
      return executeContentRouteAction(action, preview, deps);
    case "content-type.upsert":
      return executeContentTypeAction(action, preview, deps);
    case "custom-screen.upsert":
      return executeCustomScreenAction(action, preview, deps);
    case "listing-query.upsert":
      return executeListingQueryAction(action, preview, deps);
    case "listing-template.upsert":
      return executeListingTemplateAction(action, preview, deps);
    case "page.upsert":
      return executePageAction(action, preview, actorId, deps);
  }
};

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

  cleanupExecutionCache();
  const cached = executionCache.get(input.idempotencyKey);
  if (cached) {
    return cached.result;
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

  executionCache.set(input.idempotencyKey, {
    result,
    savedAt: Date.now(),
  });

  return result;
};
