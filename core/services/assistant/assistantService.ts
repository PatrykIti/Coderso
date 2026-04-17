import { logAudit } from "../audit/auditService";
import { getSetting, type AssistantLlmProvider, type AssistantMode } from "../settings/settingsService";
import { composeDocsAnswer } from "./docsAnswerComposer";
import {
  getAssistantDocsDbStatus,
  ingestInternalDocsToDb,
} from "./docsIngestService";
import { searchAssistantDocsDb } from "./docsDbRetriever";
import { recordAssistantMetric } from "./assistantMetrics";
import { enforceAssistantQuota } from "./assistantQuota";
import {
  redactAssistantMetadata,
  redactAssistantText,
} from "./assistantRedaction";
import { resolveAssistantProvider } from "./providers";
import type { AssistantProviderResponse } from "./providers/providerTypes";
import type {
  DocsAnswerSource,
  DocsAnswerTemplate,
  DocsDetailLevel,
  DocsGuideMode,
  DocsFollowUpOption,
  DocsSearchHit,
} from "./docsTypes";

const ASSISTANT_MESSAGE_MAX_LENGTH = 2000;
const BLOCKED_MARKERS = [
  "<system>",
  "</system>",
  "ignore previous instructions",
  "developer message",
  "prompt injection",
] as const;

const DEFAULT_ASSISTANT_SOURCE_ROOT = "docs";
const DEFAULT_ASSISTANT_LLM_MODEL = "google/gemma-3n-e2b-it:free";
const DEFAULT_ASSISTANT_LLM_MAX_INPUT_TOKENS = 8192;
const DEFAULT_ASSISTANT_LLM_MAX_OUTPUT_TOKENS = 2048;
const DEFAULT_ASSISTANT_LLM_TIMEOUT_MS = 20000;
const DEFAULT_ASSISTANT_QUOTA_REQUESTS_PER_MINUTE = 20;
const DEFAULT_ASSISTANT_QUOTA_REQUESTS_PER_DAY = 1000;
const DEFAULT_ASSISTANT_QUOTA_GLOBAL_REQUESTS_PER_MINUTE = 0;
const DEFAULT_ASSISTANT_QUOTA_GLOBAL_REQUESTS_PER_DAY = 0;
const DEFAULT_ASSISTANT_QUOTA_LLM_TOKENS_PER_DAY = 0;
const DEFAULT_ASSISTANT_QUOTA_GLOBAL_LLM_TOKENS_PER_DAY = 0;

const ASSISTANT_LLM_SYSTEM_PROMPT = [
  "You are Nextless Assistant running in strict RAG mode.",
  "Only answer using provided documentation snippets.",
  "Do not invent features, settings, or paths outside snippets.",
  "Always cite source snippet numbers like [1], [2].",
  "If snippets are insufficient, say clearly what is missing.",
].join(" ");

type AssistantRuntimeSettings = {
  enabled: boolean;
  defaultMode: AssistantMode;
  docsSourceRoot: string;
  llmEnabled: boolean;
  llmProvider: AssistantLlmProvider;
  llmModel: string;
  llmMaxInputTokens: number;
  llmMaxOutputTokens: number;
  llmTimeoutMs: number;
  quotaRequestsPerMinute: number;
  quotaRequestsPerDay: number;
  quotaGlobalRequestsPerMinute: number;
  quotaGlobalRequestsPerDay: number;
  quotaLlmTokensPerDay: number;
  quotaGlobalLlmTokensPerDay: number;
};

export type AssistantRetrievalBackend = "db";

export type AssistantChatContext = {
  page?: string;
  locale?: string;
};

export type AssistantChatInput = {
  message: string;
  mode?: AssistantMode;
  detailLevel?: DocsDetailLevel;
  guideMode?: DocsGuideMode;
  context?: AssistantChatContext;
  actorId?: string | null;
};

export type AssistantLlmResult = {
  provider: AssistantLlmProvider;
  model: string;
  providerRequestId: string | null;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export type AssistantChatResult = {
  mode: "docs-only" | "llm-guide";
  template: DocsAnswerTemplate;
  detailLevel: DocsDetailLevel;
  guideMode: DocsGuideMode;
  answer: string;
  confidence: number;
  sources: DocsAnswerSource[];
  followUpOptions: DocsFollowUpOption[];
  fallbackUsed: boolean;
  requestedMode: AssistantMode;
  effectiveMode: "docs-only" | "llm-guide";
  retrievalBackend: AssistantRetrievalBackend;
  llm: AssistantLlmResult | null;
};

export type AssistantStatusResult = {
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

export type AssistantReindexResult = {
  retrievalBackend: AssistantRetrievalBackend;
  builtAt: string;
  buildDurationMs: number;
  docCount: number;
  chunkCount: number;
  totalTokens: number;
  actorId: string | null;
};

export type AssistantServiceDeps = {
  getSetting: (key: string) => Promise<unknown>;
  searchAssistantDocsDb: typeof searchAssistantDocsDb;
  getAssistantDocsDbStatus: typeof getAssistantDocsDbStatus;
  ingestInternalDocsToDb: typeof ingestInternalDocsToDb;
  resolveAssistantProvider: typeof resolveAssistantProvider;
  composeDocsAnswer: typeof composeDocsAnswer;
  logAudit: typeof logAudit;
};

const defaultDeps: AssistantServiceDeps = {
  getSetting,
  searchAssistantDocsDb,
  getAssistantDocsDbStatus,
  ingestInternalDocsToDb,
  resolveAssistantProvider,
  composeDocsAnswer,
  logAudit,
};

const normalizeMode = (value: unknown, fallback: AssistantMode): AssistantMode => {
  if (value === "llm-rag") return "llm-guide";
  if (value === "docs-only" || value === "llm-guide") return value;
  return fallback;
};

const normalizeProvider = (
  value: unknown,
  fallback: AssistantLlmProvider
): AssistantLlmProvider => {
  if (value === "openai" || value === "openrouter" || value === "none") return value;
  return fallback;
};

const normalizeBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const normalizePositiveInteger = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : fallback;
};

const normalizeModel = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

const normalizeDetailLevel = (value: unknown, fallback: DocsDetailLevel): DocsDetailLevel => {
  if (value === "basic" || value === "medium" || value === "instruction" || value === "advanced") {
    return value;
  }
  return fallback;
};

const normalizeGuideMode = (value: unknown, fallback: DocsGuideMode): DocsGuideMode => {
  if (
    value === "default" ||
    value === "troubleshooting" ||
    value === "decision_guide" ||
    value === "checklist" ||
    value === "security"
  ) {
    return value;
  }
  return fallback;
};

const normalizeConfidence = (value: number) =>
  Math.min(0.97, Math.max(0.2, Number(value.toFixed(4))));

const getSettingSafe = async (
  deps: AssistantServiceDeps,
  key: string,
  fallback: unknown
) => {
  try {
    return await deps.getSetting(key);
  } catch {
    return fallback;
  }
};

const readRuntimeSettings = async (
  deps: AssistantServiceDeps
): Promise<AssistantRuntimeSettings> => {
  const [
    enabledRaw,
    defaultModeRaw,
    llmEnabledRaw,
    llmProviderRaw,
    llmModelRaw,
    llmMaxInputTokensRaw,
    llmMaxOutputTokensRaw,
    llmTimeoutMsRaw,
    quotaRequestsPerMinuteRaw,
    quotaRequestsPerDayRaw,
    quotaGlobalRequestsPerMinuteRaw,
    quotaGlobalRequestsPerDayRaw,
    quotaLlmTokensPerDayRaw,
    quotaGlobalLlmTokensPerDayRaw,
  ] = await Promise.all([
    getSettingSafe(deps, "assistant.enabled", false),
    getSettingSafe(deps, "assistant.defaultMode", "docs-only"),
    getSettingSafe(deps, "assistant.llm.enabled", false),
    getSettingSafe(deps, "assistant.llm.provider", "none"),
    getSettingSafe(deps, "assistant.llm.model", DEFAULT_ASSISTANT_LLM_MODEL),
    getSettingSafe(
      deps,
      "assistant.llm.maxInputTokens",
      DEFAULT_ASSISTANT_LLM_MAX_INPUT_TOKENS
    ),
    getSettingSafe(
      deps,
      "assistant.llm.maxOutputTokens",
      DEFAULT_ASSISTANT_LLM_MAX_OUTPUT_TOKENS
    ),
    getSettingSafe(deps, "assistant.llm.timeoutMs", DEFAULT_ASSISTANT_LLM_TIMEOUT_MS),
    getSettingSafe(
      deps,
      "assistant.quotas.requestsPerMinute",
      DEFAULT_ASSISTANT_QUOTA_REQUESTS_PER_MINUTE
    ),
    getSettingSafe(
      deps,
      "assistant.quotas.requestsPerDay",
      DEFAULT_ASSISTANT_QUOTA_REQUESTS_PER_DAY
    ),
    getSettingSafe(
      deps,
      "assistant.quotas.globalRequestsPerMinute",
      DEFAULT_ASSISTANT_QUOTA_GLOBAL_REQUESTS_PER_MINUTE
    ),
    getSettingSafe(
      deps,
      "assistant.quotas.globalRequestsPerDay",
      DEFAULT_ASSISTANT_QUOTA_GLOBAL_REQUESTS_PER_DAY
    ),
    getSettingSafe(
      deps,
      "assistant.quotas.llmTokensPerDay",
      DEFAULT_ASSISTANT_QUOTA_LLM_TOKENS_PER_DAY
    ),
    getSettingSafe(
      deps,
      "assistant.quotas.globalLlmTokensPerDay",
      DEFAULT_ASSISTANT_QUOTA_GLOBAL_LLM_TOKENS_PER_DAY
    ),
  ]);

  return {
    enabled: normalizeBoolean(enabledRaw, false),
    defaultMode: normalizeMode(defaultModeRaw, "docs-only"),
    docsSourceRoot: DEFAULT_ASSISTANT_SOURCE_ROOT,
    llmEnabled: normalizeBoolean(llmEnabledRaw, false),
    llmProvider: normalizeProvider(llmProviderRaw, "none"),
    llmModel: normalizeModel(llmModelRaw, DEFAULT_ASSISTANT_LLM_MODEL),
    llmMaxInputTokens: normalizePositiveInteger(
      llmMaxInputTokensRaw,
      DEFAULT_ASSISTANT_LLM_MAX_INPUT_TOKENS
    ),
    llmMaxOutputTokens: normalizePositiveInteger(
      llmMaxOutputTokensRaw,
      DEFAULT_ASSISTANT_LLM_MAX_OUTPUT_TOKENS
    ),
    llmTimeoutMs: normalizePositiveInteger(
      llmTimeoutMsRaw,
      DEFAULT_ASSISTANT_LLM_TIMEOUT_MS
    ),
    quotaRequestsPerMinute: normalizePositiveInteger(
      quotaRequestsPerMinuteRaw,
      DEFAULT_ASSISTANT_QUOTA_REQUESTS_PER_MINUTE
    ),
    quotaRequestsPerDay: normalizePositiveInteger(
      quotaRequestsPerDayRaw,
      DEFAULT_ASSISTANT_QUOTA_REQUESTS_PER_DAY
    ),
    quotaGlobalRequestsPerMinute: normalizePositiveInteger(
      quotaGlobalRequestsPerMinuteRaw,
      DEFAULT_ASSISTANT_QUOTA_GLOBAL_REQUESTS_PER_MINUTE
    ),
    quotaGlobalRequestsPerDay: normalizePositiveInteger(
      quotaGlobalRequestsPerDayRaw,
      DEFAULT_ASSISTANT_QUOTA_GLOBAL_REQUESTS_PER_DAY
    ),
    quotaLlmTokensPerDay: normalizePositiveInteger(
      quotaLlmTokensPerDayRaw,
      DEFAULT_ASSISTANT_QUOTA_LLM_TOKENS_PER_DAY
    ),
    quotaGlobalLlmTokensPerDay: normalizePositiveInteger(
      quotaGlobalLlmTokensPerDayRaw,
      DEFAULT_ASSISTANT_QUOTA_GLOBAL_LLM_TOKENS_PER_DAY
    ),
  };
};

export const sanitizeAssistantMessage = (message: string) => {
  const normalized = message
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    throw new Error("assistant_message_invalid");
  }
  if (normalized.length > ASSISTANT_MESSAGE_MAX_LENGTH) {
    throw new Error("assistant_message_invalid");
  }

  const lower = normalized.toLowerCase();
  for (const marker of BLOCKED_MARKERS) {
    if (lower.includes(marker)) {
      throw new Error("assistant_message_invalid");
    }
  }
  return normalized;
};

const resolveMode = (
  requestedMode: AssistantMode,
  settings: AssistantRuntimeSettings
) => {
  if (requestedMode === "llm-guide") {
    if (!settings.llmEnabled || settings.llmProvider === "none") {
      return {
        requestedMode,
        effectiveMode: "docs-only" as const,
        fallbackUsed: true,
      };
    }
    return {
      requestedMode,
      effectiveMode: "llm-guide" as const,
      fallbackUsed: false,
    };
  }
  return {
    requestedMode,
    effectiveMode: "docs-only" as const,
    fallbackUsed: false,
  };
};

const resolveDeps = (overrides?: Partial<AssistantServiceDeps>): AssistantServiceDeps => ({
  ...defaultDeps,
  ...(overrides ?? {}),
});

const retrieveDocsHits = async (
  deps: AssistantServiceDeps,
  _settings: AssistantRuntimeSettings,
  message: string
): Promise<{
  hits: DocsSearchHit[];
  retrievalBackend: AssistantRetrievalBackend;
  backendFallbackUsed: boolean;
}> => {
  const dbStatus = await deps.getAssistantDocsDbStatus();
  if (!dbStatus.ready) {
    throw new Error("assistant_index_missing");
  }

  try {
    const hits = await deps.searchAssistantDocsDb(message, {
      topK: 5,
      minScore: 0.01,
    });
    return {
      hits,
      retrievalBackend: "db",
      backendFallbackUsed: false,
    };
  } catch {
    throw new Error("assistant_index_missing");
  }
};

const toLlmSnippets = (sources: DocsAnswerSource[]) =>
  sources.slice(0, 3).map((source) => ({
    path: source.path,
    heading: source.heading,
    content: source.snippet,
  }));

const toLlmResult = (
  response: AssistantProviderResponse,
  settings: AssistantRuntimeSettings
): AssistantLlmResult => ({
  provider: settings.llmProvider,
  model: settings.llmModel,
  providerRequestId: response.providerRequestId ?? null,
  usage: response.usage,
});

const resolveLlmAvailability = async (
  deps: AssistantServiceDeps,
  settings: AssistantRuntimeSettings
) => {
  if (!settings.llmEnabled || settings.llmProvider === "none") {
    return false;
  }
  try {
    const provider = await deps.resolveAssistantProvider({
      provider: settings.llmProvider,
      model: settings.llmModel,
    });
    return Boolean(provider);
  } catch {
    return false;
  }
};

export const getAssistantStatus = async (
  overrides?: Partial<AssistantServiceDeps>
): Promise<AssistantStatusResult> => {
  const deps = resolveDeps(overrides);
  const settings = await readRuntimeSettings(deps);
  const llmAvailable = await resolveLlmAvailability(deps, settings);
  const dbStatus = await deps.getAssistantDocsDbStatus();
  return {
    enabled: settings.enabled,
    defaultMode: settings.defaultMode,
    retrievalBackend: "db",
    llmAvailable,
    indexReady: dbStatus.ready,
    indexBuilding: false,
    indexError: dbStatus.indexError,
    lastReindexAt: dbStatus.lastIngestAt,
    docCount: dbStatus.docCount,
    chunkCount: dbStatus.chunkCount,
  };
};

export const reindexAssistantDocs = async (
  input: { actorId?: string | null },
  overrides?: Partial<AssistantServiceDeps>
): Promise<AssistantReindexResult> => {
  const deps = resolveDeps(overrides);
  const settings = await readRuntimeSettings(deps);
  if (!settings.enabled) {
    throw new Error("assistant_disabled");
  }
  let ingest;
  try {
    ingest = await deps.ingestInternalDocsToDb({
      sourceRoot: settings.docsSourceRoot,
      triggeredByUserId: input.actorId ?? null,
    });
  } catch {
    throw new Error("assistant_reindex_failed");
  }

  const dbStatus = await deps.getAssistantDocsDbStatus();

  try {
    await deps.logAudit({
      actorId: input.actorId ?? null,
      action: "assistant.docs.reindex",
      targetType: "assistant",
      targetId: "docs-db-kb",
      metadata: {
        backend: "db",
        sourceRoot: settings.docsSourceRoot,
        status: ingest.status,
        docCount: dbStatus.docCount,
        chunkCount: dbStatus.chunkCount,
        errorsCount: ingest.errorsCount,
      },
    });
  } catch {
    // Audit is best-effort and must not block reindex success.
  }

  return {
    retrievalBackend: "db",
    builtAt: ingest.finishedAt,
    buildDurationMs: ingest.buildDurationMs,
    docCount: dbStatus.docCount,
    chunkCount: dbStatus.chunkCount,
    totalTokens: ingest.totalTokens,
    actorId: input.actorId ?? null,
  };
};

export const answerAssistantQuestion = async (
  input: AssistantChatInput,
  overrides?: Partial<AssistantServiceDeps>
): Promise<AssistantChatResult> => {
  const deps = resolveDeps(overrides);
  const startedAtMs = Date.now();
  let metricFallbackUsed = false;
  let metricNoHit = false;
  let metricLlmUsed = false;
  let metricLlmFailed = false;
  let metricErrorCode: string | null = null;

  try {
    const settings = await readRuntimeSettings(deps);
    if (!settings.enabled) {
      throw new Error("assistant_disabled");
    }

    const normalizedMessage = sanitizeAssistantMessage(input.message);
    const requestedMode = normalizeMode(input.mode, settings.defaultMode);
    const mode = resolveMode(requestedMode, settings);
    const detailLevel =
      typeof input.detailLevel === "string"
        ? normalizeDetailLevel(input.detailLevel, "medium")
        : undefined;
    const guideMode =
      typeof input.guideMode === "string"
        ? normalizeGuideMode(input.guideMode, "default")
        : undefined;

    enforceAssistantQuota(
      {
        requestsPerMinute: settings.quotaRequestsPerMinute,
        requestsPerDay: settings.quotaRequestsPerDay,
        globalRequestsPerMinute: settings.quotaGlobalRequestsPerMinute,
        globalRequestsPerDay: settings.quotaGlobalRequestsPerDay,
        llmTokensPerDay: settings.quotaLlmTokensPerDay,
        globalLlmTokensPerDay: settings.quotaGlobalLlmTokensPerDay,
      },
      {
        actorId: input.actorId ?? null,
        mode: mode.effectiveMode,
        estimatedLlmTokens:
          mode.effectiveMode === "llm-guide" ? settings.llmMaxOutputTokens : 0,
        nowMs: startedAtMs,
      }
    );

    const retrieval = await retrieveDocsHits(deps, settings, normalizedMessage);
    const composed = deps.composeDocsAnswer({
      question: normalizedMessage,
      hits: retrieval.hits,
      maxSources: 3,
      detailLevel,
      guideMode,
    });

    metricNoHit = composed.sources.length === 0;

    let effectiveMode: "docs-only" | "llm-guide" = mode.effectiveMode;
    let llm: AssistantLlmResult | null = null;
    let llmFallbackUsed = false;

    const canUseLlmForAnswer =
      composed.template !== "clarifying_question" &&
      composed.template !== "missing_answer" &&
      composed.sources.length > 0;

    if (mode.effectiveMode === "llm-guide" && canUseLlmForAnswer) {
      try {
        const provider = await deps.resolveAssistantProvider({
          provider: settings.llmProvider,
          model: settings.llmModel,
        });

        if (provider) {
          const llmResponse = await provider.complete({
            systemPrompt: ASSISTANT_LLM_SYSTEM_PROMPT,
            userMessage: normalizedMessage,
            snippets: toLlmSnippets(composed.sources),
            limits: {
              maxInputTokens: settings.llmMaxInputTokens,
              maxOutputTokens: settings.llmMaxOutputTokens,
              timeoutMs: settings.llmTimeoutMs,
            },
          });

          const answer = llmResponse.text.trim();
          if (answer) {
            metricLlmUsed = true;
            llm = toLlmResult(llmResponse, settings);
            const fallbackUsed =
              composed.fallbackUsed || mode.fallbackUsed || retrieval.backendFallbackUsed;
            metricFallbackUsed = fallbackUsed;
            return {
              mode: "llm-guide",
              template: composed.template,
              detailLevel: composed.detailLevel,
              guideMode: composed.guideMode,
              answer,
              confidence: normalizeConfidence(Math.max(0.35, composed.confidence)),
              sources: composed.sources,
              followUpOptions: composed.followUpOptions,
              fallbackUsed,
              requestedMode: mode.requestedMode,
              effectiveMode: "llm-guide",
              retrievalBackend: retrieval.retrievalBackend,
              llm,
            };
          }
        }

        llmFallbackUsed = true;
        metricLlmFailed = true;
        effectiveMode = "docs-only";
      } catch (error) {
        llmFallbackUsed = true;
        metricLlmFailed = true;
        effectiveMode = "docs-only";

        try {
          await deps.logAudit({
            actorId: input.actorId ?? null,
            action: "assistant.provider.failure",
            targetType: "assistant",
            targetId: settings.llmProvider,
            metadata: redactAssistantMetadata({
              provider: settings.llmProvider,
              model: settings.llmModel,
              error:
                error instanceof Error
                  ? redactAssistantText(error.message)
                  : "assistant_provider_failed",
            }),
          });
        } catch {
          // Audit is best-effort and must not block assistant chat response.
        }
      }
    } else if (mode.effectiveMode === "llm-guide") {
      llmFallbackUsed = true;
      effectiveMode = "docs-only";
    }

    const fallbackUsed =
      composed.fallbackUsed ||
      mode.fallbackUsed ||
      retrieval.backendFallbackUsed ||
      llmFallbackUsed;

    metricFallbackUsed = fallbackUsed;

    if (mode.requestedMode === "llm-guide" && effectiveMode === "docs-only") {
      try {
        await deps.logAudit({
          actorId: input.actorId ?? null,
          action: "assistant.mode.fallback",
          targetType: "assistant",
          targetId: "llm-guide",
          metadata: {
            reason: llmFallbackUsed ? "provider_or_snippet_fallback" : "llm_disabled",
            retrievalBackend: retrieval.retrievalBackend,
          },
        });
      } catch {
        // Audit is best-effort and must not block assistant chat response.
      }
    }

    return {
      mode: "docs-only",
      template: composed.template,
      detailLevel: composed.detailLevel,
      guideMode: composed.guideMode,
      answer: composed.answer,
      confidence: composed.confidence,
      sources: composed.sources,
      followUpOptions: composed.followUpOptions,
      fallbackUsed,
      requestedMode: mode.requestedMode,
      effectiveMode,
      retrievalBackend: retrieval.retrievalBackend,
      llm,
    };
  } catch (error) {
    metricErrorCode = error instanceof Error ? error.message : "assistant_error";
    throw error;
  } finally {
    recordAssistantMetric({
      latencyMs: Date.now() - startedAtMs,
      fallbackUsed: metricFallbackUsed,
      noHit: metricNoHit,
      llmUsed: metricLlmUsed,
      llmFailed: metricLlmFailed,
      errorCode: metricErrorCode,
    });
  }
};
