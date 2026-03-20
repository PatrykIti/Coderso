import { createReadThroughCache } from "@/utils/readThroughCache";
import { apiRequest } from "./apiClient";
import type {
  SiteBuilderPlanInput,
  SiteBuilderPlanOutput,
  SiteBuilderPlanStepId,
  SolutionKitId,
  SolutionKitInstallItemRecord,
  SolutionKitInstallRunRecord,
  SolutionKitInstallSummary,
} from "./solutionKitsClient";

export type AssistantMode = "docs-only" | "llm-rag";

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
  provider: "none" | "openrouter";
  model: string;
  providerRequestId: string | null;
  usage?: AssistantChatLlmUsage;
};

export type AssistantChatRequest = {
  message: string;
  mode?: AssistantMode;
  context?: AssistantChatContext;
};

export type AssistantChatResponse = {
  mode: AssistantMode;
  template: string;
  answer: string;
  confidence: number;
  sources: AssistantChatSource[];
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
};

export type GuidedSiteBuilderExecuteResponse = GuidedSiteBuilderPlanResponse & {
  execution: {
    run: SolutionKitInstallRunRecord;
    items: SolutionKitInstallItemRecord[];
    summary: SolutionKitInstallSummary;
  };
  validation: GuidedSiteBuilderValidationResult;
};

export type GuidedSiteBuilderValidateRequest = {
  runId: string;
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

export async function previewAssistantSiteBuilderPlan(payload: GuidedSiteBuilderPlanRequest) {
  return apiRequest<GuidedSiteBuilderPlanResponse>(
    "/assistant/site-builder/plan",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function executeAssistantSiteBuilder(payload: GuidedSiteBuilderExecuteRequest) {
  return apiRequest<GuidedSiteBuilderExecuteResponse>(
    "/assistant/site-builder/execute",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function validateAssistantSiteBuilderRun(payload: GuidedSiteBuilderValidateRequest) {
  return apiRequest<GuidedSiteBuilderValidationResult>(
    "/assistant/site-builder/validate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}
