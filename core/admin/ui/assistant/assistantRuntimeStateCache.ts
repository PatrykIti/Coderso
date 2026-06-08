import { getAssistantStatus, type AssistantStatusResponse } from "@/services/assistantStatusClient";

const ASSISTANT_RUNTIME_CACHE_TTL_MS = 60_000;

export type AssistantRuntimeState = {
  status: AssistantStatusResponse;
};

let runtimeStateCache: {
  value: AssistantRuntimeState;
  savedAt: number;
} | null = null;
let runtimeStatePromise: Promise<AssistantRuntimeState> | null = null;

const buildRuntimeState = (assistantStatus: AssistantStatusResponse): AssistantRuntimeState => ({
  status: assistantStatus,
});

export const readAssistantRuntimeStateCache = (nowMs: number) => {
  if (!runtimeStateCache) return null;
  if (nowMs - runtimeStateCache.savedAt > ASSISTANT_RUNTIME_CACHE_TTL_MS) {
    return null;
  }
  return runtimeStateCache.value;
};

export const clearAssistantRuntimeStateCache = () => {
  runtimeStateCache = null;
  runtimeStatePromise = null;
};

export async function loadAssistantRuntimeStateCached(options?: {
  force?: boolean;
  now?: () => number;
}) {
  const force = options?.force ?? false;
  const now = options?.now ?? (() => Date.now());

  if (!force) {
    const cached = readAssistantRuntimeStateCache(now());
    if (cached) return cached;
  }

  if (runtimeStatePromise) {
    return runtimeStatePromise;
  }

  const request = getAssistantStatus({ force })
    .then((assistantStatus) => buildRuntimeState(assistantStatus))
    .then((nextState) => {
      runtimeStateCache = {
        value: nextState,
        savedAt: now(),
      };
      return nextState;
    })
    .finally(() => {
      runtimeStatePromise = null;
    });

  runtimeStatePromise = request;
  return request;
}
