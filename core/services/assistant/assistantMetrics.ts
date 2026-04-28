export type AssistantMetricsSnapshot = {
  requestCount: number;
  errorCount: number;
  fallbackCount: number;
  noHitCount: number;
  llmRequestCount: number;
  llmFailureCount: number;
  actionExecuteCount: number;
  actionFailureCount: number;
  actionReplayCount: number;
  totalLatencyMs: number;
  averageLatencyMs: number;
  maxLatencyMs: number;
};

export type AssistantMetricEvent = {
  latencyMs: number;
  fallbackUsed: boolean;
  noHit: boolean;
  llmUsed: boolean;
  llmFailed: boolean;
  errorCode?: string | null;
};

type MutableMetricsState = {
  requestCount: number;
  errorCount: number;
  fallbackCount: number;
  noHitCount: number;
  llmRequestCount: number;
  llmFailureCount: number;
  actionExecuteCount: number;
  actionFailureCount: number;
  actionReplayCount: number;
  totalLatencyMs: number;
  maxLatencyMs: number;
};

const createDefaultState = (): MutableMetricsState => ({
  requestCount: 0,
  errorCount: 0,
  fallbackCount: 0,
  noHitCount: 0,
  llmRequestCount: 0,
  llmFailureCount: 0,
  actionExecuteCount: 0,
  actionFailureCount: 0,
  actionReplayCount: 0,
  totalLatencyMs: 0,
  maxLatencyMs: 0,
});

const state: MutableMetricsState = createDefaultState();

const normalizeLatency = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

export const recordAssistantMetric = (event: AssistantMetricEvent) => {
  const latency = normalizeLatency(event.latencyMs);

  state.requestCount += 1;
  state.totalLatencyMs += latency;
  state.maxLatencyMs = Math.max(state.maxLatencyMs, latency);

  if (event.errorCode) state.errorCount += 1;
  if (event.fallbackUsed) state.fallbackCount += 1;
  if (event.noHit) state.noHitCount += 1;
  if (event.llmUsed) state.llmRequestCount += 1;
  if (event.llmFailed) state.llmFailureCount += 1;
};

export const recordAssistantActionMetric = (event: {
  failedCount: number;
  replayed: boolean;
}) => {
  state.actionExecuteCount += 1;
  state.actionFailureCount += Math.max(0, Math.floor(event.failedCount));
  if (event.replayed) state.actionReplayCount += 1;
};

export const getAssistantMetricsSnapshot = (): AssistantMetricsSnapshot => ({
  requestCount: state.requestCount,
  errorCount: state.errorCount,
  fallbackCount: state.fallbackCount,
  noHitCount: state.noHitCount,
  llmRequestCount: state.llmRequestCount,
  llmFailureCount: state.llmFailureCount,
  actionExecuteCount: state.actionExecuteCount,
  actionFailureCount: state.actionFailureCount,
  actionReplayCount: state.actionReplayCount,
  totalLatencyMs: state.totalLatencyMs,
  averageLatencyMs:
    state.requestCount > 0
      ? Number((state.totalLatencyMs / state.requestCount).toFixed(2))
      : 0,
  maxLatencyMs: state.maxLatencyMs,
});

export const resetAssistantMetrics = () => {
  const defaults = createDefaultState();
  state.requestCount = defaults.requestCount;
  state.errorCount = defaults.errorCount;
  state.fallbackCount = defaults.fallbackCount;
  state.noHitCount = defaults.noHitCount;
  state.llmRequestCount = defaults.llmRequestCount;
  state.llmFailureCount = defaults.llmFailureCount;
  state.actionExecuteCount = defaults.actionExecuteCount;
  state.actionFailureCount = defaults.actionFailureCount;
  state.actionReplayCount = defaults.actionReplayCount;
  state.totalLatencyMs = defaults.totalLatencyMs;
  state.maxLatencyMs = defaults.maxLatencyMs;
};
