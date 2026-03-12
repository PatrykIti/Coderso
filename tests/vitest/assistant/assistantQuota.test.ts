import { expect, test } from "vitest";

import {
  enforceAssistantQuota,
  resetAssistantQuotaState,
} from "../../../core/services/assistant/assistantQuota";

const baseConfig = {
  requestsPerMinute: 2,
  requestsPerDay: 3,
  globalRequestsPerMinute: 0,
  globalRequestsPerDay: 0,
  llmTokensPerDay: 50,
  globalLlmTokensPerDay: 0,
};

test("enforceAssistantQuota blocks when per-minute limit is exceeded", () => {
  resetAssistantQuotaState();
  const nowMs = 1_000_000;

  enforceAssistantQuota(baseConfig, {
    actorId: "user-1",
    mode: "docs-only",
    nowMs,
  });
  enforceAssistantQuota(baseConfig, {
    actorId: "user-1",
    mode: "docs-only",
    nowMs,
  });

  expect(() =>
    enforceAssistantQuota(baseConfig, {
      actorId: "user-1",
      mode: "docs-only",
      nowMs,
    })
  ).toThrow("assistant_rate_limited");
});

test("enforceAssistantQuota resets minute window", () => {
  resetAssistantQuotaState();
  const nowMs = 1_000_000;

  enforceAssistantQuota(baseConfig, {
    actorId: "user-1",
    mode: "docs-only",
    nowMs,
  });
  enforceAssistantQuota(baseConfig, {
    actorId: "user-1",
    mode: "docs-only",
    nowMs,
  });

  enforceAssistantQuota(baseConfig, {
    actorId: "user-1",
    mode: "docs-only",
    nowMs: nowMs + 60_001,
  });
});

test("enforceAssistantQuota blocks when per-day request limit is exceeded", () => {
  resetAssistantQuotaState();
  const nowMs = Date.parse("2026-02-09T10:00:00.000Z");

  enforceAssistantQuota(baseConfig, {
    actorId: "user-2",
    mode: "docs-only",
    nowMs,
  });
  enforceAssistantQuota(baseConfig, {
    actorId: "user-2",
    mode: "docs-only",
    nowMs: nowMs + 61_000,
  });
  enforceAssistantQuota(baseConfig, {
    actorId: "user-2",
    mode: "docs-only",
    nowMs: nowMs + 122_000,
  });

  expect(() =>
    enforceAssistantQuota(baseConfig, {
      actorId: "user-2",
      mode: "docs-only",
      nowMs: nowMs + 183_000,
    })
  ).toThrow("assistant_rate_limited");
});

test("enforceAssistantQuota blocks when llm token budget is exceeded", () => {
  resetAssistantQuotaState();
  const nowMs = Date.parse("2026-02-09T10:00:00.000Z");

  enforceAssistantQuota(baseConfig, {
    actorId: "user-3",
    mode: "llm-rag",
    estimatedLlmTokens: 20,
    nowMs,
  });
  enforceAssistantQuota(baseConfig, {
    actorId: "user-3",
    mode: "llm-rag",
    estimatedLlmTokens: 20,
    nowMs: nowMs + 61_000,
  });

  expect(() =>
    enforceAssistantQuota(baseConfig, {
      actorId: "user-3",
      mode: "llm-rag",
      estimatedLlmTokens: 20,
      nowMs: nowMs + 122_000,
    })
  ).toThrow("assistant_budget_exceeded");
});

test("enforceAssistantQuota applies optional global limits", () => {
  resetAssistantQuotaState();
  const nowMs = Date.parse("2026-02-09T10:00:00.000Z");

  const config = {
    ...baseConfig,
    globalRequestsPerMinute: 2,
    globalRequestsPerDay: 10,
  };

  enforceAssistantQuota(config, {
    actorId: "user-a",
    mode: "docs-only",
    nowMs,
  });
  enforceAssistantQuota(config, {
    actorId: "user-b",
    mode: "docs-only",
    nowMs,
  });

  expect(() =>
    enforceAssistantQuota(config, {
      actorId: "user-c",
      mode: "docs-only",
      nowMs,
    })
  ).toThrow("assistant_rate_limited");
});
