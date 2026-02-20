import { expect, test } from "bun:test";

import {
  executeAssistantSiteBuilder,
  getAssistantStatus,
  previewAssistantSiteBuilderPlan,
  reindexAssistantDocs,
  sendAssistantMessage,
  validateAssistantSiteBuilderRun,
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

test("previewAssistantSiteBuilderPlan uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      plan: {
        recommendedKitId: "automotive-workshop",
        confidence: 90,
        recommendations: [],
        steps: [],
        settingsPatch: {},
        notes: [],
      },
      selectedKitId: "automotive-workshop",
      selectedKitTitle: "Automotive Workshop",
      enabledStepIds: ["settings", "pages", "qa"],
      actions: [],
      modules: {
        required: [],
        optional: [],
        recommended: [],
      },
    });
  };

  try {
    resetCsrfToken();
    await previewAssistantSiteBuilderPlan({
      businessType: "automotive_workshop",
      goals: ["lead_generation"],
      locale: "en",
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/site-builder/plan");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("executeAssistantSiteBuilder uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      plan: {
        recommendedKitId: "automotive-workshop",
        confidence: 90,
        recommendations: [],
        steps: [],
        settingsPatch: {},
        notes: [],
      },
      selectedKitId: "automotive-workshop",
      selectedKitTitle: "Automotive Workshop",
      enabledStepIds: ["settings", "pages", "qa"],
      actions: [],
      modules: {
        required: [],
        optional: [],
        recommended: [],
      },
      execution: {
        run: {
          id: "run-1",
          kitId: "automotive-workshop",
          mode: "apply",
          status: "success",
          actorId: "user-1",
          rollbackOfRunId: null,
          options: {},
          summary: {
            total: 1,
            success: 1,
            failed: 0,
            planned: 0,
            skipped: 0,
            operations: {
              create: 1,
              update: 0,
              noop: 0,
              delete: 0,
              restore: 0,
            },
          },
          error: null,
          createdAt: "2026-02-20T10:00:00.000Z",
          updatedAt: "2026-02-20T10:00:00.000Z",
          finishedAt: "2026-02-20T10:00:01.000Z",
        },
        items: [],
        summary: {
          total: 1,
          success: 1,
          failed: 0,
          planned: 0,
          skipped: 0,
          operations: {
            create: 1,
            update: 0,
            noop: 0,
            delete: 0,
            restore: 0,
          },
        },
      },
      validation: {
        runId: "run-1",
        status: "ok",
        unresolvedItems: [],
        checks: [],
      },
    });
  };

  try {
    resetCsrfToken();
    await executeAssistantSiteBuilder({
      businessType: "automotive_workshop",
      goals: ["lead_generation"],
      locale: "en",
      selectedKitId: "automotive-workshop",
      enabledStepIds: ["settings", "pages", "qa"],
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/site-builder/execute");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("validateAssistantSiteBuilderRun uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      runId: "run-1",
      status: "ok",
      unresolvedItems: [],
      checks: [],
    });
  };

  try {
    resetCsrfToken();
    await validateAssistantSiteBuilderRun({ runId: "0f7573a3-9ac9-4bc7-a492-fb11da09c37e" });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/site-builder/validate");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
