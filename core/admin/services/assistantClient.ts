import { createReadThroughCache } from "@/utils/readThroughCache";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { clearLocalCache } from "@/utils/storageCache";
import { apiRequest } from "./apiClient";
import { cacheKeys } from "./cachePolicy";
import { clearContentTypesCache } from "./contentTypesClient";
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
  SiteBuilderPlanInput,
  SiteBuilderPlanOutput,
  SiteBuilderPlanStepId,
  SolutionKitId,
  SolutionKitInstallItemRecord,
  SolutionKitInstallRunRecord,
  SolutionKitInstallSummary,
} from "./solutionKitsClient";
import type {
  AssistantActionContext,
  AssistantActionDryRunResult,
  AssistantActionExecuteResult,
  AssistantActionExecutionItem,
  AssistantActionPlan,
  AssistantPlannedAction,
  AssistantSiteKitInstallAction,
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

export type AssistantStatusResponse = {
  enabled: boolean;
  defaultMode: AssistantMode;
  retrievalBackend: AssistantRetrievalBackend;
  llmAvailable: boolean;
  indexReady: boolean;
  indexBuilding: boolean;
  indexError: string | null;
  lastReindexAt: string | null;
  docCount: number;
  chunkCount: number;
};

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

export type GuidedSiteBuilderActionTarget =
  | "settings"
  | "content_type"
  | "form"
  | "page"
  | "menu"
  | "template"
  | "qa";

export type GuidedSiteBuilderAction = {
  id: string;
  stepId: SiteBuilderPlanStepId;
  title: string;
  description: string;
  target: GuidedSiteBuilderActionTarget;
  resourceKey: string;
  required: boolean;
};

export type GuidedSiteBuilderPlanRequest = SiteBuilderPlanInput & {
  selectedKitId?: SolutionKitId | null;
  enabledStepIds?: SiteBuilderPlanStepId[];
};

export type GuidedSiteBuilderPlanResponse = {
  plan: SiteBuilderPlanOutput;
  selectedKitId: SolutionKitId;
  selectedKitTitle: string;
  enabledStepIds: SiteBuilderPlanStepId[];
  actions: GuidedSiteBuilderAction[];
  modules: {
    required: string[];
    optional: string[];
    recommended: string[];
  };
};

export type GuidedSiteBuilderValidationStatus = "ok" | "warning" | "failed";

export type GuidedSiteBuilderValidationCheck = {
  id: string;
  label: string;
  status: GuidedSiteBuilderValidationStatus;
  details: string;
};

export type GuidedSiteBuilderValidationResult = {
  runId: string;
  status: GuidedSiteBuilderValidationStatus;
  unresolvedItems: string[];
  checks: GuidedSiteBuilderValidationCheck[];
};

export type GuidedSiteBuilderExecuteRequest = GuidedSiteBuilderPlanRequest & {
  dryRun?: boolean;
  continueOnError?: boolean;
  notes?: string[];
  settingsPatch?: Record<string, unknown>;
  idempotencyKey?: string;
};

export type GuidedSiteBuilderExecuteResponse = GuidedSiteBuilderPlanResponse & {
  execution: {
    run: SolutionKitInstallRunRecord;
    items: SolutionKitInstallItemRecord[];
    summary: SolutionKitInstallSummary;
  };
  validation: GuidedSiteBuilderValidationResult;
};

const ASSISTANT_STATUS_TTL_MS = 10_000;

const assistantStatusReadCache = createReadThroughCache<AssistantStatusResponse>({
  ttlMs: ASSISTANT_STATUS_TTL_MS,
  load: () =>
    apiRequest<AssistantStatusResponse>("/assistant/status", {
      method: "GET",
    }),
});

export async function getAssistantStatus(options?: { force?: boolean }) {
  return assistantStatusReadCache.get({ force: options?.force });
}

export const invalidateAssistantStatusCache = () => {
  assistantStatusReadCache.invalidate();
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
  assistantStatusReadCache.invalidate();
  return result;
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
    case "content-type.delete": {
      const plannedDelete = readActionId(action, "content-type.delete");
      const id = resourceId(item, plannedDelete?.input.id);
      clearContentTypesCache();
      emit(cacheKeys.contentTypesList, cacheAction);
      if (id) clearAndEmitDetail(cacheKeys.contentTypeDetail(id), cacheAction, emit);
      return;
    }

    case "entry.upsert-draft":
    case "entry.delete":
    case "entry.update": {
      const plannedUpsert = readActionId(action, "entry.upsert-draft");
      const plannedDelete = readActionId(action, "entry.delete");
      const plannedUpdate = readActionId(action, "entry.update");
      const typeSlug =
        plannedUpsert?.input.contentTypeSlug ??
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
        emit(cacheKeys.detailPagesListByContentType(contentTypeId), cacheAction);
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

    case "menu.item.upsert":
    case "menu.item.delete":
    case "menu.item.update": {
      const plannedUpsert = readActionId(action, "menu.item.upsert");
      const plannedDelete = readActionId(action, "menu.item.delete");
      const plannedUpdate = readActionId(action, "menu.item.update");
      const menuId =
        plannedUpsert?.input.menuId ?? plannedDelete?.input.menuId ?? plannedUpdate?.input.menuId;
      if (!menuId) return;
      clearMenusCache();
      clearLocalCache(cacheKeys.menuDetail(menuId));
      emit(cacheKeys.menusList, cacheAction);
      emit(cacheKeys.menuDetail(menuId), cacheAction);
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

const buildSiteKitPrompt = (payload: GuidedSiteBuilderPlanRequest) => {
  const goals = payload.goals.join(", ");
  return [
    "Prepare a site kit plan through LLM Guide.",
    `Business type: ${payload.businessType}.`,
    `Goals: ${goals}.`,
    `Locale: ${payload.locale}.`,
    payload.siteName ? `Site name: ${payload.siteName}.` : null,
    payload.selectedKitId ? `Selected kit: ${payload.selectedKitId}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
};

const createSiteKitPlanPayload = (payload: GuidedSiteBuilderPlanRequest) => ({
  prompt: buildSiteKitPrompt(payload),
  context: {
    locale: payload.locale,
    siteKit: payload,
  },
});

const findSiteKitInstallAction = (
  plan: AssistantActionPlan
): AssistantSiteKitInstallAction | null =>
  plan.actions.find(
    (action): action is AssistantSiteKitInstallAction => action.type === "site-kit.install"
  ) ?? null;

const readSiteKitPlan = (plan: AssistantActionPlan): GuidedSiteBuilderPlanResponse => {
  const action = findSiteKitInstallAction(plan);
  if (!action) {
    throw new Error("assistant_site_kit_plan_missing");
  }
  return action.input.preview;
};

const createSiteKitExecutionPlan = (
  plan: AssistantActionPlan,
  payload: GuidedSiteBuilderExecuteRequest
): AssistantActionPlan => ({
  ...plan,
  actions: plan.actions.map((action) => {
    if (action.type !== "site-kit.install") return action;
    return {
      ...action,
      input: {
        ...action.input,
        dryRun: payload.dryRun,
        continueOnError: payload.continueOnError,
        settingsPatch: payload.settingsPatch,
        notes: payload.notes,
      },
    };
  }),
});

const createSiteKitIdempotencyKey = () => {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `site-kit-${random}`;
};

export async function planAssistantSiteKitActions(payload: GuidedSiteBuilderPlanRequest) {
  const plan = await planAssistantActions(createSiteKitPlanPayload(payload));
  return readSiteKitPlan(plan);
}

export async function executeAssistantSiteKitActions(
  payload: GuidedSiteBuilderExecuteRequest
): Promise<GuidedSiteBuilderExecuteResponse> {
  const plan = await planAssistantActions(createSiteKitPlanPayload(payload));
  const executionPlan = createSiteKitExecutionPlan(plan, payload);
  const result = await executeAssistantActions({
    plan: executionPlan,
    idempotencyKey: payload.idempotencyKey ?? createSiteKitIdempotencyKey(),
  });
  const execution = result.results.find((item) => item.type === "site-kit.install")?.details
    ?.siteKit?.execution;
  if (!execution) {
    throw new Error("assistant_site_kit_execution_missing");
  }
  return execution as unknown as GuidedSiteBuilderExecuteResponse;
}
