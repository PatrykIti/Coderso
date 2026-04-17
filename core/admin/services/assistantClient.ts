import { createReadThroughCache } from "@/utils/readThroughCache";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { apiRequest } from "./apiClient";
import { cacheKeys } from "./cachePolicy";
import { clearCustomScreensCache } from "./customScreensClient";
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
  AssistantActionPlan,
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
  for (const item of result.results) {
    if (item.status !== "success") continue;
    if (
      item.type === "custom-screen.delete" ||
      item.type === "custom-screen.update" ||
      item.type === "custom-screen.upsert" ||
      item.type === "custom-screen.widget.patch"
    ) {
      clearCustomScreensCache();
      broadcastCacheEvent({
        key: cacheKeys.customScreensList,
        action: item.type === "custom-screen.delete" ? "invalidate" : "update",
      });
      if (item.resourceId) {
        broadcastCacheEvent({
          key: cacheKeys.customScreenDetail(item.resourceId),
          action: item.type === "custom-screen.delete" ? "invalidate" : "update",
        });
      }
    }
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
  const execution = result.results.find((item) => item.type === "site-kit.install")
    ?.details?.siteKit?.execution;
  if (!execution) {
    throw new Error("assistant_site_kit_execution_missing");
  }
  return execution as unknown as GuidedSiteBuilderExecuteResponse;
}
