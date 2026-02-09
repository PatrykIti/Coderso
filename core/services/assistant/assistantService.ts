import { logAudit } from "../audit/auditService";
import {
  getSetting,
  type AssistantLlmProvider,
  type AssistantMode,
} from "../settings/settingsService";
import { composeDocsAnswer } from "./docsAnswerComposer";
import {
  ensureDocsIndex,
  getDocsIndexStatus,
  reindexDocsIndex,
} from "./docsIndexService";
import { searchDocsIndex } from "./docsRetriever";
import type { DocsComposedAnswer, DocsIndex } from "./docsTypes";

const ASSISTANT_MESSAGE_MAX_LENGTH = 2000;
const BLOCKED_MARKERS = [
  "<system>",
  "</system>",
  "ignore previous instructions",
  "developer message",
  "prompt injection",
] as const;

type AssistantRuntimeSettings = {
  enabled: boolean;
  defaultMode: AssistantMode;
  llmEnabled: boolean;
  llmProvider: AssistantLlmProvider;
};

export type AssistantRetrievalBackend = "filesystem";

export type AssistantChatContext = {
  page?: string;
  locale?: string;
};

export type AssistantChatInput = {
  message: string;
  mode?: AssistantMode;
  context?: AssistantChatContext;
};

export type AssistantChatResult = DocsComposedAnswer & {
  requestedMode: AssistantMode;
  effectiveMode: "docs-only";
  retrievalBackend: AssistantRetrievalBackend;
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
  ensureDocsIndex: () => Promise<DocsIndex>;
  reindexDocsIndex: () => Promise<DocsIndex>;
  getDocsIndexStatus: typeof getDocsIndexStatus;
  searchDocsIndex: typeof searchDocsIndex;
  composeDocsAnswer: typeof composeDocsAnswer;
  logAudit: typeof logAudit;
};

const defaultDeps: AssistantServiceDeps = {
  getSetting,
  ensureDocsIndex,
  reindexDocsIndex,
  getDocsIndexStatus,
  searchDocsIndex,
  composeDocsAnswer,
  logAudit,
};

const resolveBackend = (): AssistantRetrievalBackend => "filesystem";

const normalizeMode = (value: unknown, fallback: AssistantMode): AssistantMode => {
  if (value === "docs-only" || value === "llm-rag") return value;
  return fallback;
};

const normalizeProvider = (
  value: unknown,
  fallback: AssistantLlmProvider
): AssistantLlmProvider => {
  if (value === "openrouter" || value === "none") return value;
  return fallback;
};

const normalizeBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

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
  ] = await Promise.all([
    getSettingSafe(deps, "assistant.enabled", false),
    getSettingSafe(deps, "assistant.defaultMode", "docs-only"),
    getSettingSafe(deps, "assistant.llm.enabled", false),
    getSettingSafe(deps, "assistant.llm.provider", "none"),
  ]);

  return {
    enabled: normalizeBoolean(enabledRaw, false),
    defaultMode: normalizeMode(defaultModeRaw, "docs-only"),
    llmEnabled: normalizeBoolean(llmEnabledRaw, false),
    llmProvider: normalizeProvider(llmProviderRaw, "none"),
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
  if (requestedMode === "llm-rag") {
    if (!settings.llmEnabled || settings.llmProvider === "none") {
      return {
        requestedMode,
        effectiveMode: "docs-only" as const,
        fallbackUsed: true,
      };
    }
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

export const getAssistantStatus = async (
  overrides?: Partial<AssistantServiceDeps>
): Promise<AssistantStatusResult> => {
  const deps = resolveDeps(overrides);
  const settings = await readRuntimeSettings(deps);
  const indexStatus = deps.getDocsIndexStatus();

  return {
    enabled: settings.enabled,
    defaultMode: settings.defaultMode,
    retrievalBackend: resolveBackend(),
    llmAvailable: settings.llmEnabled && settings.llmProvider !== "none",
    indexReady: indexStatus.ready,
    indexBuilding: indexStatus.building,
    indexError: indexStatus.error,
    lastReindexAt: indexStatus.builtAt,
    docCount: indexStatus.docCount,
    chunkCount: indexStatus.chunkCount,
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

  let index: DocsIndex;
  try {
    index = await deps.reindexDocsIndex();
  } catch {
    throw new Error("assistant_reindex_failed");
  }

  try {
    await deps.logAudit({
      actorId: input.actorId ?? null,
      action: "assistant.docs.reindex",
      targetType: "assistant",
      targetId: "docs-index",
      metadata: {
        backend: resolveBackend(),
        docCount: index.docCount,
        chunkCount: index.chunkCount,
      },
    });
  } catch {
    // Audit is best-effort and must not block reindex success.
  }

  return {
    retrievalBackend: resolveBackend(),
    builtAt: index.builtAt,
    buildDurationMs: index.buildDurationMs,
    docCount: index.docCount,
    chunkCount: index.chunkCount,
    totalTokens: index.totalTokens,
    actorId: input.actorId ?? null,
  };
};

export const answerAssistantQuestion = async (
  input: AssistantChatInput,
  overrides?: Partial<AssistantServiceDeps>
): Promise<AssistantChatResult> => {
  const deps = resolveDeps(overrides);
  const settings = await readRuntimeSettings(deps);
  if (!settings.enabled) {
    throw new Error("assistant_disabled");
  }

  const normalizedMessage = sanitizeAssistantMessage(input.message);
  const requestedMode = normalizeMode(input.mode, settings.defaultMode);
  const mode = resolveMode(requestedMode, settings);

  let index: DocsIndex;
  try {
    index = await deps.ensureDocsIndex();
  } catch {
    throw new Error("assistant_index_missing");
  }
  if (index.chunkCount === 0) {
    throw new Error("assistant_index_missing");
  }

  const hits = deps.searchDocsIndex(index, normalizedMessage, {
    topK: 5,
    minScore: 0.01,
  });

  const composed = deps.composeDocsAnswer({
    question: normalizedMessage,
    hits,
    maxSources: 3,
  });

  return {
    ...composed,
    fallbackUsed: composed.fallbackUsed || mode.fallbackUsed,
    requestedMode: mode.requestedMode,
    effectiveMode: mode.effectiveMode,
    retrievalBackend: resolveBackend(),
  };
};
