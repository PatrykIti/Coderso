export type AssistantQuotaConfig = {
  requestsPerMinute: number;
  requestsPerDay: number;
  globalRequestsPerMinute: number;
  globalRequestsPerDay: number;
  llmTokensPerDay: number;
  globalLlmTokensPerDay: number;
};

export type AssistantQuotaInput = {
  actorId?: string | null;
  mode: "docs-only" | "llm-guide";
  estimatedLlmTokens?: number;
  nowMs?: number;
};

type WindowCounter = {
  count: number;
  resetAt: number;
};

type DayCounter = {
  dayKey: string;
  requests: number;
  llmTokens: number;
};

const minuteCounters = new Map<string, WindowCounter>();
const dayCounters = new Map<string, DayCounter>();

const toPositiveLimit = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 0;
};

const minuteWindowMs = 60_000;

const consumeMinuteLimit = (
  key: string,
  nowMs: number,
  limit: number,
  errorCode: "assistant_rate_limited"
) => {
  const normalizedLimit = toPositiveLimit(limit);
  if (normalizedLimit === 0) return;

  const state = minuteCounters.get(key);
  if (!state || state.resetAt <= nowMs) {
    minuteCounters.set(key, {
      count: 1,
      resetAt: nowMs + minuteWindowMs,
    });
    return;
  }

  if (state.count >= normalizedLimit) {
    throw new Error(errorCode);
  }

  state.count += 1;
};

const consumeDayRequestsLimit = (
  key: string,
  dayKey: string,
  limit: number,
  errorCode: "assistant_rate_limited"
) => {
  const normalizedLimit = toPositiveLimit(limit);
  if (normalizedLimit === 0) return;

  const state = dayCounters.get(key);
  if (!state || state.dayKey !== dayKey) {
    dayCounters.set(key, {
      dayKey,
      requests: 1,
      llmTokens: 0,
    });
    return;
  }

  if (state.requests >= normalizedLimit) {
    throw new Error(errorCode);
  }

  state.requests += 1;
};

const consumeDayTokenLimit = (
  key: string,
  dayKey: string,
  limit: number,
  tokens: number,
  errorCode: "assistant_budget_exceeded"
) => {
  const normalizedLimit = toPositiveLimit(limit);
  if (normalizedLimit === 0 || tokens <= 0) return;

  const state = dayCounters.get(key);
  if (!state || state.dayKey !== dayKey) {
    if (tokens > normalizedLimit) {
      throw new Error(errorCode);
    }
    dayCounters.set(key, {
      dayKey,
      requests: 0,
      llmTokens: tokens,
    });
    return;
  }

  if (state.llmTokens + tokens > normalizedLimit) {
    throw new Error(errorCode);
  }

  state.llmTokens += tokens;
};

const toDayKey = (nowMs: number) => new Date(nowMs).toISOString().slice(0, 10);

const resolveActorKey = (actorId?: string | null) => {
  if (typeof actorId !== "string") return "anonymous";
  const normalized = actorId.trim();
  return normalized.length > 0 ? normalized : "anonymous";
};

export const enforceAssistantQuota = (
  config: AssistantQuotaConfig,
  input: AssistantQuotaInput
) => {
  const nowMs = input.nowMs ?? Date.now();
  const dayKey = toDayKey(nowMs);
  const actorKey = resolveActorKey(input.actorId);
  const globalKey = "__global__";
  const estimatedTokens = Math.max(0, Math.floor(input.estimatedLlmTokens ?? 0));

  consumeMinuteLimit(
    `assistant:user:${actorKey}`,
    nowMs,
    config.requestsPerMinute,
    "assistant_rate_limited"
  );
  consumeDayRequestsLimit(
    `assistant:user:${actorKey}`,
    dayKey,
    config.requestsPerDay,
    "assistant_rate_limited"
  );

  consumeMinuteLimit(
    `assistant:global:${globalKey}`,
    nowMs,
    config.globalRequestsPerMinute,
    "assistant_rate_limited"
  );
  consumeDayRequestsLimit(
    `assistant:global:${globalKey}`,
    dayKey,
    config.globalRequestsPerDay,
    "assistant_rate_limited"
  );

  if (input.mode === "llm-guide") {
    consumeDayTokenLimit(
      `assistant:user:${actorKey}`,
      dayKey,
      config.llmTokensPerDay,
      estimatedTokens,
      "assistant_budget_exceeded"
    );
    consumeDayTokenLimit(
      `assistant:global:${globalKey}`,
      dayKey,
      config.globalLlmTokensPerDay,
      estimatedTokens,
      "assistant_budget_exceeded"
    );
  }
};

export const resetAssistantQuotaState = () => {
  minuteCounters.clear();
  dayCounters.clear();
};
