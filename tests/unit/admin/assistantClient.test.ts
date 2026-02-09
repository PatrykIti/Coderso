import { expect, test } from "bun:test";

import {
  getAssistantStatus,
  reindexAssistantDocs,
  sendAssistantMessage,
} from "../../../core/admin/services/assistantClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("getAssistantStatus hits GET /assistant/status", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      enabled: true,
      defaultMode: "docs-only",
      retrievalBackend: "filesystem",
      llmAvailable: false,
      indexReady: true,
      indexBuilding: false,
      indexError: null,
      lastReindexAt: null,
      docCount: 12,
      chunkCount: 80,
    });
  };

  try {
    await getAssistantStatus();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/assistant/status");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendAssistantMessage uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      mode: "docs-only",
      template: "location_answer",
      answer: "Use assistant settings in General Settings.",
      confidence: 0.8,
      sources: [],
      fallbackUsed: false,
      requestedMode: "docs-only",
      effectiveMode: "docs-only",
      retrievalBackend: "filesystem",
      llm: null,
    });
  };

  try {
    resetCsrfToken();
    await sendAssistantMessage({ message: "where are assistant settings?" });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/chat");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reindexAssistantDocs uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      retrievalBackend: "db",
      builtAt: "2026-02-09T22:00:00.000Z",
      buildDurationMs: 120,
      docCount: 20,
      chunkCount: 90,
      totalTokens: 900,
      actorId: "user-1",
    });
  };

  try {
    resetCsrfToken();
    await reindexAssistantDocs();

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/reindex");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
