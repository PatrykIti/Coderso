import { broadcastCacheEvent } from "@/utils/cacheBus";
import { clearLocalCache } from "@/utils/storageCache";
import { apiRequest } from "./apiClient";
import { cacheKeys } from "./cachePolicy";
import {
  getAssistantStatus as getAssistantStatusInternal,
  invalidateAssistantStatusCache as invalidateAssistantStatusCacheInternal,
} from "./assistantStatusClient";
import {
  clearContentTypeCollectionWorkspaceCache,
  clearContentTypesCache,
} from "./contentTypesClient";
import { clearCustomScreensCache } from "./customScreensClient";
import { clearDetailPageListCache } from "./detailPagesClient";
import { clearAllEntriesCache, clearEntriesCache } from "./entriesClient";
import { clearFormsCache } from "./formsClient";
import { clearListingQueriesCache, clearListingTemplatesCache } from "./listingsClient";
import { clearMenusCache } from "./menusClient";
import { clearPagesCache } from "./pagesClient";
import { clearSeoCache } from "./seoClient";
import { clearWidgetTemplatesCache } from "./widgetTemplatesClient";
import { clearWidgetCatalogCache } from "./widgetsClient";
import type {
  AssistantActionContext,
  AssistantActionDryRunResult,
  AssistantActionExecuteResult,
  AssistantActionExecutionItem,
  AssistantActionPlan,
  AssistantPlannedAction,
} from "../../services/assistant/actionPlanTypes";

export type AssistantMode = "docs-only" | "llm-guide";
export type AssistantDetailLevel = "basic" | "medium" | "instruction" | "advanced";
export type AssistantGuideMode =
  | "default"
  | "troubleshooting"
  | "decision_guide"
  | "checklist"
  | "security";

export type AssistantRetrievalBackend = "db";
export type { AssistantStatusResponse } from "./assistantStatusClient";

export type AssistantChatContext = {
  page?: string;
  locale?: string;
};

export type AssistantChatSource = {
  path: string;
  heading: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  score: number;
};

export type AssistantChatLlmUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AssistantChatLlm = {
  provider: "none" | "openai" | "openrouter";
  model: string;
  providerRequestId: string | null;
  usage?: AssistantChatLlmUsage;
};

export type AssistantChatRequest = {
  message: string;
  mode?: AssistantMode;
  detailLevel?: AssistantDetailLevel;
  guideMode?: AssistantGuideMode;
  context?: AssistantChatContext;
};

export type AssistantFollowUpOption = {
  id: string;
  label: string;
  detailLevel: AssistantDetailLevel;
  guideMode: AssistantGuideMode;
  promptHint: string;
};

export type AssistantChatResponse = {
  mode: AssistantMode;
  template: string;
  detailLevel: AssistantDetailLevel;
  guideMode: AssistantGuideMode;
  answer: string;
  confidence: number;
  sources: AssistantChatSource[];
  followUpOptions: AssistantFollowUpOption[];
  fallbackUsed: boolean;
  requestedMode: AssistantMode;
  effectiveMode: AssistantMode;
  retrievalBackend: AssistantRetrievalBackend;
  llm: AssistantChatLlm | null;
};

export type AssistantReindexResponse = {
  retrievalBackend: AssistantRetrievalBackend;
  builtAt: string;
  buildDurationMs: number;
  docCount: number;
  chunkCount: number;
  totalTokens: number;
  actorId: string | null;
};

export type AssistantModelMetadataRequest = {
  provider: "none" | "openai" | "openrouter";
  model: string;
};

export type AssistantModelMetadataResponse = {
  model: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  supportedParameters: string[];
  source: "provider" | "default";
};

export type AssistantActionPlanRequest = {
  prompt: string;
  context?: AssistantActionContext;
};

export type AssistantActionPlanResponse = AssistantActionPlan;
export type AssistantActionDryRunRequest = {
  plan: AssistantActionPlan;
};
export type AssistantActionDryRunResponse = AssistantActionDryRunResult;
export type AssistantActionExecuteRequest = {
  plan: AssistantActionPlan;
  idempotencyKey: string;
};
export type AssistantActionExecuteResponse = AssistantActionExecuteResult;

export async function getAssistantStatus(options?: { force?: boolean }) {
  return getAssistantStatusInternal(options);
}

export const invalidateAssistantStatusCache = () => {
  invalidateAssistantStatusCacheInternal();
};

export async function sendAssistantMessage(payload: AssistantChatRequest) {
  return apiRequest<AssistantChatResponse>(
    "/assistant/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function reindexAssistantDocs() {
  const result = await apiRequest<AssistantReindexResponse>(
    "/assistant/reindex",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    { withCsrf: true }
  );
  invalidateAssistantStatusCacheInternal();
  return result;
}

export async function getAssistantModelMetadata(payload: AssistantModelMetadataRequest) {
  return apiRequest<AssistantModelMetadataResponse>(
    "/assistant/model-metadata",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function planAssistantActions(payload: AssistantActionPlanRequest) {
  return apiRequest<AssistantActionPlanResponse>(
    "/assistant/actions/plan",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function dryRunAssistantActions(payload: AssistantActionDryRunRequest) {
  return apiRequest<AssistantActionDryRunResponse>(
    "/assistant/actions/dry-run",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function executeAssistantActions(payload: AssistantActionExecuteRequest) {
  const result = await apiRequest<AssistantActionExecuteResponse>(
    "/assistant/actions/execute",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  notifyAssistantExecutionCacheEvents(result);
  return result;
}

const notifyAssistantExecutionCacheEvents = (result: AssistantActionExecuteResponse) => {
  const actionsById = new Map(result.plan.actions.map((action) => [action.id, action]));
  const emitted = new Set<string>();

  const emit = (key: string, action: "invalidate" | "update") => {
    const fingerprint = `${action}:${key}`;
    if (emitted.has(fingerprint)) return;
    emitted.add(fingerprint);
    broadcastCacheEvent({ key, action });
  };

  for (const item of result.results) {
    if (item.status !== "success") continue;
    if (item.operation === "noop") continue;
    notifyAssistantExecutionCacheEvent({
      item,
      action: actionsById.get(item.actionId) ?? null,
      emit,
    });
  }
};

const readText = (value: string | null | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const cacheActionFor = (item: AssistantActionExecutionItem) =>
  item.operation === "delete" ? "invalidate" : "update";

const readActionId = <TType extends AssistantPlannedAction["type"]>(
  action: AssistantPlannedAction | null,
  type: TType
): Extract<AssistantPlannedAction, { type: TType }> | null =>
  action?.type === type ? (action as Extract<AssistantPlannedAction, { type: TType }>) : null;

const resourceId = (item: AssistantActionExecutionItem, fallback?: string | null) =>
  readText(item.resourceId) ?? readText(fallback);

const resourceIdInputText = (value: unknown) =>
  typeof value === "string" ? readText(value) : null;

const firstTargetKeySegment = (item: AssistantActionExecutionItem) => {
  const targetKey = readText(item.targetKey);
  if (!targetKey) return null;
  return readText(targetKey.split("/")[0]);
};

const clearAndEmitDetail = (
  key: string,
  cacheAction: "invalidate" | "update",
  emit: (key: string, action: "invalidate" | "update") => void
) => {
  clearLocalCache(key);
  emit(key, cacheAction);
};

const notifyAssistantExecutionCacheEvent = (input: {
  item: AssistantActionExecutionItem;
  action: AssistantPlannedAction | null;
  emit: (key: string, action: "invalidate" | "update") => void;
}) => {
  const { item, action, emit } = input;
  const cacheAction = cacheActionFor(item);

  switch (item.type) {
    case "content-type.upsert":
    case "content-type.field.add":
    case "content-type.delete": {
      const plannedDelete = readActionId(action, "content-type.delete");
      const plannedFieldAdd = readActionId(action, "content-type.field.add");
      const id = resourceId(item, plannedDelete?.input.id ?? plannedFieldAdd?.input.id);
      clearContentTypesCache();
      emit(cacheKeys.contentTypesList, cacheAction);
      if (id) clearAndEmitDetail(cacheKeys.contentTypeDetail(id), cacheAction, emit);
      return;
    }

    case "entry.upsert-draft":
    case "entry.sample.create":
    case "entry.delete":
    case "entry.update": {
      const plannedUpsert = readActionId(action, "entry.upsert-draft");
      const plannedSample = readActionId(action, "entry.sample.create");
      const plannedDelete = readActionId(action, "entry.delete");
      const plannedUpdate = readActionId(action, "entry.update");
      const typeSlug =
        plannedUpsert?.input.contentTypeSlug ??
        plannedSample?.input.contentTypeSlug ??
        plannedDelete?.input.contentTypeSlug ??
        plannedUpdate?.input.contentTypeSlug ??
        null;
      if (!typeSlug) return;
      const id = resourceId(item, plannedDelete?.input.id ?? plannedUpdate?.input.id);
      clearEntriesCache(typeSlug);
      emit(cacheKeys.entriesList(typeSlug), cacheAction);
      clearAllEntriesCache();
      emit(cacheKeys.entriesAllList, cacheAction);
      if (id) clearAndEmitDetail(cacheKeys.entryDetail(typeSlug, id), cacheAction, emit);
      return;
    }

    case "custom-screen.upsert":
    case "custom-screen.delete":
    case "custom-screen.update":
    case "custom-screen.widget.patch": {
      const plannedDelete = readActionId(action, "custom-screen.delete");
      const plannedUpdate = readActionId(action, "custom-screen.update");
      const plannedPatch = readActionId(action, "custom-screen.widget.patch");
      const id = resourceId(
        item,
        plannedDelete?.input.id ?? plannedUpdate?.input.id ?? plannedPatch?.input.id
      );
      clearCustomScreensCache();
      emit(cacheKeys.customScreensList, cacheAction);
      if (id) clearAndEmitDetail(cacheKeys.customScreenDetail(id), cacheAction, emit);
      return;
    }

    case "page.upsert":
    case "page.delete":
    case "page.update":
    case "page.widget.patch": {
      const plannedDelete = readActionId(action, "page.delete");
      const plannedUpdate = readActionId(action, "page.update");
      const id = resourceId(item, plannedDelete?.input.id ?? plannedUpdate?.input.id);
      clearPagesCache();
      emit(cacheKeys.pagesList, cacheAction);
      if (id) clearAndEmitDetail(cacheKeys.pageDetail(id), cacheAction, emit);
      return;
    }

    case "detail-page.upsert": {
      const planned = readActionId(action, "detail-page.upsert");
      const document = planned?.input.document;
      const contentTypeId = document?.contentTypeId ?? null;
      const id = resourceId(item, document?.id);
      clearDetailPageListCache(contentTypeId);
      emit(cacheKeys.detailPagesList, cacheAction);
      if (contentTypeId) {
        clearContentTypeCollectionWorkspaceCache(contentTypeId);
        emit(cacheKeys.detailPagesListByContentType(contentTypeId), cacheAction);
        emit(cacheKeys.contentTypeCollectionWorkspace(contentTypeId), cacheAction);
      }
      if (id) clearAndEmitDetail(cacheKeys.detailPageDetail(id), cacheAction, emit);
      return;
    }

    case "form.upsert":
    case "form.delete":
    case "form.archive":
    case "form.update": {
      const plannedDelete = readActionId(action, "form.delete");
      const plannedArchive = readActionId(action, "form.archive");
      const plannedUpdate = readActionId(action, "form.update");
      const id = resourceId(
        item,
        plannedDelete?.input.id ?? plannedArchive?.input.id ?? plannedUpdate?.input.id
      );
      clearFormsCache();
      emit(cacheKeys.formsList, cacheAction);
      if (id) {
        clearAndEmitDetail(cacheKeys.formDetail(id), cacheAction, emit);
        clearLocalCache(cacheKeys.formActions(id));
        clearLocalCache(cacheKeys.formActionRuns(id));
      }
      return;
    }

    case "form.automation.upsert": {
      const planned = readActionId(action, "form.automation.upsert");
      const formId = planned?.input.formId;
      if (!formId) return;
      clearLocalCache(cacheKeys.formActions(formId));
      clearLocalCache(cacheKeys.formActionRuns(formId));
      emit(cacheKeys.formActions(formId), "update");
      emit(cacheKeys.formActionRuns(formId), "invalidate");
      return;
    }

    case "listing-query.upsert":
    case "listing-query.delete":
    case "listing-query.update":
    case "listing-query.filters.patch": {
      const plannedDelete = readActionId(action, "listing-query.delete");
      const plannedUpdate = readActionId(action, "listing-query.update");
      const id = resourceId(item, plannedDelete?.input.id ?? plannedUpdate?.input.id);
      clearListingQueriesCache();
      emit(cacheKeys.listingQueriesList, cacheAction);
      if (id) clearAndEmitDetail(cacheKeys.listingQueryDetail(id), cacheAction, emit);
      return;
    }

    case "listing-template.upsert":
    case "listing-template.delete":
    case "listing-template.update":
    case "listing-template.card.patch": {
      const plannedDelete = readActionId(action, "listing-template.delete");
      const plannedUpdate = readActionId(action, "listing-template.update");
      const id = resourceId(item, plannedDelete?.input.id ?? plannedUpdate?.input.id);
      clearListingTemplatesCache();
      emit(cacheKeys.listingTemplatesList, cacheAction);
      if (id) clearAndEmitDetail(cacheKeys.listingTemplateDetail(id), cacheAction, emit);
      return;
    }

    case "widget-template.delete":
    case "widget-template.update":
    case "widget-template.block.patch": {
      const plannedDelete = readActionId(action, "widget-template.delete");
      const plannedUpdate = readActionId(action, "widget-template.update");
      const plannedPatch = readActionId(action, "widget-template.block.patch");
      const id = resourceId(
        item,
        plannedDelete?.input.id ?? plannedUpdate?.input.id ?? plannedPatch?.input.id
      );
      clearWidgetTemplatesCache();
      clearWidgetCatalogCache();
      emit(cacheKeys.widgetTemplatesList, cacheAction);
      emit(cacheKeys.widgetCatalogList, "invalidate");
      if (id) clearAndEmitDetail(cacheKeys.widgetTemplateDetail(id), cacheAction, emit);
      return;
    }

    case "menu.upsert":
    case "menu.item.upsert":
    case "menu.item.delete":
    case "menu.item.update": {
      const plannedMenu = readActionId(action, "menu.upsert");
      const plannedUpsert = readActionId(action, "menu.item.upsert");
      const plannedDelete = readActionId(action, "menu.item.delete");
      const plannedUpdate = readActionId(action, "menu.item.update");
      const itemMenuId =
        resourceIdInputText(plannedUpsert?.input.menuId) ??
        readText(plannedDelete?.input.menuId) ??
        readText(plannedUpdate?.input.menuId) ??
        firstTargetKeySegment(item);
      const menuId = plannedMenu ? resourceId(item, plannedMenu.input.location) : itemMenuId;
      clearMenusCache();
      emit(cacheKeys.menusList, cacheAction);
      if (typeof menuId === "string") {
        clearLocalCache(cacheKeys.menuDetail(menuId));
        emit(cacheKeys.menuDetail(menuId), cacheAction);
      }
      return;
    }

    case "seo.document.upsert":
    case "seo.document.delete":
    case "seo.document.update": {
      const plannedDelete = readActionId(action, "seo.document.delete");
      const plannedUpdate = readActionId(action, "seo.document.update");
      const id = resourceId(item, plannedDelete?.input.id ?? plannedUpdate?.input.id);
      clearSeoCache();
      emit(cacheKeys.seoList, cacheAction);
      if (id) emit(cacheKeys.seoDetail(id), cacheAction);
      return;
    }

    case "media.reference.attach":
    case "setting.content-route.upsert":
    case "site-kit.recommend":
    case "site-kit.install":
    case "site-kit.validate":
      return;
  }
};
