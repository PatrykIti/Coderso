import React from "react";
import { expect, test } from "vitest";

import {
  clearAuthBootstrapCache,
  resolveAuthBootstrap,
} from "../../../core/admin/services/authClient";
import {
  clearAssistantRuntimeStateCache,
  loadAssistantRuntimeStateCached,
} from "../../../core/admin/ui/assistant/assistantRuntimeStateCache";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("admin shell auth bootstrap stays within single-shot request budget", async () => {
  const originalFetch = globalThis.fetch;
  let authMeCalls = 0;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      authMeCalls += 1;
      return jsonResponse({
        user: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
      });
    }
    return jsonResponse({});
  };

  try {
    clearAuthBootstrapCache();
    const first = await resolveAuthBootstrap();
    const [second, third] = await Promise.all([resolveAuthBootstrap(), resolveAuthBootstrap()]);

    expect(first.state).toBe("authenticated");
    expect(second.state).toBe("authenticated");
    expect(third.state).toBe("authenticated");
    expect(authMeCalls).toBeLessThanOrEqual(1);
  } finally {
    clearAuthBootstrapCache();
    globalThis.fetch = originalFetch;
  }
});

test("assistant runtime state cache stays within shell request budget", async () => {
  const originalFetch = globalThis.fetch;
  let assistantStatusCalls = 0;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/assistant/status")) {
      assistantStatusCalls += 1;
      return jsonResponse({
        enabled: true,
        defaultMode: "docs-only",
        retrievalBackend: "db",
        llmAvailable: false,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 10,
        chunkCount: 40,
      });
    }
    return jsonResponse({});
  };

  try {
    clearAssistantRuntimeStateCache();
    await Promise.all([
      loadAssistantRuntimeStateCached(),
      loadAssistantRuntimeStateCached(),
      loadAssistantRuntimeStateCached(),
    ]);
    await loadAssistantRuntimeStateCached();

    expect(assistantStatusCalls).toBeLessThanOrEqual(1);
  } finally {
    clearAssistantRuntimeStateCache();
    globalThis.fetch = originalFetch;
  }
});
