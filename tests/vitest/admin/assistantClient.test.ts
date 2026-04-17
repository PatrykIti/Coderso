import { expect, test } from "vitest";

import {
  dryRunAssistantActions,
  executeAssistantActions,
  executeAssistantSiteKitActions,
  getAssistantStatus,
  planAssistantActions,
  planAssistantSiteKitActions,
  reindexAssistantDocs,
  sendAssistantMessage,
} from "../../../core/admin/services/assistantClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
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
      retrievalBackend: "db",
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

test("planAssistantActions uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "plan-house-projects-catalog",
      status: "ready",
      intentId: "house-projects-catalog",
      title: "House Projects Catalog",
      answer: "Plan ready",
      summary: "Plan summary",
      confidence: 0.9,
      assumptions: [],
      questions: [],
      actions: [],
    });
  };

  try {
    resetCsrfToken();
    await planAssistantActions({
      prompt: "potrzebuje katalogu projektow domow",
      context: { page: "/admin/coderso/widgets" },
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/actions/plan");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("dryRunAssistantActions uses CSRF and POST", async () => {
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
        id: "plan-house-projects-catalog",
        status: "ready",
        intentId: "house-projects-catalog",
        title: "House Projects Catalog",
        answer: "Plan ready",
        summary: "Plan summary",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [],
      },
      changes: [],
      warnings: [],
      readyToExecute: true,
    });
  };

  try {
    resetCsrfToken();
    await dryRunAssistantActions({
      plan: {
        id: "plan-house-projects-catalog",
        status: "ready",
        intentId: "house-projects-catalog",
        title: "House Projects Catalog",
        answer: "Plan ready",
        summary: "Plan summary",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [],
      },
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/actions/dry-run");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("executeAssistantActions uses CSRF and POST", async () => {
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
        id: "plan-house-projects-catalog",
        status: "ready",
        intentId: "house-projects-catalog",
        title: "House Projects Catalog",
        answer: "Plan ready",
        summary: "Plan summary",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [],
      },
      preview: {
        plan: {
          id: "plan-house-projects-catalog",
          status: "ready",
          intentId: "house-projects-catalog",
          title: "House Projects Catalog",
          answer: "Plan ready",
          summary: "Plan summary",
          confidence: 0.9,
          assumptions: [],
          questions: [],
          actions: [],
        },
        changes: [],
        warnings: [],
        readyToExecute: true,
      },
      results: [],
      summary: {
        create: 0,
        update: 0,
        noop: 0,
        failed: 0,
      },
    });
  };

  try {
    resetCsrfToken();
    await executeAssistantActions({
      plan: {
        id: "plan-house-projects-catalog",
        status: "ready",
        intentId: "house-projects-catalog",
        title: "House Projects Catalog",
        answer: "Plan ready",
        summary: "Plan summary",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [],
      },
      idempotencyKey: "assistant-action-1",
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/actions/execute");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("executeAssistantActions invalidates custom screen caches after successful delete", async () => {
  const originalFetch = globalThis.fetch;
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storageWrites: string[] = [];
  const storage = {
    getItem: () => null,
    setItem: (_key: string, value: string) => {
      storageWrites.push(value);
    },
    removeItem: () => undefined,
  };

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      plan: {
        id: "plan-custom-screen-delete",
        status: "ready",
        intentId: "custom-screen-delete",
        title: "Delete House Projects",
        answer: "Plan ready",
        summary: "Delete custom screen.",
        confidence: 0.78,
        assumptions: [],
        questions: [],
        actions: [],
      },
      preview: {
        plan: {
          id: "plan-custom-screen-delete",
          status: "ready",
          intentId: "custom-screen-delete",
          title: "Delete House Projects",
          answer: "Plan ready",
          summary: "Delete custom screen.",
          confidence: 0.78,
          assumptions: [],
          questions: [],
          actions: [],
        },
        changes: [],
        warnings: [],
        readyToExecute: true,
      },
      results: [
        {
          actionId: "custom-screen-delete-screen-house",
          type: "custom-screen.delete",
          targetType: "custom-screen",
          targetKey: "House Projects",
          operation: "delete",
          status: "success",
          resourceId: "screen-house",
          adminHref: "/admin/coderso/custom-screens",
          publicHref: null,
          message: "Deleted custom screen.",
        },
      ],
      summary: {
        create: 0,
        update: 0,
        delete: 1,
        noop: 0,
        failed: 0,
      },
    });
  };

  try {
    resetCsrfToken();
    await executeAssistantActions({
      plan: {
        id: "plan-custom-screen-delete",
        status: "ready",
        intentId: "custom-screen-delete",
        title: "Delete House Projects",
        answer: "Plan ready",
        summary: "Delete custom screen.",
        confidence: 0.78,
        assumptions: [],
        questions: [],
        actions: [],
      },
      idempotencyKey: "assistant-custom-screen-delete-1",
    });

    const events = storageWrites.map((value) => JSON.parse(value) as { key: string; action: string });
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: cacheKeys.customScreensList,
          action: "invalidate",
        }),
        expect.objectContaining({
          key: cacheKeys.customScreenDetail("screen-house"),
          action: "invalidate",
        }),
      ])
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("executeAssistantActions invalidates page caches after successful delete", async () => {
  const originalFetch = globalThis.fetch;
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storageWrites: string[] = [];
  const storage = {
    getItem: () => null,
    setItem: (_key: string, value: string) => {
      storageWrites.push(value);
    },
    removeItem: () => undefined,
  };

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    return jsonResponse({
      plan: {
        id: "plan-page-delete",
        status: "ready",
        intentId: "page-delete",
        title: "Delete page",
        answer: "Plan ready",
        summary: "Delete page.",
        confidence: 0.78,
        assumptions: [],
        questions: [],
        actions: [],
      },
      preview: {
        plan: {
          id: "plan-page-delete",
          status: "ready",
          intentId: "page-delete",
          title: "Delete page",
          answer: "Plan ready",
          summary: "Delete page.",
          confidence: 0.78,
          assumptions: [],
          questions: [],
          actions: [],
        },
        changes: [],
        warnings: [],
        readyToExecute: true,
      },
      results: [
        {
          actionId: "page-delete-page-1",
          type: "page.delete",
          targetType: "page",
          targetKey: "/projekty-domow-a3afbe30",
          operation: "delete",
          status: "success",
          resourceId: "page-1",
          adminHref: "/admin/pages",
          publicHref: null,
          message: "Deleted page.",
        },
      ],
      summary: { create: 0, update: 0, delete: 1, noop: 0, failed: 0 },
    });
  };

  try {
    resetCsrfToken();
    await executeAssistantActions({
      plan: {
        id: "plan-page-delete",
        status: "ready",
        intentId: "page-delete",
        title: "Delete page",
        answer: "Plan ready",
        summary: "Delete page.",
        confidence: 0.78,
        assumptions: [],
        questions: [],
        actions: [],
      },
      idempotencyKey: "assistant-page-delete-1",
    });

    const events = storageWrites.map((value) => JSON.parse(value) as { key: string; action: string });
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: cacheKeys.pagesList, action: "invalidate" }),
        expect.objectContaining({ key: cacheKeys.pageDetail("page-1"), action: "invalidate" }),
      ])
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
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
      detailLevel: "instruction",
      guideMode: "default",
      answer: "Use assistant settings in General Settings.",
      confidence: 0.8,
      sources: [],
      followUpOptions: [],
      fallbackUsed: false,
      requestedMode: "docs-only",
      effectiveMode: "docs-only",
      retrievalBackend: "db",
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

test("planAssistantSiteKitActions uses generic assistant action plan route", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const siteKitPreview = {
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
  };

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "plan-site-kit-automotive-workshop",
      status: "ready",
      intentId: "site-kit-install",
      title: "Automotive Workshop Site Kit",
      answer: "Plan ready",
      summary: "Install site kit",
      confidence: 0.9,
      assumptions: [],
      questions: [],
      actions: [
        {
          id: "site-kit-install-automotive-workshop",
          type: "site-kit.install",
          title: "Install Automotive Workshop",
          description: "Install selected site kit steps.",
          input: {
            businessType: "automotive_workshop",
            goals: ["lead_generation"],
            locale: "en",
            selectedKitId: "automotive-workshop",
            enabledStepIds: ["settings", "pages", "qa"],
            preview: siteKitPreview,
          },
        },
      ],
    });
  };

  try {
    resetCsrfToken();
    const result = await planAssistantSiteKitActions({
      businessType: "automotive_workshop",
      goals: ["lead_generation"],
      locale: "en",
    });

    expect(result.selectedKitId).toBe("automotive-workshop");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/actions/plan");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("executeAssistantSiteKitActions plans then executes through generic action route", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const siteKitPreview = {
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
  };
  const siteKitExecution = {
    ...siteKitPreview,
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
  };
  const actionPlan = {
    id: "plan-site-kit-automotive-workshop",
    status: "ready",
    intentId: "site-kit-install",
    title: "Automotive Workshop Site Kit",
    answer: "Plan ready",
    summary: "Install site kit",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "site-kit-install-automotive-workshop",
        type: "site-kit.install",
        title: "Install Automotive Workshop",
        description: "Install selected site kit steps.",
        input: {
          businessType: "automotive_workshop",
          goals: ["lead_generation"],
          locale: "en",
          selectedKitId: "automotive-workshop",
          enabledStepIds: ["settings", "pages", "qa"],
          preview: siteKitPreview,
        },
      },
    ],
  };

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/assistant/actions/plan")) {
      return jsonResponse(actionPlan);
    }
    return jsonResponse({
      plan: actionPlan,
      preview: {
        plan: actionPlan,
        changes: [],
        warnings: [],
        readyToExecute: true,
      },
      results: [
        {
          actionId: "site-kit-install-automotive-workshop",
          type: "site-kit.install",
          targetType: "site-kit",
          targetKey: "automotive-workshop",
          operation: "create",
          status: "success",
          resourceId: "run-1",
          adminHref: "/admin/coderso/solution-kits",
          publicHref: null,
          message: "Site kit installed.",
          details: {
            siteKit: {
              execution: siteKitExecution,
              validation: siteKitExecution.validation,
            },
          },
        },
      ],
      summary: {
        create: 1,
        update: 0,
        noop: 0,
        failed: 0,
      },
    });
  };

  try {
    resetCsrfToken();
    const result = await executeAssistantSiteKitActions({
      businessType: "automotive_workshop",
      goals: ["lead_generation"],
      locale: "en",
      selectedKitId: "automotive-workshop",
      enabledStepIds: ["settings", "pages", "qa"],
      idempotencyKey: "site-kit-test-key",
    });

    expect(result.execution.run.id).toBe("run-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/actions/plan");
    expect(calls[2]?.input).toBe("/admin/api/assistant/actions/execute");
    expect(calls[2]?.init?.method).toBe("POST");
    const headers = new Headers(calls[2]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAssistantStatus uses read-through cache", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      enabled: true,
      defaultMode: "docs-only",
      retrievalBackend: "db",
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
    const first = await getAssistantStatus({ force: true });
    const second = await getAssistantStatus();
    expect(first).toEqual(second);
    expect(calls).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reindexAssistantDocs invalidates assistant status cache", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/assistant/status")) {
      return jsonResponse({
        enabled: true,
        defaultMode: "docs-only",
        retrievalBackend: "db",
        llmAvailable: false,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 12,
        chunkCount: 80,
      });
    }
    if (url.endsWith("/assistant/reindex")) {
      return jsonResponse({
        retrievalBackend: "db",
        builtAt: "2026-02-09T22:00:00.000Z",
        buildDurationMs: 120,
        docCount: 20,
        chunkCount: 90,
        totalTokens: 900,
        actorId: "user-1",
      });
    }
    return jsonResponse({}, 404);
  };

  try {
    resetCsrfToken();
    await getAssistantStatus({ force: true });
    await reindexAssistantDocs();
    await getAssistantStatus();

    const statusCalls = calls.filter((call) => String(call.input).endsWith("/assistant/status"));
    expect(statusCalls).toHaveLength(2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
