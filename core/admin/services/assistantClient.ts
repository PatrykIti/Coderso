import { apiRequest } from "./apiClient";

export type AssistantMode = "docs-only" | "llm-rag";

export type AssistantRetrievalBackend = "filesystem" | "db";

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

export async function getAssistantStatus() {
  return apiRequest<AssistantStatusResponse>("/assistant/status", {
    method: "GET",
  });
}

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
  return apiRequest<AssistantReindexResponse>(
    "/assistant/reindex",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    { withCsrf: true }
  );
}
