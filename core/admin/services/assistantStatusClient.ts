import { createReadThroughCache } from "@/utils/readThroughCache";
import { apiRequest } from "./apiClient";

export type AssistantStatusMode = "docs-only" | "llm-guide";
export type AssistantRetrievalBackend = "db";

export type AssistantStatusResponse = {
  enabled: boolean;
  defaultMode: AssistantStatusMode;
  retrievalBackend: AssistantRetrievalBackend;
  llmAvailable: boolean;
  indexReady: boolean;
  indexBuilding: boolean;
  indexError: string | null;
  lastReindexAt: string | null;
  docCount: number;
  chunkCount: number;
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
