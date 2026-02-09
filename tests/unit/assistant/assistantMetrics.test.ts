import { expect, test } from "bun:test";

import {
  getAssistantMetricsSnapshot,
  recordAssistantMetric,
  resetAssistantMetrics,
} from "../../../core/services/assistant/assistantMetrics";

test("assistant metrics aggregate requests, latency, and fallback stats", () => {
  resetAssistantMetrics();

  recordAssistantMetric({
    latencyMs: 80,
    fallbackUsed: false,
    noHit: false,
    llmUsed: true,
    llmFailed: false,
    errorCode: null,
  });

  recordAssistantMetric({
    latencyMs: 120,
    fallbackUsed: true,
    noHit: true,
    llmUsed: false,
    llmFailed: true,
    errorCode: "assistant_provider_failed",
  });

  const snapshot = getAssistantMetricsSnapshot();

  expect(snapshot.requestCount).toBe(2);
  expect(snapshot.errorCount).toBe(1);
  expect(snapshot.fallbackCount).toBe(1);
  expect(snapshot.noHitCount).toBe(1);
  expect(snapshot.llmRequestCount).toBe(1);
  expect(snapshot.llmFailureCount).toBe(1);
  expect(snapshot.totalLatencyMs).toBe(200);
  expect(snapshot.averageLatencyMs).toBe(100);
  expect(snapshot.maxLatencyMs).toBe(120);
});
